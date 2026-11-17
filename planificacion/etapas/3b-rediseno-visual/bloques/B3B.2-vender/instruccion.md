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

# Tarea B3B.2 — Vender, selector de clientes, fecha y resumen

**Etapa 3B, ola 2.** Trabajas en paralelo con B3B.3 (Clientes), que toca otras rutas. Antes de empezar, lee completos `CLAUDE.md` (raíz del repositorio; reglas 1 a 12), `planificacion/comun/diseno.md` y `planificacion/etapas/3b-rediseno-visual/PLAN.md` hasta la sección `## Log`. Tu bloque es **B3B.2**; si esta tarea y el plan no coinciden, manda el plan y lo informas.

Esta etapa **no agrega funciones**: cambia cómo se ve la app. No cambies la conducta, los casos de uso, los `data-testid` ni las reglas de calidad que ya se cumplen (guarda `guardando`, modal que no se cierra mientras guarda, vista bloqueada, cuatro estados de carga). La app es *zoneless*: lo que la plantilla muestra y cambia después de un `await` es una **signal**.

## Specs que cubres

S9 (defecto L16 de la Etapa 3), D5 (hoja de fecha compartida); ejemplos E6, E8, E9 y E10. Lee su texto en el plan.

## Rutas permitidas

```
src/app/ventas/ui/**
src/app/shared/ui/hoja-fecha.component.ts        (nuevo)
src/app/shared/ui/hoja-fecha.component.spec.ts   (nuevo)
e2e/vender.spec.ts
e2e/etapa-3.acceptance.spec.ts                   (solo selectores, si un cambio de estructura lo exige)
```

Prohibido todo lo demás.

## Lo que ya existe y debes reutilizar

- El tema, la fuente y los estilos compartidos de B3B.0: variables `--ion-color-*` y `--app-*` en `src/theme/variables.scss`, y clases y reglas globales en `src/app/shared/ui/estilos/` (`.app-tarjeta`, `ion-segment`, campos con contorno, hoja de modal, botones, `.app-estado-vacio`, `.app-estado-error`). **Úsalos; no repitas hexadecimales** que ya son variables.
- `CampoPesosComponent`, `formatearPesos`, `mensajes-error.ts`, `formulario.ts` (`soloCierreExplicito`, `esVacio`), `venta-ui.helpers.ts`.

## Mockups (fuente de estructura, textos, medidas y colores)

En `planificacion/diseno/mockups/`: `Vender.dc.html`, `VenderEstados.dc.html`, `ModalCliente.dc.html`, `ModalClienteEstados.dc.html`, `ModalNuevoCliente.dc.html` (solo como referencia; el modal de cliente es de B3B.3), `ModalFecha.dc.html`, `ModalResumen.dc.html` y `ModalResumenEstados.dc.html`. Son HTML con estilos en línea: léelos, no los abras en el navegador. Solo componentes de Ionic (S2).

## Especificación

1. **Vender (`vender.page.ts`)** según `Vender.dc.html`: título grande "Vender" con subtítulo, campos **Cliente** y **Fecha de la venta** como selectores con contorno e ícono celeste, "Lotes disponibles" en una tarjeta con filas y botón circular lima para agregar ("Agregado" con check celeste si ya está), "Detalle de venta" con cantidad y precio en dos columnas, subtotal y ganancia en verde, tarjeta de cierre con Total, Costo y Ganancia, segmentos de forma y medio de pago, abono inicial y "Queda debiendo", y el botón lima **Confirmar venta · $ total** abajo. Los estados de los campos según `VenderEstados.dc.html` (error rojo, aviso de bajo costo en ámbar).
2. **Selector de clientes** (`selector-cliente-contenido.component.ts` y el `ion-modal` que lo abre) según `ModalCliente.dc.html` y `ModalClienteEstados.dc.html`, como hoja. **Corrige L16 (E6):** todas las filas tienen la misma altura; la fila del Mostrador muestra un ícono de tienda y la segunda línea "Venta rápida · solo contado"; las demás muestran avatar con iniciales y el celular. Investiga también la hipótesis del plan (falta la clase `ion-page` en el contenido del `ion-modal` en línea) y corrígela si es parte de la causa; explica en el reporte qué causaba el defecto.
3. **D5, hoja de fecha compartida:** extrae el `ion-datetime` de día y hora que hoy vive en `vender.page.ts` a `src/app/shared/ui/hoja-fecha.component.ts`, según `ModalFecha.dc.html`. Recibe el valor actual y el máximo (ahora, del `CLOCK`), no deja elegir una fecha futura, y devuelve la fecha elegida. Vender la usa. **B3B.1 la va a usar para la compra y el aporte**: dale una API simple y documéntala en el reporte.
4. **Resumen (`resumen-venta.modal.ts`)** según `ModalResumen.dc.html` y `ModalResumenEstados.dc.html`: hoja, datos, lista de productos, total grande, pago, "Queda debiendo", **Aceptar** lima y **Volver a editar** celeste con borde. Mantén la guarda, el bloqueo y los textos actuales.
5. Mantén **todos** los `data-testid` que usan los e2e (lista en el L2 del plan).

## Pruebas (primero RED)

- **E6:** en `e2e/vender.spec.ts`, abre el selector con el Mostrador y al menos dos clientes con teléfono, y comprueba con `boundingBox()` que todas las filas `item-cliente-vender` tienen la misma altura (con 1px de tolerancia), y que la del Mostrador contiene "Venta rápida · solo contado". Escribe esta prueba **antes** de corregir y confirma que falla.
- `hoja-fecha.component.spec.ts`: el máximo impide fechas futuras y devuelve la fecha elegida.
- Las pruebas unitarias y e2e que ya existen siguen pasando **sin cambiar lo que verifican** (E8). Si alguna cambia solo por estructura, explícalo en el reporte.

## Verificación

Corre en primer plano y copia el resultado (con el número de pruebas):

```
npm run lint
npm run test:unit
```

**No corras `npm run build` ni `npm run test:e2e`:** otro bloque trabaja en paralelo y comparte `www/`; los corre el coordinador al terminar la ola. Deja el e2e de E6 escrito y explica cómo lo verificaste.
