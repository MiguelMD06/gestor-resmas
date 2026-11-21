# Tarea B4.2 — Modal de abono y su resumen

## Objetivo

Crear el modal para registrar un abono, con sus tres modos ("A la deuda", "A una factura" y "Pagar todo"), y el resumen que se confirma antes de guardar, según los mockups aprobados `planificacion/diseno/mockups/ModalAbono.dc.html`, `ModalAbonoEstados.dc.html` y `ModalAbonoResumen.dc.html`. Este bloque solo crea los componentes: el expediente que los abre llega en el bloque B4.3, así que aquí se prueban con pruebas unitarias.

## Rutas

**Permitidas** (solo estas):

- `src/app/cartera/ui/**` (carpeta nueva)
- `src/app/shared/ui/estilos/**` (solo piezas nuevas; no cambies las que ya existen)

**Prohibidas:** todo lo demás, en especial `src/app/cartera/application/**`, `src/app/cartera/domain/**`, `src/app/cartera/infrastructure/**`, `src/app/shared/ui/*.ts` (se usan, no se cambian), `src/app/ventas/**`, `src/app/clientes/**` y `src/verificacion/**` (carpeta del verificador).

## Specs que cubre (citas textuales del plan)

- **S3 (RF-12):** "Cuando un cliente realice un abono general a su deuda total indicando el monto y el medio de pago (Efectivo o Transferencia), el sistema deberá descontar el dinero empezando por la factura pendiente más antigua; si el abono cubre la totalidad de esa factura, la marcará como *Pagada* y aplicará el excedente sucesivamente a las siguientes facturas en orden cronológico ascendente."
- **S4 (RF-13):** "El sistema deberá permitir al usuario seleccionar una factura pendiente específica del cliente para aplicarle un abono parcial o pago total de manera aislada, sin afectar las demás facturas abiertas."
- **S5 (RF-14):** "El sistema deberá incluir una función rápida para saldar el 100% de la deuda acumulada de un cliente, cerrando todas sus facturas pendientes y registrando el ingreso por el medio de pago seleccionado (Efectivo o Transferencia)."
- **S7 (R-15):** "**Confirmación antes de guardar:** la venta y el abono muestran un resumen pequeño con **Aceptar** y **Volver a editar**."
- **S8 (R-13):** "**Nada con fecha futura:** compra, aporte, venta, abono, retiro y traspaso llevan la fecha de ahora (del `CLOCK`) o una pasada, nunca una posterior (`FECHA_FUTURA`)."
- **S15 (`comun/diseno.md`):** "modal de abono con tres modos: "A la deuda" en cascada de la factura más antigua a la más nueva (RF-12, R-02), "A una factura" (RF-13) y "Pagar todo" (RF-14). Lleva un resumen antes de guardar (R-15) y no acepta fecha futura (R-13)"
- **S14:** "medio de pago: Efectivo en verde billete (`#8FCB6B`) y Transferencia en violeta (`#B49CF0`), cada uno con su ícono"
- **D7:** "**Registrar abono** abre el modo "A la deuda"; **Pagar todo** abre el modo "Pagar todo" con el monto fijo. En "A una factura" se elige la factura de una lista de las abiertas, de la más antigua a la más nueva."
- **D8:** "el modal arma la vista previa con las funciones de D2 sobre las facturas cargadas; `RegistrarAbono` recalcula dentro de la transacción y es el que manda."
- **D9:** el texto de la fecha futura es el `FECHA_FUTURA` actual, «La fecha no puede ser futura». El mockup muestra «La fecha del abono no puede ser futura»: **manda D9**.
- **D14:** si la fecha es anterior a una factura que recibe dinero, el modal muestra «La fecha del abono es anterior a una factura que paga» (`ABONO_ANTERIOR_A_FACTURA`) junto a la fecha.

## Lo que ya existe y debes reutilizar

- **Dominio** (`src/app/cartera/domain/`): `FacturaAbierta` (`idVenta`, `fecha`, `total`, `costoBase`, `pagado`), `saldo`, `deudaTotal`, `distribuirCascada`, `abonarFactura`, `liquidarTodo`, `validarFechaAbono` y `AplicacionAbono` (`idVenta`, `monto`, `capital`, `ganancia`, `quedaPagada`). La vista previa y las validaciones del modal salen de **estas** funciones: no repitas el reparto ni la cascada.
- **Caso de uso:** `RegistrarAbono.registrar(s: SolicitudRegistrarAbono)` (`src/app/cartera/application/registrar-abono.ts`), con `modo` `CASCADA_GLOBAL` (`monto`), `FACTURA_INDIVIDUAL` (`idVenta`, `monto`) o `LIQUIDACION_TOTAL`, más `idCliente`, `fecha` y `medio`.
- **Piezas de interfaz:** `CampoPesosComponent` (`app-campo-pesos`, entrega un entero o `null`), `HojaFechaComponent` (`app-hoja-fecha`, con `maximo` del `CLOCK`), `mensajeDeError` y `MENSAJES_ERROR` (`shared/ui/mensajes-error.ts`), `soloCierreExplicito`, `ROL_GUARDADO` y `esVacio` (`shared/ui/formulario.ts`), `formatearPesos`, los estilos de `shared/ui/estilos/` (hoja de modal, segmento, campo con contorno) y el token `CLOCK`.
- **Patrón a copiar:** `src/app/ventas/ui/resumen-venta.modal.ts` (el resumen guarda con la guarda `guardando`/`guardado`, avisa al modal padre con `alCambiarGuardando`, muestra el error en un toast con `mensajeDeError` y deja reintentar) y cómo `vender.page.ts` abre ese resumen (`canDismiss: soloCierreExplicito`, el modal padre bloqueado mientras el resumen guarda) y muestra la fecha elegida con la hoja de fecha.

## Qué hacer

### 1. `src/app/cartera/ui/abono.modal.ts` (`AbonoModalComponent`)

Entradas (`@Input`, como el resumen de venta): `cliente: Cliente` (obligatoria), `facturas: readonly FacturaAbierta[]` (las abiertas del cliente, obligatoria), `modoInicial: 'CASCADA_GLOBAL' | 'FACTURA_INDIVIDUAL' | 'LIQUIDACION_TOTAL'` (por defecto `CASCADA_GLOBAL`). Al guardar, se cierra con `ROL_GUARDADO`; **Cancelar** lo cierra sin guardar.

Según `ModalAbono.dc.html` y `ModalAbonoEstados.dc.html`:

- **Cabecera:** "Registrar abono", el nombre del cliente y "debe $ N" (la deuda total), y **Cancelar**.
- **Modo** con `ion-segment`: "A la deuda", "A una factura" y "Pagar todo".
- **"A la deuda":** campo "Monto del abono" con la ayuda "Hasta $ N" (la deuda total).
- **"A una factura":** lista de las facturas abiertas de la más antigua a la más nueva ("Factura #N", la fecha y "Saldo $ N"); se elige una y el campo "Monto del abono" muestra "Hasta $ N" con el saldo de esa factura. Si solo hay una factura abierta, queda elegida.
- **"Pagar todo":** "Monto a pagar" con la deuda total, que **no se edita**, y "Salda las N facturas con saldo" ("Salda la factura con saldo" si es una).
- **Medio de pago** con `ion-segment`: Efectivo y Transferencia, con sus colores e íconos (S14). Empieza en Efectivo, como en Vender (`vender.page.ts:701`).
- **Fecha del abono** con la hoja de fecha (`app-hoja-fecha`), por defecto ahora del `CLOCK` y con `maximo` = ahora.
- **"Así se aplica · de la más antigua a la más nueva"** (en "A la deuda" y "Pagar todo"; en "A una factura", solo la factura elegida): cada factura que recibe dinero con "Factura #N", la fecha corta, el monto que recibe y "queda pagada" o "queda debiendo $ N". Se calcula con las funciones del dominio y se actualiza al cambiar el monto, el modo o la factura.
- **Botón principal** (lima): "Revisar abono · $ N" ("Revisar abono" sin monto si está vacío) y, en "Pagar todo", "Revisar pago · $ N". Abre el resumen.
- **Validación** (regla 1 de `CLAUDE.md`): el botón queda deshabilitado mientras falte el monto o la factura (en "A una factura"), o haya un error. Los errores se muestran junto al campo, con el texto de `MENSAJES_ERROR`: monto $0 → `MONTO_INVALIDO`; mayor que la deuda → `MONTO_SUPERA_DEUDA`; mayor que el saldo de la factura → `MONTO_SUPERA_SALDO_FACTURA`; fecha futura → `FECHA_FUTURA`; fecha anterior a una factura que recibe dinero → `ABONO_ANTERIOR_A_FACTURA`. Los errores de formato del monto los da el campo de pesos. Nada de `?? 0` ni conversiones silenciosas.
- Mientras el resumen guarda, el modal no se cierra (`canDismiss`) y sus campos y botones quedan deshabilitados (regla 3).

### 2. `src/app/cartera/ui/resumen-abono.modal.ts` (`ResumenAbonoModalComponent`)

Según `ModalAbonoResumen.dc.html`: "Resumen del abono", **Cliente**, **Fecha**, **Medio de pago**, el modo con su monto ("Abono a la deuda", "Abono a la factura #N" o "Pago total"), cada factura que recibe dinero ("Factura #N", "Queda pagada" o "Queda debiendo $ N", y el monto), **Recupera capital** (suma del capital aplicado), **Suma a la ganancia libre** (suma de la ganancia aplicada) y **Deuda después del abono**. Botones **Aceptar** (lima) y **Volver a editar**.

- **Aceptar** llama a `RegistrarAbono.registrar` con la solicitud del modo elegido. Guarda `guardando` activada **antes** del primer `await` y liberada en `finally`; mientras guarda, "Guardando…", los dos botones deshabilitados y el resumen no se cierra. Si guarda, cierra el resumen y avisa al modal de abono, que se cierra con `ROL_GUARDADO`. Si falla, muestra el error con `mensajeDeError` y vuelve a habilitar los botones para reintentar; no se aplicó nada.
- **Volver a editar** cierra el resumen y deja el modal de abono con los datos intactos.

## Pruebas

Pruebas primero (RED → GREEN), con `RegistrarAbono` simulado, un `CLOCK` fijo en 2026-11-20 12:00:00 y estas facturas de Ana: **F1** (id 1, 2026-11-01 10:00:00, total $30.000, costo $20.000, pagado $0) y **F2** (id 2, 2026-11-10 10:00:00, total $15.000, costo $10.000, pagado $5.000). Ana debe $40.000.

Cubre cada campo (vacío, inválido, válido) con el estado del botón; los tres modos; la vista previa; el resumen; el doble toque en **Aceptar** (una sola llamada a `registrar`); el botón deshabilitado mientras guarda y habilitado de nuevo tras un error; y el texto exacto que ve el usuario en cada error (no solo `toHaveBeenCalled`). Los criterios de aceptación que siguen dicen qué se exige.
