[MODO EJECUTOR]

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

## Reglas de calidad y de interfaz

- **Reglas 1 a 12 de `CLAUDE.md`** (raíz del repositorio): son obligatorias en todo bloque. Léelas antes de empezar: validación de cada campo, guarda contra el doble envío, vista bloqueada mientras procesa, cuatro estados de carga, reintentos seguros, pruebas obligatorias, dinero en enteros, confirmación de acciones irreversibles, sin código muerto, accesibilidad mínima, fechas desde `CLOCK` y checklist del PR.
- **Diseño:** las pantallas siguen `planificacion/comun/diseno.md` y los mockups aprobados.
- **Montos que se escriben:** usa siempre el campo de pesos de `src/app/shared/ui/` (muestra "$ 3.800" y entrega el entero `3800`, o `null` si está vacío). No crees otro campo de dinero.
- **La app es *zoneless*:** el estado que cambia después de un `await` vive en signals; si no, la pantalla no se actualiza.

## Reglas de trabajo

1. **Solo tocas las rutas permitidas** de tu tarea. Si necesitas otra, no la toques: detente y explícalo en el reporte.
2. **No uses git:** nada de `commit`, `add`, `stash`, `checkout` ni `push`. El coordinador revisa y hace los commits.
3. **Pruebas primero** cuando haya una regla con resultado esperado claro: escribe la prueba, mírala fallar (RED), implementa (GREEN) y refactoriza con las pruebas en verde. Escribe una prueba por cada regla que pide la tarea, y cada prueba verifica todos los efectos observables de la regla.
4. **Archivos temporales** fuera del repositorio. Si alguno queda dentro, informa su ruta exacta.
5. **No instales dependencias** salvo que la tarea lo pida, y nunca corras formateadores, generadores ni instalaciones sobre todo el repositorio.
6. **Pruebas que prueban lo que dicen:**
   - prueba intentando romper el código: además del caso feliz, cubre valores límite, el segundo y el último elemento (no solo el primero), repetir la acción (doble envío) y fallos de carga o escritura;
   - cada prueba llama a la función que nombra su título;
   - un rechazo esperado se acota al error exacto: `toThrow(expect.objectContaining({ codigo: '...' }))` o un mensaje concreto, nunca `toThrow()` o `rejects.toThrow()` a secas;
   - nada de `try/catch` para verificar un error: si no se lanza, la prueba tiene que fallar;
   - los casos límite usan el valor límite exacto.
7. **Engram:** tienes acceso de solo lectura. Úsalo si te sirve para tener contexto; nunca intentes escribir en él.
8. **Cierra todo servidor** que levantes para una prueba apenas termine.

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
npm run test:e2e
```

Si tu bloque corre en paralelo con otro, la tarea dice cuáles de estos comandos corre el coordinador (por ejemplo, `build` porque los dos escribirían en `www/`, o `test:e2e` porque ambos usarían el puerto 4200).

## Reporte final

1. Qué hiciste, archivo por archivo.
2. Qué `S#` de la tarea cubriste y con qué prueba.
3. Resultado de cada comando de verificación (`<comando>: <resultado observado>`).
4. Lo que quedó pendiente o no pudiste verificar.
5. Rutas de archivos temporales, si las hubo.

Cierra con una sección `## Key Learnings` de 1 a 5 puntos numerados, cada uno con un aprendizaje reutilizable en una oración completa. Omítela si no hubo ninguno.

---

# Tarea B4.3 — Expediente del cliente

## Objetivo

Crear la pantalla del expediente de un cliente, según los mockups aprobados `planificacion/diseno/mockups/ClienteExpediente.dc.html` (pestaña Facturas), `ClienteAbonos.dc.html` (pestaña Abonos) y `ClientesEstados.dc.html` (sección Expediente), y conectarla: tocar un cliente en el directorio abre su expediente; desde ahí se edita el cliente y se registran abonos con el modal del bloque B4.2. Cierra la etapa con un e2e de aceptación que recorre el flujo completo en la app.

## Rutas

**Permitidas** (solo estas):

- `src/app/clientes/ui/expediente.page.ts` y `src/app/clientes/ui/expediente.page.spec.ts` (nuevos)
- `src/app/clientes/ui/expediente-ui.helpers.ts` y su `.spec.ts` (nuevos, si los necesitas)
- `src/app/clientes/ui/clientes.page.ts` y `src/app/clientes/ui/clientes.page.spec.ts` (solo la navegación al tocar un cliente)
- `src/app/cartera/ui/abono.modal.ts` y `src/app/cartera/ui/abono.modal.spec.ts` (solo la entrada `idVentaInicial` y el punto 12)
- `src/app/cartera/ui/resumen-abono.modal.ts` y `src/app/cartera/ui/resumen-abono.modal.spec.ts` (solo el punto 12)
- `src/app/shell/tabs.routes.ts` (solo la ruta del expediente)
- `src/app/shared/ui/estilos/**` (solo piezas nuevas)
- `src/verificacion/b4-1/b4-1.verificacion.spec.ts` (solo las pruebas que esperan que tocar un cliente abra el modal de editar)
- `e2e/clientes.spec.ts` y `e2e/etapa-4.acceptance.spec.ts` (nuevo)

**Prohibidas:** todo lo demás, en especial `src/app/cartera/application/**`, `src/app/cartera/domain/**`, `src/app/cartera/infrastructure/**`, `src/app/clientes/ui/cliente.modal.ts` (se usa tal cual), `src/app/clientes/application/**`, `src/app/ventas/**` y `src/verificacion/b4-3/**` (carpeta del verificador).

## Specs que cubre (citas textuales del plan)

- **S1 (RF-06):** "Al consultar el perfil de un cliente, el sistema deberá mostrar de forma organizada su deuda total actual, el historial detallado de facturas emitidas (indicando fecha, cantidad y tipo de resmas compradas, precio cobrado y estado de pago) y el historial de abonos realizados."
- **S6 (RF-15):** "Por cada abono recibido, el sistema deberá almacenar la fecha, el monto entregado, el medio de pago (Efectivo o Transferencia) y el detalle exacto de a qué factura o facturas se aplicó el descuento."
- **S13 (`comun/diseno.md`):** "expediente con la deuda total (capital por recuperar y ganancia por cobrar), los botones **Registrar abono** y **Pagar todo**, y las pestañas Facturas y Abonos (RF-06, RF-15). Las facturas van de la más nueva a la más antigua"
- **S14:** "estado de factura: Pendiente en rojo, Abonada parcialmente en celeste y Pagada en verde (`#34D399`)" · "medio de pago: Efectivo en verde billete (`#8FCB6B`) y Transferencia en violeta (`#B49CF0`), cada uno con su ícono"
- **S15:** ""Editar" reutiliza el modal de nuevo cliente con el título "Editar cliente"."
- **D6:** "Tocar un cliente en el directorio abre su expediente; **Editar** pasa al expediente y abre `cliente.modal.ts` con el título "Editar cliente"."
- **D7:** "**Registrar abono** abre el modo "A la deuda"; **Pagar todo** abre el modo "Pagar todo" con el monto fijo."
- **D16 (texto aprobado):** «Este cliente todavía no tiene compras» (expediente sin facturas).

## Lo que ya existe y debes reutilizar

- **`ConsultarExpediente.consultar(idCliente)`** (`src/app/cartera/application/consultar-expediente.ts`): devuelve `{ cliente, deuda: { total, capital, ganancia }, facturas, abonos }`. `facturas` ya viene de la más nueva a la más antigua, cada una con `idVenta`, `fecha`, `total`, `costoBase`, `pagado`, `saldo`, `estado` (`PENDIENTE` | `PARCIAL` | `PAGADA`) y `lineas` (`cantidad`, `tipoPapel`, `precioUnitario`, `subtotal`). `abonos` ya viene del más nuevo al más antiguo, sin `PAGO_CONTADO`, cada uno con `idAbono`, `fecha`, `monto`, `medio`, `tipo` y `aplicaciones` (`idVenta`, `monto`). Lanza `CLIENTE_INEXISTENTE` si el cliente no existe. **No cambies su forma.**
- **`AbonoModalComponent`** (`src/app/cartera/ui/abono.modal.ts`, bloque B4.2): entradas `cliente`, `facturas: readonly FacturaAbierta[]` (las abiertas, de la más antigua a la más nueva) y `modoInicial`; se cierra con `ROL_GUARDADO` cuando guarda. Se abre con `canDismiss: soloCierreExplicito`, como lo hace `vender.page.ts` con sus modales.
- **`cliente.modal.ts`**: con la entrada `cliente`, ya muestra "Editar cliente". Hoy lo abre `clientes.page.ts` desde `abrirModalEditar`: copia esa forma de abrirlo.
- `formatearPesos`, `iniciales.ts`, `etiquetaPapel` (de `src/app/ventas/ui/venta-ui.helpers.ts`: se importa, no se cambia), los formatos de fecha de `src/app/cartera/ui/abono-ui.helpers.ts`, `mensajeDeError` y `MENSAJE_ERROR_GENERICO` ("Ocurrió un error inesperado", `shared/ui/mensajes-error.ts`) y los estilos de `shared/ui/estilos/` (tarjeta, segmento, estados vacío y error).

## Qué hacer

1. **Ruta** `clientes/:id` en `shell/tabs.routes.ts`, dentro de la pestaña Clientes, con carga diferida de `ExpedientePage`. El expediente tiene botón de volver al directorio.
2. **Directorio:** tocar un cliente navega a su expediente, en lugar de abrir el modal de editar. Actualiza las pruebas que esperaban el modal (`clientes.page.spec.ts`, `src/verificacion/b4-1/b4-1.verificacion.spec.ts` y `e2e/clientes.spec.ts`): ahora esperan la navegación, y la edición se prueba desde el expediente. No cambies ninguna otra cosa que verifiquen.
3. **Cabecera** según `ClienteExpediente.dc.html`: **Editar**, el avatar con las iniciales, el nombre y el celular ("Sin celular" si no tiene); la tarjeta "Deuda total" con el monto, "N facturas con saldo" ("1 factura con saldo"), "Capital por recuperar" y "Ganancia por cobrar"; y los botones **Registrar abono** (lima) y **Pagar todo · $ N** (celeste). Con deuda $0, la tarjeta muestra "$ 0" y "Al día", y los dos botones quedan deshabilitados (también para lectores de pantalla).
4. **Pestañas** con `ion-segment`: "Facturas · N" y "Abonos · M".
5. **Pestaña Facturas**, de la más nueva a la más antigua: "Factura #N", la fecha y hora legible, el estado con su color ("Pendiente" rojo `#FF6B6B`, "Abonada parcialmente" celeste `#5EC8F2`, "Pagada" verde `#34D399`), cada línea "C × Carta · $ P c/u" con su subtotal y, si tiene saldo, "Pagado $ X de $ T", "Saldo $ S" y el botón **Abonar a esta factura**. Las facturas pagadas no muestran Pagado, Saldo ni el botón.
6. **Pestaña Abonos**, del más nuevo al más antiguo: el monto, "fecha · tipo" (`ABONO_INICIAL` → "Abono inicial", `CASCADA_GLOBAL` → "A la deuda", `FACTURA_INDIVIDUAL` → "A una factura", `LIQUIDACION_TOTAL` → "Pagar todo"), el medio con su color e ícono, y cada factura a la que se aplicó ("Factura #N" con el monto). Si con ese abono la factura quedó pagada, se agrega "· quedó pagada". Se calcula en la interfaz con los datos del expediente: la factura quedó pagada con ese abono si la suma de lo aplicado a ella por ese abono y los anteriores llega a su `total`. No cambies `ConsultarExpediente` para esto.
7. **Abonos:**
   - **Registrar abono** abre `AbonoModalComponent` con `modoInicial: 'CASCADA_GLOBAL'`;
   - **Pagar todo** lo abre con `'LIQUIDACION_TOTAL'`;
   - **Abonar a esta factura** lo abre con `'FACTURA_INDIVIDUAL'` y esa factura ya elegida. Para eso, agrega a `abono.modal.ts` la entrada opcional `idVentaInicial?: number`, que deja elegida esa factura si está entre las abiertas, con su prueba.
   Se le pasan las facturas con saldo del expediente como `FacturaAbierta` (`idVenta`, `fecha`, `total`, `costoBase`, `pagado`), **de la más antigua a la más nueva**. Si el modal se cierra con `ROL_GUARDADO`, el expediente se recarga.
8. **Editar** abre `cliente.modal.ts` con el cliente; si se guarda, el expediente se recarga y muestra el nombre nuevo.
9. **Estados** (regla 4), según `ClientesEstados` (sección Expediente): cargando (indicador y botones deshabilitados); sin facturas: «Este cliente todavía no tiene compras»; sin abonos: un estado vacío en la pestaña Abonos; error: "Ocurrió un error inesperado" (el mismo texto que el directorio) con **Volver** y **Reintentar**. Un error nunca se muestra como "sin compras". Con `CLIENTE_INEXISTENTE` (por ejemplo, la URL de un id que no existe), el error con **Volver**.
10. Recarga el expediente en cada `ionViewWillEnter`, y descarta respuestas viejas con un id de petición (regla 3).
11. **Accesibilidad** (regla 10): botones de solo ícono con `aria-label` ("Volver", "Editar cliente"), segmento con etiqueta y deshabilitados con `aria-disabled`.
12. **Arreglos de la revisión del B4.2** (regla 3 de `CLAUDE.md`: un modal no se cierra mientras procesa), cada uno con su prueba:
    - `abono.modal.ts:770`: `cancelar()` (y el botón **Cancelar**, deshabilitado) tampoco actúa mientras `abriendoResumen()` es verdadero.
    - `resumen-abono.modal.ts:355`: `volverAEditar()` tiene su propia guarda contra el doble toque (un segundo toque no hace nada mientras se cierra) y maneja el error de `dismiss`, sin dejar una promesa rechazada.
    - `abono.modal.ts:828-842`: si el abono ya se guardó y falla el `dismiss` del modal de abono, **no** se muestra un toast de error (el pago ya quedó registrado); el error del toast solo aparece si falló algo antes de guardar. Agrega la prueba del camino en que falla `modalCtrl.create` o `present` del resumen.

Agrega, como mínimo, estos `data-testid`: `expediente-nombre`, `expediente-deuda-total`, `expediente-capital`, `expediente-ganancia`, `expediente-facturas-con-saldo`, `btn-registrar-abono`, `btn-pagar-todo`, `btn-editar-cliente`, `segment-facturas`, `segment-abonos`, `tarjeta-factura`, `estado-factura`, `btn-abonar-factura`, `tarjeta-abono`, `aplicacion-abono`, `mensaje-sin-compras`; y reutiliza `indicador-carga`, `estado-error`, `mensaje-error-carga` y `btn-reintentar`.

## Pruebas

Pruebas primero (RED → GREEN):

- **Unitarias de la página** con `ConsultarExpediente`, `ModalController` y el router simulados: la cabecera, las dos pestañas con su orden y sus colores, "quedó pagada", los botones según la deuda, cada botón abre el modal correcto con sus entradas exactas, la recarga después de guardar, los cuatro estados con el texto exacto y que una respuesta vieja no pisa a la nueva.
- **`abono.modal.spec.ts`:** `idVentaInicial` deja elegida esa factura; con un id que no está entre las abiertas, no elige ninguna.
- **e2e de aceptación** (`e2e/etapa-4.acceptance.spec.ts`), todo por la app: crea un cliente, véndele a fiado dos veces (una con abono inicial), abre su expediente desde el directorio y comprueba la deuda, el capital y la ganancia por cobrar y las facturas; registra un abono "A la deuda", comprueba en el resumen y después en el expediente que las facturas y la pestaña Abonos cambiaron; usa **Pagar todo** y comprueba que queda "Al día" en el expediente y en el directorio. Además, un cliente sin compras muestra «Este cliente todavía no tiene compras».
- Las pruebas que ya existen siguen pasando, salvo las de tocar un cliente del punto 2, que se actualizan.

Los criterios de aceptación que siguen dicen qué se exige.

---

# Criterios de aceptación — B4.3

Datos de partida de las pruebas unitarias (expediente simulado de **Ana**, celular 3104567890): deuda `{ total: 40000, capital: 25000, ganancia: 15000 }`; facturas, de la más nueva a la más antigua: **F2** (id 2, 2026-11-10 10:00:00, 1 × Oficio a $15.000, total $15.000, costo $10.000, pagado $5.000, saldo $10.000, `PARCIAL`) y **F1** (id 1, 2026-11-01 10:00:00, 2 × Carta a $15.000, total $30.000, costo $20.000, pagado $0, saldo $30.000, `PENDIENTE`); abonos: el `ABONO_INICIAL` de $5.000 en Efectivo a F2. Los montos se ven con `formatearPesos`.

- C1: Tocar a Ana en el directorio navega a su expediente (`clientes/<id>`) y no abre el modal de editar. El expediente tiene botón de volver al directorio, con `aria-label` "Volver".
- C2: La cabecera muestra las iniciales, "Ana", "3104567890" ("Sin celular" para un cliente sin teléfono), "Deuda total" $ 40.000, "2 facturas con saldo", "Capital por recuperar" $ 25.000 y "Ganancia por cobrar" $ 15.000, y los botones **Registrar abono** y **Pagar todo · $ 40.000**, habilitados.
- C3: Con una sola factura con saldo dice "1 factura con saldo". Con deuda $0 la tarjeta dice "$ 0" y "Al día", y **Registrar abono** y **Pagar todo** están deshabilitados (`disabled` y `aria-disabled`).
- C4: Las pestañas dicen "Facturas · 2" y "Abonos · 1". La pestaña Facturas muestra primero "Factura #2" y después "Factura #1", cada una con su fecha y hora legible.
- C5: Estados de factura con su color: F2 "Abonada parcialmente" en celeste `#5EC8F2`, F1 "Pendiente" en rojo `#FF6B6B`, y una factura `PAGADA` "Pagada" en verde `#34D399`.
- C6: F1 muestra la línea "2 × Carta · $ 15.000 c/u" con $ 30.000, "Pagado $ 0 de $ 30.000", "Saldo $ 30.000" y **Abonar a esta factura**; F2, "1 × Oficio · $ 15.000 c/u", "Pagado $ 5.000 de $ 15.000" y "Saldo $ 10.000". Una factura pagada no muestra Pagado, Saldo ni el botón. Una factura con dos líneas muestra las dos, en orden.
- C7: La pestaña Abonos muestra el abono inicial: $ 5.000, "fecha · Abono inicial", "Efectivo" en `#8FCB6B` con su ícono y "Factura #2" con $ 5.000, sin "quedó pagada". Las etiquetas de tipo son "A la deuda" (`CASCADA_GLOBAL`), "A una factura" (`FACTURA_INDIVIDUAL`) y "Pagar todo" (`LIQUIDACION_TOTAL`); Transferencia se ve en `#B49CF0` con su ícono.
- C8: "quedó pagada": si además hay un abono `CASCADA_GLOBAL` posterior de $35.000 con aplicaciones F1 $30.000 y F2 $5.000, ese abono va primero y muestra "Factura #1 · quedó pagada" con $ 30.000 y "Factura #2" con $ 5.000 sin la marca (F2 suma $10.000 de $15.000). Un abono que completa el total de F2 la marca como pagada en ese abono y no en los anteriores.
- C9: **Registrar abono** abre `AbonoModalComponent` con `cliente` Ana, `modoInicial: 'CASCADA_GLOBAL'` y `facturas` = F1 y F2 como `FacturaAbierta`, **de la más antigua a la más nueva** (F1 primero), con `canDismiss` que solo permite el cierre explícito. **Pagar todo** lo abre con `'LIQUIDACION_TOTAL'`. **Abonar a esta factura** en F2 lo abre con `'FACTURA_INDIVIDUAL'` e `idVentaInicial: 2`. Las facturas pagadas no se pasan al modal.
- C10: `abono.modal.ts` con `idVentaInicial: 2` abre con F2 elegida y "Hasta $ 10.000"; con un `idVentaInicial` que no está entre las abiertas, no elige ninguna y el botón queda deshabilitado. Las pruebas que ya tenía `abono.modal.spec.ts` siguen pasando.
- C11: Si el modal de abono se cierra con `ROL_GUARDADO`, el expediente vuelve a consultar `ConsultarExpediente` y muestra los datos nuevos; si se cierra de otra forma, no recarga.
- C12: **Editar** (con `aria-label` "Editar cliente") abre `cliente.modal.ts` con el cliente, que muestra "Editar cliente"; al guardar, el expediente se recarga y muestra el nombre nuevo.
- C13: Estados con el texto exacto: mientras carga, `indicador-carga` con los botones deshabilitados; sin facturas, «Este cliente todavía no tiene compras» (`mensaje-sin-compras`) con los botones de abono deshabilitados; la pestaña Abonos sin abonos muestra su estado vacío; error, "Ocurrió un error inesperado" con **Volver** y **Reintentar**, nunca "Este cliente todavía no tiene compras". Con `CLIENTE_INEXISTENTE`, "El cliente no existe" con **Volver**. **Reintentar** con la carga ya funcionando muestra el expediente.
- C14: Respuestas viejas: si una recarga lenta termina después de una más nueva, se muestra la más nueva. `ionViewWillEnter` recarga el expediente.
- C15: Las pruebas que esperaban que tocar un cliente abriera el modal de editar (`clientes.page.spec.ts`, `src/verificacion/b4-1/b4-1.verificacion.spec.ts` y `e2e/clientes.spec.ts`) ahora esperan la navegación al expediente, y la edición de un cliente se prueba desde el expediente. Ninguna otra comprobación de esos archivos cambió.
  Cómo comprobarlo: revisión del diff de esos tres archivos.
- C16: e2e de aceptación `e2e/etapa-4.acceptance.spec.ts`, todo por la app: crea un cliente, le vende a fiado dos veces (una con abono inicial), abre su expediente desde el directorio y comprueba la deuda, el capital y la ganancia por cobrar y las facturas con su estado; registra un abono "A la deuda", comprueba el resumen (facturas, "Recupera capital", "Suma a la ganancia libre", "Deuda después del abono") y después el expediente (estados de factura y el abono nuevo primero en la pestaña Abonos); usa **Pagar todo** y comprueba "Al día" en el expediente y en el directorio. Además, un cliente sin compras muestra «Este cliente todavía no tiene compras».
  Cómo comprobarlo: `npx playwright test e2e/etapa-4.acceptance.spec.ts`.
- C17: Revisión visual: a 390 px de ancho, el expediente (las dos pestañas) coincide con `ClienteExpediente.dc.html` y `ClienteAbonos.dc.html` en estructura, textos y colores, y el modal de abono abierto desde el expediente coincide con `ModalAbono.dc.html`; las diferencias quedan anotadas en el reporte.
  Cómo comprobarlo: capturas con Playwright a 390 px y comparación con los mockups.
- C18: Accesibilidad (regla 10): los botones de solo ícono tienen `aria-label`, el segmento de pestañas tiene etiqueta y los deshabilitados se reflejan con `aria-disabled`.
- C19: Solo se tocaron las rutas permitidas; no cambió la forma de `ConsultarExpediente`; se conservan los `data-testid` que ya existían; `npm run lint`, `npm run test:unit`, `npm run build` y `npm run test:e2e` pasan sin advertencias (las 529 pruebas unitarias y los 19 e2e que ya existían siguen en verde, con los cambios de C15).
- C20: Calidad de las pruebas: cada estado y cada texto se comprueba con el texto exacto que ve el usuario, no solo con `toHaveBeenCalled`; las entradas del modal se comprueban con sus valores exactos; sin `try/catch` para verificar errores.
  Cómo comprobarlo: revisión de los `.spec.ts` nuevos y tocados.
- C21: Mientras el modal de abono está abriendo el resumen (`abriendoResumen()` verdadero), **Cancelar** está deshabilitado (`disabled` y `aria-disabled`) y llamar a `cancelar()` no cierra el modal.
- C22: Dos llamadas seguidas a `volverAEditar()` en el resumen producen **un solo** `dismiss`, y el modal de abono queda abierto con sus datos; si `dismiss` falla, no queda una promesa rechazada sin manejar y los botones del resumen siguen usables.
- C23: Si el abono se guardó y el `dismiss` del modal de abono falla, no aparece ningún toast de error; si falla `modalCtrl.create` o `present` del resumen (antes de guardar), sí aparece el toast con el texto de `mensajeDeError` y el modal de abono vuelve a quedar usable (`abriendoResumen()` falso).
