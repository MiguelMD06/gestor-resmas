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

# Tarea B2.3 — Pantallas de inventario, compra y aporte

**Etapa 2 (Inventario y aportes de capital), ola 2.** Trabajas solo. La ola 1 ya dejó el dominio, el repositorio y los casos de uso (B2.1), y las pestañas, la pantalla de error y el token `CLOCK` (B2.2). El plan completo está en `planificacion/etapas/2-inventario/PLAN.md`: léelo hasta `## Log`. Esta tarea copia la parte que te toca y manda sobre el plan si algo no coincide.

La tarea tiene dos partes: **A** son las pantallas (lo principal) y **B** son observaciones chicas de la revisión de la ola 1. Haz primero A y después B.

## Specs que cubres

| ID | Requisito |
|----|-----------|
| S3 | "Cuando el usuario adquiera mercancía, el sistema deberá permitir registrar la entrada de cajas seleccionando el tipo de papel (Carta u Oficio), la fecha de compra, la cantidad de cajas, el costo de compra por caja y el medio de pago utilizado (Efectivo, Transferencia o Capital Externo)." ("Capital Externo" lo reemplaza el aporte de capital, S7: los medios son solo **Efectivo** y **Transferencia**.) |
| S4 | "Al guardar una compra, el sistema deberá crear un lote activo independiente con un stock inicial de $10 \times N$ resmas enteras y calcular automáticamente el costo unitario por resma dividiendo el costo de la caja entre 10." (La regla ya está en `RegistrarCompra`; la pantalla la muestra.) |
| S5 | "El sistema deberá mostrar el inventario disponible agrupado por tipo de papel (Carta y Oficio) y desglosado por cada lote/caja activa, indicando la fecha de ingreso, cuántas resmas quedan disponibles de las 10 iniciales y el costo unitario de adquisición de cada lote." (Con A6, son las disponibles de las 10 × N iniciales del lote.) |
| S7 | "Reemplazarlo por un movimiento **Aporte de capital** que entra a un bolsillo. Así toda compra sale de Efectivo o Transferencia y el arqueo se puede rastrear." |
| S8 | "Permitirla, pero que el excedente descuente la **ganancia libre** como reinversión, con un aviso." (La regla ya existe; aquí va el aviso en pantalla.) |
| S9 | "**1 lote por compra** (10×N resmas), con la barra de progreso calculada como disponibles ÷ iniciales." |
| S10 | Para Inventario: "Filtros por *Carta* y *Oficio*, tarjetas de lotes activos con barra de progreso (`resmas_disponibles / 10`) y botón flotante (`ion-fab`) para registrar compras de cajas nuevas." (La barra usa ÷ iniciales, S9.) |

Decisiones aprobadas que te tocan:

- **D3:** "el formulario calcula con `compraLote` sobre los saldos actuales y, si hay reinversión, la muestra antes del botón de guardar." Ya lo hace `RegistrarCompra.previsualizar`: úsalo, no recalcules.
- **D4:** las fechas vienen del token `CLOCK` (`src/app/shared/infrastructure/clock/clock.token.ts`), nunca de `new Date()` en la pantalla.
- **D5:** "Mensajes en español en una sola tabla (`src/app/shared/ui/mensajes-error.ts`): de `CodigoRegla` a texto para el usuario."
- **D6:** lotes del más antiguo al más nuevo. `LoteRepository.activos` ya los devuelve así; no los reordenes.
- **"Por aprobar" 1:** el aporte de capital se registra desde el botón flotante de Inventario y desde el formulario de compra cuando el bolsillo no alcanza.
- **"Por aprobar" 2:** la fecha de compra es la de hoy por defecto y se puede cambiar, sin restricción de fechas.

### Ejemplos que son prueba

| ID | Situación | Resultado esperado |
|----|-----------|--------------------|
| E1 | El negocio empieza en cero. Aporte de capital de $300.000 en efectivo. | efectivo $300.000, capital en caja $300.000, ganancia libre $0 |
| E2 | Con E1 hecho, compra de 2 cajas Carta a $120.000 cada una, en efectivo. | lote nuevo `ACTIVO` con 20 resmas de 20 y costo de $12.000 por resma; efectivo $60.000, capital en caja $60.000; sin aviso de reinversión |
| E3 | Capital en caja $100.000, ganancia libre $30.000 y transferencia $130.000. Compra de 1 caja Oficio a $120.000 por transferencia. | lote de 10 resmas a $12.000; el aviso dice que se reinvierten $20.000 de la ganancia libre; capital en caja $0, ganancia libre $10.000 |
| E8 | Hay un lote Carta (20 de 20, $12.000), uno Oficio (7 de 10, $13.000) y uno Carta agotado. | Inventario muestra 1 lote en Carta y 1 en Oficio; la barra del de Oficio está al 70 %; el agotado no aparece |

## Rutas permitidas

```
src/app/inventario/ui/**
src/app/inventario/application/consultar-inventario.ts
src/app/inventario/application/consultar-inventario.spec.ts
src/app/inventario/application/index.ts
src/app/inventario/application/registrar-compra.spec.ts
src/app/inventario/infrastructure/lote.repository.spec.ts
src/app/finanzas/ui/**
src/app/finanzas/application/registrar-aporte.spec.ts
src/app/shared/ui/**
src/app/shared/domain/regla-negocio.error.ts
src/app/shell/tabs.routes.ts
src/app/shell/proximamente.page.spec.ts
src/app/app.component.spec.ts
e2e/inventario.spec.ts
e2e/app.spec.ts
e2e/helpers/**
```

Prohibido todo lo demás. En particular, **no cambies** `registrar-compra.ts`, `registrar-aporte.ts`, `consultar-saldos.ts`, `lote.repository.ts` ni nada de `domain/`: si te falta algo de esas APIs, detente y explícalo en el reporte.

## APIs que ya existen (reutilízalas)

| Qué | Dónde | Firma |
|-----|-------|-------|
| Compra | `inventario/application/registrar-compra.ts` | `RegistrarCompra.registrar({ tipoPapel, cajas, costoPorCaja, fecha, medio }) → Promise<{ idLote, reinversion }>` y `previsualizar({ tipoPapel, cajas, costoPorCaja, medio }) → Promise<{ costoTotal, costoUnitarioResma, reinversion, saldoBolsillo, alcanza }>`. Las dos lanzan `ReglaNegocioError` (`CANTIDAD_INVALIDA`, `COSTO_CAJA_INVALIDO`) si los datos no son válidos; `registrar` además lanza `SALDO_INSUFICIENTE`. |
| Aporte | `finanzas/application/registrar-aporte.ts` | `RegistrarAporte.registrar({ fecha, medio, monto }) → Promise<number>` |
| Saldos | `finanzas/application/consultar-saldos.ts` | `ConsultarSaldos.saldos() → Promise<Saldos>` (`efectivo`, `transferencia`, `capitalEnCaja`, `gananciaLibre`) |
| Lotes | `inventario/infrastructure/lote.repository.ts` | `LoteRepository.activos(db) → Promise<Lote[]>`, en el orden de D6 |
| Dominio del lote | `inventario/domain/lote.ts` | `progreso(lote)` y `agruparPorTipo(lotes) → { CARTA: Lote[], OFICIO: Lote[] }` |
| Pesos | `shared/domain/pesos.ts` | `pesos(n)`, `formatearPesos(valor)` |
| Tipos | `shared/domain` | `TIPOS_PAPEL`, `MEDIOS_PAGO`, `fechaHora(...)`, `ReglaNegocioError` con `codigo: CodigoRegla` |
| Reloj | `shared/infrastructure/clock/clock.token.ts` | `inject(CLOCK).ahora() → FechaHora` |

## Parte A — Pantallas

1. **`inventario/application/consultar-inventario.ts`** (nuevo, `@Injectable({ providedIn: 'root' })`): `ConsultarInventario.activos() → Promise<{ CARTA: Lote[], OFICIO: Lote[] }>`, que llama a `LoteRepository.activos(db)` con `SQL_DATABASE` y agrupa con `agruparPorTipo`. Sigue la forma de `ConsultarSaldos`. Expórtalo desde `inventario/application/index.ts`. La pantalla usa este caso de uso, **nunca** el repositorio directo (`ui` → `application`). Prueba con `SqlJsDatabase` y la migración real: con los lotes de E8, devuelve 1 en Carta y 1 en Oficio y no incluye el agotado.
2. **`inventario/ui/inventario.page`** (S5, S9, S10, E8): `ion-segment` con **Carta** y **Oficio** (Carta por defecto). Una tarjeta por lote activo del tipo elegido con la fecha de ingreso, el texto "N de M resmas", el costo por resma con `formatearPesos` y una `ion-progress-bar` con `[value]="progreso(lote)"`. Si no hay lotes de ese tipo, un mensaje que invita a registrar la primera compra. Un `ion-fab` con dos acciones: **Nueva compra** y **Aportar capital**, que abren los modales con `ModalController`. Al cerrar un modal con un guardado exitoso, la página vuelve a cargar los lotes.
3. **`inventario/ui/nueva-compra.modal`** (S3, S4, S8): campos de tipo de papel, fecha (por defecto `CLOCK.ahora()`; se puede cambiar), cantidad de cajas, costo por caja y medio (**Efectivo** o **Transferencia**). Mientras se escribe, con `previsualizar`, muestra el saldo del bolsillo elegido, el costo total y el costo por resma. Si `reinversion > 0`, lo avisa en un `ion-note` de color `warning` **antes** del botón **Guardar compra**, con el monto (en E3: "Se reinvierten $20.000 de la ganancia libre" o un texto equivalente que incluya el monto formateado). Si `alcanza` es `false`, dice que el bolsillo no alcanza, deshabilita **Guardar compra** y ofrece un botón **Aportar capital** que abre el modal de aporte; al volver con un aporte guardado, recalcula la vista previa. Si `previsualizar` lanza un `ReglaNegocioError` por datos inválidos mientras se escribe, muestra el mensaje de la tabla de D5 junto al campo y no rompe la pantalla.
4. **`finanzas/ui/aporte.modal`** (S7, E1): fecha (por defecto `CLOCK.ahora()`), medio y monto. Al guardar llama a `RegistrarAporte.registrar` y cierra el modal con un resultado que indica el guardado, para que quien lo abrió recargue sus datos.
5. **`shared/ui/mensajes-error.ts`** (D5): un `Record<CodigoRegla, string>` con **todos** los códigos de `CodigoRegla` en español (el compilador tiene que obligar a cubrirlos), por ejemplo `SALDO_INSUFICIENTE` → "No hay suficiente dinero en ese medio de pago", y una función `mensajeDeError(error: unknown): string` que traduce un `ReglaNegocioError` por su `codigo` y, para cualquier otro error, devuelve un texto genérico ("Ocurrió un error inesperado"). Cualquier error al guardar en los dos modales se muestra con un `ion-toast` usando esa función.
6. **`shell/tabs.routes.ts`:** la ruta `inventario` carga `inventario.page` en lugar de `ProximamentePage`. Las otras tres no cambian.

**Textos:** lo que ve el usuario va en español; comentarios, nombres técnicos y títulos de las pruebas, en inglés (ver `base.md`).

### Pruebas de la parte A

De componente, con los casos de uso simulados (dobles con `vi.fn()` en `providers`):

- `inventario.page`: con los lotes de E8, en **Carta** se ve 1 tarjeta y en **Oficio** 1 tarjeta; la `ion-progress-bar` del lote de Oficio tiene `value` 0,7; el texto "7 de 10 resmas" y el costo "$13.000" (o el formato exacto que da `formatearPesos`) aparecen. Sin lotes, se ve el mensaje vacío.
- `nueva-compra.modal`: con la vista previa de E3 (`reinversion` 20000) se ve el `ion-note` de aviso con el monto; con la de E2 (`reinversion` 0) **no** aparece; con `alcanza: false` el botón **Guardar compra** está deshabilitado y aparece **Aportar capital**. Al guardar llama a `registrar` con los valores del formulario y la fecha del `CLOCK` simulado.
- `aporte.modal`: al guardar llama a `registrar` con los valores del formulario y cierra el modal con el resultado de guardado.
- `mensajes-error.ts`: `mensajeDeError` traduce `SALDO_INSUFICIENTE` y devuelve el texto genérico para un `Error` común.

E2E (`e2e/inventario.spec.ts`, en web): abrir la app, **Aportar capital** de $300.000 en efectivo, **Nueva compra** de 2 cajas Carta a $120.000 en efectivo y ver la tarjeta con "20 de 20 resmas" a $12.000 por resma; después de recargar la página, la tarjeta sigue ahí (se guarda en jeep-sqlite). Si extraes la captura de errores de consola a un helper, va en `e2e/helpers/` (ver parte B, punto 3).

## Parte B — Observaciones de la segunda revisión de la ola 1

No cambian ningún comportamiento visible. Los números de línea son aproximados: ubícalos por el contenido.

| # | ID | Dónde | Qué cambiar |
|---|----|-------|-------------|
| 1 | R2-spanish-test-text | `src/app/app.component.spec.ts` y `src/app/shell/proximamente.page.spec.ts` | Los títulos de `describe`/`it` están en español. Pásalos al inglés con el mismo significado (los textos de las pruebas van en inglés, según `base.md`). Los textos que la prueba busca en pantalla siguen en español. |
| 2 | R3-retry-to-listo-outlet-unproved | `src/app/app.component.spec.ts` | Falta probar el final de E9: después de **Reintentar**, cuando el estado pasa de `'cargando'` a `'listo'`, se ve `ion-router-outlet` y ya no se ven ni `app-error-arranque` ni el spinner. Agrega esa prueba (o extiende la de reintento). |
| 3 | R2-duplicated-console-capture | `e2e/app.spec.ts` | La captura de `console.error` está repetida en cada prueba. Sácala a un helper (por ejemplo, `e2e/helpers/errores-consola.ts`) y úsala en `app.spec.ts` y en `inventario.spec.ts`. |
| 4 | R2-duplicated-mock-setup | `src/app/app.component.spec.ts` | La creación del doble de `EstadoArranque` y el `TestBed` se repiten en cada prueba. Sácalos a una función de la spec que reciba el estado inicial. |
| 5 | R2-hardcoded-divisor-comment | `src/app/shared/domain/regla-negocio.error.ts` (comentario de `COSTO_CAJA_INVALIDO`) | Cambia "not divisible by 10" por "not divisible by RESMAS_POR_CAJA". Solo el comentario. |
| 6 | R2-misleading-test-title | `src/app/shell/proximamente.page.spec.ts` (prueba "soporta inputs directos vinculados mediante withComponentInputBinding") | La prueba asigna los inputs directamente, no usa `withComponentInputBinding`. Cambia el título por uno que diga lo que prueba (en inglés), por ejemplo "uses the title and stage inputs when they are set". |
| 7 | R2-redundant-asserts | `src/app/inventario/infrastructure/lote.repository.spec.ts` (prueba de `activos`) | Después de `expect(listaActivos.map((l) => l.idLote)).toEqual([id1, id2, id3])`, las dos aserciones de `listaActivos[0]` y `listaActivos[1]` sobran. Quítalas. |
| 8 | R3-consultar-saldos-empty-equivalence | `src/app/finanzas/application/registrar-aporte.spec.ts` (prueba "consultarSaldos returns identical result to libro.saldos(db)") | Compara saldos con la base vacía, donde todo es 0 y cualquier implementación pasa. Registra antes el aporte de E1 y verifica los valores concretos (`efectivo` 300000, `capitalEnCaja` 300000, `gananciaLibre` 0, `transferencia` 0), además de la igualdad con `libro.saldos(db)`. |
| 9 | R3-previsualizar-movimientos-unchecked | `src/app/inventario/application/registrar-compra.spec.ts` (bloque "Verify no rows were created by previsualizar") | Solo cuenta `lotes_cajas`. Verifica también que `movimientos_dinero` queda con las mismas filas que tenía antes de `previsualizar`. |

Sigue la regla 6 de `base.md` en todas las pruebas que toques o agregues.

## Verificación

```
npm run lint
npm run test:unit
npm run build
npm run test:e2e
```

Copia el resultado de cada uno, con el número de pruebas. En el reporte, indica qué `S#` y `E#` cubre cada prueba nueva, y para cada punto 1 a 9 de la parte B, qué cambiaste.
