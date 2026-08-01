-- Agrega el campo 'tipo' a registro_movimientos para distinguir
-- movimientos automaticos de recuentos fisicos del responsable de centro.
ALTER TABLE registro_movimientos ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) NOT NULL DEFAULT 'movimiento';

COMMENT ON COLUMN registro_movimientos.tipo IS 'movimiento = consumo/reposicion automatica; recuento = recuento fisico del responsable de centro';
