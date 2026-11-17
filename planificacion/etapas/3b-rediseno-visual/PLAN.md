# Etapa 3B — Rediseño visual

**Estado:** 📝 plan por aprobar · **Rama del plan:** `docs/plan-etapa-3b` · **Rama de implementación:** `feat/etapa-3b-rediseno-visual` (sale del `main` actual) · **Entrega:** un PR a `main` · **Pruebas:** Vitest (`ng test`) + Playwright (`e2e/`)
**Objetivo:** las pantallas que ya existen se ven como los mockups aprobados: fondo negro, tarjetas oscuras, verde lima para la acción principal, celeste para la secundaria, Inter y modales tipo hoja. La etapa no agrega funciones. Corrige el selector de clientes de Vender (L16 de la Etapa 3) y aplica las reglas R-13 y R-17 en la compra y el aporte.

## Qué hay hoy

- **`main` en `8c2b681`**, con la Etapa 3 (PR #15), la revisión del plan (PR #16) y los mockups (PR #17) integrados. Angular 22.2.3 e Ionic 9.
- **Pantallas que existen:**
  - pestañas en `shell/tabs.page.ts`;
  - **Inventario** con los modales de compra (`nueva-compra.modal.ts`) y aporte (`aporte.modal.ts`);
  - **Vender**, con el selector de clientes (`selector-cliente-contenido.component.ts`), el modal de fecha en línea y el resumen (`resumen-venta.modal.ts`);
  - **Clientes**, con el modal de cliente (`cliente.modal.ts`).
- **Finanzas no tiene pantalla:** la pestaña carga `shell/proximamente.page.ts` con "Disponible en la Etapa 5". El dashboard aprobado es de la Etapa 5.
- **Tema:**
  - el modo oscuro sigue al sistema operativo (`global.scss` importa `palettes/dark.system.css`);
  - `theme/variables.scss` está vacío, así que se usan los colores por defecto de Ionic;
  - no hay ninguna fuente declarada.
- **Reglas pendientes del código:**
  - **R-13 (sin fecha futura):** compra y aporte usan `ion-input type="date"` sin máximo, y `RegistrarCompra` y `RegistrarAporte` no rechazan fechas futuras. Solo la venta usa `FECHA_FUTURA`.
  - **R-17 (aporte mayor a $0):** en `aporte.modal.ts:119`, $0 habilita **Guardar**, y el error solo aparece después de intentar guardar. El dominio ya rechaza `monto <= 0` con `MONTO_INVALIDO`.
- **`ion-select`:** queda en la compra (tipo de papel y medio) y en el aporte (medio). `e2e/inventario.acceptance.spec.ts` los maneja con un ayudante del `ion-alert` (`seleccionarEnIonSelect`).
- **Defecto L16:** el Mostrador se inserta sin teléfono (`001-esquema-inicial.ts:107`), así que su fila del selector tiene una línea y las demás dos. Falta confirmar si además influye que el contenido no tenga la clase `ion-page`.
- **Se reutilizan:** `CampoPesosComponent`, `mensajes-error.ts`, `formulario.ts` (`soloCierreExplicito`, `esVacio`) y `formatearPesos`. Los `data-testid` de los e2e (lista completa en la evidencia de L2) se conservan.

## Specs

Citas textuales; si una cita y un bloque no coinciden, manda la cita.

| ID | Requisito | Fuente |
|----|-----------|--------|
| S1 | "rehace las pantallas existentes (Finanzas provisional, Vender, Inventario y Clientes) según los mockups aprobados. Las etapas 4 y 5 diseñan lo que falta con el mismo sistema (`comun/diseno.md`). Si un mockup ignoró una regla, se corrige el mockup antes de implementarlo." | `planificacion/README.md`, ajustes de la revisión del plan |
| S2 | "**Solo componentes de Ionic**, sin librerías de interfaz adicionales. Aspecto minimalista, elegante y consistente en toda la app." | `comun/diseno.md`, regla 1 |
| S3 | "**Paleta:** fondo negro (`#000`), tarjetas `#0F1012`, verde lima `#CBFF3D` para la acción principal y celeste `#5EC8F2` para las acciones secundarias." | `comun/diseno.md`, regla 2 |
| S4 | "**Rojo y verde quedan reservados para el dinero:** rojo (`#FF6B6B`) mientras el capital recuperado está por debajo de lo invertido, y verde (`#34D399`) cuando hay ganancia." | `comun/diseno.md`, regla 3 |
| S5 | "**Tipografía:** Inter." | `comun/diseno.md`, regla 5 |
| S6 | "**Controles:** segmentos (`ion-segment`) en lugar de `ion-select`. Las barras de stock son celestes." | `comun/diseno.md`, regla 6 |
| S7 | "**Nada con fecha futura:** compra, aporte, venta, abono, retiro y traspaso llevan la fecha de ahora (del `CLOCK`) o una pasada, nunca una posterior (`FECHA_FUTURA`)." | `comun/modelo-contable.md`, R-13 (aquí la compra y el aporte) |
| S8 | "**Aporte mayor a $0:** un aporte de $0 no es válido. El botón queda deshabilitado y el dominio lo rechaza." | `comun/modelo-contable.md`, R-17 |
| S9 | "al momento de querer elegir el cliente, la lista desplegable con las opciones se desconfigura, el cliente mostrador aparece con buen espacio entre la caja, mientras que el que le sigue pareciera como si su espacio estuviera cortado, ya que no es igual de grande que el de mostrador" | Etapa 3, L16 |
| S10 | "estoy descontento con el diseño de la interfaz, me parece que es poco atractiva y muy sosa" | Etapa 3, L16 |

### Ejemplos de aceptación

Cada uno es una prueba o un chequeo visual contra el mockup que se nombra.

| ID | Situación | Resultado esperado |
|----|-----------|--------------------|
| E1 | Abrir la app con el teléfono en modo claro. | fondo `#000`, tarjetas `#0F1012`, textos en Inter; la pestaña activa en lima `#CBFF3D` y las demás en gris (mockups `Main`, `Vender`, `Inventario`, `Clientes`) |
| E2 | Buscar `ion-select` en `src/`. | no aparece; tipo de papel y medio de pago son `ion-segment` en la compra y el aporte, como en Vender |
| E3 | Compra con fecha de mañana. | junto a la fecha se ve el mensaje de `FECHA_FUTURA` y **Guardar** queda deshabilitado; `RegistrarCompra` la rechaza (`FECHA_FUTURA`) y no se escribe nada. Con la fecha de hoy se guarda |
| E4 | Aporte con fecha de mañana. | igual que E3, con `RegistrarAporte` |
| E5 | Aporte de $0. | **Guardar** queda deshabilitado y el campo muestra "El monto debe ser un número entero mayor a cero"; el dominio lo rechaza (`MONTO_INVALIDO`) y no se escribe nada |
| E6 | Abrir el selector de clientes de Vender con el Mostrador y dos clientes con teléfono. | todas las filas tienen la misma altura; la del Mostrador muestra "Venta rápida · solo contado" como segunda línea (mockup `ModalCliente`). Un e2e compara la altura de las filas |
| E7 | Elegir la fecha de una compra o un aporte. | se abre la misma hoja de fecha que en Vender (mockup `ModalFecha`), con día y hora y sin días futuros |
| E8 | Correr las pruebas unitarias y e2e que ya existen. | pasan sin cambiar lo que verifican; solo cambia cómo se elige un segmento donde antes había un `ion-select` |
| E9 | Comparar cada pantalla y modal con su mockup. | la estructura, los textos, los colores y los estados (cargando, vacío, error) coinciden; las diferencias quedan anotadas y explicadas en el PR |
| E10 | Guardar desde cualquier modal rediseñado mientras otra petición está en curso. | siguen la guarda `guardando`, el modal que no se cierra y la vista bloqueada (reglas 2 y 3 de `CLAUDE.md`), igual que antes |

## Decisiones

| # | Decisión | Por qué |
|---|----------|---------|
| D1 | **Modo oscuro siempre**: `global.scss` usa `palettes/dark.always.css` en lugar de `dark.system.css`. | Los mockups solo existen en oscuro; con el sistema en modo claro la app se vería distinta a lo aprobado. |
| D2 | **Paleta como variables de Ionic** en `theme/variables.scss`: `--ion-background-color` `#000`, `--ion-color-primary` lima `#CBFF3D` con contraste oscuro, `--ion-color-secondary` celeste `#5EC8F2`, `--ion-color-danger` `#FF6B6B`, `--ion-color-success` `#34D399` y `--ion-color-warning` `#F5B544`. Más variables propias para tarjetas (`#0F1012`) y bordes (`#1F2125`, `#3A3D44`). | Los componentes de Ionic toman los colores de ahí; una sola fuente evita repetir hexadecimales en cada pantalla. |
| D3 | **Inter empaquetada en la app**, con el paquete `@fontsource-variable/inter` de npm; nada se carga de Google Fonts. | La app funciona sin conexión en Android: una fuente remota no cargaría. Agregar una dependencia es el ítem 5 de alto riesgo: va en su propio commit. |
| D4 | **Estilos compartidos en `shared/ui/estilos/`** (tarjeta, segmento, hoja de modal, campo con contorno, estados vacío y error), importados desde `global.scss`. | Las cuatro pantallas y los modales usan las mismas piezas (S2: consistencia). |
| D5 | **Fecha de compra y aporte con la hoja de fecha de Vender**: el `ion-datetime` en hoja, con `max` = ahora del `CLOCK`, se extrae de `vender.page.ts` a `shared/ui/` y lo usan los tres. | S7 y E7: una sola forma de elegir fecha en toda la app. |
| D6 | **`FECHA_FUTURA` en `RegistrarCompra` y `RegistrarAporte`**, con el `CLOCK`, igual que la venta. | R-13: la pantalla guía y el dominio es la última barrera (regla 1 de `CLAUDE.md`). |
| D7 | **Finanzas sigue mostrando "Disponible en la Etapa 5"**, con el estilo nuevo. | No existe una pantalla provisional; el dashboard aprobado (RF-17 a RF-21) es de la Etapa 5. |
| D8 | **Clientes en la 3B: solo lo que ya existe**, con el estilo nuevo: buscador, lista, botón flotante lima y modal de cliente. El total por cobrar, la deuda por cliente, el filtro "Con deuda" y el expediente son de la Etapa 4. | RF-06 y RF-11 son de la Etapa 4; S1 pide rehacer lo que existe. |

## Bloques

| ID | Bloque | Specs | Ruta | Agente | Ola |
|----|--------|-------|------|--------|-----|
| B3B.0 | Tema, fuente y estilos compartidos | S2–S5; D1–D4; E1 | delegado | `agy` · `gemini-4-hydrogen-medium` | 1 |
| B3B.1 | Inventario, compra y aporte | S6–S8; D5, D6; E2–E5, E7, E8, E10 | delegado | `agy` · `gemini-4-hydrogen-medium` | 2 |
| B3B.2 | Vender, selector de clientes, fecha y resumen | S9; E6, E8, E10 | delegado | `agy` · `gemini-4-hydrogen-medium` | 2 |
| B3B.3 | Clientes y modal de cliente | D8; E8, E10 | delegado | `agy` · `gemini-4-hydrogen-medium` | 2 |
| V3B | Verificación independiente | S1–S10, E1–E10 | delegado | `agy` · `gemini-4-hydrogen-high` | 3 |

Si Hydrogen se queda sin cuota: código con `gemini-3.8-flash-high` y verificación con `gemini-4-argon-medium`.

**Por qué en olas:** B3B.0 deja el tema y las piezas compartidas que usan los demás. B3B.1, B3B.2 y B3B.3 no comparten archivos y corren en paralelo, con una excepción: la hoja de fecha de D5 sale de Vender, así que la extrae B3B.2 y B3B.1 la usa. Por eso B3B.1 arranca después de que B3B.2 deja la hoja en `shared/ui/`, o la extrae el coordinador antes de la ola 2. Ningún bloque corre `npm install` ni `npm run build`: los corre el coordinador.

### B3B.0 — Tema, fuente y estilos compartidos

- **Rutas permitidas:** `src/global.scss`, `src/theme/variables.scss`, `src/app/shared/ui/estilos/**`, `src/index.html`, `angular.json` (solo estilos), `package.json` y `package-lock.json` (solo `@fontsource-variable/inter`, que instala el coordinador), `src/app/shell/**` (estilo de las pestañas y de la página "Disponible en la Etapa N")
- **Qué hacer:** D1 a D4 y D7. Las pestañas siguen el mockup (`nav` de `Vender.dc.html`): fondo `#0A0A0B`, borde superior `#1F2125`, ícono y texto activos en lima.
- **Pruebas:** las del shell siguen pasando; un e2e comprueba el fondo `#000` y la fuente Inter con `getComputedStyle` (E1).

### B3B.1 — Inventario, compra y aporte

- **Rutas permitidas:** `src/app/inventario/ui/**`, `src/app/finanzas/ui/aporte.modal.ts`, `src/app/inventario/application/registrar-compra.ts`, `src/app/finanzas/application/registrar-aporte.ts` (y sus `.spec.ts`), `e2e/inventario.spec.ts`, `e2e/inventario.acceptance.spec.ts`
- **Qué hacer:**
  1. Inventario según `Inventario.dc.html`, `InventarioFab.dc.html` e `InventarioEstados.dc.html`.
  2. Compra y aporte según `ModalCompra*` y `ModalAporte*`: `ion-segment` para el tipo y el medio (E2), la hoja de fecha de D5 (E7), y "Guardar" deshabilitado con fecha futura (E3, E4) o monto $0 (E5).
  3. `RegistrarCompra` y `RegistrarAporte` rechazan la fecha futura con el `CLOCK` (D6).
  4. Reemplaza en el e2e el ayudante del `ion-alert` por la elección del segmento (E8).
- **Pruebas:** E3 a E5 en el caso de uso y en el modal, con el texto exacto; las pruebas de la Etapa 2 siguen pasando.

### B3B.2 — Vender, selector de clientes, fecha y resumen

- **Rutas permitidas:** `src/app/ventas/ui/**`, `src/app/shared/ui/hoja-fecha*` (nuevo, D5), `e2e/vender.spec.ts`, `e2e/etapa-3.acceptance.spec.ts` (solo selectores)
- **Qué hacer:** Vender según `Vender.dc.html` y `VenderEstados.dc.html`; selector según `ModalCliente*`; fecha según `ModalFecha`; resumen según `ModalResumen*`. Corrige L16: todas las filas del selector con la misma altura, y el Mostrador con "Venta rápida · solo contado" (E6). Si la causa también es la falta de `ion-page`, se corrige y se anota.
- **Pruebas:** E6 con un e2e que mide las filas; las pruebas de la Etapa 3 siguen pasando.

### B3B.3 — Clientes y modal de cliente

- **Rutas permitidas:** `src/app/clientes/ui/**`, `e2e/clientes.spec.ts`
- **Qué hacer:** según `Clientes.dc.html` y `ClientesEstados.dc.html`, solo lo que existe hoy (D8): buscador, lista con avatar de iniciales, nombre y celular, botón flotante lima y estados. El modal de cliente con el estilo de `ModalNuevoCliente.dc.html`.
- **Pruebas:** las de la Etapa 3 siguen pasando.

### V3B — Verificación independiente

Lee este plan completo y `CLAUDE.md`, y prueba en una copia limpia (`mktemp -d`):

- corre `lint`, `test:unit`, `build` y `test:e2e`;
- reproduce E1 a E10; para E9 toma capturas a 390 px de ancho y las compara con cada mockup;
- da un veredicto por cada `S#` y `E#`;
- revisa las reglas 1 a 12 de `CLAUDE.md` en cada pantalla y modal tocado;
- controla las rutas permitidas.

## Verificación del coordinador

1. Antes de cada ola, anotar `HEAD`; después, comprobar que `agy` no hizo commits y revisar el diff contra las rutas permitidas.
2. Instalar `@fontsource-variable/inter` antes de la ola 1 y correr `npm run build` después de cada ola.
3. Correr `gentle-ai review assess` por commit. La dependencia nueva (ítem 5) va en su propio commit y se revisa sola.
4. Probar la app en el navegador (`npm start`) a 390 px y comparar cada pantalla con su mockup.
5. Generar la APK de debug (`npm run apk`) para la prueba manual de Miguel en Android.
6. Abrir el PR con el checklist de la regla 12 y esperar el check `verify`.

## Commits

1. `build: fuente Inter empaquetada en la app`
2. `feat: tema oscuro, paleta y estilos compartidos del rediseño`
3. `fix: compra y aporte sin fecha futura ni aporte de $0`
4. `feat: Inventario, compra y aporte con el diseño aprobado`
5. `fix: filas del selector de clientes con la misma altura`
6. `feat: Vender, selector de clientes, fecha y resumen con el diseño aprobado`
7. `feat: Clientes con el diseño aprobado`
8. `test: pruebas de aceptación de la verificación independiente`
9. `docs: cierre de la Etapa 3B`

## Por aprobar

1. **Modo oscuro siempre** (D1), aunque el teléfono esté en modo claro.
2. **Inter empaquetada** con `@fontsource-variable/inter` (D3): suma una dependencia de npm y funciona sin conexión. La alternativa es copiar el archivo de la fuente a `src/assets/`, sin dependencia, pero sin actualizaciones.
3. **Finanzas sigue mostrando "Disponible en la Etapa 5"**, con el estilo nuevo (D7).
4. **Clientes sin deuda en la 3B** (D8): el total por cobrar, la deuda por cliente, el filtro y el expediente llegan en la Etapa 4.
5. **Texto de `FECHA_FUTURA`:** hoy dice "La fecha de la venta no puede ser futura". Para usarlo también en la compra y el aporte, propongo "La fecha no puede ser futura", que cambia el texto que ya ve el usuario en Vender. La alternativa es un código por pantalla.
6. **Modelos de `agy`:** Hydrogen (`gemini-4-hydrogen-medium` para el código y `gemini-4-hydrogen-high` para la verificación), con Flash y Argon como respaldo.

## Log

Mensajes del usuario copiados textualmente; las notas del coordinador van entre corchetes.

- **L1** (2026-11-17): "Claude ya no hay pull request abiertas en el repositorio así que podemos  continuar con la siguiente etapa" [Verificado: sin PRs abiertos; #15, #16 y #17 integrados en `main` (`8c2b681`). La siguiente es la 3B. Se escribe este plan; no se ejecuta nada hasta que Miguel lo apruebe.]
- **L2** (2026-11-17): [Mapeo de solo lectura de la interfaz actual. Hallazgos: Finanzas no tiene pantalla; `ion-select` en la compra y el aporte; fecha nativa sin máximo; aporte de $0 habilitado (`aporte.modal.ts:119`, verificado por el coordinador); Mostrador sin teléfono (`001-esquema-inicial.ts:107`); sin fuente declarada; modo oscuro según el sistema. Los e2e dependen de estos `data-testid`, que se conservan: pestañas `ion-tab-button[tab=…]`; Inventario `fab-principal`, `fab-nueva-compra`, `fab-aportar-capital`, `segment-carta`, `segment-oficio`, `tarjeta-lote`, `mensaje-vacio`, `indicador-carga`; compra y aporte `input-fecha`, `input-cajas`, `input-costo-caja`, `input-monto`, `btn-guardar-compra`, `btn-guardar-aporte`, `btn-aportar-capital`, `aviso-saldo-insuficiente`, `error-cajas`, `error-costo-caja`, `error-fecha`, `btn-cancelar`, `select-tipo-papel` y `select-medio` (pasan a nombrar los segmentos); Vender `selector-cliente`, `modal-selector-cliente`, `item-cliente-vender`, `item-lote`, `linea-venta`, `input-cantidad`, `input-precio-unitario`, `error-cantidad`, `error-precio-unitario`, `aviso-bajo-costo`, `segment-contado`, `segment-fiado`, `segment-abono-inicial`, `segment-efectivo`, `segment-transferencia`, `input-abono-inicial`, `btn-fecha-venta`, `modal-fecha-venta`, `datetime-fecha-venta`, `btn-confirmar-venta`, `resumen-totales`, `resumen-cliente`, `resumen-linea`, `resumen-total`, `resumen-pago`, `btn-aceptar-venta`, `btn-volver-editar`, `indicador-guardando`, `btn-nuevo-cliente-vender`, `btn-cerrar-selector-cliente`, `searchbar-clientes-vender`, `estado-error`, `mensaje-error-carga`, `btn-reintentar`, `mensaje-sin-lotes`; Clientes `fab-nuevo-cliente`, `searchbar-clientes`, `item-cliente`, `lista-clientes`, `input-nombre`, `input-telefono`, `btn-guardar-cliente`, `error-telefono`, `error-nombre`.]
