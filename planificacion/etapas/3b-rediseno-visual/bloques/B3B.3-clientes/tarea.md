# Tarea B3B.3 — Clientes y modal de cliente

**Etapa 3B, ola 2.** Trabajas en paralelo con B3B.2 (Vender), que toca otras rutas. Antes de empezar, lee completos `CLAUDE.md` (raíz del repositorio; reglas 1 a 12), `planificacion/comun/diseno.md` y `planificacion/etapas/3b-rediseno-visual/PLAN.md` hasta la sección `## Log`. Tu bloque es **B3B.3**; si esta tarea y el plan no coinciden, manda el plan y lo informas.

Esta etapa **no agrega funciones**: cambia cómo se ve la app. No cambies la conducta, los casos de uso, los `data-testid` ni las reglas de calidad que ya se cumplen (validación en vivo, guarda `guardando`, modal que no se cierra mientras guarda, cuatro estados de carga). La app es *zoneless*: lo que la plantilla muestra y cambia después de un `await` es una **signal**.

## Specs que cubres

D8; ejemplos E8, E9 y E10. Lee su texto en el plan.

## Rutas permitidas

```
src/app/clientes/ui/**
e2e/clientes.spec.ts
```

Prohibido todo lo demás.

## Lo que ya existe y debes reutilizar

- El tema, la fuente y los estilos compartidos de B3B.0: variables `--ion-color-*` y `--app-*` en `src/theme/variables.scss`, y clases y reglas globales en `src/app/shared/ui/estilos/` (`.app-tarjeta`, campos con contorno, hoja de modal, botones, `.app-estado-vacio`, `.app-estado-error`). **Úsalos; no repitas hexadecimales** que ya son variables.
- `mensajes-error.ts` y `formulario.ts`.

## Mockups

En `planificacion/diseno/mockups/`: `Clientes.dc.html`, `ClientesEstados.dc.html` y `ModalNuevoCliente.dc.html`. Son HTML con estilos en línea: léelos, no los abras en el navegador. Solo componentes de Ionic (S2).

## Especificación

1. **D8: solo lo que existe hoy.** El mockup de Clientes trae cosas de la Etapa 4 que **no** se implementan ahora: la tarjeta "Por cobrar", el filtro "Todos / Con deuda", la deuda o "Al día" de cada fila y el expediente. No los agregues, ni siquiera vacíos.
2. **Clientes (`clientes.page.ts`)** según `Clientes.dc.html`: título grande "Clientes" con el número de clientes como subtítulo, buscador con contorno e ícono, lista en una tarjeta con filas de 68px: avatar circular con las iniciales en celeste, nombre y celular (o "Sin celular"), y chevron. Botón flotante lima con `aria-label` "Nuevo cliente". Tocar una fila sigue abriendo el modal en modo edición.
3. **Estados** según `ClientesEstados.dc.html`, sección Directorio: cargando (filas de esqueleto), "Todavía no hay clientes", "No se encontraron clientes" y error con **Reintentar**. Usa solo los textos que ya existen; los textos marcados como propuestos en el mockup ("Agrega el primero con el botón +.") **no** se agregan.
4. **Modal de cliente (`cliente.modal.ts`)** según `ModalNuevoCliente.dc.html`, como hoja: título ("Nuevo cliente" o "Editar cliente"), **Cancelar** celeste arriba a la derecha, campos nombre y celular con contorno y el error junto al campo, y **Guardar cliente** lima.
5. Mantén **todos** los `data-testid` que usan los e2e (lista en el L2 del plan).

## Pruebas

- Las pruebas unitarias y e2e que ya existen siguen pasando **sin cambiar lo que verifican** (E8). Si alguna cambia solo por estructura, explícalo en el reporte.
- Agrega una prueba de componente de la fila: muestra las iniciales correctas ("Ana María Pérez" → "AP": primera letra del primer nombre y del último apellido; un solo nombre → una letra) y "Sin celular" cuando no hay teléfono.

## Verificación

Corre en primer plano y copia el resultado (con el número de pruebas):

```
npm run lint
npm run test:unit
```

**No corras `npm run build` ni `npm run test:e2e`:** otro bloque trabaja en paralelo y comparte `www/`; los corre el coordinador al terminar la ola.
