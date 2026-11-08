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
| Base de datos | `@capacitor-community/sqlite` 8.x en la app y `sql.js` en las pruebas |

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
- **Nombres:** los conceptos de dominio van en español, igual que el esquema (`Lote`, `Venta`, `registrarAbono`). Los sufijos técnicos van en inglés (`*.port.ts`, `*.adapter.ts`, `*.repository.ts`, `*.spec.ts`). Los comentarios y los textos de las pruebas, en inglés.
- Para el estado compartido, reutiliza la función que ya existe. Nunca reimplementes con otra forma un paso que ya tiene función (por ejemplo, registrar un movimiento de dinero).

## Reglas de trabajo

1. **Solo tocas las rutas permitidas** de tu tarea. Si necesitas otra, no la toques: detente y explícalo en el reporte.
2. **No uses git:** nada de `commit`, `add`, `stash`, `checkout` ni `push`. El coordinador revisa y hace los commits.
3. **Pruebas primero** cuando haya una regla con resultado esperado claro: escribe la prueba, mírala fallar (RED), implementa (GREEN) y refactoriza con las pruebas en verde. Escribe una prueba por cada regla que pide la tarea, y cada prueba verifica todos los efectos observables de la regla.
4. **Archivos temporales** fuera del repositorio. Si alguno queda dentro, informa su ruta exacta.
5. **No instales dependencias** salvo que la tarea lo pida, y nunca corras formateadores, generadores ni instalaciones sobre todo el repositorio.
6. **Engram:** tienes acceso de solo lectura. Úsalo si te sirve para tener contexto; nunca intentes escribir en él.

## Trampas conocidas del stack

- **`@capacitor-community/sqlite`:** dentro de una transacción manual (`beginTransaction` / `commitTransaction` / `rollbackTransaction`), llama a `run`, `execute` y `executeSet` con `transaction = false`. Si no, el plugin abre su propia transacción.
- **En web (jeep-sqlite)**, después de cada commit hay que llamar a `saveToStore(nombreBD)`, o los datos se pierden al recargar.
- **`sql.js` funciona dentro de `ng test`** con `await initSqlJs()` sin configuración extra (verificado con la versión 1.15.2).
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

# Retoma de B0.2 (intento 2)

El intento 1 se cortó porque el sistema se quedó sin memoria: no fue un error del código. **No empieces de cero.** Ya existen estos archivos, escritos por el intento 1 y todavía sin verificar:

```
package.json, package-lock.json, angular.json, src/main.ts, e2e/app.spec.ts (modificados)
src/app/shared/infrastructure/sqlite/** (puerto, token, cola serial, adaptador Capacitor, factory, DatabaseProvider, migraciones, runner y sus pruebas)
src/testing/sqljs-sql-database.adapter.ts y su prueba
```

## Qué hacer

1. **Revisa** cada archivo contra la tarea de abajo (reglas R1 a R7, la tabla de pruebas y las rutas permitidas). Completa lo que falte y corrige lo que no cumpla. Mantén lo que ya esté bien.
2. **Verifica que las dependencias estén instaladas** (`npm ls @capacitor-community/sqlite jeep-sqlite sql.js @types/sql.js`). Si alguna falta, instálala como dice la tarea.
3. **Ahorra memoria; esto es obligatorio:**
   - corre **un comando por vez, en primer plano**; nunca dos a la vez ni en segundo plano;
   - orden: `npm run test:unit`, después `npm run lint`, después `npm run build` y al final `npm run test:e2e`;
   - después del e2e, confirma que no quedó ningún `ng serve` ni navegador abierto;
   - si una prueba falla, corrige y vuelve a correr **solo ese archivo** (`npx ng test --no-watch --include <ruta>`) antes de volver a correr todo.
4. Entrega el reporte final completo que pide `base.md`.

---

# Tarea B0.2 — Persistencia SQLite

**Etapa 0 (Fundaciones), ola 2.** Trabajas solo; la ola 1 ya dejó `capacitor.config.ts`, el CI y `src/app/shared/domain/**`. Esos archivos no los toques.

## Objetivo

Una base SQLite local, la misma en Android y en web, detrás de un puerto propio, con transacciones atómicas, migraciones versionadas y el esquema v1 corregido. Todo probado con SQL real mediante sql.js.

## Specs que cubres

| ID | Requisito (cita textual) |
|----|--------------------------|
| S2 | "Todos los datos se almacenarán localmente en el dispositivo mediante una base de datos relacional (**SQLite**), garantizando disponibilidad del 100% sin requerir conexión a internet ni servidores externos." |
| S3 | "Las operaciones compuestas (como una venta que descuenta stock de varios lotes o un abono en cascada que modifica múltiples facturas y actualiza los bolsillos de efectivo/transferencia) deberán ejecutarse dentro de transacciones atómicas de base de datos; si ocurre un error intermedio, ningún dato parcial se guardará para evitar descuadres contables." |
| S4 | "El sistema restringirá estrictamente las cantidades de cajas y resmas a números enteros positivos (`INTEGER`), mientras que los valores monetarios (costos, precios, abonos y saldos en pesos) se manejarán como enteros exactos sin errores de redondeo de punto flotante." |
| S5 | "Definir **Capital en caja = capital recuperado − compras pagadas con los bolsillos**. Además, fijar como regla que siempre cumpla **Efectivo + Transferencia = Capital en caja + Ganancia libre**, y verificarla con tests." |
| S6 | "Reemplazarlo por un movimiento **Aporte de capital** que entra a un bolsillo. Así toda compra sale de Efectivo o Transferencia y el arqueo se puede rastrear." |
| S7 | "Guardar en `abonos_detalle_facturas` cuánto de cada pago fue capital y cuánto ganancia." |
| S8 | "**1 lote por compra** (10×N resmas), con la barra de progreso calculada como disponibles ÷ iniciales." |
| S9 | Correcciones: "`CHECK(costo_por_caja % 10 = 0)`", "`saldo_pendiente = total_venta - monto_pagado`", "`monto_pagado <= total_venta`", "`resmas_disponibles <= resmas_iniciales`", "Sumar `ABONO_INICIAL` a `tipo_abono`", "reemplazar `'AMBOS'` por columnas de origen y destino", "Crear un cliente **\"Mostrador\"** para ventas de contado rápidas". |
| S10 | "Versionar el esquema y tener migraciones desde la v1. El import del backup (RNF-06) lo necesita." |

S5 a S9 ya están resueltos en el DDL validado: [`planificacion/etapas/0-fundaciones/revision/schema-v1.ts`](../../revision/schema-v1.ts), con sus pruebas en `revision/schema-v1.spec.ts`. Lee también `planificacion/comun/modelo-contable.md`.

## Rutas permitidas

```
package.json
package-lock.json
angular.json
src/main.ts
src/app/shared/infrastructure/sqlite/**
src/testing/**
e2e/app.spec.ts
```

Prohibido todo lo demás.

## Dependencias (solo estas)

- **dependencies:** `@capacitor-community/sqlite@8.1.1` y `jeep-sqlite`, en la versión que pide el plugin (`^2.7.2`; decláralo explícitamente, no dependas de que npm lo suba a la raíz).
- **devDependencies:** `sql.js@1.15.2` y `@types/sql.js@1.4.11`.

Instala con `npm install <paquete>@<versión>` (o con `--save-dev`), nunca con `npm update`.

## Qué hacer

### 1. Puerto — `src/app/shared/infrastructure/sqlite/sql-database.port.ts`

TypeScript puro, sin Angular:

```ts
export type SqlValue = string | number | null;
export interface RunResult { changes: number; lastInsertId: number | null; }
export interface SqlExecutor {
  query<T extends object>(sql: string, params?: readonly SqlValue[]): Promise<T[]>;
  run(sql: string, params?: readonly SqlValue[]): Promise<RunResult>;
  exec(script: string): Promise<void>; // several statements, no parameters
}
export interface SqlDatabase extends SqlExecutor {
  transaction<T>(work: (tx: SqlExecutor) => Promise<T>): Promise<T>;
}
```

En `sql-database.token.ts`: `export const SQL_DATABASE = new InjectionToken<SqlDatabase>('SQL_DATABASE');`

Reglas del puerto (cada una con su prueba):

- **R1:** `transaction` hace commit si `work` termina bien y devuelve su resultado. Si `work` lanza un error, hace rollback de **todo** lo escrito y **vuelve a lanzar el mismo error**.
- **R2 (serialización):** todas las operaciones del `SqlDatabase` (`query`, `run`, `exec` y `transaction`) pasan por una cola que las ejecuta una por una, en el orden en que se llamaron. Dos `transaction` lanzadas a la vez no se mezclan: la segunda empieza cuando termina la primera. Implementa la cola **una sola vez**, en `serial-queue.ts`, y úsala en los dos adaptadores.
- **R3:** dentro de `work` solo se usa `tx`. Documenta con JSDoc en `transaction` que llamar al `SqlDatabase` desde `work` bloquea la cola. No hace falta detectarlo.

### 2. Adaptador sql.js — `src/testing/sqljs-sql-database.adapter.ts`

`SqlJsDatabase implements SqlDatabase`, en memoria. Expone `static async create(): Promise<SqlJsDatabase>` (usa `await initSqlJs()`, que funciona en `ng test` sin configuración) y activa `PRAGMA foreign_keys = ON` al crearse. Usa `BEGIN` / `COMMIT` / `ROLLBACK`. `lastInsertId` sale de `SELECT last_insert_rowid()`.

### 3. Adaptador Capacitor — `src/app/shared/infrastructure/sqlite/capacitor-sql-database.adapter.ts`

`CapacitorSqlDatabase implements SqlDatabase`, sobre un `SQLiteDBConnection` del plugin, que recibe por el constructor para poder probarlo con un doble.

- `query` → `db.query(sql, params)`; devuelve `values ?? []`.
- `run` → `db.run(sql, params, false)`; `changes.changes` y `changes.lastId`.
- `exec` → `db.execute(script, false)`.
- `transaction` → `beginTransaction()`, `work(tx)` (el `tx` llama a `run` y `execute` con `transaction = false`), `commitTransaction()` y, **solo en web**, `saveToStore(nombreBD)`. Si hay error: `rollbackTransaction()` y se vuelve a lanzar el error original.
- Fuera de una transacción, en web, también llama a `saveToStore` después de cada `run` o `exec`.
- La plataforma y la función `saveToStore` se inyectan (por ejemplo, `{ esWeb: boolean; guardar: () => Promise<void> }`) para poder probarlas.

Archivo `sqlite-connection.factory.ts`: crea la conexión real.

- `nombreBD = 'gestor_resmas'`.
- En web: registra el custom element de `jeep-sqlite` (`defineCustomElements` de `jeep-sqlite/loader`), agrega `<jeep-sqlite>` al `document.body`, espera `customElements.whenDefined('jeep-sqlite')` y llama a `sqlite.initWebStore()`.
- Después: `createConnection(nombreBD, false, 'no-encryption', 1, false)`, `open()` y `PRAGMA foreign_keys = ON` mediante `execute(..., false)`.
- Si la conexión ya existe (`isConnection`), la recupera con `retrieveConnection` en lugar de crearla.

### 4. Migraciones — `src/app/shared/infrastructure/sqlite/migrations/`

- `migracion.ts`: `export interface Migracion { version: number; nombre: string; script: string; }`
- `001-esquema-inicial.ts`: `version: 1`. El `script` es **exactamente** el DDL de `revision/schema-v1.ts` (cópialo; no cambies ningún CHECK) **más** `INSERT INTO clientes (nombre, es_mostrador, fecha_registro) VALUES ('Mostrador', 1, datetime('now', 'localtime'));`
- `index.ts`: `export const MIGRACIONES: readonly Migracion[] = [migracion001];`

`migration-runner.ts` con `migrar(db: SqlDatabase, migraciones: readonly Migracion[]): Promise<number>`:

- **R4:** valida que las versiones sean `1, 2, 3, …`, consecutivas y sin repetir; si no, lanza un `Error` **antes** de tocar la base.
- **R5:** lee `PRAGMA user_version`. Si es **mayor** que la última versión conocida, lanza un `Error` con el mensaje `Database version <n> is newer than this app supports (<m>)` y no toca nada.
- **R6:** aplica en orden cada migración con versión mayor a `user_version`, **cada una en su propia `transaction`**: `tx.exec(script)` y después `tx.exec('PRAGMA user_version = <version>')`. Si una falla, esa queda sin aplicar (rollback), las anteriores quedan aplicadas y el error se propaga.
- **R7:** devuelve la versión final. Correrlo de nuevo no hace nada y devuelve la misma versión.

### 5. Arranque de la app — `src/main.ts`

- Registra `SQL_DATABASE` con una factory que crea la conexión y el adaptador Capacitor.
- Agrega `provideAppInitializer(() => migrar(inject(SQL_DATABASE), MIGRACIONES))`. Como la conexión es asíncrona, envuélvela en un servicio `DatabaseProvider` dentro de `src/app/shared/infrastructure/sqlite/` con un método `init()` que la abre y migra, y un getter `db` que lanza error si se usa antes de `init()`.
- **`angular.json`:** agrega a los `assets` de build la copia de `node_modules/sql.js/dist/sql-wasm.wasm` a `assets/` (jeep-sqlite lo busca en `/assets/sql-wasm.wasm`).

## Pruebas (primero RED, después GREEN; con `SqlJsDatabase` salvo que se diga otra cosa)

| Archivo | Qué prueba |
|---------|-----------|
| `migrations/001-esquema-inicial.spec.ts` | Lleva las 6 pruebas de `revision/schema-v1.spec.ts` a la migración real aplicada con `migrar`. Además: después de migrar, `user_version = 1` y existe exactamente un cliente con `es_mostrador = 1`, de nombre `Mostrador`. Insertar un segundo Mostrador falla con `UNIQUE`. |
| `migration-runner.spec.ts` | R4 con versiones `[1, 3]` y `[1, 1]`: lanza error y `user_version` sigue en 0. R5 con `user_version = 9`: lanza ese mensaje exacto. R6: la migración 2 tiene SQL inválido, así que `user_version` queda en 1, la tabla de la 1 existe y el error se propaga. R7: dos corridas devuelven 1 y la segunda no ejecuta SQL. |
| `sqljs-sql-database.adapter.spec.ts` | R1: commit devuelve el resultado; rollback deja 0 filas y el error que llega es el mismo objeto que se lanzó. R2: dos `transaction` simultáneas, donde la primera espera un `await` interno antes de escribir, terminan con las filas en orden de llamada y sin mezclarse. |
| `capacitor-sql-database.adapter.spec.ts` | Con un doble de `SQLiteDBConnection` hecho con `vi.fn()`: dentro de `transaction`, cada `run` y `execute` recibe `transaction = false`; commit en web llama a `guardar()` y en nativo no; error en `work` llama a `rollbackTransaction`, no a `commitTransaction`, y vuelve a lanzar el error. |
| `serial-queue.spec.ts` | El orden de ejecución es el de llamada, y una tarea que falla no bloquea las siguientes. |

### e2e — `e2e/app.spec.ts`

Agrega una prueba: la app carga en `/`, el título de la página de inicio se ve y no hay mensajes de consola de tipo `error` después de la inicialización de la base. Si Playwright no tiene Chromium, instálalo con `npx playwright install chromium`; eso está permitido.

## Verificación

```
npm run lint
npm run test:unit
npm run test:e2e
npm run build
```

Copia el resultado de cada uno. Además, confirma que en el build quedó `www/assets/sql-wasm.wasm`.
