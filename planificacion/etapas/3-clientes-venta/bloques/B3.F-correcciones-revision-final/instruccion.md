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

# Tarea B3.F — Correcciones de la revisión final de gentle-ai

**Etapa 3, última tanda de correcciones antes del PR.** Nadie más escribe en el árbol mientras trabajas. Antes de empezar, lee `CLAUDE.md` (raíz; reglas 1 a 12) y, en `planificacion/etapas/3-clientes-venta/PLAN.md`, **D6**, **D9**, **D10**, **D12**, **D13**, **D15**, **D16**, **E17**, **E18** y **E21**. Las cinco revisiones de gentle-ai aprobaron la etapa; estas son sus advertencias que siguen vigentes.

La app es *zoneless*: todo lo que la plantilla muestra y cambia después de un `await` debe ser una **signal**.

## Rutas permitidas

```
src/app/shared/ui/campo-pesos.component.ts
src/app/shared/ui/campo-pesos.component.spec.ts
src/app/shared/ui/mensajes-error.ts
src/app/shared/ui/mensajes-error.spec.ts
src/app/ventas/ui/**
src/app/clientes/ui/**
src/app/clientes/application/buscar-clientes.ts
src/app/clientes/application/clientes.spec.ts
e2e/clientes.spec.ts
```

Prohibido todo lo demás.

## Especificación

### Campo de pesos (`campo-pesos.component.ts`, D16, E21)

- **F1. El punto solo como separador de miles.** Después de quitar `$` y espacios, el texto es válido solo si es `^\d+$` o `^\d{1,3}(\.\d{3})+$`. Así, "3800", "3.800", "120.000" y "$ 1.250.000" son válidos, y "3800.50", "3.80", "38.00", "3..800" y ".800" son inválidos, con el mismo aviso y el mismo tratamiento que la coma (valor `null`, mensaje "Escribe el monto en pesos, sin decimales", `aria-invalid="true"`).
- **F2. Montos demasiado grandes.** Si el número no cabe en un entero seguro, no se corta: el valor es `null` y el campo muestra "El monto es demasiado grande", con su constante exportada en `mensajes-error.ts` y su prueba de texto exacto. Quita el recorte a 15 cifras.
- **F3. El texto inválido no desaparece.** Después de un texto inválido, el campo sigue mostrando exactamente lo que escribió el usuario, aunque antes tuviera un valor válido.
- **F4. Un cambio de `valor` desde afuera limpia el error.** Si el padre cambia `valor` (por ejemplo, al reiniciar el formulario de Vender después de una venta), el error de formato y `aria-invalid` desaparecen y se muestra el valor nuevo formateado.

### Vender y resumen (`ventas/ui/**`, D12, D13, D15, E17, E18)

- **F5. Una venta guardada nunca se informa como fallida.** En `resumen-venta.modal.ts`, separa la escritura de lo que pasa después: en cuanto `registrar` resuelve, el resultado es éxito aunque falle el `toast` o el `dismiss`. El modal cierra con `ROL_GUARDADO`, y si algo posterior falla no se muestra un error de guardado. Si `registrar` rechaza, el modal cierra con un rol propio de error (por ejemplo `'error'`), distinto de `ROL_CANCELAR`, que es **Volver a editar**. Si el `toast` del camino de error también falla, el modal igual se cierra y no queda ninguna promesa sin manejar.
- **F6. Recargar los lotes después de un error de guardado.** Con el rol de error, la página recarga los lotes (por ejemplo, después de `STOCK_INSUFICIENTE` se ve el stock real) y conserva el borrador para reintentar.
- **F7. El texto del pago sale del pago.** El resumen muestra la modalidad y el medio derivados del mismo `pago` que se envía a `registrar` ("Contado · Efectivo", "Fiado", "Abono inicial de $ A · Transferencia"). Elimina la segunda construcción paralela del texto en la página.
- **F8. Sin `?? 0` ni `?? pesos(0)` (regla 1).** En `vender.page.ts`, `abrirResumen`, `construirPago`, el texto del abono inicial y los totales no rellenan valores faltantes con 0: si falta algún valor, la acción no sigue (y el botón ya está deshabilitado por `puedeConfirmar`). Los totales se calculan solo con líneas válidas.
- **F9. La fecha por defecto es la de ahora.** Mientras el usuario no haya cambiado la fecha a mano, la fecha de la venta se toma del `CLOCK` al entrar a la pestaña (`ionViewWillEnter`) y al abrir el resumen, no solo al construir la página. Si la cambió a mano, se respeta hasta que se guarda la venta; después de guardar, vuelve a la de ahora.
- **F10. Error visible si el resumen no abre.** Si `modalCtrl.create` o `present` fallan en `abrirResumen`, se muestra un `ion-toast` con `mensajeDeError(error)` y la promesa no queda sin manejar. La guarda se libera igual.
- **F11. Reintentar de la búsqueda de clientes, observable.** Mientras se reintenta, el bloque de error queda visible con **Reintentar** deshabilitado (`disabled` y `aria-disabled="true"`) hasta que llega el resultado. La prueba de V4 verifica el DOM: el texto del error, el botón y el clic en **Reintentar**.
- **F12. Cliente por defecto coherente.** Si no se encuentra el Mostrador al cargar o al reiniciar, la página muestra el estado de error con **Reintentar**; nunca muestra "Mostrador" con una selección vacía.
- **F13. Una sola etiqueta de tipo de papel y una sola lectura del valor del evento.** `etiquetaPapel` y la lectura del valor de los eventos de Ionic se duplican en `vender.page.ts` y `resumen-venta.modal.ts`: muévelos a un único archivo en `src/app/ventas/ui/` y úsalo en los dos.

### Clientes (`clientes/ui/**`, `buscar-clientes.ts`, D10)

- **F14. Guardado y cierre separados.** En `cliente.modal.ts`, si `registrar` o `editar` resuelven y después falla `dismiss`, no se muestra un error de guardado ni se habilita **Guardar** para reintentar (evita un cliente duplicado).
- **F15. Buscar por celular con espacios.** En `BuscarClientes.buscar`, al comparar con el teléfono, quita los espacios del texto buscado: "300 123" encuentra a "3001234567".
- **F16. El e2e de clientes distingue.** En `e2e/clientes.spec.ts`, crea dos clientes antes de buscar, para que la búsqueda de "ana" devuelva solo a Ana y la prueba falle si el texto no se aplica. Agrega a `clientes.page.spec.ts` una prueba de que escribir en el buscador filtra la lista.

## Pruebas (primero RED)

Una prueba por regla F1 a F16, con todos sus efectos observables y el texto exacto que ve el usuario, por la interfaz pública. Para F5, simula que `toast.present` o `dismiss` rechazan después de que `registrar` resolvió: el resultado es `ROL_GUARDADO` y `registrar` se llamó una vez. Para F9, usa un `CLOCK` que avanza entre la construcción y la entrada a la pestaña. Las pruebas que ya existen siguen pasando sin cambiar lo que verifican, salvo las que F7 o F11 obligan a reescribir (explícalo).

## Verificación

Corre en primer plano y copia el resultado (con el número de pruebas):

```
npm run lint
npm run test:unit
npm run build
npm run test:e2e
```

Indica qué prueba cubre cada F#.
