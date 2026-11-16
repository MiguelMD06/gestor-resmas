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

# Tarea B3.2 — Venta: dominio, repositorios y caso de uso

**Etapa 3, ola 1.** Trabajas en paralelo con B3.1 (clientes) y B3.4 (campo de pesos), que tocan otras rutas. Antes de empezar, lee completos `CLAUDE.md` (raíz del repositorio; sus reglas 1 a 12 son obligatorias), `planificacion/comun/modelo-contable.md` y `planificacion/etapas/3-clientes-venta/PLAN.md` hasta la sección `## Log`. Tu bloque es **B3.2**; si esta tarea y el plan no coinciden, manda el plan y lo informas.

## Specs que cubres

S2, S3, S4, S5, S8, S9, S10, S11 y S12; ejemplos E6 a E14, E16, E17 y E20; decisiones D2, D3, D4, D5, D6, D13 y D14. Lee su texto en el plan. Las cifras de los ejemplos son exactas: úsalas tal cual.

## Rutas permitidas

```
src/app/ventas/domain/**
src/app/ventas/infrastructure/**
src/app/ventas/application/**
src/app/ventas/index.ts
src/app/cartera/infrastructure/**
src/app/cartera/index.ts
```

Prohibido todo lo demás, incluidos `src/app/ventas/ui/**` (ola 2), `src/app/clientes/**` (B3.1) y `lotes_cajas` o `movimientos_dinero` fuera de sus repositorios. Si te falta algo de `LoteRepository`, detente y explícalo en el reporte.

## Lo que ya existe y debes reutilizar (no lo reimplementes)

- **`evaluarLinea(cantidad, costoUnitario, precioUnitario) → { subtotalVenta, subtotalCosto, margen, bajoCosto }`** y `perdida(totalVenta, costoBase)` en `src/app/ventas/domain/margen.ts`.
- **`repartirPago(factura: FacturaAbierta, monto) → { capital, ganancia }`** en `src/app/cartera/domain/reparto-pago.ts` (R-01). `FacturaAbierta { idVenta, fecha, total, costoBase, pagado }`.
- **`cobro(fecha, medio, capital, ganancia, idAbono) → Movimiento`** en `src/app/finanzas/domain/operaciones.ts` y **`LibroRepository.registrar(tx, movimiento)`**. Es la única forma de escribir en `movimientos_dinero`.
- **`LoteRepository.porId(db, idLote) → Lote | null`** y **`LoteRepository.descontar(tx, idLote, cantidad) → Lote`** (aplica `descontarResmas`: pasa a `AGOTADO` en 0 y lanza `STOCK_INSUFICIENTE`). Es la única forma de cambiar `lotes_cajas`.
- **Transacciones:** `SQL_DATABASE`, `db.transaction(async (tx) => …)`. Patrón: `src/app/inventario/application/registrar-compra.ts`.
- **Reloj:** token `CLOCK`; `ahora` sale de ahí.
- **Tipos:** `Pesos`, `pesos`, `Resmas`, `resmasPositivas`, `MedioPago`, `FechaHora`, `fechaHora` en `src/app/shared/domain/`.
- **Códigos** (ya existen): `VENTA_SIN_LINEAS`, `LOTE_REPETIDO`, `CANTIDAD_RESMAS_INVALIDA`, `PRECIO_INVALIDO`, `STOCK_INSUFICIENTE`, `ABONO_INICIAL_INVALIDO`, `MOSTRADOR_SOLO_CONTADO`, `CLIENTE_INEXISTENTE`, `FECHA_FUTURA`.
- **Esquema** (migración `001`, no lo cambies): `ventas` (con CHECK de `saldo_pendiente = total_venta - monto_pagado` y de `estado_pago` `PAGADA`/`PARCIAL`/`PENDIENTE`), `detalle_ventas` (con CHECK de subtotales), `abonos` (`tipo_abono` `PAGO_CONTADO` o `ABONO_INICIAL` en esta etapa), `abonos_detalle_facturas` (`capital_aplicado + ganancia_aplicada = monto_aplicado`).

## Especificación

1. **`ventas/domain/venta.ts`**: `armarVenta({ idCliente, esMostrador, fecha, ahora, lineas, pago })`, función pura.
   - `lineas: { idLote, costoUnitario, disponibles, cantidad, precioUnitario }[]`. Rechaza, en este orden: `VENTA_SIN_LINEAS` (lista vacía); `LOTE_REPETIDO` (mismo `idLote` dos veces, D5); `CANTIDAD_RESMAS_INVALIDA` (cantidad no entera o ≤ 0); `PRECIO_INVALIDO` (precio no entero o ≤ 0; cualquier entero > 0 vale, D14); `STOCK_INSUFICIENTE` (cantidad > disponibles).
   - `fecha > ahora` → `FECHA_FUTURA` (D6). Las fechas son `FechaHora` (`YYYY-MM-DD HH:MM:SS`, comparables como texto).
   - `pago`: `{ modalidad: 'CONTADO', medio }` cobra el total; `{ modalidad: 'FIADO' }` no cobra nada; `{ modalidad: 'ABONO_INICIAL', monto, medio }` exige `1 ≤ monto ≤ total − 1` (`ABONO_INICIAL_INVALIDO`). Con `esMostrador`, todo lo que no sea `CONTADO` → `MOSTRADOR_SOLO_CONTADO`.
   - Devuelve `{ totalVenta, costoTotalBase, montoPagado, saldoPendiente, estadoPago, lineas (cada una con su evaluarLinea), cobro }`, donde `cobro` es `null` en fiado o `{ tipoAbono: 'PAGO_CONTADO' | 'ABONO_INICIAL', monto, medio, capital, ganancia }`, con capital y ganancia de `repartirPago` sobre la factura nueva (pagado 0).
2. **`ventas/infrastructure/venta.repository.ts`**: `insertar(tx, venta, idCliente, fecha) → idVenta`, con sus líneas en `detalle_ventas`; y `esMostrador(db, idCliente) → boolean | null` (`null` si el cliente no existe), con una consulta a `clientes`. No escribas en `clientes`.
3. **`cartera/infrastructure/abono.repository.ts`**: `insertar(tx, { idCliente, fecha, monto, medio, tipo, aplicaciones: { idVenta, monto, capital, ganancia }[] }) → idAbono`. Exporta `AbonoRepository` desde `cartera/index.ts` (créalo si no existe, exportando también `domain`).
4. **`ventas/application/registrar-venta.ts`**: `RegistrarVenta.registrar({ idCliente, fecha, lineas: { idLote, cantidad, precioUnitario }[], pago }) → { idVenta }`, en **una** transacción y en este orden (D4): `esMostrador` (`CLIENTE_INEXISTENTE` si no existe); `porId` de cada lote dentro de la transacción (un lote inexistente o `AGOTADO` → `STOCK_INSUFICIENTE`); `armarVenta` con `ahora` del `CLOCK`; `descontar` cada línea; `VentaRepository.insertar`; si hay `cobro`, `AbonoRepository.insertar` con su aplicación a la venta y `LibroRepository.registrar(tx, cobro(fecha, medio, capital, ganancia, idAbono))`. Venta, abono y movimiento usan la misma `fecha` (D6). Si algo falla, no queda nada escrito.

## Pruebas (primero RED)

Con `SqlJsDatabase.create()` + `migrar(db, MIGRACIONES)`, el estado de partida del plan (aporte de $400.000 en efectivo con `RegistrarAporte`, lote A Carta 2 cajas a $120.000 y lote B Carta 1 caja a $130.000 con `RegistrarCompra`, ambos en efectivo) y a Ana insertada en `clientes` con un `INSERT` directo en el arreglo de la prueba (B3.1 escribe `ClienteRepository` en paralelo; no lo uses):

- E6, E7, E8, E9, E10, E11, E12, E13, E14, E16, E17 y E20, con todos los efectos que nombra el plan: filas de `ventas`, `detalle_ventas`, `abonos`, `abonos_detalle_facturas` y `movimientos_dinero`, `resmas_disponibles` y `estado` de los lotes, y saldos con `LibroRepository.saldos`.
- E12 deja las 5 tablas exactamente como estaban (compara el contenido antes y después).
- Un fallo forzado después de descontar el primer lote de una venta multilote no deja nada escrito.
- E17: dos `registrar` concurrentes de la misma venta de las 20 resmas del lote A → una se guarda y la otra se rechaza con `STOCK_INSUFICIENTE`; queda una sola venta y un solo movimiento.
- Después de E6, E7 y E9, `verificarInvariante(saldos)` se cumple.
- Dominio: cada rechazo de `armarVenta` con su valor límite exacto (abono inicial de 1 y de total − 1 válidos; 0 y total, rechazados; fecha igual a `ahora` válida y un segundo después, rechazada).

## Verificación

Corre en primer plano y copia el resultado (con el número de pruebas):

```
npm run lint
npm run test:unit
```

**No corras `npm run build` ni `npm run test:e2e`:** otros dos bloques trabajan en paralelo y comparten `www/`; los corre el coordinador al terminar la ola. Indica qué prueba cubre cada `S#`, `E#` y `D#` de esta tarea.
