# Tarea B4.6 — Área segura superior en todas las vistas (issue #29)

## Objetivo

En Android, el encabezado de las vistas queda casi debajo de la barra de notificaciones (y el del expediente, debajo). Este bloque lo corrige **en un solo lugar** para que ninguna vista nueva pueda volver a taparla, y agrega una prueba e2e que simula la barra de estado y falla si alguna vista la tapa.

## Causa (comprobada)

Ionic deja el espacio de la barra de estado con `ion-header ion-toolbar:first-of-type { padding-top: var(--ion-safe-area-top, 0); }` (especificidad 0-1-2). Ionic 9 calcula `--ion-safe-area-top` como `var(--safe-area-inset-top, env(safe-area-inset-top))`, y Capacitor 8 inyecta `--safe-area-inset-top` en el `html`. Los estilos de componente de Angular tienen más especificidad y la reemplazan con un valor fijo:

- `src/app/inventario/ui/inventario.page.ts:216`, `src/app/clientes/ui/clientes.page.ts:212` y `src/app/shell/proximamente.page.ts:26` (Finanzas): `ion-toolbar { padding-top: 16px; }`
- `src/app/ventas/ui/vender.page.ts:505`: `.vender-toolbar { padding-top: 16px; }`
- `src/app/clientes/ui/expediente.page.ts:372`: `.exp-toolbar { padding: 4px 4px 0; }`

En el navegador el área segura vale 0, así que hoy ninguna prueba lo ve.

## Rutas

**Permitidas** (solo estas):

- `src/app/shared/ui/estilos/_encabezado.scss` (nuevo) y `src/app/shared/ui/estilos/_index.scss` (solo la línea `@forward 'encabezado';`)
- La regla del `ion-toolbar` del encabezado (y nada más) en: `src/app/inventario/ui/inventario.page.ts`, `src/app/clientes/ui/clientes.page.ts`, `src/app/shell/proximamente.page.ts`, `src/app/ventas/ui/vender.page.ts` y `src/app/clientes/ui/expediente.page.ts`
- `e2e/area-segura.spec.ts` (nuevo)

**Prohibidas:** todo lo demás, en especial los modales (`*.modal.ts`), `src/global.scss`, `src/theme/**`, `capacitor.config.ts`, `android/**`, `angular.json` y `e2e/verificacion/b4-6/**` (carpeta del verificador).

## Qué hacer

1. **Regla global** en `src/app/shared/ui/estilos/_encabezado.scss`, con un comentario corto que diga por qué existe (issue #29) y que las vistas no fijan `padding-top` en su toolbar:

   ```scss
   ion-router-outlet > * > ion-header > ion-toolbar:first-of-type {
     padding-top: calc(var(--ion-safe-area-top, 0px) + var(--app-encabezado-extra, 16px)) !important;
   }
   ```

   El espacio del diseño por defecto es **16 px**, así que una vista nueva queda bien sin declarar nada. El selector solo toma el primer toolbar del encabezado de las vistas que carga el router (hijas directas de `ion-router-outlet`); no toma los toolbars de ningún `ion-modal`, y no depende de la clase `ion-page` (Ionic la agrega un instante después de montar la vista). **El `!important` es obligatorio**: es lo que impide que una vista vuelva a quitar el área segura con su propio `padding`. Si al probar ves que el selector no coincide con la estructura real del DOM, ajústalo manteniendo esas dos condiciones y explícalo en tu reporte.
2. Agregar `@forward 'encabezado';` en `_index.scss`.
3. **Inventario, Clientes, Finanzas (`proximamente.page.ts`) y Vender:** quitar `padding-top: 16px;` de la regla del toolbar (el valor por defecto ya da 16 px). Si la regla queda vacía, quitarla. No cambiar ninguna otra propiedad.
4. **Expediente:** en `.exp-toolbar`, reemplazar `padding: 4px 4px 0;` por `padding: 0 4px;` y `--app-encabezado-extra: 4px;`.
5. **Prueba e2e** `e2e/area-segura.spec.ts`: simula la barra de estado como lo hace Capacitor 8, con `--safe-area-inset-top: 40px` en el `html` (por ejemplo, con `page.addStyleTag` después de cargar la vista), y recorre `/inventario`, `/vender`, `/clientes`, `/finanzas` y el expediente de un cliente creado en la prueba. En cada vista revisa el `padding-top` calculado del primer `ion-toolbar` del encabezado y que el borde superior del título o del botón **Volver** quede en 40 px o más. Agrega un caso **sin** la barra simulada que confirme que el espacio del diseño no cambió, y uno que abra el modal de nuevo cliente y el modal de abono y confirme que sus toolbars no coinciden con el selector de la regla.

Sin la barra simulada, la app debe verse exactamente igual que antes.

## Comandos de verificación

`npm run lint`, `npm run test:unit`, `npm run build` (sin advertencias de presupuesto) y `npx playwright test e2e/area-segura.spec.ts --workers=1`.
