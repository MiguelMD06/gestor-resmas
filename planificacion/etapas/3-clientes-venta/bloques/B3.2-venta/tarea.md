# Tarea B3.2 — Venta: dominio, repositorios y caso de uso

**Etapa 3, ola 1.** Trabajas en paralelo con B3.1 (clientes) y B3.4 (campo de pesos), que tocan otras rutas. Antes de empezar, lee completos `CLAUDE.md` (raíz del repositorio; sus reglas 1 a 12 son obligatorias), `planificacion/comun/modelo-contable.md` y `planificacion/etapas/3-clientes-venta/PLAN.md` hasta la sección `## Log`. Tu bloque es **B3.2**; si esta tarea y el plan no coinciden, manda el plan y lo informas.

## Specs que cubres

S2, S3, S4, S5, S8, S9, S10, S11 y S12; ejemplos E6 a E14, E16, E17 y E20; decisiones D2, D3, D4, D5, D6, D13 y D14. Lee su texto en el plan. Las cifras de los ejemplos son exactas: úsalas tal cual.

## Rutas permitidas

```
src/app/ventas/domain/**
src/app/ventas/infrastructure/**
src/app/ventas/application/**
src/app/ventas/index.ts
src/app/cartera/infrastructure/**
src/app/cartera/index.ts
```

Prohibido todo lo demás, incluidos `src/app/ventas/ui/**` (ola 2), `src/app/clientes/**` (B3.1) y `lotes_cajas` o `movimientos_dinero` fuera de sus repositorios. Si te falta algo de `LoteRepository`, detente y explícalo en el reporte.

## Lo que ya existe y debes reutilizar (no lo reimplementes)

- **`evaluarLinea(cantidad, costoUnitario, precioUnitario) → { subtotalVenta, subtotalCosto, margen, bajoCosto }`** y `perdida(totalVenta, costoBase)` en `src/app/ventas/domain/margen.ts`.
- **`repartirPago(factura: FacturaAbierta, monto) → { capital, ganancia }`** en `src/app/cartera/domain/reparto-pago.ts` (R-01). `FacturaAbierta { idVenta, fecha, total, costoBase, pagado }`.
- **`cobro(fecha, medio, capital, ganancia, idAbono) → Movimiento`** en `src/app/finanzas/domain/operaciones.ts` y **`LibroRepository.registrar(tx, movimiento)`**. Es la única forma de escribir en `movimientos_dinero`.
- **`LoteRepository.porId(db, idLote) → Lote | null`** y **`LoteRepository.descontar(tx, idLote, cantidad) → Lote`** (aplica `descontarResmas`: pasa a `AGOTADO` en 0 y lanza `STOCK_INSUFICIENTE`). Es la única forma de cambiar `lotes_cajas`.
- **Transacciones:** `SQL_DATABASE`, `db.transaction(async (tx) => …)`. Patrón: `src/app/inventario/application/registrar-compra.ts`.
- **Reloj:** token `CLOCK`; `ahora` sale de ahí.
- **Tipos:** `Pesos`, `pesos`, `Resmas`, `resmasPositivas`, `MedioPago`, `FechaHora`, `fechaHora` en `src/app/shared/domain/`.
- **Códigos** (ya existen): `VENTA_SIN_LINEAS`, `LOTE_REPETIDO`, `CANTIDAD_RESMAS_INVALIDA`, `PRECIO_INVALIDO`, `STOCK_INSUFICIENTE`, `ABONO_INICIAL_INVALIDO`, `MOSTRADOR_SOLO_CONTADO`, `CLIENTE_INEXISTENTE`, `FECHA_FUTURA`.
- **Esquema** (migración `001`, no lo cambies): `ventas` (con CHECK de `saldo_pendiente = total_venta - monto_pagado` y de `estado_pago` `PAGADA`/`PARCIAL`/`PENDIENTE`), `detalle_ventas` (con CHECK de subtotales), `abonos` (`tipo_abono` `PAGO_CONTADO` o `ABONO_INICIAL` en esta etapa), `abonos_detalle_facturas` (`capital_aplicado + ganancia_aplicada = monto_aplicado`).

## Especificación

1. **`ventas/domain/venta.ts`**: `armarVenta({ idCliente, esMostrador, fecha, ahora, lineas, pago })`, función pura.
   - `lineas: { idLote, costoUnitario, disponibles, cantidad, precioUnitario }[]`. Rechaza, en este orden: `VENTA_SIN_LINEAS` (lista vacía); `LOTE_REPETIDO` (mismo `idLote` dos veces, D5); `CANTIDAD_RESMAS_INVALIDA` (cantidad no entera o ≤ 0); `PRECIO_INVALIDO` (precio no entero o ≤ 0; cualquier entero > 0 vale, D14); `STOCK_INSUFICIENTE` (cantidad > disponibles).
   - `fecha > ahora` → `FECHA_FUTURA` (D6). Las fechas son `FechaHora` (`YYYY-MM-DD HH:MM:SS`, comparables como texto).
   - `pago`: `{ modalidad: 'CONTADO', medio }` cobra el total; `{ modalidad: 'FIADO' }` no cobra nada; `{ modalidad: 'ABONO_INICIAL', monto, medio }` exige `1 ≤ monto ≤ total − 1` (`ABONO_INICIAL_INVALIDO`). Con `esMostrador`, todo lo que no sea `CONTADO` → `MOSTRADOR_SOLO_CONTADO`.
   - Devuelve `{ totalVenta, costoTotalBase, montoPagado, saldoPendiente, estadoPago, lineas (cada una con su evaluarLinea), cobro }`, donde `cobro` es `null` en fiado o `{ tipoAbono: 'PAGO_CONTADO' | 'ABONO_INICIAL', monto, medio, capital, ganancia }`, con capital y ganancia de `repartirPago` sobre la factura nueva (pagado 0).
2. **`ventas/infrastructure/venta.repository.ts`**: `insertar(tx, venta, idCliente, fecha) → idVenta`, con sus líneas en `detalle_ventas`; y `esMostrador(db, idCliente) → boolean | null` (`null` si el cliente no existe), con una consulta a `clientes`. No escribas en `clientes`.
3. **`cartera/infrastructure/abono.repository.ts`**: `insertar(tx, { idCliente, fecha, monto, medio, tipo, aplicaciones: { idVenta, monto, capital, ganancia }[] }) → idAbono`. Exporta `AbonoRepository` desde `cartera/index.ts` (créalo si no existe, exportando también `domain`).
4. **`ventas/application/registrar-venta.ts`**: `RegistrarVenta.registrar({ idCliente, fecha, lineas: { idLote, cantidad, precioUnitario }[], pago }) → { idVenta }`, en **una** transacción y en este orden (D4): `esMostrador` (`CLIENTE_INEXISTENTE` si no existe); `porId` de cada lote dentro de la transacción (un lote inexistente o `AGOTADO` → `STOCK_INSUFICIENTE`); `armarVenta` con `ahora` del `CLOCK`; `descontar` cada línea; `VentaRepository.insertar`; si hay `cobro`, `AbonoRepository.insertar` con su aplicación a la venta y `LibroRepository.registrar(tx, cobro(fecha, medio, capital, ganancia, idAbono))`. Venta, abono y movimiento usan la misma `fecha` (D6). Si algo falla, no queda nada escrito.

## Pruebas (primero RED)

Con `SqlJsDatabase.create()` + `migrar(db, MIGRACIONES)`, el estado de partida del plan (aporte de $400.000 en efectivo con `RegistrarAporte`, lote A Carta 2 cajas a $120.000 y lote B Carta 1 caja a $130.000 con `RegistrarCompra`, ambos en efectivo) y a Ana insertada en `clientes` con un `INSERT` directo en el arreglo de la prueba (B3.1 escribe `ClienteRepository` en paralelo; no lo uses):

- E6, E7, E8, E9, E10, E11, E12, E13, E14, E16, E17 y E20, con todos los efectos que nombra el plan: filas de `ventas`, `detalle_ventas`, `abonos`, `abonos_detalle_facturas` y `movimientos_dinero`, `resmas_disponibles` y `estado` de los lotes, y saldos con `LibroRepository.saldos`.
- E12 deja las 5 tablas exactamente como estaban (compara el contenido antes y después).
- Un fallo forzado después de descontar el primer lote de una venta multilote no deja nada escrito.
- E17: dos `registrar` concurrentes de la misma venta de las 20 resmas del lote A → una se guarda y la otra se rechaza con `STOCK_INSUFICIENTE`; queda una sola venta y un solo movimiento.
- Después de E6, E7 y E9, `verificarInvariante(saldos)` se cumple.
- Dominio: cada rechazo de `armarVenta` con su valor límite exacto (abono inicial de 1 y de total − 1 válidos; 0 y total, rechazados; fecha igual a `ahora` válida y un segundo después, rechazada).

## Verificación

Corre en primer plano y copia el resultado (con el número de pruebas):

```
npm run lint
npm run test:unit
```

**No corras `npm run build` ni `npm run test:e2e`:** otros dos bloques trabajan en paralelo y comparten `www/`; los corre el coordinador al terminar la ola. Indica qué prueba cubre cada `S#`, `E#` y `D#` de esta tarea.
