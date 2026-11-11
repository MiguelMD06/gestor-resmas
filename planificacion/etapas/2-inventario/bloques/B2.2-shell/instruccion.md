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

## Reglas de trabajo

1. **Solo tocas las rutas permitidas** de tu tarea. Si necesitas otra, no la toques: detente y explícalo en el reporte.
2. **No uses git:** nada de `commit`, `add`, `stash`, `checkout` ni `push`. El coordinador revisa y hace los commits.
3. **Pruebas primero** cuando haya una regla con resultado esperado claro: escribe la prueba, mírala fallar (RED), implementa (GREEN) y refactoriza con las pruebas en verde. Escribe una prueba por cada regla que pide la tarea, y cada prueba verifica todos los efectos observables de la regla.
4. **Archivos temporales** fuera del repositorio. Si alguno queda dentro, informa su ruta exacta.
5. **No instales dependencias** salvo que la tarea lo pida, y nunca corras formateadores, generadores ni instalaciones sobre todo el repositorio.
6. **Pruebas que prueban lo que dicen:**
   - cada prueba llama a la función que nombra su título;
   - un rechazo esperado se acota al error exacto: `toThrow(expect.objectContaining({ codigo: '...' }))` o un mensaje concreto, nunca `toThrow()` o `rejects.toThrow()` a secas;
   - nada de `try/catch` para verificar un error: si no se lanza, la prueba tiene que fallar;
   - los casos límite usan el valor límite exacto.
7. **Engram:** tienes acceso de solo lectura. Úsalo si te sirve para tener contexto; nunca intentes escribir en él.

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
```

## Reporte final

1. Qué hiciste, archivo por archivo.
2. Qué `S#` de la tarea cubriste y con qué prueba.
3. Resultado de cada comando de verificación (`<comando>: <resultado observado>`).
4. Lo que quedó pendiente o no pudiste verificar.
5. Rutas de archivos temporales, si las hubo.

Cierra con una sección `## Key Learnings` de 1 a 5 puntos numerados, cada uno con un aprendizaje reutilizable en una oración completa. Omítela si no hubo ninguno.

---

# Tarea B2.2 — Pestañas, pantalla de error, reloj y e2e en el CI

**Etapa 2 (Inventario y aportes de capital), ola 1.** Trabajas en paralelo con B2.1, que toca otros archivos (`src/app/inventario/`, `src/app/finanzas/application/` y `regla-negocio.error.ts`). El plan completo está en `planificacion/etapas/2-inventario/PLAN.md`: léelo hasta `## Log`. Esta tarea copia la parte que te toca y manda sobre el plan si algo no coincide.

## Specs que cubres

| ID | Requisito |
|----|-----------|
| S10 | "Estructura basada en **`ion-tabs`** (barra de navegación inferior con 4 vistas principales)". Las 4 pestañas, en orden: "**Pestaña 1: Finanzas**", "**Pestaña 2: Vender**", "**Pestaña 3: Inventario**", "**Pestaña 4: Clientes y Cartera**". En esta etapa solo construyes la estructura; la pantalla de Inventario es de B2.3. |
| S11 | "Si la base no abre, la app no arranca y no muestra ningún mensaje. Hace falta una pantalla de error." |
| S12 | "El CI corre `lint`, `test:unit` y `build`. El e2e entra cuando haya interfaz (Etapa 2)." |
| D4 | "**Las fechas vienen de un `Clock` inyectado** (token `CLOCK`, con `SystemClock` en la app y un reloj fijo en las pruebas)." |

Decisiones aprobadas que te tocan (de "Por aprobar" del plan): la pestaña inicial es **Inventario**, y las pestañas sin contenido se ven desde ahora con el aviso "Disponible en la Etapa N".

### Ejemplo que es prueba

| ID | Situación | Resultado esperado |
|----|-----------|--------------------|
| E9 | La base no abre al iniciar la app. | se ve la pantalla de error con el botón **Reintentar**; si el reintento funciona, aparecen las pestañas |

## Rutas permitidas

```
src/main.ts
src/app/app.component.ts
src/app/app.component.html
src/app/app.component.scss
src/app/app.component.spec.ts
src/app/app.routes.ts
src/app/home/**
src/app/shell/**
src/app/shared/infrastructure/clock/**
e2e/**
playwright.config.ts
.github/workflows/ci.yml
```

Prohibido todo lo demás. En particular, no toques `src/app/inventario/`, `src/app/finanzas/` ni `src/app/shared/domain/`, que son de B2.1, ni `database.provider.ts`, que ya se puede reintentar y no necesita cambios.

## Qué hacer

1. **Reloj (D4):** `src/app/shared/infrastructure/clock/clock.token.ts` con `export const CLOCK = new InjectionToken<Clock>('CLOCK')`. En `main.ts`, regístralo con `{ provide: CLOCK, useClass: SystemClock }`. `Clock` está en `src/app/shared/domain/fecha-hora.ts` y `SystemClock` ya existe en esa carpeta. Agrega una prueba de que `SystemClock.ahora()` devuelve una `FechaHora` válida con el formato `YYYY-MM-DD HH:MM:SS`.
2. **Estado del arranque** (`src/app/shell/estado-arranque.ts`, `@Injectable({ providedIn: 'root' })`):
   - `estado = signal<'cargando' | 'listo' | 'error'>('cargando')`;
   - `iniciar(): Promise<void>` llama a `DatabaseProvider.init()`. Si funciona, pasa a `'listo'`; si falla, pasa a `'error'`, deja el error en `console.error` y **no** relanza;
   - `reintentar()` vuelve a `'cargando'` y llama a `iniciar()` otra vez.

   En `main.ts`, `provideAppInitializer(() => inject(EstadoArranque).iniciar())` reemplaza a la llamada directa a `init()`. Como `iniciar()` no relanza, la app siempre arranca.
3. **Pantalla de error** (`src/app/shell/error-arranque.component.ts`, con su `.html` si lo prefieres): un `ion-content` centrado con el título "No se pudo abrir la base de datos", el texto "Revisa el espacio disponible en el teléfono y vuelve a intentarlo." y un `ion-button` **Reintentar** que llama a `EstadoArranque.reintentar()`. Mientras el estado es `'cargando'`, el botón queda deshabilitado y se ve un `ion-spinner`.
4. **`app.component`:**
   - `estado() === 'listo'`: muestra `<ion-router-outlet>`;
   - `'error'`: muestra `<app-error-arranque>`;
   - `'cargando'`: un `ion-spinner` centrado.

   Mientras la base no está lista, **no** se muestra el router outlet, así ninguna página inyecta `SQL_DATABASE` antes de tiempo (el getter `db` lanza si la base no abrió).
5. **Pestañas** (`src/app/shell/tabs.page.ts` y `src/app/shell/tabs.routes.ts`):
   - `ion-tabs` con `ion-tab-bar slot="bottom"` y 4 `ion-tab-button`, en este orden: `finanzas` ("Finanzas", ícono `wallet-outline`), `vender` ("Vender", `cart-outline`), `inventario` ("Inventario", `cube-outline`) y `clientes` ("Clientes", `people-outline`). Registra los íconos con `addIcons` de `ionicons`;
   - `src/app/shell/proximamente.page.ts`: una página con `ion-header` (el título de la pestaña) y el texto "Disponible en la Etapa N". El título y la etapa vienen del `data` de la ruta. Usa `withComponentInputBinding`, que ya está activo, o `ActivatedRoute`;
   - en `tabs.routes.ts`, cada pestaña es una ruta hija con `loadComponent`: `finanzas` (etapa 5), `vender` (etapa 3) y `clientes` (etapa 3) van a `proximamente.page`. `inventario` también va a `proximamente.page` por ahora, con `data: { titulo: 'Inventario', etapa: 2 }`; B2.3 lo reemplaza por la pantalla real. La ruta vacía redirige a `inventario`;
   - `app.routes.ts`: la ruta `''` carga `tabs.routes` dentro de `TabsPage`, y cualquier otra ruta (`**`) redirige a `''`;
   - borra `src/app/home/` entero.

   Importa los componentes de Ionic desde `@ionic/angular`, como hace hoy `src/app/home/home.page.ts`.
6. **E2E** (`e2e/app.spec.ts`), reemplaza las 2 pruebas de la plantilla por:
   - abre `/` y queda en `/inventario`, con las 4 pestañas visibles en el orden de arriba;
   - un clic en cada pestaña navega a su URL y muestra su título;
   - no hay errores en la consola durante todo el recorrido.

   Corre `npm run test:e2e` y copia el resultado. Si el navegador de Playwright no está instalado, instálalo con `npx playwright install chromium`, que no cambia el repositorio.
7. **CI** (`.github/workflows/ci.yml`), después del paso `Run build`:
   - `name: Install Playwright browser` con `run: npx playwright install --with-deps chromium`;
   - `name: Run e2e tests` con `run: npm run test:e2e`.

   No cambies los pasos ni los permisos que ya existen. Este cambio va en su propio commit, porque toca el CI.

## Pruebas (primero RED, después GREEN)

Sigue la regla 6.

| Archivo | Casos |
|---------|-------|
| `src/app/shell/estado-arranque.spec.ts` | Con un doble de `DatabaseProvider` cuyo `init()` falla una vez y después funciona: `iniciar()` deja `'error'` sin relanzar (la promesa se resuelve); `reintentar()` pasa por `'cargando'` y termina en `'listo'`; `init()` se llamó dos veces. Si `init()` funciona a la primera, queda `'listo'`. |
| `src/app/app.component.spec.ts` | Con el estado en `'error'` se ve `app-error-arranque` y no `ion-router-outlet`; en `'listo'`, al revés. Al tocar **Reintentar**, se llama a `reintentar()` (E9). |
| `src/app/shell/tabs.page.spec.ts` | Hay 4 `ion-tab-button` con `tab` igual a `finanzas`, `vender`, `inventario` y `clientes`, en ese orden y con sus textos. |
| `src/app/shell/proximamente.page.spec.ts` | Con el `data` `{ titulo: 'Vender', etapa: 3 }`, se ve "Vender" y "Disponible en la Etapa 3". |
| `src/app/shared/infrastructure/clock/system-clock.spec.ts` | El punto 1. |
| `e2e/app.spec.ts` | El punto 6. |

## Fuera de alcance

- La pantalla de Inventario, la compra y el aporte: son de B2.3.
- Cambiar `DatabaseProvider` o la factory de la conexión.

## Verificación

Este bloque corre en paralelo con B2.1: **no corras `npm run build`**, porque los dos escribirían en `www/`. Compila el coordinador. `npm run test:e2e` levanta `ng serve` (no escribe en `www/`), así que sí puedes correrlo.

```
npm run lint
npm run test:unit
npm run test:e2e
```

Copia el resultado de cada uno, con el número de pruebas. Si falla algo en archivos de B2.1 (`src/app/inventario/`, `src/app/finanzas/application/` o `regla-negocio.error.ts`), anótalo, pero no lo toques.
