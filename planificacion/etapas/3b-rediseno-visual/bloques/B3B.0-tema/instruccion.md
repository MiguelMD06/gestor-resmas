# Contexto base para bloques delegados

Eres el desarrollador de un bloque del proyecto **Gestor de Resmas**. Tu tarea está al final de este archivo: la parte del plan que va copiada en tu tarea es la fuente de verdad. Si algo de este contexto la contradice, manda la tarea, y lo informas en tu reporte.

## Proyecto

Aplicación Android, 100 % offline, para administrar un negocio de venta de resmas de papel Carta y Oficio: compra de cajas por lotes, ventas con precio por lote, cartera de clientes con abonos y control financiero que separa el capital de la ganancia.

- Requisitos: `planificacion/especificaci_n_y_dise_o_del_sistema.md`, con las correcciones de `planificacion/comun/modelo-contable.md`, que tiene prioridad.
- Montos en pesos colombianos (COP) y cantidades: **siempre enteros**. Nunca uses decimales para dinero.

## Stack (versiones instaladas)

| Área | Versión |
|------|---------|
| Angular | 22, con componentes standalone y signals |
| Ionic | 9 (`@ionic/angular`) |
| Capacitor | 8 |
| TypeScript | 6, con `strict: true` |
| Pruebas unitarias | Vitest 5 mediante `ng test` (builder de Angular, entorno jsdom) |
| Pruebas e2e | Playwright |
| Base de datos | `@capacitor-community/sqlite` 8.x en la app y `sql.js` 1.11.0 en las pruebas |

## Arquitectura

Organización por funcionalidad (screaming) con capas hexagonales:

```
src/app/
├── shared/
│   ├── domain/           tipos de dominio compartidos (pesos, resmas, medios de pago, fecha)
│   └── infrastructure/   puerto SqlDatabase, adaptadores y migraciones
├── <funcionalidad>/      inventario, clientes, ventas, cartera, finanzas
│   ├── domain/           reglas puras: sin Angular, sin SQLite, sin fechas del sistema
│   ├── application/      casos de uso: orquestan el dominio y los puertos dentro de una transacción
│   ├── infrastructure/   repositorios SQLite que implementan los puertos
│   └── ui/               páginas y componentes de Ionic
└── testing/              utilidades solo para pruebas (adaptador sql.js)
```

- `domain/` no importa nada de Angular, Ionic, Capacitor ni SQLite.
- Las dependencias apuntan hacia adentro: `ui` → `application` → `domain`; `infrastructure` implementa los puertos de `domain` o `application`.
- **Nombres:** los conceptos de dominio van en español, igual que el esquema (`Lote`, `Venta`, `registrarAbono`). Los sufijos técnicos van en inglés (`*.port.ts`, `*.adapter.ts`, `*.repository.ts`, `*.spec.ts`). Los comentarios, los textos de las pruebas y los mensajes internos de los errores, en inglés. Las pantallas muestran los errores de negocio en español, traduciéndolos por su `codigo`.
- Para el estado compartido, reutiliza la función que ya existe. Nunca reimplementes con otra forma un paso que ya tiene función (por ejemplo, registrar un movimiento de dinero).

## Reglas de calidad y de interfaz

- **Reglas 1 a 12 de `CLAUDE.md`** (raíz del repositorio): son obligatorias en todo bloque. Léelas antes de empezar: validación de cada campo, guarda contra el doble envío, vista bloqueada mientras procesa, cuatro estados de carga, reintentos seguros, pruebas obligatorias, dinero en enteros, confirmación de acciones irreversibles, sin código muerto, accesibilidad mínima, fechas desde `CLOCK` y checklist del PR.
- **Diseño:** las pantallas siguen `planificacion/comun/diseno.md` y los mockups aprobados.
- **Montos que se escriben:** usa siempre el campo de pesos de `src/app/shared/ui/` (muestra "$ 3.800" y entrega el entero `3800`, o `null` si está vacío). No crees otro campo de dinero.
- **La app es *zoneless*:** el estado que cambia después de un `await` vive en signals; si no, la pantalla no se actualiza.

## Reglas de trabajo

1. **Solo tocas las rutas permitidas** de tu tarea. Si necesitas otra, no la toques: detente y explícalo en el reporte.
2. **No uses git:** nada de `commit`, `add`, `stash`, `checkout` ni `push`. El coordinador revisa y hace los commits.
3. **Pruebas primero** cuando haya una regla con resultado esperado claro: escribe la prueba, mírala fallar (RED), implementa (GREEN) y refactoriza con las pruebas en verde. Escribe una prueba por cada regla que pide la tarea, y cada prueba verifica todos los efectos observables de la regla.
4. **Archivos temporales** fuera del repositorio. Si alguno queda dentro, informa su ruta exacta.
5. **No instales dependencias** salvo que la tarea lo pida, y nunca corras formateadores, generadores ni instalaciones sobre todo el repositorio.
6. **Pruebas que prueban lo que dicen:**
   - prueba intentando romper el código: además del caso feliz, cubre valores límite, el segundo y el último elemento (no solo el primero), repetir la acción (doble envío) y fallos de carga o escritura;
   - cada prueba llama a la función que nombra su título;
   - un rechazo esperado se acota al error exacto: `toThrow(expect.objectContaining({ codigo: '...' }))` o un mensaje concreto, nunca `toThrow()` o `rejects.toThrow()` a secas;
   - nada de `try/catch` para verificar un error: si no se lanza, la prueba tiene que fallar;
   - los casos límite usan el valor límite exacto.
7. **Engram:** tienes acceso de solo lectura. Úsalo si te sirve para tener contexto; nunca intentes escribir en él.
8. **Cierra todo servidor** que levantes para una prueba apenas termine.

## Trampas conocidas del stack

- **`@capacitor-community/sqlite`:** dentro de una transacción manual (`beginTransaction` / `commitTransaction` / `rollbackTransaction`), llama a `run`, `execute` y `executeSet` con `transaction = false`. Si no, el plugin abre su propia transacción.
- **En web (jeep-sqlite)**, después de cada commit hay que llamar a `saveToStore(nombreBD)`, o los datos se pierden al recargar.
- **En web y en las pruebas se usa la misma `sql.js@1.11.0`:** jeep-sqlite 2.8 trae empaquetado el JS de sql.js 1.11 y necesita el `.wasm` de **esa** versión (`angular.json` copia `sql-wasm.wasm` desde `node_modules/sql.js/dist`). No subas `sql.js` sin comprobar la compatibilidad con jeep-sqlite.
- **`sql.js` funciona dentro de `ng test`** con `await initSqlJs()` sin configuración extra (verificado con la versión 1.11.0).
- **SQLite no valida tipos por sí solo:** los CHECK del esquema usan `typeof(col) = 'integer'`. No los quites.
- **`PRAGMA foreign_keys = ON`** se activa en cada conexión, no queda guardado en la base.
- **Windows y PowerShell 5.1:** guarda los archivos en UTF-8 sin BOM.

## Verificación antes de terminar

Corre en primer plano y copia el resultado de cada uno en tu reporte:

```
npm run lint
npm run test:unit
npm run build
npm run test:e2e
```

Si tu bloque corre en paralelo con otro, la tarea dice cuáles de estos comandos corre el coordinador (por ejemplo, `build` porque los dos escribirían en `www/`, o `test:e2e` porque ambos usarían el puerto 4200).

## Reporte final

1. Qué hiciste, archivo por archivo.
2. Qué `S#` de la tarea cubriste y con qué prueba.
3. Resultado de cada comando de verificación (`<comando>: <resultado observado>`).
4. Lo que quedó pendiente o no pudiste verificar.
5. Rutas de archivos temporales, si las hubo.

Cierra con una sección `## Key Learnings` de 1 a 5 puntos numerados, cada uno con un aprendizaje reutilizable en una oración completa. Omítela si no hubo ninguno.

---

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
