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
