# Tarea B3B.1 — Inventario, compra y aporte

**Etapa 3B, ola 3.** Eres el único bloque de esta ola. Antes de empezar, lee completos `CLAUDE.md` (raíz del repositorio; reglas 1 a 12), `planificacion/comun/diseno.md`, `planificacion/comun/modelo-contable.md` (R-13 y R-17) y `planificacion/etapas/3b-rediseno-visual/PLAN.md` hasta la sección `## Log`. Tu bloque es **B3B.1**; si esta tarea y el plan no coinciden, manda el plan y lo informas.

Esta etapa cambia cómo se ve la app y, en este bloque, aplica dos reglas que faltaban (R-13 y R-17). Fuera de eso, no cambies la conducta, los `data-testid` ni las reglas de calidad que ya se cumplen (vista previa con id de petición, guarda `guardando`, modal que no se cierra mientras guarda, cuatro estados de carga). La app es *zoneless*: lo que la plantilla muestra y cambia después de un `await` es una **signal**.

## Specs que cubres

S6, S7, S8; decisiones D5 y D6; ejemplos E2, E3, E4, E5, E7, E8, E9 y E10. Lee su texto en el plan.

## Rutas permitidas

```
src/app/inventario/ui/**
src/app/finanzas/ui/aporte.modal.ts
src/app/finanzas/ui/aporte.modal.spec.ts
src/app/inventario/application/registrar-compra.ts
src/app/inventario/application/registrar-compra.spec.ts
src/app/finanzas/application/registrar-aporte.ts
src/app/finanzas/application/registrar-aporte.spec.ts
e2e/inventario.spec.ts
e2e/inventario.acceptance.spec.ts
```

Prohibido todo lo demás.

## Lo que ya existe y debes reutilizar

- El tema y los estilos compartidos de B3B.0 (`src/theme/variables.scss`, `src/app/shared/ui/estilos/`). **No repitas hexadecimales** que ya son variables.
- **La hoja de fecha de D5** (`src/app/shared/ui/hoja-fecha.component.ts`), que dejó B3B.2 y ya usa Vender (mira cómo la abre `src/app/ventas/ui/vender.page.ts`). Úsala tal cual; no la modifiques. Su API, según B3B.2:
  - entradas: `titulo: string` (por defecto `'Fecha'`), `valor: FechaHora` (requerida), `maximo: FechaHora` (requerida, del `CLOCK`), `ayuda: string` (por defecto `'No puede ser una fecha futura.'`) y `datetimeTestId: string` (por defecto `'datetime-fecha'`);
  - salidas: `fechaChange: FechaHora` (solo emite fechas válidas `<= maximo`) y `cerrar: void` (al tocar **Listo**);
  - se abre dentro de un `ion-modal` en hoja (clase `modal-sheet`), como en Vender.
- El código `FECHA_FUTURA` y su texto "La fecha no puede ser futura" (ya cambiado por el coordinador) y `MONTO_INVALIDO` "El monto debe ser un número entero mayor a cero", en `mensajes-error.ts`.
- `CampoPesosComponent`, `formatearPesos`, `formulario.ts`, el `CLOCK` (cómo lo usa `ventas/domain/venta.ts` y `ventas/application/registrar-venta.ts` para rechazar `FECHA_FUTURA`).

## Mockups

En `planificacion/diseno/mockups/`: `Inventario.dc.html`, `InventarioFab.dc.html`, `InventarioEstados.dc.html`, `ModalCompra.dc.html`, `ModalCompraEstados.dc.html`, `ModalAporte.dc.html`, `ModalAporteEstados.dc.html` y `ModalFecha.dc.html`. Son HTML con estilos en línea: léelos, no los abras en el navegador. Solo componentes de Ionic (S2).

## Especificación

1. **Inventario (`inventario.page.ts`)** según `Inventario.dc.html`, `InventarioFab.dc.html` e `InventarioEstados.dc.html`: segmento Carta / Oficio, tarjetas de lote con la barra de stock celeste (`resmas_disponibles / resmas_iniciales`, regla 7 de `diseno.md`), botón flotante lima con sus dos acciones y los estados.
2. **Compra (`nueva-compra.modal.ts`)** según `ModalCompra.dc.html` y `ModalCompraEstados.dc.html`, como hoja:
   - **E2:** tipo de papel y medio de pago pasan de `ion-select` a `ion-segment`. Los `data-testid` `select-tipo-papel` y `select-medio` pasan a nombrar el segmento; cada botón del segmento lleva su propio `data-testid` (por ejemplo `segment-papel-carta`, `segment-medio-efectivo`), y los anotas en el reporte;
   - **E7, D5:** la fecha usa la hoja de fecha compartida con máximo = ahora del `CLOCK`; el `data-testid` `input-fecha` queda en el selector que la abre;
   - **E3:** con una fecha futura, el mensaje exacto de `FECHA_FUTURA` junto a la fecha y **Guardar** deshabilitado.
3. **Aporte (`aporte.modal.ts`)** según `ModalAporte.dc.html` y `ModalAporteEstados.dc.html`, como hoja, con los mismos cambios de medio de pago y fecha (E2, E7) y:
   - **E4:** fecha futura, igual que E3;
   - **E5 (R-17):** con monto $0, **Guardar** deshabilitado y junto al campo el texto exacto de `MONTO_INVALIDO`. Hoy `aporte.modal.ts:119` solo revisa que no esté vacío.
4. **D6:** `RegistrarCompra` y `RegistrarAporte` rechazan una fecha posterior a la del `CLOCK` con `FECHA_FUTURA`, antes de escribir nada, igual que la venta.
5. **E8:** en `e2e/inventario.acceptance.spec.ts`, reemplaza el ayudante del `ion-alert` (`seleccionarEnIonSelect`) por la elección del segmento. Lo que las pruebas verifican no cambia.

## Pruebas (primero RED)

- `registrar-compra.spec.ts` y `registrar-aporte.spec.ts`: con el `CLOCK` fijo, una fecha un segundo posterior se rechaza con `FECHA_FUTURA` y **no cambia ninguna tabla** (`lotes_cajas` y `movimientos_dinero`); una fecha igual a ahora se guarda.
- `nueva-compra.modal.spec.ts` y `aporte.modal.spec.ts`: E3, E4 y E5 con el texto exacto junto al campo y el botón deshabilitado; con valores válidos el botón se habilita.
- Las pruebas que ya existen siguen pasando **sin cambiar lo que verifican**, salvo cómo se elige el tipo y el medio.

## Verificación

Corre en primer plano y copia el resultado (con el número de pruebas):

```
npm run lint
npm run test:unit
npm run build
```

No corras `npm run test:e2e`: lo corre el coordinador.
