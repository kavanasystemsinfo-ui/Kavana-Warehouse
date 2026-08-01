-- M10 (auditoría ECC): FKs de RegistroMovimiento e InventarioCentro sin onDelete
-- causaban error al borrar centro con movimientos/inventario. Se añade CASCADE
-- para consistencia con el resto del schema (Incidencia, AsignacionPersonal).
ALTER TABLE registro_movimientos DROP CONSTRAINT registro_movimientos_id_usuario_fkey;
ALTER TABLE registro_movimientos ADD CONSTRAINT registro_movimientos_id_usuario_fkey
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE;
ALTER TABLE registro_movimientos DROP CONSTRAINT registro_movimientos_id_centro_fkey;
ALTER TABLE registro_movimientos ADD CONSTRAINT registro_movimientos_id_centro_fkey
  FOREIGN KEY (id_centro) REFERENCES centros(id_centro) ON DELETE CASCADE;
ALTER TABLE registro_movimientos DROP CONSTRAINT registro_movimientos_id_producto_fkey;
ALTER TABLE registro_movimientos ADD CONSTRAINT registro_movimientos_id_producto_fkey
  FOREIGN KEY (id_producto) REFERENCES productos(id_producto) ON DELETE CASCADE;

ALTER TABLE inventario_centros DROP CONSTRAINT inventario_centros_id_centro_fkey;
ALTER TABLE inventario_centros ADD CONSTRAINT inventario_centros_id_centro_fkey
  FOREIGN KEY (id_centro) REFERENCES centros(id_centro) ON DELETE CASCADE;
ALTER TABLE inventario_centros DROP CONSTRAINT inventario_centros_id_producto_fkey;
ALTER TABLE inventario_centros ADD CONSTRAINT inventario_centros_id_producto_fkey
  FOREIGN KEY (id_producto) REFERENCES productos(id_producto) ON DELETE CASCADE;
