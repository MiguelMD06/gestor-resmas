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
8. **Reglas de calidad de `CLAUDE.md`:** lee `CLAUDE.md` en la raíz del repositorio. Sus reglas 1 a 6 (validación de campos, doble envío, bloqueo durante procesos, errores visibles, reintentos seguros y pruebas obligatorias) son de cumplimiento obligatorio en todo lo que escribas.

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

# Tarea B2.4a — Reintento de arranque sin conexiones duplicadas

**Etapa 2, bloque de pendientes B2.4.** Trabajas en paralelo con B2.4b, que toca otras rutas. Lee `CLAUDE.md` en la raíz del repositorio antes de empezar: sus reglas 1 a 6 son obligatorias, en especial la regla 5 (reintentos seguros).

## Problema

`src/app/shared/infrastructure/sqlite/sqlite-connection.factory.ts` crea `new SQLiteConnection(CapacitorSQLite)` en **cada** llamada. `isConnection` y `retrieveConnection` solo consultan el diccionario interno de **esa instancia**, así que en un segundo intento siempre dan "no existe" y se vuelve a llamar a `createConnection`. En Android, el plugin nativo ya tiene registrada la conexión del intento anterior y lanza `Connection gestor_resmas already exists` (`CapacitorSQLite.java:334`). Resultado: si el primer arranque falla **después** de `createConnection` (falla `open()`, el `PRAGMA foreign_keys` o una migración en `DatabaseProvider.init`), el botón **Reintentar** de la pantalla de error falla siempre hasta reiniciar la app.

Las migraciones ya son seguras para reintentar: cada una corre en su propia transacción y avanza `PRAGMA user_version` (`migrations/migration-runner.ts`).

## Rutas permitidas

```
src/app/shared/infrastructure/sqlite/sqlite-connection.factory.ts
src/app/shared/infrastructure/sqlite/sqlite-connection.factory.spec.ts
src/app/shared/infrastructure/sqlite/database.provider.spec.ts
src/app/shell/estado-arranque.spec.ts
```

Prohibido todo lo demás. Si crees que necesitas tocar `database.provider.ts`, detente y explícalo en el reporte.

## Especificación

- **S1.** La app usa **una sola** instancia de `SQLiteConnection` durante toda su vida (singleton de módulo, creado de forma perezosa en la primera llamada). Un segundo llamado a `createCapacitorSqlDatabase()` después de un intento fallido reutiliza esa instancia: si la conexión `gestor_resmas` ya existe, la recupera con `retrieveConnection` y **no** llama a `createConnection`.
- **S2.** Si algo falla **después** de crear o recuperar la conexión y antes de devolver el adaptador (`isDBOpen`, `open`, `execute('PRAGMA foreign_keys = ON;')`), la factory cierra la conexión con `closeConnection(DB_NAME, false)` y relanza el **error original**. Si `closeConnection` también falla, se ignora ese segundo error y se relanza el original.
- **S3.** En web, `initWebStore` y la creación del elemento `jeep-sqlite` no se repiten de forma que fallen en el segundo intento: conserva la comprobación `document.querySelector('jeep-sqlite')` y asegúrate de que `initWebStore` solo se llame una vez con éxito por instancia.
- **S4.** El comportamiento del primer arranque exitoso no cambia: mismas llamadas, mismo orden, mismo adaptador devuelto.

## Pruebas (primero RED)

En `sqlite-connection.factory.spec.ts` (para el singleton usa `vi.resetModules()` y un `import()` dinámico por prueba, o el mecanismo equivalente que elijas, y explícalo en el reporte):

1. Primer intento: `open` rechaza → la factory rechaza con ese mismo error y llama a `closeConnection(DB_NAME, false)`.
2. Segundo intento en el mismo módulo, después del fallo anterior: `isConnection` devuelve `{ result: true }` → se llama a `retrieveConnection`, **no** a `createConnection`, y la factory resuelve.
3. `execute('PRAGMA …')` rechaza → se cierra la conexión y se relanza el error original, aunque `closeConnection` también rechace.
4. Dos llamadas seguidas usan la **misma** instancia de `SQLiteConnection` (el constructor del mock se invoca una sola vez).
5. Las pruebas existentes siguen pasando sin cambiar lo que verifican.

En `database.provider.spec.ts`: si `createDatabase` resuelve pero `migrar` falla en el primer `init()`, un segundo `init()` con una migración que ahora funciona termina bien y `db` queda disponible.

En `estado-arranque.spec.ts`: traduce al inglés los títulos de `it()` y los comentarios que están en español (convención del repositorio), sin cambiar lo que verifican.

## Verificación

```
npm run lint
npm run test:unit
npm run build
```

Copia el resultado de cada comando con el número de pruebas, e indica qué prueba cubre cada `S#`.
