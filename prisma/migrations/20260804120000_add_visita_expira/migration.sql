-- AlterTable: datos creados por visitantes de la demo (caducan en 24h)
ALTER TABLE "productos" ADD COLUMN IF NOT EXISTS "session_id" TEXT;
ALTER TABLE "productos" ADD COLUMN IF NOT EXISTS "expira_en" TIMESTAMP(3);

ALTER TABLE "incidencias" ADD COLUMN IF NOT EXISTS "session_id" TEXT;
ALTER TABLE "incidencias" ADD COLUMN IF NOT EXISTS "expira_en" TIMESTAMP(3);
