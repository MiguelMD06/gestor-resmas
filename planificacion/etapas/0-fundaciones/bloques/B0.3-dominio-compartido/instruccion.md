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
| Base de datos | `@capacitor-community/sqlite` 8.x en la app y `sql.js` en las pruebas |

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
- **Nombres:** los conceptos de dominio van en español, igual que el esquema (`Lote`, `Venta`, `registrarAbono`). Los sufijos técnicos van en inglés (`*.port.ts`, `*.adapter.ts`, `*.repository.ts`, `*.spec.ts`). Los comentarios y los textos de las pruebas, en inglés.
- Para el estado compartido, reutiliza la función que ya existe. Nunca reimplementes con otra forma un paso que ya tiene función (por ejemplo, registrar un movimiento de dinero).

## Reglas de trabajo

1. **Solo tocas las rutas permitidas** de tu tarea. Si necesitas otra, no la toques: detente y explícalo en el reporte.
2. **No uses git:** nada de `commit`, `add`, `stash`, `checkout` ni `push`. El coordinador revisa y hace los commits.
3. **Pruebas primero** cuando haya una regla con resultado esperado claro: escribe la prueba, mírala fallar (RED), implementa (GREEN) y refactoriza con las pruebas en verde. Escribe una prueba por cada regla que pide la tarea, y cada prueba verifica todos los efectos observables de la regla.
4. **Archivos temporales** fuera del repositorio. Si alguno queda dentro, informa su ruta exacta.
5. **No instales dependencias** salvo que la tarea lo pida, y nunca corras formateadores, generadores ni instalaciones sobre todo el repositorio.
6. **Engram:** tienes acceso de solo lectura. Úsalo si te sirve para tener contexto; nunca intentes escribir en él.

## Trampas conocidas del stack

- **`@capacitor-community/sqlite`:** dentro de una transacción manual (`beginTransaction` / `commitTransaction` / `rollbackTransaction`), llama a `run`, `execute` y `executeSet` con `transaction = false`. Si no, el plugin abre su propia transacción.
- **En web (jeep-sqlite)**, después de cada commit hay que llamar a `saveToStore(nombreBD)`, o los datos se pierden al recargar.
- **`sql.js` funciona dentro de `ng test`** con `await initSqlJs()` sin configuración extra (verificado con la versión 1.15.2).
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

# Tarea B0.3 — Tipos de dominio compartidos

**Etapa 0 (Fundaciones), ola 1.** Otro agente trabaja en paralelo en `capacitor.config.ts`, `.browserslistrc` y `.github/`: no los toques.

## Objetivo

Crear los tipos de dominio que todo el sistema va a usar para dinero, cantidades, medios de pago, tipos de papel y fechas, con validación estricta de enteros.

## Specs que cubres

| ID | Requisito (cita textual) |
|----|--------------------------|
| S4 | "El sistema restringirá estrictamente las cantidades de cajas y resmas a números enteros positivos (`INTEGER`), mientras que los valores monetarios (costos, precios, abonos y saldos en pesos) se manejarán como enteros exactos sin errores de redondeo de punto flotante." |

Y de las reglas de negocio:

- RN-01: "Las compras se realizan exclusivamente por caja cerrada de 10 resmas".
- RN-04: el medio de pago es "**Efectivo** o **Transferencia**".

## Rutas permitidas

```
src/app/shared/domain/**
src/app/shared/infrastructure/clock/**
```

Prohibido todo lo demás. No instales dependencias.

## Qué hacer

Todo `src/app/shared/domain/` es TypeScript puro: **no importa nada** de Angular, Ionic, Capacitor ni SQLite. Usa **tipos con marca** (*branded types*) y funciones constructoras que validan y lanzan `RangeError` con un mensaje en inglés si el valor es inválido.

### `src/app/shared/domain/pesos.ts`

```ts
export type Pesos = number & { readonly __brand: 'Pesos' };
export function pesos(valor: number): Pesos;            // any sign; must be Number.isSafeInteger
export function pesosPositivos(valor: number): Pesos;   // like pesos() and also > 0
export function sumarPesos(a: Pesos, b: Pesos): Pesos;  // result must stay a safe integer
export function restarPesos(a: Pesos, b: Pesos): Pesos;
export function formatearPesos(valor: Pesos): string;
```

`formatearPesos` **no usa `Intl`**, porque el resultado cambia según la versión de ICU del motor. Formatea a mano: prefijo `"$ "` con un espacio normal (U+0020) y punto como separador de miles.

| Valor | Resultado |
|-------|-----------|
| `0` | `"$ 0"` |
| `950` | `"$ 950"` |
| `125000` | `"$ 125.000"` |
| `1234567` | `"$ 1.234.567"` |
| `-125000` | `"-$ 125.000"` |

### `src/app/shared/domain/cantidades.ts`

```ts
export const RESMAS_POR_CAJA = 10;
export type Resmas = number & { readonly __brand: 'Resmas' };
export type Cajas = number & { readonly __brand: 'Cajas' };
export function resmas(valor: number): Resmas;          // safe integer >= 0 (stock can be 0)
export function resmasPositivas(valor: number): Resmas; // safe integer > 0 (a sale line)
export function cajas(valor: number): Cajas;            // safe integer > 0
export function cajasAResmas(valor: Cajas): Resmas;     // valor * RESMAS_POR_CAJA
```

### `src/app/shared/domain/medio-pago.ts` y `src/app/shared/domain/tipo-papel.ts`

```ts
export const MEDIOS_PAGO = ['EFECTIVO', 'TRANSFERENCIA'] as const;
export type MedioPago = (typeof MEDIOS_PAGO)[number];
export function esMedioPago(valor: unknown): valor is MedioPago;

export const TIPOS_PAPEL = ['CARTA', 'OFICIO'] as const;
export type TipoPapel = (typeof TIPOS_PAPEL)[number];
export function esTipoPapel(valor: unknown): valor is TipoPapel;
```

Los valores son exactamente los del esquema SQLite.

### `src/app/shared/domain/fecha-hora.ts`

```ts
export type FechaHora = string & { readonly __brand: 'FechaHora' };
export function fechaHora(valor: string): FechaHora;  // must match /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/ and be a real date (rejects 2026-02-30)
export function formatearFechaHora(fecha: Date): FechaHora; // LOCAL time, zero-padded, e.g. 2026-11-08 09:05:03
export interface Clock {
  ahora(): FechaHora;
}
```

### `src/app/shared/infrastructure/clock/system-clock.ts`

`SystemClock implements Clock`, con `ahora()` devolviendo `formatearFechaHora(new Date())`. Es el **único** lugar del bloque que puede llamar a `new Date()` sin argumentos.

### `src/app/shared/domain/index.ts`

Reexporta lo público de los cinco archivos de dominio.

## Pruebas (primero RED, después GREEN)

Un `*.spec.ts` junto a cada archivo. Una prueba por regla, usando solo la API pública:

| Archivo | Qué prueba |
|---------|-----------|
| `pesos` | Acepta `0`, negativos y `Number.MAX_SAFE_INTEGER`. Rechaza `1.5`, `NaN`, `Infinity` y `Number.MAX_SAFE_INTEGER + 1`. `pesosPositivos(0)` lanza error. Suma y resta exactas, y lanzan error si se salen del rango seguro. Los 5 casos de formato de la tabla. |
| `cantidades` | `resmas(0)` es válido. `resmasPositivas(0)`, `cajas(0)`, `cajas(-1)` y `cajas(2.5)` lanzan error. `cajasAResmas(cajas(3))` devuelve `30`. |
| `medio-pago` y `tipo-papel` | Aceptan los valores válidos; rechazan `'efectivo'` en minúsculas, `'AMBOS'`, `''`, `null` y `1`. |
| `fecha-hora` | Acepta `'2026-11-08 09:05:03'`. Rechaza `'2026-11-08'`, `'2026-02-30 10:00:00'` y `'2026-11-08T09:05:03'`. `formatearFechaHora(new Date(2026, 10, 8, 9, 5, 3))` devuelve `'2026-11-08 09:05:03'`. |
| `system-clock` | Con `vi.useFakeTimers()` y `vi.setSystemTime(new Date(2026, 0, 2, 3, 4, 5))`, `ahora()` devuelve `'2026-01-02 03:04:05'`. |

## Verificación

- `npm run test:unit`: todas las pruebas pasan, las nuevas y las 2 de la plantilla.
- `npm run lint` y `npm run build` pasan.
- `src/app/shared/domain/**` no tiene ningún `import` que empiece por `@angular`, `@ionic`, `@capacitor` ni `sql.js`. Verifícalo con una búsqueda y pega el resultado en el reporte.

## Fallos conocidos

`npm run lint` falla en la base por `capacitor.config.ts` (formato), que corrige el otro agente de la ola. Si ese es el único error, repórtalo como ajeno y no lo toques.
