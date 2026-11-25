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

# Tarea B4.5 — Detalles de la revisión de cierre

## Objetivo

La revisión de cierre de la Etapa 4 (capturas a 390 px contra los mockups y build) encontró tres detalles. Este bloque los corrige con el cambio mínimo y agrega las pruebas de cada uno. No cambia nada más: ni otros textos, ni otras pantallas, ni la lógica de guardado.

## Rutas

**Permitidas** (solo estas):

- `src/app/cartera/ui/abono.modal.ts` y `src/app/cartera/ui/abono.modal.spec.ts`
- `src/app/clientes/ui/clientes.page.ts` y `src/app/clientes/ui/clientes.page.spec.ts`
- `src/app/shared/ui/estilos/_opciones.scss` (nuevo) y `src/app/shared/ui/estilos/_index.scss` (solo la línea `@forward 'opciones';`)

**Prohibidas:** todo lo demás, en especial `src/app/cartera/application/**`, `src/app/cartera/domain/**`, `src/app/cartera/infrastructure/**`, `src/app/ventas/**` (el selector de clientes de Vender no cambia), `src/app/shared/ui/mensajes-error.ts`, `e2e/**`, `angular.json` (no se sube el presupuesto) y `src/verificacion/b4-5/**` (carpeta del verificador).

## Detalles que corrige

1. **Texto del botón de revisar en "A una factura" sin factura elegida.** Con el modo "A una factura" y ninguna factura elegida, el botón (deshabilitado) muestra el monto escrito antes, por ejemplo "Revisar abono · $ 40.001" con una deuda de $ 40.000. Causa: `textoBotonRevisar` (`abono.modal.ts:695-704`) agrega el monto cuando `errorMonto()` es `null`, y `errorMonto()` devuelve `null` en ese modo mientras no hay factura (`abono.modal.ts:609-613`), así que nunca se comparó el monto con un saldo.
2. **Buscador de Clientes sin etiqueta visible.** El mockup `planificacion/diseno/mockups/Clientes.dc.html` (línea 54) pone la etiqueta "Buscar cliente" sobre el borde del buscador, como "Fecha del abono" en el modal de abono. Hoy solo hay `placeholder` y `aria-label` (`clientes.page.ts:77-87`), y la regla 10 de `CLAUDE.md` pide etiqueta visible en cada campo.
3. **Presupuesto de estilos de `abono.modal.ts`.** `npm run build` avisa: "abono.modal.ts exceeded maximum budget. Budget 2.00 kB was not met by 558 bytes with a total of 2.56 kB".

## Lo que ya existe y debes reutilizar

- `textoBotonRevisar`, `errorMonto`, `facturaSeleccionada`, `modo` y `puedeRevisar` de `AbonoModalComponent`.
- La clase compartida `.campo-selector-etiqueta` de `src/app/shared/ui/estilos/_selectores.scss` (etiqueta sobre el borde, fondo `--ion-background-color`). Es la que usa "Fecha del abono".
- Los parciales de `src/app/shared/ui/estilos/`, que se cargan globalmente desde `_index.scss` (`src/global.scss:44`).

## Qué hacer

1. **Botón de revisar:** en el modo "A una factura" sin factura elegida, el texto es exactamente "Revisar abono", sin monto. Los demás casos no cambian: "Revisar abono · $ N" con un monto válido, "Revisar abono" con un monto vacío o inválido, y "Revisar pago · $ N" en "Pagar todo".
2. **Etiqueta del buscador:** dentro de `.buscador-contenedor`, antes del `ion-searchbar`, un elemento con el texto visible "Buscar cliente" y la clase `campo-selector-etiqueta`, sobre el borde superior izquierdo como en el mockup (el contenedor pasa a `position: relative`). El `aria-label` del `ion-searchbar` pasa a ser "Buscar cliente por nombre o celular", para que el nombre accesible contenga la etiqueta visible, y la etiqueta lleva `aria-hidden="true"` para que el lector de pantalla no la lea dos veces. El `placeholder` sigue siendo "Buscar por nombre o celular". La prueba de `clientes.page.spec.ts` que revisa el `aria-label` se actualiza a ese texto, y es la única expectativa existente que cambia.
3. **Presupuesto:** mover las reglas `.opcion-factura`, `.opcion-factura-sel`, `.opcion-factura-info`, `.opcion-factura-nombre`, `.opcion-factura-fecha` y `.opcion-factura-saldo` (con lo que llevan anidado) de los estilos de `abono.modal.ts` a un parcial nuevo, `src/app/shared/ui/estilos/_opciones.scss`, con los mismos valores, y agregar `@forward 'opciones';` en `_index.scss`. El modal debe verse igual. No se sube el presupuesto en `angular.json`.

## Pruebas

- En `abono.modal.spec.ts`: el texto exacto del botón en "A una factura" sin factura elegida (con un monto mayor que la deuda y con uno válido), con la factura elegida (monto igual al saldo y un peso más) y al cambiar de factura; y que los textos de "A la deuda" y "Pagar todo" no cambian.
- En `clientes.page.spec.ts`: la etiqueta visible "Buscar cliente" con su clase y `aria-hidden="true"`, el nuevo `aria-label` y el `placeholder` sin cambios.
- Las pruebas existentes siguen pasando sin cambiar lo que esperan, salvo el `aria-label` del punto 2.

## Comandos de verificación

`npm run lint`, `npm run test:unit` y `npm run build`.

# Criterios de aceptación — B4.5

Datos de partida para las pruebas del modal: deuda total $ 40.000 con dos facturas abiertas, F1 con saldo $ 30.000 (la más antigua) y F2 con saldo $ 10.000.

- C1: En "A una factura" sin factura elegida, con monto $ 40.001, el botón de revisar dice exactamente "Revisar abono" y tiene `disabled` y `aria-disabled="true"`. Con monto $ 5.000 y sin factura elegida, también dice exactamente "Revisar abono" y sigue deshabilitado.
- C2: En "A una factura" con F2 elegida: con $ 10.000 (el saldo exacto) dice "Revisar abono · $ 10.000" y está habilitado; con $ 10.001 dice "Revisar abono", está deshabilitado y junto al monto se ve exactamente el texto de `MENSAJES_ERROR.MONTO_SUPERA_SALDO_FACTURA`.
- C3: Con $ 15.000 escrito, elegir F2 deja el botón en "Revisar abono" y deshabilitado (supera su saldo); cambiar después a F1 (la otra factura) lo deja en "Revisar abono · $ 15.000" y habilitado.
- C4: Los demás textos no cambian: "A la deuda" con $ 35.000 dice "Revisar abono · $ 35.000"; con $ 40.001 dice "Revisar abono"; con el monto vacío dice "Revisar abono"; "Pagar todo" dice "Revisar pago · $ 40.000".
- C5: En Clientes, dentro de `.buscador-contenedor` y antes del `ion-searchbar`, hay un elemento con el texto visible exacto "Buscar cliente", la clase `campo-selector-etiqueta` y `aria-hidden="true"`; el contenedor tiene `position: relative`.
  Cómo comprobarlo: prueba de componente sobre el DOM; la posición sobre el borde la revisa el coordinador con una captura a 390 px.
- C6: El `ion-searchbar` de Clientes tiene `aria-label="Buscar cliente por nombre o celular"` y `placeholder="Buscar por nombre o celular"`; el buscador del selector de clientes de Vender no cambia (`vender.page.spec.ts` pasa sin cambios).
- C7: El buscador de Clientes sigue habilitado mientras carga y sigue filtrando por nombre y por celular (las pruebas existentes de `clientes.page.spec.ts` pasan sin cambiar lo que esperan, salvo el `aria-label`).
- C8: `npm run build` ya no muestra la advertencia de presupuesto de `abono.modal.ts` y no muestra ninguna advertencia nueva; `angular.json` no cambia.
- C9: Las seis reglas `.opcion-factura*` están en `src/app/shared/ui/estilos/_opciones.scss` con los mismos valores que tenían en `abono.modal.ts`, ya no están en `abono.modal.ts`, y `_index.scss` tiene `@forward 'opciones';`. Ningún otro archivo usa esas clases.
- C10: El bloque solo modifica las rutas permitidas y no cambia otros textos visibles.
- C11: `npm run lint`, `npm run test:unit` y `npm run build` terminan con código 0.
