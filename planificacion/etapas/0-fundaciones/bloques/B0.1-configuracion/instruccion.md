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

# Tarea B0.1 — Configuración del proyecto

**Etapa 0 (Fundaciones), ola 1.** Otro agente trabaja en paralelo en `src/app/shared/**`: no toques nada de ahí.

## Objetivo

Darle a la app su identidad Android definitiva, quitar la lista de navegadores heredada y agregar un CI en GitHub Actions.

## Specs que cubres

| ID | Requisito (cita textual) |
|----|--------------------------|
| S1 | "El sistema se ejecutará como una aplicación móvil empaquetada para el sistema operativo **Android** mediante **Ionic + Angular + Capacitor**." |
| S11 | "Agregaría GitHub Actions con `lint`, `test` y `build` como parte de la Etapa 0 del plan" |
| S12 | "`io.ionic.starter` hay que cambiarlo **antes** del primer build de Android." |

## Rutas permitidas

```
capacitor.config.ts
.browserslistrc
.github/workflows/ci.yml
```

Prohibido todo lo demás, incluidos `package.json` y `src/**`.

## Qué hacer

1. **`capacitor.config.ts`:**
   - `appId: 'com.miguelmedina.gestorresmas'`
   - `appName: 'Gestor de Resmas'`
   - deja `webDir: 'www'`.

   Hoy Prettier marca este archivo como mal formateado; déjalo pasando `npx prettier --check capacitor.config.ts`, formateando **solo ese archivo**.
2. **Borra `.browserslistrc`.** El build de Angular 22 lo advierte con "Unsupported browsers". Sin el archivo se usan los navegadores por defecto de Angular.
3. **Crea `.github/workflows/ci.yml`:**
   - Nombre del workflow: `CI`. Un único job llamado `verify`.
   - Disparadores: `pull_request` (cualquier rama) y `push` a `main`.
   - `runs-on: ubuntu-latest`, `actions/checkout@v4`, `actions/setup-node@v4` con `node-version: 24` y `cache: npm`.
   - Pasos, en este orden: `npm ci`, `npm run lint`, `npm run test:unit`, `npm run build`.
   - Agrega `concurrency` por rama (`group: ci-${{ github.ref }}`, `cancel-in-progress: true`) y `permissions: contents: read`.
   - Sin e2e: queda para la Etapa 2.

## Verificación

1. `npm run build`: su salida **no** contiene "Unsupported browsers".
2. `npm run lint`, `npm run test:unit` y `npm run build` pasan.
3. Valida que el YAML esté bien formado, por ejemplo con `node -e "require('fs').readFileSync('.github/workflows/ci.yml','utf8')"` más una revisión visual de la indentación.

## Fallos conocidos

`npm run lint` puede fallar mientras el otro agente de la ola trabaja en `src/app/shared/**`. Si el único error de Prettier o ESLint está dentro de `src/app/shared/**`, repórtalo como ajeno a tu bloque y no lo arregles.
