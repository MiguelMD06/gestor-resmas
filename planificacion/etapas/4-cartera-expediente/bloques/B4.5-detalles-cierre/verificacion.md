[MODO EJECUTOR]

# Verificación del bloque B4.5-detalles-cierre

Eres el verificador independiente de este bloque. Otro agente lo implementó
siguiendo `C:\Users\juand\Desktop\Universidad Surcolombiana\ProyectosPersonales\gestor-resmas\planificacion\etapas\4-cartera-expediente\bloques\B4.5-detalles-cierre\instruccion.md`: léelo para entender la tarea. Tu trabajo es
comprobar con pruebas reales que cumple todos los criterios de aceptación de
abajo, e intentar romperlo. No lo arreglas tú.

## Reglas

1. No modificas ningún archivo fuera de `src/verificacion/b4-5`. Ahí puedes crear tus propias pruebas para comprobar los criterios y los casos que pueden fallar.
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
5. Los archivos que el implementador podía tocar son: `src/app/cartera/ui/abono.modal.ts`, `src/app/cartera/ui/abono.modal.spec.ts`, `src/app/clientes/ui/clientes.page.ts`, `src/app/clientes/ui/clientes.page.spec.ts`, `src/app/shared/ui/estilos/_opciones.scss`, `src/app/shared/ui/estilos/_index.scss`. Si
   cambió algo fuera, es un hallazgo bloqueante.
6. Lee el `CLAUDE.md` del proyecto antes de empezar. Cierra todo servidor que
   levantes para probar.
7. Al final corre el comando de prueba del bloque y anota su resultado:
   `npm run lint && npm run test:unit && npm run build`

## Criterios de aceptación

# Criterios de aceptación — B4.5

Datos de partida para las pruebas del modal: deuda total $ 40.000 con dos facturas abiertas, F1 con saldo $ 30.000 (la más antigua) y F2 con saldo $ 10.000.

- C1: En "A una factura" sin factura elegida, con monto $ 40.001, el botón de revisar dice exactamente "Revisar abono" y tiene `disabled` y `aria-disabled="true"`. Con monto $ 5.000 y sin factura elegida, también dice exactamente "Revisar abono" y sigue deshabilitado.
- C2: En "A una factura" con F2 elegida: con $ 10.000 (el saldo exacto) dice "Revisar abono · $ 10.000" y está habilitado; con $ 10.001 dice "Revisar abono", está deshabilitado y junto al monto se ve exactamente el texto de `MENSAJES_ERROR.MONTO_SUPERA_SALDO_FACTURA`.
- C3: Con $ 15.000 escrito, elegir F2 deja el botón en "Revisar abono" y deshabilitado (supera su saldo); cambiar después a F1 (la otra factura) lo deja en "Revisar abono · $ 15.000" y habilitado.
- C4: Los demás textos no cambian: "A la deuda" con $ 35.000 dice "Revisar abono · $ 35.000"; con $ 40.001 dice "Revisar abono"; con el monto vacío dice "Revisar abono"; "Pagar todo" dice "Revisar pago · $ 40.000".
- C5: En Clientes, dentro de `.buscador-contenedor` y antes del `ion-searchbar`, hay un elemento con el texto visible exacto "Buscar cliente", la clase `campo-selector-etiqueta` y `aria-hidden="true"`; el contenedor tiene `position: relative`.
  Cómo comprobarlo: prueba de componente sobre el DOM; la posición sobre el borde la revisa el coordinador con una captura a 390 px.
- C6: El `ion-searchbar` de Clientes tiene `aria-label="Buscar cliente por nombre o celular"` y `placeholder="Buscar por nombre o celular"`; el buscador del selector de clientes de Vender no cambia (`vender.page.spec.ts` pasa sin cambios).
- C7: El buscador de Clientes sigue habilitado mientras carga y sigue filtrando por nombre y por celular (las pruebas existentes de `clientes.page.spec.ts` pasan sin cambiar lo que esperan, salvo el `aria-label`).
- C8: `npm run build` ya no muestra la advertencia de presupuesto de `abono.modal.ts` y no muestra ninguna advertencia nueva; `angular.json` no cambia.
- C9: Las seis reglas `.opcion-factura*` están en `src/app/shared/ui/estilos/_opciones.scss` con los mismos valores que tenían en `abono.modal.ts`, ya no están en `abono.modal.ts`, y `_index.scss` tiene `@forward 'opciones';`. Ningún otro archivo usa esas clases.
- C10: El bloque solo modifica las rutas permitidas y no cambia otros textos visibles.
- C11: `npm run lint`, `npm run test:unit` y `npm run build` terminan con código 0.

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
