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

# Tarea B2.3-C — Corrección de las pantallas de compra y aporte

**Etapa 2, ola 2.** Trabajas solo. B2.3 ya dejó las pantallas en el árbol de trabajo, sin commit (`src/app/inventario/ui/`, `src/app/finanzas/ui/`, `src/app/shared/ui/`, `consultar-inventario.ts`, `e2e/inventario.spec.ts`). La revisión del coordinador encontró defectos en `nueva-compra.modal` y `aporte.modal`. Los corriges todos en esta tarea. La tarea original está en `planificacion/etapas/2-inventario/bloques/B2.3-pantallas/tarea.md`: léela, porque sigue mandando para todo lo que esta no cambia.

## Contexto clave: la app es *zoneless*

`src/main.ts` no usa `zone.js`. Angular solo vuelve a pintar cuando cambia una **signal**, cuando se dispara un evento de la plantilla o cuando se llama a `markForCheck`. Un campo común que se asigna **después de un `await`** (por ejemplo, `this.vistaPrevia = await ...`) no se ve en pantalla hasta el próximo evento. `inventario.page` ya usa signals y está bien. Las pruebas de componente no lo detectan porque llaman a `fixture.detectChanges()` a mano.

## Rutas permitidas

```
src/app/inventario/ui/**
src/app/finanzas/ui/**
e2e/inventario.spec.ts
```

Prohibido todo lo demás.

## Qué corregir

| # | Defecto | Dónde | Qué hacer |
|---|---------|-------|-----------|
| 1 | La vista previa no se repinta en una app zoneless | `nueva-compra.modal.ts` | Pasa a signals todo lo que la plantilla muestra y que cambia después de un `await`: `vistaPrevia`, `errorCajas`, `errorCosto` y `puedeGuardar` (este último, como `computed`). Lo más simple es que los campos del formulario también sean signals. Lo que importa es que la pantalla se actualice sola cuando llega la respuesta de `previsualizar`. |
| 2 | Valores inventados en el formulario | `nueva-compra.modal.ts` | La cantidad de cajas y el costo por caja empiezan **vacíos**, no en `1` y `120000`. Mientras alguno de los dos esté vacío, no se llama a `previsualizar`, no se muestra la vista previa ni ningún mensaje de error, y **Guardar compra** queda deshabilitado. Los errores de `CANTIDAD_INVALIDA` y `COSTO_CAJA_INVALIDO` solo aparecen cuando el usuario escribió un valor inválido (por ejemplo, `0` cajas o un costo de `120005`). |
| 3 | Respuestas desordenadas | `nueva-compra.modal.ts` | `previsualizar` se llama en cada tecla y las respuestas pueden llegar en otro orden. Descarta toda respuesta (o error) que no sea de la última llamada, por ejemplo con un contador de peticiones. |
| 4 | Errores inesperados silenciados | `nueva-compra.modal.ts` | Si `previsualizar` lanza algo que no es un `ReglaNegocioError` de `CANTIDAD_INVALIDA` o `COSTO_CAJA_INVALIDO`, hoy la vista previa desaparece sin ningún mensaje. Muestra `mensajeDeError(error)` en un `ion-note` de color `danger` y deja **Guardar compra** deshabilitado. |
| 5 | La fecha es texto libre | `nueva-compra.modal.ts` y `aporte.modal.ts` | Hoy se escribe a mano `YYYY-MM-DD HH:mm:ss` y un error de formato termina en "Ocurrió un error inesperado". Usa `<ion-input type="date">` (valor `YYYY-MM-DD`), con la fecha de `CLOCK.ahora()` por defecto. Al guardar, la `FechaHora` es la fecha elegida más la hora de `CLOCK.ahora()` en ese momento (`fechaHora(\`${fecha} ${hora}\`)`). Si la fecha queda vacía, se muestra "Elige una fecha" y el botón de guardar queda deshabilitado. |
| 6 | Alias de exportación innecesarios | `nueva-compra.modal.ts`, `aporte.modal.ts` | Quita `export { NuevaCompraModalComponent as NuevaCompraModal }` y `export { AporteModalComponent as AporteModal }`, y usa los nombres `...Component` en todos los lugares que los importan dentro de las rutas permitidas. |

## Pruebas

Primero escribe las pruebas y míralas fallar (regla 3 de `base.md`). Sigue la regla 6.

- **Componente (`nueva-compra.modal.spec.ts`):**
  - al abrir, cajas y costo están vacíos, no se llama a `previsualizar` y **Guardar compra** está deshabilitado;
  - con `0` cajas aparece el mensaje de `CANTIDAD_INVALIDA`;
  - si llegan dos respuestas de `previsualizar` en orden inverso (la primera llamada resuelve después que la segunda), la pantalla muestra la de la **segunda** llamada;
  - si `previsualizar` rechaza con un `Error` común, se ve "Ocurrió un error inesperado" y el botón queda deshabilitado;
  - al guardar con la fecha `2026-11-05` y un `CLOCK` simulado que da `2026-11-11 10:30:00`, `registrar` recibe `fecha: '2026-11-05 10:30:00'`;
  - con la fecha vacía se ve "Elige una fecha" y el botón queda deshabilitado.
- **Componente (`aporte.modal.spec.ts`):** la misma prueba de fecha: con `2026-11-05` y el reloj en `2026-11-11 10:30:00`, `registrar` recibe `fecha: '2026-11-05 10:30:00'`.
- **E2E (`e2e/inventario.spec.ts`):** agrega una prueba que **no** llama a `fixture.detectChanges()`, porque en el navegador no hay atajo. Sin aporte previo, abre **Nueva compra**, escribe 2 cajas a $120.000 y verifica que se ven "Costo total" con $240.000 (en el formato de `formatearPesos`), el aviso de saldo insuficiente y el botón **Aportar capital**, y que **Guardar compra** está deshabilitado. En la prueba que ya existe, el formulario ahora empieza vacío: ajústala si hace falta.

## Verificación

```
npm run lint
npm run test:unit
npm run build
npm run test:e2e
```

Copia el resultado de cada uno, con el número de pruebas. Para cada punto 1 a 6, indica qué cambiaste y qué prueba lo cubre.
