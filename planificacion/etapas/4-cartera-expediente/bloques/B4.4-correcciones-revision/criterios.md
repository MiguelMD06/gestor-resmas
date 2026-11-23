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
