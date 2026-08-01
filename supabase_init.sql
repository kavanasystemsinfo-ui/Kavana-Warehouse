-- =============================================================================
-- CleanStock — Supabase Initial Schema
-- Run this in Supabase SQL Editor to initialize the database
-- =============================================================================

-- =============================================================================
-- Model: Usuario
-- =============================================================================
CREATE TABLE "usuarios" (
    "id_usuario" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "password_hash" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'limpiador',
    "estado" TEXT NOT NULL DEFAULT 'activo',
    "id_cliente" INTEGER,
    "is_super_admin" BOOLEAN NOT NULL DEFAULT false,
    "telefono" TEXT,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id_usuario")
);

-- =============================================================================
-- Model: Cliente (SaaS subscriptions)
-- =============================================================================
CREATE TABLE "clientes" (
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

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id_cliente")
);

-- =============================================================================
-- Model: Centro
-- =============================================================================
CREATE TABLE "centros" (
    "id_centro" SERIAL NOT NULL,
    "nombre_centro" TEXT NOT NULL,
    "direccion" TEXT,
    "presupuesto_mensual" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "id_cliente" INTEGER,

    CONSTRAINT "centros_pkey" PRIMARY KEY ("id_centro")
);

-- =============================================================================
-- Model: Categoria
-- =============================================================================
CREATE TABLE "categorias" (
    "id_categoria" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "icono" VARCHAR(10) DEFAULT '📦',
    "descripcion" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id_categoria")
);

-- =============================================================================
-- Model: Producto
-- =============================================================================
CREATE TABLE "productos" (
    "id_producto" SERIAL NOT NULL,
    "nombre_producto" VARCHAR(100) NOT NULL,
    "unidad_medida" VARCHAR(20) NOT NULL DEFAULT 'unidades',
    "stock_minimo_alerta" INTEGER NOT NULL DEFAULT 5,
    "coste_unitario" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "id_categoria" INTEGER,
    "campos_extra" JSONB DEFAULT '{}',

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id_producto")
);

-- =============================================================================
-- Model: AsignacionPersonal
-- =============================================================================
CREATE TABLE "asignaciones_personal" (
    "id_asignacion" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "id_centro" INTEGER NOT NULL,
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_fin" TIMESTAMP(3),

    CONSTRAINT "asignaciones_personal_pkey" PRIMARY KEY ("id_asignacion")
);

-- =============================================================================
-- Model: InventarioCentro
-- =============================================================================
CREATE TABLE "inventario_centros" (
    "id_centro" INTEGER NOT NULL,
    "id_producto" INTEGER NOT NULL,
    "cantidad_actual" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "inventario_centros_pkey" PRIMARY KEY ("id_centro","id_producto")
);

-- =============================================================================
-- Model: RefreshToken
-- =============================================================================
CREATE TABLE "refresh_tokens" (
    "id_refresh_token" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id_refresh_token")
);

-- =============================================================================
-- Model: RegistroMovimiento
-- =============================================================================
CREATE TABLE "registro_movimientos" (
    "id_movimiento" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "id_centro" INTEGER NOT NULL,
    "id_producto" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "fecha_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registro_movimientos_pkey" PRIMARY KEY ("id_movimiento")
);

-- =============================================================================
-- Model: ConsumoTeorico
-- =============================================================================
CREATE TABLE "consumo_teorico" (
    "id_centro" INTEGER NOT NULL,
    "id_producto" INTEGER NOT NULL,
    "cantidad_teorica" INTEGER NOT NULL,

    CONSTRAINT "consumo_teorico_pkey" PRIMARY KEY ("id_centro","id_producto")
);

-- =============================================================================
-- Model: Incidencia
-- =============================================================================
CREATE TABLE "incidencias" (
    "id_incidencia" SERIAL NOT NULL,
    "id_centro" INTEGER NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "categoria" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "foto_url" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incidencias_pkey" PRIMARY KEY ("id_incidencia")
);

-- =============================================================================
-- Model: ReglaNotificacion
-- =============================================================================
CREATE TABLE "reglas_notificacion" (
    "id_regla" SERIAL NOT NULL,
    "id_supervisor" INTEGER NOT NULL,
    "id_centro" INTEGER,
    "id_operario" INTEGER,
    "id_producto" INTEGER,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "reglas_notificacion_pkey" PRIMARY KEY ("id_regla")
);

-- =============================================================================
-- Model: Notificacion
-- =============================================================================
CREATE TABLE "notificaciones" (
    "id_notificacion" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificaciones_pkey" PRIMARY KEY ("id_notificacion")
);

-- =============================================================================
-- Model: PushSubscription
-- =============================================================================
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

-- =============================================================================
-- Indexes
-- =============================================================================
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");
CREATE UNIQUE INDEX "usuarios_username_key" ON "usuarios"("username");
CREATE UNIQUE INDEX "categorias_nombre_key" ON "categorias"("nombre");
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

CREATE INDEX "idx_asignaciones_usuario_fecha" ON "asignaciones_personal"("id_usuario", "fecha_inicio", "fecha_fin");
CREATE INDEX "idx_movimientos_centro_fecha" ON "registro_movimientos"("id_centro", "fecha_hora");
CREATE INDEX "idx_refresh_usuario" ON "refresh_tokens"("id_usuario");
CREATE INDEX "PushSubscription_usuarioId_idx" ON "PushSubscription"("usuarioId");
CREATE INDEX "idx_clientes_estado" ON "clientes"("estado");
CREATE INDEX "idx_usuarios_id_cliente" ON "usuarios"("id_cliente");

-- =============================================================================
-- Foreign Keys
-- =============================================================================
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "clientes"("id_cliente") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "centros" ADD CONSTRAINT "centros_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "clientes"("id_cliente") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "productos" ADD CONSTRAINT "productos_id_categoria_fkey" FOREIGN KEY ("id_categoria") REFERENCES "categorias"("id_categoria") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "asignaciones_personal" ADD CONSTRAINT "asignaciones_personal_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "asignaciones_personal" ADD CONSTRAINT "asignaciones_personal_id_centro_fkey" FOREIGN KEY ("id_centro") REFERENCES "centros"("id_centro") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "inventario_centros" ADD CONSTRAINT "inventario_centros_id_centro_fkey" FOREIGN KEY ("id_centro") REFERENCES "centros"("id_centro") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventario_centros" ADD CONSTRAINT "inventario_centros_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "productos"("id_producto") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "registro_movimientos" ADD CONSTRAINT "registro_movimientos_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "registro_movimientos" ADD CONSTRAINT "registro_movimientos_id_centro_fkey" FOREIGN KEY ("id_centro") REFERENCES "centros"("id_centro") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "registro_movimientos" ADD CONSTRAINT "registro_movimientos_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "productos"("id_producto") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "consumo_teorico" ADD CONSTRAINT "consumo_teorico_id_centro_fkey" FOREIGN KEY ("id_centro") REFERENCES "centros"("id_centro") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "consumo_teorico" ADD CONSTRAINT "consumo_teorico_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "productos"("id_producto") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "incidencias" ADD CONSTRAINT "incidencias_id_centro_fkey" FOREIGN KEY ("id_centro") REFERENCES "centros"("id_centro") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "incidencias" ADD CONSTRAINT "incidencias_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reglas_notificacion" ADD CONSTRAINT "reglas_notificacion_id_supervisor_fkey" FOREIGN KEY ("id_supervisor") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reglas_notificacion" ADD CONSTRAINT "reglas_notificacion_id_centro_fkey" FOREIGN KEY ("id_centro") REFERENCES "centros"("id_centro") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reglas_notificacion" ADD CONSTRAINT "reglas_notificacion_id_operario_fkey" FOREIGN KEY ("id_operario") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reglas_notificacion" ADD CONSTRAINT "reglas_notificacion_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "productos"("id_producto") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;