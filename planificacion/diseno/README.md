# Rediseño de vistas

Mockups de referencia para implementar cada vista de la app. Toda vista nueva o rediseñada se construye a partir de estos archivos, con los componentes nativos de Ionic.

- **Lienzo interactivo (privado):** https://claude.ai/artifact/TyjQcXwL9cECDmCa7LbdJC
- **Fuente:** `mockups/*.dc.html`, un archivo por pantalla o estado. `mockups/canvas.json` guarda la disposición del lienzo.

Los `.dc.html` son la fuente del lienzo y no se ven bien abiertos solos en el navegador, porque dependen del entorno del lienzo. Sirven para leer estructura, textos, medidas y colores; para verlos, usa el enlace.

## Estado

| Vista | Estado | Archivos |
|-------|--------|----------|
| Finanzas | Aprobada | `Main.dc.html` |
| Finanzas · modales | Aprobados | `FinRetiro`, `FinRetiroEstados`, `FinHistorial`, `FinHistorialEstados`, `FinTraspaso`, `FinTraspasoEstados`, `FinMes`, `FinRespaldo`, `FinRespaldoEstados` |
| Vender | Entregada | `Vender`, `VenderEstados` |
| Vender · modales | Entregados | `ModalCliente`, `ModalClienteEstados`, `ModalNuevoCliente`, `ModalFecha`, `ModalResumen`, `ModalResumenEstados` |
| Inventario y sus modales | Aprobados | `Inventario`, `InventarioFab`, `InventarioEstados`, `ModalCompra`, `ModalCompraEstados`, `ModalAporte`, `ModalAporteEstados` |
| Clientes | Pendiente | — |

## Sistema visual

**Paleta**

| Uso | Color |
|-----|-------|
| Fondo | `#000000` |
| Tarjetas y hojas | `#0F1012` |
| Superficie interna | `#17181B` |
| Bordes | `#1F2125` |
| Contorno de campos | `#3A3D44` |
| Texto | `#F5F5F5` |
| Texto secundario | `#A1A1AA` |
| Acción principal (verde lima) | `#CBFF3D`, con texto `#0A0A0A` |
| Acción secundaria, foco e íconos (azul celeste) | `#5EC8F2` |
| Hay utilidad | `#34D399` |
| Capital sin recuperar, errores y acciones destructivas | `#FF6B6B` |
| Aviso que no bloquea | `#F5B544` |

**Reglas de color**
- El rojo y el verde quedan reservados para el dinero: rojo mientras el capital no se recupera, verde cuando hay utilidad.
- El stock usa azul celeste.

**Tipografía:** Inter, 400 a 700.

**Componentes**

| Componente | Especificación | En Ionic |
|------------|----------------|----------|
| Campo | Alto 56, radio 12, etiqueta siempre sobre el contorno. Debajo va el texto de ayuda o el error con ícono, nunca los dos a la vez. | `ion-input fill="outline" labelPlacement="stacked"` con `helperText` / `errorText` |
| Modal | Hoja que sube desde abajo, fondo `#0F1012`, radio superior 24, con asa. Cerrar, Cancelar o Listo como botón de texto azul celeste. | `ion-modal` con breakpoints |
| Botón principal | Verde lima, alto 52. Dice la acción y el monto («Guardar compra · $ 720.000»). Al guardar muestra un indicador y se deshabilita. | — |
| Opciones de pocas alternativas | Botones segmentados (tipo de papel, medio y forma de pago). | — |
| Avisos breves | Superficie `#17181B` con ícono verde o rojo. | `ion-toast` |

Cada lista muestra cuatro estados: cargando, con datos, vacío y error con salida. Las reglas 1 a 12 de `CLAUDE.md` se reflejan en los artboards de estados.

## Pendientes para implementar

- **Textos «propuesto»:** los textos marcados así en los artboards no existen todavía en `src/app/shared/ui/mensajes-error.ts` y hay que aprobarlos antes de agregarlos. Son:
  - los avisos de éxito: «Retiro registrado», «Traspaso registrado», «Copia guardada», «Compra registrada · Lote #N» y «Aporte registrado»;
  - los estados vacíos: búsqueda de clientes sin resultados y mes sin retiros;
  - el mensaje de archivo de copia inválido;
  - «Queda debiendo» en el resumen de venta.
- **Barra de progreso del lote:** muestra disponibles / iniciales. La especificación dice `/ 10`, pero desde la decisión A6 un lote puede tener varias cajas, así que está pendiente de revisión.
