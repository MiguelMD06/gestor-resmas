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
| Base de datos | `@capacitor-community/sqlite` 8.x en la app y `sql.js` en las pruebas |

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
- **Nombres:** los conceptos de dominio van en español, igual que el esquema (`Lote`, `Venta`, `registrarAbono`). Los sufijos técnicos van en inglés (`*.port.ts`, `*.adapter.ts`, `*.repository.ts`, `*.spec.ts`). Los comentarios y los textos de las pruebas, en inglés.
- Para el estado compartido, reutiliza la función que ya existe. Nunca reimplementes con otra forma un paso que ya tiene función (por ejemplo, registrar un movimiento de dinero).

## Reglas de trabajo

1. **Solo tocas las rutas permitidas** de tu tarea. Si necesitas otra, no la toques: detente y explícalo en el reporte.
2. **No uses git:** nada de `commit`, `add`, `stash`, `checkout` ni `push`. El coordinador revisa y hace los commits.
3. **Pruebas primero** cuando haya una regla con resultado esperado claro: escribe la prueba, mírala fallar (RED), implementa (GREEN) y refactoriza con las pruebas en verde. Escribe una prueba por cada regla que pide la tarea, y cada prueba verifica todos los efectos observables de la regla.
4. **Archivos temporales** fuera del repositorio. Si alguno queda dentro, informa su ruta exacta.
5. **No instales dependencias** salvo que la tarea lo pida, y nunca corras formateadores, generadores ni instalaciones sobre todo el repositorio.
6. **Engram:** tienes acceso de solo lectura. Úsalo si te sirve para tener contexto; nunca intentes escribir en él.

## Trampas conocidas del stack

- **`@capacitor-community/sqlite`:** dentro de una transacción manual (`beginTransaction` / `commitTransaction` / `rollbackTransaction`), llama a `run`, `execute` y `executeSet` con `transaction = false`. Si no, el plugin abre su propia transacción.
- **En web (jeep-sqlite)**, después de cada commit hay que llamar a `saveToStore(nombreBD)`, o los datos se pierden al recargar.
- **En web, jeep-sqlite 2.8 trae empaquetado el JS de sql.js 1.11** y necesita el `.wasm` de **esa** versión; el de sql.js 1.15 falla al cargar. Por eso `angular.json` copia `sql-wasm.wasm` desde `node_modules/sql.js-jeep-wasm/dist` (alias de `sql.js@1.11.0`). No lo cambies por el de `sql.js`, que es 1.15 y solo se usa en las pruebas.
- **`sql.js` funciona dentro de `ng test`** con `await initSqlJs()` sin configuración extra (verificado con la versión 1.15.2).
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

# Tarea V0 — Verificación independiente de la Etapa 0

**Etapa 0 (Fundaciones), ola 3.** Eres el **verificador**: no escribes ni corriges código del proyecto. Solo pruebas y reportas.

## Objetivo

Comprobar en una copia limpia que la Etapa 0 cumple cada `S#` de su plan, y dar un veredicto por cada uno.

## Qué leer primero

1. `planificacion/etapas/0-fundaciones/PLAN.md` completo, hasta el final del `## Log`.
2. `planificacion/comun/modelo-contable.md`.
3. Las tareas de los bloques en `planificacion/etapas/0-fundaciones/bloques/*/tarea.md`.

## Rutas permitidas

**Ninguna dentro del repositorio.** Trabaja en una copia:

```bash
SCRATCH=$(mktemp -d)
git -C <repo> archive HEAD | tar -x -C "$SCRATCH"
cd "$SCRATCH" && npm ci
```

Lo único que puedes leer del repositorio original es `git diff <base>..HEAD --name-only` para el control de rutas. La base (`<base>`) te la da el coordinador al final de esta tarea.

## Qué verificar

1. **Comandos**, en la copia: `npm run lint`, `npm run test:unit`, `npm run test:e2e` (instala Chromium con `npx playwright install chromium` si falta) y `npm run build`. Copia el resultado de cada uno: cuántas pruebas, cuántas pasaron, si hubo errores o advertencias.
2. **Pruebas de comportamiento** con un script tuyo **dentro de la copia** (por ejemplo `scratch-probe.spec.ts`, que corres con `ng test`), que usa la API pública:
   - Con `SqlJsDatabase` y `migrar`: insertar un lote con `costo_por_caja = 125005` falla; insertar una venta con sobrepago falla; un `RETIRO_GANANCIA` con `delta_capital ≠ 0` falla.
   - Una `transaction` que inserta un `APORTE_CAPITAL` y después lanza un error deja 0 filas en `movimientos_dinero`.
   - `migrar` sobre una base con `user_version = 9` lanza el error de versión más nueva, y el hash del contenido (`SELECT group_concat(name) FROM sqlite_master`) no cambia.
   - `pesos(1.5)` y `cajas(0)` lanzan error; `formatearPesos(pesos(1234567))` devuelve `"$ 1.234.567"`.
   - `capacitor.config.ts` tiene `appId` `com.miguelmedina.gestorresmas` y `appName` `Gestor de Resmas`.
   - `.browserslistrc` no existe y la salida del build no contiene "Unsupported browsers".
   - `.github/workflows/ci.yml` se dispara en `pull_request` y en `push` a `main`, usa Node 24 y corre `npm ci`, `lint`, `test:unit` y `build`.
   - `src/app/shared/domain/**` no importa `@angular`, `@ionic`, `@capacitor` ni `sql.js`.
3. **Control de rutas:** compara `git diff <base>..HEAD --name-only` con la unión de las rutas permitidas de B0.1, B0.2 y B0.3, más `planificacion/**`, `.gitattributes`, `.vscode/extensions.json` y `README.md`. Lista cualquier archivo que esté fuera.

## Severidad

- **Bloqueante:** un defecto causado por esta etapa, o un `S#` sin cumplir, que se reproduce con datos realistas y no ocurría en la base.
- **Advertencia:** un defecto que ya ocurría en la base, o que solo aparece con valores fuera del dominio.
- Ignorar en silencio una opción explícita, o cambiar una salida existente que nadie pidió cambiar, es **siempre bloqueante**.

## Reporte

1. Tabla con `S1` a `S12`: veredicto (`cumple`, `no cumple` o `no verificable`) y evidencia (comando o prueba, y resultado).
2. Resultado de los 4 comandos.
3. Bloqueantes y advertencias, cada uno con cómo reproducirlo.
4. La ruta exacta de `$SCRATCH`, para que el coordinador la borre. **No la borres tú.**

## Datos del coordinador

- **Repositorio (`<repo>`):** `C:\Users\MIGUEL ANGEL\Documents\PROYECTOS MIGUEL MEDINA DIAZ\gestor-resmas\.claude\worktrees\plan-etapas`, rama `feat/etapa-0-fundaciones`, HEAD `8cced20`.
- **Base (`<base>`):** `e27cffe714f4cbed15ca72e02c01f2fdad5b4bc4`, la punta de `docs/plan-etapas`.
- **Rutas extra aceptadas en el control de rutas:** `.gitattributes` y `.vscode/extensions.json` (cambio de finales de línea, L14), y `README.md`.
- **Ajuste del coordinador sobre B0.2 (L16):** el `.wasm` web sale de `node_modules/sql.js-jeep-wasm/dist` (alias de `sql.js@1.11.0`). Verifica que `www/assets/sql-wasm.wasm` tenga el mismo md5 que ese archivo, y que **no** exista ningún `.wasm` dentro de `src/`.
- **Memoria:** la máquina tiene poca. Corre un comando por vez, en primer plano, y cierra `ng serve` y el navegador al terminar el e2e.
