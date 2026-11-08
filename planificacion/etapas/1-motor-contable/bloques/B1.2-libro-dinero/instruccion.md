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

# Tarea B1.2 — Libro de dinero y su repositorio

**Etapa 1 (Motor contable), ola 2.** Corres en paralelo con B1.1 (cobros y cartera), que solo toca `src/app/cartera/domain/**` y `src/app/ventas/domain/**`: no compartes archivos con ese bloque. La ola 1 ya dejó `ReglaNegocioError` en `src/app/shared/domain/` (reexportado desde `index.ts`) y ajustó la persistencia en `src/app/shared/infrastructure/sqlite/`; úsalos, no los modifiques. El plan completo está en `planificacion/etapas/1-motor-contable/PLAN.md` (léelo hasta `## Log`); esta tarea copia la parte que te toca y manda sobre él si algo no coincide. Lee también `planificacion/comun/modelo-contable.md` (secciones 3 y 4, reglas R-05 a R-08) y la tabla `movimientos_dinero` en `src/app/shared/infrastructure/sqlite/migrations/001-esquema-inicial.ts`, con sus CHECK.

## Specs que cubres

| ID | Requisito (cita textual) |
|----|--------------------------|
| S7 | "[...] bloqueando cualquier intento de retiro que supere el monto de la *Ganancia Libre Disponible* o el saldo disponible en ese medio físico." (RF-17; aquí solo la regla) |
| S8 | "El sistema deberá llevar el conteo exacto y mostrar por separado cuánto dinero real del negocio (sumando Capital Recuperado + Ganancia Libre Disponible) se encuentra físicamente en **Efectivo** y cuánto en **Transferencia**, sumando los cobros recibidos por cada medio y restando los retiros o recompras pagadas desde cada medio." (RF-19; aquí solo el cálculo) |
| S9 | "[...] el sistema deberá permitir registrar un traspaso interno entre los bolsillos de *Efectivo* y *Transferencia* sin alterar las métricas de capital ni de ganancia." (RF-20; la regla) |
| S10 | "Definir **Capital en caja = capital recuperado − compras pagadas con los bolsillos**. Además, fijar como regla que siempre cumpla **Efectivo + Transferencia = Capital en caja + Ganancia libre**, y verificarla con tests." (A1) |
| S11 | "Permitirla, pero que el excedente descuente la **ganancia libre** como reinversión, con un aviso." (A3) |

### Ejemplos de aceptación (cada uno es una prueba, con estos números exactos)

| ID | Situación | Resultado esperado |
|----|-----------|--------------------|
| E5 | Ganancia libre $9.000, efectivo $5.000. Retiro de $8.000 en efectivo. | Se rechaza por saldo del bolsillo (`SALDO_INSUFICIENTE`) |
| E6 | Capital en caja $100.000, ganancia libre $30.000, transferencia $130.000. Compra de $120.000 por transferencia. | capital −$100.000, ganancia −$20.000, con aviso de reinversión de $20.000 |
| E7 | Traspaso de $50.000 de efectivo a transferencia. | efectivo −$50.000, transferencia +$50.000; capital y ganancia no cambian |

## Rutas permitidas

```
src/app/finanzas/**
```

Prohibido todo lo demás. No instales dependencias.

## Qué hacer

`domain/` no importa nada de Angular, Ionic, Capacitor ni SQLite, ni lee la fecha del sistema: la fecha del movimiento entra como parámetro (`fecha: FechaHora`) en cada operación. Los rechazos lanzan `ReglaNegocioError` con su `codigo`.

- **`finanzas/domain/movimiento.ts`:** el tipo `Movimiento`, igual a una fila de `movimientos_dinero` sin el id: `fecha`, `tipo` (los 6 tipos del modelo contable), `medio` (`MedioPago`), `deltaBolsillo`, `deltaCapital`, `deltaGanancia` (los tres `Pesos`), `idLote`, `idAbono`, `idMovimientoOrigen` (number o null) y `nota` (string o null).
- **`finanzas/domain/saldos.ts`:**
  - `Saldos { efectivo, transferencia, capitalEnCaja, gananciaLibre }` (todos `Pesos`);
  - `calcularSaldos(movimientos) → Saldos`: cada bolsillo suma los `deltaBolsillo` de su medio; `capitalEnCaja` suma los `deltaCapital` y `gananciaLibre` los `deltaGanancia`;
  - `verificarInvariante(saldos)` lanza un `Error` si efectivo + transferencia ≠ capitalEnCaja + gananciaLibre.
- **`finanzas/domain/operaciones.ts`**, que construye los movimientos validando contra los `Saldos` actuales (todas rechazan `monto <= 0` con `MONTO_INVALIDO`):
  - `aporteCapital(fecha, medio, monto)`: bolsillo +monto, capital +monto;
  - `compraLote(saldos, fecha, medio, costoTotal, idLote)` → `{ movimiento, reinversion }`: consume primero el capital en caja (sin pasar de lo que hay, y nunca un capital negativo) y el resto descuenta la ganancia; `reinversion` es lo que se tomó de la ganancia (S11). Rechaza si el bolsillo no alcanza (`SALDO_INSUFICIENTE`);
  - `cobro(fecha, medio, capital, ganancia, idAbono)`: bolsillo +(capital + ganancia), con `capital >= 0`, `ganancia >= 0` y la suma > 0;
  - `retiroGanancia(saldos, fecha, medio, monto)`: `GANANCIA_INSUFICIENTE` si monto > ganancia libre y `SALDO_INSUFICIENTE` si monto > saldo del bolsillo (S7). Si fallan las dos, gana `GANANCIA_INSUFICIENTE`;
  - `traspaso(saldos, fecha, origen, destino, monto)` → `[salida, entrada]`: `TRASPASO_MISMO_MEDIO` si origen = destino, o `SALDO_INSUFICIENTE` si el origen no alcanza (S9). La entrada deja `idMovimientoOrigen` en null: lo completa el repositorio.
  - Cada movimiento que se construye cumple el CHECK de su tipo en `movimientos_dinero`.
- **`finanzas/infrastructure/libro.repository.ts`** (`LibroRepository`), la única puerta de entrada al libro:
  - `registrar(tx, movimiento)` inserta en `movimientos_dinero` con el `SqlExecutor` de la transacción y devuelve el id;
  - `registrarTraspaso(tx, [salida, entrada])` inserta la salida, después la entrada con `id_movimiento_origen` = id de la salida, y devuelve los dos ids;
  - `saldos(db)` calcula los `Saldos` con `SUM` en SQL (con `COALESCE` para la base vacía).
  - Usa los tipos del puerto `SqlDatabase` / `SqlExecutor` de `src/app/shared/infrastructure/sqlite/sql-database.port.ts`.

## Pruebas (primero RED, después GREEN)

- E5, E6 y E7 tal cual, con sus números.
- Los rechazos con su código: `MONTO_INVALIDO`, `SALDO_INSUFICIENTE` (compra y traspaso), `GANANCIA_INSUFICIENTE` y `TRASPASO_MISMO_MEDIO`.
- Una compra cubierta por completo con capital: `reinversion` = 0.
- **Simulación (D4):** 200 operaciones al azar (aportes, compras, cobros, retiros y traspasos, con montos y medios al azar) usando un generador pseudoaleatorio propio con **semilla fija** (por ejemplo, mulberry32; sin librerías nuevas). Las operaciones que se rechazan con `ReglaNegocioError` se ignoran; las demás se aplican. Después de **cada** operación aplicada, `verificarInvariante` pasa y ningún bolsillo, ni el capital en caja, ni la ganancia libre quedan negativos. La prueba también comprueba que se aplicó una cantidad razonable de cada tipo (al menos una de cada uno), para que no pase en vacío.
- **Repositorio**, con `SqlJsDatabase` (`src/testing/sqljs-sql-database.adapter.ts`) y la migración real (`migrar(db, MIGRACIONES)`):
  - después de registrar una secuencia (aporte, compra, cobro, retiro y traspaso), `saldos(db)` da lo mismo que `calcularSaldos` sobre esa misma secuencia. Las claves foráneas están activas: crea primero las filas de `lotes_cajas`, `ventas` y `abonos` que hagan falta, con SQL directo en la prueba;
  - la entrada del traspaso queda con `id_movimiento_origen` apuntando a la salida;
  - una transacción que falla a la mitad de un traspaso (lanza un error después de insertar la salida) no deja **ninguna** fila.

## Verificación

```
npm run lint
npm run test:unit
```

Copia el resultado de cada uno. **No corras `npm run build`**: como B1.1 corre al mismo tiempo, los dos escribirían en `www/`; el coordinador compila al cerrar la ola (esto reemplaza la lista de verificación del contexto base). Si `lint` o `test:unit` fallan solo por archivos de `src/app/cartera/**` o `src/app/ventas/**`, no los toques; infórmalo con el nombre del archivo y el error.
