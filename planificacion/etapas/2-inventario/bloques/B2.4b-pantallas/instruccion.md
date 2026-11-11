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
8. **Reglas de calidad de `CLAUDE.md`:** lee `CLAUDE.md` en la raíz del repositorio. Sus reglas 1 a 6 (validación de campos, doble envío, bloqueo durante procesos, errores visibles, reintentos seguros y pruebas obligatorias) son de cumplimiento obligatorio en todo lo que escribas.

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

# Tarea B2.4b — Pantallas: estados de carga, validación y bloqueo durante procesos

**Etapa 2, bloque de pendientes B2.4.** Trabajas en paralelo con B2.4a, que toca otras rutas. Lee `CLAUDE.md` en la raíz del repositorio antes de empezar: sus reglas 1 a 6 son obligatorias y esta tarea las aplica a las pantallas de la Etapa 2.

Recuerda que la app es *zoneless*: todo lo que la plantilla muestra y cambia después de un `await` debe ser una **signal**.

## Estado actual relevante

- `nueva-compra.modal.ts` y `aporte.modal.ts` ya tienen una signal `guardando` que deshabilita **Guardar** mientras se guarda (commits `d880fc5` y `60202a3`). Reutilízala; no crees otra.
- `nueva-compra.modal.ts` descarta respuestas viejas de `previsualizar` con `peticionActual`. Reutiliza ese contador.

## Rutas permitidas

```
src/app/inventario/ui/**
src/app/finanzas/ui/**
e2e/inventario.spec.ts
```

Prohibido todo lo demás.

## Especificación

- **S1. Vista previa desactualizada (`nueva-compra.modal.ts`).** Mientras haya una llamada a `previsualizar` en curso (la vigente según `peticionActual`), **Guardar compra** está deshabilitado. Agrega una signal `calculando` que se activa al iniciar el cálculo y se apaga cuando termina la llamada vigente (con éxito o error). `puedeGuardar` devuelve `false` mientras `calculando()` sea `true`. Una respuesta descartada por ser vieja no apaga `calculando`.
- **S2. Modales bloqueados mientras guardan (`nueva-compra.modal.ts` y `aporte.modal.ts`).** Mientras `guardando()` sea `true`: el botón **Cancelar** está deshabilitado, `cancelar()` no hace nada, los campos del formulario están deshabilitados y el botón **Aportar capital** del modal de compra también. Bloquea además el cierre por backdrop o gesto mientras se guarda, usando el mecanismo de Ionic que corresponda (por ejemplo `canDismiss` en el modal, configurado desde quien lo crea dentro de las rutas permitidas, o la propiedad equivalente); explica en el reporte cuál usaste.
- **S3. Aporte sin monto (`aporte.modal.ts`).** **Guardar aporte** está deshabilitado mientras el monto esté vacío. Elimina la conversión silenciosa `Number(this.monto() ?? 0)`: con el botón deshabilitado ya no hace falta. Un monto escrito pero inválido (por ejemplo `0`) sigue llegando al dominio y su error `MONTO_INVALIDO` se muestra como hoy.
- **S4. Error de carga del inventario (`inventario.page.ts`).** `cargarLotes()` maneja el error: con una signal `errorCarga` muestra un estado de error con el texto de `mensajeDeError(error)` y un botón **Reintentar** que vuelve a llamar a `cargarLotes()`. Mientras hay error **no** se muestra el estado vacío ("registra tu primera compra"). Al reintentar con éxito, el error desaparece y se ven los lotes. Agrega también una signal `cargando` con un indicador mientras la consulta está en curso.
- **S5. Carga doble (`inventario.page.ts`).** Quita la llamada de `ngOnInit`: Ionic ya ejecuta `ionViewWillEnter` en la primera entrada. Si quitas `OnInit`, quita también su import. Verifica que la primera entrada carga los lotes una sola vez.
- **S6. Mensajes de error verificados.** En las pruebas de guardado fallido que agregaron `d880fc5` y `60202a3`, cambia `expect(mockToastCtrl.create).toHaveBeenCalled()` por una verificación del mensaje exacto (`'Ocurrió un error inesperado'` para un `Error` común).

## Pruebas (primero RED)

Una prueba por regla, verificando todos sus efectos observables:

- `nueva-compra.modal.spec.ts`: con `previsualizar` pendiente (promesa diferida), **Guardar compra** está deshabilitado aunque la vista previa anterior tuviera `alcanza: true`; al resolverse, se habilita. Una respuesta vieja que llega después de la vigente no reactiva el botón ni cambia la vista previa.
- `nueva-compra.modal.spec.ts` y `aporte.modal.spec.ts`: con `registrar` pendiente, **Cancelar** y los campos están deshabilitados y `cancelar()` no llama a `dismiss`; tras un error, todo se habilita de nuevo.
- `aporte.modal.spec.ts`: con el monto vacío, **Guardar aporte** está deshabilitado y `guardar()` no llama a `registrar`; con `300000` se habilita.
- `inventario.page.spec.ts`: si `activos()` rechaza, se ve el mensaje de error y **Reintentar**, y **no** se ve el estado vacío; al pulsar **Reintentar** con `activos()` resolviendo lotes, se ven los lotes. En la primera entrada, `activos()` se llama **una** vez.
- `e2e/inventario.spec.ts`: el modal de aporte abre con el botón **Guardar aporte** deshabilitado hasta escribir un monto.

## Verificación

```
npm run lint
npm run test:unit
npm run build
npm run test:e2e
```

Copia el resultado de cada comando con el número de pruebas, e indica qué prueba cubre cada `S#`.
