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

# Tarea B3.V — Correcciones de la verificación V3 y pruebas de aceptación

**Etapa 3, correcciones finales.** Nadie más escribe en el árbol mientras trabajas. Antes de empezar, lee `CLAUDE.md` (raíz; reglas 1 a 12) y, en `planificacion/etapas/3-clientes-venta/PLAN.md`, **D6**, **D13**, **D15**, **E17**, **E18** y **E19**. La verificación V3 aprobó la etapa sin bloqueantes; esto cierra sus observaciones.

La app es *zoneless*: todo lo que la plantilla muestra y cambia después de un `await` debe ser una **signal**.

## Rutas permitidas

```
src/app/ventas/ui/**
src/app/clientes/ui/cliente.modal.ts
src/app/clientes/ui/cliente.modal.spec.ts
src/app/etapa-3.acceptance.spec.ts
e2e/etapa-3.acceptance.spec.ts
```

Prohibido todo lo demás.

## Especificación

- **V1. Un solo resumen por toque (regla 2, E17).** En `vender.page.ts`, `abrirResumen()` no tiene guarda: dos toques rápidos en **Confirmar venta** pueden abrir dos resúmenes mientras `modalCtrl.create()` resuelve, y cada uno podría guardar una venta. Agrega una signal (por ejemplo `abriendoResumen`) que se activa **antes** del primer `await` de `abrirResumen()` y se libera en `finally`; mientras esté activa, `abrirResumen()` no hace nada y **Confirmar venta** queda deshabilitado (también para lectores de pantalla).
- **V2. Sin código muerto (regla 9).** `VenderPage` declara `guardando` y lo enlaza en la plantilla, pero nunca lo activa: el guardado vive en `resumen-venta.modal.ts`. Haz que la página quede bloqueada mientras el resumen guarda, como pide el plan (por ejemplo, que el modal informe a la página que empezó y terminó de guardar, o que la página mantenga `guardando` activo mientras el resumen está abierto y guardando). Si eliges otra forma que cumpla lo mismo, elimina `guardando` de la página. En ningún caso queda una signal que nunca cambia.
- **V3. Límite de fecha al día (regla 11, D6, D13).** `maxFechaIso` es un `computed` que no lee ninguna signal y queda fijo en el primer render. Calcúlalo con `CLOCK` cada vez que se abre el selector de fecha (por ejemplo, una signal que se actualiza al abrirlo), para que la hora actual siempre se pueda elegir y una futura nunca.
- **V4. Error visible en la búsqueda de clientes (regla 4).** En el selector de clientes de Vender, si `BuscarClientes.buscar` falla, se muestra el error con el texto de `mensajeDeError` y un botón **Reintentar** (deshabilitado mientras busca), en lugar de conservar la lista anterior en silencio. Solo la última búsqueda actualiza la lista (id de petición).
- **V5. Vista bloqueada y accesible (reglas 3 y 10).** En `vender.page.ts`, mientras `cargando()` o mientras se guarda, el botón de fecha y los `ion-segment` de modalidad y medio quedan deshabilitados, como ya pasa con los demás controles. En `cliente.modal.ts`, los campos **Nombre completo** y **Celular** reflejan el estado deshabilitado con `[attr.aria-disabled]`, igual que los botones.
- **V6. Pruebas de aceptación de V3.** El verificador dejó sus pruebas en una copia temporal. Cópialas tal cual, cambiando solo el nombre del archivo y las rutas relativas de los `import` si hace falta:
  - `C:\Users\MIGUEL ANGEL\AppData\Local\Temp\v3-verify-20261115-234107\repo\src\app\verificacion-v3.spec.ts` → `src/app/etapa-3.acceptance.spec.ts`
  - `C:\Users\MIGUEL ANGEL\AppData\Local\Temp\v3-verify-20261115-234107\repo\e2e\verificacion-v3.spec.ts` → `e2e/etapa-3.acceptance.spec.ts`

  No cambies lo que verifican. Si alguna deja de pasar por V1 a V5, ajusta solo lo necesario y explícalo en el reporte. No borres el directorio temporal.

## Pruebas (primero RED)

- V1: dos llamadas seguidas a `abrirResumen()` sin esperar → `modalCtrl.create` se llama **una** vez; **Confirmar venta** deshabilitado mientras abre y habilitado después, también si `create` falla.
- V2: mientras el resumen guarda, la página está bloqueada (o, si eliminaste `guardando`, la prueba que lo cubra); ninguna signal de la página queda sin uso.
- V3: con un `CLOCK` que avanza entre la primera y la segunda apertura del selector de fecha, el `max` es la hora de cada apertura.
- V4: `buscar` rechaza → se ve el error y **Reintentar**; al reintentar con éxito, la lista; una respuesta vieja que llega tarde no pisa la nueva.
- V5: con `cargando()` en `true`, el botón de fecha y los segmentos están deshabilitados; en el modal de cliente, mientras guarda, los dos campos tienen `aria-disabled="true"`.

## Verificación

Corre en primer plano y copia el resultado (con el número de pruebas):

```
npm run lint
npm run test:unit
npm run build
npm run test:e2e
```
