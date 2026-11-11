# Etapa 1 — Motor contable

**Estado:** ✅ hecha (PR #5, integrado en `main`) · **Rama:** `feat/etapa-1-motor-contable` · **Entrega:** un PR a `main` · **Pruebas:** Vitest (`ng test`)
**Objetivo:** construir las reglas que deciden, en cada movimiento de dinero, cuánto es capital y cuánto es ganancia (cobros, cascada de abonos, compras, retiros y traspasos), como código puro probado con ejemplos, más un repositorio único del libro de dinero que van a reutilizar todas las etapas. Antes, cerrar los pendientes de la revisión de la Etapa 0.

## Qué hay hoy

- **Etapa 0 integrada en `main`:** esquema v1 con el libro `movimientos_dinero`, el puerto `SqlDatabase`, migraciones y los tipos `Pesos`, `Resmas`, `MedioPago` y `FechaHora` en `src/app/shared/domain/`.
- No hay reglas de negocio ni pantallas.
- **8 pendientes de la revisión de `256f85d`**, listados en [`../0-fundaciones/PLAN.md`](../0-fundaciones/PLAN.md#pendientes-para-la-etapa-1).

## Specs

Citas textuales; si una cita y un bloque no coinciden, manda la cita.

| ID | Requisito | Fuente |
|----|-----------|--------|
| S1 | "En toda venta cobrada de contado o mediante abonos parciales, el dinero que ingresa cubre primero el **Costo Base** de las resmas de esa factura (*Capital Recuperado*). Solo cuando el monto pagado en una factura supera su costo base de adquisición, el excedente se suma a la **Ganancia Libre Disponible**." | RN-03 |
| S2 | "En cada cobro o abono registrado, el sistema deberá asignar internamente el ingreso a cubrir primero el costo de compra de las resmas de la factura afectada (*Capital Recuperado*); todo monto cobrado que exceda dicho costo base se sumará a la bolsa de *Ganancia Libre Disponible*." | RF-16 |
| S3 | "El sistema deberá calcular el saldo total adeudado por cada cliente sumando los saldos pendientes de todas sus facturas en estado *Pendiente* o *Abonada Parcialmente*." | RF-11 |
| S4 | "Cuando un cliente realice un abono general a su deuda total indicando el monto y el medio de pago (Efectivo o Transferencia), el sistema deberá descontar el dinero empezando por la factura pendiente más antigua; si el abono cubre la totalidad de esa factura, la marcará como *Pagada* y aplicará el excedente sucesivamente a las siguientes facturas en orden cronológico ascendente." | RF-12 |
| S5 | "El sistema deberá permitir al usuario seleccionar una factura pendiente específica del cliente para aplicarle un abono parcial o pago total de manera aislada, sin afectar las demás facturas abiertas." | RF-13 |
| S6 | "El sistema deberá incluir una función rápida para saldar el 100% de la deuda acumulada de un cliente, cerrando todas sus facturas pendientes y registrando el ingreso por el medio de pago seleccionado (Efectivo o Transferencia)." | RF-14 |
| S7 | "[...] bloqueando cualquier intento de retiro que supere el monto de la *Ganancia Libre Disponible* o el saldo disponible en ese medio físico." | RF-17 (la regla; el registro y la pantalla son de la Etapa 5) |
| S8 | "El sistema deberá llevar el conteo exacto y mostrar por separado cuánto dinero real del negocio (sumando Capital Recuperado + Ganancia Libre Disponible) se encuentra físicamente en **Efectivo** y cuánto en **Transferencia**, sumando los cobros recibidos por cada medio y restando los retiros o recompras pagadas desde cada medio." | RF-19 (el cálculo; la pantalla es de la Etapa 5) |
| S9 | "[...] el sistema deberá permitir registrar un traspaso interno entre los bolsillos de *Efectivo* y *Transferencia* sin alterar las métricas de capital ni de ganancia." | RF-20 (la regla) |
| S10 | "Definir **Capital en caja = capital recuperado − compras pagadas con los bolsillos**. Además, fijar como regla que siempre cumpla **Efectivo + Transferencia = Capital en caja + Ganancia libre**, y verificarla con tests." | A1 |
| S11 | "Permitirla, pero que el excedente descuente la **ganancia libre** como reinversión, con un aviso." | A3 |
| S12 | "Avisar al fijar el precio y mostrar la **pérdida** en el dashboard." | A4 (el cálculo; el aviso visual es de la Etapa 3) |
| S13 | Los 8 pendientes de la revisión de la Etapa 0, según las decisiones de "Por aprobar". | Etapa 0, L19 |

### Ejemplos de aceptación

Son los que se le explicaron al usuario (L1); cada uno es una prueba.

| ID | Situación | Resultado esperado |
|----|-----------|--------------------|
| E1 | Caja de $120.000 → costo por resma $12.000. Venta a Ana de 3 resmas a $15.000: total $45.000, costo base $36.000. Abono de $20.000. | capital $20.000, ganancia $0 |
| E2 | La misma factura, abono siguiente de $25.000. | capital $16.000, ganancia $9.000; la factura queda pagada |
| E3 | Ana debe la factura A (más vieja, saldo $10.000) y la B (saldo $30.000). Abono general de $25.000. | A recibe $10.000 y queda pagada; B recibe $15.000 y queda parcial |
| E4 | Abono general de $50.000 con una deuda total de $40.000. | Se rechaza por superar la deuda (`MONTO_SUPERA_DEUDA`) |
| E5 | Ganancia libre $9.000, efectivo $5.000. Retiro de $8.000 en efectivo. | Se rechaza por saldo del bolsillo (`SALDO_INSUFICIENTE`) |
| E6 | Capital en caja $100.000, ganancia libre $30.000, transferencia $130.000. Compra de $120.000 por transferencia. | capital −$100.000, ganancia −$20.000, con aviso de reinversión de $20.000 |
| E7 | Traspaso de $50.000 de efectivo a transferencia. | efectivo −$50.000, transferencia +$50.000; capital y ganancia no cambian |
| E8 | Venta de 2 resmas a $10.000 cuando el costo es $12.000. | bajo costo: sí; pérdida $4.000 |

## Decisiones

| # | Decisión | Por qué |
|---|----------|---------|
| D1 | **Las reglas son funciones puras** en `<funcionalidad>/domain/`: reciben datos y devuelven resultados, sin base de datos ni Angular. | Se prueban con los ejemplos de arriba en milisegundos y no dependen de la pantalla ni de SQLite. |
| D2 | **Errores de negocio con código:** `ReglaNegocioError` con `codigo` (`MONTO_SUPERA_DEUDA`, `SALDO_INSUFICIENTE`, etc.). | Las pantallas de las etapas 2 a 5 traducen cada código a un mensaje en español; el dominio no escribe textos de interfaz. |
| D3 | **Un único repositorio del libro**, `LibroRepository`: `registrar(tx, movimiento)` y `saldos(db)`. | Es la única puerta de entrada al libro. Las etapas 2 a 5 lo reutilizan y nadie escribe en `movimientos_dinero` por su cuenta. |
| D4 | **Simulación de la invariante:** una prueba aplica 200 operaciones al azar con una semilla fija y verifica, después de cada una, que efectivo + transferencia = capital + ganancia y que ningún bolsillo queda negativo. | Encuentra combinaciones que ningún ejemplo escrito a mano cubre. Con la semilla fija siempre da el mismo resultado, y no hace falta ninguna librería nueva. |

## Bloques

| ID | Bloque | Specs | Ruta | Agente | Ola |
|----|--------|-------|------|--------|-----|
| B1.0 | Ajustes de persistencia (pendientes de la Etapa 0) y error de negocio compartido | S13 | delegado | `agy` · `gemini-3.8-flash-high` | 1 |
| B1.1 | Reglas de cobro y cartera, y margen de venta | S1–S6, S12; E1–E4, E8 | delegado | `agy` · `gemini-3.8-flash-high` | 2 |
| B1.2 | Libro de dinero y su repositorio | S7–S11; E5–E7 | delegado | `agy` · `gemini-3.8-flash-high` | 2 |
| V1 | Verificación independiente | S1–S13, E1–E8 | delegado | `agy` · `gemini-4-argon-medium` | 3 |

**Por qué en olas:** B1.0 va sola porque cambia una dependencia (`npm install`) y crea `ReglaNegocioError`, que usan los otros dos bloques. B1.1 y B1.2 no comparten archivos y corren en paralelo.

### B1.0 — Ajustes de persistencia y error de negocio

- **Rutas permitidas:** `src/app/shared/infrastructure/sqlite/**`, `src/testing/**`, `src/app/shared/domain/regla-negocio.error.ts` (y su `.spec.ts`), `src/app/shared/domain/index.ts`, `package.json`, `package-lock.json`, `angular.json`, `planificacion/comun/base.md`
- **Qué hacer:**
  1. **Guardado web después del commit:** si `guardar()` falla **después** del `commitTransaction`, no se llama a `rollbackTransaction`. Se lanza `GuardadoWebError` (con la causa) y el adaptador queda marcado como "pendiente de guardar"; la próxima operación de escritura vuelve a intentar `guardar()` antes de seguir. Lo mismo vale para `run` y `exec` fuera de una transacción.
  2. **Una sola inicialización:** `DatabaseProvider.init()` guarda la promesa en curso. Dos llamadas simultáneas abren **una** conexión. Si falla, la promesa se descarta para que se pueda reintentar.
  3. **Una sola versión de sql.js:** `sql.js` pasa a `1.11.0` (la que usa jeep-sqlite), se quita el alias `sql.js-jeep-wasm` y `angular.json` vuelve a copiar el `.wasm` desde `node_modules/sql.js/dist`. Así las pruebas usan el mismo motor que la web. Se actualiza la trampa correspondiente en `base.md`.
  4. **Pruebas de la factory** (`sqlite-connection.factory.ts`) con dobles del plugin: en web registra jeep-sqlite y llama a `initWebStore`; reutiliza la conexión existente; activa las claves foráneas.
  5. **`ReglaNegocioError`** en `src/app/shared/domain/regla-negocio.error.ts`, reexportado desde `index.ts`:

     ```ts
     export type CodigoRegla =
       | 'MONTO_INVALIDO'             // amount <= 0 where a positive amount is required
       | 'MONTO_SUPERA_DEUDA'         // payment > customer's total debt
       | 'MONTO_SUPERA_SALDO_FACTURA' // payment > invoice balance
       | 'SIN_DEUDA'                  // payment or settlement with no debt
       | 'SALDO_INSUFICIENTE'         // pocket balance < amount
       | 'GANANCIA_INSUFICIENTE'      // free profit < withdrawal
       | 'TRASPASO_MISMO_MEDIO';      // transfer with the same source and target
     export class ReglaNegocioError extends Error {
       constructor(readonly codigo: CodigoRegla, message: string) { super(message); this.name = 'ReglaNegocioError'; }
     }
     ```
- **Pruebas:** una por cada punto (1 a 4), más una de `ReglaNegocioError` (código, nombre e `instanceof`).

### B1.1 — Reglas de cobro y cartera, y margen de venta

- **Rutas permitidas:** `src/app/cartera/domain/**`, `src/app/ventas/domain/**`
- **Qué hacer**, todo como funciones puras sobre `Pesos`:
  - **`cartera/domain/factura.ts`:** `FacturaAbierta { idVenta: number; fecha: FechaHora; total: Pesos; costoBase: Pesos; pagado: Pesos }` y `saldo(f)`.
  - **`cartera/domain/reparto-pago.ts`**, regla R-01 del modelo contable: `repartirPago(f, monto) → { capital, ganancia }`, con `capital = min(pagado + m, costo) − min(pagado, costo)`. Rechaza `monto <= 0` (`MONTO_INVALIDO`) y `monto > saldo` (`MONTO_SUPERA_SALDO_FACTURA`).
  - **`cartera/domain/deuda.ts`:** `deudaTotal(facturas)` es la suma de los saldos mayores que cero (S3).
  - **`cartera/domain/abonos.ts`:**
    - `distribuirCascada(facturas, monto)` → lista de `AplicacionAbono { idVenta, monto, capital, ganancia, quedaPagada }`, en orden `fecha` ascendente y, si empatan, `idVenta` ascendente (S4).
    - `abonarFactura(f, monto)` aplica a una sola factura (S5).
    - `liquidarTodo(facturas)` es la cascada por el 100 % de la deuda (S6).
    - Los tres rechazan los montos inválidos con su código, y `SIN_DEUDA` si no hay nada que cobrar.
  - **`ventas/domain/margen.ts`:** `evaluarLinea(cantidad, costoUnitario, precioUnitario) → { subtotalVenta, subtotalCosto, margen, bajoCosto }` y `perdida(totalVenta, costoBase) = max(0, costo − total)` (S12).
- **Pruebas:** E1, E2, E3, E4 y E8 tal cual, más una por regla: el desempate por `idVenta`, una venta bajo costo donde todo el pago es capital, `abonarFactura` que no toca otras facturas, `liquidarTodo` con 3 facturas y los rechazos con su código.

### B1.2 — Libro de dinero y su repositorio

- **Rutas permitidas:** `src/app/finanzas/**`
- **Qué hacer:**
  - **`finanzas/domain/movimiento.ts`:** el tipo `Movimiento`, igual a una fila de `movimientos_dinero` sin el id (los 6 tipos del modelo contable, `medio`, los tres deltas, las referencias y `nota`).
  - **`finanzas/domain/saldos.ts`:**
    - `calcularSaldos(movimientos) → { efectivo, transferencia, capitalEnCaja, gananciaLibre }`;
    - `verificarInvariante(saldos)` lanza un `Error` si efectivo + transferencia ≠ capital + ganancia.
  - **`finanzas/domain/operaciones.ts`**, que construye los movimientos validando contra los `Saldos` actuales:
    - `aporteCapital(medio, monto)`;
    - `compraLote(saldos, medio, costoTotal, idLote)` → `{ movimiento, reinversion }`: consume primero el capital en caja y el resto descuenta la ganancia (S11). Rechaza si el bolsillo no alcanza (`SALDO_INSUFICIENTE`);
    - `cobro(medio, capital, ganancia, idAbono)`;
    - `retiroGanancia(saldos, medio, monto)`: `GANANCIA_INSUFICIENTE` o `SALDO_INSUFICIENTE` (S7);
    - `traspaso(saldos, origen, destino, monto)` → `[salida, entrada]`: `TRASPASO_MISMO_MEDIO` o `SALDO_INSUFICIENTE` (S9).
  - **`finanzas/infrastructure/libro.repository.ts`:**
    - `registrar(tx, movimiento)` inserta en `movimientos_dinero` y devuelve el id. Para un traspaso inserta la salida, después la entrada con `id_movimiento_origen` y devuelve los dos ids;
    - `saldos(db)` calcula los `Saldos` con `SUM` en SQL.
- **Pruebas:**
  - E5, E6 y E7 tal cual, más los rechazos con su código;
  - **la simulación D4:** 200 operaciones con semilla fija; después de cada una se cumple la invariante y ningún bolsillo es negativo;
  - el repositorio, con `SqlJsDatabase` y la migración real: después de registrar una secuencia, `saldos(db)` da lo mismo que `calcularSaldos` sobre esa misma secuencia, y una transacción que falla a la mitad de un traspaso no deja ninguna fila.

### V1 — Verificación independiente

Lee este plan completo y prueba en una copia limpia (`mktemp -d`):

- corre `lint`, `test:unit` y `build`;
- reproduce E1 a E8 con un script propio que usa la API pública;
- da un veredicto por cada `S#`;
- controla las rutas permitidas.

Mismas reglas de severidad que V0.

## Verificación del coordinador

1. Antes de cada ola, anotar `HEAD`; después, comprobar que no hubo commits de `agy` y revisar el diff contra las rutas permitidas.
2. Leer el código de las reglas (reparto, cascada, compra con reinversión) y volver a correr `test:unit`.
3. Correr `gentle-ai review assess` por commit. Los de B1.0 tocan los ítems 4 (concurrencia) y 5 (dependencias), así que se revisan solos para que entren en el presupuesto de los revisores.
4. Abrir el PR y esperar el check `verify`.

## Commits

En el orden en que se aplican, según `commits-atomicos`:

1. `fix: el guardado web fallido después del commit no intenta un rollback`
2. `fix: una sola inicialización de la base aunque se pida varias veces`
3. `chore: una sola versión de sql.js para la web y las pruebas`
4. `test: pruebas de la factory de conexión a SQLite`
5. `feat: error de negocio con código para las reglas del dominio`
6. `feat: reparto de pagos, cascada de abonos y margen de venta`
7. `feat: libro de dinero con aportes, compras, cobros, retiros y traspasos`
8. `docs: plan y cierre de la Etapa 1`

El reporte de la etapa va en Engram (`etapas/1-motor-contable/reporte`).

## Resultado

| Bloque | Agente | Commits | Resultado |
|--------|--------|---------|-----------|
| B1.0 | `agy` · `gemini-4-argon-high`, intento 1 | `9e96a55`, `add94e1`, `09c2207`, `8dd29cf`, `34d291b` | 13 pruebas nuevas (62 en total). Revisión nativa (riesgo, resiliencia y confiabilidad) **aprobada** y confirmada, linaje `review-988376a80bd85eff`. |
| B1.1 | `agy` · `gemini-3.8-flash-high`, intento 1 | `0b6e7a8` | Reparto, cascada, abono individual, liquidación y margen. |
| B1.2 | `agy` · `gemini-3.8-flash-high`, intento 1 | `778a5e9` | Libro, operaciones, simulación D4 y `LibroRepository` (117 pruebas en total con B1.1). Evaluación nativa: riesgo medio, sin revisión obligatoria (`under_budget`). |
| V1 | `agy` · `gemini-4-argon-high`, intento 2 (el 1 se cortó por un error de red antes de empezar) | `77dad5d` | **S1–S13 y E1–E8 cumplen, 0 bloqueantes**, sin rutas fuera de lo permitido. Sus 12 pruebas quedaron como regresión en `src/app/motor-contable.acceptance.spec.ts` (129 en total). |

## Pendientes para la Etapa 2

Observaciones que no bloquean, de la revisión nativa de B1.0 y de V1:

| ID | Dónde | Severidad | Qué es |
|----|-------|-----------|--------|
| R3-init-sync-throw-caches-rejection / R4-init-sync-throw-cache | `database.provider.ts:21-30` | WARNING | Si la función que crea la base lanza de forma **síncrona**, el `catch` limpia `initPromise` antes de que se asigne, y la promesa rechazada queda guardada: ya no se puede reintentar. Con la factory real (asíncrona) no pasa. |
| R4-ambiguous-guardado-error | `capacitor-sql-database.adapter.ts:34-36` | WARNING | `GuardadoWebError` se lanza tanto si la escritura se hizo y falló el guardado como si falló el reintento previo y la escritura **no** se ejecutó. Quien llama no puede distinguirlos. |
| R1-001 | `database.provider.ts:15-33` | SUGGESTION | Observación informativa del enfoque de riesgo sobre `init()`. |
| R3-pending-flush-tx-untested | `capacitor-sql-database.adapter.ts:69` | SUGGESTION | No hay prueba del reintento de guardado pendiente antes de una `transaction` (sí la hay para `run`). |
| V1-idioma | `finanzas/domain/operaciones.ts`, `saldos.ts`, `simulacion.spec.ts` | SUGGESTION | Mensajes internos de error y un `describe` en español; `base.md` los pide en inglés. No afecta a las pantallas, que traducen por `codigo` (D2). |
| V1-dominio-factura | `cartera/domain/factura.ts`, `reparto-pago.ts` | SUGGESTION | Asumen `total >= pagado >= 0` y `costoBase >= 0`, que hoy garantizan los CHECK de `ventas`. |

Tras la revisión del PR #5 (`edeb715`, `1ef12fd`) se resolvieron R3/R4-init-sync-throw, R3-pending-flush-tx-untested y V1-idioma. R4-ambiguous-guardado-error quedó documentado en `GuardadoWebError`, pero los dos casos siguen sin poder distinguirse. Siguen pendientes R1-001 y V1-dominio-factura.

## Por aprobar

✅ Los 7 puntos fueron aprobados tal cual (L3). La ejecución espera la orden del usuario.

1. **Cifrado de la base (R1):** propongo dejarla **sin cifrar** por ahora. Son datos del negocio, no claves ni datos bancarios; cifrar implica SQLCipher y una clave que hay que guardar y no perder. Se puede agregar más adelante con una migración.
2. **Pantalla de error si la base no abre (R3/R4-bootstrap):** pasa a la **Etapa 2**, que es la primera con interfaz.
3. **Protección contra el bloqueo de la cola (R3-queue-deadlock):** **no se implementa**, porque en el navegador no hay forma confiable de distinguir quién llama. Queda documentada como regla en `base.md`.
4. **Unificar sql.js en 1.11.0** para que las pruebas usen el mismo motor que la web.
5. **D2:** errores de negocio con código; los mensajes en español los escribe cada pantalla.
6. **D3:** `LibroRepository` como única puerta de entrada al libro de dinero.
7. **Alcance:** esta etapa **no** tiene pantallas. Las reglas se usan desde las pantallas de las etapas 2 a 5.

## Log

Mensajes del usuario copiados textualmente; las notas del coordinador van entre corchetes.

- **L1** (2026-11-08): "Antes de construir la etapa 1 quiero saber exactamente que se va a hacer de forma no tan técnica explicame de una forma sencilla para yo poder entender el hilo de los que vamos a construir" [Se explicó con el ejemplo de Ana, que pasa a ser los criterios E1 a E8.]
- **L2** (2026-11-08): "Si" [Pedido para escribir este plan.] Durante la escritura: "Quiero que solo escribas el plan, yo te indico cuando comenzar a ejecutar el plan"
- **L3** (2026-11-08): "Si apruebo los 7 puntos, quiero saber porque estas dejando el plan y todo lo de documentación en distintas PR, eso es una buena practica?. Todavía no ejecutes el plan" [Plan aprobado. La ejecución sigue en espera.]
- **L4** (2026-11-08, Juan Fierro, que ejecuta la etapa; Miguel valida el PR): "Miguel ya integró el PR #4, arranquemos la Etapa 1" [Rama `feat/etapa-1-motor-contable` desde `41d35ad`. Ajustes de ejecución, sin cambiar el alcance: (1) agy corre con `--mode accept-edits` en lugar de `--dangerously-skip-permissions`; (2) B1.0 va con `gemini-4-argon-high`, porque toca concurrencia y dependencias (ítems 4 y 5 de alto riesgo); B1.1 y B1.2 con `gemini-3.8-flash-high`; (3) en la ola 2, los bloques paralelos no corren `npm run build` (los dos escribirían en `www/`): compila el coordinador; (4) las operaciones del libro reciben `fecha: FechaHora` como parámetro, porque `domain/` no lee el reloj, y el traspaso se registra con `registrarTraspaso(tx, [salida, entrada])` en vez de sobrecargar `registrar`.]
- **L5** (2026-11-08): [Etapa ejecutada y verificada; ver "Resultado" y "Pendientes para la Etapa 2". Commits extra respecto de la lista de "Commits": `a0f667f` y `271b549` (encargos de los bloques), `77dad5d` (pruebas de aceptación de V1) y el de cierre. Para la revisión nativa se corrió `gentle-ai sync` en la máquina del coordinador (`managed_assets_outdated`).]
