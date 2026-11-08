# Modelo contable y de datos (v1)

Reglas contables del sistema, ya corregidas con las decisiones A1–A7 aprobadas el 2026-11-08. Reemplazan las secciones 4.7 y 4.8 del documento maestro (`../especificaci_n_y_dise_o_del_sistema.md`) y ajustan las tablas de la sección 4.

> **DDL canónico:** [`../etapas/0-fundaciones/revision/schema-v1.ts`](../etapas/0-fundaciones/revision/schema-v1.ts), validado con [`schema-v1.spec.ts`](../etapas/0-fundaciones/revision/schema-v1.spec.ts) (6 pruebas en verde con sql.js dentro de `ng test`). La Etapa 0 lo convierte en la migración `001`.

## 1. Idea central

Todo movimiento de dinero queda en **un único libro**, la tabla `movimientos_dinero`. Cada fila dice cuánto cambia un bolsillo (Efectivo o Transferencia) y cómo se reparte ese cambio entre **capital** y **ganancia**. Los saldos del dashboard son sumas de ese libro, así que no se guardan totales que puedan descuadrarse.

**Invariante (A1):** `Efectivo + Transferencia = Capital en caja + Ganancia libre`. Se cumple por construcción: cada fila reparte su delta completo entre capital y ganancia, y los traspasos van en pares que se anulan entre sí.

## 2. Tablas (7)

| Tabla | Cambio respecto del documento maestro |
|-------|---------------------------------------|
| `clientes` | + `es_mostrador`: un único cliente "Mostrador" para ventas de contado rápidas. |
| `lotes_cajas` | Un lote por compra de N cajas (A6). `costo_por_caja` debe ser divisible por 10. Sin `CAPITAL_EXTERNO` (A2). `estado` debe ser `AGOTADO` si y solo si quedan 0 resmas. |
| `ventas` | CHECK de consistencia: `saldo_pendiente = total_venta - monto_pagado`, sin sobrepagos, y `estado_pago` coherente con lo pagado. |
| `detalle_ventas` | Sin `ON DELETE CASCADE` (A7: nada se borra). Los subtotales se verifican con CHECK. |
| `abonos` | + tipo `ABONO_INICIAL`. |
| `abonos_detalle_facturas` | + `capital_aplicado` y `ganancia_aplicada`, que deben sumar `monto_aplicado` (A5). |
| `movimientos_dinero` | **Reemplaza** a `retiros_y_movimientos`. Es el libro único de dinero (A1). |

Todas las cantidades y montos son enteros (pesos colombianos) y se verifican con `typeof(...) = 'integer'` (RNF-04). Las fechas son texto `YYYY-MM-DD HH:MM:SS` en hora local.

## 3. Tipos de movimiento

| Tipo | Bolsillo | Capital | Ganancia | Referencia |
|------|----------|---------|----------|------------|
| `APORTE_CAPITAL` (A2) | + monto | + monto | 0 | — |
| `COMPRA_LOTE` | − costo total | − parte cubierta por el capital en caja | − el resto (reinversión, A3) | `id_lote` |
| `COBRO` | + monto del abono | + Σ `capital_aplicado` | + Σ `ganancia_aplicada` | `id_abono` |
| `RETIRO_GANANCIA` | − monto | 0 | − monto | — |
| `TRASPASO_SALIDA` | − monto | 0 | 0 | — |
| `TRASPASO_ENTRADA` | + monto | 0 | 0 | `id_movimiento_origen`, que apunta a la salida |

## 4. Reglas

| ID | Regla | Origen |
|----|-------|--------|
| R-01 | **Reparto de un pago a una factura:** `capital_aplicado = min(pagado + m, costo) − min(pagado, costo)` y `ganancia_aplicada = m − capital_aplicado`, donde `pagado` es lo pagado antes y `m` el monto aplicado. | RN-03, RF-16 |
| R-02 | **Cascada:** se recorren las facturas con saldo del cliente en orden `fecha_venta ASC, id_venta ASC`, y cada una recibe hasta su saldo. El monto no puede superar la deuda total. | RF-12 |
| R-03 | **Abono individual:** el monto no puede superar el saldo de esa factura. | RF-13 |
| R-04 | **Liquidación total:** equivale a una cascada por el 100 % de la deuda. | RF-14 |
| R-05 | **Compra de lote:** primero consume el capital en caja; si no alcanza, el resto descuenta la ganancia libre como reinversión y la interfaz lo avisa. El bolsillo elegido debe tener saldo para el costo total. | A3, RN-04 |
| R-06 | **Retiro:** el monto debe ser ≤ ganancia libre y ≤ saldo del bolsillo. | RF-17 |
| R-07 | **Traspaso:** el monto debe ser ≤ saldo del bolsillo de origen; se registran salida y entrada en la misma transacción. | RF-20 |
| R-08 | **Ningún bolsillo queda negativo** después de una operación. | RN-04 |
| R-09 | **Mostrador:** sus ventas son siempre de contado; no puede quedar debiendo. | B (cliente Mostrador) |
| R-10 | **Venta bajo costo:** se permite, con aviso al fijar el precio; la pérdida se calcula y se muestra. | A4 |
| R-11 | **Operación compuesta = una transacción:** si algo falla, no queda nada escrito. | RNF-03 |
| R-12 | **Nada se borra:** los errores se corrigen anulando con un movimiento inverso (Etapa 6, migración v2). | A7 |

## 5. Métricas del dashboard (RF-21)

| Métrica | Cálculo |
|---------|---------|
| Capital en inventario | Σ `resmas_disponibles × costo_unitario_resma` de los lotes activos |
| Capital en caja | Σ `delta_capital` del libro. Reemplaza a "Capital Recuperado en Caja" (A1). |
| Cuentas por cobrar | Σ `saldo_pendiente`. Por factura, el capital por recuperar es `min(costo, total) − min(pagado, costo)` y el resto es ganancia futura. |
| Ganancia histórica | Σ `delta_ganancia` de los `COBRO`, total y por mes según `fecha_movimiento` (A5). |
| Ganancia retirada | −Σ `delta_ganancia` de los `RETIRO_GANANCIA` |
| Ganancia reinvertida | −Σ `delta_ganancia` de los `COMPRA_LOTE` (A3) |
| Ganancia libre | Σ `delta_ganancia` del libro |
| Pérdida por ventas bajo costo | Σ `max(0, costo_total_base − total_venta)` (A4) |
| Arqueo | Σ `delta_bolsillo` por `medio` |
