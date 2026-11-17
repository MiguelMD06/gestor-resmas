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

# Tarea B3B.1 — Inventario, compra y aporte

**Etapa 3B, ola 3.** Eres el único bloque de esta ola. Antes de empezar, lee completos `CLAUDE.md` (raíz del repositorio; reglas 1 a 12), `planificacion/comun/diseno.md`, `planificacion/comun/modelo-contable.md` (R-13 y R-17) y `planificacion/etapas/3b-rediseno-visual/PLAN.md` hasta la sección `## Log`. Tu bloque es **B3B.1**; si esta tarea y el plan no coinciden, manda el plan y lo informas.

Esta etapa cambia cómo se ve la app y, en este bloque, aplica dos reglas que faltaban (R-13 y R-17). Fuera de eso, no cambies la conducta, los `data-testid` ni las reglas de calidad que ya se cumplen (vista previa con id de petición, guarda `guardando`, modal que no se cierra mientras guarda, cuatro estados de carga). La app es *zoneless*: lo que la plantilla muestra y cambia después de un `await` es una **signal**.

## Specs que cubres

S6, S7, S8; decisiones D5 y D6; ejemplos E2, E3, E4, E5, E7, E8, E9 y E10. Lee su texto en el plan.

## Rutas permitidas

```
src/app/inventario/ui/**
src/app/finanzas/ui/aporte.modal.ts
src/app/finanzas/ui/aporte.modal.spec.ts
src/app/inventario/application/registrar-compra.ts
src/app/inventario/application/registrar-compra.spec.ts
src/app/finanzas/application/registrar-aporte.ts
src/app/finanzas/application/registrar-aporte.spec.ts
e2e/inventario.spec.ts
e2e/inventario.acceptance.spec.ts
```

Prohibido todo lo demás.

## Lo que ya existe y debes reutilizar

- El tema y los estilos compartidos de B3B.0 (`src/theme/variables.scss`, `src/app/shared/ui/estilos/`). **No repitas hexadecimales** que ya son variables.
- **La hoja de fecha de D5** (`src/app/shared/ui/hoja-fecha.component.ts`), que dejó B3B.2 y ya usa Vender. Úsala tal cual; no la modifiques.
- El código `FECHA_FUTURA` y su texto "La fecha no puede ser futura" (ya cambiado por el coordinador) y `MONTO_INVALIDO` "El monto debe ser un número entero mayor a cero", en `mensajes-error.ts`.
- `CampoPesosComponent`, `formatearPesos`, `formulario.ts`, el `CLOCK` (cómo lo usa `ventas/domain/venta.ts` y `ventas/application/registrar-venta.ts` para rechazar `FECHA_FUTURA`).

## Mockups

En `planificacion/diseno/mockups/`: `Inventario.dc.html`, `InventarioFab.dc.html`, `InventarioEstados.dc.html`, `ModalCompra.dc.html`, `ModalCompraEstados.dc.html`, `ModalAporte.dc.html`, `ModalAporteEstados.dc.html` y `ModalFecha.dc.html`. Son HTML con estilos en línea: léelos, no los abras en el navegador. Solo componentes de Ionic (S2).

## Especificación

1. **Inventario (`inventario.page.ts`)** según `Inventario.dc.html`, `InventarioFab.dc.html` e `InventarioEstados.dc.html`: segmento Carta / Oficio, tarjetas de lote con la barra de stock celeste (`resmas_disponibles / resmas_iniciales`, regla 7 de `diseno.md`), botón flotante lima con sus dos acciones y los estados.
2. **Compra (`nueva-compra.modal.ts`)** según `ModalCompra.dc.html` y `ModalCompraEstados.dc.html`, como hoja:
   - **E2:** tipo de papel y medio de pago pasan de `ion-select` a `ion-segment`. Los `data-testid` `select-tipo-papel` y `select-medio` pasan a nombrar el segmento; cada botón del segmento lleva su propio `data-testid` (por ejemplo `segment-papel-carta`, `segment-medio-efectivo`), y los anotas en el reporte;
   - **E7, D5:** la fecha usa la hoja de fecha compartida con máximo = ahora del `CLOCK`; el `data-testid` `input-fecha` queda en el selector que la abre;
   - **E3:** con una fecha futura, el mensaje exacto de `FECHA_FUTURA` junto a la fecha y **Guardar** deshabilitado.
3. **Aporte (`aporte.modal.ts`)** según `ModalAporte.dc.html` y `ModalAporteEstados.dc.html`, como hoja, con los mismos cambios de medio de pago y fecha (E2, E7) y:
   - **E4:** fecha futura, igual que E3;
   - **E5 (R-17):** con monto $0, **Guardar** deshabilitado y junto al campo el texto exacto de `MONTO_INVALIDO`. Hoy `aporte.modal.ts:119` solo revisa que no esté vacío.
4. **D6:** `RegistrarCompra` y `RegistrarAporte` rechazan una fecha posterior a la del `CLOCK` con `FECHA_FUTURA`, antes de escribir nada, igual que la venta.
5. **E8:** en `e2e/inventario.acceptance.spec.ts`, reemplaza el ayudante del `ion-alert` (`seleccionarEnIonSelect`) por la elección del segmento. Lo que las pruebas verifican no cambia.

## Pruebas (primero RED)

- `registrar-compra.spec.ts` y `registrar-aporte.spec.ts`: con el `CLOCK` fijo, una fecha un segundo posterior se rechaza con `FECHA_FUTURA` y **no cambia ninguna tabla** (`lotes_cajas` y `movimientos_dinero`); una fecha igual a ahora se guarda.
- `nueva-compra.modal.spec.ts` y `aporte.modal.spec.ts`: E3, E4 y E5 con el texto exacto junto al campo y el botón deshabilitado; con valores válidos el botón se habilita.
- Las pruebas que ya existen siguen pasando **sin cambiar lo que verifican**, salvo cómo se elige el tipo y el medio.

## Verificación

Corre en primer plano y copia el resultado (con el número de pruebas):

```
npm run lint
npm run test:unit
npm run build
```

No corras `npm run test:e2e`: lo corre el coordinador.
