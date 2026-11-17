# Sistema de diseño de la interfaz

Reglas visuales comunes a todas las pantallas. Salen de los mockups aprobados por Miguel el 2026-11-16 en el canvas de diseño (`https://claude.ai/artifact/TyjQcXwL9cECDmCa7LbdJC`). Las etapas 3B, 4 y 5 las aplican: la 3B rehace las pantallas que ya existen y las etapas 4 y 5 diseñan las que faltan con este mismo sistema.

## Estado de los mockups

| Vista | Estado |
|-------|--------|
| Finanzas (dashboard) y sus 5 modales | ✅ aprobada |
| Inventario, botón flotante abierto, estados de la vista y modales de compra y aporte | ✅ aprobada |
| Vender, estados de los campos y sus 4 modales | presentada, sin objeciones |
| Clientes: directorio, indicador de deuda, expediente, estados y modal de abonos con su resumen | ✅ aprobada (2026-11-17) |

Los textos marcados como "propuesto" en los mockups esperan la aprobación de Miguel. Si un mockup ignoró una regla del plan, se corrige el mockup antes de implementarlo.

## Reglas

1. **Solo componentes de Ionic**, sin librerías de interfaz adicionales. Aspecto minimalista, elegante y consistente en toda la app.
2. **Paleta:** fondo negro (`#000`), tarjetas `#0F1012`, verde lima `#CBFF3D` para la acción principal y celeste `#5EC8F2` para las acciones secundarias.
3. **Rojo y verde quedan reservados para el dinero:** rojo (`#FF6B6B`) mientras el capital recuperado está por debajo de lo invertido, y verde (`#34D399`) cuando hay ganancia.
4. **Series de gráficos:** `#2E9FD6`, `#B07F1F` y `#9B7BEA`, validadas para modo oscuro. El lima no se usa como serie porque es demasiado claro.
5. **Tipografía:** Inter.
6. **Controles:** segmentos (`ion-segment`) en lugar de `ion-select`. Las barras de stock son celestes.
7. **Progreso de un lote:** `resmas_disponibles / resmas_iniciales` (A6), nunca "/10".
8. **Solo lo que el plan define o lo que se puede calcular** con el modelo actual. Quedaron fuera la recuperación de capital por lote (R-01 reparte por factura, no por lote) y los días promedio de cobro (el modelo no tiene vencimientos).

## Pantallas aprobadas

- **Finanzas**, de arriba a abajo:
  - ganancia libre, con el botón **Retirar** y el enlace al historial de retiros (RF-18);
  - capital recuperado, en rojo o verde;
  - "¿Dónde está tu capital?", una barra apilada con efectivo, inventario y lo que deben los clientes;
  - ganancia por mes, con 6 barras y el promedio mensual;
  - arqueo por bolsillo, con el botón de traspaso;
  - tarjetas con el capital en inventario, las cuentas por cobrar (capital y ganancia), la ganancia histórica, la ganancia retirada (con la reinvertida), el margen de ventas del mes y la pérdida por ventas bajo costo.
- **Inventario:** avisos propuestos "Compra registrada · Lote #N" y "Aporte registrado". Sin "Capital Externo" (A2).
- **Clientes:**
  - directorio con el total por cobrar, buscador, filtro "Todos / Con deuda" y la deuda de cada cliente en rojo, o "Al día" en gris. Mostrador no aparece porque nunca tiene deuda (R-09);
  - expediente con la deuda total (capital por recuperar y ganancia por cobrar), los botones **Registrar abono** y **Pagar todo**, y las pestañas Facturas y Abonos (RF-06, RF-15). Las facturas van de la más nueva a la más antigua;
  - estado de factura: Pendiente en rojo, Abonada parcialmente en celeste y Pagada en verde (`#34D399`);
  - medio de pago: Efectivo en verde billete (`#8FCB6B`) y Transferencia en violeta (`#B49CF0`), cada uno con su ícono;
  - modal de abono con tres modos: "A la deuda" en cascada de la factura más antigua a la más nueva (RF-12, R-02), "A una factura" (RF-13) y "Pagar todo" (RF-14). Lleva un resumen antes de guardar (R-15) y no acepta fecha futura (R-13);
  - "Editar" reutiliza el modal de nuevo cliente con el título "Editar cliente".
