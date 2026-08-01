-- Supervisores demo de reclutadores: aislamiento por sesión + caducidad 24h
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "session_id" TEXT;
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "expira_en" TIMESTAMP(3);
