# Etapa 4 — Cartera y expediente del cliente

**Estado:** ✅ plan aprobado (L4) · **Rama del plan:** `docs/plan-etapa-4` · **Rama de implementación:** `feat/etapa-4-cartera` (sale del `main` actual) · **Entrega:** un PR a `main` · **Pruebas:** Vitest (`ng test`) + Playwright (`e2e/`)
**Objetivo:** el directorio de clientes muestra cuánto debe cada uno y el total por cobrar; el expediente de cada cliente muestra su deuda, sus facturas y sus abonos; y se registran abonos a la deuda (en cascada), a una factura o por el total, con resumen antes de guardar.

## Qué hay hoy

- **`main` en `a022828`**, con la Etapa 3B integrada (PR #21). Angular 22.2.3 e Ionic 9. Sin issues ni PRs abiertos.
- **Dominio de cartera ya hecho (Etapa 1)**, en `src/app/cartera/domain/`:
  - `FacturaAbierta` (`factura.ts:4`), `saldo` y `validarFactura`;
  - `repartirPago` (`reparto-pago.ts:18`, R-01);
  - `deudaTotal` (`deuda.ts:11`, RF-11);
  - `distribuirCascada` (`abonos.ts:24`, RF-12 y R-02), `abonarFactura` (`abonos.ts:77`, RF-13 y R-03) y `liquidarTodo` (`abonos.ts:101`, RF-14 y R-04), con los errores `MONTO_INVALIDO`, `SIN_DEUDA`, `MONTO_SUPERA_DEUDA` y `MONTO_SUPERA_SALDO_FACTURA`.
  Ninguna se usa todavía fuera de sus pruebas: son la base para esta etapa.
- **Persistencia:** `AbonoRepository.insertar` (`cartera/infrastructure/abono.repository.ts`) escribe el abono y su detalle por factura; ya lo usa `RegistrarVenta` para el abono inicial. `LibroRepository.registrar` y la operación `cobro()` (`finanzas/domain/operaciones.ts:75`) escriben el movimiento `COBRO`.
- **Esquema:** la migración `001` ya tiene todo lo que hace falta: los tipos `CASCADA_GLOBAL`, `FACTURA_INDIVIDUAL` y `LIQUIDACION_TOTAL` en `abonos.tipo_abono`, `capital_aplicado` y `ganancia_aplicada` en `abonos_detalle_facturas`, los CHECK de `ventas` (`saldo_pendiente = total_venta - monto_pagado` y `estado_pago` coherente) y el índice `ix_ventas_cartera`. **No hace falta migración.**
- **Falta:** ninguna consulta lee facturas abiertas, deudas por cliente ni historial de abonos, y ningún código actualiza `monto_pagado` de una venta existente.
- **Clientes hoy:** `clientes.page.ts` (buscador, lista con iniciales, nombre y celular, botón flotante) y `cliente.modal.ts` (nuevo y editar). La ruta `clientes` de `shell/tabs.routes.ts:18` carga solo el directorio; no hay expediente.
- **Se reutilizan:** `HojaFechaComponent` (`shared/ui/hoja-fecha.component.ts`), `CampoPesosComponent`, `mensajes-error.ts`, `formulario.ts`, `iniciales.ts`, los estilos de `shared/ui/estilos/` y el patrón de resumen de `resumen-venta.modal.ts`.
- **Mockups aprobados (2026-11-17):** `Clientes`, `ClienteExpediente`, `ClienteAbonos`, `ClientesEstados`, `ModalAbono`, `ModalAbonoEstados` y `ModalAbonoResumen`, en `planificacion/diseno/mockups/`.

## Specs

Citas textuales; si una cita y un bloque no coinciden, manda la cita.

| ID | Requisito | Fuente |
|----|-----------|--------|
| S1 | "Al consultar el perfil de un cliente, el sistema deberá mostrar de forma organizada su deuda total actual, el historial detallado de facturas emitidas (indicando fecha, cantidad y tipo de resmas compradas, precio cobrado y estado de pago) y el historial de abonos realizados." | RF-06 |
| S2 | "El sistema deberá calcular el saldo total adeudado por cada cliente sumando los saldos pendientes de todas sus facturas en estado *Pendiente* o *Abonada Parcialmente*." | RF-11 |
| S3 | "Cuando un cliente realice un abono general a su deuda total indicando el monto y el medio de pago (Efectivo o Transferencia), el sistema deberá descontar el dinero empezando por la factura pendiente más antigua; si el abono cubre la totalidad de esa factura, la marcará como *Pagada* y aplicará el excedente sucesivamente a las siguientes facturas en orden cronológico ascendente." | RF-12 |
| S4 | "El sistema deberá permitir al usuario seleccionar una factura pendiente específica del cliente para aplicarle un abono parcial o pago total de manera aislada, sin afectar las demás facturas abiertas." | RF-13 |
| S5 | "El sistema deberá incluir una función rápida para saldar el 100% de la deuda acumulada de un cliente, cerrando todas sus facturas pendientes y registrando el ingreso por el medio de pago seleccionado (Efectivo o Transferencia)." | RF-14 |
| S6 | "Por cada abono recibido, el sistema deberá almacenar la fecha, el monto entregado, el medio de pago (Efectivo o Transferencia) y el detalle exacto de a qué factura o facturas se aplicó el descuento." | RF-15 |
| S7 | "**Confirmación antes de guardar:** la venta y el abono muestran un resumen pequeño con **Aceptar** y **Volver a editar**." | `comun/modelo-contable.md`, R-15 |
| S8 | "**Nada con fecha futura:** compra, aporte, venta, abono, retiro y traspaso llevan la fecha de ahora (del `CLOCK`) o una pasada, nunca una posterior (`FECHA_FUTURA`)." | `comun/modelo-contable.md`, R-13 (aquí el abono) |
| S9 | "**Reparto de un pago a una factura:** `capital_aplicado = min(pagado + m, costo) − min(pagado, costo)` y `ganancia_aplicada = m − capital_aplicado`" | `comun/modelo-contable.md`, R-01 (RN-03) |
| S10 | "**Cascada:** se recorren las facturas con saldo del cliente en orden `fecha_venta ASC, id_venta ASC`, y cada una recibe hasta su saldo. El monto no puede superar la deuda total." · "**Abono individual:** el monto no puede superar el saldo de esa factura." · "**Liquidación total:** equivale a una cascada por el 100 % de la deuda." | `comun/modelo-contable.md`, R-02, R-03 y R-04 |
| S11 | "**Operación compuesta = una transacción:** si algo falla, no queda nada escrito." | `comun/modelo-contable.md`, R-11 |
| S12 | "directorio con el total por cobrar, buscador, filtro "Todos / Con deuda" y la deuda de cada cliente en rojo, o "Al día" en gris. Mostrador no aparece porque nunca tiene deuda (R-09)" | `comun/diseno.md`, Clientes |
| S13 | "expediente con la deuda total (capital por recuperar y ganancia por cobrar), los botones **Registrar abono** y **Pagar todo**, y las pestañas Facturas y Abonos (RF-06, RF-15). Las facturas van de la más nueva a la más antigua" | `comun/diseno.md`, Clientes |
| S14 | "estado de factura: Pendiente en rojo, Abonada parcialmente en celeste y Pagada en verde (`#34D399`)" · "medio de pago: Efectivo en verde billete (`#8FCB6B`) y Transferencia en violeta (`#B49CF0`), cada uno con su ícono" | `comun/diseno.md`, Clientes |
| S15 | "modal de abono con tres modos: "A la deuda" en cascada de la factura más antigua a la más nueva (RF-12, R-02), "A una factura" (RF-13) y "Pagar todo" (RF-14). Lleva un resumen antes de guardar (R-15) y no acepta fecha futura (R-13)" · ""Editar" reutiliza el modal de nuevo cliente con el título "Editar cliente"." | `comun/diseno.md`, Clientes |
| S16 | "Por cliente, el capital por recuperar es `min(costo, total) − min(pagado, costo)` y el resto es ganancia futura." (dice "Por factura"; el expediente suma las facturas del cliente) | `comun/modelo-contable.md`, §5, Cuentas por cobrar |

### Ejemplos de aceptación

**Datos de partida** (los mismos en todos los ejemplos): la clienta **Ana** tiene dos facturas a fiado:

- **F1**, del 2026-11-01 10:00: total $30.000, costo $20.000, pagado $0 (Pendiente);
- **F2**, del 2026-11-10 10:00: total $15.000, costo $10.000, pagado $5.000 de abono inicial (Abonada parcialmente).

Además existe **Beto**, sin compras, y el Mostrador. El `CLOCK` marca 2026-11-20 12:00.

| ID | Situación | Resultado esperado |
|----|-----------|--------------------|
| E1 | Abrir Clientes. | el total por cobrar es **$40.000**; Ana muestra **$40.000** en rojo y Beto "Al día" en gris; el Mostrador no aparece. Con el filtro "Con deuda" solo queda Ana; si nadie debe, se ve el estado vacío de ese filtro |
| E2 | Abrir el expediente de Ana. | deuda total **$40.000**: capital por recuperar **$25.000** y ganancia por cobrar **$15.000**. Pestaña Facturas: F2 arriba ("Abonada parcialmente", celeste) y F1 abajo ("Pendiente", rojo); cada una con fecha, cantidad y tipo de resmas, precio cobrado y estado |
| E3 | Abono "A la deuda" de $35.000 en Efectivo. | F1 recibe $30.000 (capital $20.000, ganancia $10.000) y queda **Pagada**; F2 recibe $5.000 (capital $5.000, ganancia $0) y queda con saldo $5.000, Abonada parcialmente. Se escribe un abono `CASCADA_GLOBAL` de $35.000 con dos filas de detalle y un `COBRO` en Efectivo: bolsillo +$35.000, capital +$25.000, ganancia +$10.000. La deuda de Ana pasa a $5.000 |
| E4 | Abono "A una factura" de $3.000 a F2, por Transferencia. | solo cambia F2: pagado $8.000, saldo $7.000 (capital $3.000, ganancia $0). F1 no cambia. Abono `FACTURA_INDIVIDUAL` con una fila de detalle |
| E5 | "Pagar todo" por Transferencia. | el monto es $40.000 y no se edita; F1 y F2 quedan Pagadas; abono `LIQUIDACION_TOTAL`; `COBRO` con capital +$25.000 y ganancia +$15.000. Ana pasa a "Al día" y en su expediente **Registrar abono** y **Pagar todo** quedan deshabilitados |
| E6 | Montos límite. | "A la deuda" con $40.000 se acepta y con $40.001 deja **Guardar** deshabilitado y muestra "El monto supera la deuda del cliente". "A una factura" en F2 con $10.000 se acepta y con $10.001 muestra "El monto supera el saldo de la factura". $0 muestra "El monto debe ser un número entero mayor a cero". El caso de uso rechaza los mismos montos (`MONTO_SUPERA_DEUDA`, `MONTO_SUPERA_SALDO_FACTURA`, `MONTO_INVALIDO`) y no escribe nada |
| E7 | Fecha del abono: mañana. | junto a la fecha se ve "La fecha no puede ser futura" y **Guardar** queda deshabilitado; el caso de uso la rechaza (`FECHA_FUTURA`) y no escribe nada. Con la hora actual se guarda |
| E8 | Tocar **Guardar** en el modal. | se abre el resumen: modo, monto, medio, fecha, cada factura que recibe dinero con su monto y lo que queda debiendo. **Volver a editar** regresa al modal con los datos intactos; **Aceptar** guarda |
| E9 | Tocar **Aceptar** dos veces seguidas. | se escribe **un solo** abono y **un solo** `COBRO`; mientras guarda, el resumen no se cierra y sus botones están deshabilitados |
| E10 | Falla la escritura del `COBRO` (error simulado en la prueba). | no queda el abono, ni su detalle, ni cambios en `ventas` (una sola transacción); se ve el error y **Aceptar** se habilita de nuevo para reintentar |
| E11 | Pestaña Abonos de Ana después de E3. | primero el abono de $35.000 (fecha, Efectivo en verde billete con su ícono, "F1 $30.000 · F2 $5.000") y después el abono inicial de $5.000 de F2 |
| E12 | Falla la carga del expediente o del directorio. | se ve el error con **Reintentar**; nunca "Este cliente todavía no tiene compras" ni el directorio vacío |
| E13 | Cascada con tres facturas, dos con la misma fecha. | el dinero llega primero a la más antigua y, en el empate, a la de menor número; la última solo recibe lo que sobra |
| E14 | Abono "A la deuda" fechado el 2026-11-05 10:00 (anterior a F2). | el caso de uso lo rechaza (`ABONO_ANTERIOR_A_FACTURA`) y no escribe nada; el modal muestra «La fecha del abono es anterior a una factura que paga» junto a la fecha. | el caso de uso la rechaza y no escribe nada; el modal lo avisa junto a la fecha |
| E15 | Correr las pruebas unitarias y e2e que ya existen. | pasan sin cambiar lo que verifican |

## Decisiones

| # | Decisión | Por qué |
|---|----------|---------|
| D1 | **Sin migración:** se usan las tablas y los tipos de la `001` tal como están. | El esquema ya cubre los tres tipos de abono y el reparto capital/ganancia. Una migración sería el ítem 1 de alto riesgo sin necesidad. |
| D2 | **Un solo caso de uso de escritura, `RegistrarAbono`** (`cartera/application/registrar-abono.ts`), con `modo`: `CASCADA_GLOBAL`, `FACTURA_INDIVIDUAL` o `LIQUIDACION_TOTAL`. En **una transacción**: valida la fecha con el `CLOCK`, lee las facturas abiertas del cliente, aplica `distribuirCascada`, `abonarFactura` o `liquidarTodo`, escribe con `AbonoRepository.insertar`, actualiza cada venta y registra `cobro()` con `LibroRepository.registrar`. | R-11 y la regla 2 de `CLAUDE.md`. Reutiliza el dominio y los repositorios que ya usa la venta en lugar de repetir el reparto. Las facturas se leen dentro de la transacción para que el cálculo use los saldos vigentes. |
| D3 | **Consultas en `CarteraRepository`** (`cartera/infrastructure/cartera.repository.ts`): facturas abiertas de un cliente (`FacturaAbierta[]`), deuda por cliente (una consulta con `GROUP BY`), y para el expediente las facturas con su detalle y los abonos con sus aplicaciones. Las leen los casos de uso `ConsultarCartera` (directorio) y `ConsultarExpediente`. | Separa la lectura de la escritura y mantiene la consulta SQL fuera de la UI (arquitectura hexagonal). |
| D4 | **Pago aplicado a una venta:** `CarteraRepository.aplicarPago(tx, idVenta, monto)` suma a `monto_pagado`, resta a `saldo_pendiente` y recalcula `estado_pago`, con `WHERE saldo_pendiente >= monto`; si no cambia exactamente una fila, lanza error y la transacción se revierte. | Es la única escritura que cambia filas existentes (ítem 1 de alto riesgo). La condición del `WHERE` y los CHECK del esquema son la última barrera contra un sobrepago. |
| D5 | **Capital y ganancia por cobrar:** una función pura nueva en `cartera/domain/` calcula, por factura, `min(costo, total) − min(pagado, costo)` y el resto como ganancia (S16); el expediente suma las del cliente. | Lo pide el mockup del expediente (S13). Se usa ya en esta etapa (no es código muerto) y es base para la tarjeta de cuentas por cobrar de la Etapa 5. |
| D6 | **Expediente en `clientes/:id`** (`clientes/ui/expediente.page.ts`), registrado en `shell/tabs.routes.ts`. Tocar un cliente en el directorio abre su expediente; **Editar** pasa al expediente y abre `cliente.modal.ts` con el título "Editar cliente". | S13 y S15, según los mockups `ClienteExpediente` y `ClienteAbonos`. |
| D7 | **Modal de abono en `cartera/ui/`:** `abono.modal.ts` (tres modos con `ion-segment`, monto con `CampoPesosComponent`, medio Efectivo/Transferencia con `ion-segment` como en Vender, fecha con `HojaFechaComponent` y `max` = ahora del `CLOCK`) y `resumen-abono.modal.ts` (R-15). **Registrar abono** abre el modo "A la deuda"; **Pagar todo** abre el modo "Pagar todo" con el monto fijo. En "A una factura" se elige la factura de una lista de las abiertas, de la más antigua a la más nueva. | S7, S8 y S15. Las piezas compartidas de la 3B dan una sola forma de elegir fecha y monto en toda la app. |
| D8 | **El resumen se calcula con el mismo dominio:** el modal arma la vista previa con las funciones de D2 sobre las facturas cargadas; `RegistrarAbono` recalcula dentro de la transacción y es el que manda. | El resumen y lo guardado salen de la misma función, así que no pueden diferir. |
| D9 | **Texto de la fecha futura:** se usa el `FECHA_FUTURA` actual, "La fecha no puede ser futura". El texto propuesto en `diseno/README.md` ("La fecha del abono no puede ser futura") ya no aplica. | En la 3B el texto pasó a ser uno solo para la venta, la compra y el aporte (punto 5 de "Por aprobar" de la 3B). |
| D10 | **Cada bloque corre con la skill `ciclo-verificado`:** `criterios.md` y `ciclo.json` por bloque, lanzados con `node "$HOME/.claude/skills/ciclo-verificado/scripts/ciclo.mjs" <carpeta-del-bloque>`. Implementador `gemini-4-hydrogen-medium` y verificador `gemini-4-hydrogen-high`, hasta 2 correcciones; el script lanza a `agy` con `--mode accept-edits`. Las pruebas del verificador van en `src/verificacion/<bloque>/` (unitarias) y `e2e/verificacion/<bloque>/` (e2e), y se quedan en el repositorio como pruebas de regresión (L4). | Pedido de Miguel (L2). El verificador usa Hydrogen en alto, como en la 3B, en lugar del Argon que trae la skill (L3, punto 4). El script confirma la prueba final con el código de salida, no con la palabra del modelo. |
| D11 | **Bloques en secuencia, un ciclo a la vez**, sobre la rama de implementación (sin worktrees). Si Claude Code corta un ciclo por memoria, se relanza el bloque con un `retoma.md` que dice lo que ya quedó en el árbol. | El equipo tiene 7,2 GB de RAM y en la 3B Claude Code cortó tres veces a `agy` por memoria (L11, arreglo de B3B.L, B3B.F). Cada ciclo ocupa un solo agente a la vez. Relanzar lo pidió Miguel (L3, punto 5). |
| D14 | **El abono no es anterior a las facturas que paga:** su fecha debe ser igual o posterior a la de cada factura que recibe dinero (`ABONO_ANTERIOR_A_FACTURA`, «La fecha del abono es anterior a una factura que paga»). | Regla nueva aprobada (L3, punto 3), con la misma idea que R-14 en la venta. |
| D15 | **La pestaña Abonos** muestra el abono inicial de la venta (`ABONO_INICIAL`) y los abonos `CASCADA_GLOBAL`, `FACTURA_INDIVIDUAL` y `LIQUIDACION_TOTAL`; no muestra `PAGO_CONTADO`. | Aprobado (L3, punto 2): el pago de contado ya se ve como factura Pagada. |
| D16 | **Textos de Clientes:** «Agrega el primero con el botón +.» (directorio vacío), «Ningún cliente tiene deuda» (filtro "Con deuda" vacío) y «Este cliente todavía no tiene compras» (expediente sin facturas). | Textos propuestos de `diseno/README.md`, aprobados (L3, punto 1). |
| D12 | **Revisión `~/.agy-review/` según L7 de la 3B** (riesgo medio o superior). B4.0 se revisa solo, en su propio commit, con las lentes risk, resilience y reliability: cambia filas existentes de `ventas` y mueve dinero. | Ítem 1 de alto riesgo. Los bloques de interfaz siguen la evaluación de riesgo de cada commit. |
| D13 | **Milestone "Etapa 4" en GitHub** y una issue `bug` por cada problema que aparezca, según `comun/flujo-de-trabajo.md`. | Trazabilidad acordada en L16 y L17 de la 3B. |

## Bloques

| ID | Bloque | Specs | Ruta | Implementador · verificador | Ola |
|----|--------|-------|------|-----------------------------|-----|
| B4.0 | Consultas de cartera y registro de abonos | S2–S11, S16; D1–D5, D8, D14, D15; E3–E7 y E9–E10 (caso de uso), E13, E14 | ciclo | `gemini-4-hydrogen-medium` · `gemini-4-hydrogen-high` | 1 |
| B4.1 | Directorio con deuda y filtro | S2, S12; E1, E12, E15 | ciclo | `gemini-4-hydrogen-medium` · `gemini-4-hydrogen-high` | 2 |
| B4.2 | Modal de abono y su resumen | S3–S5, S7, S8, S10, S14, S15; D7–D9; E3–E10 | ciclo | `gemini-4-hydrogen-medium` · `gemini-4-hydrogen-high` | 3 |
| B4.3 | Expediente del cliente | S1, S6, S13–S16; D5, D6; E2, E5, E8, E11, E12, E15; e2e de aceptación de la etapa | ciclo | `gemini-4-hydrogen-medium` · `gemini-4-hydrogen-high` | 4 |

Si Hydrogen se queda sin cuota: implementador `gemini-3.8-flash-high`. Si el ciclo escala con `NO_CONVERGE`, se sube el implementador según la sección 5 de la skill.

**Por qué en este orden:** B4.0 deja los casos de uso que usan los demás. B4.2 va antes que B4.3 porque el expediente abre el modal de abono. Ningún bloque corre `npm install`.

### B4.0 — Consultas de cartera y registro de abonos

- **Permitidos:** `src/app/cartera/domain/**`, `src/app/cartera/application/**` (nuevo), `src/app/cartera/infrastructure/**`, `src/app/cartera/index.ts`, `src/app/shared/ui/mensajes-error.ts` (solo el texto de D14).
- **Prohibidos:** `src/app/shared/infrastructure/sqlite/migrations/**` (D1), `src/app/ventas/**`, `src/app/finanzas/**` (se usan, no se cambian).
- **Pruebas del verificador:** `src/verificacion/b4-0/`.
- **Qué hacer:** D2 a D5 y D8. Pruebas del caso de uso contra `SqlJsDatabase` con las `MIGRACIONES` aplicadas, como las de `registrar-venta.spec.ts`.
- **Prueba final (`comandoPrueba`):** `npm run test:unit`.

### B4.1 — Directorio con deuda y filtro

- **Permitidos:** `src/app/clientes/ui/clientes.page.ts` y su `.spec.ts`, `src/app/shared/ui/estilos/**` (solo piezas nuevas), `e2e/clientes.spec.ts`.
- **Pruebas del verificador:** `src/verificacion/b4-1/` y `e2e/verificacion/b4-1/`.
- **Qué hacer:** según `Clientes.dc.html` y `ClientesEstados.dc.html`: total por cobrar, filtro "Todos / Con deuda" con `ion-segment`, deuda de cada cliente en rojo o "Al día" en gris, Mostrador fuera de la lista y los cuatro estados de la regla 4 (cargando, con datos, vacío y error). El buscador sigue sin bloquearse mientras carga (hallazgo de la 3B, L8).
- **Prueba final:** `npm run test:unit` y `npx playwright test e2e/clientes.spec.ts e2e/verificacion/b4-1`.

### B4.2 — Modal de abono y su resumen

- **Permitidos:** `src/app/cartera/ui/**` (nuevo), `src/app/shared/ui/estilos/**` (solo piezas nuevas).
- **Pruebas del verificador:** `src/verificacion/b4-2/`.
- **Qué hacer:** D7 a D9 según `ModalAbono.dc.html`, `ModalAbonoEstados.dc.html` y `ModalAbonoResumen.dc.html`. Guardas de las reglas 1 a 3 de `CLAUDE.md`: **Guardar** deshabilitado con un campo inválido, guarda `guardando` activada antes del primer `await` y liberada en `finally`, modal y resumen que no se cierran mientras guardan.
- **Prueba final:** `npm run test:unit`.

### B4.3 — Expediente del cliente

- **Permitidos:** `src/app/clientes/ui/expediente.page.ts` y su `.spec.ts` (nuevos), `src/app/clientes/ui/clientes.page.ts` y su `.spec.ts` (solo la navegación al tocar un cliente), `src/app/shell/tabs.routes.ts` (solo la ruta `clientes/:id`), `src/app/shared/ui/estilos/**` (solo piezas nuevas), `e2e/clientes.spec.ts`, `e2e/etapa-4.acceptance.spec.ts` (nuevo).
- **Pruebas del verificador:** `src/verificacion/b4-3/` y `e2e/verificacion/b4-3/`.
- **Qué hacer:** D5 y D6 según `ClienteExpediente.dc.html` y `ClienteAbonos.dc.html`: deuda total con capital y ganancia por cobrar, **Registrar abono**, **Pagar todo**, **Editar**, y las pestañas Facturas (de la más nueva a la más antigua, con los colores de S14) y Abonos (con el medio y las facturas a las que se aplicó). Después de guardar un abono, el expediente se recarga. El e2e de aceptación recorre E1 a E5 y E11 con los datos de partida.
- **Prueba final:** `npm run test:unit` y `npm run test:e2e`.

## Verificación

Los criterios de cada bloque (`criterios.md`) salen de los `E#` que cubre y se escriben antes de lanzarlo. Además del caso feliz, cubren:

- **valores límite exactos:** la deuda completa y un peso más (E6), el saldo exacto de una factura y un peso más;
- **segundo y último elemento:** la cascada que llega a la segunda y a la última factura (E3, E13), el empate de fechas (E13);
- **repetir la acción:** doble toque en **Aceptar** (E9), un segundo abono sobre una factura ya Pagada (`SIN_DEUDA`), "Pagar todo" sin deuda (E5);
- **fallos:** error al escribir el `COBRO` sin dejar nada escrito (E10), carga fallida con **Reintentar** (E12);
- **otro cliente:** el abono de Ana no cambia las facturas de Beto ni de otro cliente con deuda;
- **el texto exacto** de cada error que ve el usuario (regla 6 de `CLAUDE.md`).

### Verificación del coordinador

1. Crear el milestone "Etapa 4" y la rama `feat/etapa-4-cartera` desde el `main` actual, con el plan ya integrado.
2. Antes de cada ciclo, escribir `tarea.md`, `instruccion.md` (`comun/base.md` + `tarea.md`, empieza con `[MODO EJECUTOR]`), `criterios.md` y `ciclo.json`; lanzar el ciclo en segundo plano y leer su `resultado.json`.
3. Después de cada bloque aprobado, correr `npm run lint` y `npm run build`, hacer su commit y la evaluación de riesgo (D12).
4. Al terminar, revisión dirigida (sección 6 de la skill): `resultado.json` de cada bloque, el contrato entre B4.0 y la interfaz, la transacción de `RegistrarAbono` a fondo y lo que ningún criterio cubría.
5. Correr `lint`, `test:unit`, `build` y `test:e2e`; probar en el navegador a 390 px contra cada mockup; generar la APK de debug (`npm run apk`) para la prueba manual de Miguel.
6. Abrir el PR con el checklist de la regla 12 y las líneas `Closes #N` de las issues que resuelva.

## Commits

1. `docs: plan de la Etapa 4 (cartera y expediente)` (PR del plan)
2. `feat: consultas de cartera y registro de abonos` (B4.0, solo)
3. `feat: deuda por cliente y total por cobrar en el directorio` (B4.1)
4. `feat: modal de abono con resumen` (B4.2)
5. `feat: expediente del cliente con facturas y abonos` (B4.3)
6. `docs: cierre de la Etapa 4`

## Por aprobar

1. ✅ **Textos propuestos de Clientes** (D16).
2. ✅ **Pestaña Abonos sin los pagos de contado** (D15).
3. ✅ **Fecha del abono no anterior a las facturas que paga** (D14).
4. ✅ **Verificador del ciclo:** Hydrogen en alto (`gemini-4-hydrogen-high`), no Argon (D10).
5. ✅ **Bloques en secuencia**, con relanzamiento si se cortan por memoria (D11).
6. ✅ **Pruebas del verificador en el repositorio**, en `src/verificacion/` y `e2e/verificacion/`, como pruebas de regresión; van en el commit de su bloque (D10).

## Log

Mensajes del usuario copiados textualmente; las notas del coordinador van entre corchetes.

- **L1** (2026-11-20): "Si" [Respuesta a "¿Arranco el plan de la Etapa 4 en una rama nueva desde `main` y de paso actualizo el estado de la 3B en el índice?". Verificado: PR #21 (Etapa 3B) integrado el 2026-11-19, sin PRs ni issues abiertos, `main` en `a022828`. Rama `docs/plan-etapa-4`. Mapeo de solo lectura: el dominio de cartera de la Etapa 1 está completo y sin usar fuera de sus pruebas; el esquema `001` no necesita cambios; faltan las consultas, el caso de uso de escritura y toda la interfaz.]
- **L2** (2026-11-20): "Usa también la skill de ciclos" [Cada bloque se ejecuta con `ciclo-verificado` (D10).]
- **L3** (2026-11-20): "1. Aprobado, 2. Aprobado, 3. Aprobado, 4. No es necesario usar a Argon para esa tarea con desplegar Hydrogen en alto es suficiente, 5. Concuerdo y en caso de que se corte relanza, 6. Se pueden almacenar en engram?." [Puntos 1 a 5 aprobados: D14, D15 y D16 nuevas; D10 con `gemini-4-hydrogen-high` como verificador; D11 con relanzamiento. Punto 6 pendiente: Engram guarda texto y no ejecuta pruebas.]
- **L4** (2026-11-20): "Se quedan en el repo" [Punto 6 aprobado. Los 6 puntos quedan aprobados y el plan también.]
- **L5** (2026-11-20): "Si" [A "¿Integro el PR #22 con rebase y arranco con el bloque B4.0?". PR #22 integrado con rebase (`7f4ba49`, check `verify` en verde). Rama `feat/etapa-4-cartera` y milestone "Etapa 4" (#1). Línea base: 443 pruebas unitarias en verde.]
- **B4.0** (2026-11-20): [Primer ciclo cortado por Claude Code por memoria apenas arrancó el implementador, sin escribir nada; relanzado según L3, punto 5. Segundo ciclo: **APROBADO** en 18 min con 1 corrección (C22: varias pruebas de escrituras aceptadas no revisaban las cuatro tablas). C1–C22 cumplen; prueba final `npm run test:unit` con código 0; solo rutas permitidas. Checks del coordinador: lint, build sin advertencias y 487 pruebas unitarias (44 nuevas). Revisión dirigida: la transacción lee las facturas dentro de ella y reutiliza `distribuirCascada`/`abonarFactura`/`liquidarTodo`, `AbonoRepository.insertar`, `cobro()` y `LibroRepository.registrar`; `aplicarPago` exige `changes === 1`, y el adaptador de Capacitor lo informa dentro de las transacciones (`capacitor-sql-database.adapter.ts:87`), como ya usa `ClienteRepository.actualizar`; se confirma en la prueba manual con la APK. Commit `acc0b01`. Revisión `~/.agy-review/` (D12) con las lentes de a una por memoria.]
- **Revisión de B4.0** (2026-11-20): [Kit `~/.agy-review/` sobre `acc0b01~1..acc0b01`, lentes risk, resilience y reliability en secuencia (~518k tokens de Antigravity). **0 hallazgos** en las tres, así que no hizo falta refutador. El aviso "the working tree changed" de risk y resilience vino de los commits del coordinador en `planificacion/` (tarea del B4.1); `git diff acc0b01 HEAD -- src e2e` vacío. Pendiente para la prueba manual: confirmar en Android que un abono se guarda (`changes` del plugin dentro de la transacción).]
- **B4.1** (2026-11-20): [Ciclo **ESCALADO** con `NO_CONVERGE` tras 2 correcciones (32 min): C1–C13 y C15 cumplen; C14 no, porque `npm run test:unit` fallaba en 3 pruebas fuera de las rutas permitidas (`registrar-abono.spec.ts:879` y `:940`, `src/verificacion/b4-0/b4-0.verificacion.spec.ts:696` y `:756`) que esperaban el valor anterior de `ConsultarCartera.porCliente`. **Error del coordinador en la tarea:** pidió cambiar ese valor a `{ deuda, facturas }` sin permitir actualizar las pruebas que lo leen. El coordinador ajustó esas 4 comparaciones (mecánico, mismas cifras de los criterios del B4.0) en lugar de relanzar el ciclo. Checks del coordinador: lint, build sin advertencias, 502 pruebas unitarias y 19 e2e. Revisión dirigida: `Promise.all` de clientes y cartera con id de petición, cualquier fallo va al estado de error, filtro deshabilitado y buscador habilitado mientras carga. Detalle no bloqueante (C13): el buscador no tiene la etiqueta flotante "Buscar cliente" del mockup (lleva `aria-label`). **Para las próximas tareas:** cuando un bloque cambia la forma de un valor que ya se usa, sus rutas permitidas incluyen las pruebas que lo leen.]
