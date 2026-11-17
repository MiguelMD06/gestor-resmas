# Mockups del rediseño de vistas

Fuente de los mockups que se usan para implementar cada vista. Las reglas visuales, la paleta y el estado de aprobación de cada vista están en [`../comun/diseno.md`](../comun/diseno.md); este archivo solo indica qué mockup corresponde a cada pantalla.

- **Lienzo interactivo (privado):** https://claude.ai/artifact/TyjQcXwL9cECDmCa7LbdJC
- **Fuente:** `mockups/*.dc.html`, un archivo por pantalla o estado. `mockups/canvas.json` guarda la disposición del lienzo.

Los `.dc.html` son la fuente del lienzo y no se ven bien abiertos solos en el navegador, porque dependen del entorno del lienzo. Sirven para leer estructura, textos, medidas y colores; para verlos, usa el enlace.

## Archivos por vista

| Vista | Pantalla | Estados y modales |
|-------|----------|-------------------|
| Finanzas | `Main.dc.html` | `FinRetiro`, `FinRetiroEstados`, `FinHistorial`, `FinHistorialEstados`, `FinTraspaso`, `FinTraspasoEstados`, `FinMes`, `FinRespaldo`, `FinRespaldoEstados` |
| Vender | `Vender.dc.html` | `VenderEstados` (estados de todos los campos de la app), `ModalCliente`, `ModalClienteEstados`, `ModalNuevoCliente`, `ModalFecha`, `ModalResumen`, `ModalResumenEstados` |
| Inventario | `Inventario.dc.html` | `InventarioFab`, `InventarioEstados`, `ModalCompra`, `ModalCompraEstados`, `ModalAporte`, `ModalAporteEstados` |
| Clientes | — | Pendiente de diseñar |

## Textos propuestos

Los textos marcados como «propuesto» en los artboards todavía no existen en `src/app/shared/ui/mensajes-error.ts` y esperan aprobación:

- Avisos de éxito: «Retiro registrado», «Traspaso registrado», «Copia guardada», «Compra registrada · Lote #N» y «Aporte registrado».
- Estados vacíos: la búsqueda de clientes sin resultados y el mes sin retiros.
- Mensaje de error: «El archivo no es una copia válida de la app».
- Resumen de venta: la fila «Queda debiendo».
