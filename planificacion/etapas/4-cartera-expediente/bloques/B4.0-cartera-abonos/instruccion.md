[MODO EJECUTOR]

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

## Reglas de calidad y de interfaz

- **Reglas 1 a 12 de `CLAUDE.md`** (raíz del repositorio): son obligatorias en todo bloque. Léelas antes de empezar: validación de cada campo, guarda contra el doble envío, vista bloqueada mientras procesa, cuatro estados de carga, reintentos seguros, pruebas obligatorias, dinero en enteros, confirmación de acciones irreversibles, sin código muerto, accesibilidad mínima, fechas desde `CLOCK` y checklist del PR.
- **Diseño:** las pantallas siguen `planificacion/comun/diseno.md` y los mockups aprobados.
- **Montos que se escriben:** usa siempre el campo de pesos de `src/app/shared/ui/` (muestra "$ 3.800" y entrega el entero `3800`, o `null` si está vacío). No crees otro campo de dinero.
- **La app es *zoneless*:** el estado que cambia después de un `await` vive en signals; si no, la pantalla no se actualiza.

## Reglas de trabajo

1. **Solo tocas las rutas permitidas** de tu tarea. Si necesitas otra, no la toques: detente y explícalo en el reporte.
2. **No uses git:** nada de `commit`, `add`, `stash`, `checkout` ni `push`. El coordinador revisa y hace los commits.
3. **Pruebas primero** cuando haya una regla con resultado esperado claro: escribe la prueba, mírala fallar (RED), implementa (GREEN) y refactoriza con las pruebas en verde. Escribe una prueba por cada regla que pide la tarea, y cada prueba verifica todos los efectos observables de la regla.
4. **Archivos temporales** fuera del repositorio. Si alguno queda dentro, informa su ruta exacta.
5. **No instales dependencias** salvo que la tarea lo pida, y nunca corras formateadores, generadores ni instalaciones sobre todo el repositorio.
6. **Pruebas que prueban lo que dicen:**
   - prueba intentando romper el código: además del caso feliz, cubre valores límite, el segundo y el último elemento (no solo el primero), repetir la acción (doble envío) y fallos de carga o escritura;
   - cada prueba llama a la función que nombra su título;
   - un rechazo esperado se acota al error exacto: `toThrow(expect.objectContaining({ codigo: '...' }))` o un mensaje concreto, nunca `toThrow()` o `rejects.toThrow()` a secas;
   - nada de `try/catch` para verificar un error: si no se lanza, la prueba tiene que fallar;
   - los casos límite usan el valor límite exacto.
7. **Engram:** tienes acceso de solo lectura. Úsalo si te sirve para tener contexto; nunca intentes escribir en él.
8. **Cierra todo servidor** que levantes para una prueba apenas termine.

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
npm run test:e2e
```

Si tu bloque corre en paralelo con otro, la tarea dice cuáles de estos comandos corre el coordinador (por ejemplo, `build` porque los dos escribirían en `www/`, o `test:e2e` porque ambos usarían el puerto 4200).

## Reporte final

1. Qué hiciste, archivo por archivo.
2. Qué `S#` de la tarea cubriste y con qué prueba.
3. Resultado de cada comando de verificación (`<comando>: <resultado observado>`).
4. Lo que quedó pendiente o no pudiste verificar.
5. Rutas de archivos temporales, si las hubo.

Cierra con una sección `## Key Learnings` de 1 a 5 puntos numerados, cada uno con un aprendizaje reutilizable en una oración completa. Omítela si no hubo ninguno.

---

# Tarea B4.0 — Consultas de cartera y registro de abonos

## Objetivo

Conectar el dominio de cartera que ya existe (Etapa 1) con la base de datos: leer las facturas abiertas, la deuda de cada cliente y el expediente de un cliente, y registrar abonos en sus tres modos (a la deuda en cascada, a una factura y pagar todo) en **una sola transacción**. Este bloque no tiene interfaz: las pantallas llegan en los bloques B4.1 a B4.3 de esta misma etapa, que usarán lo que exportes aquí.

## Rutas

**Permitidas** (solo estas):

- `src/app/cartera/domain/**`
- `src/app/cartera/application/**` (carpeta nueva)
- `src/app/cartera/infrastructure/**`
- `src/app/cartera/index.ts`
- `src/app/shared/domain/regla-negocio.error.ts` (solo agregar el código `ABONO_ANTERIOR_A_FACTURA`)
- `src/app/shared/ui/mensajes-error.ts` y `src/app/shared/ui/mensajes-error.spec.ts` (solo el texto de `ABONO_ANTERIOR_A_FACTURA`)

**Prohibidas:** todo lo demás. En especial `src/app/shared/infrastructure/sqlite/migrations/**` (no hay migración en esta etapa), `src/app/ventas/**`, `src/app/finanzas/**` y `src/app/clientes/**`: esas clases se **usan**, no se cambian. Tampoco toques `src/verificacion/**`, que es la carpeta del verificador.

## Specs que cubre (citas textuales del plan)

- **S2 (RF-11):** "El sistema deberá calcular el saldo total adeudado por cada cliente sumando los saldos pendientes de todas sus facturas en estado *Pendiente* o *Abonada Parcialmente*."
- **S3 (RF-12):** "Cuando un cliente realice un abono general a su deuda total indicando el monto y el medio de pago (Efectivo o Transferencia), el sistema deberá descontar el dinero empezando por la factura pendiente más antigua; si el abono cubre la totalidad de esa factura, la marcará como *Pagada* y aplicará el excedente sucesivamente a las siguientes facturas en orden cronológico ascendente."
- **S4 (RF-13):** "El sistema deberá permitir al usuario seleccionar una factura pendiente específica del cliente para aplicarle un abono parcial o pago total de manera aislada, sin afectar las demás facturas abiertas."
- **S5 (RF-14):** "El sistema deberá incluir una función rápida para saldar el 100% de la deuda acumulada de un cliente, cerrando todas sus facturas pendientes y registrando el ingreso por el medio de pago seleccionado (Efectivo o Transferencia)."
- **S6 (RF-15):** "Por cada abono recibido, el sistema deberá almacenar la fecha, el monto entregado, el medio de pago (Efectivo o Transferencia) y el detalle exacto de a qué factura o facturas se aplicó el descuento."
- **S8 (R-13):** "**Nada con fecha futura:** compra, aporte, venta, abono, retiro y traspaso llevan la fecha de ahora (del `CLOCK`) o una pasada, nunca una posterior (`FECHA_FUTURA`)."
- **S9 (R-01):** "**Reparto de un pago a una factura:** `capital_aplicado = min(pagado + m, costo) − min(pagado, costo)` y `ganancia_aplicada = m − capital_aplicado`"
- **S10 (R-02, R-03, R-04):** "**Cascada:** se recorren las facturas con saldo del cliente en orden `fecha_venta ASC, id_venta ASC`, y cada una recibe hasta su saldo. El monto no puede superar la deuda total." · "**Abono individual:** el monto no puede superar el saldo de esa factura." · "**Liquidación total:** equivale a una cascada por el 100 % de la deuda."
- **S11 (R-11):** "**Operación compuesta = una transacción:** si algo falla, no queda nada escrito."
- **S16:** "Por factura, el capital por recuperar es `min(costo, total) − min(pagado, costo)` y el resto es ganancia futura."
- **D14 (regla nueva):** el abono no es anterior a las facturas que paga: su fecha debe ser igual o posterior a la de **cada** factura que recibe dinero. Código `ABONO_ANTERIOR_A_FACTURA`, texto exacto «La fecha del abono es anterior a una factura que paga».
- **D15:** el historial de abonos del expediente muestra `ABONO_INICIAL`, `CASCADA_GLOBAL`, `FACTURA_INDIVIDUAL` y `LIQUIDACION_TOTAL`; **no** muestra `PAGO_CONTADO`.

## Lo que ya existe y debes reutilizar

No reimplementes ninguno de estos pasos con otra forma:

- `src/app/cartera/domain/`: `FacturaAbierta`, `saldo`, `validarFactura`, `repartirPago` (R-01), `deudaTotal`, `distribuirCascada`, `abonarFactura`, `liquidarTodo` y `AplicacionAbono`. Ya lanzan `MONTO_INVALIDO`, `SIN_DEUDA`, `MONTO_SUPERA_DEUDA` y `MONTO_SUPERA_SALDO_FACTURA`.
- `AbonoRepository.insertar(tx, NuevoAbono)` (`cartera/infrastructure/abono.repository.ts`): escribe `abonos` y `abonos_detalle_facturas`.
- `cobro(fecha, medio, capital, ganancia, idAbono)` (`finanzas/domain/operaciones.ts`) y `LibroRepository.registrar(tx, movimiento)` (`finanzas/infrastructure/libro.repository.ts`): el movimiento `COBRO` del libro.
- `ClienteRepository.porId(db, idCliente)` (`clientes/infrastructure/cliente.repository.ts`).
- `SQL_DATABASE` y `db.transaction(async (tx) => …)`; `CLOCK` y `clock.ahora()`.
- La comparación de fechas de `FECHA_FUTURA` en `ventas/domain/venta.ts:141` (`fecha > ahora`, texto `YYYY-MM-DD HH:MM:SS`).
- **Patrón a seguir:** `src/app/ventas/application/registrar-venta.ts` (inyección, transacción, abono y cobro) y sus pruebas `registrar-venta.spec.ts` (`SqlJsDatabase` de `src/testing/` con las `MIGRACIONES` aplicadas).

El esquema `001` ya tiene todo: `abonos.tipo_abono` acepta `CASCADA_GLOBAL`, `FACTURA_INDIVIDUAL` y `LIQUIDACION_TOTAL`; `ventas` tiene los CHECK `saldo_pendiente = total_venta - monto_pagado`, `(estado_pago = 'PENDIENTE') = (monto_pagado = 0)` y `(estado_pago = 'PAGADA') = (saldo_pendiente = 0)`, con estados `PENDIENTE`, `PARCIAL` y `PAGADA`.

## Qué hacer

### 1. Dominio (`src/app/cartera/domain/`)

- **`por-cobrar.ts`**: `porCobrar(f: FacturaAbierta): { readonly capital: Pesos; readonly ganancia: Pesos }`. `capital = min(costoBase, total) − min(pagado, costoBase)` y `ganancia = saldo(f) − capital` (S16). Con una venta bajo costo (total menor que el costo) la ganancia por cobrar es 0, nunca negativa.
- **`fecha-abono.ts`**: `validarFechaAbono(fecha: FechaHora, ahora: FechaHora, facturasQueReciben: readonly FacturaAbierta[]): void`. Lanza `FECHA_FUTURA` si `fecha > ahora` y `ABONO_ANTERIOR_A_FACTURA` si `fecha` es anterior a la `fecha` de alguna de las facturas que reciben dinero. Una fecha igual a la de la factura es válida.
- Exporta los dos desde `domain/index.ts`.

### 2. Código de error

- `regla-negocio.error.ts`: agrega `'ABONO_ANTERIOR_A_FACTURA'` a `CodigoRegla`, con su comentario en inglés como los demás.
- `mensajes-error.ts`: `ABONO_ANTERIOR_A_FACTURA: 'La fecha del abono es anterior a una factura que paga'`, con su prueba de texto exacto en `mensajes-error.spec.ts`.

### 3. Repositorio de cartera (`src/app/cartera/infrastructure/cartera.repository.ts`, nuevo)

`@Injectable({ providedIn: 'root' }) export class CarteraRepository`, con `db: SqlDatabase | SqlExecutor` en las lecturas, como `ClienteRepository`:

- `facturasAbiertas(db, idCliente): Promise<FacturaAbierta[]>`: ventas del cliente con `saldo_pendiente > 0`, en orden `fecha_venta ASC, id_venta ASC`. `total = total_venta`, `costoBase = costo_total_base`, `pagado = monto_pagado`.
- `deudasPorCliente(db): Promise<ReadonlyMap<number, Pesos>>`: una sola consulta con `SUM(saldo_pendiente) … GROUP BY id_cliente` sobre las ventas con saldo. Un cliente sin deuda no aparece en el mapa.
- `aplicarPago(tx: SqlExecutor, idVenta: number, monto: Pesos): Promise<void>`: un solo `UPDATE ventas` que suma `monto` a `monto_pagado`, lo resta de `saldo_pendiente` y recalcula `estado_pago` (`PAGADA` si el saldo queda en 0; si no, `PARCIAL`), con `WHERE id_venta = ? AND saldo_pendiente >= ?`. Si no cambia exactamente una fila, lanza un `Error` (mensaje en inglés) para que la transacción se revierta.
- `expediente(db, idCliente)`: devuelve
  - `facturas`: **todas** las ventas del cliente, de la más nueva a la más antigua (`fecha_venta DESC, id_venta DESC`), cada una con `idVenta`, `fecha`, `total`, `costoBase`, `pagado`, `saldo`, `estado` (`'PENDIENTE' | 'PARCIAL' | 'PAGADA'`) y `lineas` (`cantidad`, `tipoPapel` de `lotes_cajas.tipo_papel`, `precioUnitario`, `subtotal`), en orden `id_detalle ASC`;
  - `abonos`: los abonos del cliente **sin** `PAGO_CONTADO` (D15), del más nuevo al más antiguo (`fecha_abono DESC, id_abono DESC`), cada uno con `idAbono`, `fecha`, `monto`, `medio`, `tipo` y `aplicaciones` (`idVenta`, `monto`) en orden `id_venta ASC`.
  Sin consultas N+1 por factura: como mucho una consulta por tabla.

### 4. Casos de uso (`src/app/cartera/application/`, nuevo)

- **`registrar-abono.ts`**: `@Injectable({ providedIn: 'root' }) export class RegistrarAbono` con

  ```ts
  export type SolicitudRegistrarAbono =
    | { readonly modo: 'CASCADA_GLOBAL'; readonly idCliente: number; readonly fecha: FechaHora; readonly medio: MedioPago; readonly monto: Pesos }
    | { readonly modo: 'FACTURA_INDIVIDUAL'; readonly idCliente: number; readonly fecha: FechaHora; readonly medio: MedioPago; readonly idVenta: number; readonly monto: Pesos }
    | { readonly modo: 'LIQUIDACION_TOTAL'; readonly idCliente: number; readonly fecha: FechaHora; readonly medio: MedioPago };

  registrar(s: SolicitudRegistrarAbono): Promise<{ readonly idAbono: number; readonly aplicaciones: readonly AplicacionAbono[] }>;
  ```

  Todo dentro de **un** `db.transaction`, en este orden:
  1. el cliente existe (`ClienteRepository.porId`); si no, `CLIENTE_INEXISTENTE`;
  2. lee `facturasAbiertas` **dentro** de la transacción;
  3. calcula las aplicaciones con `distribuirCascada`, `abonarFactura` o `liquidarTodo` según el modo. En `FACTURA_INDIVIDUAL`, si `idVenta` no está entre las facturas abiertas del cliente: `SIN_DEUDA` si la venta es del cliente y ya está pagada, y `FACTURA_INVALIDA` si no existe o es de otro cliente;
  4. `validarFechaAbono(s.fecha, clock.ahora(), facturas que reciben dinero)`;
  5. `AbonoRepository.insertar` con `tipo = s.modo`, `monto` = suma de las aplicaciones y una fila por aplicación;
  6. `CarteraRepository.aplicarPago` por cada aplicación;
  7. `LibroRepository.registrar(tx, cobro(s.fecha, s.medio, Σ capital, Σ ganancia, idAbono))`.

- **`consultar-cartera.ts`**: `ConsultarCartera.consultar(): Promise<{ readonly total: Pesos; readonly porCliente: ReadonlyMap<number, Pesos> }>`, con `total` = suma del mapa.
- **`consultar-expediente.ts`**: `ConsultarExpediente.consultar(idCliente): Promise<ExpedienteCliente>`, con el `cliente` (`ClienteRepository.porId`; `CLIENTE_INEXISTENTE` si no existe), las `facturas` y los `abonos` del repositorio, y `deuda: { total, capital, ganancia }`: `total` con `deudaTotal` y `capital`/`ganancia` sumando `porCobrar` de las facturas abiertas.
- `application/index.ts` los exporta; `cartera/index.ts` exporta `application` además de lo que ya exporta.

## Pruebas

Pruebas primero (RED → GREEN). Unitarias del dominio y pruebas del repositorio y de los casos de uso contra `SqlJsDatabase` con las `MIGRACIONES`, como `registrar-venta.spec.ts`. Usa un `CLOCK` fijo en 2026-11-20 12:00:00.

**Datos de partida** (créalos con `RegistrarVenta` o con inserciones directas que respeten los CHECK): la clienta **Ana** con **F1** del 2026-11-01 10:00:00 (total $30.000, costo $20.000, pagado $0, Pendiente) y **F2** del 2026-11-10 10:00:00 (total $15.000, costo $10.000, pagado $5.000 de abono inicial, Parcial); **Beto** sin compras; y el Mostrador.

Cada prueba verifica **todos** los efectos observables: las filas de `ventas` (`monto_pagado`, `saldo_pendiente`, `estado_pago`), la fila de `abonos` (`tipo_abono`, `monto_total_abonado`, `medio_pago`, `fecha_abono`), las de `abonos_detalle_facturas` (`monto_aplicado`, `capital_aplicado`, `ganancia_aplicada`) y la fila `COBRO` de `movimientos_dinero` (`delta_bolsillo`, `delta_capital`, `delta_ganancia`, `medio`, `id_abono`). En los rechazos, verifica que **no** cambió ninguna de esas tablas. Los criterios de aceptación que siguen dicen qué se exige.

---

# Criterios de aceptación — B4.0

Datos de partida en todos los criterios (salvo que el criterio diga otra cosa): `CLOCK` fijo en 2026-11-20 12:00:00; **Ana** con **F1** (2026-11-01 10:00:00, total $30.000, costo $20.000, pagado $0, `PENDIENTE`) y **F2** (2026-11-10 10:00:00, total $15.000, costo $10.000, pagado $5.000 por un `ABONO_INICIAL`, `PARCIAL`); **Beto** sin compras; el Mostrador. Base `SqlJsDatabase` con las `MIGRACIONES`.

"No escribe nada" significa: `ventas`, `abonos`, `abonos_detalle_facturas` y `movimientos_dinero` quedan exactamente como antes de la llamada.

- C1: `RegistrarAbono` en modo `CASCADA_GLOBAL` con $35.000 en `EFECTIVO` y fecha 2026-11-20 12:00:00 deja F1 con `monto_pagado` 30000, `saldo_pendiente` 0 y `PAGADA`, y F2 con `monto_pagado` 10000, `saldo_pendiente` 5000 y `PARCIAL`. Escribe un abono `CASCADA_GLOBAL` de 35000 en `EFECTIVO` con dos filas de detalle (F1: 30000, capital 20000, ganancia 10000; F2: 5000, capital 5000, ganancia 0) y un `COBRO` en `EFECTIVO` con `delta_bolsillo` 35000, `delta_capital` 25000, `delta_ganancia` 10000 e `id_abono` del abono nuevo. Devuelve ese `idAbono` y las dos aplicaciones.
  Cómo comprobarlo: prueba del caso de uso que lee las cuatro tablas después de llamarlo.
- C2: `FACTURA_INDIVIDUAL` a F2 con $3.000 en `TRANSFERENCIA` deja F2 con `monto_pagado` 8000, `saldo_pendiente` 7000 y `PARCIAL`; F1 no cambia. Abono `FACTURA_INDIVIDUAL` con una sola fila de detalle (F2: 3000, capital 3000, ganancia 0) y `COBRO` en `TRANSFERENCIA` con capital 3000 y ganancia 0.
- C3: `LIQUIDACION_TOTAL` en `TRANSFERENCIA` deja F1 y F2 `PAGADA` con saldo 0; abono `LIQUIDACION_TOTAL` de 40000 con dos filas de detalle (F1: 30000, capital 20000, ganancia 10000; F2: 10000, capital 5000, ganancia 5000) y `COBRO` con capital 25000 y ganancia 15000. Después, `ConsultarCartera` ya no incluye a Ana y otra `LIQUIDACION_TOTAL` sobre Ana se rechaza con `SIN_DEUDA` sin escribir nada.
- C4: Límite de la cascada: con $40.000 se acepta y deja las dos facturas `PAGADA`; con $40.001 se rechaza con `MONTO_SUPERA_DEUDA` y no escribe nada.
- C5: Límite de una factura: `FACTURA_INDIVIDUAL` a F2 con $10.000 se acepta y la deja `PAGADA`; con $10.001 se rechaza con `MONTO_SUPERA_SALDO_FACTURA` y no escribe nada.
- C6: Un monto de $0 se rechaza con `MONTO_INVALIDO` en `CASCADA_GLOBAL` y en `FACTURA_INDIVIDUAL`, sin escribir nada.
- C7: Fecha futura: 2026-11-20 12:00:01 se rechaza con `FECHA_FUTURA` y no escribe nada; 2026-11-20 12:00:00 (igual al `CLOCK`) se acepta.
- C8: Abono anterior a una factura que paga (D14): `CASCADA_GLOBAL` de $35.000 con fecha 2026-11-05 10:00:00 se rechaza con `ABONO_ANTERIOR_A_FACTURA` (F2 recibiría dinero y es del 2026-11-10) y no escribe nada. Con la misma fecha, $30.000 se acepta porque solo F1 recibe dinero. `CASCADA_GLOBAL` de $35.000 con fecha 2026-11-10 10:00:00 (igual a la de F2) se acepta.
- C9: `MENSAJES_ERROR.ABONO_ANTERIOR_A_FACTURA` es exactamente «La fecha del abono es anterior a una factura que paga», y `ABONO_ANTERIOR_A_FACTURA` es parte de `CodigoRegla`.
- C10: Orden de la cascada con empate (segundo y último elemento): la clienta Carla tiene G1 (2026-11-02 10:00:00, total $10.000, costo $8.000), G2 y G3 (las dos del 2026-11-03 10:00:00, total $10.000, costo $8.000; G2 con menor `id_venta`). Una cascada de $25.000 deja G1 y G2 `PAGADA` y G3 con `monto_pagado` 5000 y `PARCIAL` (capital 5000, ganancia 0 en G3). Las facturas de Ana no cambian.
- C11: Otro cliente: un abono a Ana nunca cambia ventas de otro cliente. `FACTURA_INDIVIDUAL` de Ana con el `idVenta` de una factura de Carla se rechaza con `FACTURA_INVALIDA`; con un `idVenta` que no existe, también `FACTURA_INVALIDA`; con una factura de Ana ya `PAGADA`, `SIN_DEUDA`. Ninguno escribe nada.
- C12: Cliente inexistente: cualquier modo con un `idCliente` que no existe se rechaza con `CLIENTE_INEXISTENTE` sin escribir nada. Beto (sin compras) en `CASCADA_GLOBAL` o `LIQUIDACION_TOTAL` se rechaza con `SIN_DEUDA`.
- C13: Doble envío: dos llamadas concurrentes (`Promise.allSettled`) a `CASCADA_GLOBAL` de $35.000 sobre Ana producen **una** sola fila nueva en `abonos` y **un** solo `COBRO`; la otra se rechaza con `MONTO_SUPERA_DEUDA` porque las facturas se leen dentro de la transacción. La deuda de Ana queda en $5.000.
- C14: Transacción única (R-11): si `LibroRepository.registrar` falla (por ejemplo, con un espía que lanza), la llamada se rechaza y no queda el abono, ni su detalle, ni cambios en `ventas`. Una llamada correcta después del fallo se aplica normalmente (reintento seguro).
- C15: `CarteraRepository.aplicarPago` sobre F2 con $10.001 (más que su saldo) lanza error y no cambia la fila; con $10.000 la deja con `saldo_pendiente` 0 y `PAGADA`; con $1 la deja `PARCIAL`.
- C16: `ConsultarCartera.consultar()` con los datos de partida y Carla sin deuda devuelve `total` 40000 y un mapa con solo Ana → 40000 (sin Beto, sin el Mostrador). Después de C1 devuelve 5000.
- C17: `ConsultarExpediente.consultar(Ana)` devuelve `deuda` `{ total: 40000, capital: 25000, ganancia: 15000 }`, las facturas en orden F2, F1 con su `estado` (`PARCIAL`, `PENDIENTE`), `saldo` y `lineas` (cantidad, `tipoPapel`, precio unitario y subtotal), y los abonos del más nuevo al más antiguo. Después de C1, el primer abono es el de $35.000 con aplicaciones F1 30000 y F2 5000, y el segundo el `ABONO_INICIAL` de $5.000 a F2. Con un `idCliente` inexistente, `CLIENTE_INEXISTENTE`.
- C18: El expediente no muestra `PAGO_CONTADO` (D15): una venta de contado a Ana aparece en `facturas` como `PAGADA`, pero no en `abonos`.
- C19: `porCobrar`: para F2 devuelve capital 5000 y ganancia 5000; para F1, capital 20000 y ganancia 10000; para una venta bajo costo (total $8.000, costo $10.000, pagado $3.000), capital 5000 y ganancia 0, nunca negativa; para una factura pagada, 0 y 0.
- C20: Se reutiliza lo que existe: `RegistrarAbono` calcula con `distribuirCascada`, `abonarFactura` y `liquidarTodo`, escribe con `AbonoRepository.insertar` y registra el dinero con `cobro()` y `LibroRepository.registrar`; no hay otra implementación del reparto ni otro `INSERT` en `abonos` o `movimientos_dinero`.
  Cómo comprobarlo: revisión del código.
- C21: Solo se tocaron las rutas permitidas, sin migraciones nuevas, y `npm run lint`, `npm run test:unit` y `npm run build` pasan (las 443 pruebas que ya existían siguen en verde).
- C22: Calidad de las pruebas (regla 6 de `comun/base.md`): cada rechazo se acota con `expect.objectContaining({ codigo: '...' })`, sin `try/catch` para verificar errores, y cada prueba de escritura comprueba las cuatro tablas.
  Cómo comprobarlo: revisión de los `.spec.ts` nuevos.
