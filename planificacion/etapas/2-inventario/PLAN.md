# Etapa 2 — Inventario y aportes de capital

**Estado:** ✅ implementado y verificado (V2 sin bloqueantes), PR abierto · **Rama del plan:** `docs/plan-etapa-2` · **Rama de implementación:** `feat/etapa-2-inventario` (sale del `main` actual) · **Entrega:** un PR a `main` · **Pruebas:** Vitest (`ng test`) + Playwright (`e2e/`)
**Objetivo:** primera etapa con interfaz. El usuario puede meter dinero al negocio (aporte de capital), comprar cajas de papel, que se convierten en lotes con su costo por resma, y ver el inventario por lotes activos. La app pasa a tener la barra de 4 pestañas y una pantalla de error si la base no abre.

## Qué hay hoy

- **Etapas 0 y 1 integradas en `main` (`af672fe`):** esquema v1 con `lotes_cajas` y el libro `movimientos_dinero` (migración `001`), los tipos `Pesos`, `Resmas`, `Cajas`, `TipoPapel`, `MedioPago`, `FechaHora` y `Clock` en `src/app/shared/domain/`, y `ReglaNegocioError` con código.
- **Ya existe la contabilidad de la compra y del aporte:** `aporteCapital(fecha, medio, monto)` y `compraLote(saldos, fecha, medio, costoTotal, idLote) → { movimiento, reinversion }` en `src/app/finanzas/domain/operaciones.ts`, y `LibroRepository` con `registrar`, `registrarTraspaso` y `saldos`.
- **No hay nada de inventario:** no existe la carpeta `src/app/inventario/` y ningún código en TypeScript lee ni escribe `lotes_cajas`.
- **La interfaz es la plantilla de Ionic:** `src/app/home/` y una ruta `home`. No hay pestañas. Si `DatabaseProvider.init()` falla, la app no arranca y no muestra nada (pendiente `R3/R4-bootstrap-hard-fail` de la Etapa 0, pasado a esta etapa).
- **`SystemClock`** existe (`src/app/shared/infrastructure/clock/system-clock.ts`), pero no está registrado como provider.
- **CI:** `.github/workflows/ci.yml` corre `lint`, `test:unit` y `build`. El e2e quedó para "cuando haya interfaz (Etapa 2)" (Etapa 0, D7). Hoy `e2e/app.spec.ts` tiene 2 pruebas de humo.

## Specs

Citas textuales; si una cita y un bloque no coinciden, manda la cita.

| ID | Requisito | Fuente |
|----|-----------|--------|
| S1 | "Las compras se realizan exclusivamente por caja cerrada de 10 resmas (Tamaño Carta u Oficio) sin costos adicionales de adquisición. Las ventas se realizan exclusivamente por resma cerrada (números enteros), prohibiendo el fraccionamiento." | RN-01 |
| S2 | "Cada caja comprada se administra como un lote individual con su propio costo unitario ($\text{Costo de Caja} \div 10$) para manejar cajas superpuestas con precios variables según el proveedor. Al vender, el usuario elige manualmente de qué caja/lote activo salen las resmas y define el precio de venta unitario específico para ese lote y cliente." | RN-02 (la elección del lote al vender es de la Etapa 3) |
| S3 | "Cuando el usuario adquiera mercancía, el sistema deberá permitir registrar la entrada de cajas seleccionando el tipo de papel (Carta u Oficio), la fecha de compra, la cantidad de cajas, el costo de compra por caja y el medio de pago utilizado (Efectivo, Transferencia o Capital Externo)." | RF-01 ("Capital Externo" lo reemplaza el aporte de capital, S7) |
| S4 | "Al guardar una compra, el sistema deberá crear un lote activo independiente con un stock inicial de $10 \times N$ resmas enteras y calcular automáticamente el costo unitario por resma dividiendo el costo de la caja entre 10." | RF-02 |
| S5 | "El sistema deberá mostrar el inventario disponible agrupado por tipo de papel (Carta y Oficio) y desglosado por cada lote/caja activa, indicando la fecha de ingreso, cuántas resmas quedan disponibles de las 10 iniciales y el costo unitario de adquisición de cada lote." | RF-03 (con A6, son las disponibles de las 10 × N iniciales del lote) |
| S6 | "Cuando el stock de resmas de una caja llegue a 0 tras una venta, el sistema deberá cambiar el estado del lote a *Agotado* y ocultarlo de la lista de selección de ventas activas, conservando su registro para el historial contable." | RF-04 (la regla y el repositorio; la venta que la usa es de la Etapa 3) |
| S7 | "Reemplazarlo por un movimiento **Aporte de capital** que entra a un bolsillo. Así toda compra sale de Efectivo o Transferencia y el arqueo se puede rastrear." | A2 |
| S8 | "Permitirla, pero que el excedente descuente la **ganancia libre** como reinversión, con un aviso." | A3 (la regla ya existe desde la Etapa 1; aquí va el aviso en pantalla) |
| S9 | "**1 lote por compra** (10×N resmas), con la barra de progreso calculada como disponibles ÷ iniciales." | A6 |
| S10 | "Estructura basada en **`ion-tabs`** (barra de navegación inferior con 4 vistas principales)", y para Inventario: "Filtros por *Carta* y *Oficio*, tarjetas de lotes activos con barra de progreso (`resmas_disponibles / 10`) y botón flotante (`ion-fab`) para registrar compras de cajas nuevas." | Documento maestro, §5.3 (la barra usa ÷ iniciales, S9) |
| S11 | "Si la base no abre, la app no arranca y no muestra ningún mensaje. Hace falta una pantalla de error." | Etapa 0, pendiente `R3/R4-bootstrap-hard-fail` (pasado a esta etapa en la Etapa 1, "Por aprobar" 2) |
| S12 | "El CI corre `lint`, `test:unit` y `build`. El e2e entra cuando haya interfaz (Etapa 2)." | Etapa 0, D7 |

### Ejemplos de aceptación

Cada uno es una prueba. Los números siguen el ejemplo de Ana de la Etapa 1 (caja de $120.000 → $12.000 por resma).

| ID | Situación | Resultado esperado |
|----|-----------|--------------------|
| E1 | El negocio empieza en cero. Aporte de capital de $300.000 en efectivo. | efectivo $300.000, capital en caja $300.000, ganancia libre $0 |
| E2 | Con E1 hecho, compra de 2 cajas Carta a $120.000 cada una, en efectivo. | lote nuevo `ACTIVO` con 20 resmas de 20 y costo de $12.000 por resma; efectivo $60.000, capital en caja $60.000; sin aviso de reinversión |
| E3 | Capital en caja $100.000, ganancia libre $30.000 y transferencia $130.000. Compra de 1 caja Oficio a $120.000 por transferencia. | lote de 10 resmas a $12.000; el aviso dice que se reinvierten $20.000 de la ganancia libre; capital en caja $0, ganancia libre $10.000 |
| E4 | Efectivo $50.000. Compra de 1 caja a $120.000 en efectivo. | se rechaza (`SALDO_INSUFICIENTE`) y **no** queda ningún lote ni movimiento nuevo |
| E5 | Compra con un costo por caja de $120.005. | se rechaza (`COSTO_CAJA_INVALIDO`), porque no se divide en 10 resmas de pesos enteros |
| E6 | Compra de 0 cajas. | se rechaza (`CANTIDAD_INVALIDA`) |
| E7 | Un lote con 3 resmas disponibles. Se descuentan 3. | el lote queda con 0 resmas y `AGOTADO`; ya no sale entre los activos, pero sigue en la tabla. Descontar 4 de ese mismo lote (con 3) se rechaza (`STOCK_INSUFICIENTE`) |
| E8 | Hay un lote Carta (20 de 20, $12.000), uno Oficio (7 de 10, $13.000) y uno Carta agotado. | Inventario muestra 1 lote en Carta y 1 en Oficio; la barra del de Oficio está al 70 %; el agotado no aparece |
| E9 | La base no abre al iniciar la app. | se ve la pantalla de error con el botón **Reintentar**; si el reintento funciona, aparecen las pestañas |

## Decisiones

| # | Decisión | Por qué |
|---|----------|---------|
| D1 | **Inventario como funcionalidad propia** en `src/app/inventario/`, con `domain/` (reglas puras del lote), `infrastructure/` (`LoteRepository`), `application/` (caso de uso de la compra) y `ui/` (pantallas). | Sigue la arquitectura por funcionalidad de `base.md`. La Etapa 3 va a reutilizar `LoteRepository` para descontar stock al vender. |
| D2 | **La compra es una sola transacción:** se leen los saldos, se inserta el lote, se arma el movimiento con `compraLote` y se registra con `LibroRepository.registrar`. Si algo falla (por ejemplo, `SALDO_INSUFICIENTE`), no queda ni el lote ni el movimiento. | Regla R-11 del modelo contable (RNF-03). El id del lote hace falta para el movimiento, por eso el lote se inserta primero dentro de la misma transacción. |
| D3 | **Vista previa antes de confirmar:** el formulario calcula con `compraLote` sobre los saldos actuales y, si hay reinversión, la muestra antes del botón de guardar. | Es "el aviso" de A3: el usuario ve cuánta ganancia se reinvierte **antes** de que pase, no después. |
| D4 | **Las fechas vienen de un `Clock` inyectado** (token `CLOCK`, con `SystemClock` en la app y un reloj fijo en las pruebas). | `domain/` no lee el reloj (Etapa 1, L4). Las pruebas y el e2e dan siempre el mismo resultado. |
| D5 | **Mensajes en español en una sola tabla** (`src/app/shared/ui/mensajes-error.ts`): de `CodigoRegla` a texto para el usuario. | Completa la D2 de la Etapa 1: el dominio da el código y la pantalla, el texto. Las etapas 3 a 5 agregan sus códigos en la misma tabla. |
| D6 | **Lotes del más antiguo al más nuevo** (`fecha_compra ASC, id_lote ASC`). | Es el orden natural para vender primero lo que entró primero, y el mismo criterio de desempate que la cascada (R-02). |

## Bloques

| ID | Bloque | Specs | Ruta | Agente | Ola |
|----|--------|-------|------|--------|-----|
| B2.1 | Lotes: dominio, repositorio y casos de uso de compra y aporte | S1–S4, S6–S8; E1–E7 | delegado | `agy` · `gemini-3.8-flash-high` | 1 |
| B2.2 | Pestañas, pantalla de error, reloj y e2e en el CI | S10, S11, S12; E9 | delegado | `agy` · `gemini-3.8-flash-high` | 1 |
| B2.3 | Pantallas de inventario, compra y aporte | S3, S5, S7–S10; E1–E3, E8 | delegado | `agy` · `gemini-3.8-flash-high` | 2 |
| V2 | Verificación independiente | S1–S12, E1–E9 | delegado | `agy` · `gemini-4-argon-medium` | 3 |

**Por qué en olas:** B2.1 y B2.2 no comparten archivos y corren en paralelo. Ninguno de los dos corre `npm run build` (los dos escribirían en `www/`): compila el coordinador. B2.3 necesita los casos de uso de B2.1 y las pestañas de B2.2.

### B2.1 — Lotes: dominio, repositorio y casos de uso

- **Rutas permitidas:** `src/app/inventario/domain/**`, `src/app/inventario/infrastructure/**`, `src/app/inventario/application/**`, `src/app/inventario/index.ts`, `src/app/finanzas/application/**`, `src/app/shared/domain/regla-negocio.error.ts` (y su `.spec.ts`)
- **Qué hacer:**
  1. **Códigos nuevos** en `CodigoRegla`: `CANTIDAD_INVALIDA` (cajas o resmas ≤ 0 o no enteras), `COSTO_CAJA_INVALIDO` (costo por caja ≤ 0 o no divisible por 10) y `STOCK_INSUFICIENTE` (se descuentan más resmas de las disponibles).
  2. **`inventario/domain/lote.ts`**, como funciones puras:
     - `nuevoLote(tipoPapel, cajas, costoPorCaja) → { tipoPapel, cantidadCajas, costoPorCaja, costoUnitarioResma, resmasIniciales, costoTotal }`, con `costoUnitarioResma = costoPorCaja / 10`, `resmasIniciales = cajas × 10` y `costoTotal = cajas × costoPorCaja` (S1, S4, E5, E6);
     - `descontarResmas(lote, cantidad) → { resmasDisponibles, estado }`: `AGOTADO` cuando llega a 0; `CANTIDAD_INVALIDA` si cantidad ≤ 0 y `STOCK_INSUFICIENTE` si supera lo disponible (S6, E7);
     - `progreso(lote) = resmasDisponibles / resmasIniciales` (S9);
     - `agruparPorTipo(lotes)` → `{ CARTA: Lote[], OFICIO: Lote[] }` con solo los activos, en el orden de D6 (S5, E8).
  3. **`inventario/infrastructure/lote.repository.ts`** (`@Injectable`):
     - `insertar(tx, nuevo, fecha, medio) → idLote`;
     - `activos(db)`, en el orden de D6;
     - `descontar(tx, idLote, cantidad)`: lee el lote, aplica `descontarResmas` y actualiza `resmas_disponibles` y `estado` (S6). Lo usa la Etapa 3.
  4. **`inventario/application/registrar-compra.ts`** (`@Injectable`): `registrar({ tipoPapel, cajas, costoPorCaja, fecha, medio }) → { idLote, reinversion }` y `previsualizar(...) → { costoTotal, reinversion }` sin escribir nada, en una transacción, según D2 y D3. Reutiliza `compraLote` y `LibroRepository.registrar`: **no** escribas en `movimientos_dinero` por tu cuenta.
  5. **`finanzas/application/`:** `RegistrarAporte.registrar({ fecha, medio, monto })`, que usa `aporteCapital` y `LibroRepository.registrar` en una transacción, y `ConsultarSaldos.saldos()`, que llama a `LibroRepository.saldos(db)`.
- **Pruebas:** E1 a E7 tal cual, con `SqlJsDatabase` y la migración real para los casos de uso. Además:
  - E4 deja `lotes_cajas` y `movimientos_dinero` exactamente como estaban;
  - `activos` no devuelve los agotados y respeta el orden de D6, con dos lotes de la misma fecha;
  - `previsualizar` no escribe ninguna fila;
  - después de E1 y E2, la invariante (`verificarInvariante`) se cumple.

### B2.2 — Pestañas, pantalla de error, reloj y e2e en el CI

- **Rutas permitidas:** `src/main.ts`, `src/app/app.component.*`, `src/app/app.routes.ts`, `src/app/home/**` (se borra), `src/app/shell/**`, `src/app/shared/infrastructure/clock/**`, `src/app/shared/infrastructure/sqlite/database.provider.ts` (y su `.spec.ts`), `e2e/**`, `playwright.config.ts`, `.github/workflows/ci.yml`
- **Qué hacer:**
  1. **Pestañas** (`src/app/shell/tabs.page.ts` y `tabs.routes.ts`): `ion-tabs` con 4 pestañas en este orden: **Finanzas**, **Vender**, **Inventario** y **Clientes**, cada una con su ícono de Ionicons. Las que todavía no existen muestran una página simple "Disponible en la Etapa N" (Finanzas: 5, Vender: 3, Clientes: 3). La ruta de Inventario apunta a una página provisional que B2.3 reemplaza. La ruta inicial es la de Inventario (ver "Por aprobar" 3). Se borra `src/app/home/`.
  2. **Pantalla de error** (S11, E9): si `init()` falla, la app muestra `src/app/shell/error-arranque.page` con un mensaje en español ("No se pudo abrir la base de datos") y un botón **Reintentar** que vuelve a llamar a `init()`; si funciona, muestra las pestañas. El inicializador ya no rompe el arranque: guarda el error en una signal. `DatabaseProvider.init()` ya se puede reintentar desde la Etapa 1.
  3. **Reloj** (D4): token `CLOCK` en `src/app/shared/infrastructure/clock/clock.token.ts`, registrado en `main.ts` con `SystemClock`.
  4. **E2E:** actualiza `e2e/app.spec.ts`: la app abre en Inventario, se ven las 4 pestañas, cada una navega a su página y no hay errores en la consola.
  5. **CI** (S12): `ci.yml` agrega la instalación del navegador de Playwright (`npx playwright install --with-deps chromium`) y un paso `npm run test:e2e` después de `build`.
- **Pruebas:** la pantalla de error con un `DatabaseProvider` que falla una vez y después funciona (E9); `tabs.page` con las 4 pestañas en orden; el e2e del punto 4.

### B2.3 — Pantallas de inventario, compra y aporte

- **Rutas permitidas:** `src/app/inventario/ui/**`, `src/app/finanzas/ui/**`, `src/app/shared/ui/**`, `src/app/shell/tabs.routes.ts`, `e2e/inventario.spec.ts`, más `src/app/inventario/application/consultar-inventario.ts` y los archivos de las observaciones de la ola 1 (ver L5 y `bloques/B2.3-pantallas/tarea.md`)
- **Qué hacer:**
  1. **`inventario/ui/inventario.page`** (S5, S9, S10, E8): `ion-segment` con **Carta** y **Oficio**. Una tarjeta por lote activo con la fecha de ingreso, "N de M resmas", el costo por resma en pesos (`formatearPesos`) y una `ion-progress-bar` con `progreso(lote)`. Si no hay lotes, un mensaje que invita a registrar la primera compra. Un `ion-fab` con dos acciones: **Nueva compra** y **Aportar capital**.
  2. **`inventario/ui/nueva-compra.modal`** (S3, S4, S8): tipo de papel, fecha (por defecto, la del `CLOCK`; se puede cambiar), cantidad de cajas, costo por caja y medio (**Efectivo** o **Transferencia**). Muestra el saldo del bolsillo elegido, el costo total y el costo por resma mientras se escribe. Si `previsualizar` indica reinversión, la avisa en un `ion-note` de color `warning` antes del botón **Guardar compra**. Si el bolsillo no alcanza, lo dice y ofrece **Aportar capital** (ver "Por aprobar" 1).
  3. **`finanzas/ui/aporte.modal`** (S7, E1): fecha, medio y monto. Al guardar, vuelve a la pantalla que lo abrió con los saldos actualizados.
  4. **`shared/ui/mensajes-error.ts`** (D5): los códigos de las etapas 1 y 2 en español, por ejemplo `SALDO_INSUFICIENTE` → "No hay suficiente dinero en ese medio de pago". Cualquier `ReglaNegocioError` del guardado se muestra con un `ion-toast` usando esa tabla.
  5. Reemplaza la página provisional de Inventario en `tabs.routes.ts` por `inventario.page`.
- **Pruebas:** de componente, con los casos de uso simulados (dobles): el segmento filtra por tipo, la barra muestra 0,7 en el lote de E8 y el aviso de reinversión aparece con los saldos de E3. E2E (`e2e/inventario.spec.ts`, en web): aportar $300.000 en efectivo, comprar 2 cajas Carta a $120.000 y ver la tarjeta "20 de 20" a $12.000; después de recargar la página, sigue ahí (se guarda en jeep-sqlite).

### V2 — Verificación independiente

Lee este plan completo y prueba en una copia limpia (`mktemp -d`):

- corre `lint`, `test:unit`, `build` y `test:e2e`;
- reproduce E1 a E9 con pruebas propias que usan la API pública y, para E8 y E9, la interfaz;
- da un veredicto por cada `S#` y `E#`;
- revisa la calidad de las pruebas (regla 6 de `base.md`);
- controla las rutas permitidas.

Mismas reglas de severidad que V1.

## Verificación del coordinador

1. Antes de cada ola, anotar `HEAD`; después, comprobar que no hubo commits de `agy` y revisar el diff contra las rutas permitidas.
2. Después de la ola 1, correr `npm run build` una vez (los bloques paralelos no compilan).
3. Correr `gentle-ai review assess` por commit. El cambio de `ci.yml` toca el ítem 5 de alto riesgo (CI), así que va en su propio commit y se revisa solo.
4. Probar la app en el navegador (`npm start`): aporte, compra con y sin reinversión, y recarga.
5. Abrir el PR y esperar el check `verify`, que ahora incluye el e2e.

## Commits

En el orden en que se aplican, según `commits-atomicos`:

1. `feat: lotes de inventario con costo por resma y descuento de stock`
2. `feat: casos de uso de compra de cajas y aporte de capital`
3. `feat: barra de pestañas y pantalla de error al arrancar`
4. `ci: correr las pruebas e2e en el CI`
5. `feat: pantallas de inventario, nueva compra y aporte de capital`
6. `test: pruebas de aceptación de la verificación independiente`
7. `docs: cierre de la Etapa 2`

El reporte de la etapa va en Engram (`etapas/2-inventario/reporte`).

## Por aprobar

✅ Los 7 puntos se aprobaron tal como están (L4).

1. **Dónde se registra el aporte de capital:** propongo dos entradas, en el botón flotante de Inventario y dentro del formulario de compra cuando el bolsillo no alcanza. Sin esto no se podría comprar nada en esta etapa, porque los bolsillos empiezan en $0 y el dashboard de Finanzas llega en la Etapa 5.
2. **Fecha de compra:** por defecto es la de hoy y se puede cambiar. No propongo restringir fechas futuras ni pasadas, porque no lo pide ningún requisito.
3. **Pestaña inicial:** Inventario mientras Finanzas no tiene contenido. En la Etapa 5 pasa a ser Finanzas, como dice el documento maestro.
4. **Pestañas sin contenido:** se ven desde ahora, con el aviso "Disponible en la Etapa N", para que la navegación no cambie en cada etapa.
5. **E2E en el CI:** entra en esta etapa, como lo decidió la Etapa 0 (D7). Suma alrededor de un minuto al check `verify`.
6. **D1 a D6** tal como están arriba.
7. **Alcance:** no entra la venta (Etapa 3), aunque el descuento de stock y el paso a `AGOTADO` (S6) quedan listos y probados. Tampoco entran el historial de lotes agotados en pantalla, el valor del inventario (que es del dashboard, Etapa 5) ni la corrección o anulación de una compra mal cargada (Etapa 6, A7).

## Resultado

- **Verificación independiente (V2, `agy` · `gemini-4-argon-medium`):** 0 bloqueantes. `S1`–`S12` y `E1`–`E9` cumplen. E9 se reprodujo en el navegador haciendo fallar el primer arranque de `jeep-sqlite`. Las pruebas del verificador quedaron como regresión en `src/app/inventario.acceptance.spec.ts` (E1–E7) y `e2e/inventario.acceptance.spec.ts` (E8, E9 y flujos de la interfaz).
- **Checks finales:** `lint` limpio, 220 pruebas unitarias (39 archivos), `build` correcto y 7 pruebas e2e.
- **Revisiones nativas:** ola 1 aprobada dos veces (0 bloqueantes) y el commit del CI revisado solo (0 hallazgos). La ola 2 no se revisó: la rama completa supera el presupuesto del revisor y Miguel omitió la revisión del tramo de la ola 2.
- **Hallazgo de la revisión del coordinador en la ola 2:** la app es *zoneless*, así que el estado que cambia después de un `await` tiene que vivir en signals. El modal de compra no lo hacía y se corrigió en B2.3-C, con un e2e que lo prueba en el navegador.
- **Observaciones que quedan para después:**
  1. `src/app/finanzas/index.ts` no reexporta `finanzas/application` (sí lo hace `inventario/index.ts`).
  2. Quedan títulos de pruebas en español en `estado-arranque.spec.ts`, `tabs.page.spec.ts`, `e2e/app.spec.ts` y `e2e/inventario.spec.ts`.
  3. `lote.spec.ts` prueba la frontera positiva de `nuevoLote` con 2 cajas en lugar de 1.

## Log

Mensajes del usuario copiados textualmente; las notas del coordinador van entre corchetes.

- **L1** (2026-11-10): "Si apruebo el plan, y trabajemos como me estas recomendando. Primero integrar las reglas de calidad, luego solucionar los pendientes y ahí si proceder con la etapa 2." [Orden acordado. Reglas de calidad integradas (PR #6 y #7) y pendientes de la Etapa 1 cerrados (PR #8).]
- **L2** (2026-11-10): "Sí integra el #8 y arranca el plan de la etapa 2" [Se escribe este plan. No se ejecuta nada hasta que Miguel lo apruebe.]
- **L3** (2026-11-10): "Tengo una duda sobree el aporte del capital, a que te refieres con donde se registra" [Se explicó que "dónde" es la pantalla y el botón desde los que se registra el aporte: los bolsillos empiezan en $0 y Finanzas llega en la Etapa 5, por eso las dos entradas están en Inventario.]
- **L4** (2026-11-10): "Me sirve así, apruebo los 7 puntos" [Plan aprobado. Se integra el PR del plan.]
- **L5** (2026-11-11): "Revisa el estado del proyecto y continuemos con la tarea pendiente" [Arranca la ola 2 (B2.3). Ajustes al bloque: (1) no había caso de uso para listar lotes y la pantalla no puede leer el repositorio directo (`ui` → `application`), así que B2.3 agrega `ConsultarInventario` en `inventario/application/`; (2) las 9 observaciones no bloqueantes de la segunda revisión de la ola 1 entran como parte B de B2.3.]
- **L6** (2026-11-11): "Sí, arranca con la ola 3" [V2 sin bloqueantes. Antes, en la revisión nativa de la ola 2, Miguel eligió "Omitir esta vez". Se agregan las pruebas del verificador, se cierra el plan y se abre el PR.]
