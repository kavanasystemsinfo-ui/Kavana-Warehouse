-- AlterTable
ALTER TABLE "centros" ADD COLUMN     "presupuesto_mensual" DOUBLE PRECISION NOT NULL DEFAULT 0.0;

-- AlterTable
ALTER TABLE "productos" ADD COLUMN     "coste_unitario" DOUBLE PRECISION NOT NULL DEFAULT 0.0;

-- CreateTable
CREATE TABLE "consumo_teorico" (
    "id_centro" INTEGER NOT NULL,
    "id_producto" INTEGER NOT NULL,
    "cantidad_teorica" INTEGER NOT NULL,

    CONSTRAINT "consumo_teorico_pkey" PRIMARY KEY ("id_centro","id_producto")
);

-- CreateTable
CREATE TABLE "incidencias" (
    "id_incidencia" SERIAL NOT NULL,
    "id_centro" INTEGER NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "categoria" VARCHAR(50) NOT NULL,
    "titulo" VARCHAR(100) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "foto_url" TEXT,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incidencias_pkey" PRIMARY KEY ("id_incidencia")
);

-- CreateTable
CREATE TABLE "reglas_notificacion" (
    "id_regla" SERIAL NOT NULL,
    "id_supervisor" INTEGER NOT NULL,
    "id_centro" INTEGER,
    "id_operario" INTEGER,
    "id_producto" INTEGER,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "reglas_notificacion_pkey" PRIMARY KEY ("id_regla")
);

-- CreateTable
CREATE TABLE "notificaciones" (
    "id_notificacion" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "titulo" VARCHAR(100) NOT NULL,
    "mensaje" TEXT NOT NULL,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificaciones_pkey" PRIMARY KEY ("id_notificacion")
);

-- AddForeignKey
ALTER TABLE "consumo_teorico" ADD CONSTRAINT "consumo_teorico_id_centro_fkey" FOREIGN KEY ("id_centro") REFERENCES "centros"("id_centro") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumo_teorico" ADD CONSTRAINT "consumo_teorico_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "productos"("id_producto") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidencias" ADD CONSTRAINT "incidencias_id_centro_fkey" FOREIGN KEY ("id_centro") REFERENCES "centros"("id_centro") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidencias" ADD CONSTRAINT "incidencias_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reglas_notificacion" ADD CONSTRAINT "reglas_notificacion_id_supervisor_fkey" FOREIGN KEY ("id_supervisor") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reglas_notificacion" ADD CONSTRAINT "reglas_notificacion_id_centro_fkey" FOREIGN KEY ("id_centro") REFERENCES "centros"("id_centro") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reglas_notificacion" ADD CONSTRAINT "reglas_notificacion_id_operario_fkey" FOREIGN KEY ("id_operario") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reglas_notificacion" ADD CONSTRAINT "reglas_notificacion_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "productos"("id_producto") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;
