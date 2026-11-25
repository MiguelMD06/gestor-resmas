# Tarea B4.5 — Detalles de la revisión de cierre

## Objetivo

La revisión de cierre de la Etapa 4 (capturas a 390 px contra los mockups y build) encontró tres detalles. Este bloque los corrige con el cambio mínimo y agrega las pruebas de cada uno. No cambia nada más: ni otros textos, ni otras pantallas, ni la lógica de guardado.

## Rutas

**Permitidas** (solo estas):

- `src/app/cartera/ui/abono.modal.ts` y `src/app/cartera/ui/abono.modal.spec.ts`
- `src/app/clientes/ui/clientes.page.ts` y `src/app/clientes/ui/clientes.page.spec.ts`
- `src/app/shared/ui/estilos/_opciones.scss` (nuevo) y `src/app/shared/ui/estilos/_index.scss` (solo la línea `@forward 'opciones';`)

**Prohibidas:** todo lo demás, en especial `src/app/cartera/application/**`, `src/app/cartera/domain/**`, `src/app/cartera/infrastructure/**`, `src/app/ventas/**` (el selector de clientes de Vender no cambia), `src/app/shared/ui/mensajes-error.ts`, `e2e/**`, `angular.json` (no se sube el presupuesto) y `src/verificacion/b4-5/**` (carpeta del verificador).

## Detalles que corrige

1. **Texto del botón de revisar en "A una factura" sin factura elegida.** Con el modo "A una factura" y ninguna factura elegida, el botón (deshabilitado) muestra el monto escrito antes, por ejemplo "Revisar abono · $ 40.001" con una deuda de $ 40.000. Causa: `textoBotonRevisar` (`abono.modal.ts:695-704`) agrega el monto cuando `errorMonto()` es `null`, y `errorMonto()` devuelve `null` en ese modo mientras no hay factura (`abono.modal.ts:609-613`), así que nunca se comparó el monto con un saldo.
2. **Buscador de Clientes sin etiqueta visible.** El mockup `planificacion/diseno/mockups/Clientes.dc.html` (línea 54) pone la etiqueta "Buscar cliente" sobre el borde del buscador, como "Fecha del abono" en el modal de abono. Hoy solo hay `placeholder` y `aria-label` (`clientes.page.ts:77-87`), y la regla 10 de `CLAUDE.md` pide etiqueta visible en cada campo.
3. **Presupuesto de estilos de `abono.modal.ts`.** `npm run build` avisa: "abono.modal.ts exceeded maximum budget. Budget 2.00 kB was not met by 558 bytes with a total of 2.56 kB".

## Lo que ya existe y debes reutilizar

- `textoBotonRevisar`, `errorMonto`, `facturaSeleccionada`, `modo` y `puedeRevisar` de `AbonoModalComponent`.
- La clase compartida `.campo-selector-etiqueta` de `src/app/shared/ui/estilos/_selectores.scss` (etiqueta sobre el borde, fondo `--ion-background-color`). Es la que usa "Fecha del abono".
- Los parciales de `src/app/shared/ui/estilos/`, que se cargan globalmente desde `_index.scss` (`src/global.scss:44`).

## Qué hacer

1. **Botón de revisar:** en el modo "A una factura" sin factura elegida, el texto es exactamente "Revisar abono", sin monto. Los demás casos no cambian: "Revisar abono · $ N" con un monto válido, "Revisar abono" con un monto vacío o inválido, y "Revisar pago · $ N" en "Pagar todo".
2. **Etiqueta del buscador:** dentro de `.buscador-contenedor`, antes del `ion-searchbar`, un elemento con el texto visible "Buscar cliente" y la clase `campo-selector-etiqueta`, sobre el borde superior izquierdo como en el mockup (el contenedor pasa a `position: relative`). El `aria-label` del `ion-searchbar` pasa a ser "Buscar cliente por nombre o celular", para que el nombre accesible contenga la etiqueta visible, y la etiqueta lleva `aria-hidden="true"` para que el lector de pantalla no la lea dos veces. El `placeholder` sigue siendo "Buscar por nombre o celular". La prueba de `clientes.page.spec.ts` que revisa el `aria-label` se actualiza a ese texto, y es la única expectativa existente que cambia.
3. **Presupuesto:** mover las reglas `.opcion-factura`, `.opcion-factura-sel`, `.opcion-factura-info`, `.opcion-factura-nombre`, `.opcion-factura-fecha` y `.opcion-factura-saldo` (con lo que llevan anidado) de los estilos de `abono.modal.ts` a un parcial nuevo, `src/app/shared/ui/estilos/_opciones.scss`, con los mismos valores, y agregar `@forward 'opciones';` en `_index.scss`. El modal debe verse igual. No se sube el presupuesto en `angular.json`.

## Pruebas

- En `abono.modal.spec.ts`: el texto exacto del botón en "A una factura" sin factura elegida (con un monto mayor que la deuda y con uno válido), con la factura elegida (monto igual al saldo y un peso más) y al cambiar de factura; y que los textos de "A la deuda" y "Pagar todo" no cambian.
- En `clientes.page.spec.ts`: la etiqueta visible "Buscar cliente" con su clase y `aria-hidden="true"`, el nuevo `aria-label` y el `placeholder` sin cambios.
- Las pruebas existentes siguen pasando sin cambiar lo que esperan, salvo el `aria-label` del punto 2.

## Comandos de verificación

`npm run lint`, `npm run test:unit` y `npm run build`.
