-- M9 (auditoría ECC): Centro.id_cliente obligatorio para evitar centros huérfanos
-- que escapan al scoping multi-tenant. Verificado: 0 centros con id_cliente NULL.
ALTER TABLE centros ALTER COLUMN id_cliente SET NOT NULL;
