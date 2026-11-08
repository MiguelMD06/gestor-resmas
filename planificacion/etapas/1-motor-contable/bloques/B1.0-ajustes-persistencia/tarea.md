
---

# Tarea B1.0 — Ajustes de persistencia y error de negocio

**Etapa 1 (Motor contable), ola 1.** Trabajas solo. Corriges cinco observaciones que dejó la revisión de la Etapa 0 sobre la persistencia y creas el error de negocio que van a usar los bloques B1.1 y B1.2. El plan completo está en `planificacion/etapas/1-motor-contable/PLAN.md` (léelo hasta `## Log`); esta tarea copia la parte que te toca y manda sobre él si algo no coincide.

## Specs que cubres

| ID | Requisito |
|----|-----------|
| S13 | Los 8 pendientes de la revisión de la Etapa 0, según las decisiones de "Por aprobar". A este bloque le tocan los puntos 1 a 5 de "Qué hacer". Los pendientes R1 (cifrado), R3/R4-bootstrap y R3-queue-deadlock **no** se implementan aquí (ver "Fuera de alcance"). |

Observaciones de origen (de `planificacion/etapas/0-fundaciones/PLAN.md`, "Pendientes para la Etapa 1"):

| ID | Dónde | Qué es |
|----|-------|--------|
| R4/R3-save-after-commit-rollback | `capacitor-sql-database.adapter.ts` | En web, si `saveToStore` falla después del commit, el `catch` llama a `rollbackTransaction` sobre una transacción ya confirmada. |
| R4-nontx-write-retry-unsafe | `capacitor-sql-database.adapter.ts` | Una escritura fuera de transacción puede quedar escrita aunque su `saveToStore` falle, y reintentarla la duplicaría. |
| R3-wasm-version-split | `package.json` | Hay dos versiones de sql.js (1.15 para las pruebas y 1.11 para web): las pruebas no ejercitan el motor que usa la web. |
| R3-factory-untested | `sqlite-connection.factory.ts` | La factory de la conexión no tiene pruebas. |
| R3-init-concurrent-race | `database.provider.ts` | Dos llamadas simultáneas a `init()` pueden abrir dos conexiones. |

## Rutas permitidas

```
src/app/shared/infrastructure/sqlite/**
src/testing/**
src/app/shared/domain/regla-negocio.error.ts
src/app/shared/domain/regla-negocio.error.spec.ts
src/app/shared/domain/index.ts
src/app/shared/domain/index.spec.ts
package.json
package-lock.json
angular.json
planificacion/comun/base.md
```

Prohibido todo lo demás. En particular, no toques `src/main.ts` ni crees carpetas `cartera/`, `ventas/` o `finanzas/`.

## Qué hacer

### 1. Guardado web después del commit (`capacitor-sql-database.adapter.ts`)

- Crea `GuardadoWebError extends Error` en `src/app/shared/infrastructure/sqlite/guardado-web.error.ts`, con `name = 'GuardadoWebError'` y la causa original en `cause` (`super(message, { cause })`).
- En `transaction`: el `try/catch` que hace `rollbackTransaction` cubre **solo** `work(tx)` y `commitTransaction()`. El `guardar()` va **después**, fuera de ese `try`. Si `guardar()` falla, **no** se llama a `rollbackTransaction`: se lanza `GuardadoWebError` con la causa y el adaptador queda marcado como "pendiente de guardar".
- Lo mismo para `run` y `exec` fuera de una transacción: si la escritura se ejecutó y `guardar()` falla, se lanza `GuardadoWebError` y el adaptador queda pendiente. Así quien llama sabe que el dato **sí** quedó escrito y no debe repetir la escritura.
- **Reintento:** mientras el adaptador está pendiente, la próxima operación de escritura (`run`, `exec` o `transaction`) llama primero a `guardar()`. Si ese guardado funciona, se limpia la marca y sigue con la operación; si vuelve a fallar, lanza `GuardadoWebError` **sin ejecutar** la nueva escritura. `query` no reintenta ni se bloquea.
- En nativo (`esWeb = false`) nada de esto cambia: no hay `guardar()`.

### 2. Una sola inicialización (`database.provider.ts`)

`DatabaseProvider.init()` guarda la promesa en curso. Dos llamadas simultáneas abren **una** conexión y migran **una** vez. Si la inicialización falla, la promesa guardada se descarta para que una llamada posterior pueda reintentar. El getter `db` sigue igual.

Para poder probarlo sin el plugin, permite inyectar la función que crea la base (por ejemplo, un `InjectionToken` opcional o un parámetro con valor por defecto `createCapacitorSqlDatabase`). No cambies cómo se registra en `src/main.ts`; si para eso necesitaras tocarlo, detente e infórmalo.

### 3. Una sola versión de sql.js

- `sql.js` pasa a `1.11.0` exacta en `devDependencies` (la que trae jeep-sqlite). Instala con `npm install --save-dev --save-exact sql.js@1.11.0`.
- Quita el alias `sql.js-jeep-wasm` con `npm uninstall sql.js-jeep-wasm`.
- `angular.json`: el asset de `sql-wasm.wasm` vuelve a copiarse desde `node_modules/sql.js/dist`.
- `@types/sql.js` se queda en `1.4.11`.
- En `planificacion/comun/base.md`, sección "Trampas conocidas del stack": reemplaza la trampa de jeep-sqlite y el alias por una que diga que web y pruebas usan la **misma** `sql.js@1.11.0`, que jeep-sqlite 2.8 necesita el `.wasm` de esa versión y que no se debe subir `sql.js` sin comprobar la compatibilidad con jeep-sqlite. Actualiza también la fila de la tabla de stack y la trampa "verificado con la versión 1.15.2" para que digan 1.11.0, una vez que hayas comprobado que `ng test` funciona con ella.
- Si `sql.js@1.11.0` no funciona dentro de `ng test`, **detente**: no vuelvas a la 1.15, deja todo como estaba e infórmalo con el error exacto.

### 4. Pruebas de la factory (`sqlite-connection.factory.ts`)

Escribe `sqlite-connection.factory.spec.ts` con dobles del plugin (`vi.mock` de `@capacitor/core`, `@capacitor-community/sqlite` y `jeep-sqlite/loader`, o inyección si te resulta más limpio; si cambias la firma de la factory, mantén `createCapacitorSqlDatabase()` sin argumentos como punto de entrada). Casos:

- en web: registra jeep-sqlite (`defineCustomElements`), agrega un solo `<jeep-sqlite>` al `document.body` y llama a `initWebStore()` antes de crear la conexión;
- en nativo: no llama a `defineCustomElements` ni a `initWebStore()`;
- si `isConnection` dice que ya existe, usa `retrieveConnection` y no `createConnection`;
- si la base ya está abierta no llama a `open()`; si no, sí;
- siempre ejecuta `PRAGMA foreign_keys = ON;` con `transaction = false`.

### 5. `ReglaNegocioError` (`src/app/shared/domain/regla-negocio.error.ts`)

Reexpórtalo desde `src/app/shared/domain/index.ts` (y actualiza `index.spec.ts` si ese archivo comprueba las exportaciones). Código exacto:

```ts
export type CodigoRegla =
  | 'MONTO_INVALIDO'             // amount <= 0 where a positive amount is required
  | 'MONTO_SUPERA_DEUDA'         // payment > customer's total debt
  | 'MONTO_SUPERA_SALDO_FACTURA' // payment > invoice balance
  | 'SIN_DEUDA'                  // payment or settlement with no debt
  | 'SALDO_INSUFICIENTE'         // pocket balance < amount
  | 'GANANCIA_INSUFICIENTE'      // free profit < withdrawal
  | 'TRASPASO_MISMO_MEDIO';      // transfer with the same source and target
export class ReglaNegocioError extends Error {
  constructor(readonly codigo: CodigoRegla, message: string) { super(message); this.name = 'ReglaNegocioError'; }
}
```

Puedes ajustar el formato para que pase Prettier y ESLint, pero no cambies los códigos ni la forma de la clase.

## Pruebas (primero RED, después GREEN)

| Punto | Qué prueba |
|-------|-----------|
| 1 | En `capacitor-sql-database.adapter.spec.ts`, con el doble de `SQLiteDBConnection`: (a) en web, si `guardar()` falla después del commit, se llama a `commitTransaction`, **no** a `rollbackTransaction`, y el error es `GuardadoWebError` con la causa original; (b) `run` fuera de transacción con `guardar()` fallido lanza `GuardadoWebError` y `db.run` se llamó una sola vez; (c) estando pendiente, la siguiente escritura llama primero a `guardar()` y, si funciona, ejecuta la escritura; (d) estando pendiente y con `guardar()` fallando otra vez, lanza `GuardadoWebError` y **no** llama a `db.run`; (e) `query` no llama a `guardar()` aunque esté pendiente. Las pruebas que ya existen deben seguir pasando. |
| 2 | En `database.provider.spec.ts`: dos `init()` simultáneos crean **una** base (la función de creación se llama una vez); si la primera inicialización falla, una segunda llamada vuelve a intentarlo y funciona. |
| 3 | `npm run test:unit` en verde con `sql.js@1.11.0`, y `npm run build` deja `www/assets/sql-wasm.wasm`. Compara su tamaño con `node_modules/sql.js/dist/sql-wasm.wasm` (deben ser el mismo archivo). |
| 4 | Los 5 casos de `sqlite-connection.factory.spec.ts`. |
| 5 | En `regla-negocio.error.spec.ts`: el `codigo` y el `message` quedan guardados, `name` es `'ReglaNegocioError'` y la instancia es `instanceof ReglaNegocioError` y `instanceof Error`. |

## Fuera de alcance

- Cifrado de la base (R1): queda sin cifrar.
- Pantalla de error si la base no abre (R3/R4-bootstrap): Etapa 2.
- Protección contra el bloqueo de la cola (R3-queue-deadlock): no se implementa; ya está documentada como regla en el JSDoc de `transaction`.

## Verificación

```
npm run lint
npm run test:unit
npm run build
```

Copia el resultado de cada uno. Además, confirma que `npm ls sql.js` muestra una sola versión (1.11.0) y que el alias `sql.js-jeep-wasm` ya no está en `package.json`.
