--
-- PostgreSQL database dump
--

\restrict UqMLCOG9xuhmxmigySgBFihfiUPdppnt29NKcTVFlfP7kBK8NPlKxifU7SSRkUc

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

--
-- Data for Name: centros; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.centros (id_centro, nombre_centro, direccion, presupuesto_mensual) FROM stdin;
1	CEIP San Juan	Calle Mayor 15, Madrid	200
2	Oficinas Centrales Kavana	Av. de la Industria 42, Alcobendas	500
3	Hospital Universitario del Sur	Calle Salud 100, Getafe	1500
\.


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.usuarios (id_usuario, nombre, email, password_hash, rol, estado, apellidos, numero_empleado, id_centro) FROM stdin;
2	Empleado	empleado@kavana.com	$2a$12$0hxqkDGapi6MEYuvTUyOH.t1Vwk522OFDx6vUb5EeC7GCYOHg9owi	limpiador	activo	\N	\N	\N
9	Pedro Sánchez	baja@kavana.com	$2a$12$EugWnmnq52GHMzj2iu/vJuzx9TNpcoOmTopn7Nu3ORQ0GZ6nGUQB6	limpiador	baja_medica	\N	\N	\N
4	Admin	admin@kavana.com	$2a$12$oDa4Eaz0WgbTJBmM6bE/Z.WbYBlLWCG8dz7rxKVzlnlK4heLpvM.S	admin	activo	\N	\N	\N
3	Supervisor	supervisor@kavana.com	$2a$12$nEpG4dQIVrfBEJZwxeP96.oKnBr.a.mzM.K9AJBjWGoirb3al.rdG	supervisor	activo	\N	\N	\N
7	Carlos López	carlos@kavana.com	$2a$12$mTqvevhAcevY/V6smVUWMO.aKrQOXvD/KuAAeh.Rce0XkUFJ1iV9e	limpiador	activo	\N	\N	\N
8	Ana Martínez	ana@kavana.com	$2a$12$nyomMfiTkT6DEFTmQMwAVuwsgtIA4cAOK/qGJzeJ7.7MevT0.sumi	limpiador	activo	\N	\N	\N
\.


--
-- Data for Name: asignaciones_personal; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.asignaciones_personal (id_asignacion, id_usuario, id_centro, fecha_inicio, fecha_fin) FROM stdin;
1	7	1	2026-05-10	\N
2	8	3	2026-06-10	2026-08-10
3	9	2	2026-04-10	2026-06-10
4	3	2	2026-05-10	\N
\.


--
-- Data for Name: categorias; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.categorias (id_categoria, nombre, icono, descripcion, created_at) FROM stdin;
1	Guantes	🧤	Guantes de proteccion	2026-07-11 12:06:04.423253+00
2	Quimicos	🧪	Detergentes y desinfectantes	2026-07-11 12:06:04.423253+00
3	Papel	🧻	Papel y celulosa	2026-07-11 12:06:04.423253+00
4	Bolsas	🗑️	Bolsas y residuos	2026-07-11 12:06:04.423253+00
5	Utiles	🧹	Mopas y fregonas	2026-07-11 12:06:04.423253+00
6	EPIs	🦺	Proteccion personal	2026-07-11 12:06:04.423253+00
7	Maquinaria	⚙️	Maquinas de limpieza	2026-07-11 12:06:04.423253+00
8	Higiene	🧼	Higiene personal	2026-07-11 12:06:04.423253+00
\.


--
-- Data for Name: productos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.productos (id_producto, nombre_producto, unidad_medida, stock_minimo_alerta, coste_unitario, id_categoria, campos_extra) FROM stdin;
1	Bolsa de Basura 50L (pack 10)	paquetes	8	0.8	\N	{}
2	Papel Higiénico (pack 12)	paquetes	15	3.5	\N	{}
3	Bayetas Microfibra (pack 5)	paquetes	10	2.5	\N	{}
4	Fregasuelos 1L	unidades	10	1.5	\N	{}
5	Jabón de Manos 5L	unidades	3	5	\N	{}
6	Bayetas Microfibra (pack 5)	paquetes	10	2.5	\N	{}
\.


--
-- Data for Name: consumo_teorico; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.consumo_teorico (id_centro, id_producto, cantidad_teorica) FROM stdin;
1	1	15
1	4	10
3	2	50
3	5	20
1	2	10
1	3	5
3	4	50
\.


--
-- Data for Name: incidencias; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.incidencias (id_incidencia, id_centro, id_usuario, categoria, titulo, descripcion, foto_url, estado, fecha_creacion) FROM stdin;
\.


--
-- Data for Name: inventario_centros; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.inventario_centros (id_centro, id_producto, cantidad_actual, stock_minimo, stock_maximo, fecha_actualizacion) FROM stdin;
1	1	12	0	9999	2026-07-11 11:44:58.961095+00
1	4	8	0	9999	2026-07-11 11:44:58.961095+00
1	2	20	0	9999	2026-07-11 11:44:58.961095+00
3	2	10	0	9999	2026-07-11 11:44:58.961095+00
3	5	2	0	9999	2026-07-11 11:44:58.961095+00
3	3	15	0	9999	2026-07-11 11:44:58.961095+00
2	1	6	0	9999	2026-07-11 11:44:58.961095+00
2	4	4	0	9999	2026-07-11 11:44:58.961095+00
2	5	3	0	9999	2026-07-11 11:44:58.961095+00
1	3	3	0	9999	2026-07-11 11:44:58.961095+00
3	4	10	0	9999	2026-07-11 11:44:58.961095+00
3	6	15	0	9999	2026-07-11 11:44:58.961095+00
2	2	4	0	9999	2026-07-11 11:44:58.961095+00
\.


--
-- Data for Name: notificaciones; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notificaciones (id_notificacion, id_usuario, titulo, mensaje, leida, fecha_creacion) FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.refresh_tokens (id_refresh_token, id_usuario, token, expires_at, created_at, revoked) FROM stdin;
1	2	80c71b5cfec004a71aacd99e72e695275810a9b7e1bba2379b867c8dfad263c3bb19bbb3e4be20ae63da996930e99edf31e1f4c5b01cf272586f5229d4311622	2026-08-09 19:58:31.058	2026-07-10 19:58:31.059	f
2	2	5b82fb2c07b181da7bcfbf3fb99543a25b3c6787ba2d6b7b69a6d363e7b8eb53e1cc109959ef0cca6c5a582b602273bc737b51b9235775acd81c03d98cb8dadb	2026-08-09 20:03:27.482	2026-07-10 20:03:27.483	f
3	2	9982dd3e636663f2a53d40f62dd3cf072d84cb84403e57fb4f13f79e675c04729bf6c7c437da6fe09ecffbc0400044de482f2da6de59bd32fcfc32086f863273	2026-08-09 20:15:32.736	2026-07-10 20:15:32.738	f
4	2	eb2d76c2ac71337a3a90af23ab52016bc8e198850dc080f6cea50b6746231a4ce607a0467af77643fe7dc7cc1495dbcb6714553a82e5354694d0e93ca1cdfbb8	2026-08-09 20:15:59.345	2026-07-10 20:15:59.348	f
5	2	4f62a6f89bc0df26d67dbdaf50abbc8c0b576a17f773f5601e00fcf075260b0d2ba60328ba7a29e8c292e646212b889992a733c8bdf682f959b85ca85353f8f9	2026-08-09 20:17:49.729	2026-07-10 20:17:49.732	f
6	2	630950cc0f00edb1143dac65c7d40389b08eceeda748dc98bdd2a7e93783a9dc6403a92b342c7b471087aaac8de5aca2cf267831685cd2372c5abf45f0fb8c4a	2026-08-09 20:20:54.435	2026-07-10 20:20:54.438	f
7	2	39694cd308303926d963e7c18010405bb1bbacbb28bcf87d78d9264409daa88e58746a4b43139978bb1cef9997e694eb0f77b65b7bddb17196c91fa0b3997c8d	2026-08-09 20:21:02.953	2026-07-10 20:21:02.955	f
8	2	eb8f7cabfe5afede4717517f1914dbe4731de981cb02b1938debf6f47d7a8132005f0a09db29359e65839de649b717ce675767e593c4966d65f20cedc78ed308	2026-08-09 20:21:03.417	2026-07-10 20:21:03.419	f
9	2	d736361a7073d04f12b28c86ec9e75366645b4d057d0085ef5df1281aad02bf81e4b7cc3d4b02622f6a6694b8ac4319f8b3245f2f3920841677baac50afae5b3	2026-08-09 20:22:57.939	2026-07-10 20:22:57.941	f
10	2	b5b5d817ac7572fba6e57766c012c2a1334360ed6549c26ced0063bbe28965863b239ba78c5fb9e0562c524edcda45dc946c4026c93dc8b5240b04fce22710f2	2026-08-09 20:25:03.973	2026-07-10 20:25:03.975	f
11	2	17769859bb285c59094d6323ad74da5a41d079da7cf2142de437e0c0c8da00de604679b8459cd150fca50e7e1ae15cc220f9841e61315ef6207fe7868386cf7c	2026-08-09 20:28:47.005	2026-07-10 20:28:47.006	f
13	4	96fcc92fe3dac704358141be44c4b150ca9402ce25641e20c92701d0b4c81196a3c0538f22ff15449783e89119ed9bfcf4d68bcdf9db541420f9be7970837ea6	2026-08-09 20:40:32.583	2026-07-10 20:40:32.585	f
16	4	6c4b5a316176c70252aba664716222b0f76f0521a0ce467e58a1208335e3cca54e6476a6743408c1e72467babf7c360e7a754fa96a01a395467a6e4c66504118	2026-08-10 11:18:12.421	2026-07-11 11:18:12.423	f
\.


--
-- Data for Name: registro_movimientos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.registro_movimientos (id_movimiento, id_usuario, id_centro, id_producto, cantidad, fecha_hora, tipo, observaciones) FROM stdin;
1	7	1	1	-2	2026-07-09 00:00:00	consumo	\N
2	7	1	1	-1	2026-07-09 00:00:00	consumo	\N
3	3	1	1	10	2026-07-08 00:00:00	consumo	\N
4	7	1	1	-2	2026-07-09 00:00:00	consumo	\N
5	7	1	3	-1	2026-07-09 00:00:00	consumo	\N
6	3	1	1	10	2026-07-08 00:00:00	consumo	\N
7	7	1	1	-2	2026-07-09 00:00:00	consumo	\N
8	7	1	3	-1	2026-07-09 00:00:00	consumo	\N
9	3	1	1	10	2026-07-08 00:00:00	consumo	\N
10	7	1	1	-2	2026-07-09 00:00:00	consumo	\N
11	7	1	3	-1	2026-07-09 00:00:00	consumo	\N
12	3	1	1	10	2026-07-08 00:00:00	consumo	\N
13	7	1	1	-2	2026-07-09 00:00:00	consumo	\N
14	7	1	3	-1	2026-07-09 00:00:00	consumo	\N
15	3	1	1	10	2026-07-08 00:00:00	consumo	\N
16	7	1	1	-2	2026-07-09 00:00:00	consumo	\N
17	7	1	3	-1	2026-07-09 00:00:00	consumo	\N
18	3	1	1	10	2026-07-08 00:00:00	consumo	\N
19	7	1	1	-2	2026-07-09 00:00:00	consumo	\N
20	7	1	3	-1	2026-07-09 00:00:00	consumo	\N
21	3	1	1	10	2026-07-08 00:00:00	consumo	\N
22	7	1	1	-2	2026-07-09 00:00:00	consumo	\N
23	7	1	3	-1	2026-07-09 00:00:00	consumo	\N
24	3	1	1	10	2026-07-08 00:00:00	consumo	\N
25	7	1	1	-2	2026-07-09 00:00:00	consumo	\N
26	7	1	3	-1	2026-07-09 00:00:00	consumo	\N
27	3	1	1	10	2026-07-08 00:00:00	consumo	\N
28	7	1	1	-2	2026-07-09 00:00:00	consumo	\N
29	7	1	3	-1	2026-07-09 00:00:00	consumo	\N
30	3	1	1	10	2026-07-08 00:00:00	consumo	\N
31	7	1	1	-2	2026-07-09 00:00:00	consumo	\N
32	7	1	3	-1	2026-07-09 00:00:00	consumo	\N
33	3	1	1	10	2026-07-08 00:00:00	consumo	\N
34	7	1	1	-2	2026-07-09 00:00:00	consumo	\N
35	7	1	3	-1	2026-07-09 00:00:00	consumo	\N
36	3	1	1	10	2026-07-08 00:00:00	consumo	\N
37	7	1	1	-2	2026-07-09 00:00:00	consumo	\N
38	7	1	3	-1	2026-07-09 00:00:00	consumo	\N
39	3	1	1	10	2026-07-08 00:00:00	consumo	\N
40	7	1	1	-2	2026-07-09 00:00:00	consumo	\N
41	7	1	3	-1	2026-07-09 00:00:00	consumo	\N
42	3	1	1	10	2026-07-08 00:00:00	consumo	\N
43	7	1	1	-2	2026-07-09 00:00:00	consumo	\N
44	7	1	3	-1	2026-07-09 00:00:00	consumo	\N
45	3	1	1	10	2026-07-08 00:00:00	consumo	\N
46	7	1	1	-2	2026-07-09 00:00:00	consumo	\N
47	7	1	3	-1	2026-07-09 00:00:00	consumo	\N
48	3	1	1	10	2026-07-08 00:00:00	consumo	\N
49	7	1	1	-2	2026-07-09 00:00:00	consumo	\N
50	7	1	3	-1	2026-07-09 00:00:00	consumo	\N
51	3	1	1	10	2026-07-08 00:00:00	consumo	\N
52	7	1	1	-2	2026-07-09 00:00:00	consumo	\N
53	7	1	3	-1	2026-07-09 00:00:00	consumo	\N
54	3	1	1	10	2026-07-08 00:00:00	consumo	\N
55	7	1	1	-2	2026-07-09 00:00:00	consumo	\N
56	7	1	3	-1	2026-07-09 00:00:00	consumo	\N
57	3	1	1	10	2026-07-08 00:00:00	consumo	\N
\.


--
-- Data for Name: reglas_notificacion; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.reglas_notificacion (id_regla, id_supervisor, id_centro, id_operario, id_producto, activa) FROM stdin;
1	3	1	\N	\N	t
2	3	\N	7	\N	t
3	3	1	\N	\N	t
4	3	\N	7	\N	t
5	3	1	\N	\N	t
6	3	\N	7	\N	t
7	3	1	\N	\N	t
8	3	\N	7	\N	t
9	3	1	\N	\N	t
10	3	\N	7	\N	t
11	3	1	\N	\N	t
12	3	\N	7	\N	t
13	3	1	\N	\N	t
14	3	\N	7	\N	t
15	3	1	\N	\N	t
16	3	\N	7	\N	t
17	3	1	\N	\N	t
18	3	\N	7	\N	t
19	3	1	\N	\N	t
20	3	\N	7	\N	t
21	3	1	\N	\N	t
22	3	\N	7	\N	t
23	3	1	\N	\N	t
24	3	\N	7	\N	t
25	3	1	\N	\N	t
26	3	\N	7	\N	t
27	3	1	\N	\N	t
28	3	\N	7	\N	t
29	3	1	\N	\N	t
30	3	\N	7	\N	t
31	3	1	\N	\N	t
32	3	\N	7	\N	t
33	3	1	\N	\N	t
34	3	\N	7	\N	t
35	3	1	\N	\N	t
36	3	\N	7	\N	t
37	3	1	\N	\N	t
38	3	\N	7	\N	t
\.


--
-- Name: asignaciones_personal_id_asignacion_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.asignaciones_personal_id_asignacion_seq', 4, true);


--
-- Name: categorias_id_categoria_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.categorias_id_categoria_seq', 8, true);


--
-- Name: centros_id_centro_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.centros_id_centro_seq', 3, true);


--
-- Name: incidencias_id_incidencia_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.incidencias_id_incidencia_seq', 1, false);


--
-- Name: notificaciones_id_notificacion_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.notificaciones_id_notificacion_seq', 1, false);


--
-- Name: productos_id_producto_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.productos_id_producto_seq', 6, true);


--
-- Name: refresh_tokens_id_refresh_token_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.refresh_tokens_id_refresh_token_seq', 16, true);


--
-- Name: registro_movimientos_id_movimiento_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.registro_movimientos_id_movimiento_seq', 57, true);


--
-- Name: reglas_notificacion_id_regla_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.reglas_notificacion_id_regla_seq', 38, true);


--
-- Name: usuarios_id_usuario_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.usuarios_id_usuario_seq', 99, true);


--
-- PostgreSQL database dump complete
--

\unrestrict UqMLCOG9xuhmxmigySgBFihfiUPdppnt29NKcTVFlfP7kBK8NPlKxifU7SSRkUc

