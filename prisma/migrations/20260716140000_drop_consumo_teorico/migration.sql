-- M15 (auditoría ECC): ConsumoTeorico es código muerto (el modelo de mermas
-- usa RegistroMovimiento + stock_fisico). Se elimina la tabla.
DROP TABLE IF EXISTS consumo_teorico;
