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

# Tarea B3.G — La venta no puede ser anterior a la compra de sus lotes

**Etapa 3, decisión L14.** Nadie más escribe en el árbol mientras trabajas. Antes de empezar, lee `CLAUDE.md` (raíz; reglas 1 a 12) y, en `planificacion/etapas/3-clientes-venta/PLAN.md`, **D6**, **D7**, **D13**, **D17**, **E20**, **E22** y la entrada **L14** del Log.

La app es *zoneless*: todo lo que la plantilla muestra y cambia después de un `await` debe ser una **signal**.

## Rutas permitidas

```
src/app/shared/domain/regla-negocio.error.ts
src/app/shared/domain/regla-negocio.error.spec.ts
src/app/shared/ui/mensajes-error.ts
src/app/shared/ui/mensajes-error.spec.ts
src/app/ventas/domain/venta.ts
src/app/ventas/domain/venta.spec.ts
src/app/ventas/application/registrar-venta.ts
src/app/ventas/application/registrar-venta.spec.ts
src/app/ventas/ui/**
```

Prohibido todo lo demás.

## Lo que ya existe

- `Lote.fechaCompra` (`FechaHora`, `YYYY-MM-DD HH:MM:SS`) en `src/app/inventario/domain/lote.ts`; `LoteRepository.porId` y `ConsultarInventario.activos()` ya lo devuelven.
- `armarVenta` valida `FECHA_FUTURA` con `fecha > ahora` comparando las `FechaHora` como texto; usa la misma comparación.

## Especificación

- **G1. Código y mensaje.** Agrega `VENTA_ANTERIOR_A_COMPRA` a `CodigoRegla` (comentario en inglés) y su texto "La venta no puede ser anterior a la compra del lote" a `MENSAJES_ERROR`, con su prueba de texto exacto.
- **G2. Dominio (`armarVenta`).** Cada línea de entrada trae también `fechaCompra` del lote. Si `fecha` es anterior a la `fechaCompra` más reciente de las líneas, rechaza con `VENTA_ANTERIOR_A_COMPRA`. Igual a esa fecha es válido. La validación va justo después de `FECHA_FUTURA`.
- **G3. Caso de uso (`RegistrarVenta`).** Pasa `lote.fechaCompra` de cada lote leído en la transacción. Un rechazo no deja nada escrito.
- **G4. Vender.** Con la fecha elegida (o la de ahora) anterior a la compra más reciente de los lotes agregados, se ve junto a la fecha "La venta no puede ser anterior a la compra del lote (dd/mm/aaaa)", con la fecha de esa compra (por ejemplo "(14/11/2026)"), y **Confirmar venta** queda deshabilitado. Al quitar ese lote o al corregir la fecha, el error desaparece y el botón se habilita si todo lo demás es válido. Saca el texto de `mensajes-error.ts` y le agrega la fecha entre paréntesis.

## Pruebas (primero RED)

- Dominio: E22 con sus valores límite exactos (un segundo antes de la compra, rechazado; igual a la compra, válido); en una venta multilote cuenta la compra más reciente.
- Caso de uso: E22 con `SqlJsDatabase` y las migraciones reales; el rechazo deja `ventas`, `detalle_ventas`, `abonos`, `abonos_detalle_facturas`, `movimientos_dinero` y `lotes_cajas` exactamente como estaban.
- Vender: el texto exacto junto a la fecha, el botón deshabilitado y su vuelta a habilitado al corregir la fecha o quitar el lote.
- `mensajes-error.spec.ts`: el texto exacto del código nuevo.
- Las pruebas que ya existen siguen pasando; si alguna arma líneas sin `fechaCompra`, agrégasela sin cambiar lo que verifica.

## Verificación

Corre en primer plano y copia el resultado (con el número de pruebas):

```
npm run lint
npm run test:unit
npm run build
npm run test:e2e
```

Indica qué prueba cubre G1 a G4 y E22.
