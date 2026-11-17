# Tarea B3B.0 — Tema, fuente y estilos compartidos

**Etapa 3B, ola 1.** Eres el único bloque de esta ola. Antes de empezar, lee completos `CLAUDE.md` (raíz del repositorio; reglas 1 a 12), `planificacion/comun/diseno.md` y `planificacion/etapas/3b-rediseno-visual/PLAN.md` hasta la sección `## Log`. Tu bloque es **B3B.0**; si esta tarea y el plan no coinciden, manda el plan y lo informas.

Esta etapa **no agrega funciones**: cambia cómo se ve la app. No cambies conducta, textos visibles, `data-testid` ni casos de uso.

## Specs que cubres

S2, S3, S4, S5; decisiones D1, D2, D3, D4 y D7; ejemplo E1. Lee su texto en el plan.

## Rutas permitidas

```
src/global.scss
src/theme/variables.scss
src/app/shared/ui/estilos/**        (carpeta nueva)
src/index.html                      (solo la meta color-scheme)
angular.json                        (solo el arreglo "styles" del build y del test, si hace falta para la fuente)
src/app/shell/tabs.page.ts
src/app/shell/tabs.page.spec.ts
src/app/shell/proximamente.page.ts
src/app/shell/proximamente.page.spec.ts
e2e/app.spec.ts
```

Prohibido todo lo demás. En particular, **no toques** las páginas ni los modales de `inventario/`, `ventas/`, `clientes/` ni `finanzas/`: los rehacen los bloques de la ola 2 usando lo que tú dejes.

## Lo que ya existe

- `@fontsource-variable/inter` **5.3.0 ya está instalado** (el coordinador lo agregó a `package.json`). No instales nada. Su CSS de entrada es `@fontsource-variable/inter/index.css` y declara la familia `'Inter Variable'`.
- `src/global.scss` importa hoy `@ionic/angular/css/palettes/dark.system.css`.
- `src/theme/variables.scss` está vacío.
- Los mockups aprobados están en `planificacion/diseno/mockups/*.dc.html`. Léelos como fuente de medidas y colores (son HTML con estilos en línea; no los abras en el navegador). Los que más te sirven: `Vender.dc.html` (barra de pestañas, `nav` al final), `Inventario.dc.html`, `VenderEstados.dc.html` (estados de los campos), `ModalResumen.dc.html` (hoja de modal) e `InventarioEstados.dc.html` (estados vacío y error).

## Especificación

1. **D1, modo oscuro predeterminado:** en `global.scss`, reemplaza `dark.system.css` por `dark.always.css`. En `index.html`, `<meta name="color-scheme" content="dark">`.
2. **D3, Inter:** importa `@fontsource-variable/inter/index.css` (desde `global.scss` o desde `angular.json`, lo que funcione con el builder de Angular sin cargar nada de internet) y fija `--ion-font-family: 'Inter Variable', Inter, system-ui, sans-serif`.
3. **D2, paleta en `theme/variables.scss`**, en `:root`, sobre la paleta oscura de Ionic:
   - fondo `--ion-background-color: #000000` y su `-rgb`; texto `--ion-text-color: #F5F5F5` y su `-rgb`;
   - `--ion-color-primary` lima `#CBFF3D` con `--ion-color-primary-contrast: #0A0A0A` y las variantes `-rgb`, `-shade`, `-tint`, `-contrast-rgb`;
   - `--ion-color-secondary` celeste `#5EC8F2` (contraste `#0A0A0A`);
   - `--ion-color-danger` `#FF6B6B`, `--ion-color-success` `#34D399` y `--ion-color-warning` `#F5B544`, con sus variantes;
   - variables propias, con prefijo `--app-`: `--app-tarjeta: #0F1012`, `--app-tarjeta-elevada: #17181B`, `--app-borde: #1F2125`, `--app-borde-campo: #3A3D44`, `--app-texto-secundario: #A1A1AA`, `--app-barra-pestanas: #0A0A0B`, `--app-radio-tarjeta: 20px`, `--app-radio-campo: 12px`;
   - `--ion-item-background`, `--ion-toolbar-background`, `--ion-tab-bar-background` y `--ion-card-background` coherentes con los mockups.
   Calcula `-shade` y `-tint` como lo hace Ionic: 12 % hacia negro y 10 % hacia blanco.
4. **D4, estilos compartidos en `src/app/shared/ui/estilos/`**, como parciales SCSS importados desde `global.scss`. Clases o reglas globales, sin componentes nuevos:
   - **tarjeta** (`.app-tarjeta`): fondo `--app-tarjeta`, borde 1px `--app-borde`, radio 20px;
   - **`ion-segment`**: fondo `#17181B`, radio 12px, botón activo `#2A2C31` con texto `#F5F5F5` en 600, inactivo `#A1A1AA` (mockup `Vender.dc.html`, clase `.segmento`);
   - **campos** (`ion-input` e `ion-textarea` con `fill="outline"`): contorno 1px `#3A3D44`, radio 12px, alto 56px, foco 2px celeste, error en rojo (nota "Campos" del lienzo: está en `planificacion/diseno/mockups/canvas.json`, `notes.campos`);
   - **hoja de modal** (`ion-modal` con breakpoints): fondo `#0F1012`, radio superior 24px, asa gris `#3A3D44`;
   - **botón principal** (`ion-button` con `color="primary"`): alto 52px, radio 14px, texto `#0A0A0A` en 600; **secundario** (`fill="outline"` con `color="secondary"`): borde celeste, radio 14px;
   - **estados vacío y error** (`.app-estado-vacio`, `.app-estado-error`): tarjeta centrada con ícono gris (vacío) o rojo (error), como en `InventarioEstados.dc.html`.
5. **Pestañas (`tabs.page.ts`)**, como el `nav` de `Vender.dc.html`: fondo `#0A0A0B`, borde superior 1px `#1F2125`, alto 72px, ícono y texto inactivos `#A1A1AA` y activos lima `#CBFF3D` en 600. Mantén los íconos, los textos, el orden y los atributos `tab`.
6. **D7, `proximamente.page.ts`:** mismo texto ("Disponible en la Etapa N") con el estilo nuevo: título grande como en los mockups (28px, 700) y el mensaje en una `.app-estado-vacio`. Mantén el `ion-title` que verifica `e2e/app.spec.ts`.

## Pruebas (primero RED)

- `e2e/app.spec.ts`: agrega un caso **E1**. Con la página abierta, `getComputedStyle` de `ion-content` (o `body`) da fondo `rgb(0, 0, 0)` y la `font-family` contiene `Inter`. Usa `page.emulateMedia({ colorScheme: 'light' })` antes de `goto` para probar que sigue oscuro con el sistema en claro. La pestaña activa tiene color `rgb(203, 255, 61)`.
- `tabs.page.spec.ts` y `proximamente.page.spec.ts`: lo que ya verifican sigue pasando sin cambiar lo que verifican.

## Verificación

Corre en primer plano y copia el resultado (con el número de pruebas):

```
npm run lint
npm run test:unit
npm run build
```

No corras `npm run test:e2e`: lo corre el coordinador. Deja el caso E1 escrito y explícalo en el reporte. Indica para cada punto de la especificación qué archivo lo cubre.
