-- Migración de reconciliación: tabla clientes, categorias y campos SaaS
-- El schema evolucionó con `prisma db push` en dev pero las migraciones quedaron
-- desactualizadas. Esta migración rellena el hueco de forma idempotente para que
-- `migrate deploy` funcione en BD limpias (CI) y no rompa BD existentes.
-- Debe aplicarse ANTES de M9 (20260716120000) que referencia clientes.

-- CreateTable: clientes (SaaS)
CREATE TABLE IF NOT EXISTS "clientes" (
    "id_cliente" SERIAL NOT NULL,
    "nombre_empresa" TEXT NOT NULL,
    "email_contacto" TEXT NOT NULL,
    "telefono" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'basic',
    "estado" TEXT NOT NULL DEFAULT 'trial',
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trial_fin" TIMESTAMP(3) NOT NULL,
    "fecha_renovacion" TIMESTAMP(3),
    "notas" TEXT,
    "es_demo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id_cliente")
);

-- CreateTable: categorias
CREATE TABLE IF NOT EXISTS "categorias" (
    "id_categoria" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "icono" VARCHAR(10) DEFAULT '📦',
    "descripcion" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id_categoria")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "categorias_nombre_key" ON "categorias"("nombre");

-- AlterTable: usuarios (campos SaaS/empleado)
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "id_cliente" INTEGER,
ADD COLUMN IF NOT EXISTS "is_super_admin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "numero_empleado" TEXT,
ADD COLUMN IF NOT EXISTS "telefono" TEXT,
ADD COLUMN IF NOT EXISTS "username" TEXT;

-- CreateIndex (después de la columna)
CREATE UNIQUE INDEX IF NOT EXISTS "usuarios_username_key" ON "usuarios"("username");

-- AlterTable: centros (id_cliente lo añade M9 con IF NOT EXISTS; aquí lo
-- dejamos nullable para que M9 pueda hacer el UPDATE y luego SET NOT NULL)
ALTER TABLE "centros" ADD COLUMN IF NOT EXISTS "id_cliente" INTEGER;

-- AlterTable: inventario_centros
ALTER TABLE "inventario_centros" ADD COLUMN IF NOT EXISTS "fecha_actualizacion" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "stock_fisico" INTEGER,
ADD COLUMN IF NOT EXISTS "stock_minimo" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: productos
ALTER TABLE "productos" ADD COLUMN IF NOT EXISTS "campos_extra" JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS "id_categoria" INTEGER;
ALTER TABLE "productos" ALTER COLUMN "nombre_producto" SET DATA TYPE VARCHAR(100);
ALTER TABLE "productos" ALTER COLUMN "unidad_medida" SET DATA TYPE VARCHAR(20);

-- AddForeignKey (idempotente: DO block porque ADD CONSTRAINT IF NOT EXISTS no existe)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'usuarios_id_cliente_fkey') THEN
        ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "clientes"("id_cliente") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'centros_id_cliente_fkey') THEN
        ALTER TABLE "centros" ADD CONSTRAINT "centros_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "clientes"("id_cliente") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'productos_id_categoria_fkey') THEN
        ALTER TABLE "productos" ADD CONSTRAINT "productos_id_categoria_fkey" FOREIGN KEY ("id_categoria") REFERENCES "categorias"("id_categoria") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
