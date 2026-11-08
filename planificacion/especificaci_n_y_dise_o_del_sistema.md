# Documento Maestro de Ingeniería de Software: Sistema de Gestión de Papel (Carta y Oficio)

---

## 1. Descripción General del Proyecto
Sistema móvil diseñado para dispositivos **Android** con operación **100% local (Offline-First)** orientado a la administración integral de un negocio de comercialización de papel tamaño Carta y Oficio. El sistema resuelve la compra mayorista por cajas cerradas (10 resmas por caja) con costos variables según el proveedor, la venta al detal por resma cerrada asignando precios personalizados según el lote y el cliente, el control de cuentas por cobrar con abonos en cascada o individuales, y la contabilidad estricta que separa la recuperación del capital invertido de la ganancia libre disponible y el arqueo físico (Efectivo vs. Transferencia).

---

## 2. Reglas de Negocio Fundamentales (RN)

* **RN-01 Conversión de Empaque y Unidad Mínima:** Las compras se realizan exclusivamente por caja cerrada de 10 resmas (Tamaño Carta u Oficio) sin costos adicionales de adquisición. Las ventas se realizan exclusivamente por resma cerrada (números enteros), prohibiendo el fraccionamiento.
* **RN-02 Gestión de Inventario por Lote Independiente:** Cada caja comprada se administra como un lote individual con su propio costo unitario ($\text{Costo de Caja} \div 10$) para manejar cajas superpuestas con precios variables según el proveedor. Al vender, el usuario elige manualmente de qué caja/lote activo salen las resmas y define el precio de venta unitario específico para ese lote y cliente.
* **RN-03 Prioridad Contable en Recaudos (Primero Capital, Luego Ganancia):** En toda venta cobrada de contado o mediante abonos parciales, el dinero que ingresa cubre primero el **Costo Base** de las resmas de esa factura (*Capital Recuperado*). Solo cuando el monto pagado en una factura supera su costo base de adquisición, el excedente se suma a la **Ganancia Libre Disponible**.
* **RN-04 Separación Física de Fondos (Arqueo por Medio de Pago):** Todo ingreso (pago de contado o abono) y toda salida de dinero (compra de cajas o retiro de ganancias) se asocia obligatoriamente a un medio de pago (**Efectivo** o **Transferencia**) para reflejar el saldo real disponible en billetes físicos frente a la cuenta digital.

---

## 3. Especificación de Requisitos del Sistema

### 3.1. Requisitos Funcionales (RF)

#### Módulo 1: Abastecimiento e Inventario por Lotes
* **RF-01 Registro de compra de cajas:** Cuando el usuario adquiera mercancía, el sistema deberá permitir registrar la entrada de cajas seleccionando el tipo de papel (Carta u Oficio), la fecha de compra, la cantidad de cajas, el costo de compra por caja y el medio de pago utilizado (Efectivo, Transferencia o Capital Externo).
* **RF-02 Generación de lote y costeo unitario automático:** Al guardar una compra, el sistema deberá crear un lote activo independiente con un stock inicial de $10 \times N$ resmas enteras y calcular automáticamente el costo unitario por resma dividiendo el costo de la caja entre 10.
* **RF-03 Consulta de inventario por lotes activos:** El sistema deberá mostrar el inventario disponible agrupado por tipo de papel (Carta y Oficio) y desglosado por cada lote/caja activa, indicando la fecha de ingreso, cuántas resmas quedan disponibles de las 10 iniciales y el costo unitario de adquisición de cada lote.
* **RF-04 Cierre automático de lotes:** Cuando el stock de resmas de una caja llegue a 0 tras una venta, el sistema deberá cambiar el estado del lote a *Agotado* y ocultarlo de la lista de selección de ventas activas, conservando su registro para el historial contable.

#### Módulo 2: Directorio y Trazabilidad de Clientes
* **RF-05 Gestión de clientes:** El sistema deberá permitir crear, editar y buscar clientes almacenando su nombre completo y número de teléfono.
* **RF-06 Expediente e historial por cliente:** Al consultar el perfil de un cliente, el sistema deberá mostrar de forma organizada su deuda total actual, el historial detallado de facturas emitidas (indicando fecha, cantidad y tipo de resmas compradas, precio cobrado y estado de pago) y el historial de abonos realizados.

#### Módulo 3: Comercialización y Facturación (Ventas)
* **RF-07 Creación de venta con selección manual de lote:** Al registrar una venta, el sistema deberá permitir asociar un cliente y agregar líneas de detalle seleccionando manualmente el lote/caja activa de origen (Carta u Oficio) y la cantidad de resmas en números enteros (validando que no supere el stock disponible en dicho lote).
* **RF-08 Asignación de precio unitario abierto por lote:** Mientras se agrega un lote a la venta, el sistema deberá mostrar en pantalla el costo unitario base de esa caja y permitir al usuario digitar libremente el precio unitario de venta que le cobrará al cliente para las resmas de ese lote específico.
* **RF-09 Ventas multilote en una misma factura:** Si un pedido requiere tomar resmas de dos cajas distintas con costos diferentes, el sistema deberá permitir incluir ambos lotes como líneas independientes dentro de la misma factura, cada una con su propio precio unitario de venta y cálculo de margen individual.
* **RF-10 Modalidad de pago al cierre de venta:** Al confirmar la venta, el sistema deberá permitir definir si se paga de **Contado** (seleccionando Efectivo o Transferencia), si queda **A Crédito / Fiado** (Saldo pendiente = 100%), o si deja un **Abono Inicial** en el acto (registrando el monto recibido y el medio de pago).

#### Módulo 4: Cartera y Cuentas por Cobrar (Abonos)
* **RF-11 Consolidación de deuda acumulada:** El sistema deberá calcular el saldo total adeudado por cada cliente sumando los saldos pendientes de todas sus facturas en estado *Pendiente* o *Abonada Parcialmente*.
* **RF-12 Abono global con distribución cronológica en cascada:** Cuando un cliente realice un abono general a su deuda total indicando el monto y el medio de pago (Efectivo o Transferencia), el sistema deberá descontar el dinero empezando por la factura pendiente más antigua; si el abono cubre la totalidad de esa factura, la marcará como *Pagada* y aplicará el excedente sucesivamente a las siguientes facturas en orden cronológico ascendente.
* **RF-13 Abono individual dirigido a factura específica:** El sistema deberá permitir al usuario seleccionar una factura pendiente específica del cliente para aplicarle un abono parcial o pago total de manera aislada, sin afectar las demás facturas abiertas.
* **RF-14 Liquidación total en un toque:** El sistema deberá incluir una función rápida para saldar el 100% de la deuda acumulada de un cliente, cerrando todas sus facturas pendientes y registrando el ingreso por el medio de pago seleccionado (Efectivo o Transferencia).
* **RF-15 Registro histórico de abonos:** Por cada abono recibido, el sistema deberá almacenar la fecha, el monto entregado, el medio de pago (Efectivo o Transferencia) y el detalle exacto de a qué factura o facturas se aplicó el descuento.

#### Módulo 5: Control Financiero, Retiros y Arqueo de Caja
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
  5. **Ganancia Retirada y Ganancia Libre Disponible:** Cuánto se ha sacado para uso personal y cuánto queda disponible hoy para retirar sin afectar el capital del negocio.
  6. **Arqueo Físico:** Saldo total disponible en **Efectivo** vs. Saldo total disponible en **Transferencia**.

---

### 3.2. Requisitos No Funcionales (RNF)

* **RNF-01 Plataforma de Ejecución:** El sistema se ejecutará como una aplicación móvil empaquetada para el sistema operativo **Android** mediante **Ionic + Angular + Capacitor**.
* **RNF-02 Arquitectura Offline-First (Persistencia Local):** Todos los datos se almacenarán localmente en el dispositivo mediante una base de datos relacional (**SQLite**), garantizando disponibilidad del 100% sin requerir conexión a internet ni servidores externos.
* **RNF-03 Integridad Transaccional (ACID):** Las operaciones compuestas (como una venta que descuenta stock de varios lotes o un abono en cascada que modifica múltiples facturas y actualiza los bolsillos de efectivo/transferencia) deberán ejecutarse dentro de transacciones atómicas de base de datos; si ocurre un error intermedio, ningún dato parcial se guardará para evitar descuadres contables.
* **RNF-04 Exactitud Numérica y Restricción de Tipos:** El sistema restringirá estrictamente las cantidades de cajas y resmas a números enteros positivos (`INTEGER`), mientras que los valores monetarios (costos, precios, abonos y saldos en pesos) se manejarán como enteros exactos sin errores de redondeo de punto flotante.
* **RNF-05 Usabilidad Operativa en Movilidad:** El flujo para registrar una venta o un abono deberá completarse en un máximo de 3 a 4 toques en pantalla, con controles adaptados para el uso con una sola mano y visualización inmediata del costo del lote al momento de fijar el precio de venta.
* **RNF-06 Respaldo y Portabilidad de Datos (Backup Local):** Para proteger las cuentas ante pérdida o cambio de teléfono, la aplicación deberá permitir exportar e importar una copia de seguridad completa de la base de datos local.

---

## 4. Modelo Relacional de Base de Datos (Esquema SQLite)

El modelo relacional consta de **7 tablas normalizadas** con integridad referencial activada (`PRAGMA foreign_keys = ON;`).

### 4.1. Tabla `lotes_cajas` (Inventario y Abastecimiento)
Representa cada compra de cajas como un lote independiente con su propio costo unitario.
```sql
CREATE TABLE IF NOT EXISTS lotes_cajas (
    id_lote INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo_papel TEXT NOT NULL CHECK(tipo_papel IN ('CARTA', 'OFICIO')),
    fecha_compra TEXT NOT NULL, -- Formato ISO8601: YYYY-MM-DD HH:MM:SS
    cantidad_cajas INTEGER NOT NULL CHECK(cantidad_cajas > 0),
    costo_por_caja INTEGER NOT NULL CHECK(costo_por_caja > 0),
    costo_unitario_resma INTEGER NOT NULL, -- Calculado: costo_por_caja / 10
    resmas_iniciales INTEGER NOT NULL,     -- Calculado: cantidad_cajas * 10
    resmas_disponibles INTEGER NOT NULL CHECK(resmas_disponibles >= 0),
    medio_pago_compra TEXT NOT NULL CHECK(medio_pago_compra IN ('EFECTIVO', 'TRANSFERENCIA', 'CAPITAL_EXTERNO')),
    estado TEXT NOT NULL DEFAULT 'ACTIVO' CHECK(estado IN ('ACTIVO', 'AGOTADO'))
);
```

### 4.2. Tabla `clientes` (Directorio)
Almacena los datos de contacto de los compradores.
```sql
CREATE TABLE IF NOT EXISTS clientes (
    id_cliente INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    telefono TEXT,
    fecha_registro TEXT NOT NULL
);
```

### 4.3. Tabla `ventas` (Cabecera de Factura y Control de Capital/Ganancia)
Guarda el resumen de cada factura. Incluye `costo_total_base` y `monto_pagado` para aplicar la regla **RN-03 (Primero Capital, Luego Ganancia)**:
```sql
CREATE TABLE IF NOT EXISTS ventas (
    id_venta INTEGER PRIMARY KEY AUTOINCREMENT,
    id_cliente INTEGER NOT NULL,
    fecha_venta TEXT NOT NULL,
    total_venta INTEGER NOT NULL CHECK(total_venta > 0),           -- Lo que se le cobra al cliente
    costo_total_base INTEGER NOT NULL CHECK(costo_total_base > 0), -- Suma del costo de las resmas entregadas
    monto_pagado INTEGER NOT NULL DEFAULT 0,                       -- Cuánto ha abonado/pagado hasta hoy
    saldo_pendiente INTEGER NOT NULL,                              -- total_venta - monto_pagado
    estado_pago TEXT NOT NULL CHECK(estado_pago IN ('PAGADA', 'PARCIAL', 'PENDIENTE')),
    FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente)
);
```

### 4.4. Tabla `detalle_ventas` (Líneas por Lote Seleccionado)
Permite que en una misma factura se vendan resmas de distintos lotes con precios unitarios diferenciados.
```sql
CREATE TABLE IF NOT EXISTS detalle_ventas (
    id_detalle INTEGER PRIMARY KEY AUTOINCREMENT,
    id_venta INTEGER NOT NULL,
    id_lote INTEGER NOT NULL,
    cantidad_resmas INTEGER NOT NULL CHECK(cantidad_resmas > 0),
    costo_unitario_lote INTEGER NOT NULL, -- Snapshot del costo de la caja seleccionada
    precio_unitario_venta INTEGER NOT NULL CHECK(precio_unitario_venta > 0),
    subtotal_venta INTEGER NOT NULL,      -- cantidad_resmas * precio_unitario_venta
    subtotal_costo INTEGER NOT NULL,      -- cantidad_resmas * costo_unitario_lote
    FOREIGN KEY (id_venta) REFERENCES ventas(id_venta) ON DELETE CASCADE,
    FOREIGN KEY (id_lote) REFERENCES lotes_cajas(id_lote)
);
```

### 4.5. Tabla `abonos` (Recaudos del Cliente)
Registra cada vez que el cliente entrega dinero (pago de contado, abono global en cascada, abono a factura individual o liquidación total).
```sql
CREATE TABLE IF NOT EXISTS abonos (
    id_abono INTEGER PRIMARY KEY AUTOINCREMENT,
    id_cliente INTEGER NOT NULL,
    fecha_abono TEXT NOT NULL,
    monto_total_abonado INTEGER NOT NULL CHECK(monto_total_abonado > 0),
    medio_pago TEXT NOT NULL CHECK(medio_pago IN ('EFECTIVO', 'TRANSFERENCIA')),
    tipo_abono TEXT NOT NULL CHECK(tipo_abono IN ('PAGO_CONTADO', 'CASCADA_GLOBAL', 'FACTURA_INDIVIDUAL', 'LIQUIDACION_TOTAL')),
    FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente)
);
```

### 4.6. Tabla `abonos_detalle_facturas` (Trazabilidad de la Cascada)
Conecta un abono con las facturas específicas que pagó y cuánto dinero exacto se aplicó a cada una.
```sql
CREATE TABLE IF NOT EXISTS abonos_detalle_facturas (
    id_abono_detalle INTEGER PRIMARY KEY AUTOINCREMENT,
    id_abono INTEGER NOT NULL,
    id_venta INTEGER NOT NULL,
    monto_aplicado INTEGER NOT NULL CHECK(monto_aplicado > 0),
    FOREIGN KEY (id_abono) REFERENCES abonos(id_abono) ON DELETE CASCADE,
    FOREIGN KEY (id_venta) REFERENCES ventas(id_venta)
);
```

### 4.7. Tabla `retiros_y_movimientos` (Retiros de Ganancia y Arqueo Físico)
Registra los retiros personales de ganancia y las transferencias internas entre los bolsillos de Efectivo y Transferencia.
```sql
CREATE TABLE IF NOT EXISTS retiros_y_movimientos (
    id_movimiento INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha_movimiento TEXT NOT NULL,
    tipo_movimiento TEXT NOT NULL CHECK(tipo_movimiento IN ('RETIRO_GANANCIA', 'TRASPASO_EFECTIVO_A_TRANSF', 'TRASPASO_TRANSF_A_EFECTIVO')),
    monto INTEGER NOT NULL CHECK(monto > 0),
    medio_afectado TEXT NOT NULL CHECK(medio_afectado IN ('EFECTIVO', 'TRANSFERENCIA', 'AMBOS')),
    nota TEXT
);
```

### 4.8. Fórmulas Contables del Modelo
* **Capital Recuperado por Factura:**
  $$\text{Capital Recuperado} = \min(\text{monto\_pagado}, \text{costo\_total\_base})$$
* **Ganancia Generada por Factura:**
  $$\text{Ganancia Factura} = \max(0, \text{monto\_pagado} - \text{costo\_total\_base})$$
* **Ganancia Libre Disponible para Retirar:**
  $$\text{Ganancia Disponible} = \sum \max(0, \text{ventas.monto\_pagado} - \text{ventas.costo\_total\_base}) - \sum \text{retiros\_ganancia}$$
* **Saldo Físico en Efectivo:**
  $$\text{Efectivo} = (\text{Abonos Efectivo} + \text{Traspasos hacia Efectivo}) - (\text{Compras Cajas en Efectivo} + \text{Retiros Efectivo} + \text{Traspasos desde Efectivo})$$
* **Saldo Físico en Transferencia:**
  $$\text{Transferencia} = (\text{Abonos Transferencia} + \text{Traspasos hacia Transferencia}) - (\text{Compras Cajas en Transferencia} + \text{Retiros Transferencia} + \text{Traspasos desde Transferencia})$$

---

## 5. Stack Tecnológico y Arquitectura del Software

### 5.1. Stack Tecnológico Seleccionado
* **Framework Frontend y UI:** **Ionic Framework (v8+)** con **Angular (v18+)** utilizando **Standalone Components** y **Angular Signals** para reactividad inmediata en pantalla.
* **Lenguaje Base:** **TypeScript** con tipado estricto (`strict: true`), manejando cantidades y valores monetarios en pesos colombianos (COP) como números enteros (`number` validado sin decimales).
* **Runtime Nativo Android:** **Capacitor**, encargado de empaquetar la aplicación web en un binario nativo `.apk` / `.aab` para Android.
* **Motor de Base de Datos Local:** **`@capacitor-community/sqlite`**, comunicando los servicios de Angular directamente con SQLite nativo de Android bajo transacciones seguras.

### 5.2. Estructura Modular por Capas en Angular
```text
src/app/
├── core/
│   ├── database/
│   │   ├── database.service.ts      # Inicializa SQLite, crea las 7 tablas y maneja transacciones
│   │   └── schema.sql.ts            # Script DDL con las tablas (lotes_cajas, ventas, abonos, etc.)
│   └── models/                      # Interfaces TypeScript (LoteCaja, Cliente, Venta, Abono, etc.)
├── services/
│   ├── inventario.service.ts        # Lógica de compra de cajas (x10 resmas) y control de lotes activos
│   ├── clientes.service.ts          # Directorio, historial de compras y consolidación de deuda
│   ├── ventas.service.ts            # Registro de facturas multilote y precio manual por lote
│   ├── cartera.service.ts           # Algoritmo de abonos en cascada, abono individual y pago total
│   └── finanzas.service.ts          # Cálculo de Capital vs. Ganancia Libre, retiros y Efectivo/Transferencia
└── pages/
    ├── tabs/                        # Barra de navegación inferior (4 pestañas principales)
    ├── dashboard/                   # Cuentas claras, arqueo Efectivo/Transf y botón de Retiros
    ├── inventario/                  # Tarjetas de Cajas Carta/Oficio activas y botón de Nueva Compra
    ├── nueva-venta/                 # Punto de venta rápido con selector de lote y precio unitario
    └── clientes/                    # Lista de clientes, perfil detallado y modal de Abonos
```

### 5.3. Diseño de Navegación y Experiencia de Usuario (UI/UX)
Estructura basada en **`ion-tabs`** (barra de navegación inferior con 4 vistas principales):
1. **Pestaña 1: Finanzas (Dashboard Principal):** Tarjetas de *Ganancia Libre Disponible* (con acceso al modal de Retiros) y *Capital Recuperado*, bloque de arqueo físico (*Efectivo* vs. *Transferencia* con botón de traspaso interno) y resumen de *Capital en Inventario* y *Cuentas por Cobrar*.
2. **Pestaña 2: Vender (POS Rápido):** Selección de cliente, selección manual de lote activo (mostrando resmas restantes y costo base unitario), ingreso de cantidad y precio de venta unitario con cálculo de ganancia en vivo, y cierre de venta (*Contado*, *Fiado* o *Abono Inicial* por Efectivo o Transferencia).
3. **Pestaña 3: Inventario (Lotes y Compras):** Filtros por *Carta* y *Oficio*, tarjetas de lotes activos con barra de progreso (`resmas_disponibles / 10`) y botón flotante (`ion-fab`) para registrar compras de cajas nuevas.
4. **Pestaña 4: Clientes y Cartera (Abonos):** Directorio de clientes con indicador visual de deuda pendiente, expediente histórico de compras/pagos y modal de registro de abonos (*Cascada al monto total*, *Factura individual* o *Liquidar todo*).

---

## 6. Plan de Implementación Paso a Paso

* **Etapa 1: Configuración del Proyecto y Capa de Base de Datos (`DatabaseService` + Modelos):**
  Comandos de inicialización del proyecto Ionic + Angular + Capacitor, instalación de `@capacitor-community/sqlite`, creación de las interfaces TypeScript y servicio de base de datos con creación automática de las 7 tablas.
* **Etapa 2: Módulo de Abastecimiento e Inventario:**
  Implementación de `InventarioService` y la pantalla de Inventario para registrar compras de cajas, convertir automáticamente a múltiplos de 10 resmas, calcular el costo unitario y listar los lotes activos.
* **Etapa 3: Módulo de Clientes y Punto de Venta (Multilote):**
  Implementación de `ClientesService`, `VentasService` y la pantalla de Nueva Venta permitiendo seleccionar el cliente, elegir manualmente de qué caja salen las resmas, definir el precio unitario de venta y registrar el pago de contado, fiado o abono inicial.
* **Etapa 4: Motor de Cartera (Abonos en Cascada e Individuales):**
  Implementación de `CarteraService` con el algoritmo transaccional de distribución cronológica en cascada (de la factura más antigua a la más reciente), abono a factura específica, liquidación total y vista de expediente del cliente.
* **Etapa 5: Motor Financiero, Retiros y Arqueo Físico:**
  Implementación de `FinanzasService` y el Dashboard Principal con el cálculo de *Primero Capital, Luego Ganancia*, validación y registro de retiros de utilidad, separación de bolsillos (*Efectivo* vs. *Transferencia*) y módulo de respaldo local.