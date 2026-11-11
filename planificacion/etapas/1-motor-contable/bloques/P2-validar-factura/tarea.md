# Tarea P2 — Validar la factura en `saldo()` y `repartirPago()`

**Cierre de pendientes de la Etapa 1, ola 1.** Trabajas en paralelo con P1, que toca otros archivos. Resuelves el pendiente `V1-dominio-factura` de `planificacion/etapas/1-motor-contable/PLAN.md` ("Pendientes para la Etapa 2"). Esta tarea manda sobre el plan si algo no coincide.

## Spec que cubres

| ID | Requisito |
|----|-----------|
| P2 | "Asumen `total >= pagado >= 0` y `costoBase >= 0`, que hoy garantizan los CHECK de `ventas`." Decisión aprobada: `saldo()` y `repartirPago()` validan `0 <= pagado <= total` y `costoBase >= 0`. Si no se cumple, lanzan `ReglaNegocioError` con el código `'FACTURA_INVALIDA'`, que se agrega a la unión `CodigoRegla` de `shared/domain/regla-negocio.error.ts`. Pruebas con los valores límite. |

## Rutas permitidas

```
src/app/shared/domain/regla-negocio.error.ts
src/app/shared/domain/regla-negocio.error.spec.ts
src/app/cartera/domain/factura.ts
src/app/cartera/domain/factura.spec.ts
src/app/cartera/domain/reparto-pago.ts
src/app/cartera/domain/reparto-pago.spec.ts
```

Prohibido todo lo demás.

## Qué hacer

1. **`regla-negocio.error.ts`:** agrega a `CodigoRegla` la línea `| 'FACTURA_INVALIDA' // invoice data out of domain: paid < 0, paid > total or cost base < 0`. No cambies los códigos que ya existen ni la clase.
2. **`factura.ts`:** crea y exporta `validarFactura(f: FacturaAbierta): void`, que lanza `ReglaNegocioError('FACTURA_INVALIDA', <mensaje en inglés con los valores>)` cuando:
   - `f.pagado < 0`, o
   - `f.pagado > f.total`, o
   - `f.costoBase < 0`.

   `saldo()` llama a `validarFactura(f)` antes de calcular. `costoBase > total` **sí** es válido, porque es una venta por debajo del costo (A4): no lo rechaces.
3. **`reparto-pago.ts`:** `repartirPago()` llama a `validarFactura(f)` como **primera** instrucción, antes de validar `monto`. El resto de la lógica no cambia.
4. No hace falta exportar `validarFactura` desde `cartera/domain/index.ts`; si lo exportas, sería fuera de tus rutas, así que no lo hagas.

## Pruebas (primero RED, después GREEN)

Sigue la regla 6 de las reglas de trabajo: cada rechazo se acota con `toThrow(expect.objectContaining({ codigo: 'FACTURA_INVALIDA' }))`.

| Archivo | Casos |
|---------|-------|
| `factura.spec.ts` | `saldo()` con valores límite válidos: `pagado = 0` y `pagado = total` devuelven `total` y `0`, y `costoBase = 0` funciona. Rechazos con `FACTURA_INVALIDA`: `pagado = -1`, `pagado = total + 1` y `costoBase = -1`. |
| `reparto-pago.spec.ts` | `repartirPago()` rechaza con `FACTURA_INVALIDA` los mismos tres casos: `pagado = -1`, `pagado = total + 1` y `costoBase = -1`. Una factura inválida con `monto = 0` da `FACTURA_INVALIDA` y no `MONTO_INVALIDO`, porque la factura se valida primero. Con `costoBase = 0` todo el monto va a ganancia: por ejemplo, total 10000, pagado 0 y monto 4000 dan capital 0 y ganancia 4000. |
| `regla-negocio.error.spec.ts` | Solo si ese archivo recorre la lista de códigos: agrega `FACTURA_INVALIDA`. Si no la recorre, no lo toques. |

Las pruebas que ya existen (E1, E2, venta bajo costo, `MONTO_INVALIDO`, `MONTO_SUPERA_SALDO_FACTURA` y las de `abonos.spec.ts` y `deuda.spec.ts`) tienen que seguir pasando sin cambios.

## Fuera de alcance

- No cambies `abonos.ts` ni `deuda.ts`: ya reciben la validación porque llaman a `saldo()` y `repartirPago()`.
- No toques el esquema ni los CHECK de `ventas`.

## Verificación

```
npm run lint
npm run test:unit
npm run build
```

Copia el resultado de cada uno, junto con el número de pruebas que pasan.
