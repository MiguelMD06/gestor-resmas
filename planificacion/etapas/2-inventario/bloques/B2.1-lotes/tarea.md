# Tarea B2.1 — Lotes: dominio, repositorio y casos de uso de compra y aporte

**Etapa 2 (Inventario y aportes de capital), ola 1.** Trabajas en paralelo con B2.2, que toca otros archivos (pestañas, pantalla de error, reloj, e2e y CI). El plan completo está en `planificacion/etapas/2-inventario/PLAN.md`: léelo hasta `## Log`. Esta tarea copia la parte que te toca y manda sobre el plan si algo no coincide.

## Specs que cubres

| ID | Requisito |
|----|-----------|
| S1 | "Las compras se realizan exclusivamente por caja cerrada de 10 resmas (Tamaño Carta u Oficio) sin costos adicionales de adquisición. Las ventas se realizan exclusivamente por resma cerrada (números enteros), prohibiendo el fraccionamiento." |
| S2 | "Cada caja comprada se administra como un lote individual con su propio costo unitario ($\text{Costo de Caja} \div 10$) para manejar cajas superpuestas con precios variables según el proveedor. [...]" |
| S3 | "Cuando el usuario adquiera mercancía, el sistema deberá permitir registrar la entrada de cajas seleccionando el tipo de papel (Carta u Oficio), la fecha de compra, la cantidad de cajas, el costo de compra por caja y el medio de pago utilizado (Efectivo, Transferencia o Capital Externo)." "Capital Externo" lo reemplaza el aporte de capital (S7): el medio es solo `EFECTIVO` o `TRANSFERENCIA`. |
| S4 | "Al guardar una compra, el sistema deberá crear un lote activo independiente con un stock inicial de $10 \times N$ resmas enteras y calcular automáticamente el costo unitario por resma dividiendo el costo de la caja entre 10." |
| S6 | "Cuando el stock de resmas de una caja llegue a 0 tras una venta, el sistema deberá cambiar el estado del lote a *Agotado* y ocultarlo de la lista de selección de ventas activas, conservando su registro para el historial contable." Aquí van la regla y el repositorio; la venta que los usa es de la Etapa 3. |
| S7 | "Reemplazarlo por un movimiento **Aporte de capital** que entra a un bolsillo. Así toda compra sale de Efectivo o Transferencia y el arqueo se puede rastrear." |
| S8 | "Permitirla, pero que el excedente descuente la **ganancia libre** como reinversión, con un aviso." La regla ya existe en `compraLote`; tú devuelves el monto de la reinversión para que la pantalla lo avise. |

### Ejemplos que son pruebas

| ID | Situación | Resultado esperado |
|----|-----------|--------------------|
| E1 | El negocio empieza en cero. Aporte de capital de $300.000 en efectivo. | efectivo $300.000, capital en caja $300.000, ganancia libre $0 |
| E2 | Con E1 hecho, compra de 2 cajas Carta a $120.000 cada una, en efectivo. | lote nuevo `ACTIVO` con 20 resmas de 20 y costo de $12.000 por resma; efectivo $60.000, capital en caja $60.000; sin reinversión (`reinversion = 0`) |
| E3 | Capital en caja $100.000, ganancia libre $30.000 y transferencia $130.000. Compra de 1 caja Oficio a $120.000 por transferencia. | lote de 10 resmas a $12.000; `reinversion = 20000`; capital en caja $0, ganancia libre $10.000 |
| E4 | Efectivo $50.000. Compra de 1 caja a $120.000 en efectivo. | se rechaza (`SALDO_INSUFICIENTE`) y **no** queda ningún lote ni movimiento nuevo |
| E5 | Compra con un costo por caja de $120.005. | se rechaza (`COSTO_CAJA_INVALIDO`) |
| E6 | Compra de 0 cajas. | se rechaza (`CANTIDAD_INVALIDA`) |
| E7 | Un lote con 3 resmas disponibles. Se descuentan 3. | el lote queda con 0 resmas y `AGOTADO`; ya no sale en `activos`, pero sigue en `lotes_cajas`. Descontar 4 de ese mismo lote (con 3) se rechaza (`STOCK_INSUFICIENTE`) |

Para armar los saldos de E3 con la base real, usa las funciones de `finanzas/domain/operaciones.ts` y `LibroRepository.registrar`:

1. un aporte de $100.000 en transferencia;
2. un `cobro` en transferencia con capital $0 y ganancia $30.000.

Así quedan transferencia $130.000, capital en caja $100.000 y ganancia libre $30.000. Ojo: `movimientos_dinero.id_abono` tiene clave foránea a `abonos`, así que el `COBRO` necesita antes una fila real en `abonos`. En la preparación de la prueba, insértala con SQL para el cliente Mostrador, que crea la migración: `INSERT INTO abonos (id_cliente, fecha_abono, monto_total_abonado, medio_pago, tipo_abono) VALUES ((SELECT id_cliente FROM clientes WHERE es_mostrador = 1), ?, 30000, 'TRANSFERENCIA', 'PAGO_CONTADO')`. Usa el `lastInsertId` como `idAbono`. Es solo preparación de datos; no crees un repositorio de abonos.

## Rutas permitidas

```
src/app/inventario/domain/**
src/app/inventario/infrastructure/**
src/app/inventario/application/**
src/app/inventario/index.ts
src/app/finanzas/application/**
src/app/shared/domain/regla-negocio.error.ts
src/app/shared/domain/regla-negocio.error.spec.ts
```

Prohibido todo lo demás. En particular, no toques `src/main.ts`, `src/app/app.*`, `src/app/shell/`, `e2e/` ni `.github/`, que son de B2.2.

## Qué hacer

1. **Códigos nuevos** en `CodigoRegla` (`shared/domain/regla-negocio.error.ts`), con un comentario en inglés en la misma línea, como los demás:
   - `CANTIDAD_INVALIDA`: cajas o resmas ≤ 0 o no enteras;
   - `COSTO_CAJA_INVALIDO`: costo por caja ≤ 0 o no divisible por 10;
   - `STOCK_INSUFICIENTE`: se descuentan más resmas de las disponibles.

   No cambies los códigos que ya existen ni la clase.
2. **`inventario/domain/lote.ts`**, como funciones puras. Usa los tipos de `shared/domain` (`Pesos`, `Resmas`, `Cajas`, `TipoPapel`, `MedioPago`, `FechaHora`, `RESMAS_POR_CAJA`, `cajasAResmas`) en vez de crear otros:
   - `interface Lote { idLote: number; tipoPapel; fechaCompra: FechaHora; cantidadCajas; costoPorCaja: Pesos; costoUnitarioResma: Pesos; resmasIniciales: Resmas; resmasDisponibles: Resmas; medioPagoCompra: MedioPago; estado: 'ACTIVO' | 'AGOTADO' }`;
   - `nuevoLote(tipoPapel, cajas, costoPorCaja) → NuevoLote { tipoPapel, cantidadCajas, costoPorCaja, costoUnitarioResma, resmasIniciales, costoTotal }`, con `costoUnitarioResma = costoPorCaja / 10`, `resmasIniciales = cajas × 10` y `costoTotal = cajas × costoPorCaja`. Lanza `CANTIDAD_INVALIDA` si `cajas` es ≤ 0 o no entero, y `COSTO_CAJA_INVALIDO` si `costoPorCaja` es ≤ 0, no entero o no divisible por 10;
   - `descontarResmas(lote, cantidad) → { resmasDisponibles, estado }`: `estado` es `'AGOTADO'` exactamente cuando `resmasDisponibles` llega a 0. Lanza `CANTIDAD_INVALIDA` si `cantidad` es ≤ 0 o no entera, y `STOCK_INSUFICIENTE` si supera lo disponible;
   - `progreso(lote) = resmasDisponibles / resmasIniciales`, un número entre 0 y 1;
   - `agruparPorTipo(lotes) → { CARTA: Lote[]; OFICIO: Lote[] }`, con solo los `ACTIVO` y ordenados por `fechaCompra` ascendente y, si empatan, por `idLote` ascendente (D6).

   Crea `inventario/domain/index.ts` para reexportarlas.
3. **`inventario/infrastructure/lote.repository.ts`**, `@Injectable({ providedIn: 'root' })` sin estado, como `LibroRepository`. Recibe el `SqlExecutor` o la `SqlDatabase` como parámetro:
   - `insertar(tx: SqlExecutor, nuevo: NuevoLote, fecha: FechaHora, medio: MedioPago): Promise<number>`: inserta en `lotes_cajas` con `resmas_disponibles = resmas_iniciales` y `estado = 'ACTIVO'`, y devuelve el id;
   - `activos(db: SqlDatabase | SqlExecutor): Promise<Lote[]>`: solo `estado = 'ACTIVO'`, con `ORDER BY fecha_compra ASC, id_lote ASC`;
   - `porId(db, idLote): Promise<Lote | null>`;
   - `descontar(tx: SqlExecutor, idLote: number, cantidad: Resmas): Promise<Lote>`: lee el lote, aplica `descontarResmas`, actualiza `resmas_disponibles` y `estado` en un solo `UPDATE` y devuelve el lote actualizado. Si el lote no existe, lanza un `Error` con un mensaje en inglés.

   Las columnas y los CHECK de `lotes_cajas` están en `src/app/shared/infrastructure/sqlite/migrations/001-esquema-inicial.ts` (líneas 15–27).
4. **`inventario/application/registrar-compra.ts`**, `@Injectable({ providedIn: 'root' })`, que inyecta `SQL_DATABASE`, `LoteRepository` y `LibroRepository`:
   - `registrar({ tipoPapel, cajas, costoPorCaja, fecha, medio }): Promise<{ idLote: number; reinversion: Pesos }>`, dentro de **una** `db.transaction`:
     1. `nuevoLote(...)`;
     2. `saldos = await libro.saldos(tx)`;
     3. `idLote = await lotes.insertar(tx, nuevo, fecha, medio)`;
     4. `{ movimiento, reinversion } = compraLote(saldos, fecha, medio, nuevo.costoTotal, idLote)`;
     5. `await libro.registrar(tx, movimiento)`.

     Si algo lanza, la transacción hace rollback y no queda nada (D2). **Reutiliza `compraLote` y `LibroRepository.registrar`: no escribas en `movimientos_dinero` por tu cuenta.**
   - `previsualizar({ tipoPapel, cajas, costoPorCaja, medio }): Promise<{ costoTotal: Pesos; costoUnitarioResma: Pesos; reinversion: Pesos; saldoBolsillo: Pesos; alcanza: boolean }>`: calcula con `nuevoLote` y `compraLote` sobre `libro.saldos(db)` **sin escribir nada**. Si `compraLote` lanza `SALDO_INSUFICIENTE`, devuelve `alcanza = false` en vez de lanzar. Los demás errores (`CANTIDAD_INVALIDA`, `COSTO_CAJA_INVALIDO`) sí se lanzan. Para llamar a `compraLote` hace falta un `idLote`: usa `0`, que nunca se guarda.

   Crea `inventario/application/index.ts` y `inventario/index.ts`, que reexporten el dominio, el repositorio y el caso de uso.
5. **`finanzas/application/`**:
   - `registrar-aporte.ts`: `RegistrarAporte.registrar({ fecha, medio, monto }): Promise<number>`, que usa `aporteCapital` y `LibroRepository.registrar` dentro de una `db.transaction` y devuelve el id del movimiento;
   - `consultar-saldos.ts`: `ConsultarSaldos.saldos(): Promise<Saldos>`, que llama a `LibroRepository.saldos(db)`;
   - `index.ts`, que los reexporta. No cambies `finanzas/index.ts`, que está fuera de tus rutas: la pantalla importará desde `finanzas/application`.

## Pruebas (primero RED, después GREEN)

Sigue la regla 6. Cada rechazo se acota con `toThrow(expect.objectContaining({ codigo: '...' }))`, o con `rejects.toMatchObject({ codigo: '...' })` en las promesas.

| Archivo | Casos |
|---------|-------|
| `inventario/domain/lote.spec.ts` | `nuevoLote`: 2 cajas a $120.000 dan 20 resmas, $12.000 por resma y $240.000 en total; E5 con $120.005; costo 0; E6 con 0 cajas; 1,5 cajas. `descontarResmas`: E7 (3 de 3 da `AGOTADO`, 4 de 3 da `STOCK_INSUFICIENTE`); 1 de 3 sigue `ACTIVO` con 2; cantidad 0. `progreso`: 7 de 10 da 0,7. `agruparPorTipo`: excluye los agotados, separa por tipo y ordena por fecha y, si empatan, por id. |
| `inventario/infrastructure/lote.repository.spec.ts` | Con `SqlJsDatabase.create()` y `migrar(db, MIGRACIONES)`, igual que `finanzas/infrastructure/libro.repository.spec.ts`. `insertar` y `porId` guardan todos los campos; `activos` excluye los agotados y ordena dos lotes de la misma fecha por id; `descontar` de E7 deja la fila en `AGOTADO` con 0 y la fila sigue en la tabla. |
| `inventario/application/registrar-compra.spec.ts` | Con la base real (sql.js y migración) y los repositorios reales, construidos con `TestBed` o a mano. E2 y E3 dan los lotes y los saldos esperados (`libro.saldos`). E4 deja `lotes_cajas` y `movimientos_dinero` con el mismo número de filas que antes. `previsualizar` no escribe ninguna fila, devuelve `reinversion = 20000` en E3 y `alcanza = false` en E4. Después de E1 y E2, `verificarInvariante(await libro.saldos(db))` no lanza. |
| `finanzas/application/registrar-aporte.spec.ts` | E1 con la base real; un monto de 0 se rechaza con `MONTO_INVALIDO` y no deja ninguna fila. `ConsultarSaldos` devuelve lo mismo que `libro.saldos(db)`. |

## Fuera de alcance

- Pantallas, rutas y textos para el usuario: son de B2.3.
- La venta y el descuento de stock desde una factura: Etapa 3.
- Modificar la migración `001` o el esquema.

## Verificación

Este bloque corre en paralelo con B2.2: **no corras `npm run build`**, porque los dos escribirían en `www/`. Compila el coordinador.

```
npm run lint
npm run test:unit
```

Copia el resultado de cada uno, con el número de pruebas. Si falla algo en archivos de B2.2 (`src/app/shell/`, `src/main.ts`, `src/app/app.*`, `e2e/`), anótalo, pero no lo toques.
