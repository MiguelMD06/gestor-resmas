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
