#!/bin/bash
# ==============================
# CleanStock → Supabase Migration
# ==============================
# Requisito: tener supabase CLI instalada
# Ejecutar: bash supabase-migrate.sh
set -e

echo "=== CleanStock → Supabase Migration ==="
echo ""
echo "PASO 1: Registra las credenciales de Supabase"
echo "----------------------------------------------"
echo "1. Ve a https://supabase.com → New Project"
echo "2. Elige una contraseña segura para la DB"
echo "3. Una vez creado, ve a Project Settings → Database → Connection string"
echo "4. Copia la URI (postgresql://postgres:XXX@db.XXX.supabase.co:5432/postgres)"
echo ""
echo "La URI usa 'postgres' como DB name por defecto. Cámbiala si creaste otra."
echo ""

# Check if supabase CLI is available
if ! command -v supabase &> /dev/null; then
  echo "⚠️  supabase CLI no instalada."
  echo "   Instálala: npm install -g supabase"
  echo "   O continúa manualmente (ver PASO 2 abajo)"
  echo ""
fi

echo ""
echo "PASO 2: Restaurar datos en Supabase"
echo "----------------------------------------------"
echo "Desde tu máquina local o VPS:"
echo ""
echo "# Opción A - Migrar con Prisma (recomendada):"
echo "  export DATABASE_URL=\"postgresql://postgres:XXX@db.XXX.supabase.co:5432/postgres\""
echo "  npx prisma migrate deploy"
echo "  npx prisma db seed"
echo ""
echo "# Opción B - Restaurar dump SQL:"
echo "  psql \"\$DATABASE_URL\" < db_schema.sql"
echo "  psql \"\$DATABASE_URL\" < db_data.sql"
echo ""
echo "# Opción C - Desde terminal remota:"
echo "  # 1. Sube los SQLs a un servidor temporal o usa scp"
echo "  # 2. Conéctate: psql \"\$DATABASE_URL\""
echo "  # 3. Ejecuta: \\i db_schema.sql"
echo "  # 4. Ejecuta: \\i db_data.sql"
echo ""
echo ""
echo "PASO 3: Crear usuarios en Supabase Auth (opcional)"
echo "----------------------------------------------"
echo "Si quieres usar Supabase Auth en lugar del JWT propio:"
echo "1. Dashboard Supabase → Authentication → Users → Add User"
echo "2. Añade: empleado@kavana.com / supervisor@kavana.com / admin@kavana.com"
echo "3. La contraseña por defecto es: cleanstock"
echo ""
echo ""
echo "PASO 4: Anota las variables de entorno"
echo "----------------------------------------------"
echo "Las necesitarás en Vercel (PASO 5):"
echo ""
echo "DATABASE_URL=postgresql://postgres:XXX@db.XXX.supabase.co:5432/postgres"
echo "JWT_SECRET=cleanstock-jwt-secret"
echo "CORS_ORIGIN=*"
echo ""