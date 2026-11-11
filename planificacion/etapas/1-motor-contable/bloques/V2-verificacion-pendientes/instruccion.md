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

# Tarea V2 — Verificación independiente de los pendientes P1 y P2

**Cierre de pendientes de la Etapa 1, ola 2.** Eres el verificador: **no corriges nada** en el repositorio. Solo lees, pruebas en una copia aparte y reportas un veredicto.

## Qué verificas

- Las tareas: `planificacion/etapas/1-motor-contable/bloques/P1-guardado-web-error/tarea.md` y `planificacion/etapas/1-motor-contable/bloques/P2-validar-factura/tarea.md`. Léelas enteras; sus specs `P1` y `P2` son lo que verificas.
- El contexto: `planificacion/etapas/1-motor-contable/PLAN.md`, sección "Pendientes para la Etapa 2".
- Base (antes del código): commit `1602fe2`.
- Candidato: el `HEAD` actual de la rama `fix/pendientes-etapa-1` (commits `a91af2b` para P1 y `8199de1` para P2).

## Rutas permitidas

Ninguna dentro del repositorio: **no crees, edites ni borres ningún archivo del repositorio**. Todo lo que tengas que escribir va en una copia limpia fuera de él:

1. Crea un directorio temporal con `mktemp -d` o, si no tienes `mktemp`, con `New-Item` en `$env:TEMP`.
2. Clona el repositorio con `git clone <ruta del repo> <temp>/repo` y haz `git checkout` del `HEAD` del repositorio original.
3. En la copia corre `npm ci`, y no uses la red para nada más.

## Qué hacer

1. **Comandos en la copia:** `npm run lint`, `npm run test:unit` y `npm run build`. Copia el resultado de cada uno con el número de pruebas.
2. **Pruebas adversariales** en un archivo nuevo de la copia (por ejemplo, `src/app/verificacion-v2.spec.ts`). Córrelo con `npx ng test --no-watch --include=src/app/verificacion-v2.spec.ts` o con el mecanismo equivalente que funcione:
   - **P1:** con un doble de `SQLiteDBConnection` y `esWeb = true`, deja el adaptador pendiente con un `run` cuyo `guardar()` falle. Después, el siguiente `transaction` con `guardar()` funcionando ejecuta el trabajo, y un tercer `run` cuyo `guardar()` falle da `escrituraAplicada === true`. Comprueba también que en nativo (`esWeb = false`) no se llama a `guardar()` y no se lanza `GuardadoWebError`.
   - **P2:** a través de la API pública de `src/app/cartera/domain/index.ts`, la cascada de abonos y el pago de una factura específica con una factura inválida (`pagado > total`) rechazan con `codigo === 'FACTURA_INVALIDA'`. Una venta bajo costo (`costoBase > total`) sigue siendo válida y reparte todo el pago a capital.
   - **Regresión:** los ejemplos E1 a E4 de `PLAN.md` dan los mismos números que en la base.
3. **Calidad de las pruebas** (regla 6 de `planificacion/comun/base.md`), en los specs que cambiaron entre `1602fe2` y `HEAD` y además en todos los `*.spec.ts` de `src/app/cartera/` y `src/app/finanzas/`: lista cada prueba que use `try/catch` para verificar un error, `toThrow()` o `rejects.toThrow()` sin acotar, o un título que no corresponda a la función que llama. Para cada una indica el archivo, la línea y si venía de la base o la introdujo este cambio.
4. **Rutas permitidas:** en el repositorio original corre `git diff --name-only 1602fe2 HEAD`. Comprueba que cada archivo cae en las rutas permitidas de P1 o de P2 y lista los que no.

## Severidad

- **Bloqueante:** un defecto causado por este cambio, o un spec `P1`/`P2` que no se cumple, que se reproduce con datos realistas y que no se reproducía en `1602fe2`. También cuenta ignorar en silencio una opción explícita con éxito, o cambiar una salida existente que nadie pidió cambiar.
- **Observación:** defectos que ya estaban en `1602fe2`, valores fuera de dominio y mejoras de estilo o de legibilidad. Las faltas a la regla 6 que ya venían de la base son observaciones.

## Reporte

1. Resultado de cada comando (`<comando>: <resultado observado>`).
2. Veredicto para `P1` y `P2`: `cumple`, `no cumple` o `no verificable`, con la prueba o la línea de código que lo respalda.
3. Bloqueantes, cada uno con los pasos para reproducirlo.
4. Observaciones, incluida la lista completa del punto 3.
5. Rutas fuera de lo permitido, o "ninguna".
6. Las pruebas que escribiste en la copia, **completas**, para que el coordinador pueda agregarlas como pruebas de regresión.
7. La ruta exacta del directorio temporal. **No lo borres**: lo borra el coordinador.
