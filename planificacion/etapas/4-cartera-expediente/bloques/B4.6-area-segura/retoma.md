# Retoma del B4.6 (intento 5)

- **Intento 1:** fallo de red de agy; el verificador no arrancó.
- **Intento 2:** la tarea no incluía Inventario, Clientes y Finanzas (error del coordinador, corregido).
- **Intento 3:** el C7 viejo pedía algo que el `!important` impide a propósito (error del coordinador, corregido). El verificador también encontró que el selector con `.ion-page` daba 40 px un instante al montar la vista y un fallo intermitente al marcar **Fiado** en la prueba.
- **Intento 4:** detenido a pedido de Juan mientras el implementador comprobaba el C7 nuevo (había quitado temporalmente `@forward 'encabezado';`; el coordinador lo restauró).

**Estado del árbol (sin commit). Todo lo de la tarea ya está hecho:**

- `src/app/shared/ui/estilos/_encabezado.scss`: selector `ion-router-outlet > * > ion-header > ion-toolbar:first-of-type`, `!important` y 16 px por defecto.
- `src/app/shared/ui/estilos/_index.scss`: con `@forward 'encabezado';`.
- `inventario.page.ts`, `clientes.page.ts`, `proximamente.page.ts` y `vender.page.ts`: sin `padding-top: 16px`.
- `expediente.page.ts`: `padding-left: 4px; padding-right: 4px; padding-bottom: 0;` y `--app-encabezado-extra: 4px;` (equivalente a lo que pide la tarea).
- `e2e/area-segura.spec.ts`: el selector nuevo, la espera de **Fiado** y el caso del C7 nuevo ("view-level padding overrides cannot strip safe area inset from header toolbars").

**Qué te toca:** revisar esos archivos contra la tarea y los criterios, corregir solo si algo no cumple, y correr los comandos de verificación. Haz también la comprobación del C7: quita temporalmente `@forward 'encabezado';` de `_index.scss`, corre `npx playwright test e2e/area-segura.spec.ts --workers=1`, confirma que falla y **devuelve la línea antes de seguir**. Al terminar, `_index.scss` debe tener `@forward 'encabezado';`.
