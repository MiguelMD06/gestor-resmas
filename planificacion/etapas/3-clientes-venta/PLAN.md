# Etapa 3 — Clientes y punto de venta

**Estado:** plan por aprobar · **Rama del plan:** `docs/plan-etapa-3` · **Rama de implementación:** `feat/etapa-3-clientes-venta` (sale del `main` actual) · **Entrega:** un PR a `main` · **Pruebas:** Vitest (`ng test`) + Playwright (`e2e/`)
**Objetivo:** el usuario puede registrar a sus clientes y vender: elige el cliente, toma resmas de uno o varios lotes activos con el precio que quiera, ve en vivo el costo y el margen, y cierra la venta de contado, fiada o con un abono inicial. La venta descuenta el stock, agota los lotes que llegan a 0 y, si entra dinero, lo registra en el libro con su reparto entre capital y ganancia.

## Qué hay hoy

- **Etapa 2 integrada en `main` (`7a22a50`):** pestañas **Finanzas**, **Vender**, **Inventario** y **Clientes**; Vender y Clientes muestran "Disponible en la Etapa 3" (`src/app/shell/proximamente.page.ts`).
- **El esquema ya tiene todo lo de esta etapa** (migración `001`): `clientes` (con `es_mostrador` y el cliente **Mostrador** ya insertado), `ventas` (con los CHECK de consistencia de saldo y estado), `detalle_ventas`, `abonos` (con `PAGO_CONTADO` y `ABONO_INICIAL`) y `abonos_detalle_facturas` (con `capital_aplicado` y `ganancia_aplicada`). **No hace falta migración.**
- **Reglas que ya existen y se reutilizan:**
  - `evaluarLinea(cantidad, costoUnitario, precioUnitario) → { subtotalVenta, subtotalCosto, margen, bajoCosto }` y `perdida(totalVenta, costoBase)` en `src/app/ventas/domain/margen.ts` (A4, Etapa 1);
  - `repartirPago(factura, monto) → { capital, ganancia }` en `src/app/cartera/domain/reparto-pago.ts` (R-01);
  - `cobro(fecha, medio, capital, ganancia, idAbono)` en `src/app/finanzas/domain/operaciones.ts` y `LibroRepository.registrar`;
  - `LoteRepository.descontar`, `LoteRepository.porId` y `descontarResmas`, dejados en la Etapa 2 como "base para la Etapa 3".
- **No existe nada de clientes:** no hay carpeta `src/app/clientes/` y ningún código lee ni escribe `clientes`, `ventas`, `detalle_ventas`, `abonos` ni `abonos_detalle_facturas`.
- **Reglas de calidad de `CLAUDE.md` (1 a 12):** obligatorias para todos los bloques. Aplican sobre todo la guarda `guardando` contra el doble envío, la vista bloqueada mientras procesa, los cuatro estados de carga y los mensajes de `shared/ui/mensajes-error.ts`.

## Specs

Citas textuales; si una cita y un bloque no coinciden, manda la cita.

| ID | Requisito | Fuente |
|----|-----------|--------|
| S1 | "El sistema deberá permitir crear, editar y buscar clientes almacenando su nombre completo y número de teléfono." | RF-05 |
| S2 | "Al registrar una venta, el sistema deberá permitir asociar un cliente y agregar líneas de detalle seleccionando manualmente el lote/caja activa de origen (Carta u Oficio) y la cantidad de resmas en números enteros (validando que no supere el stock disponible en dicho lote)." | RF-07 |
| S3 | "Mientras se agrega un lote a la venta, el sistema deberá mostrar en pantalla el costo unitario base de esa caja y permitir al usuario digitar libremente el precio unitario de venta que le cobrará al cliente para las resmas de ese lote específico." | RF-08 |
| S4 | "Si un pedido requiere tomar resmas de dos cajas distintas con costos diferentes, el sistema deberá permitir incluir ambos lotes como líneas independientes dentro de la misma factura, cada una con su propio precio unitario de venta y cálculo de margen individual." | RF-09 |
| S5 | "Al confirmar la venta, el sistema deberá permitir definir si se paga de **Contado** (seleccionando Efectivo o Transferencia), si queda **A Crédito / Fiado** (Saldo pendiente = 100%), o si deja un **Abono Inicial** en el acto (registrando el monto recibido y el medio de pago)." | RF-10 |
| S6 | "El flujo para registrar una venta o un abono deberá completarse en un máximo de 3 a 4 toques en pantalla, con controles adaptados para el uso con una sola mano y visualización inmediata del costo del lote al momento de fijar el precio de venta." | RNF-05 (la venta; el abono es de la Etapa 4) |
| S7 | "Avisar al fijar el precio y mostrar la **pérdida** en el dashboard." | A4 (el aviso al fijar el precio; la pérdida en el dashboard es de la Etapa 5) |
| S8 | "Al vender, el usuario elige manualmente de qué caja/lote activo salen las resmas y define el precio de venta unitario específico para ese lote y cliente." | RN-02 (la parte que quedó para esta etapa) |
| S9 | "Cuando el stock de resmas de una caja llegue a 0 tras una venta, el sistema deberá cambiar el estado del lote a *Agotado* y ocultarlo de la lista de selección de ventas activas, conservando su registro para el historial contable." | RF-04 (la venta que usa la regla de la Etapa 2) |
| S10 | "En toda venta cobrada de contado o mediante abonos parciales, el dinero que ingresa cubre primero el **Costo Base** de las resmas de esa factura (*Capital Recuperado*). Solo cuando el monto pagado en una factura supera su costo base de adquisición, el excedente se suma a la **Ganancia Libre Disponible**." | RN-03 (el pago de contado y el abono inicial; R-01 ya lo calcula) |
| S11 | "**Mostrador:** sus ventas son siempre de contado; no puede quedar debiendo." | Modelo contable, R-09 |
| S12 | "Las operaciones compuestas (como una venta que descuenta stock de varios lotes o un abono en cascada que modifica múltiples facturas y actualiza los bolsillos de efectivo/transferencia) deberán ejecutarse dentro de transacciones atómicas de base de datos; si ocurre un error intermedio, ningún dato parcial se guardará para evitar descuadres contables." | RNF-03 (la venta) |
| S13 | "Selección de cliente, selección manual de lote activo (mostrando resmas restantes y costo base unitario), ingreso de cantidad y precio de venta unitario con cálculo de ganancia en vivo, y cierre de venta (*Contado*, *Fiado* o *Abono Inicial* por Efectivo o Transferencia)." | Documento maestro, §5.3, pestaña Vender |
| S14 | "Directorio de clientes con indicador visual de deuda pendiente, expediente histórico de compras/pagos y modal de registro de abonos (*Cascada al monto total*, *Factura individual* o *Liquidar todo*)." | Documento maestro, §5.3, pestaña Clientes (aquí solo el directorio; deuda, expediente y abonos son de la Etapa 4) |

### Ejemplos de aceptación

Cada uno es una prueba. Los números siguen el ejemplo de Ana: lote **A** Carta con 20 de 20 resmas a $12.000 y lote **B** Carta con 10 de 10 a $13.000, después de un aporte de $400.000 en efectivo y las dos compras en efectivo (quedan $30.000 en efectivo). Cada ejemplo parte de ese estado, salvo que diga otra cosa.

| ID | Situación | Resultado esperado |
|----|-----------|--------------------|
| E1 | Crear el cliente "Ana Pérez" con teléfono "3001234567". | queda en `clientes` con `es_mostrador = 0`; aparece en la lista de Clientes |
| E2 | Crear un cliente con nombre vacío o de solo espacios. | **Guardar cliente** está deshabilitado y el campo muestra el error; el dominio lo rechaza (`NOMBRE_INVALIDO`) y no se escribe nada |
| E3 | Crear un cliente con teléfono "300-ABC", "2001234567" (no empieza por 3) o "300123456" (9 dígitos). | se rechaza (`TELEFONO_INVALIDO`) con el error junto al campo; "3001234567" se guarda; sin teléfono, también se guarda |
| E4 | Editar a "Ana Pérez" y cambiar su nombre a "Ana María Pérez". | se actualiza la misma fila (mismo `id_cliente`); la lista muestra el nombre nuevo |
| E5 | Con "Ana María Pérez" y "Juan Gómez" (teléfono "3109876543"), buscar "ana", "ANA", "perez" y "3109". | "ana", "ANA" y "perez" devuelven a Ana María Pérez (sin distinguir mayúsculas ni tildes); "3109" devuelve a Juan Gómez |
| E6 | Venta a Ana: 5 resmas del lote A a $15.000, de **Contado** en efectivo. | venta `PAGADA` con total $75.000, costo base $60.000 y saldo $0; el lote A queda con 15; un abono `PAGO_CONTADO` de $75.000 con detalle capital $60.000 y ganancia $15.000; movimiento `COBRO` con efectivo +$75.000, capital +$60.000 y ganancia +$15.000; la invariante se cumple |
| E7 | Venta multilote a Ana: 3 resmas del A a $15.000 y 2 del B a $16.000, de contado por transferencia. | una sola venta con 2 líneas: total $77.000, costo base $62.000; margen de la línea A $9.000 y de la línea B $6.000; A queda con 17 y B con 8 |
| E8 | Venta a Ana: 4 resmas del A a $15.000, **Fiado**. | venta `PENDIENTE` con saldo $60.000; el lote A baja 4; **no** hay abono ni movimiento de dinero |
| E9 | Venta a Ana: 4 resmas del A a $15.000 con **Abono inicial** de $50.000 por transferencia. | venta `PARCIAL` con pagado $50.000 y saldo $10.000; abono `ABONO_INICIAL` de $50.000 con capital $48.000 y ganancia $2.000; transferencia +$50.000 |
| E10 | Abono inicial de $0 o de $60.000 (igual al total) en la venta de E9. | se rechaza (`ABONO_INICIAL_INVALIDO`): el abono inicial va de $1 a total − $1; si se paga todo, es Contado |
| E11 | Venta al cliente **Mostrador** fiada, o con abono inicial. | se rechaza (`MOSTRADOR_SOLO_CONTADO`); en la pantalla, con Mostrador elegido, solo se ofrece Contado |
| E12 | Venta de 21 resmas del lote A (con 20). | se rechaza (`STOCK_INSUFICIENTE`) y **no** cambia ninguna tabla: ni `ventas`, ni `detalle_ventas`, ni `lotes_cajas`, ni `abonos`, ni `movimientos_dinero` |
| E13 | Venta de las 10 resmas del lote B, de contado. | B queda con 0 y `AGOTADO`; ya no aparece en el selector de lotes de Vender ni en Inventario |
| E14 | Línea de 1 resma del lote A a $11.000. | al escribir el precio aparece el aviso "Precio por debajo del costo: pierdes $1.000"; la venta se puede guardar; de contado, el cobro es capital $11.000 y ganancia $0 |
| E15 | Línea con precio vacío o $0, o cantidad vacía o 0. | **Confirmar venta** está deshabilitado y el campo muestra el error; el dominio lo rechaza (`PRECIO_INVALIDO` o `CANTIDAD_INVALIDA`) |
| E16 | Confirmar una venta sin líneas, o con el mismo lote en dos líneas. | se rechaza (`VENTA_SIN_LINEAS` o `LOTE_REPETIDO`); en la pantalla, un lote ya agregado no se puede volver a elegir |
| E17 | Doble toque en **Confirmar venta** (dos ejecuciones concurrentes). | se registra **una sola** venta, un solo descuento de stock y un solo movimiento |
| E18 | La carga de lotes o de clientes falla. | se ve el estado de error con **Reintentar**, no la lista vacía |
| E19 | Venta de E6 completa desde la pestaña Vender, con Ana ya creada (RNF-05). | se completa en **4 toques**, sin contar lo que se escribe con el teclado: (1) elegir cliente, (2) tocar a Ana en los resultados, (3) tocar el lote A, (4) **Confirmar venta**; con Mostrador y contado en efectivo, en 2 toques. La fecha viene puesta con la de ahora y no suma toques |
| E20 | La venta de E6 con fecha de ayer a las 18:00. | la venta, el abono `PAGO_CONTADO` y el movimiento `COBRO` quedan con esa fecha; una fecha posterior a la del `CLOCK` se rechaza (`FECHA_FUTURA`) |

## Decisiones

| # | Decisión | Por qué |
|---|----------|---------|
| D1 | **Clientes como funcionalidad propia** en `src/app/clientes/`, con `domain/` (validación de nombre y teléfono, normalización para buscar), `infrastructure/` (`ClienteRepository`), `application/` (`RegistrarCliente`, `EditarCliente`, `BuscarClientes`) y `ui/`. | Sigue la arquitectura por funcionalidad de `base.md`. La Etapa 4 suma el expediente y la deuda sobre la misma funcionalidad. |
| D2 | **La venta vive en `src/app/ventas/`**: `domain/venta.ts` arma la venta a partir de las líneas y la modalidad de pago, y reutiliza `evaluarLinea` y `repartirPago`; `infrastructure/venta.repository.ts` escribe `ventas` y `detalle_ventas`; `application/registrar-venta.ts` orquesta. | `margen.ts` ya está en `ventas/domain/`. El reparto (R-01) es de `cartera/` y se reutiliza: no se recalcula de otra forma. |
| D3 | **`AbonoRepository` en `src/app/cartera/infrastructure/`**: inserta en `abonos` y `abonos_detalle_facturas`. La venta lo usa para `PAGO_CONTADO` y `ABONO_INICIAL`. | Los abonos son de la cartera; la Etapa 4 lo reutiliza para la cascada, el abono individual y la liquidación. |
| D4 | **La venta es una sola transacción**, en este orden: validar el cliente, leer cada lote y descontarlo con `LoteRepository.descontar`, insertar la venta y sus líneas, y, si entra dinero, insertar el abono con su detalle y registrar el `COBRO` con `LibroRepository.registrar`. Si algo falla, no queda nada escrito. | R-11 (RNF-03). Leer el stock dentro de la transacción evita vender dos veces la misma resma. `DatabaseProvider` ya serializa las transacciones. |
| D5 | **Una línea por lote.** Para vender más resmas del mismo lote se cambia la cantidad de su línea. | Evita que dos líneas del mismo lote sumen más que su stock sin que ninguna lo supere sola. |
| D6 | **La fecha de la venta viene puesta con la del `CLOCK` y se puede cambiar a una fecha pasada**, nunca a una futura (`FECHA_FUTURA`). El abono y el movimiento `COBRO` de esa venta llevan la misma fecha. | L3: hay que poder cargar una venta del día anterior. Si el cobro llevara la fecha de carga, la ganancia caería en el mes equivocado (A5). La regla 11 de `CLAUDE.md` se cumple: "ahora" sale del `CLOCK`. |
| D7 | **Mensajes nuevos en la misma tabla** (`shared/ui/mensajes-error.ts`): `NOMBRE_INVALIDO`, `TELEFONO_INVALIDO`, `PRECIO_INVALIDO`, `VENTA_SIN_LINEAS`, `LOTE_REPETIDO`, `ABONO_INICIAL_INVALIDO`, `MOSTRADOR_SOLO_CONTADO`, `CLIENTE_INEXISTENTE` y `FECHA_FUTURA`. | Continúa la D5 de la Etapa 2. |
| D9 | **El cliente se identifica por `id_cliente`** (la clave primaria). El teléfono es solo un dato: no es único ni identifica a nadie. | L3. Dos clientes con el mismo nombre son filas distintas; en la pantalla se distinguen por el teléfono, si lo tienen. |
| D8 | **Lotes del selector en el orden de la Etapa 2** (más antiguo primero) y con el mismo caso de uso `ConsultarInventario`. | Una sola fuente para "lotes activos"; el agotado desaparece de los dos lados a la vez (S9). |

## Bloques

| ID | Bloque | Specs | Ruta | Agente | Ola |
|----|--------|-------|------|--------|-----|
| B3.0 | Códigos de regla y mensajes nuevos | D7 | inline | coordinador | 0 |
| B3.1 | Clientes: dominio, repositorio, casos de uso y pestaña Clientes | S1, S14; E1–E5, E18 | delegado | `agy` · `gemini-4-hydrogen-medium` | 1 |
| B3.2 | Venta: dominio, repositorios y caso de uso | S2–S5, S8–S12; E6–E14, E16, E17, E20 | delegado | `agy` · `gemini-4-hydrogen-medium` | 1 |
| B3.3 | Pestaña Vender (punto de venta) | S2–S7, S11, S13; E14–E20 | delegado | `agy` · `gemini-4-hydrogen-medium` | 2 |
| V3 | Verificación independiente | S1–S14, E1–E20 | delegado | `agy` · `gemini-4-hydrogen-high` | 3 |

Si Hydrogen se queda sin cuota: código con `gemini-3.8-flash-high` y verificación con `gemini-4-argon-medium`.

**Por qué en olas:** B3.0 lo hace el coordinador antes de la ola 1 porque los dos bloques de la ola 1 necesitan los códigos y escribirían el mismo archivo. B3.1 y B3.2 no comparten archivos y corren en paralelo; ninguno de los dos corre `npm run build`, que lo corre el coordinador. B3.3 necesita `BuscarClientes` y el modal de cliente de B3.1, y `RegistrarVenta` de B3.2. `tabs.routes.ts` lo toca cada bloque solo para su pestaña: B3.1 en la ola 1 y B3.3 en la ola 2.

### B3.0 — Códigos de regla y mensajes (coordinador)

- **Rutas:** `src/app/shared/domain/regla-negocio.error.ts`, `src/app/shared/ui/mensajes-error.ts` y sus `.spec.ts`
- Agrega los 9 códigos de D7 a `CodigoRegla` y su texto en español a la tabla, con una prueba del texto exacto de cada uno.

### B3.1 — Clientes

- **Rutas permitidas:** `src/app/clientes/**`, `src/app/shell/tabs.routes.ts` (solo la ruta de Clientes), `e2e/clientes.spec.ts`
- **Qué hacer:**
  1. **`clientes/domain/cliente.ts`**, como funciones puras:
     - `validarNombre(texto) → string` recortado; `NOMBRE_INVALIDO` si queda vacío o pasa de 80 caracteres (E2);
     - `validarTelefono(texto | null) → string | null`: vacío es `null`; si no, debe ser un celular: exactamente 10 dígitos y empezar por 3 (E3, "Por aprobar" 1);
     - `normalizarBusqueda(texto)`: minúsculas y sin tildes, para comparar (E5).
  2. **`clientes/infrastructure/cliente.repository.ts`**: `insertar(db, datos, fecha) → idCliente`, `actualizar(db, id, datos)`, `porId(db, id)`, `mostrador(db)` y `todos(db)` sin el Mostrador, ordenados por nombre. `actualizar` rechaza el Mostrador (`CLIENTE_INEXISTENTE` si el id no existe o es el Mostrador).
  3. **`clientes/application/`**: `RegistrarCliente`, `EditarCliente` y `BuscarClientes.buscar(texto)`, que filtra con `normalizarBusqueda` sobre el nombre y el teléfono. Sin texto, devuelve todos. `buscar` acepta `{ incluirMostrador: true }` para el selector de Vender, con el Mostrador primero.
  4. **`clientes/ui/clientes.page`**: buscador (`ion-searchbar`), lista con nombre y teléfono, estados cargando, con datos, vacío ("Todavía no hay clientes") y error con **Reintentar**. Un `ion-fab` **Nuevo cliente**. Tocar un cliente abre el modal en modo edición.
  5. **`clientes/ui/cliente.modal`**: nombre completo y teléfono, con validación en vivo y el error junto al campo; **Guardar cliente** deshabilitado mientras haya un campo inválido o mientras guarda; no se cierra mientras guarda (`soloCierreExplicito`). Devuelve el cliente guardado a quien lo abrió (B3.3 lo usa).
  6. Reemplaza la página provisional de Clientes en `tabs.routes.ts`.
- **Pruebas:** E1 a E5 con `SqlJsDatabase` y la migración real; el modal con cada campo vacío, inválido y válido, y el estado del botón; doble envío del guardado (una sola fila); botón habilitado otra vez tras un error; E18 para la lista. E2E: crear a Ana, buscarla y editarla; después de recargar, sigue ahí.

### B3.2 — Venta

- **Rutas permitidas:** `src/app/ventas/**` (sin `ui/`), `src/app/cartera/infrastructure/**`, `src/app/cartera/index.ts`, `src/app/inventario/infrastructure/lote.repository.ts` (solo si hace falta leer un lote dentro de la transacción), y el `.spec.ts` de cada uno
- **Qué hacer:**
  1. **`ventas/domain/venta.ts`**: `armarVenta({ idCliente, esMostrador, fecha, ahora, lineas, pago }) → { totalVenta, costoTotalBase, montoPagado, saldoPendiente, estadoPago, lineas: (línea + evaluarLinea)[], cobro: { tipoAbono, monto, medio, capital, ganancia } | null }`.
     - `lineas`: `{ idLote, costoUnitario, disponibles, cantidad, precioUnitario }`; rechaza `VENTA_SIN_LINEAS`, `LOTE_REPETIDO`, `CANTIDAD_INVALIDA`, `PRECIO_INVALIDO` (no entero o ≤ 0) y `STOCK_INSUFICIENTE`.
     - `pago`: `{ modalidad: 'CONTADO', medio } | { modalidad: 'FIADO' } | { modalidad: 'ABONO_INICIAL', monto, medio }`. Contado cobra el total; abono inicial de 1 a total − 1 (`ABONO_INICIAL_INVALIDO`); Mostrador solo contado (`MOSTRADOR_SOLO_CONTADO`).
     - `fecha` posterior a `ahora` se rechaza (`FECHA_FUTURA`, D6); `ahora` lo pasa el caso de uso desde el `CLOCK`.
     - El reparto del cobro sale de `repartirPago` sobre la factura recién creada (pagado 0). **No** reimplementes R-01.
  2. **`ventas/infrastructure/venta.repository.ts`**: `insertar(tx, venta, fecha) → idVenta`, con sus líneas en `detalle_ventas`.
  3. **`cartera/infrastructure/abono.repository.ts`**: `insertar(tx, { idCliente, fecha, monto, medio, tipo, aplicaciones: { idVenta, monto, capital, ganancia }[] }) → idAbono`. Exportado desde `cartera/index.ts`.
  4. **`ventas/application/registrar-venta.ts`**: `registrar({ idCliente, fecha, lineas: { idLote, cantidad, precioUnitario }[], pago }) → { idVenta }` en una transacción, según D4. La venta, el abono y el `COBRO` usan esa `fecha` (D6). Lee el cliente y cada lote dentro de la transacción (`CLIENTE_INEXISTENTE` si el cliente no existe), descuenta con `LoteRepository.descontar` y registra el dinero con `cobro` + `LibroRepository.registrar`. **No** escribas en `movimientos_dinero` ni en `lotes_cajas` por tu cuenta.
- **Pruebas:** E6 a E14, E16, E17 y E20 tal cual, con `SqlJsDatabase` y la migración real. Además: E12 deja las 5 tablas exactamente como estaban; un fallo forzado después de descontar el primer lote de una venta multilote no deja nada escrito; después de E6, E7 y E9 la invariante (`verificarInvariante`) se cumple.

### B3.3 — Pestaña Vender

- **Rutas permitidas:** `src/app/ventas/ui/**`, `src/app/shell/tabs.routes.ts` (solo la ruta de Vender), `e2e/vender.spec.ts`, más `src/app/ventas/application/**` si hace falta un caso de uso de consulta
- **Qué hacer:**
  1. **`ventas/ui/vender.page`** (S13), pensada para una sola mano, con la acción principal abajo:
     - **Cliente** arriba: muestra el elegido (por defecto **Mostrador**). Tocarlo abre un selector con buscador (`BuscarClientes` con el Mostrador) y un botón **Nuevo cliente** que abre el modal de B3.1 y deja elegido al cliente creado.
     - **Lotes activos**: `ion-segment` Carta y Oficio y una fila por lote con "N resmas" y el costo por resma (S3, S9). Tocar un lote agrega su línea con cantidad 1; un lote ya agregado no se puede tocar otra vez (D5).
     - **Cada línea**: cantidad y precio unitario con teclado numérico, el costo por resma a la vista, el subtotal y el margen en vivo (`evaluarLinea`); con `bajoCosto`, un `ion-note` `warning` "Precio por debajo del costo: pierdes $X" (S7, E14). Un botón con ícono para quitar la línea, con `aria-label`.
     - **Fecha**: muestra la de ahora (del `CLOCK`); tocarla abre un `ion-datetime` que no deja elegir una fecha futura (D6, E20).
     - **Cierre**: total, costo y margen de la venta; `ion-segment` **Contado**, **Fiado** y **Abono inicial** (con Mostrador, solo Contado, S11); medio **Efectivo** o **Transferencia** (por defecto Efectivo); el monto si es abono inicial.
     - **Confirmar venta**: deshabilitado si no hay líneas o algún campo es inválido, y mientras guarda (`guardando`, E17). Mientras guarda, la vista entera queda bloqueada con un indicador. Al terminar: `ion-toast` "Venta registrada", el formulario vuelve al estado inicial y los lotes se recargan (E13).
     - Estados cargando, con datos, sin lotes ("No hay lotes activos. Registra una compra en Inventario") y error con **Reintentar** (E18).
  2. Reemplaza la página provisional de Vender en `tabs.routes.ts`.
- **Pruebas:** de componente, con los casos de uso simulados: validación de cantidad y precio (vacío, inválido, válido) y el estado del botón; el aviso de E14 con su texto exacto; Mostrador solo ofrece Contado; doble envío (una sola llamada a `registrar`); botón habilitado otra vez tras un error, con el mensaje exacto; E18. E2E (`e2e/vender.spec.ts`): E6 de punta a punta contando los toques de E19, E7 multilote y E13 (el lote agotado desaparece de Vender y de Inventario); después de recargar, el stock sigue descontado.

### V3 — Verificación independiente

Lee este plan completo y `CLAUDE.md`, y prueba en una copia limpia (`mktemp -d`):

- corre `lint`, `test:unit`, `build` y `test:e2e`;
- reproduce E1 a E20 con pruebas propias que usan la API pública y, para E15 a E19, la interfaz;
- da un veredicto por cada `S#` y `E#`;
- revisa las reglas 1 a 12 de `CLAUDE.md` en cada formulario y vista nueva, y la calidad de las pruebas (regla 6 de `base.md`);
- controla las rutas permitidas.

Mismas reglas de severidad que V1 y V2.

## Verificación del coordinador

1. Antes de cada ola, anotar `HEAD`; después, comprobar que no hubo commits de `agy` y revisar el diff contra las rutas permitidas.
2. Después de la ola 1, correr `npm run build` una vez.
3. Correr `gentle-ai review assess` por commit. B3.2 escribe dinero y stock: si la evaluación lo marca de riesgo alto, su commit se revisa solo.
4. Probar la app en el navegador (`npm start`): crear cliente, venta de contado, fiada, con abono inicial, multilote y bajo costo, y recarga.
5. Generar la APK de debug (`npm run apk`) para la prueba manual de Miguel en Android.
6. Abrir el PR con el checklist de la regla 12 y esperar el check `verify`.

## Commits

En el orden en que se aplican, según `commits-atomicos`:

1. `feat: códigos de regla y mensajes de clientes y ventas`
2. `feat: directorio de clientes con búsqueda`
3. `feat: registro de ventas multilote con pago de contado, fiado o abono inicial`
4. `feat: pestaña Vender con selección de lote y margen en vivo`
5. `test: pruebas de aceptación de la verificación independiente`
6. `docs: cierre de la Etapa 3`

El reporte de la etapa va en Engram (`etapas/3-clientes-venta/reporte`).

## Por aprobar

Estado tras L3: aprobados 1, 2, 4, 5, 7 (con el cambio de L3), 8, 9, 10 y 12. Faltan el 3 y el 6, que Miguel pidió que se le expliquen, y el 11, que se revisa con los cambios de L3.

1. ✅ **Teléfono:** opcional. Si se escribe, debe ser un celular: exactamente 10 dígitos y empezar por 3 (L3). Los nombres repetidos se permiten. El cliente se identifica por `id_cliente` (D9); el teléfono solo ayuda a distinguir en pantalla a dos "Juan".
2. ✅ **Búsqueda:** por nombre o teléfono, por coincidencia parcial, sin distinguir mayúsculas ni tildes.
3. **Mostrador:** es el cliente por defecto en Vender, no se puede editar y no aparece en la lista de la pestaña Clientes.
4. ✅ **Cómo se cuentan los toques (RNF-05):** no cuenta lo que se escribe con el teclado (cantidad, precio, búsqueda). Con eso, una venta a un cliente registrado se hace en 4 toques y una de Mostrador en 2 (E19). Para lograrlo, tocar un lote agrega la línea con cantidad 1, sin un botón **Agregar** aparte.
5. ✅ **Una línea por lote** (D5).
6. **Abono inicial** entre $1 y el total menos $1. Si el cliente paga todo, la venta es de Contado.
7. ✅ **Fecha de la venta:** viene puesta con la de ahora y se puede cambiar a una fecha pasada, para cargar una venta del día anterior (L3, D6, E20). No se aceptan fechas futuras: es una suposición del coordinador, porque L3 solo pide fechas pasadas.
8. ✅ **Venta bajo costo** (A4): se permite, con el aviso en la línea. La pérdida acumulada se muestra en el dashboard (Etapa 5).
9. ✅ **Crear un cliente desde Vender:** sí, con **Nuevo cliente** dentro del selector, para no salir de la venta.
10. ✅ **Modelos de `agy`:** Hydrogen (`gemini-4-hydrogen-medium` para el código y `gemini-4-hydrogen-high` para la verificación), según el enrutamiento vigente, con Flash y Argon como respaldo si se agota la cuota. `planificacion/README.md` se actualiza en el mismo sentido.
11. **D1 a D9** tal como están arriba. Con L3 cambiaron D6 (fecha editable hacia atrás) y D7 (código `FECHA_FUTURA`), y se agregó D9 (identificador del cliente). D1 a D5 y D8 no cambian.
12. ✅ **Alcance:** no entran la deuda en la lista de clientes, el expediente ni los abonos posteriores (Etapa 4), el dashboard ni la pérdida acumulada (Etapa 5), ni anular o corregir una venta (Etapa 6, A7). Tampoco un comprobante para enviar al cliente, porque no lo pide ningún requisito.

## Log

Mensajes del usuario copiados textualmente; las notas del coordinador van entre corchetes.

- **L1** (2026-11-15): "Recuerdo que yo tenia que hacer un test de la aplicación de forma manual, ese test lo hice y aprobé el funcionamiento, si puedes hacer el merge a la pr hazlo y limpia la rama local" [PR #13 integrado con rebase (`7a22a50`). La Etapa 2 queda cerrada.]
- **L2** (2026-11-15): "Escribe el plan de la etapa 3 y dime como tienes configurado el trabajo con subagentes y agentes de agy" [Se escribe este plan. No se ejecuta nada hasta que Miguel lo apruebe.]
- **L3** (2026-11-15): "Sobre el punto 1, el numero de telefono es opcional y si se recibe se debe validar que sea de telefono movil solamente que cuente con los 10 digitos y que comience con 3, sobre los nombres no es bueno que se use a el numero de telefono como identificador ya que para eso debe existir una primary key o no se si te refieres solo a que en vista de usuario se diferencia con el numero celular. Punto 2 aprobado. Punto 3 Explicame bien como va a funcionar esto. Punto 4 aprobado. Punto 5 Aprobado. Punto 6, Explicame bien. Punto 7, Las ventas debe permitir registrar fechas pasadas, porque puedo registrar en algun momento una venta que hice el dia anterior. Punto 8 aprobado. Punto 9 aprobado. Punto 10 aprobado. Punto 11 aprobado parcialmente porque mis decisiones anteriores pueden afectar D1 a D8. Punto 12 aprobado." [Teléfono: solo celular de 10 dígitos que empieza por 3 (E3, B3.1). El identificador siempre fue `id_cliente`; el teléfono solo distingue en pantalla (D9). Fecha de la venta editable hacia atrás (D6, D7, E20, B3.2, B3.3). Se explican los puntos 3 y 6.]
