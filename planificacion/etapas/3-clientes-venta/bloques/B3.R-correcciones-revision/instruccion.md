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

# Tarea B3.R — Correcciones de la revisión de la ola 1

**Etapa 3, correcciones.** Antes de empezar, lee `CLAUDE.md` (raíz del repositorio) y, en `planificacion/etapas/3-clientes-venta/PLAN.md`, **D9**, **D16**, **E21** y la entrada **L13** del Log. Nadie más escribe en el árbol mientras trabajas.

La app es *zoneless*: todo lo que la plantilla muestra y cambia después de un `await` debe ser una **signal**.

## Rutas permitidas

```
src/app/shared/ui/campo-pesos.component.ts
src/app/shared/ui/campo-pesos.component.spec.ts
src/app/shared/ui/mensajes-error.ts
src/app/shared/ui/mensajes-error.spec.ts
src/app/shared/infrastructure/sqlite/migrations/002-telefono-unico.ts
src/app/shared/infrastructure/sqlite/migrations/002-telefono-unico.spec.ts
src/app/inventario/ui/nueva-compra.modal.spec.ts
src/app/finanzas/ui/aporte.modal.spec.ts
```

Prohibido todo lo demás.

## Especificación

- **R1. El campo de pesos no convierte en silencio (E21, L13).** Hoy `campo-pesos.component.ts` descarta todo lo que no es dígito: pegar "3800,50" da 380050 sin aviso.
  - Se aceptan solo dígitos, puntos (separador de miles), el signo `$` y espacios: "3800", "3.800", "$3.800" y "$ 3.800" dan 3800.
  - Si el texto trae cualquier otro carácter (coma, letras, signo `-`, etc.), el valor que entrega el campo es `null`, el campo muestra junto a él "Escribe el monto en pesos, sin decimales" y queda marcado como inválido (también para lectores de pantalla, `aria-invalid`). En cuanto el texto vuelve a ser válido, el error desaparece y el valor se actualiza.
  - El texto del mensaje va en `shared/ui/mensajes-error.ts` como una constante exportada (por ejemplo `MENSAJE_MONTO_SIN_DECIMALES`), con su prueba de texto exacto. No es un `CodigoRegla`: es una validación del campo.
  - Como el valor es `null`, el botón de guardar de quien usa el campo queda deshabilitado, igual que con el campo vacío.
- **R2. Migración `002` a prueba de datos viejos (D9).** Antes de crear el índice, la migración convierte en `NULL` los teléfonos vacíos o de solo espacios: `UPDATE clientes SET telefono = NULL WHERE telefono IS NOT NULL AND trim(telefono) = '';`, y después `CREATE UNIQUE INDEX ux_clientes_telefono ON clientes (telefono) WHERE telefono IS NOT NULL;`. Las dos sentencias van en el mismo `script`, que el runner ya corre en una transacción.

## Pruebas (primero RED)

- R1, en `campo-pesos.component.spec.ts`: pegar "3800,50", "3.800,5", "38a0" y "-3800" → valor `null`, se ve "Escribe el monto en pesos, sin decimales" y `aria-invalid="true"`; luego escribir "3800" → valor 3800, sin error. "3800", "3.800", "$3.800" y "$ 3.800" → 3800, sin error. Mira fallar primero las de rechazo.
- R1, en `nueva-compra.modal.spec.ts` y `aporte.modal.spec.ts`: con "3800,50" en el campo de dinero, el botón de guardar está deshabilitado y guardar no llama al caso de uso.
- R1, en `mensajes-error.spec.ts`: el texto exacto de la constante nueva.
- R2, en `002-telefono-unico.spec.ts`: sobre una base con la `001` y dos clientes con `telefono = ''` y uno con `'   '`, la `002` corre sin error y los tres quedan con `telefono` `NULL`; el Mostrador sigue existiendo después de la `002` (consulta que lo verifica); las pruebas que ya existen siguen pasando.

## Verificación

Corre en primer plano y copia el resultado (con el número de pruebas):

```
npm run lint
npm run test:unit
npm run build
npm run test:e2e
```
