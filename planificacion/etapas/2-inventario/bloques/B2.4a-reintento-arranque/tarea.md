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
