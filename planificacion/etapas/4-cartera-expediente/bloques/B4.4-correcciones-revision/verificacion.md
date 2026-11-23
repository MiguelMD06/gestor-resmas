[MODO EJECUTOR]

# Verificación del bloque B4.4-correcciones-revision

Eres el verificador independiente de este bloque. Otro agente lo implementó
siguiendo `C:\Users\MIGUEL ANGEL\Documents\PROYECTOS MIGUEL MEDINA DIAZ\gestor-resmas\.claude\worktrees\docs-revision-plan\planificacion\etapas\4-cartera-expediente\bloques\B4.4-correcciones-revision\instruccion.md`: léelo para entender la tarea. Tu trabajo es
comprobar con pruebas reales que cumple todos los criterios de aceptación de
abajo, e intentar romperlo. No lo arreglas tú.

## Reglas

1. No modificas ningún archivo fuera de `src/verificacion/b4-4`. Ahí puedes crear tus propias pruebas para comprobar los criterios y los casos que pueden fallar.
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
5. Los archivos que el implementador podía tocar son: `src/app/cartera/ui/resumen-abono.modal.ts`, `src/app/cartera/ui/resumen-abono.modal.spec.ts`, `src/app/cartera/ui/abono.modal.ts`, `src/app/cartera/ui/abono.modal.spec.ts`, `src/app/clientes/ui/expediente.page.ts`, `src/app/clientes/ui/expediente.page.spec.ts`. Si
   cambió algo fuera, es un hallazgo bloqueante.
6. Lee el `CLAUDE.md` del proyecto antes de empezar. Cierra todo servidor que
   levantes para probar.
7. Al final corre el comando de prueba del bloque y anota su resultado:
   `npm run test:unit`

## Criterios de aceptación

# Criterios de aceptación — B4.4

- C1: En el resumen, si se llama a `volverAEditar()` y, antes de que su `dismiss` termine, se llama a `aceptar()`, `registrarAbono.registrar` se llama **cero** veces.
  Cómo comprobarlo: prueba unitaria con un `dismiss` que no se resuelve hasta que la prueba lo libera.
- C2: Mientras el `dismiss` de `volverAEditar()` está en curso, los botones **Aceptar** y **Volver a editar** del resumen tienen `disabled` y `aria-disabled="true"`.
- C3: Si el `dismiss` de `volverAEditar()` falla, no queda ninguna promesa rechazada sin manejar, los dos botones vuelven a estar habilitados y un `aceptar()` posterior llama a `registrar` **una** vez.
- C4: En el modal de abono, si el resumen guarda el abono y el `dismiss({ guardado: true }, ROL_GUARDADO)` del modal de abono falla, después `puedeRevisar()` es falso, el botón de revisar está deshabilitado y una nueva llamada a `abrirResumen()` no crea otro modal (`modalCtrl.create` no se vuelve a llamar).
- C5: En ese mismo estado (C4), `cancelar()` llama a `modalCtrl.dismiss` con `{ guardado: true }` y el rol `ROL_GUARDADO`, y no aparece ningún toast de error.
- C6: Sin fallo en el `dismiss`, el flujo normal no cambia: el abono guardado cierra el modal con `ROL_GUARDADO` una vez, y **Cancelar** sin abono guardado sigue cerrando con `ROL_CANCELAR`.
- C7: En el expediente, si hay una carga en curso del cliente 1 y luego `ionViewWillEnter()` recibe un id inválido (`abc`, `0`, `-3`), al resolverse la carga del cliente 1 se sigue mostrando el error de cliente inexistente con el texto de `MENSAJES_ERROR.CLIENTE_INEXISTENTE`, `expediente()` es `null` y `cargando()` es falso.
- C8: Con un id válido, la carga, el reintento y el descarte de respuestas viejas siguen funcionando como antes (las pruebas existentes de `expediente.page.spec.ts` pasan sin cambiar lo que esperan).
- C9: El bloque solo modifica las seis rutas permitidas; no cambia textos visibles ni estilos.
- C10: `npm run lint`, `npm run test:unit` y `npm run build` terminan con código 0, sin advertencias nuevas en el build.

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
