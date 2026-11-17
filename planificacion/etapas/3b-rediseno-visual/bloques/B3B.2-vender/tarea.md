# Tarea B3B.2 — Vender, selector de clientes, fecha y resumen

**Etapa 3B, ola 2.** Trabajas en paralelo con B3B.3 (Clientes), que toca otras rutas. Antes de empezar, lee completos `CLAUDE.md` (raíz del repositorio; reglas 1 a 12), `planificacion/comun/diseno.md` y `planificacion/etapas/3b-rediseno-visual/PLAN.md` hasta la sección `## Log`. Tu bloque es **B3B.2**; si esta tarea y el plan no coinciden, manda el plan y lo informas.

Esta etapa **no agrega funciones**: cambia cómo se ve la app. No cambies la conducta, los casos de uso, los `data-testid` ni las reglas de calidad que ya se cumplen (guarda `guardando`, modal que no se cierra mientras guarda, vista bloqueada, cuatro estados de carga). La app es *zoneless*: lo que la plantilla muestra y cambia después de un `await` es una **signal**.

## Specs que cubres

S9 (defecto L16 de la Etapa 3), D5 (hoja de fecha compartida); ejemplos E6, E8, E9 y E10. Lee su texto en el plan.

## Rutas permitidas

```
src/app/ventas/ui/**
src/app/shared/ui/hoja-fecha.component.ts        (nuevo)
src/app/shared/ui/hoja-fecha.component.spec.ts   (nuevo)
e2e/vender.spec.ts
e2e/etapa-3.acceptance.spec.ts                   (solo selectores, si un cambio de estructura lo exige)
```

Prohibido todo lo demás.

## Lo que ya existe y debes reutilizar

- El tema, la fuente y los estilos compartidos de B3B.0: variables `--ion-color-*` y `--app-*` en `src/theme/variables.scss`, y clases y reglas globales en `src/app/shared/ui/estilos/` (`.app-tarjeta`, `ion-segment`, campos con contorno, hoja de modal, botones, `.app-estado-vacio`, `.app-estado-error`). **Úsalos; no repitas hexadecimales** que ya son variables.
- `CampoPesosComponent`, `formatearPesos`, `mensajes-error.ts`, `formulario.ts` (`soloCierreExplicito`, `esVacio`), `venta-ui.helpers.ts`.

## Mockups (fuente de estructura, textos, medidas y colores)

En `planificacion/diseno/mockups/`: `Vender.dc.html`, `VenderEstados.dc.html`, `ModalCliente.dc.html`, `ModalClienteEstados.dc.html`, `ModalNuevoCliente.dc.html` (solo como referencia; el modal de cliente es de B3B.3), `ModalFecha.dc.html`, `ModalResumen.dc.html` y `ModalResumenEstados.dc.html`. Son HTML con estilos en línea: léelos, no los abras en el navegador. Solo componentes de Ionic (S2).

## Especificación

1. **Vender (`vender.page.ts`)** según `Vender.dc.html`: título grande "Vender" con subtítulo, campos **Cliente** y **Fecha de la venta** como selectores con contorno e ícono celeste, "Lotes disponibles" en una tarjeta con filas y botón circular lima para agregar ("Agregado" con check celeste si ya está), "Detalle de venta" con cantidad y precio en dos columnas, subtotal y ganancia en verde, tarjeta de cierre con Total, Costo y Ganancia, segmentos de forma y medio de pago, abono inicial y "Queda debiendo", y el botón lima **Confirmar venta · $ total** abajo. Los estados de los campos según `VenderEstados.dc.html` (error rojo, aviso de bajo costo en ámbar).
2. **Selector de clientes** (`selector-cliente-contenido.component.ts` y el `ion-modal` que lo abre) según `ModalCliente.dc.html` y `ModalClienteEstados.dc.html`, como hoja. **Corrige L16 (E6):** todas las filas tienen la misma altura; la fila del Mostrador muestra un ícono de tienda y la segunda línea "Venta rápida · solo contado"; las demás muestran avatar con iniciales y el celular. Investiga también la hipótesis del plan (falta la clase `ion-page` en el contenido del `ion-modal` en línea) y corrígela si es parte de la causa; explica en el reporte qué causaba el defecto.
3. **D5, hoja de fecha compartida:** extrae el `ion-datetime` de día y hora que hoy vive en `vender.page.ts` a `src/app/shared/ui/hoja-fecha.component.ts`, según `ModalFecha.dc.html`. Recibe el valor actual y el máximo (ahora, del `CLOCK`), no deja elegir una fecha futura, y devuelve la fecha elegida. Vender la usa. **B3B.1 la va a usar para la compra y el aporte**: dale una API simple y documéntala en el reporte.
4. **Resumen (`resumen-venta.modal.ts`)** según `ModalResumen.dc.html` y `ModalResumenEstados.dc.html`: hoja, datos, lista de productos, total grande, pago, "Queda debiendo", **Aceptar** lima y **Volver a editar** celeste con borde. Mantén la guarda, el bloqueo y los textos actuales.
5. Mantén **todos** los `data-testid` que usan los e2e (lista en el L2 del plan).

## Pruebas (primero RED)

- **E6:** en `e2e/vender.spec.ts`, abre el selector con el Mostrador y al menos dos clientes con teléfono, y comprueba con `boundingBox()` que todas las filas `item-cliente-vender` tienen la misma altura (con 1px de tolerancia), y que la del Mostrador contiene "Venta rápida · solo contado". Escribe esta prueba **antes** de corregir y confirma que falla.
- `hoja-fecha.component.spec.ts`: el máximo impide fechas futuras y devuelve la fecha elegida.
- Las pruebas unitarias y e2e que ya existen siguen pasando **sin cambiar lo que verifican** (E8). Si alguna cambia solo por estructura, explícalo en el reporte.

## Verificación

Corre en primer plano y copia el resultado (con el número de pruebas):

```
npm run lint
npm run test:unit
```

**No corras `npm run build` ni `npm run test:e2e`:** otro bloque trabaja en paralelo y comparte `www/`; los corre el coordinador al terminar la ola. Deja el e2e de E6 escrito y explica cómo lo verificaste.
