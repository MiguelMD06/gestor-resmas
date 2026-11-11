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

# Tarea V2 — Verificación independiente de la Etapa 2

**Etapa 2 (Inventario y aportes de capital), ola 3.** Eres el verificador: **no corriges nada** en el repositorio. Solo lees, pruebas en una copia aparte y reportas un veredicto.

## Qué verificas

El plan completo: `planificacion/etapas/2-inventario/PLAN.md`. Léelo **entero**, hasta el final del `## Log`: los `S1`–`S12`, los ejemplos `E1`–`E9`, las decisiones `D1`–`D6`, los 7 puntos de "Por aprobar" (aprobados en `L4`), las rutas permitidas de cada bloque y la entrada `L5` (ajustes de la ola 2). Las tareas que recibió cada bloque están en `planificacion/etapas/2-inventario/bloques/*/tarea.md` (B2.1, B2.2, B2.R, B2.3 y su corrección B2.3-C).

- Base (antes de la etapa): commit `54356df`.
- Candidato: el `HEAD` actual de la rama `feat/etapa-2-inventario`.

## Rutas permitidas

Ninguna dentro del repositorio: **no crees, edites ni borres ningún archivo del repositorio**. Todo lo que necesites escribir va en una copia limpia fuera del repositorio:

1. Crea un directorio temporal con `mktemp -d` (o `New-Item` en `$env:TEMP` si no tienes `mktemp`).
2. Copia ahí el repositorio con `git clone <ruta del repo> <temp>/repo` y haz `git checkout` del commit `HEAD` del repositorio original.
3. En la copia: `npm ci` y, para el e2e, `npx playwright install chromium` si el navegador no está instalado (no uses la red para nada más).

## Qué hacer

1. **Comandos en la copia:** `npm run lint`, `npm run test:unit`, `npm run build` y `npm run test:e2e`. Copia el resultado de cada uno, con el número de pruebas.
2. **Ejemplos E1–E7 con una prueba propia:** escribe en la copia un archivo nuevo (por ejemplo, `src/app/verificacion-v2.spec.ts`) que importe **solo la API pública** (`src/app/inventario/index.ts`, `src/app/finanzas/index.ts` o sus `index.ts` de capa, y `src/app/shared/domain/index.ts`) y reproduzca E1 a E7 con los números exactos del plan, usando `SqlJsDatabase` y la migración real (mira cómo lo hacen las pruebas existentes de `registrar-compra.spec.ts`). Para E4, verifica que `lotes_cajas` y `movimientos_dinero` quedan exactamente como estaban. Córrelo con `npx ng test --no-watch --include=src/app/verificacion-v2.spec.ts` (o el mecanismo equivalente que funcione) y copia el resultado. Si algo no se puede expresar con la API pública, eso es un hallazgo.
3. **E8 y E9 por la interfaz:** escribe en la copia un e2e propio (por ejemplo, `e2e/verificacion-v2.spec.ts`) que:
   - **E8:** cargue por la interfaz los datos necesarios (aportes y compras) para tener un lote Carta y uno Oficio, y compruebe que el segmento **Carta** muestra solo los lotes Carta, el segmento **Oficio** solo los Oficio, y que cada tarjeta muestra la fecha de ingreso, "N de M resmas" y el costo por resma. El 70 % y el lote agotado de E8 no se pueden armar por la interfaz en esta etapa (todavía no hay ventas): para esa parte, señala qué prueba de componente existente lo cubre y si de verdad lo verifica.
   - **E9:** si se puede provocar que la base no abra en el navegador (por ejemplo, interceptando con `page.route` la descarga de `sql-wasm.wasm` para que falle la primera vez), comprueba que se ve la pantalla de error con **Reintentar** y que, al reintentar con la descarga ya permitida, aparecen las pestañas. Si no se puede provocar, dilo y señala la prueba de componente que lo cubre.
4. **Pruebas adversariales de la interfaz**, en el e2e propio, **sin** atajos de prueba (la app es *zoneless*: lo que no se ve en el navegador no cuenta):
   - en **Nueva compra**, al escribir la cantidad y el costo, la vista previa (saldo, costo total y costo por resma) se actualiza **sin** otra interacción;
   - el aviso de reinversión de E3 aparece en pantalla, con el monto, antes de **Guardar compra** (arma los saldos de E3 por la interfaz si se puede; si no, explica por qué y qué prueba lo cubre);
   - con saldo insuficiente, **Guardar compra** queda deshabilitado y **Aportar capital** abre el aporte; al volver con el aporte guardado, la vista previa se recalcula y el botón se habilita;
   - con un costo por caja de `120005` se ve el mensaje en español de `COSTO_CAJA_INVALIDO`, y con `0` cajas el de `CANTIDAD_INVALIDA`;
   - después de guardar una compra con una fecha elegida distinta de hoy, la tarjeta muestra esa fecha;
   - no hay errores en la consola en ninguno de estos flujos.
5. **Calidad de las pruebas del candidato** (regla 6 de `planificacion/comun/base.md`): revisa las pruebas nuevas o cambiadas desde `54356df` y lista las que no prueban lo que dice su título, las que usan `toThrow()` o `rejects.toThrow()` a secas, las que usan `try/catch` para verificar un error y las que no usan el valor límite exacto.
6. **Arquitectura:** `domain/` no importa Angular, Ionic, Capacitor ni SQLite; `ui/` no importa nada de `infrastructure/` (solo `application/`, `domain/` y `shared/`); ninguna pantalla usa `new Date()` (las fechas salen del token `CLOCK`); los textos de error que ve el usuario salen de `src/app/shared/ui/mensajes-error.ts`.
7. **Rutas permitidas:** en el repositorio original, `git diff --name-only 54356df HEAD`. Comprueba que cada archivo cae en las rutas permitidas de algún bloque (B2.1, B2.2, B2.R, B2.3, B2.3-C) o en `planificacion/**` (documentación del coordinador). Lista cualquier archivo fuera de ellas.

## Severidad

- **Bloqueante:** un defecto causado por esta etapa, o un `S#`/`E#` que no se cumple, que se reproduce con datos realistas y que no se reproducía en `54356df`. También lo es ignorar en silencio una opción explícita con éxito, o cambiar una salida existente que nadie pidió cambiar.
- **Observación:** defectos que ya estaban en `54356df`, valores fuera de dominio y mejoras de estilo o legibilidad.

## Reporte

1. Resultado de cada comando (`<comando>: <resultado observado>`).
2. **Veredicto por cada `S1`–`S12` y `E1`–`E9`:** `cumple` / `no cumple` / `no verificable`, con la prueba o la línea de código que lo respalda.
3. Bloqueantes, cada uno con pasos para reproducirlo.
4. Observaciones.
5. Rutas fuera de lo permitido (o "ninguna").
6. Las pruebas que escribiste en la copia, **completas**, para que el coordinador pueda agregarlas como pruebas de regresión.
7. La ruta exacta del directorio temporal. **No lo borres**: lo borra el coordinador.

Cierra con una sección `## Key Learnings` de 1 a 5 puntos numerados, cada uno con un aprendizaje reutilizable en una oración completa. Omítela si no hubo ninguno.
