-- DropForeignKey
ALTER TABLE "incidencias" DROP CONSTRAINT "incidencias_id_usuario_fkey";

-- AlterTable
ALTER TABLE "asignaciones_personal" ALTER COLUMN "fecha_inicio" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "fecha_fin" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "centros" ALTER COLUMN "nombre_centro" SET DATA TYPE TEXT,
ALTER COLUMN "direccion" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "incidencias" ALTER COLUMN "categoria" SET DATA TYPE TEXT,
ALTER COLUMN "titulo" SET DATA TYPE TEXT,
ALTER COLUMN "estado" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "notificaciones" ALTER COLUMN "titulo" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "productos" ALTER COLUMN "nombre_producto" SET DATA TYPE TEXT,
ALTER COLUMN "unidad_medida" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "refresh_tokens" ALTER COLUMN "token" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "registro_movimientos" ALTER COLUMN "fecha_hora" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "usuarios" ALTER COLUMN "nombre" SET DATA TYPE TEXT,
ALTER COLUMN "email" SET DATA TYPE TEXT,
ALTER COLUMN "password_hash" SET DATA TYPE TEXT,
ALTER COLUMN "rol" SET DATA TYPE TEXT,
ALTER COLUMN "estado" SET DATA TYPE TEXT;

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" SERIAL NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_usuarioId_idx" ON "PushSubscription"("usuarioId");

-- AddForeignKey
ALTER TABLE "incidencias" ADD CONSTRAINT "incidencias_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;
