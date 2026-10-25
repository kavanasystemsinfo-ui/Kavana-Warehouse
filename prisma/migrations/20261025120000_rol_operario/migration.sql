-- Rol 'limpiador' -> 'operario': el producto pasa del sector limpieza a planta industrial.
-- Idempotente y no destructivo: solo cambia el valor del rol y el valor por defecto.
UPDATE "usuarios" SET "rol" = 'operario' WHERE "rol" = 'limpiador';
ALTER TABLE "usuarios" ALTER COLUMN "rol" SET DEFAULT 'operario';
