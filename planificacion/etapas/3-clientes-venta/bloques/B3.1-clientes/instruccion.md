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

# Tarea B3.1 — Clientes: migración 002, dominio, repositorio, casos de uso y pestaña Clientes

**Etapa 3, ola 1.** Trabajas en paralelo con B3.2 (venta) y B3.4 (campo de pesos), que tocan otras rutas. Antes de empezar, lee completos `CLAUDE.md` (raíz del repositorio; sus reglas 1 a 12 son obligatorias) y `planificacion/etapas/3-clientes-venta/PLAN.md` hasta la sección `## Log`. Tu bloque es **B3.1**; si esta tarea y el plan no coinciden, manda el plan y lo informas.

La app es *zoneless*: todo lo que la plantilla muestra y cambia después de un `await` debe ser una **signal**.

## Specs que cubres

S1, S14; ejemplos E1, E2, E3, E3b, E4, E5 y E18; decisiones D1, D9 y D10. Lee su texto en el plan.

## Rutas permitidas

```
src/app/clientes/**
src/app/shell/tabs.routes.ts
e2e/clientes.spec.ts
src/app/shared/infrastructure/sqlite/migrations/002-telefono-unico.ts
src/app/shared/infrastructure/sqlite/migrations/002-telefono-unico.spec.ts
src/app/shared/infrastructure/sqlite/migrations/index.ts
```

En `tabs.routes.ts` solo cambias la ruta de **Clientes**. Prohibido todo lo demás.

## Lo que ya existe y debes reutilizar

- **Tabla `clientes`** (migración `001`): `id_cliente`, `nombre` (CHECK no vacío), `telefono` (nulo permitido), `es_mostrador` (0/1, índice único parcial: un solo Mostrador), `fecha_registro`. El Mostrador ya está insertado.
- **Migraciones:** `Migracion { version, nombre, script }` en `migrations/migracion.ts`; `MIGRACIONES` en `migrations/index.ts`; `migrar(db, MIGRACIONES)` en `migration-runner.ts`.
- **Transacciones:** `SQL_DATABASE` (`shared/infrastructure/sqlite/sql-database.token.ts`), `db.transaction(async (tx) => …)`, con `tx: SqlExecutor`. Patrón de caso de uso: `src/app/inventario/application/registrar-compra.ts`.
- **Reloj:** token `CLOCK` (`shared/infrastructure/clock/clock.token.ts`) para `fecha_registro`. Nunca `new Date()` directo.
- **Errores:** `ReglaNegocioError` con los códigos `NOMBRE_INVALIDO`, `TELEFONO_INVALIDO`, `TELEFONO_REPETIDO` y `CLIENTE_INEXISTENTE` (ya existen); textos en `shared/ui/mensajes-error.ts` con `mensajeDeError(error)`.
- **UI:** `soloCierreExplicito`, `ROL_GUARDADO`, `ROL_CANCELAR` y `esVacio` en `shared/ui/formulario.ts`; patrón de modal con `guardando` en `src/app/finanzas/ui/aporte.modal.ts`; página con estados de carga y error en `src/app/inventario/ui/inventario.page.ts`.
- **Pruebas:** `SqlJsDatabase.create()` (`src/testing/sqljs-sql-database.adapter.ts`) + `migrar(db, MIGRACIONES)`, como en `registrar-compra.spec.ts`.

## Especificación

0. **Migración `002-telefono-unico.ts`** (D9): `version: 2`, script `CREATE UNIQUE INDEX ux_clientes_telefono ON clientes (telefono) WHERE telefono IS NOT NULL;`. Regístrala en `MIGRACIONES` después de la `001`.
1. **`clientes/domain/cliente.ts`** (funciones puras, sin Angular ni SQLite):
   - `validarNombre(texto: string): string` — recorta; `NOMBRE_INVALIDO` si queda vacío o tiene más de 80 caracteres.
   - `validarTelefono(texto: string | null): string | null` — vacío o solo espacios → `null`; si no, quita los espacios y exige exactamente 10 dígitos que empiecen por 3; si no, `TELEFONO_INVALIDO`. Cualquier otro carácter (guiones, letras, `+`) se rechaza.
   - `normalizarBusqueda(texto: string): string` — minúsculas y sin tildes.
   - Tipo `Cliente { idCliente, nombre, telefono: string | null, esMostrador: boolean }`.
2. **`clientes/infrastructure/cliente.repository.ts`** (`@Injectable({ providedIn: 'root' })`): `insertar(tx, { nombre, telefono }, fecha) → idCliente`, `actualizar(tx, idCliente, { nombre, telefono })`, `porId(db, id) → Cliente | null`, `porTelefono(db, telefono) → Cliente | null`, `mostrador(db) → Cliente`, `todos(db) → Cliente[]` sin el Mostrador, en orden alfabético por nombre. Si el `INSERT` o el `UPDATE` falla por el índice único `ux_clientes_telefono`, lanza `ReglaNegocioError('TELEFONO_REPETIDO', …)`.
3. **`clientes/application/`** (`@Injectable({ providedIn: 'root' })`):
   - `RegistrarCliente.registrar({ nombre, telefono }) → { idCliente }`: valida con el dominio y, en una transacción, rechaza con `TELEFONO_REPETIDO` si `porTelefono` devuelve a otro cliente; inserta con la fecha del `CLOCK`.
   - `EditarCliente.editar({ idCliente, nombre, telefono })`: igual, sin contar al propio cliente; `CLIENTE_INEXISTENTE` si el id no existe o es el Mostrador. Se puede dejar el teléfono vacío.
   - `BuscarClientes.buscar(texto, opciones?: { incluirMostrador?: boolean }) → Cliente[]`: filtra por coincidencia parcial con `normalizarBusqueda` sobre el nombre y el teléfono; sin texto devuelve todos. Con `incluirMostrador: true`, el Mostrador va primero (lo usa la pestaña Vender en la ola 2).
4. **`clientes/ui/clientes.page.ts`**: `ion-searchbar`, lista con nombre y teléfono, y los cuatro estados de la regla 4 de `CLAUDE.md`: cargando, con datos, vacío ("Todavía no hay clientes") y error con el texto de `mensajeDeError` y **Reintentar** (deshabilitado mientras carga). Solo la última carga actualiza la pantalla (id de petición). Un `ion-fab` **Nuevo cliente** con `aria-label`. Tocar un cliente abre el modal en modo edición; al volver con `ROL_GUARDADO`, recarga.
5. **`clientes/ui/cliente.modal.ts`**: campos **Nombre completo** y **Celular** con etiqueta visible, validación en vivo con el dominio y el error junto al campo, en español, con el texto de `mensajes-error.ts`. **Guardar cliente** deshabilitado mientras un campo sea inválido o mientras guarda (`guardando` se activa antes del primer `await` y se libera en `finally`). Mientras guarda, campos y **Cancelar** deshabilitados y el modal no se cierra (`canDismiss: soloCierreExplicito`). Un error del guardado (por ejemplo `TELEFONO_REPETIDO`) se muestra junto al campo de celular si es de teléfono, y si no, con un `ion-toast`. Al guardar bien, cierra con `ROL_GUARDADO` y devuelve el `Cliente` guardado.
6. **`tabs.routes.ts`:** la ruta de Clientes apunta a `clientes.page` en lugar de la página provisional.

## Pruebas (primero RED)

Una prueba por regla, con todos sus efectos observables, por la interfaz pública:

- Migración `002`: sobre `001` con el Mostrador, corre; después, un `INSERT` con teléfono repetido falla y dos con `telefono` `NULL` funcionan.
- Dominio: nombre vacío, de solo espacios, de 80 y de 81 caracteres; teléfono `null`, `''`, `'3001234567'`, `'300 123 4567'` (→ `'3001234567'`), `'300-ABC'`, `'2001234567'`, `'300123456'`, `'30012345678'`; búsqueda sin tildes ni mayúsculas.
- Casos de uso con `SqlJsDatabase` y las migraciones reales: E1, E2, E3, E3b (incluido que el rechazo no escribe nada y que la edición de Ana con su mismo número se guarda), E4 (mismo `id_cliente`), E5, editar el Mostrador → `CLIENTE_INEXISTENTE`, `todos` sin el Mostrador y en orden alfabético, `buscar` con `incluirMostrador` (Mostrador primero).
- Modal: cada campo vacío, inválido y válido con el estado del botón; doble envío (dos `guardar()` concurrentes → una sola llamada a `registrar`); botón habilitado otra vez tras un error, con el texto exacto que ve el usuario.
- Página: E18 (si la carga falla se ve el error y **Reintentar**, no "Todavía no hay clientes"; al reintentar con éxito se ve la lista).
- `e2e/clientes.spec.ts`: crear a "Ana Pérez" con "3001234567", buscarla, editarla a "Ana María Pérez" y, después de recargar la página, sigue ahí. **No lo corras**: lo corre el coordinador después de la ola.

## Verificación

Corre en primer plano y copia el resultado (con el número de pruebas):

```
npm run lint
npm run test:unit
```

**No corras `npm run build` ni `npm run test:e2e`:** otros dos bloques trabajan en paralelo y comparten `www/`; los corre el coordinador al terminar la ola. Indica qué prueba cubre cada `S#`, `E#` y `D#` de esta tarea.
