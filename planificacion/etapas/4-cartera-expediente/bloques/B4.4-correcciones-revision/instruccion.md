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

# Tarea B4.4 — Correcciones de la revisión del B4.3

## Objetivo

La revisión del commit `33103c5` (B4.3) encontró tres casos que rompen las reglas 2 y 3 de `CLAUDE.md` (doble envío y vista bloqueada mientras procesa). Este bloque los corrige con el cambio mínimo y agrega una prueba por cada uno. No cambia nada más: ni textos, ni estilos, ni otras pantallas.

## Rutas

**Permitidas** (solo estas):

- `src/app/cartera/ui/resumen-abono.modal.ts` y `src/app/cartera/ui/resumen-abono.modal.spec.ts`
- `src/app/cartera/ui/abono.modal.ts` y `src/app/cartera/ui/abono.modal.spec.ts`
- `src/app/clientes/ui/expediente.page.ts` y `src/app/clientes/ui/expediente.page.spec.ts`

**Prohibidas:** todo lo demás, en especial `src/app/cartera/application/**`, `src/app/cartera/domain/**`, `src/app/cartera/infrastructure/**`, `e2e/**` y `src/verificacion/b4-4/**` (carpeta del verificador).

## Hallazgos que corrige (textuales de la revisión)

1. **`resumen-abono.modal.ts:356-373`:** "Triggering aceptar() while volverAEditar() has an in-flight modalCtrl.dismiss() executes registrarAbono.registrar() even though the modal is already dismissing with ROL_CANCELAR." Si el `dismiss` termina antes que `registrar`, el modal de abono queda abierto con saldos viejos y se puede registrar el mismo abono otra vez.
2. **`abono.modal.ts:833-859`:** "If modalCtrl.dismiss({ guardado: true }, ROL_GUARDADO) fails after the payment was already persisted, the modal remains open with puedeRevisar() re-enabled, allowing a duplicate payment submission."
3. **`expediente.page.ts:583-591`:** "The invalid route ID branch in ionViewWillEnter() does not increment peticionActual or reset cargando(), allowing an earlier in-flight cargarExpediente() request to overwrite the CLIENTE_INEXISTENTE error state."

## Lo que ya existe y debes reutilizar

- La guarda `volviendo` de `ResumenAbonoModalComponent.volverAEditar()` y las señales `guardando`/`guardado`.
- `abriendoResumen`, `guardando`, `puedeRevisar` y las variables locales `abonoGuardado`/`resumenGuardando` de `AbonoModalComponent.abrirResumen()`; `ROL_GUARDADO` y `ROL_CANCELAR`.
- El patrón de id de petición (`peticionActual`) que ya usa `ExpedientePage.cargarExpediente()`.

## Qué hacer

1. **Resumen:** `aceptar()` no hace nada mientras `volverAEditar()` tiene un `dismiss` en curso. Mientras dura ese `dismiss`, los botones **Aceptar** y **Volver a editar** quedan deshabilitados (`disabled` y `aria-disabled`); para eso `volviendo` pasa a ser una señal. Si el `dismiss` falla, la guarda se libera (como hoy) y los dos botones vuelven a estar habilitados.
2. **Modal de abono:** cuando el abono quedó guardado (`abonoGuardado` verdadero) y el `dismiss` con `ROL_GUARDADO` falla, el modal queda marcado como "abono ya registrado" con una señal propia: `puedeRevisar()` devuelve falso para siempre (el botón de revisar queda deshabilitado) y **Cancelar** pasa a cerrar el modal con `dismiss({ guardado: true }, ROL_GUARDADO)`, para que el expediente se recargue. Sigue sin aparecer el toast de error en ese caso (criterio C23 del B4.3).
3. **Expediente:** en la rama de id inválido de `ionViewWillEnter()`, invalidar la petición en curso (incrementar `peticionActual`) y dejar `cargando` en falso antes de mostrar el error de cliente inexistente.

## Pruebas

Una prueba nueva por cada punto de "Qué hacer", en el `.spec.ts` de su componente, que falle con el código de `33103c5` y pase con la corrección, y que revise el efecto que ve el usuario (botón deshabilitado, número de llamadas a `registrar`, rol del `dismiss`, mensaje mostrado). Las pruebas existentes siguen pasando sin cambiar lo que esperan.

## Comandos de verificación

`npm run lint`, `npm run test:unit` y `npm run build`.

# Criterios de aceptación — B4.4

- C1: En el resumen, si se llama a `volverAEditar()` y, antes de que su `dismiss` termine, se llama a `aceptar()`, `registrarAbono.registrar` se llama **cero** veces.
  Cómo comprobarlo: prueba unitaria con un `dismiss` que no se resuelve hasta que la prueba lo libera.
- C2: Mientras el `dismiss` de `volverAEditar()` está en curso, los botones **Aceptar** y **Volver a editar** del resumen tienen `disabled` y `aria-disabled="true"`.
- C3: Si el `dismiss` de `volverAEditar()` falla, no queda ninguna promesa rechazada sin manejar, los dos botones vuelven a estar habilitados y un `aceptar()` posterior llama a `registrar` **una** vez.
- C4: En el modal de abono, si el resumen guarda el abono y el `dismiss({ guardado: true }, ROL_GUARDADO)` del modal de abono falla, después `puedeRevisar()` es falso, el botón de revisar está deshabilitado y una nueva llamada a `abrirResumen()` no crea otro modal (`modalCtrl.create` no se vuelve a llamar).
- C5: En ese mismo estado (C4), `cancelar()` llama a `modalCtrl.dismiss` con `{ guardado: true }` y el rol `ROL_GUARDADO`, y no aparece ningún toast de error.
- C6: Sin fallo en el `dismiss`, el flujo normal no cambia: el abono guardado cierra el modal con `ROL_GUARDADO` una vez, y **Cancelar** sin abono guardado sigue cerrando con `ROL_CANCELAR`.
- C7: En el expediente, si hay una carga en curso del cliente 1 y luego `ionViewWillEnter()` recibe un id inválido (`abc`, `0`, `-3`), al resolverse la carga del cliente 1 se sigue mostrando el error de cliente inexistente con el texto de `MENSAJES_ERROR.CLIENTE_INEXISTENTE`, `expediente()` es `null` y `cargando()` es falso.
- C8: Con un id válido, la carga, el reintento y el descarte de respuestas viejas siguen funcionando como antes (las pruebas existentes de `expediente.page.spec.ts` pasan sin cambiar lo que esperan).
- C9: El bloque solo modifica las seis rutas permitidas; no cambia textos visibles ni estilos.
- C10: `npm run lint`, `npm run test:unit` y `npm run build` terminan con código 0, sin advertencias nuevas en el build.
