# Etapa 0 — Fundaciones

**Estado:** ✅ aprobado (L12), en curso · **Rama:** `feat/etapa-0-fundaciones` · **Entrega:** un PR a `main` · **Pruebas:** Vitest (`ng test`) + Playwright
**Objetivo:** dejar el proyecto listo para construir funcionalidades: identidad de la app Android, CI, tipos de dominio con montos enteros y una base SQLite con el esquema v1 corregido, migraciones y transacciones probadas.

## Qué hay hoy

- Plantilla de Ionic 9 + Angular 22 + Capacitor 8 con una sola página (`src/app/home/`).
- `capacitor.config.ts` todavía tiene `appId: 'io.ionic.starter'`.
- `.browserslistrc` incluye navegadores que Angular 22 ya no soporta (el build lo advierte).
- No hay CI, base de datos ni código de dominio.
- **Prototipo** en [`revision/`](revision/): el esquema v1 corregido y 6 pruebas con sql.js, **en verde dentro de `ng test`** (8/8 junto con las 2 de la plantilla, 2026-11-08).

## Specs

Citas textuales; si una cita y un bloque no coinciden, manda la cita.

| ID | Requisito | Fuente |
|----|-----------|--------|
| S1 | "El sistema se ejecutará como una aplicación móvil empaquetada para el sistema operativo **Android** mediante **Ionic + Angular + Capacitor**." | RNF-01 |
| S2 | "Todos los datos se almacenarán localmente en el dispositivo mediante una base de datos relacional (**SQLite**), garantizando disponibilidad del 100% sin requerir conexión a internet ni servidores externos." | RNF-02 |
| S3 | "Las operaciones compuestas (como una venta que descuenta stock de varios lotes o un abono en cascada que modifica múltiples facturas y actualiza los bolsillos de efectivo/transferencia) deberán ejecutarse dentro de transacciones atómicas de base de datos; si ocurre un error intermedio, ningún dato parcial se guardará para evitar descuadres contables." | RNF-03 |
| S4 | "El sistema restringirá estrictamente las cantidades de cajas y resmas a números enteros positivos (`INTEGER`), mientras que los valores monetarios (costos, precios, abonos y saldos en pesos) se manejarán como enteros exactos sin errores de redondeo de punto flotante." | RNF-04 |
| S5 | "Definir **Capital en caja = capital recuperado − compras pagadas con los bolsillos**. Además, fijar como regla que siempre cumpla **Efectivo + Transferencia = Capital en caja + Ganancia libre**, y verificarla con tests." | A1 (aprobada, L2) |
| S6 | "Reemplazarlo por un movimiento **Aporte de capital** que entra a un bolsillo. Así toda compra sale de Efectivo o Transferencia y el arqueo se puede rastrear." | A2 (aprobada, L2) |
| S7 | "Guardar en `abonos_detalle_facturas` cuánto de cada pago fue capital y cuánto ganancia." | A5 (aprobada, L2) |
| S8 | "**1 lote por compra** (10×N resmas), con la barra de progreso calculada como disponibles ÷ iniciales." | A6 (aprobada, L2) |
| S9 | Correcciones al modelo: "`CHECK(costo_por_caja % 10 = 0)`", "`saldo_pendiente = total_venta - monto_pagado`", "`monto_pagado <= total_venta`", "`resmas_disponibles <= resmas_iniciales`", "Sumar `ABONO_INICIAL` a `tipo_abono`", "reemplazar `'AMBOS'` por columnas de origen y destino", "Crear un cliente **\"Mostrador\"** para ventas de contado rápidas". | Corrección B (L2) |
| S10 | "Versionar el esquema y tener migraciones desde la v1. El import del backup (RNF-06) lo necesita." | Corrección B (L2) |
| S11 | "Agregaría GitHub Actions con `lint`, `test` y `build` como parte de la Etapa 0 del plan" | Propuesta 5 (L9) |
| S12 | "`io.ionic.starter` hay que cambiarlo **antes** del primer build de Android." | Análisis del stack (Por aprobar, punto 3) |

Las reglas contables completas están en [`../../comun/modelo-contable.md`](../../comun/modelo-contable.md). En esta etapa solo se crea el esquema; el motor que aplica las reglas llega en la Etapa 1.

## Decisiones

| # | Decisión | Por qué |
|---|----------|---------|
| D1 | **Libro único `movimientos_dinero`** en lugar de `retiros_y_movimientos`. | Con un libro, la invariante de S5 se verifica con una consulta y los saldos son sumas, no totales que se descuadran. |
| D2 | **CHECK con `typeof(col) = 'integer'`** en lugar de tablas `STRICT`. | `STRICT` requiere SQLite 3.37 y no está verificado qué versión trae el plugin en Android. `typeof` funciona en cualquier versión y ya está probado. |
| D3 | **Puerto `SqlDatabase`** con dos adaptadores: Capacitor (app) y sql.js (pruebas). | Los repositorios se prueban con SQL real sin teléfono, y el dominio no depende del plugin. |
| D4 | **Migraciones propias con `PRAGMA user_version`**, una transacción por migración. | Las controlamos y probamos nosotros, sin depender de la versión del plugin, y el import del backup (Etapa 6) puede validar la versión. |
| D5 | **Las anulaciones (A7) quedan para la migración v2** (Etapa 6), no como columnas de v1. | v1 contiene solo lo que se usa. Además, la v2 ejercita de verdad el sistema de migraciones. |
| D6 | **Se elimina `.browserslistrc`** para usar los navegadores por defecto de Angular 22. | La WebView de Android se actualiza como Chrome; la lista heredada de Ionic solo genera advertencias. |
| D7 | **El CI corre `lint`, `test:unit` y `build`.** El e2e entra cuando haya interfaz (Etapa 2). | El e2e necesita instalar navegadores y hoy no prueba nada propio. |

## Bloques

| ID | Bloque | Specs | Ruta | Agente | Ola |
|----|--------|-------|------|--------|-----|
| B0.1 | Configuración del proyecto | S1, S11, S12 | delegado | `agy` · `gemini-3.8-flash-high` | 1 |
| B0.3 | Tipos de dominio compartidos | S4 | delegado | `agy` · `gemini-3.8-flash-high` | 1 |
| B0.2 | Persistencia SQLite | S2–S10 | delegado | `agy` · `gemini-3.8-flash-high` | 2 |
| V0 | Verificación independiente | S1–S12 | delegado | `agy` · `gemini-4-argon-medium` | 3 |

**Por qué delegar y en olas:** tu forma de trabajar indica que el código lo escribe `agy` y el coordinador revisa. B0.1 y B0.3 no comparten archivos y corren en paralelo. B0.2 va sola en la ola 2 porque instala dependencias, y un `npm install` en paralelo rompería las pruebas de los otros bloques.

### B0.1 — Configuración del proyecto

- **Rutas permitidas:** `capacitor.config.ts`, `.browserslistrc` (para borrarlo), `.github/workflows/ci.yml`
- **Qué hacer:**
  - `appId` y `appName` según lo que apruebes en "Por aprobar" (punto 3).
  - Borrar `.browserslistrc`.
  - Crear el workflow `ci.yml`, que se dispara en cada `pull_request` y en cada `push` a `main`, sobre Node 24 en `ubuntu-latest`, y corre `npm ci`, `npm run lint`, `npm run test:unit` y `npm run build`.
- **Verificación:** `npm run build` ya no muestra "Unsupported browsers"; los tres comandos pasan.

### B0.3 — Tipos de dominio compartidos

- **Rutas permitidas:** `src/app/shared/domain/**` y `src/app/shared/infrastructure/clock/**` (el reloj del sistema que implementa el puerto `Clock`)
- **Qué hacer:** tipos con marca (*branded types*) y funciones constructoras que validan, sin dependencias de Angular:

| Tipo | Regla |
|------|-------|
| `Pesos` | Entero seguro (`Number.isSafeInteger`). Suma y resta sin decimales. Formato `es-CO`: `125000` → `"$ 125.000"`. |
| `Resmas` y `Cajas` | Enteros positivos; `cajasAResmas(n) = n × 10`. |
| `MedioPago` | `'EFECTIVO' \| 'TRANSFERENCIA'` |
| `TipoPapel` | `'CARTA' \| 'OFICIO'` |
| `Clock` (puerto) | `ahora()` devuelve `YYYY-MM-DD HH:MM:SS` en hora local. El dominio nunca llama a `new Date()` directamente. |

- **Pruebas:** rechaza `1.5`, `NaN`, `Infinity`, negativos donde no aplican y valores fuera del rango seguro; formato con miles; conversión de cajas a resmas.

### B0.2 — Persistencia SQLite

- **Rutas permitidas:**
  - `package.json` y `package-lock.json`
  - `angular.json` (solo para copiar el `.wasm` de sql.js a los assets de la versión web)
  - `src/main.ts`, donde se registran los providers
  - `src/app/shared/infrastructure/sqlite/**`
  - `src/testing/**`
  - `e2e/app.spec.ts`
- **Dependencias:** `@capacitor-community/sqlite@8.1.1` (dependencia) y `sql.js@1.15.2` + `@types/sql.js` (desarrollo).
- **Qué hacer:**
  1. **Puerto `SqlDatabase`:** `query`, `run` y `transaction(work)`. Si `work` lanza un error, se hace rollback y el error se propaga. Dentro de la transacción solo se usa el ejecutor que recibe `work`.
  2. **Adaptador Capacitor:** abre la base `gestor_resmas`, activa `PRAGMA foreign_keys = ON` y respeta las trampas de `base.md` (`transaction=false` dentro de la transacción manual y `saveToStore` en web).
  3. **Adaptador sql.js** en `src/testing/`, con la misma interfaz y en memoria.
  4. **`MigrationRunner`:** aplica en orden las migraciones con versión mayor que `PRAGMA user_version`, cada una en su transacción, y actualiza `user_version`. Correrlo dos veces no cambia nada.
  5. **Migración `001`:** el DDL de [`revision/schema-v1.ts`](revision/schema-v1.ts) tal cual, más el cliente Mostrador.
  6. **Inicialización al arrancar la app** con `provideAppInitializer`: abrir la base y migrar.
- **Pruebas (con el adaptador sql.js):**
  - Pasar las 6 pruebas del prototipo a la migración real.
  - La migración deja `user_version = 1` y el cliente Mostrador; correrla dos veces es idempotente.
  - `transaction` hace rollback de todo cuando `work` lanza un error, y el error llega a quien llamó.
  - No se pueden crear dos clientes Mostrador.
- **e2e:** la app carga en el navegador sin errores de consola después de inicializar la base.

### V0 — Verificación independiente

**Por qué hay verificación independiente:** el riesgo es el ítem 5 (CI y dependencias nuevas).

V0 lee este plan completo y prueba en una copia limpia (`mktemp -d`), no en el repo:

- corre `npm ci`, `npm run lint`, `npm run test:unit`, `npm run test:e2e` y `npm run build`;
- da un veredicto por cada `S#`;
- comprueba que ningún archivo fuera de las rutas permitidas cambió.

## Verificación del coordinador

1. Antes de cada ola, anotar `git rev-parse HEAD`; al terminar, comprobar que `agy` no hizo commits y revisar `git diff` contra las rutas permitidas.
2. Volver a correr uno de los comandos que reporte V0.
3. Correr `gentle-ai review assess` después de cada commit; el modo receipt-driven está activo.
4. Abrir el PR y esperar el CI en verde. Después, agregar el job de CI como check obligatorio en la protección de `main`.

## Commits

En el orden en que se aplican, según `commits-atomicos`:

1. `chore: navegadores soportados por defecto en Angular 22`
2. `chore: identificador de la app Android`
3. `chore: CI con lint, pruebas unitarias y build`
4. `feat: tipos de dominio para pesos, resmas, medios de pago y fecha`
5. `feat: base de datos SQLite con migraciones y esquema v1`
6. `docs: README con la base de datos local`

El reporte de la etapa va en Engram (`etapas/0-fundaciones/reporte`), no en un `REPORTE.md`.

## Por aprobar

✅ Los 7 puntos fueron aprobados tal cual (L12).

1. **Arquitectura** por funcionalidad con capas hexagonales, y la convención de nombres (dominio en español, sufijos técnicos en inglés). Detalle en [`../../comun/base.md`](../../comun/base.md).
2. **D1: libro único `movimientos_dinero`**, que reemplaza a `retiros_y_movimientos`.
3. **Identidad de la app**, que es permanente una vez publicada: propongo `appId: 'com.miguelmedina.gestorresmas'` y `appName: 'Gestor de Resmas'`.
4. **Hoja de ruta** de las etapas 0 a 7 del [`README`](../../README.md).
5. **D5:** las anulaciones van en la migración v2 (Etapa 6).
6. **D6 y D7:** borrar `.browserslistrc`, y CI sin e2e por ahora.
7. **Aviso para la Etapa 7:** compilar para Android requiere instalar el Android SDK y JDK 21. Hoy no hay SDK y Java es la 25.

## Log

Mensajes del usuario copiados textualmente; las notas del coordinador van entre corchetes.

- **L1** (2026-11-08): "Opus vamos a comenzar a planificar el trabajo por etapas de este repositorio, dentro de una carpeta de nombre planificacion te he dejado los requisitos funcionales y no funcionales, además de toda la arquitectura pensada hasta el momento para el proyecto. Quiero que te apoyes de gentle-ai y si lo ves necesario de subagentes para lectura. Cualquier propuesta que tengas o corrección que veas me puedes comentar para tomar la decisión"
- **L2** (2026-11-08): "Dale apruebo tus recomendaciones de la 1 a 7, quiero que hagas el plan. Te hago una pregunta la organización por etapas que propone la skill es igual de eficiente a nivel de organización que lo propuesto por gentle-ai?" [Aprueba A1–A7; las correcciones B quedaron aceptadas por no objetarlas. Detalle de cada una en `comun/modelo-contable.md`.]
- **L3** (2026-11-08): "Quiero que primero me respondas la pregunta, antes de que hagas el plan porque si me gusta más una o otra puede que tengas que reescribir el plan"
- **L4** (2026-11-08): "Si, me interesa el hibrido especialmente por la parte de trazabilidad de requisitos. Quiero saber si puedes usar engram en lugar de usar el archivo de reportes que propone la skill, ya que engram precisamente permite ir llevando el control de lo que se ha hecho en el repositorio, además quiero saber si cuando llames un agente de agy, ese puede leer y escribir sobre el mismo engram que usas tu" [Formato híbrido: la estructura de la skill `planificacion-por-etapas` con Specs y Log de ODD; los reportes van a Engram.]
- **L5** (2026-11-08): "Vale, primero te tengo que aclarar que este proyecto lo voy a trabajar con Juan, de ese modo, yo sé que existe una forma de poder compartir el engram entre nosotros para que el pueda leer lo que tienes registrado en el engram y así cuando el vaya a trabajar tenga toda la información completa. Concuerdo con lo que dices de que es mejor que agy solo pueda leer el engram y no escribir, así que por favor configura esta función para agy." [`agy` lee Engram en modo solo lectura; configurado y verificado.]
- **L6** (2026-11-08): "https://github.com/MiguelMD06/gestor-resmas.git, este es el link del repositorio remoto, añade una licencia MIT y un readme. Además como tu dices tenemos que añadir planificación dentro del repo porque Juan la necesita" [`planificacion/` se versiona en el repo.]
- **L7** (2026-11-08): "Autorizo que crees la rama, con lo respectivo al repo público no veo el problema ya que el engram solo tiene lo que se ha hecho en el proyecto, y este es un proyecto personal que no tengo problema en compartir con los demás además que me sirve para aumentar mi portafolio de trabajo" [Memorias compartidas en `.engram/`.]
- **L8** (2026-11-08): "Ya mi main local quedo sin planificación, el pr ya quedo marcado como listo para hacer merge, revisa si todo esta bien para dejar listo el repositorio remoto"
- **L9** (2026-11-08): "Haz todo incluso el merge te lo apruebo por esta vez, para dejar de una vez por todas esto organizado una vez termines me explicas que hiciste para yo saber" [PR #1 integrado. El CI (S11) se dejó para esta etapa, porque todo plan se aprueba antes de implementarse.]
- **L10** (2026-11-08): "Si" [Pedido para escribir el plan.]
- **L11** (2026-11-08): [Prototipo: `revision/schema-v1.spec.ts`, 8/8 en verde con `ng test` y sql.js 1.15.2. Detectado: el build advierte "Unsupported browsers" por `.browserslistrc`.]
- **L12** (2026-11-08): "Si apruebo estos 7 puntos" [Plan aprobado. Antes, ante el pedido de consentimiento de gentle-ai para el PR #2, el usuario eligió "Omitir esta vez" (`declined_this_candidate`).]
- **L13** (2026-11-08): [Ajustes al aprobar: Node 24 en el CI (es la versión local); los providers están en `src/main.ts`, porque no hay `app.config.ts`; el reloj del sistema pasa a B0.3 (`shared/infrastructure/clock/**`) y B0.2 se limita a `shared/infrastructure/sqlite/**`, para que ninguna ruta sea de los dos bloques.]
