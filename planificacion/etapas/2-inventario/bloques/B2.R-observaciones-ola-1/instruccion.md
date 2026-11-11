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

# Tarea B2.R — Observaciones de la revisión de la ola 1

**Etapa 2, después de la ola 1.** Trabajas solo. La revisión nativa de la ola 1 (B2.1 y B2.2) se aprobó sin bloqueantes, pero dejó observaciones de legibilidad y confiabilidad. Las corriges antes de la ola 2. **No cambias ningún comportamiento visible**, salvo lo que se indica en el punto 1. El plan está en `planificacion/etapas/2-inventario/PLAN.md`.

## Rutas permitidas

```
src/app/shell/error-arranque.component.ts
src/app/shell/error-arranque.component.spec.ts
src/app/shell/tabs.page.ts
src/app/shell/proximamente.page.ts
src/app/shell/proximamente.page.spec.ts
src/app/app.component.spec.ts
src/app/inventario/domain/lote.ts
src/app/inventario/infrastructure/lote.repository.ts
src/app/inventario/application/registrar-compra.ts
src/app/inventario/application/registrar-compra.spec.ts
e2e/app.spec.ts
```

Prohibido todo lo demás.

## Qué hacer

| # | ID | Dónde | Qué cambiar |
|---|----|-------|-------------|
| 1 | R2-dead-cargando-branch y R3-unreachable-retry-spinner | `src/app/shell/error-arranque.component.ts:13-18` | Este componente solo se muestra cuando `estado()` es `'error'`. Al tocar **Reintentar**, el estado pasa a `'cargando'` y `app.component` lo reemplaza por su propio spinner, así que el `@if (... === 'cargando')` y el `[disabled]` nunca se ven. Quita los dos (y `IonSpinner` de los `imports` si ya no se usa). Si alguna prueba verificaba ese spinner o el `disabled`, cámbiala por una que compruebe que, en `app.component`, al reintentar se ve el spinner global mientras el estado es `'cargando'`. |
| 2 | R2-duplicate-icon-registration | `src/app/shell/tabs.page.ts:37-46` | Registra cada ícono una sola vez: `addIcons({ walletOutline, cartOutline, cubeOutline, peopleOutline })`. `ionicons` convierte el nombre camelCase al nombre con guiones que usa la plantilla (`wallet-outline`, etc.). |
| 3 | R2-duplicated-select-columns | `src/app/inventario/infrastructure/lote.repository.ts` | La lista de columnas del `SELECT` aparece repetida en `activos`, `porId` (y en cualquier otro `SELECT` del archivo). Sácala a una constante del módulo (por ejemplo, `const COLUMNAS_LOTE = \`id_lote, tipo_papel, ...\``) y úsala en todos. El SQL resultante debe ser equivalente. |
| 4 | R2-getter-returns-closure | `src/app/shell/proximamente.page.ts:25-31` | `displayTitulo` y `displayEtapa` son getters que devuelven una función. Reemplázalos por `computed(() => ...)` con la misma lógica, y ajusta la plantilla para que los llame como signals (`displayTitulo()`). |
| 5 | R2-magic-reams-per-box | `src/app/inventario/domain/lote.ts:47-57` | Usa `RESMAS_POR_CAJA` de `shared/domain` en lugar del `10` literal, tanto en `% 10` como en `/ 10`, y también en el mensaje de error. |
| 6 | R2-preview-sentinels | `src/app/inventario/application/registrar-compra.ts:19` y `:66-75` | La fecha `'2000-01-01 00:00:00'` y el `idLote` `0` que se le pasan a `compraLote` en `previsualizar` son valores de relleno que nunca se guardan. Dales nombre con constantes del módulo (`FECHA_PREVISUALIZACION`, `ID_LOTE_PREVISUALIZACION = 0`) y un comentario en inglés de una línea que explique que `compraLote` los pide para armar el movimiento, pero `previsualizar` solo lee `reinversion` y descarta el movimiento. |
| 7 | R3-registrar-validation-path | `src/app/inventario/application/registrar-compra.ts:37` | Comprueba si `registrar-compra.spec.ts` ya tiene una prueba de que `registrar` (no `previsualizar`) rechaza E5 (`COSTO_CAJA_INVALIDO`, costo por caja $120.005) y E6 (`CANTIDAD_INVALIDA`, 0 cajas) **sin dejar filas** en `lotes_cajas` ni en `movimientos_dinero`. Si falta alguna de esas aserciones, agrégala. Si ya está completa, no cambies nada e indícalo en el reporte con el nombre de la prueba. |
| 8 | R3-wildcard-route-untested | `src/app/app.routes.ts:11-14` | Agrega una prueba en `e2e/app.spec.ts`: abrir `/no-existe` termina en `/inventario`. |

La observación `R2-unused-clock-provider` (`src/main.ts:29-32`) **no** se cambia: el `CLOCK` lo va a usar la ola 2 (B2.3).

Sigue la regla 6 en las pruebas que toques o agregues.

## Verificación

```
npm run lint
npm run test:unit
npm run build
npm run test:e2e
```

Copia el resultado de cada uno, con el número de pruebas. Indica, para cada punto 1 a 8, qué cambiaste (o por qué no hizo falta).
