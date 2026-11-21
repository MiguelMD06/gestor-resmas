# Tarea B4.0 — Consultas de cartera y registro de abonos

## Objetivo

Conectar el dominio de cartera que ya existe (Etapa 1) con la base de datos: leer las facturas abiertas, la deuda de cada cliente y el expediente de un cliente, y registrar abonos en sus tres modos (a la deuda en cascada, a una factura y pagar todo) en **una sola transacción**. Este bloque no tiene interfaz: las pantallas llegan en los bloques B4.1 a B4.3 de esta misma etapa, que usarán lo que exportes aquí.

## Rutas

**Permitidas** (solo estas):

- `src/app/cartera/domain/**`
- `src/app/cartera/application/**` (carpeta nueva)
- `src/app/cartera/infrastructure/**`
- `src/app/cartera/index.ts`
- `src/app/shared/domain/regla-negocio.error.ts` (solo agregar el código `ABONO_ANTERIOR_A_FACTURA`)
- `src/app/shared/ui/mensajes-error.ts` y `src/app/shared/ui/mensajes-error.spec.ts` (solo el texto de `ABONO_ANTERIOR_A_FACTURA`)

**Prohibidas:** todo lo demás. En especial `src/app/shared/infrastructure/sqlite/migrations/**` (no hay migración en esta etapa), `src/app/ventas/**`, `src/app/finanzas/**` y `src/app/clientes/**`: esas clases se **usan**, no se cambian. Tampoco toques `src/verificacion/**`, que es la carpeta del verificador.

## Specs que cubre (citas textuales del plan)

- **S2 (RF-11):** "El sistema deberá calcular el saldo total adeudado por cada cliente sumando los saldos pendientes de todas sus facturas en estado *Pendiente* o *Abonada Parcialmente*."
- **S3 (RF-12):** "Cuando un cliente realice un abono general a su deuda total indicando el monto y el medio de pago (Efectivo o Transferencia), el sistema deberá descontar el dinero empezando por la factura pendiente más antigua; si el abono cubre la totalidad de esa factura, la marcará como *Pagada* y aplicará el excedente sucesivamente a las siguientes facturas en orden cronológico ascendente."
- **S4 (RF-13):** "El sistema deberá permitir al usuario seleccionar una factura pendiente específica del cliente para aplicarle un abono parcial o pago total de manera aislada, sin afectar las demás facturas abiertas."
- **S5 (RF-14):** "El sistema deberá incluir una función rápida para saldar el 100% de la deuda acumulada de un cliente, cerrando todas sus facturas pendientes y registrando el ingreso por el medio de pago seleccionado (Efectivo o Transferencia)."
- **S6 (RF-15):** "Por cada abono recibido, el sistema deberá almacenar la fecha, el monto entregado, el medio de pago (Efectivo o Transferencia) y el detalle exacto de a qué factura o facturas se aplicó el descuento."
- **S8 (R-13):** "**Nada con fecha futura:** compra, aporte, venta, abono, retiro y traspaso llevan la fecha de ahora (del `CLOCK`) o una pasada, nunca una posterior (`FECHA_FUTURA`)."
- **S9 (R-01):** "**Reparto de un pago a una factura:** `capital_aplicado = min(pagado + m, costo) − min(pagado, costo)` y `ganancia_aplicada = m − capital_aplicado`"
- **S10 (R-02, R-03, R-04):** "**Cascada:** se recorren las facturas con saldo del cliente en orden `fecha_venta ASC, id_venta ASC`, y cada una recibe hasta su saldo. El monto no puede superar la deuda total." · "**Abono individual:** el monto no puede superar el saldo de esa factura." · "**Liquidación total:** equivale a una cascada por el 100 % de la deuda."
- **S11 (R-11):** "**Operación compuesta = una transacción:** si algo falla, no queda nada escrito."
- **S16:** "Por factura, el capital por recuperar es `min(costo, total) − min(pagado, costo)` y el resto es ganancia futura."
- **D14 (regla nueva):** el abono no es anterior a las facturas que paga: su fecha debe ser igual o posterior a la de **cada** factura que recibe dinero. Código `ABONO_ANTERIOR_A_FACTURA`, texto exacto «La fecha del abono es anterior a una factura que paga».
- **D15:** el historial de abonos del expediente muestra `ABONO_INICIAL`, `CASCADA_GLOBAL`, `FACTURA_INDIVIDUAL` y `LIQUIDACION_TOTAL`; **no** muestra `PAGO_CONTADO`.

## Lo que ya existe y debes reutilizar

No reimplementes ninguno de estos pasos con otra forma:

- `src/app/cartera/domain/`: `FacturaAbierta`, `saldo`, `validarFactura`, `repartirPago` (R-01), `deudaTotal`, `distribuirCascada`, `abonarFactura`, `liquidarTodo` y `AplicacionAbono`. Ya lanzan `MONTO_INVALIDO`, `SIN_DEUDA`, `MONTO_SUPERA_DEUDA` y `MONTO_SUPERA_SALDO_FACTURA`.
- `AbonoRepository.insertar(tx, NuevoAbono)` (`cartera/infrastructure/abono.repository.ts`): escribe `abonos` y `abonos_detalle_facturas`.
- `cobro(fecha, medio, capital, ganancia, idAbono)` (`finanzas/domain/operaciones.ts`) y `LibroRepository.registrar(tx, movimiento)` (`finanzas/infrastructure/libro.repository.ts`): el movimiento `COBRO` del libro.
- `ClienteRepository.porId(db, idCliente)` (`clientes/infrastructure/cliente.repository.ts`).
- `SQL_DATABASE` y `db.transaction(async (tx) => …)`; `CLOCK` y `clock.ahora()`.
- La comparación de fechas de `FECHA_FUTURA` en `ventas/domain/venta.ts:141` (`fecha > ahora`, texto `YYYY-MM-DD HH:MM:SS`).
- **Patrón a seguir:** `src/app/ventas/application/registrar-venta.ts` (inyección, transacción, abono y cobro) y sus pruebas `registrar-venta.spec.ts` (`SqlJsDatabase` de `src/testing/` con las `MIGRACIONES` aplicadas).

El esquema `001` ya tiene todo: `abonos.tipo_abono` acepta `CASCADA_GLOBAL`, `FACTURA_INDIVIDUAL` y `LIQUIDACION_TOTAL`; `ventas` tiene los CHECK `saldo_pendiente = total_venta - monto_pagado`, `(estado_pago = 'PENDIENTE') = (monto_pagado = 0)` y `(estado_pago = 'PAGADA') = (saldo_pendiente = 0)`, con estados `PENDIENTE`, `PARCIAL` y `PAGADA`.

## Qué hacer

### 1. Dominio (`src/app/cartera/domain/`)

- **`por-cobrar.ts`**: `porCobrar(f: FacturaAbierta): { readonly capital: Pesos; readonly ganancia: Pesos }`. `capital = min(costoBase, total) − min(pagado, costoBase)` y `ganancia = saldo(f) − capital` (S16). Con una venta bajo costo (total menor que el costo) la ganancia por cobrar es 0, nunca negativa.
- **`fecha-abono.ts`**: `validarFechaAbono(fecha: FechaHora, ahora: FechaHora, facturasQueReciben: readonly FacturaAbierta[]): void`. Lanza `FECHA_FUTURA` si `fecha > ahora` y `ABONO_ANTERIOR_A_FACTURA` si `fecha` es anterior a la `fecha` de alguna de las facturas que reciben dinero. Una fecha igual a la de la factura es válida.
- Exporta los dos desde `domain/index.ts`.

### 2. Código de error

- `regla-negocio.error.ts`: agrega `'ABONO_ANTERIOR_A_FACTURA'` a `CodigoRegla`, con su comentario en inglés como los demás.
- `mensajes-error.ts`: `ABONO_ANTERIOR_A_FACTURA: 'La fecha del abono es anterior a una factura que paga'`, con su prueba de texto exacto en `mensajes-error.spec.ts`.

### 3. Repositorio de cartera (`src/app/cartera/infrastructure/cartera.repository.ts`, nuevo)

`@Injectable({ providedIn: 'root' }) export class CarteraRepository`, con `db: SqlDatabase | SqlExecutor` en las lecturas, como `ClienteRepository`:

- `facturasAbiertas(db, idCliente): Promise<FacturaAbierta[]>`: ventas del cliente con `saldo_pendiente > 0`, en orden `fecha_venta ASC, id_venta ASC`. `total = total_venta`, `costoBase = costo_total_base`, `pagado = monto_pagado`.
- `deudasPorCliente(db): Promise<ReadonlyMap<number, Pesos>>`: una sola consulta con `SUM(saldo_pendiente) … GROUP BY id_cliente` sobre las ventas con saldo. Un cliente sin deuda no aparece en el mapa.
- `aplicarPago(tx: SqlExecutor, idVenta: number, monto: Pesos): Promise<void>`: un solo `UPDATE ventas` que suma `monto` a `monto_pagado`, lo resta de `saldo_pendiente` y recalcula `estado_pago` (`PAGADA` si el saldo queda en 0; si no, `PARCIAL`), con `WHERE id_venta = ? AND saldo_pendiente >= ?`. Si no cambia exactamente una fila, lanza un `Error` (mensaje en inglés) para que la transacción se revierta.
- `expediente(db, idCliente)`: devuelve
  - `facturas`: **todas** las ventas del cliente, de la más nueva a la más antigua (`fecha_venta DESC, id_venta DESC`), cada una con `idVenta`, `fecha`, `total`, `costoBase`, `pagado`, `saldo`, `estado` (`'PENDIENTE' | 'PARCIAL' | 'PAGADA'`) y `lineas` (`cantidad`, `tipoPapel` de `lotes_cajas.tipo_papel`, `precioUnitario`, `subtotal`), en orden `id_detalle ASC`;
  - `abonos`: los abonos del cliente **sin** `PAGO_CONTADO` (D15), del más nuevo al más antiguo (`fecha_abono DESC, id_abono DESC`), cada uno con `idAbono`, `fecha`, `monto`, `medio`, `tipo` y `aplicaciones` (`idVenta`, `monto`) en orden `id_venta ASC`.
  Sin consultas N+1 por factura: como mucho una consulta por tabla.

### 4. Casos de uso (`src/app/cartera/application/`, nuevo)

- **`registrar-abono.ts`**: `@Injectable({ providedIn: 'root' }) export class RegistrarAbono` con

  ```ts
  export type SolicitudRegistrarAbono =
    | { readonly modo: 'CASCADA_GLOBAL'; readonly idCliente: number; readonly fecha: FechaHora; readonly medio: MedioPago; readonly monto: Pesos }
    | { readonly modo: 'FACTURA_INDIVIDUAL'; readonly idCliente: number; readonly fecha: FechaHora; readonly medio: MedioPago; readonly idVenta: number; readonly monto: Pesos }
    | { readonly modo: 'LIQUIDACION_TOTAL'; readonly idCliente: number; readonly fecha: FechaHora; readonly medio: MedioPago };

  registrar(s: SolicitudRegistrarAbono): Promise<{ readonly idAbono: number; readonly aplicaciones: readonly AplicacionAbono[] }>;
  ```

  Todo dentro de **un** `db.transaction`, en este orden:
  1. el cliente existe (`ClienteRepository.porId`); si no, `CLIENTE_INEXISTENTE`;
  2. lee `facturasAbiertas` **dentro** de la transacción;
  3. calcula las aplicaciones con `distribuirCascada`, `abonarFactura` o `liquidarTodo` según el modo. En `FACTURA_INDIVIDUAL`, si `idVenta` no está entre las facturas abiertas del cliente: `SIN_DEUDA` si la venta es del cliente y ya está pagada, y `FACTURA_INVALIDA` si no existe o es de otro cliente;
  4. `validarFechaAbono(s.fecha, clock.ahora(), facturas que reciben dinero)`;
  5. `AbonoRepository.insertar` con `tipo = s.modo`, `monto` = suma de las aplicaciones y una fila por aplicación;
  6. `CarteraRepository.aplicarPago` por cada aplicación;
  7. `LibroRepository.registrar(tx, cobro(s.fecha, s.medio, Σ capital, Σ ganancia, idAbono))`.

- **`consultar-cartera.ts`**: `ConsultarCartera.consultar(): Promise<{ readonly total: Pesos; readonly porCliente: ReadonlyMap<number, Pesos> }>`, con `total` = suma del mapa.
- **`consultar-expediente.ts`**: `ConsultarExpediente.consultar(idCliente): Promise<ExpedienteCliente>`, con el `cliente` (`ClienteRepository.porId`; `CLIENTE_INEXISTENTE` si no existe), las `facturas` y los `abonos` del repositorio, y `deuda: { total, capital, ganancia }`: `total` con `deudaTotal` y `capital`/`ganancia` sumando `porCobrar` de las facturas abiertas.
- `application/index.ts` los exporta; `cartera/index.ts` exporta `application` además de lo que ya exporta.

## Pruebas

Pruebas primero (RED → GREEN). Unitarias del dominio y pruebas del repositorio y de los casos de uso contra `SqlJsDatabase` con las `MIGRACIONES`, como `registrar-venta.spec.ts`. Usa un `CLOCK` fijo en 2026-11-20 12:00:00.

**Datos de partida** (créalos con `RegistrarVenta` o con inserciones directas que respeten los CHECK): la clienta **Ana** con **F1** del 2026-11-01 10:00:00 (total $30.000, costo $20.000, pagado $0, Pendiente) y **F2** del 2026-11-10 10:00:00 (total $15.000, costo $10.000, pagado $5.000 de abono inicial, Parcial); **Beto** sin compras; y el Mostrador.

Cada prueba verifica **todos** los efectos observables: las filas de `ventas` (`monto_pagado`, `saldo_pendiente`, `estado_pago`), la fila de `abonos` (`tipo_abono`, `monto_total_abonado`, `medio_pago`, `fecha_abono`), las de `abonos_detalle_facturas` (`monto_aplicado`, `capital_aplicado`, `ganancia_aplicada`) y la fila `COBRO` de `movimientos_dinero` (`delta_bolsillo`, `delta_capital`, `delta_ganancia`, `medio`, `id_abono`). En los rechazos, verifica que **no** cambió ninguna de esas tablas. Los criterios de aceptación que siguen dicen qué se exige.
