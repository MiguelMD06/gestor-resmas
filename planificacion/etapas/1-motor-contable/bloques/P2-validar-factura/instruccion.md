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

# Tarea P2 — Validar la factura en `saldo()` y `repartirPago()`

**Cierre de pendientes de la Etapa 1, ola 1.** Trabajas en paralelo con P1, que toca otros archivos. Resuelves el pendiente `V1-dominio-factura` de `planificacion/etapas/1-motor-contable/PLAN.md` ("Pendientes para la Etapa 2"). Esta tarea manda sobre el plan si algo no coincide.

## Spec que cubres

| ID | Requisito |
|----|-----------|
| P2 | "Asumen `total >= pagado >= 0` y `costoBase >= 0`, que hoy garantizan los CHECK de `ventas`." Decisión aprobada: `saldo()` y `repartirPago()` validan `0 <= pagado <= total` y `costoBase >= 0`. Si no se cumple, lanzan `ReglaNegocioError` con el código `'FACTURA_INVALIDA'`, que se agrega a la unión `CodigoRegla` de `shared/domain/regla-negocio.error.ts`. Pruebas con los valores límite. |

## Rutas permitidas

```
src/app/shared/domain/regla-negocio.error.ts
src/app/shared/domain/regla-negocio.error.spec.ts
src/app/cartera/domain/factura.ts
src/app/cartera/domain/factura.spec.ts
src/app/cartera/domain/reparto-pago.ts
src/app/cartera/domain/reparto-pago.spec.ts
```

Prohibido todo lo demás.

## Qué hacer

1. **`regla-negocio.error.ts`:** agrega a `CodigoRegla` la línea `| 'FACTURA_INVALIDA' // invoice data out of domain: paid < 0, paid > total or cost base < 0`. No cambies los códigos que ya existen ni la clase.
2. **`factura.ts`:** crea y exporta `validarFactura(f: FacturaAbierta): void`, que lanza `ReglaNegocioError('FACTURA_INVALIDA', <mensaje en inglés con los valores>)` cuando:
   - `f.pagado < 0`, o
   - `f.pagado > f.total`, o
   - `f.costoBase < 0`.

   `saldo()` llama a `validarFactura(f)` antes de calcular. `costoBase > total` **sí** es válido, porque es una venta por debajo del costo (A4): no lo rechaces.
3. **`reparto-pago.ts`:** `repartirPago()` llama a `validarFactura(f)` como **primera** instrucción, antes de validar `monto`. El resto de la lógica no cambia.
4. No hace falta exportar `validarFactura` desde `cartera/domain/index.ts`; si lo exportas, sería fuera de tus rutas, así que no lo hagas.

## Pruebas (primero RED, después GREEN)

Sigue la regla 6 de las reglas de trabajo: cada rechazo se acota con `toThrow(expect.objectContaining({ codigo: 'FACTURA_INVALIDA' }))`.

| Archivo | Casos |
|---------|-------|
| `factura.spec.ts` | `saldo()` con valores límite válidos: `pagado = 0` y `pagado = total` devuelven `total` y `0`, y `costoBase = 0` funciona. Rechazos con `FACTURA_INVALIDA`: `pagado = -1`, `pagado = total + 1` y `costoBase = -1`. |
| `reparto-pago.spec.ts` | `repartirPago()` rechaza con `FACTURA_INVALIDA` los mismos tres casos: `pagado = -1`, `pagado = total + 1` y `costoBase = -1`. Una factura inválida con `monto = 0` da `FACTURA_INVALIDA` y no `MONTO_INVALIDO`, porque la factura se valida primero. Con `costoBase = 0` todo el monto va a ganancia: por ejemplo, total 10000, pagado 0 y monto 4000 dan capital 0 y ganancia 4000. |
| `regla-negocio.error.spec.ts` | Solo si ese archivo recorre la lista de códigos: agrega `FACTURA_INVALIDA`. Si no la recorre, no lo toques. |

Las pruebas que ya existen (E1, E2, venta bajo costo, `MONTO_INVALIDO`, `MONTO_SUPERA_SALDO_FACTURA` y las de `abonos.spec.ts` y `deuda.spec.ts`) tienen que seguir pasando sin cambios.

## Fuera de alcance

- No cambies `abonos.ts` ni `deuda.ts`: ya reciben la validación porque llaman a `saldo()` y `repartirPago()`.
- No toques el esquema ni los CHECK de `ventas`.

## Verificación

```
npm run lint
npm run test:unit
npm run build
```

Copia el resultado de cada uno, junto con el número de pruebas que pasan.
