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

# Tarea B3.4 — Campo de pesos y su uso en compra y aporte

**Etapa 3, ola 1.** Trabajas en paralelo con B3.1 (clientes) y B3.2 (venta), que tocan otras rutas. Antes de empezar, lee completos `CLAUDE.md` (raíz del repositorio; sus reglas 1 a 12 son obligatorias) y `planificacion/etapas/3-clientes-venta/PLAN.md` hasta la sección `## Log`. Tu bloque es **B3.4**; si esta tarea y el plan no coinciden, manda el plan y lo informas.

La app es *zoneless*: todo lo que la plantilla muestra y cambia después de un `await` debe ser una **signal**.

## Specs que cubres

D16 y el ejemplo E21. Lee su texto en el plan.

## Rutas permitidas

```
src/app/shared/ui/campo-pesos.component.ts
src/app/shared/ui/campo-pesos.component.spec.ts
src/app/inventario/ui/nueva-compra.modal.ts
src/app/inventario/ui/nueva-compra.modal.spec.ts
src/app/finanzas/ui/aporte.modal.ts
src/app/finanzas/ui/aporte.modal.spec.ts
e2e/inventario.spec.ts
e2e/inventario.acceptance.spec.ts
```

Prohibido todo lo demás.

## Lo que ya existe y debes reutilizar

- **`formatearPesos(valor: Pesos): string`** en `src/app/shared/domain/pesos.ts`. Es el formato oficial ("$3.800"); no crees otro.
- `nueva-compra.modal.ts` y `aporte.modal.ts` ya tienen `guardando`, `calculando` (compra), `peticionActual`, validación y `soloCierreExplicito`. **No cambies nada de eso.**

## Especificación

1. **`shared/ui/campo-pesos.component.ts`** (standalone, con `ControlValueAccessor` o un `model<number | null>()`, lo que encaje mejor con cómo los dos modales manejan hoy sus campos; explica en el reporte cuál elegiste y por qué):
   - un `ion-input` con `inputmode="numeric"` y etiqueta visible (`label` de entrada);
   - mientras se escribe, muestra el valor formateado con `formatearPesos`: escribir "3800" muestra "$3.800";
   - entrega un `number` entero, o `null` si el campo está vacío. **Nunca** convierte vacío en 0 (regla 1 de `CLAUDE.md`);
   - ignora todo lo que no sea dígito al escribir o pegar: pegar "3.800" o "$3.800" da 3800;
   - admite `disabled`, que también se refleja para lectores de pantalla (regla 10), y un texto de error que se muestra junto al campo;
   - el cursor no salta a una posición rara al insertar los puntos: queda al final, como mínimo.
2. **`nueva-compra.modal.ts`:** el campo **costo por caja** pasa a ser el campo de pesos. La cantidad de cajas no cambia.
3. **`aporte.modal.ts`:** el campo **monto** pasa a ser el campo de pesos.
4. En los dos modales, todo lo demás sigue igual: la vista previa, la validación, `guardando`, los mensajes, los textos y los botones.
5. **E2E de inventario:** ajusta solo lo que cambia por el formato (por ejemplo, lo que se lee del campo después de escribir). Lo que no tiene que ver con el formato no cambia. Si `fill('120000')` sigue funcionando con el campo nuevo, no lo cambies.

## Pruebas (primero RED)

- Componente: E21 completo (escribir "3800" → se ve "$3.800" y el valor es 3800; borrar todo → `null`; pegar "3.800" → 3800; pegar "$3.800" → 3800; letras se ignoran); `disabled` deshabilita el `ion-input` y lo anuncia; el error se muestra junto al campo.
- `nueva-compra.modal.spec.ts` y `aporte.modal.spec.ts`: escribir "120000" muestra "$120.000" y lo que se guarda es 120000; con el campo vacío, el botón de guardar sigue deshabilitado. Las pruebas que ya existen siguen pasando **sin cambiar lo que verifican**; si alguna tiene que cambiar solo por cómo se escribe en el campo, explícalo en el reporte.
- E2E: no lo corras (lo corre el coordinador después de la ola), pero deja `e2e/inventario.spec.ts` y `e2e/inventario.acceptance.spec.ts` coherentes con el campo nuevo.

## Verificación

Corre en primer plano y copia el resultado (con el número de pruebas):

```
npm run lint
npm run test:unit
```

**No corras `npm run build` ni `npm run test:e2e`:** otros dos bloques trabajan en paralelo y comparten `www/`; los corre el coordinador al terminar la ola. Indica qué prueba cubre D16 y cada parte de E21.
