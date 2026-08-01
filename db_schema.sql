--
-- PostgreSQL database dump
--

\restrict uNIiCV24PQodqAI2Ga3GdjgAlCcAcsMDnAFJb7bcGHBKvoLWSGSGFFZSiEgPdFi

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: asignaciones_personal; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asignaciones_personal (
    id_asignacion integer NOT NULL,
    id_usuario integer NOT NULL,
    id_centro integer NOT NULL,
    fecha_inicio date NOT NULL,
    fecha_fin date
);


--
-- Name: asignaciones_personal_id_asignacion_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.asignaciones_personal_id_asignacion_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: asignaciones_personal_id_asignacion_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.asignaciones_personal_id_asignacion_seq OWNED BY public.asignaciones_personal.id_asignacion;


--
-- Name: categorias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categorias (
    id_categoria integer NOT NULL,
    nombre character varying(100) NOT NULL,
    icono character varying(10) DEFAULT '📦'::character varying,
    descripcion text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: categorias_id_categoria_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.categorias_id_categoria_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: categorias_id_categoria_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.categorias_id_categoria_seq OWNED BY public.categorias.id_categoria;


--
-- Name: centros; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.centros (
    id_centro integer NOT NULL,
    nombre_centro character varying(150) NOT NULL,
    direccion character varying(255),
    presupuesto_mensual double precision DEFAULT 0.0 NOT NULL
);


--
-- Name: centros_id_centro_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.centros_id_centro_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: centros_id_centro_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.centros_id_centro_seq OWNED BY public.centros.id_centro;


--
-- Name: consumo_teorico; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consumo_teorico (
    id_centro integer NOT NULL,
    id_producto integer NOT NULL,
    cantidad_teorica integer NOT NULL
);


--
-- Name: incidencias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.incidencias (
    id_incidencia integer NOT NULL,
    id_centro integer NOT NULL,
    id_usuario integer NOT NULL,
    categoria character varying(50) NOT NULL,
    titulo character varying(100) NOT NULL,
    descripcion text NOT NULL,
    foto_url text,
    estado character varying(20) DEFAULT 'pendiente'::character varying NOT NULL,
    fecha_creacion timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: incidencias_id_incidencia_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.incidencias_id_incidencia_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: incidencias_id_incidencia_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.incidencias_id_incidencia_seq OWNED BY public.incidencias.id_incidencia;


--
-- Name: inventario_centros; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventario_centros (
    id_centro integer NOT NULL,
    id_producto integer NOT NULL,
    cantidad_actual integer DEFAULT 0 NOT NULL,
    stock_minimo integer DEFAULT 0,
    stock_maximo integer DEFAULT 9999,
    fecha_actualizacion timestamp with time zone DEFAULT now()
);


--
-- Name: notificaciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notificaciones (
    id_notificacion integer NOT NULL,
    id_usuario integer NOT NULL,
    titulo character varying(100) NOT NULL,
    mensaje text NOT NULL,
    leida boolean DEFAULT false NOT NULL,
    fecha_creacion timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: notificaciones_id_notificacion_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notificaciones_id_notificacion_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notificaciones_id_notificacion_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notificaciones_id_notificacion_seq OWNED BY public.notificaciones.id_notificacion;


--
-- Name: productos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.productos (
    id_producto integer NOT NULL,
    nombre_producto character varying(100) NOT NULL,
    unidad_medida character varying(20) DEFAULT 'unidades'::character varying NOT NULL,
    stock_minimo_alerta integer DEFAULT 5 NOT NULL,
    coste_unitario double precision DEFAULT 0.0 NOT NULL,
    id_categoria integer,
    campos_extra jsonb DEFAULT '{}'::jsonb
);


--
-- Name: productos_id_producto_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.productos_id_producto_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: productos_id_producto_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.productos_id_producto_seq OWNED BY public.productos.id_producto;


--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refresh_tokens (
    id_refresh_token integer NOT NULL,
    id_usuario integer NOT NULL,
    token character varying(512) NOT NULL,
    expires_at timestamp(3) without time zone NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    revoked boolean DEFAULT false NOT NULL
);


--
-- Name: refresh_tokens_id_refresh_token_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.refresh_tokens_id_refresh_token_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: refresh_tokens_id_refresh_token_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.refresh_tokens_id_refresh_token_seq OWNED BY public.refresh_tokens.id_refresh_token;


--
-- Name: registro_movimientos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.registro_movimientos (
    id_movimiento integer NOT NULL,
    id_usuario integer NOT NULL,
    id_centro integer NOT NULL,
    id_producto integer NOT NULL,
    cantidad integer NOT NULL,
    fecha_hora timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tipo character varying(20) DEFAULT 'consumo'::character varying,
    observaciones text
);


--
-- Name: registro_movimientos_id_movimiento_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.registro_movimientos_id_movimiento_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: registro_movimientos_id_movimiento_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.registro_movimientos_id_movimiento_seq OWNED BY public.registro_movimientos.id_movimiento;


--
-- Name: reglas_notificacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reglas_notificacion (
    id_regla integer NOT NULL,
    id_supervisor integer NOT NULL,
    id_centro integer,
    id_operario integer,
    id_producto integer,
    activa boolean DEFAULT true NOT NULL
);


--
-- Name: reglas_notificacion_id_regla_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reglas_notificacion_id_regla_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reglas_notificacion_id_regla_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reglas_notificacion_id_regla_seq OWNED BY public.reglas_notificacion.id_regla;


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuarios (
    id_usuario integer NOT NULL,
    nombre character varying(100) NOT NULL,
    email character varying(100) NOT NULL,
    password_hash character varying(255) NOT NULL,
    rol character varying(20) DEFAULT 'limpiador'::character varying NOT NULL,
    estado character varying(20) DEFAULT 'activo'::character varying NOT NULL,
    apellidos character varying(100),
    numero_empleado character varying(20),
    id_centro integer
);


--
-- Name: usuarios_id_usuario_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.usuarios_id_usuario_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: usuarios_id_usuario_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.usuarios_id_usuario_seq OWNED BY public.usuarios.id_usuario;


--
-- Name: asignaciones_personal id_asignacion; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asignaciones_personal ALTER COLUMN id_asignacion SET DEFAULT nextval('public.asignaciones_personal_id_asignacion_seq'::regclass);


--
-- Name: categorias id_categoria; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias ALTER COLUMN id_categoria SET DEFAULT nextval('public.categorias_id_categoria_seq'::regclass);


--
-- Name: centros id_centro; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.centros ALTER COLUMN id_centro SET DEFAULT nextval('public.centros_id_centro_seq'::regclass);


--
-- Name: incidencias id_incidencia; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidencias ALTER COLUMN id_incidencia SET DEFAULT nextval('public.incidencias_id_incidencia_seq'::regclass);


--
-- Name: notificaciones id_notificacion; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificaciones ALTER COLUMN id_notificacion SET DEFAULT nextval('public.notificaciones_id_notificacion_seq'::regclass);


--
-- Name: productos id_producto; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos ALTER COLUMN id_producto SET DEFAULT nextval('public.productos_id_producto_seq'::regclass);


--
-- Name: refresh_tokens id_refresh_token; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens ALTER COLUMN id_refresh_token SET DEFAULT nextval('public.refresh_tokens_id_refresh_token_seq'::regclass);


--
-- Name: registro_movimientos id_movimiento; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registro_movimientos ALTER COLUMN id_movimiento SET DEFAULT nextval('public.registro_movimientos_id_movimiento_seq'::regclass);


--
-- Name: reglas_notificacion id_regla; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reglas_notificacion ALTER COLUMN id_regla SET DEFAULT nextval('public.reglas_notificacion_id_regla_seq'::regclass);


--
-- Name: usuarios id_usuario; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN id_usuario SET DEFAULT nextval('public.usuarios_id_usuario_seq'::regclass);


--
-- Name: asignaciones_personal asignaciones_personal_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asignaciones_personal
    ADD CONSTRAINT asignaciones_personal_pkey PRIMARY KEY (id_asignacion);


--
-- Name: categorias categorias_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias
    ADD CONSTRAINT categorias_nombre_key UNIQUE (nombre);


--
-- Name: categorias categorias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias
    ADD CONSTRAINT categorias_pkey PRIMARY KEY (id_categoria);


--
-- Name: centros centros_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.centros
    ADD CONSTRAINT centros_pkey PRIMARY KEY (id_centro);


--
-- Name: consumo_teorico consumo_teorico_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consumo_teorico
    ADD CONSTRAINT consumo_teorico_pkey PRIMARY KEY (id_centro, id_producto);


--
-- Name: incidencias incidencias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidencias
    ADD CONSTRAINT incidencias_pkey PRIMARY KEY (id_incidencia);


--
-- Name: inventario_centros inventario_centros_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_centros
    ADD CONSTRAINT inventario_centros_pkey PRIMARY KEY (id_centro, id_producto);


--
-- Name: notificaciones notificaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificaciones
    ADD CONSTRAINT notificaciones_pkey PRIMARY KEY (id_notificacion);


--
-- Name: productos productos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_pkey PRIMARY KEY (id_producto);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id_refresh_token);


--
-- Name: registro_movimientos registro_movimientos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registro_movimientos
    ADD CONSTRAINT registro_movimientos_pkey PRIMARY KEY (id_movimiento);


--
-- Name: reglas_notificacion reglas_notificacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reglas_notificacion
    ADD CONSTRAINT reglas_notificacion_pkey PRIMARY KEY (id_regla);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id_usuario);


--
-- Name: idx_asignaciones_usuario_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asignaciones_usuario_fecha ON public.asignaciones_personal USING btree (id_usuario, fecha_inicio, fecha_fin);


--
-- Name: idx_movimientos_centro_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_movimientos_centro_fecha ON public.registro_movimientos USING btree (id_centro, fecha_hora);


--
-- Name: idx_refresh_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refresh_usuario ON public.refresh_tokens USING btree (id_usuario);


--
-- Name: refresh_tokens_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX refresh_tokens_token_key ON public.refresh_tokens USING btree (token);


--
-- Name: usuarios_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX usuarios_email_key ON public.usuarios USING btree (email);


--
-- Name: asignaciones_personal asignaciones_personal_id_centro_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asignaciones_personal
    ADD CONSTRAINT asignaciones_personal_id_centro_fkey FOREIGN KEY (id_centro) REFERENCES public.centros(id_centro) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: asignaciones_personal asignaciones_personal_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asignaciones_personal
    ADD CONSTRAINT asignaciones_personal_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: consumo_teorico consumo_teorico_id_centro_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consumo_teorico
    ADD CONSTRAINT consumo_teorico_id_centro_fkey FOREIGN KEY (id_centro) REFERENCES public.centros(id_centro) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: consumo_teorico consumo_teorico_id_producto_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consumo_teorico
    ADD CONSTRAINT consumo_teorico_id_producto_fkey FOREIGN KEY (id_producto) REFERENCES public.productos(id_producto) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: incidencias incidencias_id_centro_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidencias
    ADD CONSTRAINT incidencias_id_centro_fkey FOREIGN KEY (id_centro) REFERENCES public.centros(id_centro) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: incidencias incidencias_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidencias
    ADD CONSTRAINT incidencias_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: inventario_centros inventario_centros_id_centro_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_centros
    ADD CONSTRAINT inventario_centros_id_centro_fkey FOREIGN KEY (id_centro) REFERENCES public.centros(id_centro) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: inventario_centros inventario_centros_id_producto_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_centros
    ADD CONSTRAINT inventario_centros_id_producto_fkey FOREIGN KEY (id_producto) REFERENCES public.productos(id_producto) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: notificaciones notificaciones_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificaciones
    ADD CONSTRAINT notificaciones_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: productos productos_id_categoria_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_id_categoria_fkey FOREIGN KEY (id_categoria) REFERENCES public.categorias(id_categoria);


--
-- Name: refresh_tokens refresh_tokens_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: registro_movimientos registro_movimientos_id_centro_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registro_movimientos
    ADD CONSTRAINT registro_movimientos_id_centro_fkey FOREIGN KEY (id_centro) REFERENCES public.centros(id_centro) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: registro_movimientos registro_movimientos_id_producto_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registro_movimientos
    ADD CONSTRAINT registro_movimientos_id_producto_fkey FOREIGN KEY (id_producto) REFERENCES public.productos(id_producto) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: registro_movimientos registro_movimientos_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registro_movimientos
    ADD CONSTRAINT registro_movimientos_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: reglas_notificacion reglas_notificacion_id_centro_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reglas_notificacion
    ADD CONSTRAINT reglas_notificacion_id_centro_fkey FOREIGN KEY (id_centro) REFERENCES public.centros(id_centro) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reglas_notificacion reglas_notificacion_id_operario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reglas_notificacion
    ADD CONSTRAINT reglas_notificacion_id_operario_fkey FOREIGN KEY (id_operario) REFERENCES public.usuarios(id_usuario) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reglas_notificacion reglas_notificacion_id_producto_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reglas_notificacion
    ADD CONSTRAINT reglas_notificacion_id_producto_fkey FOREIGN KEY (id_producto) REFERENCES public.productos(id_producto) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reglas_notificacion reglas_notificacion_id_supervisor_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reglas_notificacion
    ADD CONSTRAINT reglas_notificacion_id_supervisor_fkey FOREIGN KEY (id_supervisor) REFERENCES public.usuarios(id_usuario) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: usuarios usuarios_id_centro_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_id_centro_fkey FOREIGN KEY (id_centro) REFERENCES public.centros(id_centro);


--
-- PostgreSQL database dump complete
--

\unrestrict uNIiCV24PQodqAI2Ga3GdjgAlCcAcsMDnAFJb7bcGHBKvoLWSGSGFFZSiEgPdFi

