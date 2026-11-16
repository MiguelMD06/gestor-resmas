# Tarea B3.G — La venta no puede ser anterior a la compra de sus lotes

**Etapa 3, decisión L14.** Nadie más escribe en el árbol mientras trabajas. Antes de empezar, lee `CLAUDE.md` (raíz; reglas 1 a 12) y, en `planificacion/etapas/3-clientes-venta/PLAN.md`, **D6**, **D7**, **D13**, **D17**, **E20**, **E22** y la entrada **L14** del Log.

La app es *zoneless*: todo lo que la plantilla muestra y cambia después de un `await` debe ser una **signal**.

## Rutas permitidas

```
src/app/shared/domain/regla-negocio.error.ts
src/app/shared/domain/regla-negocio.error.spec.ts
src/app/shared/ui/mensajes-error.ts
src/app/shared/ui/mensajes-error.spec.ts
src/app/ventas/domain/venta.ts
src/app/ventas/domain/venta.spec.ts
src/app/ventas/application/registrar-venta.ts
src/app/ventas/application/registrar-venta.spec.ts
src/app/ventas/ui/**
```

Prohibido todo lo demás.

## Lo que ya existe

- `Lote.fechaCompra` (`FechaHora`, `YYYY-MM-DD HH:MM:SS`) en `src/app/inventario/domain/lote.ts`; `LoteRepository.porId` y `ConsultarInventario.activos()` ya lo devuelven.
- `armarVenta` valida `FECHA_FUTURA` con `fecha > ahora` comparando las `FechaHora` como texto; usa la misma comparación.

## Especificación

- **G1. Código y mensaje.** Agrega `VENTA_ANTERIOR_A_COMPRA` a `CodigoRegla` (comentario en inglés) y su texto "La venta no puede ser anterior a la compra del lote" a `MENSAJES_ERROR`, con su prueba de texto exacto.
- **G2. Dominio (`armarVenta`).** Cada línea de entrada trae también `fechaCompra` del lote. Si `fecha` es anterior a la `fechaCompra` más reciente de las líneas, rechaza con `VENTA_ANTERIOR_A_COMPRA`. Igual a esa fecha es válido. La validación va justo después de `FECHA_FUTURA`.
- **G3. Caso de uso (`RegistrarVenta`).** Pasa `lote.fechaCompra` de cada lote leído en la transacción. Un rechazo no deja nada escrito.
- **G4. Vender.** Con la fecha elegida (o la de ahora) anterior a la compra más reciente de los lotes agregados, se ve junto a la fecha "La venta no puede ser anterior a la compra del lote (dd/mm/aaaa)", con la fecha de esa compra (por ejemplo "(14/11/2026)"), y **Confirmar venta** queda deshabilitado. Al quitar ese lote o al corregir la fecha, el error desaparece y el botón se habilita si todo lo demás es válido. Saca el texto de `mensajes-error.ts` y le agrega la fecha entre paréntesis.

## Pruebas (primero RED)

- Dominio: E22 con sus valores límite exactos (un segundo antes de la compra, rechazado; igual a la compra, válido); en una venta multilote cuenta la compra más reciente.
- Caso de uso: E22 con `SqlJsDatabase` y las migraciones reales; el rechazo deja `ventas`, `detalle_ventas`, `abonos`, `abonos_detalle_facturas`, `movimientos_dinero` y `lotes_cajas` exactamente como estaban.
- Vender: el texto exacto junto a la fecha, el botón deshabilitado y su vuelta a habilitado al corregir la fecha o quitar el lote.
- `mensajes-error.spec.ts`: el texto exacto del código nuevo.
- Las pruebas que ya existen siguen pasando; si alguna arma líneas sin `fechaCompra`, agrégasela sin cambiar lo que verifica.

## Verificación

Corre en primer plano y copia el resultado (con el número de pruebas):

```
npm run lint
npm run test:unit
npm run build
npm run test:e2e
```

Indica qué prueba cubre G1 a G4 y E22.
