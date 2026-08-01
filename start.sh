#!/bin/sh
echo "[KAVANA WAREHOUSE] Running Prisma migrations..."
npx prisma migrate deploy
echo "[KAVANA WAREHOUSE] Ensuring logs directory exists..."
mkdir -p /app/logs
chown -R appuser:nodejs /app/logs
echo "[KAVANA WAREHOUSE] Starting server..."
exec node src/server.js
