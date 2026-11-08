
---

# Tarea B1.1 — Reglas de cobro y cartera, y margen de venta

**Etapa 1 (Motor contable), ola 2.** Corres en paralelo con B1.2 (libro de dinero), que solo toca `src/app/finanzas/**`: no compartes archivos con ese bloque. La ola 1 ya dejó `ReglaNegocioError` en `src/app/shared/domain/` (reexportado desde `index.ts`); úsalo, no lo modifiques. El plan completo está en `planificacion/etapas/1-motor-contable/PLAN.md` (léelo hasta `## Log`); esta tarea copia la parte que te toca y manda sobre él si algo no coincide. Lee también `planificacion/comun/modelo-contable.md`, reglas R-01 a R-04.

## Specs que cubres

| ID | Requisito (cita textual) |
|----|--------------------------|
| S1 | "En toda venta cobrada de contado o mediante abonos parciales, el dinero que ingresa cubre primero el **Costo Base** de las resmas de esa factura (*Capital Recuperado*). Solo cuando el monto pagado en una factura supera su costo base de adquisición, el excedente se suma a la **Ganancia Libre Disponible**." (RN-03) |
| S2 | "En cada cobro o abono registrado, el sistema deberá asignar internamente el ingreso a cubrir primero el costo de compra de las resmas de la factura afectada (*Capital Recuperado*); todo monto cobrado que exceda dicho costo base se sumará a la bolsa de *Ganancia Libre Disponible*." (RF-16) |
| S3 | "El sistema deberá calcular el saldo total adeudado por cada cliente sumando los saldos pendientes de todas sus facturas en estado *Pendiente* o *Abonada Parcialmente*." (RF-11) |
| S4 | "Cuando un cliente realice un abono general a su deuda total indicando el monto y el medio de pago (Efectivo o Transferencia), el sistema deberá descontar el dinero empezando por la factura pendiente más antigua; si el abono cubre la totalidad de esa factura, la marcará como *Pagada* y aplicará el excedente sucesivamente a las siguientes facturas en orden cronológico ascendente." (RF-12) |
| S5 | "El sistema deberá permitir al usuario seleccionar una factura pendiente específica del cliente para aplicarle un abono parcial o pago total de manera aislada, sin afectar las demás facturas abiertas." (RF-13) |
| S6 | "El sistema deberá incluir una función rápida para saldar el 100% de la deuda acumulada de un cliente, cerrando todas sus facturas pendientes y registrando el ingreso por el medio de pago seleccionado (Efectivo o Transferencia)." (RF-14) |
| S12 | "Avisar al fijar el precio y mostrar la **pérdida** en el dashboard." (A4; aquí solo el cálculo, el aviso visual es de la Etapa 3) |

### Ejemplos de aceptación (cada uno es una prueba, con estos números exactos)

| ID | Situación | Resultado esperado |
|----|-----------|--------------------|
| E1 | Caja de $120.000 → costo por resma $12.000. Venta a Ana de 3 resmas a $15.000: total $45.000, costo base $36.000. Abono de $20.000. | capital $20.000, ganancia $0 |
| E2 | La misma factura, abono siguiente de $25.000. | capital $16.000, ganancia $9.000; la factura queda pagada |
| E3 | Ana debe la factura A (más vieja, saldo $10.000) y la B (saldo $30.000). Abono general de $25.000. | A recibe $10.000 y queda pagada; B recibe $15.000 y queda parcial |
| E4 | Abono general de $50.000 con una deuda total de $40.000. | Se rechaza por superar la deuda (`MONTO_SUPERA_DEUDA`) |
| E8 | Venta de 2 resmas a $10.000 cuando el costo es $12.000. | bajo costo: sí; pérdida $4.000 |

## Rutas permitidas

```
src/app/cartera/domain/**
src/app/ventas/domain/**
```

Prohibido todo lo demás, incluidos `src/app/shared/**` y `src/app/finanzas/**`. No instales dependencias.

## Qué hacer

Todo como **funciones puras** sobre `Pesos` (de `src/app/shared/domain`): reciben datos y devuelven resultados nuevos, sin mutar la entrada, sin Angular, sin SQLite y sin leer la fecha del sistema. Los rechazos lanzan `ReglaNegocioError` con su `codigo` (el mensaje en inglés; los textos en español los ponen las pantallas).

- **`cartera/domain/factura.ts`:** `FacturaAbierta { idVenta: number; fecha: FechaHora; total: Pesos; costoBase: Pesos; pagado: Pesos }` y `saldo(f) = total − pagado`.
- **`cartera/domain/reparto-pago.ts`**, regla R-01: `repartirPago(f, monto) → { capital, ganancia }`, con `capital = min(pagado + m, costo) − min(pagado, costo)` y `ganancia = m − capital`. Rechaza `monto <= 0` (`MONTO_INVALIDO`) y `monto > saldo` (`MONTO_SUPERA_SALDO_FACTURA`).
- **`cartera/domain/deuda.ts`:** `deudaTotal(facturas)` es la suma de los saldos mayores que cero (S3).
- **`cartera/domain/abonos.ts`:**
  - `distribuirCascada(facturas, monto)` → lista de `AplicacionAbono { idVenta, monto, capital, ganancia, quedaPagada }`, en orden `fecha` ascendente y, si empatan, `idVenta` ascendente (S4). Solo incluye facturas que reciben dinero. Rechaza `monto <= 0` (`MONTO_INVALIDO`), `SIN_DEUDA` si la deuda total es 0 y `MONTO_SUPERA_DEUDA` si el monto supera la deuda total.
  - `abonarFactura(f, monto)` → una `AplicacionAbono` sobre esa sola factura (S5). Rechaza `MONTO_INVALIDO`, `SIN_DEUDA` si su saldo es 0 y `MONTO_SUPERA_SALDO_FACTURA`.
  - `liquidarTodo(facturas)` es la cascada por el 100 % de la deuda (S6): todas las facturas con saldo quedan pagadas. Rechaza `SIN_DEUDA` si no hay nada que cobrar.
  - Reutiliza `repartirPago` y `saldo` en las tres; no reimplementes el reparto con otra forma.
- **`ventas/domain/margen.ts`:** `evaluarLinea(cantidad, costoUnitario, precioUnitario) → { subtotalVenta, subtotalCosto, margen, bajoCosto }` (`margen = subtotalVenta − subtotalCosto`, `bajoCosto = precioUnitario < costoUnitario`) y `perdida(totalVenta, costoBase) = max(0, costoBase − totalVenta)` (S12). `cantidad` es `Resmas` (de `shared/domain`).

## Pruebas (primero RED, después GREEN)

- E1, E2, E3, E4 y E8 tal cual, con sus números.
- Una por regla:
  - el desempate por `idVenta` cuando dos facturas tienen la misma fecha;
  - una venta bajo costo (total < costo base) donde todo el pago es capital y la ganancia es 0;
  - `abonarFactura` no toca las otras facturas (las entradas no se mutan y el resultado solo trae esa factura);
  - `liquidarTodo` con 3 facturas: cada una recibe exactamente su saldo y todas quedan pagadas, y la suma de capital + ganancia es la deuda total;
  - cada rechazo con su código: `MONTO_INVALIDO` (0 y negativo), `MONTO_SUPERA_SALDO_FACTURA`, `MONTO_SUPERA_DEUDA` y `SIN_DEUDA`;
  - `deudaTotal` ignora las facturas con saldo 0.
- En cada `AplicacionAbono`, `capital + ganancia = monto`.

## Verificación

```
npm run lint
npm run test:unit
```

Copia el resultado de cada uno. **No corras `npm run build`**: como B1.2 corre al mismo tiempo, los dos escribirían en `www/`; el coordinador compila al cerrar la ola (esto reemplaza la lista de verificación del contexto base). Si `lint` o `test:unit` fallan solo por archivos de `src/app/finanzas/**`, no los toques; infórmalo con el nombre del archivo y el error.
