-- M9 (auditoría ECC): Centro.id_cliente obligatorio para evitar centros huérfanos
-- que escapan al scoping multi-tenant. Verificado: 0 centros con id_cliente NULL.
ALTER TABLE centros ADD COLUMN IF NOT EXISTS id_cliente INTEGER NOT NULL;
