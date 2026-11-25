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
