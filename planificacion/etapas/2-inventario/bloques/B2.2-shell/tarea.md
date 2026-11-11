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
