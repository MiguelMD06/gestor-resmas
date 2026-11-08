La especificación consolidada de **Requisitos Funcionales (RF)** y **Requisitos No Funcionales (RNF)** estructura de extremo a extremo las reglas operativas, contables y técnicas de tu aplicación Android para la comercialización de resmas de papel.

## 1. Reglas de Negocio Fundamentales (RN)

* **RN-01 Conversión de Empaque y Unidad Mínima:** Las compras se realizan exclusivamente por caja cerrada de 10 resmas (Tamaño Carta u Oficio) sin costos adicionales de adquisición. Las ventas se realizan exclusivamente por resma cerrada (números enteros), prohibiendo el fraccionamiento.


* **RN-02 Gestión de Inventario por Lote Independiente:** Cada caja comprada se administra como un lote individual con su propio costo unitario ($\text{Costo de Caja} \div 10$) para manejar cajas superpuestas con precios variables según el proveedor. Al vender, el usuario elige manualmente de qué caja/lote activo salen las resmas y define el precio de venta unitario específico para ese lote y cliente.


* **RN-03 Prioridad Contable en Recaudos (Primero Capital, Luego Ganancia):** En toda venta cobrada de contado o mediante abonos parciales, el dinero que ingresa cubre primero el **Costo Base** de las resmas de esa factura (*Capital Recuperado*). Solo cuando el monto pagado en una factura supera su costo base de adquisición, el excedente se suma a la **Ganancia Libre Disponible**.


* **RN-04 Separación Física de Fondos (Arqueo por Medio de Pago):** Todo ingreso (pago de contado o abono) y toda salida de dinero (compra de cajas o retiro de ganancias) se asocia obligatoriamente a un medio de pago (**Efectivo** o **Transferencia**) para reflejar el saldo real disponible en billetes físicos frente a la cuenta digital.



---

## 2. Requisitos Funcionales (RF)

### Módulo 1: Abastecimiento e Inventario por Lotes

* **RF-01 Registro de compra de cajas:** Cuando el usuario adquiera mercancía, el sistema deberá permitir registrar la entrada de cajas seleccionando el tipo de papel (Carta u Oficio), la fecha de compra, la cantidad de cajas, el costo de compra por caja y el medio de pago utilizado (Efectivo o Transferencia) si se descuenta de los fondos del negocio.


* **RF-02 Generación de lote y costeo unitario automático:** Al guardar una compra, el sistema deberá crear un lote activo independiente con un stock inicial de $10 \times N$ resmas enteras y calcular automáticamente el costo unitario por resma dividiendo el costo de la caja entre 10.


* **RF-03 Consulta de inventario por lotes activos:** El sistema deberá mostrar el inventario disponible agrupado por tipo de papel (Carta y Oficio) y desglosado por cada lote/caja activa, indicando la fecha de ingreso, cuántas resmas quedan disponibles de las 10 iniciales y el costo unitario de adquisición de cada lote.


* **RF-04 Cierre automático de lotes:** Cuando el stock de resmas de una caja llegue a 0 tras una venta, el sistema deberá cambiar el estado del lote a *Agotado* y ocultarlo de la lista de selección de ventas activas, conservando su registro para el historial contable.

### Módulo 2: Directorio y Trazabilidad de Clientes

* **RF-05 Gestión de clientes:** El sistema deberá permitir crear, editar y buscar clientes almacenando su nombre completo y número de teléfono.


* **RF-06 Expediente e historial por cliente:** Al consultar el perfil de un cliente, el sistema deberá mostrar de forma organizada su deuda total actual, el historial detallado de facturas emitidas (indicando fecha, cantidad y tipo de resmas compradas, precio cobrado y estado de pago) y el historial de abonos realizados.



### Módulo 3: Comercialización y Facturación (Ventas)

* **RF-07 Creación de venta con selección manual de lote:** Al registrar una venta, el sistema deberá permitir asociar un cliente y agregar líneas de detalle seleccionando manualmente el lote/caja activa de origen (Carta u Oficio) y la cantidad de resmas en números enteros (validando que no supere el stock disponible en dicho lote).


* **RF-08 Asignación de precio unitario abierto por lote:** Mientras se agrega un lote a la venta, el sistema deberá mostrar en pantalla el costo unitario base de esa caja y permitir al usuario digitar libremente el precio unitario de venta que le cobrará al cliente para las resmas de ese lote específico.


* **RF-09 Ventas multilote en una misma factura:** Si un pedido requiere tomar resmas de dos cajas distintas con costos diferentes, el sistema deberá permitir incluir ambos lotes como líneas independientes dentro de la misma factura, cada una con su propio precio unitario de venta y cálculo de margen individual.


* **RF-10 Modalidad de pago al cierre de venta:** Al confirmar la venta, el sistema deberá permitir definir si se paga de **Contado** (seleccionando Efectivo o Transferencia), si queda **A Crédito / Fiado** (Saldo pendiente = 100%), o si deja un **Abono Inicial** en el acto (registrando el monto recibido y el medio de pago).



### Módulo 4: Cartera y Cuentas por Cobrar (Abonos)

* **RF-11 Consolidación de deuda acumulada:** El sistema deberá calcular el saldo total adeudado por cada cliente sumando los saldos pendientes de todas sus facturas en estado *Pendiente* o *Abonada Parcialmente*.


* **RF-12 Abono global con distribución cronológica en cascada:** Cuando un cliente realice un abono general a su deuda total indicando el monto y el medio de pago (Efectivo o Transferencia), el sistema deberá descontar el dinero empezando por la factura pendiente más antigua; si el abono cubre la totalidad de esa factura, la marcará como *Pagada* y aplicará el excedente sucesivamente a las siguientes facturas en orden cronológico ascendente.


* **RF-13 Abono individual dirigido a factura específica:** El sistema deberá permitir al usuario seleccionar una factura pendiente específica del cliente para aplicarle un abono parcial o pago total de manera aislada, sin afectar las demás facturas abiertas.


* **RF-14 Liquidación total en un toque:** El sistema deberá incluir una función rápida para saldar el 100% de la deuda acumulada de un cliente, cerrando todas sus facturas pendientes y registrando el ingreso por el medio de pago seleccionado (Efectivo o Transferencia).


* **RF-15 Registro histórico de abonos:** Por cada abono recibido, el sistema deberá almacenar la fecha, el monto entregado, el medio de pago (Efectivo o Transferencia) y el detalle exacto de a qué factura o facturas se aplicó el descuento.



### Módulo 5: Control Financiero, Retiros y Arqueo de Caja

* **RF-16 Cálculo de retorno de capital vs. ganancia libre:** En cada cobro o abono registrado, el sistema deberá asignar internamente el ingreso a cubrir primero el costo de compra de las resmas de la factura afectada (*Capital Recuperado*); todo monto cobrado que exceda dicho costo base se sumará a la bolsa de *Ganancia Libre Disponible*.


* **RF-17 Registro de retiros de ganancia con validación de saldo:** El sistema deberá permitir al usuario registrar retiros parciales o totales de sus utilidades ingresando fecha, monto, medio de extracción (Efectivo o Transferencia) y una nota opcional, bloqueando cualquier intento de retiro que supere el monto de la *Ganancia Libre Disponible* o el saldo disponible en ese medio físico.
* **RF-18 Historial de retiros:** El sistema deberá mostrar un listado cronológico (filtrable por mes) con todos los retiros de ganancia efectuados para evitar dobles retiros o confusiones sobre el dinero ya tomado.
* **RF-19 Separación física de dinero (Bolsillos Efectivo vs. Transferencia):** El sistema deberá llevar el conteo exacto y mostrar por separado cuánto dinero real del negocio (sumando Capital Recuperado + Ganancia Libre Disponible) se encuentra físicamente en **Efectivo** y cuánto en **Transferencia**, sumando los cobros recibidos por cada medio y restando los retiros o recompras pagadas desde cada medio.


* **RF-20 Transferencia interna entre medios (Cambio de Efectivo a Transferencia o viceversa):** Si el usuario deposita efectivo del negocio en su cuenta bancaria o retira dinero en cajero, el sistema deberá permitir registrar un traspaso interno entre los bolsillos de *Efectivo* y *Transferencia* sin alterar las métricas de capital ni de ganancia.
* **RF-21 Dashboard financiero consolidado:** La pantalla principal financiera deberá presentar de forma clara:


1. **Capital en Inventario Físico:** Valor al costo de las resmas actuales en stock sin vender.


2. **Capital Recuperado en Caja (Intocable):** Dinero ya cobrado destinado exclusivamente a reponer cajas de papel.


3. **Cuentas por Cobrar (En la calle):** Dinero total pendiente en manos de clientes (desglosando cuánto de eso es capital por recuperar y cuánto ganancia futura).


4. **Ganancia Histórica Generada:** Total de utilidad producida por las ventas ya cobradas (total y mensual).


5. Ganancia Retirada y Ganancia Libre Disponible:Cuánto se ha sacado para uso personal y cuánto queda disponible hoy para retirar sin afectar el capital del negocio.
6. **Arqueo Físico:** Saldo total disponible en **Efectivo** vs. Saldo total disponible en **Transferencia**.





---

## 3. Requisitos No Funcionales (RNF)

* **RNF-01 Plataforma de Ejecución:** El sistema se desarrollará como una aplicación móvil nativa para el sistema operativo **Android**.


* **RNF-02 Arquitectura Offline-First (Persistencia Local):** Todos los datos se almacenarán localmente en el dispositivo mediante una base de datos relacional (**SQLite**), garantizando disponibilidad del 100% sin requerir conexión a internet ni servidores externos.
* **RNF-03 Integridad Transaccional (ACID):** Las operaciones compuestas (como una venta que descuenta stock de varios lotes o un abono en cascada que modifica múltiples facturas y actualiza los bolsillos de efectivo/transferencia) deberán ejecutarse dentro de transacciones atómicas de base de datos; si ocurre un error intermedio, ningún dato parcial se guardará para evitar descuadres contables.
* **RNF-04 Exactitud Numérica y Restricción de Tipos:** El sistema restringirá estrictamente las cantidades de cajas y resmas a números enteros positivos (`INTEGER`), mientras que los valores monetarios (costos, precios, abonos y saldos en pesos) se manejarán sin errores de redondeo de punto flotante.


* **RNF-05 Usabilidad Operativa en Movilidad:** El flujo para registrar una venta o un abono deberá completarse en un máximo de 3 a 4 toques en pantalla, con controles adaptados para el uso con una sola mano y visualización inmediata del costo del lote al momento de fijar el precio de venta.
* **RNF-06 Respaldo y Portabilidad de Datos (Backup Local):** Para proteger las cuentas ante pérdida o cambio de teléfono, la aplicación deberá permitir exportar e importar una copia de seguridad completa de la base de datos local (en archivo local o compartible por el usuario).

