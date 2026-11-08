
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
