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

# Tarea P3 — Calidad de las pruebas y regresiones de la verificación V2

**Cierre de pendientes de la Etapa 1, ola 3 (corrección).** Trabajas solo. Solo cambias pruebas: **no toques código de producción**. La verificación V2 no encontró bloqueantes en P1 ni en P2, pero sí observaciones que ya venían de la Etapa 1 y que contradicen la regla 6 de las reglas de trabajo ("Pruebas que prueban lo que dicen"). Según `planificacion/README.md`, un hallazgo que se corrige en pocas líneas se arregla antes del PR.

## Specs que cubres

| ID | Requisito |
|----|-----------|
| P3.1 | Regla 6: "un rechazo esperado se acota al error exacto: `toThrow(expect.objectContaining({ codigo: '...' }))` o un mensaje concreto, nunca `toThrow()` o `rejects.toThrow()` a secas" y "nada de `try/catch` para verificar un error: si no se lanza, la prueba tiene que fallar". |
| P3.2 | Regla 6: "cada prueba llama a la función que nombra su título". |
| P3.3 | Las pruebas adversariales de V2 sobre P1 y P2 quedan en el repositorio como pruebas de regresión. |

## Rutas permitidas

```
src/app/cartera/domain/reparto-pago.spec.ts
src/app/cartera/domain/abonos.spec.ts
src/app/cartera/domain/factura.spec.ts
src/app/finanzas/domain/operaciones.spec.ts
src/app/finanzas/domain/saldos.spec.ts
src/app/finanzas/infrastructure/libro.repository.spec.ts
src/app/shared/infrastructure/sqlite/capacitor-sql-database.adapter.spec.ts
```

Prohibido todo lo demás, incluidos todos los archivos que no son `*.spec.ts`.

## Qué hacer

### P3.1 — Rechazos sin `try/catch`

Reemplaza cada combinación de `expect(fn).toThrowError(ReglaNegocioError)` + `try { fn() } catch (e) { expect(e.codigo)... }` por **una** aserción por llamada:

```ts
expect(() => fn()).toThrow(expect.objectContaining({ name: 'ReglaNegocioError', codigo: 'CODIGO' }));
```

Lugares que encontró V2 (las líneas pueden haberse movido un poco):

| Archivo | Prueba |
|---------|--------|
| `reparto-pago.spec.ts` | `rejects zero or negative payment amounts with MONTO_INVALIDO` (L60–82) |
| `abonos.spec.ts` | `E4: rejects general payment exceeding total customer debt with MONTO_SUPERA_DEUDA` (L58–82) |
| `abonos.spec.ts` | `distribuirCascada` > `rejects zero or negative amounts with MONTO_INVALIDO` (L169–193) |
| `abonos.spec.ts` | `distribuirCascada` > `rejects with SIN_DEUDA when there is no outstanding debt` (L195–219) |
| `abonos.spec.ts` | `abonarFactura` > `rejects zero or negative amounts with MONTO_INVALIDO` (L264–286) |
| `abonos.spec.ts` | `abonarFactura` > `rejects with SIN_DEUDA when invoice has zero balance` (L288–303) |
| `abonos.spec.ts` | `abonarFactura` > `rejects when payment exceeds invoice balance with MONTO_SUPERA_SALDO_FACTURA` (L317–332) |
| `abonos.spec.ts` | `liquidarTodo` > `rejects with SIN_DEUDA when there is no debt to settle` (L387–410) |
| `operaciones.spec.ts` | el helper `expectReglaError` (L8–16), que usa `try { fn(); expect.unreachable() } catch`. Cámbialo para que use `expect(fn).toThrow(expect.objectContaining({ name: 'ReglaNegocioError', codigo }))` y conserva su firma, para que los usos que ya existen no cambien. |

Conserva los mismos valores de entrada y los mismos códigos esperados. Cada prueba sigue verificando exactamente los mismos casos que hoy, incluidos el valor 0 y el negativo cuando estén los dos. Al terminar, `grep -n "catch" src/app/cartera src/app/finanzas -r --include=*.spec.ts` no debe devolver nada.

### P3.2 — Títulos que nombran la función

Cambia **solo el texto del título** (`it(...)`) para que nombre la función que la prueba llama. No cambies los cuerpos:

| Archivo | Pruebas |
|---------|---------|
| `factura.spec.ts` | L9 y L21 llaman a `saldo`: por ejemplo, `saldo calculates invoice balance as total minus paid amount`. |
| `saldos.spec.ts` | L11 y L21 llaman a `calcularSaldos`; L80 y L91 llaman a `verificarInvariante`. |
| `operaciones.spec.ts` | L22, L33 y L52 (los ejemplos E5, E6 y E7, hoy en español): título en inglés que conserve el ID del ejemplo y nombre la función, por ejemplo `E5: retiroGanancia rejects ... with SALDO_INSUFICIENTE`. Revisa en el cuerpo qué función llama cada una y usa ese nombre exacto. |
| `libro.repository.spec.ts` | L161 y L203 llaman a `registrarTraspaso`; L60 llama a `registrar`, `registrarTraspaso` y `saldos`: nómbralas. |
| `capacitor-sql-database.adapter.spec.ts` | L37, L67 y L106 llaman a `transaction`, y L166 llama a `run`: inclúyelos en el título. |

### P3.3 — Regresiones de V2

El archivo `C:/Users/MIGUEL ANGEL/.claude/jobs/d8480fad/tmp/verificacion-v2.spec.ts` (fuera del repositorio, solo lectura) tiene las pruebas de V2. Copia **estas cinco** al spec que corresponde, adaptando las rutas de los imports y quitando el prefijo "V2" de los títulos:

| Prueba de V2 | Destino |
|--------------|---------|
| `run and transaction recover from a pending save when guardar() succeeds on transaction, and a third failing run reports escrituraAplicada === true` | `capacitor-sql-database.adapter.spec.ts` |
| `run, exec and transaction in native mode (esWeb = false) never call guardar() and never throw GuardadoWebError` | `capacitor-sql-database.adapter.spec.ts` |
| `distribuirCascada and liquidarTodo reject with FACTURA_INVALIDA when an invoice has pagado > total` | `abonos.spec.ts` |
| `abonarFactura, repartirPago, saldo and deudaTotal reject with FACTURA_INVALIDA when pagado > total` | `abonos.spec.ts` |
| `saldo, repartirPago, abonarFactura and distribuirCascada accept a below-cost sale (costoBase > total) and allocate the entire payment to capital` | `abonos.spec.ts` |

Reutiliza el doble de `SQLiteDBConnection` que ya existe en `capacitor-sql-database.adapter.spec.ts` si te sirve. **No** copies las pruebas de regresión E1 a E4 de V2, porque ya existen. Las pruebas copiadas también cumplen la regla 6.

## Verificación

```
npm run lint
npm run test:unit
npm run build
```

Copia el resultado de cada uno. El número de pruebas debe ser **156** (las 151 de hoy más las 5 copiadas), salvo que expliques la diferencia. Además, copia la salida de `grep -rn "catch" src/app/cartera src/app/finanzas --include=*.spec.ts`, que debe venir vacía.
