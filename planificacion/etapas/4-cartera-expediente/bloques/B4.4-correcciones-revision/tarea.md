# Tarea B4.4 — Correcciones de la revisión del B4.3

## Objetivo

La revisión del commit `33103c5` (B4.3) encontró tres casos que rompen las reglas 2 y 3 de `CLAUDE.md` (doble envío y vista bloqueada mientras procesa). Este bloque los corrige con el cambio mínimo y agrega una prueba por cada uno. No cambia nada más: ni textos, ni estilos, ni otras pantallas.

## Rutas

**Permitidas** (solo estas):

- `src/app/cartera/ui/resumen-abono.modal.ts` y `src/app/cartera/ui/resumen-abono.modal.spec.ts`
- `src/app/cartera/ui/abono.modal.ts` y `src/app/cartera/ui/abono.modal.spec.ts`
- `src/app/clientes/ui/expediente.page.ts` y `src/app/clientes/ui/expediente.page.spec.ts`

**Prohibidas:** todo lo demás, en especial `src/app/cartera/application/**`, `src/app/cartera/domain/**`, `src/app/cartera/infrastructure/**`, `e2e/**` y `src/verificacion/b4-4/**` (carpeta del verificador).

## Hallazgos que corrige (textuales de la revisión)

1. **`resumen-abono.modal.ts:356-373`:** "Triggering aceptar() while volverAEditar() has an in-flight modalCtrl.dismiss() executes registrarAbono.registrar() even though the modal is already dismissing with ROL_CANCELAR." Si el `dismiss` termina antes que `registrar`, el modal de abono queda abierto con saldos viejos y se puede registrar el mismo abono otra vez.
2. **`abono.modal.ts:833-859`:** "If modalCtrl.dismiss({ guardado: true }, ROL_GUARDADO) fails after the payment was already persisted, the modal remains open with puedeRevisar() re-enabled, allowing a duplicate payment submission."
3. **`expediente.page.ts:583-591`:** "The invalid route ID branch in ionViewWillEnter() does not increment peticionActual or reset cargando(), allowing an earlier in-flight cargarExpediente() request to overwrite the CLIENTE_INEXISTENTE error state."

## Lo que ya existe y debes reutilizar

- La guarda `volviendo` de `ResumenAbonoModalComponent.volverAEditar()` y las señales `guardando`/`guardado`.
- `abriendoResumen`, `guardando`, `puedeRevisar` y las variables locales `abonoGuardado`/`resumenGuardando` de `AbonoModalComponent.abrirResumen()`; `ROL_GUARDADO` y `ROL_CANCELAR`.
- El patrón de id de petición (`peticionActual`) que ya usa `ExpedientePage.cargarExpediente()`.

## Qué hacer

1. **Resumen:** `aceptar()` no hace nada mientras `volverAEditar()` tiene un `dismiss` en curso. Mientras dura ese `dismiss`, los botones **Aceptar** y **Volver a editar** quedan deshabilitados (`disabled` y `aria-disabled`); para eso `volviendo` pasa a ser una señal. Si el `dismiss` falla, la guarda se libera (como hoy) y los dos botones vuelven a estar habilitados.
2. **Modal de abono:** cuando el abono quedó guardado (`abonoGuardado` verdadero) y el `dismiss` con `ROL_GUARDADO` falla, el modal queda marcado como "abono ya registrado" con una señal propia: `puedeRevisar()` devuelve falso para siempre (el botón de revisar queda deshabilitado) y **Cancelar** pasa a cerrar el modal con `dismiss({ guardado: true }, ROL_GUARDADO)`, para que el expediente se recargue. Sigue sin aparecer el toast de error en ese caso (criterio C23 del B4.3).
3. **Expediente:** en la rama de id inválido de `ionViewWillEnter()`, invalidar la petición en curso (incrementar `peticionActual`) y dejar `cargando` en falso antes de mostrar el error de cliente inexistente.

## Pruebas

Una prueba nueva por cada punto de "Qué hacer", en el `.spec.ts` de su componente, que falle con el código de `33103c5` y pase con la corrección, y que revise el efecto que ve el usuario (botón deshabilitado, número de llamadas a `registrar`, rol del `dismiss`, mensaje mostrado). Las pruebas existentes siguen pasando sin cambiar lo que esperan.

## Comandos de verificación

`npm run lint`, `npm run test:unit` y `npm run build`.
