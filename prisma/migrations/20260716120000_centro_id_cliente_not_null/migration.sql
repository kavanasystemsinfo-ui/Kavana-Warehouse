-- M9 (auditoría ECC): Centro.id_cliente obligatorio para evitar centros huérfanos
-- que escapan al scoping multi-tenant. Verificado: 0 centros con id_cliente NULL.
ALTER TABLE centros ADD COLUMN IF NOT EXISTS id_cliente INTEGER;
UPDATE centros SET id_cliente = (SELECT MIN(id_cliente) FROM clientes) WHERE id_cliente IS NULL;
ALTER TABLE centros ALTER COLUMN id_cliente SET NOT NULL;
