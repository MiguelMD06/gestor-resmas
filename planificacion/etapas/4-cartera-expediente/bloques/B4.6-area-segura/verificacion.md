[MODO EJECUTOR]

# Verificación del bloque B4.6-area-segura

Eres el verificador independiente de este bloque. Otro agente lo implementó
siguiendo `C:\Users\juand\Desktop\Universidad Surcolombiana\ProyectosPersonales\gestor-resmas\planificacion\etapas\4-cartera-expediente\bloques\B4.6-area-segura\instruccion.md`: léelo para entender la tarea. Tu trabajo es
comprobar con pruebas reales que cumple todos los criterios de aceptación de
abajo, e intentar romperlo. No lo arreglas tú.

## Reglas

1. No modificas ningún archivo fuera de `e2e/verificacion/b4-6`. Ahí puedes crear tus propias pruebas para comprobar los criterios y los casos que pueden fallar.
2. Cada criterio se comprueba ejecutando algo de verdad (una prueba, un
   comando, una petición). Solo si no se puede ejecutar, se comprueba leyendo
   el código, y la evidencia lo dice. La evidencia nombra qué corriste y qué
   salió. Nunca inventes un resultado.
3. Intenta romperlo aunque el criterio no lo nombre: valor límite exacto, el
   segundo y el último elemento (no solo el primero), repetir la acción, fallo
   de red, datos de otro usuario y otro rol.
4. Revisa también las pruebas que escribió el implementador. Es un hallazgo
   bloqueante si:
   - una prueba no ejercita la función que nombra su título;
   - un rechazo esperado no se acota al error exacto (código o mensaje), por
     ejemplo un `toThrow()` o `rejects.toThrow()` a secas;
   - hay un `try/catch` sin una aserción que falle si no se lanza el error;
   - un caso límite no se prueba con el valor límite exacto.
5. Los archivos que el implementador podía tocar son: `src/app/shared/ui/estilos/_encabezado.scss`, `src/app/shared/ui/estilos/_index.scss`, `src/app/inventario/ui/inventario.page.ts`, `src/app/clientes/ui/clientes.page.ts`, `src/app/shell/proximamente.page.ts`, `src/app/ventas/ui/vender.page.ts`, `src/app/clientes/ui/expediente.page.ts`, `e2e/area-segura.spec.ts`. Si
   cambió algo fuera, es un hallazgo bloqueante.
6. Lee el `CLAUDE.md` del proyecto antes de empezar. Cierra todo servidor que
   levantes para probar.
7. Al final corre el comando de prueba del bloque y anota su resultado:
   `npm run lint && npm run test:unit && npm run build && npx playwright test e2e/area-segura.spec.ts e2e/verificacion/b4-6 --workers=1`

## Criterios de aceptación

# Criterios de aceptación — B4.6

"Barra simulada" significa `--safe-area-inset-top: 40px` en el `html`, como lo inyecta Capacitor 8, con la vista ya cargada en el viewport del proyecto e2e (Pixel 7).

- C1: Con la barra simulada, el `padding-top` calculado del primer `ion-toolbar` del `ion-header` es exactamente 56 px en `/inventario`, `/clientes`, `/finanzas` y `/vender`, y 44 px en el expediente (`/clientes/<id>` de un cliente creado en la prueba).
- C2: Con la barra simulada, en cada una de esas cinco vistas el borde superior del título (`ion-title`) o, en el expediente, del botón **Volver** (`data-testid="btn-volver"`) está en 40 px o más.
- C3: Sin la barra simulada, el `padding-top` calculado de ese toolbar es 16 px en `/inventario`, `/clientes`, `/finanzas` y `/vender`, y 4 px en el expediente: es el mismo valor que tenían antes del cambio, así que el diseño no cambia.
- C4: La regla global no toma ningún toolbar de un modal: con la barra simulada, al abrir el modal de nuevo cliente (Clientes) y el modal de abono (expediente), ningún `ion-toolbar` dentro de un `ion-modal` coincide con el selector de la regla (`element.matches(selector)` es falso). El selector no depende de la clase `ion-page`, para que el valor sea correcto desde que la vista entra al DOM.
- C5: El expediente sigue mostrando **Volver** a la izquierda y **Editar** a la derecha, con 4 px de relleno a los lados y 0 abajo (`padding-left`, `padding-right` y `padding-bottom` calculados).
- C6: Ningún archivo de `src/app` fija `padding-top` ni el lado superior de `padding` en el `ion-toolbar` del encabezado de una vista (`inventario.page.ts`, `clientes.page.ts`, `proximamente.page.ts`, `vender.page.ts`, `expediente.page.ts`); los modales quedan fuera de este criterio. El único espacio por vista que queda declarado es `--app-encabezado-extra: 4px` en el expediente.
- C7: La regla global lleva `!important`, a propósito: una vista no puede volver a quitar el área segura aunque fije `padding-top` en su toolbar. `e2e/area-segura.spec.ts` lo demuestra: con la barra simulada, inyecta en la página (`page.addStyleTag`) `.vender-toolbar { padding-top: 16px; } ion-toolbar { padding: 4px; }` y comprueba que el `padding-top` de Vender y el de Inventario siguen en 56 px. Además, la prueba cubre C1, C3 y C4 con valores exactos (`toBe`, no rangos) y falla si se quita la regla global.
  Cómo comprobarlo: quitar temporalmente `@forward 'encabezado';` de `_index.scss`, correr la prueba, ver que falla con la barra simulada y devolver el archivo a como estaba.
- C8: Las pruebas e2e existentes siguen pasando sin cambios (`npx playwright test --workers=1`).
- C9: El bloque solo modifica las rutas permitidas; `npm run lint`, `npm run test:unit` y `npm run build` terminan con código 0 y el build no muestra advertencias (en particular, ninguna de presupuesto de estilos).

## Respuesta

Responde con el formato JSON pedido:

- `veredicto`: `APROBADO` solo si todos los criterios se cumplen y no hay
  hallazgos bloqueantes; si no, `CAMBIOS`.
- `criterios`: uno por cada id de arriba, sin omitir ninguno, con `cumple` y
  `evidencia` (qué corriste y qué salió).
- `hallazgos`: cada uno con `archivo`, `linea` si aplica, `criterio` (el id, o
  vacío si no corresponde a uno), `bloqueante` y una `descripcion` concreta:
  qué falla y cómo reproducirlo. Es bloqueante todo lo que incumple un
  criterio, rompe algo o es un riesgo; es un detalle lo que no cambia el
  comportamiento.
- `resumen`: una o dos frases.
