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

# Tarea V3 — Verificación independiente de la Etapa 3

**Etapa 3 (Clientes y punto de venta), ola 3.** Eres el verificador: **no corriges nada** en el repositorio. Solo lees, pruebas en una copia aparte y reportas un veredicto.

## Qué verificas

El plan completo: `planificacion/etapas/3-clientes-venta/PLAN.md`. Léelo **entero**, hasta el final del `## Log` (L1 a L13): los `S1`–`S14`, los ejemplos `E1`–`E21` (incluido `E3b`), las decisiones `D1`–`D16`, los puntos de "Por aprobar", las rutas permitidas de cada bloque y la excepción a RNF-05 (D15). Lee también `CLAUDE.md` (raíz): sus reglas 1 a 12 son parte de lo que verificas. Las tareas de cada bloque están en `planificacion/etapas/3-clientes-venta/bloques/*/tarea.md` (B3.1, B3.1-C, B3.2, B3.3, B3.4, B3.R); B3.0 lo hizo el coordinador (commit `57e4cbe`).

- Base (antes de la etapa): commit `7062315`.
- Candidato: el `HEAD` actual de la rama `feat/etapa-3-clientes-venta`.

## Rutas permitidas

Ninguna dentro del repositorio: **no crees, edites ni borres ningún archivo del repositorio**. Todo lo que necesites escribir va en una copia limpia fuera del repositorio:

1. Crea un directorio temporal con `mktemp -d` (o `New-Item` en `$env:TEMP` si no tienes `mktemp`).
2. Copia ahí el repositorio con `git clone <ruta del repo> <temp>/repo` y haz `git checkout` del commit `HEAD` del repositorio original.
3. En la copia: `npm ci` y, para el e2e, `npx playwright install chromium` si el navegador no está instalado (no uses la red para nada más).

## Qué hacer

1. **Comandos en la copia:** `npm run lint`, `npm run test:unit`, `npm run build` y `npm run test:e2e`. Copia el resultado de cada uno, con el número de pruebas.
2. **E1–E14, E16, E17 y E20 con pruebas propias por la API pública:** un archivo nuevo en la copia (por ejemplo `src/app/verificacion-v3.spec.ts`) que importe **solo** desde `src/app/clientes/**/index.ts` o las clases exportadas de `application/`, `src/app/ventas/index.ts`, `src/app/cartera/index.ts`, `src/app/inventario/index.ts`, `src/app/finanzas/index.ts` y `src/app/shared/domain/index.ts`, con `SqlJsDatabase` y las migraciones reales (`MIGRACIONES`). Arma el estado de partida del plan (aporte de $ 400.000 en efectivo, lote A Carta 2 cajas a $ 120.000 y lote B Carta 1 caja a $ 130.000) con los casos de uso, y reproduce cada ejemplo con sus números exactos y **todos** sus efectos: filas de `ventas`, `detalle_ventas`, `abonos`, `abonos_detalle_facturas`, `movimientos_dinero` y `clientes`; stock y estado de los lotes; saldos; y la invariante (`verificarInvariante`). Para E12 compara las 5 tablas antes y después. Para E17, dos `registrar` concurrentes. Si algo no se puede expresar con la API pública, eso es un hallazgo.
3. **E15, E18, E19 y E21 por la interfaz:** un e2e propio en la copia (por ejemplo `e2e/verificacion-v3.spec.ts`), con los datos cargados por la interfaz, que compruebe:
   - **E19:** la venta de E6 a Ana en **5 toques** (sin contar lo escrito) y con Mostrador en **3**; el resumen muestra los textos exactos del plan; **Volver a editar** no guarda nada;
   - **E15:** con precio o cantidad vacíos o en 0, **Confirmar venta** deshabilitado y el error en español junto al campo;
   - **E21:** escribir "3800" en el precio muestra "$ 3.800"; pegar "3800,50" deja el campo inválido con "Escribe el monto en pesos, sin decimales" y el botón deshabilitado; lo mismo en el costo por caja de la compra y el monto del aporte;
   - **E14:** el aviso "Precio por debajo del costo: pierdes $ 1.000";
   - **E13:** el lote agotado desaparece de Vender y de Inventario;
   - **E18:** si puedes provocar un fallo de carga (por ejemplo, rompiendo la consulta con `page.route` o con otra técnica que no cambie el código), el error con **Reintentar**; si no se puede, dilo y señala la prueba de componente que lo cubre;
   - **E3b por la interfaz:** crear a "Laura Ruiz" con el celular de Ana muestra "Ya existe un cliente con ese número de celular" junto al campo;
   - no hay errores en la consola en ninguno de estos flujos.
4. **Pruebas adversariales**, sin atajos (la app es *zoneless*: lo que no se ve en el navegador no cuenta): doble toque rápido en **Aceptar** del resumen → una sola venta (cuéntalas después en la pantalla o en la base); doble toque en **Guardar cliente** → un solo cliente; cerrar el resumen con el backdrop mientras guarda no lo cierra; editar el precio después de abrir y cerrar el resumen recalcula el total; con Mostrador elegido no se ofrece Fiado ni Abono inicial; la fecha no deja elegir mañana; después de una venta exitosa el cliente vuelve a Mostrador.
5. **Reglas de `CLAUDE.md`:** recorre cada formulario y vista nueva o cambiada (clientes, modal de cliente, Vender, resumen, campo de pesos, compra y aporte) y di para cada regla 1 a 11 si se cumple, con la línea de código o la prueba que lo respalda.
6. **Calidad de las pruebas del candidato** (regla 6 de `planificacion/comun/base.md` y regla 6 de `CLAUDE.md`): revisa las pruebas nuevas o cambiadas desde `7062315` y lista las que no prueban lo que dice su título, las que usan `toThrow()` o `rejects.toThrow()` a secas, las que usan `try/catch` para verificar un error, las que no usan el valor límite exacto y las que verifican un error solo con `toHaveBeenCalled` en lugar del texto exacto.
7. **Arquitectura:** `domain/` no importa Angular, Ionic, Capacitor ni SQLite; `ui/` no importa nada de `infrastructure/`; ninguna pantalla ni caso de uso usa `new Date()`; ningún código escribe en `movimientos_dinero` o `lotes_cajas` fuera de `LibroRepository` y `LoteRepository`; R-01 no se reimplementa fuera de `repartirPago`; no hay código muerto (regla 9).
8. **Rutas permitidas:** en el repositorio original, `git diff --name-only 7062315 HEAD`. Comprueba que cada archivo cae en las rutas permitidas de algún bloque (B3.1, B3.1-C, B3.2, B3.3, B3.4, B3.R), en las de B3.0 (`src/app/shared/domain/regla-negocio.error.ts`, `src/app/shared/ui/mensajes-error.ts` y su `.spec.ts`), en `src/app/shared/infrastructure/sqlite/database.provider.spec.ts` (ajuste del coordinador por la migración `002`) o en `planificacion/**`. Lista cualquier archivo fuera de ellas.

## Severidad

- **Bloqueante:** un defecto causado por esta etapa, o un `S#`/`E#`/`D#` que no se cumple, que se reproduce con datos realistas y que no se reproducía en `7062315`. También lo es ignorar en silencio una opción explícita con éxito, o cambiar una salida existente que nadie pidió cambiar.
- **Observación:** defectos que ya estaban en `7062315`, valores fuera de dominio y mejoras de estilo o legibilidad.

## Reporte

1. Resultado de cada comando (`<comando>: <resultado observado>`).
2. **Veredicto por cada `S1`–`S14`, `E1`–`E21` (y `E3b`) y `D1`–`D16`:** `cumple` / `no cumple` / `no verificable`, con la prueba o la línea de código que lo respalda.
3. Bloqueantes, cada uno con pasos para reproducirlo.
4. Observaciones.
5. La tabla de las reglas 1 a 11 de `CLAUDE.md` por pantalla.
6. Rutas fuera de lo permitido (o "ninguna").
7. Las pruebas que escribiste en la copia, **completas**, para que el coordinador pueda agregarlas como pruebas de regresión.
8. La ruta exacta del directorio temporal. **No lo borres**: lo borra el coordinador.

Cierra con una sección `## Key Learnings` de 1 a 5 puntos numerados, cada uno con un aprendizaje reutilizable en una oración completa. Omítela si no hubo ninguno.
