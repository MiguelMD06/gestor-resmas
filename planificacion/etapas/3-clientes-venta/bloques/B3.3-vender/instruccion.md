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

# Tarea B3.3 — Pestaña Vender (punto de venta)

**Etapa 3, ola 2.** Nadie más escribe en el árbol mientras trabajas. Antes de empezar, lee completos `CLAUDE.md` (raíz del repositorio; sus reglas 1 a 12 son obligatorias) y `planificacion/etapas/3-clientes-venta/PLAN.md` hasta la sección `## Log`. Tu bloque es **B3.3**; si esta tarea y el plan no coinciden, manda el plan y lo informas.

La app es *zoneless*: todo lo que la plantilla muestra y cambia después de un `await` debe ser una **signal**.

## Specs que cubres

S2, S3, S4, S5, S6, S7, S11 y S13; ejemplos E14, E15, E16, E17, E18, E19, E20 y E21 (en Vender); decisiones D5, D6, D11, D12, D13, D15 y D16. Lee su texto en el plan: los textos que ve el usuario están ahí y son exactos.

## Rutas permitidas

```
src/app/ventas/ui/**
src/app/shell/tabs.routes.ts
e2e/vender.spec.ts
```

En `tabs.routes.ts` solo cambias la ruta de **Vender**. Prohibido todo lo demás. Si te falta un caso de uso de consulta, detente y explícalo en el reporte en lugar de crearlo fuera de las rutas.

## Lo que ya existe y debes reutilizar (no lo reimplementes)

- **`RegistrarVenta.registrar({ idCliente, fecha, lineas: { idLote, cantidad, precioUnitario }[], pago })`** en `src/app/ventas/application/registrar-venta.ts`; `PagoVenta` en `src/app/ventas/domain/venta.ts`.
- **`evaluarLinea(cantidad, costoUnitario, precioUnitario) → { subtotalVenta, subtotalCosto, margen, bajoCosto }`** en `src/app/ventas/domain/margen.ts`, para el subtotal y el margen en vivo, y `perdida` para el aviso de bajo costo.
- **`ConsultarInventario.activos() → { CARTA: Lote[]; OFICIO: Lote[] }`** en `src/app/inventario/application/consultar-inventario.ts` (cada `Lote` trae `idLote`, `tipoPapel`, `resmasDisponibles`, `costoUnitarioResma`, `fechaCompra`). Para D11 junta las dos listas en una: primero Carta y después Oficio, cada una en el orden en que llega.
- **`BuscarClientes.buscar(texto, { incluirMostrador: true })`** (Mostrador primero) en `src/app/clientes/application/buscar-clientes.ts`; tipo `Cliente` en `src/app/clientes/domain/cliente.ts`.
- **`ClienteModalComponent`** (`app-cliente-modal`, `src/app/clientes/ui/cliente.modal.ts`): ábrelo con `ModalController.create({ component: ClienteModalComponent, canDismiss: soloCierreExplicito })`; al volver con `ROL_GUARDADO`, `data` es el `Cliente` guardado.
- **`CampoPesosComponent`** (`app-campo-pesos`, `src/app/shared/ui/campo-pesos.component.ts`): `[(valor)]` (`number | null`), `label`, `disabled`, `error`. Úsalo para el precio unitario y el monto del abono inicial (D16).
- **`formatearPesos`** para todo monto que se muestra ("$ 3.800", con espacio).
- **`mensajeDeError(error)`** y los códigos de `shared/ui/mensajes-error.ts`; `soloCierreExplicito`, `ROL_GUARDADO` y `ROL_CANCELAR` en `shared/ui/formulario.ts`.
- **Reloj:** token `CLOCK` (`clock.ahora()` devuelve `FechaHora`, `YYYY-MM-DD HH:MM:SS`). Nunca `new Date()` directo.
- Patrones: estados de carga, error y id de petición en `src/app/inventario/ui/inventario.page.ts` y `src/app/clientes/ui/clientes.page.ts`; guarda `guardando` en `src/app/finanzas/ui/aporte.modal.ts`.

## Especificación

1. **`ventas/ui/vender.page.ts`**, para una sola mano, con la acción principal abajo:
   - **Cliente** arriba: muestra el elegido, por defecto el **Mostrador**. Tocarlo abre un selector (modal o `ion-modal` en línea) con `ion-searchbar` sobre `BuscarClientes` (Mostrador primero) y un botón **Nuevo cliente** que abre `ClienteModalComponent` y deja elegido al cliente creado. Tocar un resultado lo elige y cierra el selector.
   - **Lotes activos** (D11): una sola lista, sin pestañas; cada fila dice **Carta** u **Oficio**, "N resmas" y el costo por resma. Tocar un lote agrega su línea con cantidad 1; un lote ya agregado se ve deshabilitado (D5).
   - **Cada línea:** tipo de papel, costo por resma a la vista, **cantidad** (`ion-input` numérico, entero > 0, ≤ disponibles) y **precio unitario** (`app-campo-pesos`), subtotal y margen en vivo con `evaluarLinea`. Con `bajoCosto`, un `ion-note` de color `warning` con el texto exacto "Precio por debajo del costo: pierdes $ X" (X = pérdida de la línea con `formatearPesos`; E14). Error junto al campo, con el texto de `mensajes-error.ts` (`CANTIDAD_RESMAS_INVALIDA`, `PRECIO_INVALIDO`, `STOCK_INSUFICIENTE`). Un botón de solo ícono para quitar la línea, con `aria-label="Quitar línea"`.
   - **Fecha** (D6, D13): muestra la de ahora del `CLOCK`; tocarla abre un `ion-datetime` de día y hora, con `max` = ahora, que no deja elegir una fecha futura.
   - **Cierre:** total, costo y margen de la venta; `ion-segment` **Contado**, **Fiado** y **Abono inicial**; con el Mostrador elegido solo se ofrece **Contado** (S11). Medio **Efectivo** o **Transferencia**, por defecto **Efectivo** (D12). Con Abono inicial, el monto con `app-campo-pesos`, entre $ 1 y el total menos $ 1 (`ABONO_INICIAL_INVALIDO`, con su texto junto al campo).
   - **Confirmar venta:** deshabilitado si no hay líneas o algún campo es inválido o vacío. Abre el **resumen** (D15) en un modal: cliente; cada línea como "N × Carta a $ P = $ S"; "Total: $ T"; la modalidad y el medio ("Contado · Efectivo", "Fiado", "Abono inicial de $ A · Transferencia"); la fecha. Botones **Aceptar** y **Volver a editar**.
     - **Volver a editar** cierra el resumen sin guardar y deja la venta igual.
     - **Aceptar** llama a `registrar`. La guarda `guardando` se activa **antes** del primer `await` y se libera en `finally`: mientras dura, **Aceptar** y **Volver a editar** están deshabilitados, el resumen no se cierra (backdrop ni gesto) y la página entera queda bloqueada con un indicador de carga. Dos toques en **Aceptar** producen **una sola** llamada a `registrar` (E17).
     - Si falla: se cierra el resumen, se muestra el mensaje exacto con `mensajeDeError` en un `ion-toast` y la venta queda como estaba para reintentar.
     - Si funciona: `ion-toast` "Venta registrada"; el formulario vuelve al estado inicial, con el cliente otra vez en **Mostrador** (D12), y los lotes se recargan (un lote agotado desaparece, E13).
   - **Estados** (regla 4): cargando, con datos, sin lotes ("No hay lotes activos. Registra una compra en Inventario") y error con el texto de `mensajeDeError` y **Reintentar** (deshabilitado mientras carga). Un error nunca se muestra como "sin lotes" (E18). Solo la última carga actualiza la pantalla (id de petición). Recarga los lotes en `ionViewWillEnter`, para ver las compras nuevas al volver de Inventario, sin cargar dos veces en la primera entrada.
2. **`tabs.routes.ts`:** la ruta de Vender apunta a `vender.page` en lugar de la página provisional.

## Pruebas (primero RED)

De componente, con `RegistrarVenta`, `ConsultarInventario`, `BuscarClientes` y el `CLOCK` simulados:

- cantidad y precio: vacío, inválido y válido, con el texto exacto del error y el estado de **Confirmar venta**;
- E14: el aviso con su texto exacto ("Precio por debajo del costo: pierdes $ 1.000");
- Mostrador elegido: solo se ofrece Contado; con Ana, las tres modalidades; Efectivo por defecto;
- abono inicial de $ 0 y del total: error `ABONO_INICIAL_INVALIDO` y botón deshabilitado; de $ 1 y del total menos $ 1: válido;
- un lote ya agregado no se puede agregar otra vez;
- el resumen con los textos exactos de E19; **Volver a editar** no llama a `registrar`;
- doble toque en **Aceptar** → una sola llamada a `registrar`; botones y página deshabilitados mientras guarda; habilitados otra vez tras un error, con el mensaje exacto;
- tras guardar bien: "Venta registrada", el cliente vuelve a Mostrador y los lotes se recargan;
- E18: carga fallida → error y **Reintentar**, no "No hay lotes activos…"; al reintentar con éxito se ven los lotes;
- la fecha: `max` es la del `CLOCK` y lo que se manda a `registrar` es la fecha elegida.

E2E (`e2e/vender.spec.ts`, en web, con la base real de jeep-sqlite; prepara el estado con la interfaz: aporte, compras y la clienta Ana):

- E6 de punta a punta contando los **5 toques** de E19 (sin contar lo que se escribe) y, con Mostrador y contado en efectivo, los **3**;
- E7 multilote;
- E13: vender las 10 resmas del lote B lo saca de Vender y de Inventario;
- después de recargar la página, el stock sigue descontado.

Acota los selectores del e2e a la página de Vender (por ejemplo `app-vender`): Ionic mantiene montadas las pestañas visitadas y otros `data-testid` se repiten.

## Verificación

Corre en primer plano y copia el resultado (con el número de pruebas):

```
npm run lint
npm run test:unit
npm run build
npm run test:e2e
```

Indica qué prueba cubre cada `S#`, `E#` y `D#` de esta tarea.
