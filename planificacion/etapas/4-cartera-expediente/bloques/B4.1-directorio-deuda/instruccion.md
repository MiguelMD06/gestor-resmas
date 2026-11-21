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

---

# Tarea B4.1 — Directorio de clientes con deuda y filtro

## Objetivo

El directorio de Clientes muestra cuánto debe cada cliente y el total por cobrar, con un filtro "Todos / Con deuda", según los mockups aprobados `planificacion/diseno/mockups/Clientes.dc.html` y `ClientesEstados.dc.html` (directorio). Este bloque **no** cambia lo que pasa al tocar un cliente: eso llega con el expediente en el bloque B4.3.

## Rutas

**Permitidas** (solo estas):

- `src/app/clientes/ui/clientes.page.ts` y `src/app/clientes/ui/clientes.page.spec.ts`
- `src/app/cartera/application/consultar-cartera.ts` y su `.spec.ts`
- `src/app/cartera/infrastructure/cartera.repository.ts` y su `.spec.ts` (solo `deudasPorCliente`)
- `src/app/shared/ui/estilos/**` (solo piezas nuevas; no cambies las que ya existen)
- `e2e/clientes.spec.ts`

**Prohibidas:** todo lo demás, en especial `src/app/cartera/application/registrar-abono.ts`, `src/app/cartera/domain/**`, `src/app/clientes/application/**`, `src/app/clientes/infrastructure/**`, `src/app/clientes/ui/cliente.modal.ts`, `src/app/shell/**` y `src/verificacion/**` (carpeta del verificador).

## Specs que cubre (citas textuales del plan)

- **S2 (RF-11):** "El sistema deberá calcular el saldo total adeudado por cada cliente sumando los saldos pendientes de todas sus facturas en estado *Pendiente* o *Abonada Parcialmente*."
- **S12 (`comun/diseno.md`):** "directorio con el total por cobrar, buscador, filtro "Todos / Con deuda" y la deuda de cada cliente en rojo, o "Al día" en gris. Mostrador no aparece porque nunca tiene deuda (R-09)"
- **D16 (textos aprobados):** «Agrega el primero con el botón +.» (directorio vacío) y «Ningún cliente tiene deuda» (filtro "Con deuda" vacío).
- **Regla 3 de `diseno.md`:** el rojo (`#FF6B6B`) queda reservado para el dinero; aquí marca la deuda.

## Lo que ya existe

- `clientes.page.ts`: buscador (`searchbar-clientes`), lista (`lista-clientes`, `item-cliente`, `avatar-cliente`), botón flotante (`fab-nuevo-cliente`) y estados `indicador-carga`, `estado-error` (`mensaje-error-carga`, `btn-reintentar`) y `mensaje-vacio`. Carga con `BuscarClientes.buscar(texto)`, que **ya excluye al Mostrador**, y muestra "Sin celular" si no hay teléfono. Tocar un cliente abre `cliente.modal.ts` para editarlo: **eso se queda igual**.
- `ConsultarCartera.consultar()` (bloque B4.0) devuelve `{ total, porCliente: ReadonlyMap<number, Pesos> }`, que sale de `CarteraRepository.deudasPorCliente(db)`.
- `formatearPesos`, `iniciales.ts`, `mensajes-error.ts` y los estilos de `shared/ui/estilos/` (tarjeta, segmento, estados vacío y error).
- **Hallazgo de la Etapa 3B (L8, CRITICAL):** el buscador no se deshabilita mientras carga, porque descartaba letras. El mockup `ClientesEstados` dice "Buscador y filtro deshabilitados mientras carga": **manda el hallazgo**. Mientras carga, el filtro sí queda deshabilitado; el buscador sigue habilitado y las respuestas viejas se descartan con un id de petición (regla 3 de `CLAUDE.md`).

## Qué hacer

1. **Cantidad de facturas con deuda.** El mockup muestra, debajo de la deuda, "3 facturas" o "1 factura". Cambia `CarteraRepository.deudasPorCliente` para que devuelva `ReadonlyMap<number, { readonly deuda: Pesos; readonly facturas: number }>`, con `COUNT(*)` en la misma consulta con `GROUP BY` (solo ventas con `saldo_pendiente > 0`). `ConsultarCartera.consultar()` pasa a devolver `{ total, porCliente }` con ese valor. Actualiza sus pruebas; `total` sigue siendo la suma de las deudas.
2. **Cabecera** según `Clientes.dc.html`: "N clientes" (cantidad de clientes del directorio, sin el Mostrador), la tarjeta "Por cobrar" con el total (`formatearPesos`) y "N clientes con deuda" (en singular, "1 cliente con deuda").
3. **Filtro** con `ion-segment`: "Todos · N" y "Con deuda · M". "Con deuda" muestra solo los clientes con deuda mayor a $0. El filtro se combina con el buscador.
4. **Fila de cada cliente:** a la derecha, la deuda en rojo (`#FF6B6B`) con "N facturas" ("1 factura") debajo, o "Al día" en gris si no debe nada.
5. **Estados** (regla 4), según `ClientesEstados`:
   - cargando: indicador y filtro deshabilitado, con el buscador habilitado;
   - sin clientes: "Todavía no hay clientes" y, debajo, «Agrega el primero con el botón +.»;
   - búsqueda sin resultados: "No se encontraron clientes";
   - filtro "Con deuda" sin deudores: «Ningún cliente tiene deuda»;
   - error: "Ocurrió un error inesperado" (el texto que ya se muestra hoy) con **Reintentar**. Si falla la carga de la deuda (aunque la de clientes funcione), es un error, nunca "Al día" para todos.
6. Carga los clientes y la cartera juntos en cada `ionViewWillEnter`, de modo que la deuda esté al día al volver a la pestaña.
7. **Accesibilidad** (regla 10): la deuda de cada fila tiene un texto para lectores de pantalla ("Debe $ 145.000 en 3 facturas" o "Al día"), y el segmento tiene etiqueta.

Conserva todos los `data-testid` que ya existen. Agrega, como mínimo: `total-por-cobrar`, `cantidad-clientes`, `cantidad-con-deuda`, `segment-filtro-todos`, `segment-filtro-con-deuda`, `deuda-cliente` (dentro de cada `item-cliente`), `facturas-cliente` y `al-dia-cliente`.

## Pruebas

Pruebas primero (RED → GREEN):

- **Unitarias de la página** (`clientes.page.spec.ts`) con `BuscarClientes` y `ConsultarCartera` simulados: la cabecera, el filtro, la fila con deuda y la fila al día, los cinco estados con el texto exacto, el filtro deshabilitado y el buscador habilitado mientras carga, y que una respuesta vieja no pisa a la nueva.
- **Repositorio y caso de uso** contra `SqlJsDatabase` con las `MIGRACIONES`: la cantidad de facturas por cliente y el total.
- **e2e** (`e2e/clientes.spec.ts`): crea por la app un cliente con una venta a fiado y otro sin compras, y comprueba la deuda, "Al día", el total por cobrar y el filtro "Con deuda". Las pruebas e2e que ya existen siguen pasando sin cambiar lo que verifican.

Los criterios de aceptación que siguen dicen qué se exige.

---

# Criterios de aceptación — B4.1

Datos de partida, salvo que el criterio diga otra cosa: **Ana** con F1 (saldo $30.000) y F2 (total $15.000, pagado $5.000, saldo $10.000), es decir, debe $40.000 en 2 facturas; **Carla** con una factura de saldo $22.000 (debe $22.000 en 1 factura); **Beto** sin compras; y el Mostrador.

- C1: `CarteraRepository.deudasPorCliente` devuelve, en una sola consulta, Ana → `{ deuda: 40000, facturas: 2 }` y Carla → `{ deuda: 22000, facturas: 1 }`; Beto, el Mostrador y los clientes con todas sus facturas pagadas no aparecen. `ConsultarCartera.consultar()` devuelve `total` 62000.
  Cómo comprobarlo: prueba contra `SqlJsDatabase` con las `MIGRACIONES`.
- C2: La cabecera muestra "3 clientes", "Por cobrar" con "$ 62.000" en `total-por-cobrar` y "2 clientes con deuda"; con un solo deudor dice "1 cliente con deuda".
- C3: La fila de Ana muestra "$ 40.000" en rojo (`#FF6B6B`) en `deuda-cliente` y "2 facturas" en `facturas-cliente`; la de Carla "$ 22.000" y "1 factura"; la de Beto "Al día" en gris en `al-dia-cliente` y sin monto. El Mostrador no aparece en la lista.
- C4: El filtro: "Todos · 3" muestra a Ana, Beto y Carla; "Con deuda · 2" muestra solo a Ana y Carla. Con el filtro "Con deuda" y la búsqueda "an", solo queda Ana. Volver a "Todos" muestra de nuevo a los tres.
- C5: Estados con el texto exacto: sin clientes, "Todavía no hay clientes" y «Agrega el primero con el botón +.»; búsqueda sin resultados, "No se encontraron clientes"; filtro "Con deuda" sin deudores (solo Beto), «Ningún cliente tiene deuda».
- C6: Error de carga: si falla `BuscarClientes` **o** `ConsultarCartera`, se ve `estado-error` con el mismo texto de error que muestra hoy el directorio y **Reintentar**; nunca la lista con "Al día" ni el estado vacío. Reintentar con la carga ya funcionando muestra la lista con las deudas.
- C7: Mientras carga, se ve `indicador-carga`, el filtro está deshabilitado (también para lectores de pantalla) y el buscador sigue habilitado: escribir durante la carga no pierde letras.
- C8: Respuestas viejas: si se escribe "a" y después "an", y la respuesta de "a" llega después de la de "an", la lista muestra el resultado de "an".
- C9: Al volver a la pestaña (`ionViewWillEnter`) se recargan los clientes y la cartera: después de registrar un abono que deja a Carla en $0, la fila de Carla dice "Al día" y el total baja a "$ 40.000".
- C10: Tocar un cliente sigue abriendo el modal de editar cliente, como hoy, y crear un cliente con el botón flotante lo agrega a la lista como "Al día".
- C11: Accesibilidad: cada fila tiene un texto para lectores de pantalla con la deuda ("Debe $ 40.000 en 2 facturas") o "Al día", y el segmento del filtro tiene etiqueta.
- C12: e2e en `e2e/clientes.spec.ts`: crea por la app un cliente con una venta a fiado y otro sin compras, y comprueba su deuda, "Al día", el total por cobrar y el filtro "Con deuda". Las pruebas e2e que ya existían siguen pasando sin cambiar lo que verifican.
  Cómo comprobarlo: `npx playwright test e2e/clientes.spec.ts` y revisión del diff de ese archivo.
- C13: Revisión visual: a 390 px de ancho, el directorio coincide con `Clientes.dc.html` en estructura, textos y colores (fondo `#000`, tarjetas `#0F1012`, rojo solo en la deuda), con las diferencias anotadas en el reporte.
  Cómo comprobarlo: captura con Playwright a 390 px y comparación con el mockup.
- C14: Solo se tocaron las rutas permitidas; se conservan los `data-testid` que ya existían; `npm run lint`, `npm run test:unit` y `npm run build` pasan sin advertencias (las 487 pruebas que ya existían siguen en verde salvo las de `deudasPorCliente` y `ConsultarCartera`, actualizadas al nuevo valor).
- C15: Calidad de las pruebas (regla 6 de `CLAUDE.md` y de `comun/base.md`): cada estado se comprueba con el texto exacto que ve el usuario, no solo con `toHaveBeenCalled`; sin `try/catch` para verificar errores.
  Cómo comprobarlo: revisión de los `.spec.ts` tocados.
