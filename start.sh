#!/bin/sh
echo "[Kavana CleanStock] Running Prisma migrations..."
npx prisma migrate deploy
echo "[Kavana CleanStock] Seeding database..."
node prisma/seed.js
echo "[Kavana CleanStock] Ensuring logs directory exists..."
mkdir -p /app/logs
chown -R appuser:nodejs /app/logs
echo "[Kavana CleanStock] Starting server..."
exec node src/server.js
