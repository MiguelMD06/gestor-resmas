// Prototype of schema v1 (corrected per decisions A1-A7). Not production code.
export const SCHEMA_V1 = `
CREATE TABLE clientes (
  id_cliente INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL CHECK (length(trim(nombre)) > 0),
  telefono TEXT,
  es_mostrador INTEGER NOT NULL DEFAULT 0 CHECK (es_mostrador IN (0, 1)),
  fecha_registro TEXT NOT NULL
);
CREATE UNIQUE INDEX ux_clientes_mostrador ON clientes (es_mostrador) WHERE es_mostrador = 1;

CREATE TABLE lotes_cajas (
  id_lote INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo_papel TEXT NOT NULL CHECK (tipo_papel IN ('CARTA', 'OFICIO')),
  fecha_compra TEXT NOT NULL,
  cantidad_cajas INTEGER NOT NULL CHECK (typeof(cantidad_cajas) = 'integer' AND cantidad_cajas > 0),
  costo_por_caja INTEGER NOT NULL CHECK (typeof(costo_por_caja) = 'integer' AND costo_por_caja > 0 AND costo_por_caja % 10 = 0),
  costo_unitario_resma INTEGER NOT NULL CHECK (costo_unitario_resma * 10 = costo_por_caja),
  resmas_iniciales INTEGER NOT NULL CHECK (resmas_iniciales = cantidad_cajas * 10),
  resmas_disponibles INTEGER NOT NULL CHECK (typeof(resmas_disponibles) = 'integer' AND resmas_disponibles BETWEEN 0 AND resmas_iniciales),
  medio_pago_compra TEXT NOT NULL CHECK (medio_pago_compra IN ('EFECTIVO', 'TRANSFERENCIA')),
  estado TEXT NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'AGOTADO')),
  CHECK ((estado = 'AGOTADO') = (resmas_disponibles = 0))
);

CREATE TABLE ventas (
  id_venta INTEGER PRIMARY KEY AUTOINCREMENT,
  id_cliente INTEGER NOT NULL REFERENCES clientes (id_cliente),
  fecha_venta TEXT NOT NULL,
  total_venta INTEGER NOT NULL CHECK (typeof(total_venta) = 'integer' AND total_venta > 0),
  costo_total_base INTEGER NOT NULL CHECK (typeof(costo_total_base) = 'integer' AND costo_total_base > 0),
  monto_pagado INTEGER NOT NULL DEFAULT 0 CHECK (typeof(monto_pagado) = 'integer' AND monto_pagado BETWEEN 0 AND total_venta),
  saldo_pendiente INTEGER NOT NULL CHECK (saldo_pendiente = total_venta - monto_pagado),
  estado_pago TEXT NOT NULL CHECK (estado_pago IN ('PAGADA', 'PARCIAL', 'PENDIENTE')),
  CHECK ((estado_pago = 'PENDIENTE') = (monto_pagado = 0)),
  CHECK ((estado_pago = 'PAGADA') = (saldo_pendiente = 0))
);
CREATE INDEX ix_ventas_cartera ON ventas (id_cliente, fecha_venta, id_venta) WHERE saldo_pendiente > 0;

CREATE TABLE detalle_ventas (
  id_detalle INTEGER PRIMARY KEY AUTOINCREMENT,
  id_venta INTEGER NOT NULL REFERENCES ventas (id_venta),
  id_lote INTEGER NOT NULL REFERENCES lotes_cajas (id_lote),
  cantidad_resmas INTEGER NOT NULL CHECK (typeof(cantidad_resmas) = 'integer' AND cantidad_resmas > 0),
  costo_unitario_lote INTEGER NOT NULL CHECK (costo_unitario_lote > 0),
  precio_unitario_venta INTEGER NOT NULL CHECK (typeof(precio_unitario_venta) = 'integer' AND precio_unitario_venta > 0),
  subtotal_venta INTEGER NOT NULL CHECK (subtotal_venta = cantidad_resmas * precio_unitario_venta),
  subtotal_costo INTEGER NOT NULL CHECK (subtotal_costo = cantidad_resmas * costo_unitario_lote)
);

CREATE TABLE abonos (
  id_abono INTEGER PRIMARY KEY AUTOINCREMENT,
  id_cliente INTEGER NOT NULL REFERENCES clientes (id_cliente),
  fecha_abono TEXT NOT NULL,
  monto_total_abonado INTEGER NOT NULL CHECK (typeof(monto_total_abonado) = 'integer' AND monto_total_abonado > 0),
  medio_pago TEXT NOT NULL CHECK (medio_pago IN ('EFECTIVO', 'TRANSFERENCIA')),
  tipo_abono TEXT NOT NULL CHECK (tipo_abono IN ('PAGO_CONTADO', 'ABONO_INICIAL', 'CASCADA_GLOBAL', 'FACTURA_INDIVIDUAL', 'LIQUIDACION_TOTAL'))
);

CREATE TABLE abonos_detalle_facturas (
  id_abono_detalle INTEGER PRIMARY KEY AUTOINCREMENT,
  id_abono INTEGER NOT NULL REFERENCES abonos (id_abono),
  id_venta INTEGER NOT NULL REFERENCES ventas (id_venta),
  monto_aplicado INTEGER NOT NULL CHECK (monto_aplicado > 0),
  capital_aplicado INTEGER NOT NULL CHECK (capital_aplicado >= 0),
  ganancia_aplicada INTEGER NOT NULL CHECK (ganancia_aplicada >= 0),
  CHECK (capital_aplicado + ganancia_aplicada = monto_aplicado),
  UNIQUE (id_abono, id_venta)
);

CREATE TABLE movimientos_dinero (
  id_movimiento INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha_movimiento TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('APORTE_CAPITAL', 'COMPRA_LOTE', 'COBRO', 'RETIRO_GANANCIA', 'TRASPASO_SALIDA', 'TRASPASO_ENTRADA')),
  medio TEXT NOT NULL CHECK (medio IN ('EFECTIVO', 'TRANSFERENCIA')),
  delta_bolsillo INTEGER NOT NULL CHECK (typeof(delta_bolsillo) = 'integer' AND delta_bolsillo <> 0),
  delta_capital INTEGER NOT NULL CHECK (typeof(delta_capital) = 'integer'),
  delta_ganancia INTEGER NOT NULL CHECK (typeof(delta_ganancia) = 'integer'),
  id_lote INTEGER REFERENCES lotes_cajas (id_lote),
  id_abono INTEGER REFERENCES abonos (id_abono),
  id_movimiento_origen INTEGER REFERENCES movimientos_dinero (id_movimiento),
  nota TEXT,
  CHECK (
    (tipo = 'APORTE_CAPITAL' AND delta_bolsillo > 0 AND delta_capital = delta_bolsillo AND delta_ganancia = 0
      AND id_lote IS NULL AND id_abono IS NULL AND id_movimiento_origen IS NULL)
    OR (tipo = 'COMPRA_LOTE' AND delta_bolsillo < 0 AND delta_capital <= 0 AND delta_ganancia <= 0
      AND delta_capital + delta_ganancia = delta_bolsillo
      AND id_lote IS NOT NULL AND id_abono IS NULL AND id_movimiento_origen IS NULL)
    OR (tipo = 'COBRO' AND delta_bolsillo > 0 AND delta_capital >= 0 AND delta_ganancia >= 0
      AND delta_capital + delta_ganancia = delta_bolsillo
      AND id_abono IS NOT NULL AND id_lote IS NULL AND id_movimiento_origen IS NULL)
    OR (tipo = 'RETIRO_GANANCIA' AND delta_bolsillo < 0 AND delta_capital = 0 AND delta_ganancia = delta_bolsillo
      AND id_lote IS NULL AND id_abono IS NULL AND id_movimiento_origen IS NULL)
    OR (tipo = 'TRASPASO_SALIDA' AND delta_bolsillo < 0 AND delta_capital = 0 AND delta_ganancia = 0
      AND id_lote IS NULL AND id_abono IS NULL AND id_movimiento_origen IS NULL)
    OR (tipo = 'TRASPASO_ENTRADA' AND delta_bolsillo > 0 AND delta_capital = 0 AND delta_ganancia = 0
      AND id_lote IS NULL AND id_abono IS NULL AND id_movimiento_origen IS NOT NULL)
  )
);
CREATE UNIQUE INDEX ux_mov_compra_lote ON movimientos_dinero (id_lote) WHERE tipo = 'COMPRA_LOTE';
CREATE UNIQUE INDEX ux_mov_cobro_abono ON movimientos_dinero (id_abono) WHERE tipo = 'COBRO';
CREATE UNIQUE INDEX ux_mov_traspaso_par ON movimientos_dinero (id_movimiento_origen) WHERE id_movimiento_origen IS NOT NULL;
`;
