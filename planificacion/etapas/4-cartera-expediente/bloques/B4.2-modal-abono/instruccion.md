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

# Tarea B4.2 — Modal de abono y su resumen

## Objetivo

Crear el modal para registrar un abono, con sus tres modos ("A la deuda", "A una factura" y "Pagar todo"), y el resumen que se confirma antes de guardar, según los mockups aprobados `planificacion/diseno/mockups/ModalAbono.dc.html`, `ModalAbonoEstados.dc.html` y `ModalAbonoResumen.dc.html`. Este bloque solo crea los componentes: el expediente que los abre llega en el bloque B4.3, así que aquí se prueban con pruebas unitarias.

## Rutas

**Permitidas** (solo estas):

- `src/app/cartera/ui/**` (carpeta nueva)
- `src/app/shared/ui/estilos/**` (solo piezas nuevas; no cambies las que ya existen)

**Prohibidas:** todo lo demás, en especial `src/app/cartera/application/**`, `src/app/cartera/domain/**`, `src/app/cartera/infrastructure/**`, `src/app/shared/ui/*.ts` (se usan, no se cambian), `src/app/ventas/**`, `src/app/clientes/**` y `src/verificacion/**` (carpeta del verificador).

## Specs que cubre (citas textuales del plan)

- **S3 (RF-12):** "Cuando un cliente realice un abono general a su deuda total indicando el monto y el medio de pago (Efectivo o Transferencia), el sistema deberá descontar el dinero empezando por la factura pendiente más antigua; si el abono cubre la totalidad de esa factura, la marcará como *Pagada* y aplicará el excedente sucesivamente a las siguientes facturas en orden cronológico ascendente."
- **S4 (RF-13):** "El sistema deberá permitir al usuario seleccionar una factura pendiente específica del cliente para aplicarle un abono parcial o pago total de manera aislada, sin afectar las demás facturas abiertas."
- **S5 (RF-14):** "El sistema deberá incluir una función rápida para saldar el 100% de la deuda acumulada de un cliente, cerrando todas sus facturas pendientes y registrando el ingreso por el medio de pago seleccionado (Efectivo o Transferencia)."
- **S7 (R-15):** "**Confirmación antes de guardar:** la venta y el abono muestran un resumen pequeño con **Aceptar** y **Volver a editar**."
- **S8 (R-13):** "**Nada con fecha futura:** compra, aporte, venta, abono, retiro y traspaso llevan la fecha de ahora (del `CLOCK`) o una pasada, nunca una posterior (`FECHA_FUTURA`)."
- **S15 (`comun/diseno.md`):** "modal de abono con tres modos: "A la deuda" en cascada de la factura más antigua a la más nueva (RF-12, R-02), "A una factura" (RF-13) y "Pagar todo" (RF-14). Lleva un resumen antes de guardar (R-15) y no acepta fecha futura (R-13)"
- **S14:** "medio de pago: Efectivo en verde billete (`#8FCB6B`) y Transferencia en violeta (`#B49CF0`), cada uno con su ícono"
- **D7:** "**Registrar abono** abre el modo "A la deuda"; **Pagar todo** abre el modo "Pagar todo" con el monto fijo. En "A una factura" se elige la factura de una lista de las abiertas, de la más antigua a la más nueva."
- **D8:** "el modal arma la vista previa con las funciones de D2 sobre las facturas cargadas; `RegistrarAbono` recalcula dentro de la transacción y es el que manda."
- **D9:** el texto de la fecha futura es el `FECHA_FUTURA` actual, «La fecha no puede ser futura». El mockup muestra «La fecha del abono no puede ser futura»: **manda D9**.
- **D14:** si la fecha es anterior a una factura que recibe dinero, el modal muestra «La fecha del abono es anterior a una factura que paga» (`ABONO_ANTERIOR_A_FACTURA`) junto a la fecha.

## Lo que ya existe y debes reutilizar

- **Dominio** (`src/app/cartera/domain/`): `FacturaAbierta` (`idVenta`, `fecha`, `total`, `costoBase`, `pagado`), `saldo`, `deudaTotal`, `distribuirCascada`, `abonarFactura`, `liquidarTodo`, `validarFechaAbono` y `AplicacionAbono` (`idVenta`, `monto`, `capital`, `ganancia`, `quedaPagada`). La vista previa y las validaciones del modal salen de **estas** funciones: no repitas el reparto ni la cascada.
- **Caso de uso:** `RegistrarAbono.registrar(s: SolicitudRegistrarAbono)` (`src/app/cartera/application/registrar-abono.ts`), con `modo` `CASCADA_GLOBAL` (`monto`), `FACTURA_INDIVIDUAL` (`idVenta`, `monto`) o `LIQUIDACION_TOTAL`, más `idCliente`, `fecha` y `medio`.
- **Piezas de interfaz:** `CampoPesosComponent` (`app-campo-pesos`, entrega un entero o `null`), `HojaFechaComponent` (`app-hoja-fecha`, con `maximo` del `CLOCK`), `mensajeDeError` y `MENSAJES_ERROR` (`shared/ui/mensajes-error.ts`), `soloCierreExplicito`, `ROL_GUARDADO` y `esVacio` (`shared/ui/formulario.ts`), `formatearPesos`, los estilos de `shared/ui/estilos/` (hoja de modal, segmento, campo con contorno) y el token `CLOCK`.
- **Patrón a copiar:** `src/app/ventas/ui/resumen-venta.modal.ts` (el resumen guarda con la guarda `guardando`/`guardado`, avisa al modal padre con `alCambiarGuardando`, muestra el error en un toast con `mensajeDeError` y deja reintentar) y cómo `vender.page.ts` abre ese resumen (`canDismiss: soloCierreExplicito`, el modal padre bloqueado mientras el resumen guarda) y muestra la fecha elegida con la hoja de fecha.

## Qué hacer

### 1. `src/app/cartera/ui/abono.modal.ts` (`AbonoModalComponent`)

Entradas (`@Input`, como el resumen de venta): `cliente: Cliente` (obligatoria), `facturas: readonly FacturaAbierta[]` (las abiertas del cliente, obligatoria), `modoInicial: 'CASCADA_GLOBAL' | 'FACTURA_INDIVIDUAL' | 'LIQUIDACION_TOTAL'` (por defecto `CASCADA_GLOBAL`). Al guardar, se cierra con `ROL_GUARDADO`; **Cancelar** lo cierra sin guardar.

Según `ModalAbono.dc.html` y `ModalAbonoEstados.dc.html`:

- **Cabecera:** "Registrar abono", el nombre del cliente y "debe $ N" (la deuda total), y **Cancelar**.
- **Modo** con `ion-segment`: "A la deuda", "A una factura" y "Pagar todo".
- **"A la deuda":** campo "Monto del abono" con la ayuda "Hasta $ N" (la deuda total).
- **"A una factura":** lista de las facturas abiertas de la más antigua a la más nueva ("Factura #N", la fecha y "Saldo $ N"); se elige una y el campo "Monto del abono" muestra "Hasta $ N" con el saldo de esa factura. Si solo hay una factura abierta, queda elegida.
- **"Pagar todo":** "Monto a pagar" con la deuda total, que **no se edita**, y "Salda las N facturas con saldo" ("Salda la factura con saldo" si es una).
- **Medio de pago** con `ion-segment`: Efectivo y Transferencia, con sus colores e íconos (S14). Empieza en Efectivo, como en Vender (`vender.page.ts:701`).
- **Fecha del abono** con la hoja de fecha (`app-hoja-fecha`), por defecto ahora del `CLOCK` y con `maximo` = ahora.
- **"Así se aplica · de la más antigua a la más nueva"** (en "A la deuda" y "Pagar todo"; en "A una factura", solo la factura elegida): cada factura que recibe dinero con "Factura #N", la fecha corta, el monto que recibe y "queda pagada" o "queda debiendo $ N". Se calcula con las funciones del dominio y se actualiza al cambiar el monto, el modo o la factura.
- **Botón principal** (lima): "Revisar abono · $ N" ("Revisar abono" sin monto si está vacío) y, en "Pagar todo", "Revisar pago · $ N". Abre el resumen.
- **Validación** (regla 1 de `CLAUDE.md`): el botón queda deshabilitado mientras falte el monto o la factura (en "A una factura"), o haya un error. Los errores se muestran junto al campo, con el texto de `MENSAJES_ERROR`: monto $0 → `MONTO_INVALIDO`; mayor que la deuda → `MONTO_SUPERA_DEUDA`; mayor que el saldo de la factura → `MONTO_SUPERA_SALDO_FACTURA`; fecha futura → `FECHA_FUTURA`; fecha anterior a una factura que recibe dinero → `ABONO_ANTERIOR_A_FACTURA`. Los errores de formato del monto los da el campo de pesos. Nada de `?? 0` ni conversiones silenciosas.
- Mientras el resumen guarda, el modal no se cierra (`canDismiss`) y sus campos y botones quedan deshabilitados (regla 3).

### 2. `src/app/cartera/ui/resumen-abono.modal.ts` (`ResumenAbonoModalComponent`)

Según `ModalAbonoResumen.dc.html`: "Resumen del abono", **Cliente**, **Fecha**, **Medio de pago**, el modo con su monto ("Abono a la deuda", "Abono a la factura #N" o "Pago total"), cada factura que recibe dinero ("Factura #N", "Queda pagada" o "Queda debiendo $ N", y el monto), **Recupera capital** (suma del capital aplicado), **Suma a la ganancia libre** (suma de la ganancia aplicada) y **Deuda después del abono**. Botones **Aceptar** (lima) y **Volver a editar**.

- **Aceptar** llama a `RegistrarAbono.registrar` con la solicitud del modo elegido. Guarda `guardando` activada **antes** del primer `await` y liberada en `finally`; mientras guarda, "Guardando…", los dos botones deshabilitados y el resumen no se cierra. Si guarda, cierra el resumen y avisa al modal de abono, que se cierra con `ROL_GUARDADO`. Si falla, muestra el error con `mensajeDeError` y vuelve a habilitar los botones para reintentar; no se aplicó nada.
- **Volver a editar** cierra el resumen y deja el modal de abono con los datos intactos.

## Pruebas

Pruebas primero (RED → GREEN), con `RegistrarAbono` simulado, un `CLOCK` fijo en 2026-11-20 12:00:00 y estas facturas de Ana: **F1** (id 1, 2026-11-01 10:00:00, total $30.000, costo $20.000, pagado $0) y **F2** (id 2, 2026-11-10 10:00:00, total $15.000, costo $10.000, pagado $5.000). Ana debe $40.000.

Cubre cada campo (vacío, inválido, válido) con el estado del botón; los tres modos; la vista previa; el resumen; el doble toque en **Aceptar** (una sola llamada a `registrar`); el botón deshabilitado mientras guarda y habilitado de nuevo tras un error; y el texto exacto que ve el usuario en cada error (no solo `toHaveBeenCalled`). Los criterios de aceptación que siguen dicen qué se exige.

---

# Criterios de aceptación — B4.2

Datos de partida: `CLOCK` fijo en 2026-11-20 12:00:00; clienta **Ana**; facturas abiertas **F1** (id 1, 2026-11-01 10:00:00, total $30.000, costo $20.000, pagado $0) y **F2** (id 2, 2026-11-10 10:00:00, total $15.000, costo $10.000, pagado $5.000). Ana debe $40.000. `RegistrarAbono` simulado. Los montos se ven con `formatearPesos` ("$ 40.000").

- C1: Al abrir con `modoInicial` por defecto, el modal muestra "Registrar abono", "Ana" y "debe $ 40.000", el segmento en "A la deuda", el medio en Efectivo, la fecha de ahora (2026-11-20 12:00) y la ayuda "Hasta $ 40.000". El botón dice "Revisar abono" y está deshabilitado porque falta el monto.
- C2: "A la deuda" con $35.000: la vista previa "Así se aplica · de la más antigua a la más nueva" muestra primero "Factura #1" con $ 30.000 y "queda pagada", y después "Factura #2" con $ 5.000 y "queda debiendo $ 5.000". El botón dice "Revisar abono · $ 35.000" y está habilitado.
- C3: Límites de "A la deuda": con $40.000 el botón se habilita y las dos facturas "quedan pagadas"; con $40.001 el campo muestra "El monto supera la deuda del cliente" y el botón queda deshabilitado; con $0 muestra "El monto debe ser un número entero mayor a cero" y el botón queda deshabilitado.
- C4: "A una factura": la lista muestra "Factura #1" (saldo $ 30.000) antes que "Factura #2" (saldo $ 10.000). Sin factura elegida, el botón queda deshabilitado. Al elegir F2, la ayuda dice "Hasta $ 10.000"; con $3.000, la vista previa muestra solo "Factura #2" con $ 3.000 y "queda debiendo $ 7.000"; con $10.001, "El monto supera el saldo de la factura" y el botón deshabilitado; con $10.000, "queda pagada" y el botón habilitado. Con una sola factura abierta, queda elegida al entrar al modo.
- C5: "Pagar todo" (también con `modoInicial: 'LIQUIDACION_TOTAL'`): "Monto a pagar" muestra $ 40.000 y no se puede editar, "Salda las 2 facturas con saldo" (con una sola factura, "Salda la factura con saldo") y el botón dice "Revisar pago · $ 40.000", habilitado.
- C6: Fecha futura: elegir 2026-11-20 12:01 muestra "La fecha no puede ser futura" junto a la fecha y deja el botón deshabilitado; la hoja de fecha tiene `maximo` igual al ahora del `CLOCK`.
- C7: Fecha anterior a una factura que paga (D14): "A la deuda" con $35.000 y fecha 2026-11-05 10:00 muestra "La fecha del abono es anterior a una factura que paga" junto a la fecha y deja el botón deshabilitado; con la misma fecha y $30.000 (solo recibe F1) el botón se habilita.
- C8: Cambiar de modo recalcula la vista previa, la ayuda y los errores: un error de "A una factura" no queda visible al volver a "A la deuda".
- C9: El resumen de "A la deuda" con $35.000 en Efectivo muestra "Resumen del abono", Cliente "Ana", la fecha, Medio de pago "Efectivo", "Abono a la deuda" $ 35.000, "Factura #1" "Queda pagada" $ 30.000, "Factura #2" "Queda debiendo $ 5.000" $ 5.000, "Recupera capital" $ 25.000, "Suma a la ganancia libre" $ 10.000 y "Deuda después del abono" $ 5.000. En "Pagar todo", "Recupera capital" $ 25.000, "Suma a la ganancia libre" $ 15.000 y "Deuda después del abono" $ 0.
- C10: **Aceptar** llama a `RegistrarAbono.registrar` una vez, con exactamente `{ modo: 'CASCADA_GLOBAL', idCliente, fecha, medio: 'EFECTIVO', monto: 35000 }`; en "A una factura", `{ modo: 'FACTURA_INDIVIDUAL', …, idVenta: 2, monto: 3000 }`; en "Pagar todo", `{ modo: 'LIQUIDACION_TOTAL', … }` sin `monto`. Al guardar, el resumen se cierra y el modal de abono se cierra con `ROL_GUARDADO`.
- C11: Doble toque: dos clics seguidos en **Aceptar** producen **una sola** llamada a `registrar`.
- C12: Mientras guarda: se ve "Guardando…", **Aceptar** y **Volver a editar** están deshabilitados (también para lectores de pantalla), el resumen no se cierra (`canDismiss`) y el modal de abono no se cierra ni deja editar sus campos.
- C13: Error al guardar: si `registrar` falla con `MONTO_SUPERA_DEUDA`, se ve "El monto supera la deuda del cliente"; con un error inesperado, el texto genérico de `mensajeDeError`. Los botones vuelven a habilitarse y un segundo **Aceptar** vuelve a llamar a `registrar` (reintento).
- C14: **Volver a editar** cierra el resumen sin llamar a `registrar` y deja el modal con el modo, el monto, el medio y la fecha intactos. **Cancelar** cierra el modal de abono sin guardar.
- C15: La vista previa sale de `distribuirCascada`, `abonarFactura`, `liquidarTodo` y `validarFechaAbono` del dominio; no hay otra implementación del reparto ni de la cascada en `cartera/ui/`.
  Cómo comprobarlo: revisión del código.
- C16: Accesibilidad (regla 10): cada campo tiene etiqueta visible ("Monto del abono", "Medio de pago", "Fecha del abono"), los segmentos tienen etiqueta, cada botón de solo ícono tiene `aria-label` y los deshabilitados se reflejan con `aria-disabled`.
- C17: Los colores siguen `comun/diseno.md`: botón principal lima, Efectivo en `#8FCB6B` y Transferencia en `#B49CF0` con su ícono; sin `ion-select`.
  Cómo comprobarlo: revisión de la plantilla y los estilos.
- C18: Solo se tocaron las rutas permitidas; `npm run lint`, `npm run test:unit` y `npm run build` pasan sin advertencias (las 502 pruebas que ya existían siguen en verde).
- C19: Calidad de las pruebas: cada error se comprueba con el texto exacto que ve el usuario; sin `try/catch` para verificar errores; las pruebas llaman a los componentes que nombran.
  Cómo comprobarlo: revisión de los `.spec.ts` nuevos.
