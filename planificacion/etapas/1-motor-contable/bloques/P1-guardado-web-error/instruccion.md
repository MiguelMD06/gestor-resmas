# Contexto base para bloques delegados

Eres el desarrollador de un bloque del proyecto **Gestor de Resmas**. Tu tarea está al final de este archivo: la parte del plan que va copiada en tu tarea es la fuente de verdad. Si algo de este contexto la contradice, manda la tarea, y lo informas en tu reporte.

## Proyecto

Aplicación Android, 100 % offline, para administrar un negocio de venta de resmas de papel Carta y Oficio: compra de cajas por lotes, ventas con precio por lote, cartera de clientes con abonos y control financiero que separa el capital de la ganancia.

- Requisitos: `planificacion/especificaci_n_y_dise_o_del_sistema.md`, con las correcciones de `planificacion/comun/modelo-contable.md`, que tiene prioridad.
- Montos en pesos colombianos (COP) y cantidades: **siempre enteros**. Nunca uses decimales para dinero.

## Stack (versiones instaladas)

| Área | Versión |
|------|---------|
| Angular | 22, con componentes standalone y signals |
| Ionic | 9 (`@ionic/angular`) |
| Capacitor | 8 |
| TypeScript | 6, con `strict: true` |
| Pruebas unitarias | Vitest 5 mediante `ng test` (builder de Angular, entorno jsdom) |
| Pruebas e2e | Playwright |
| Base de datos | `@capacitor-community/sqlite` 8.x en la app y `sql.js` 1.11.0 en las pruebas |

## Arquitectura

Organización por funcionalidad (screaming) con capas hexagonales:

```
src/app/
├── shared/
│   ├── domain/           tipos de dominio compartidos (pesos, resmas, medios de pago, fecha)
│   └── infrastructure/   puerto SqlDatabase, adaptadores y migraciones
├── <funcionalidad>/      inventario, clientes, ventas, cartera, finanzas
│   ├── domain/           reglas puras: sin Angular, sin SQLite, sin fechas del sistema
│   ├── application/      casos de uso: orquestan el dominio y los puertos dentro de una transacción
│   ├── infrastructure/   repositorios SQLite que implementan los puertos
│   └── ui/               páginas y componentes de Ionic
└── testing/              utilidades solo para pruebas (adaptador sql.js)
```

- `domain/` no importa nada de Angular, Ionic, Capacitor ni SQLite.
- Las dependencias apuntan hacia adentro: `ui` → `application` → `domain`; `infrastructure` implementa los puertos de `domain` o `application`.
- **Nombres:** los conceptos de dominio van en español, igual que el esquema (`Lote`, `Venta`, `registrarAbono`). Los sufijos técnicos van en inglés (`*.port.ts`, `*.adapter.ts`, `*.repository.ts`, `*.spec.ts`). Los comentarios, los textos de las pruebas y los mensajes internos de los errores, en inglés. Las pantallas muestran los errores de negocio en español, traduciéndolos por su `codigo`.
- Para el estado compartido, reutiliza la función que ya existe. Nunca reimplementes con otra forma un paso que ya tiene función (por ejemplo, registrar un movimiento de dinero).

## Reglas de trabajo

1. **Solo tocas las rutas permitidas** de tu tarea. Si necesitas otra, no la toques: detente y explícalo en el reporte.
2. **No uses git:** nada de `commit`, `add`, `stash`, `checkout` ni `push`. El coordinador revisa y hace los commits.
3. **Pruebas primero** cuando haya una regla con resultado esperado claro: escribe la prueba, mírala fallar (RED), implementa (GREEN) y refactoriza con las pruebas en verde. Escribe una prueba por cada regla que pide la tarea, y cada prueba verifica todos los efectos observables de la regla.
4. **Archivos temporales** fuera del repositorio. Si alguno queda dentro, informa su ruta exacta.
5. **No instales dependencias** salvo que la tarea lo pida, y nunca corras formateadores, generadores ni instalaciones sobre todo el repositorio.
6. **Pruebas que prueban lo que dicen:**
   - cada prueba llama a la función que nombra su título;
   - un rechazo esperado se acota al error exacto: `toThrow(expect.objectContaining({ codigo: '...' }))` o un mensaje concreto, nunca `toThrow()` o `rejects.toThrow()` a secas;
   - nada de `try/catch` para verificar un error: si no se lanza, la prueba tiene que fallar;
   - los casos límite usan el valor límite exacto.
7. **Engram:** tienes acceso de solo lectura. Úsalo si te sirve para tener contexto; nunca intentes escribir en él.

## Trampas conocidas del stack

- **`@capacitor-community/sqlite`:** dentro de una transacción manual (`beginTransaction` / `commitTransaction` / `rollbackTransaction`), llama a `run`, `execute` y `executeSet` con `transaction = false`. Si no, el plugin abre su propia transacción.
- **En web (jeep-sqlite)**, después de cada commit hay que llamar a `saveToStore(nombreBD)`, o los datos se pierden al recargar.
- **En web y en las pruebas se usa la misma `sql.js@1.11.0`:** jeep-sqlite 2.8 trae empaquetado el JS de sql.js 1.11 y necesita el `.wasm` de **esa** versión (`angular.json` copia `sql-wasm.wasm` desde `node_modules/sql.js/dist`). No subas `sql.js` sin comprobar la compatibilidad con jeep-sqlite.
- **`sql.js` funciona dentro de `ng test`** con `await initSqlJs()` sin configuración extra (verificado con la versión 1.11.0).
- **SQLite no valida tipos por sí solo:** los CHECK del esquema usan `typeof(col) = 'integer'`. No los quites.
- **`PRAGMA foreign_keys = ON`** se activa en cada conexión, no queda guardado en la base.
- **Windows y PowerShell 5.1:** guarda los archivos en UTF-8 sin BOM.

## Verificación antes de terminar

Corre en primer plano y copia el resultado de cada uno en tu reporte:

```
npm run lint
npm run test:unit
npm run build
```

## Reporte final

1. Qué hiciste, archivo por archivo.
2. Qué `S#` de la tarea cubriste y con qué prueba.
3. Resultado de cada comando de verificación (`<comando>: <resultado observado>`).
4. Lo que quedó pendiente o no pudiste verificar.
5. Rutas de archivos temporales, si las hubo.

Cierra con una sección `## Key Learnings` de 1 a 5 puntos numerados, cada uno con un aprendizaje reutilizable en una oración completa. Omítela si no hubo ninguno.

---

# Tarea P1 — Distinguir si la escritura se aplicó en `GuardadoWebError`

**Cierre de pendientes de la Etapa 1, ola 1.** Trabajas en paralelo con P2, que toca otros archivos. Resuelves el pendiente `R4-ambiguous-guardado-error` de `planificacion/etapas/1-motor-contable/PLAN.md` ("Pendientes para la Etapa 2"). Esta tarea manda sobre el plan si algo no coincide.

## Spec que cubres

| ID | Requisito |
|----|-----------|
| P1 | "`GuardadoWebError` se lanza tanto si la escritura se hizo y falló el guardado como si falló el reintento previo y la escritura **no** se ejecutó. Quien llama no puede distinguirlos." Decisión aprobada: agregar `readonly escrituraAplicada: boolean` a `GuardadoWebError` (`true` = el guardado falló después de la escritura; `false` = falló el guardado pendiente antes de la escritura y la escritura no se ejecutó), con pruebas para `run`, `exec` y `transaction` en los dos casos. |

## Rutas permitidas

```
src/app/shared/infrastructure/sqlite/guardado-web.error.ts
src/app/shared/infrastructure/sqlite/capacitor-sql-database.adapter.ts
src/app/shared/infrastructure/sqlite/capacitor-sql-database.adapter.spec.ts
```

Prohibido todo lo demás.

## Qué hacer

1. **`guardado-web.error.ts`:** el constructor pasa a ser `constructor(message: string, readonly escrituraAplicada: boolean, cause?: unknown)`. Se mantienen `name = 'GuardadoWebError'` y `super(message, { cause })`. Reescribe el JSDoc: ya no dice que los dos casos no se pueden distinguir, sino que `escrituraAplicada` los separa:
   - `true`: la escritura (o el commit) ya se aplicó en memoria y solo falló el guardado. Repetir la operación de negocio la duplicaría.
   - `false`: falló el guardado pendiente de una escritura anterior y la escritura nueva **no** se ejecutó. Se puede reintentar la operación.

   Conserva la nota de que el guardado pendiente se reintenta solo antes de la siguiente escritura.
2. **`capacitor-sql-database.adapter.ts`:**
   - el guardado después de la escritura, en `run`, `exec` y `transaction`, lanza `GuardadoWebError` con `escrituraAplicada = true`;
   - el reintento del guardado pendiente (`flushPendingSaveIfWeb`), antes de la escritura, lanza `GuardadoWebError` con `escrituraAplicada = false`;
   - el resto no cambia: la marca de pendiente, `query` sin reintento, nativo sin `guardar()` y el rollback solo alrededor de `work` y `commitTransaction`;
   - el mensaje sigue en inglés. Puede ser distinto para cada caso, por ejemplo `'Failed to persist web database store after write.'` y `'Failed to flush pending web database save; write was not executed.'`.
3. **Pruebas** (`capacitor-sql-database.adapter.spec.ts`), en web y con el doble de `SQLiteDBConnection` que ya existe en el archivo:
   - Para cada una de `run`, `exec` y `transaction`, **después de la escritura:** `guardar()` falla, el error es `GuardadoWebError` con `escrituraAplicada === true` y la causa original, y la escritura del doble (`db.run`, `db.execute` o `commitTransaction`) se llamó una vez.
   - Para cada una de `run`, `exec` y `transaction`, **guardado pendiente que vuelve a fallar:** primero se deja el adaptador pendiente; en la siguiente llamada `guardar()` falla otra vez, el error es `GuardadoWebError` con `escrituraAplicada === false` y la causa nueva, y la escritura nueva **no** se ejecutó (`db.run`, `db.execute` o `beginTransaction` no se llamó en esa segunda operación).
   - Las pruebas que ya existen tienen que seguir pasando. Ajústalas solo si dejan de compilar por la firma nueva, y agrega la aserción de `escrituraAplicada` donde ya verifican un `GuardadoWebError`.
   - Sigue la regla 6 de las reglas de trabajo: nada de `try/catch` sin una aserción que falle si no se lanza el error. Para revisar campos del error usa `rejects.toMatchObject({ escrituraAplicada: true, cause })` o `rejects.toThrow(expect.objectContaining({ ... }))`.

## Fuera de alcance

- No cambies `database.provider.ts`, la factory ni el puerto `SqlDatabase`.
- No agregues reintentos automáticos de la operación de negocio.

## Verificación

```
npm run lint
npm run test:unit
npm run build
```

Copia el resultado de cada uno, junto con el número de pruebas que pasan.
