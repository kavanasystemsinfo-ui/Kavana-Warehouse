// =============================================================================
// Kavana CleanStock — Swagger/OpenAPI Configuration
// =============================================================================

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Kavana CleanStock API',
      version: '4.0.0',
      description: `API REST para la gestión de stock y personal en Facility Management.

## Contexto de Marca
Extensión del ecosistema Kavana enfocado en la gestión de stock y personal para empresas de limpieza profesional.

## Flujo Crítico del Limpiador
**< 10 segundos y 3 clics:** Login → Centro automático → Restar stock → Confirmar`,
      contact: {
        name: 'Kavana CleanStock',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Local development server (API on port 3000 via .env)',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Access token (JWT) — 15 min de validez. Usar POST /auth/refresh para renovar.',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', description: 'Mensaje de error descriptivo' },
          },
        },
        LoginInput: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'carlos@kavana.com' },
            password: { type: 'string', minLength: 6, example: '123456' },
          },
        },
        RegisterInput: {
          type: 'object',
          required: ['nombre', 'email', 'password'],
          properties: {
            nombre: { type: 'string', example: 'Nuevo Usuario' },
            email: { type: 'string', format: 'email', example: 'nuevo@kavana.com' },
            password: { type: 'string', minLength: 6, example: '123456' },
            rol: { type: 'string', enum: ['limpiador', 'supervisor', 'admin'], default: 'limpiador' },
          },
        },
        RefreshInput: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: { type: 'string', example: 'a1b2c3d4...' },
          },
        },
        LogoutInput: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: { type: 'string', example: 'a1b2c3d4...' },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            token: { type: 'string', description: 'JWT access token (15 min)' },
            refreshToken: { type: 'string', description: 'Refresh token (30 días, rotación)' },
            usuario: {
              type: 'object',
              properties: {
                id_usuario: { type: 'integer' },
                nombre: { type: 'string' },
                email: { type: 'string' },
                rol: { type: 'string', enum: ['limpiador', 'supervisor', 'admin'] },
                estado: { type: 'string', enum: ['activo', 'baja_medica', 'inactivo'] },
              },
            },
          },
        },
        ConsumeStockInput: {
          type: 'object',
          required: ['id_producto', 'cantidad'],
          properties: {
            id_producto: { type: 'integer', example: 1 },
            cantidad: { type: 'integer', example: -2, description: 'Cantidad negativa (consumo)' },
            id_centro: { type: 'integer', example: 1, description: 'Opcional. Se resuelve automático desde asignación si no se provee.' },
          },
        },
        RestockInput: {
          type: 'object',
          required: ['id_producto', 'cantidad', 'id_centro'],
          properties: {
            id_producto: { type: 'integer', example: 1 },
            cantidad: { type: 'integer', example: 10, description: 'Cantidad positiva (reposición)' },
            id_centro: { type: 'integer', example: 1 },
          },
        },
        CreateAsignacionInput: {
          type: 'object',
          required: ['id_usuario', 'id_centro', 'fecha_inicio'],
          properties: {
            id_usuario: { type: 'integer', example: 1 },
            id_centro: { type: 'integer', example: 1 },
            fecha_inicio: { type: 'string', format: 'date', example: '2026-07-01' },
            fecha_fin: { type: 'string', format: 'date', example: '2026-08-01', nullable: true, description: 'NULL = asignación indefinida' },
          },
        },
        UpdateAsignacionInput: {
          type: 'object',
          minProperties: 1,
          properties: {
            fecha_inicio: { type: 'string', format: 'date', example: '2026-07-15' },
            fecha_fin: { type: 'string', format: 'date', example: '2026-09-01', nullable: true },
          },
        },
        InventarioItem: {
          type: 'object',
          properties: {
            id_centro: { type: 'integer' },
            id_producto: { type: 'integer' },
            cantidad_actual: { type: 'integer' },
            producto: {
              type: 'object',
              properties: {
                id_producto: { type: 'integer' },
                nombre_producto: { type: 'string' },
                unidad_medida: { type: 'string' },
                stock_minimo_alerta: { type: 'integer' },
              },
            },
            centro: {
              type: 'object',
              properties: {
                id_centro: { type: 'integer' },
                nombre_centro: { type: 'string' },
              },
            },
          },
        },
        Asignacion: {
          type: 'object',
          properties: {
            id_asignacion: { type: 'integer' },
            id_usuario: { type: 'integer' },
            id_centro: { type: 'integer' },
            fecha_inicio: { type: 'string', format: 'date' },
            fecha_fin: { type: 'string', format: 'date', nullable: true },
            usuario: {
              type: 'object',
              properties: {
                id_usuario: { type: 'integer' },
                nombre: { type: 'string' },
                email: { type: 'string' },
                rol: { type: 'string' },
              },
            },
            centro: {
              type: 'object',
              properties: {
                id_centro: { type: 'integer' },
                nombre_centro: { type: 'string' },
              },
            },
          },
        },
        AlertaCritica: {
          type: 'object',
          properties: {
            id_centro: { type: 'integer' },
            centro: { type: 'string' },
            id_producto: { type: 'integer' },
            producto: { type: 'string' },
            unidad_medida: { type: 'string' },
            cantidad_actual: { type: 'integer' },
            stock_minimo_alerta: { type: 'integer' },
            deficit: { type: 'integer' },
          },
        },
      },
    },
    paths: {
      '/health': {
        get: {
          tags: ['System'],
          summary: 'Health check',
          description: 'Verifica que el servidor está operativo.',
          responses: {
            200: {
              description: 'Server is healthy',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'ok' },
                      timestamp: { type: 'string', format: 'date-time' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/v1/auth/login': {
        post: {
          tags: ['Authentication'],
          summary: 'Iniciar sesión',
          description: 'Autentica al usuario y devuelve JWT + refresh token. El access token expira en 15 min, usar /refresh para renovar.',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginInput' } } },
          },
          responses: {
            200: { description: 'Login exitoso', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
            401: { description: 'Credenciales inválidas', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            403: { description: 'Usuario en baja médica o inactivo', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/v1/auth/register': {
        post: {
          tags: ['Authentication'],
          summary: 'Registrar nuevo usuario (admin)',
          description: 'Crea un nuevo usuario. Requiere rol admin.',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterInput' } } },
          },
          responses: {
            201: { description: 'Usuario creado exitosamente', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
            409: { description: 'El email ya está registrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/v1/auth/verify': {
        get: {
          tags: ['Authentication'],
          summary: 'Verificar token',
          description: 'Verifica que el JWT es válido y devuelve datos del usuario.',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Token válido', content: { 'application/json': { schema: { type: 'object', properties: { usuario: { type: 'object' } } } } } },
            401: { description: 'Token inválido o expirado' },
          },
        },
      },
      '/api/v1/auth/refresh': {
        post: {
          tags: ['Authentication'],
          summary: 'Rotar refresh token',
          description: 'Revoca el refresh token actual y emite uno nuevo junto con un nuevo JWT. Previene replay attacks.',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/RefreshInput' } } },
          },
          responses: {
            200: { description: 'Tokens rotados exitosamente', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
            401: { description: 'Refresh token inválido, expirado o revocado' },
          },
        },
      },
      '/api/v1/auth/logout': {
        post: {
          tags: ['Authentication'],
          summary: 'Cerrar sesión',
          description: 'Revoca el refresh token inmediatamente. Requiere autenticación.',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/LogoutInput' } } },
          },
          responses: {
            200: { description: 'Sesión cerrada exitosamente' },
          },
        },
      },
      '/api/v1/stock/inventory': {
        get: {
          tags: ['Stock'],
          summary: 'Obtener inventario',
          description: 'Devuelve todo el inventario, filtrable por centro.',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'centro', in: 'query', schema: { type: 'integer' }, description: 'Filtrar por ID de centro (opcional)' },
          ],
          responses: {
            200: {
              description: 'Lista de inventario',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      inventario: { type: 'array', items: { $ref: '#/components/schemas/InventarioItem' } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/v1/stock/consume': {
        post: {
          tags: ['Stock'],
          summary: 'Consumir stock',
          description: 'Registra un consumo de stock. Si es limpiador, resuelve el centro activo automáticamente desde su asignación.',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ConsumeStockInput' } } },
          },
          responses: {
            200: { description: 'Consumo registrado exitosamente' },
            400: { description: 'Stock insuficiente' },
            403: { description: 'No tienes un centro activo' },
            404: { description: 'Producto no encontrado' },
          },
        },
      },
      '/api/v1/stock/restock': {
        post: {
          tags: ['Stock'],
          summary: 'Reponer stock (supervisor+)',
          description: 'Registra una reposición de stock. Requiere rol supervisor o admin.',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/RestockInput' } } },
          },
          responses: {
            200: { description: 'Reposición registrada exitosamente' },
            404: { description: 'Producto o centro no encontrado' },
          },
        },
      },
      '/api/v1/stock/alerts': {
        get: {
          tags: ['Stock'],
          summary: 'Alertas de stock mínimo',
          description: 'Devuelve los productos cuyo stock actual está por debajo del umbral configurado (stock_minimo_alerta).',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'centro', in: 'query', schema: { type: 'integer' }, description: 'Filtrar por ID de centro (opcional)' },
          ],
          responses: {
            200: {
              description: 'Alertas de stock',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      alerts: { type: 'array', items: { $ref: '#/components/schemas/InventarioItem' } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/v1/asignaciones/active': {
        get: {
          tags: ['Asignaciones'],
          summary: 'Centro activo del usuario',
          description: 'Devuelve la asignación activa del usuario autenticado según la fecha actual. Resuelve automáticamente según fecha_inicio <= TODAY <= fecha_fin (o fecha_fin IS NULL).',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Asignación activa encontrada', content: { 'application/json': { schema: { type: 'object', properties: { asignacion: { $ref: '#/components/schemas/Asignacion' } } } } } },
            404: { description: 'No tienes un centro activo' },
          },
        },
      },
      '/api/v1/asignaciones': {
        get: {
          tags: ['Asignaciones'],
          summary: 'Listar asignaciones',
          description: 'Lista todas las asignaciones de personal. Filtrable por usuario y/o centro.',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'usuario', in: 'query', schema: { type: 'integer' }, description: 'Filtrar por ID de usuario (opcional)' },
            { name: 'centro', in: 'query', schema: { type: 'integer' }, description: 'Filtrar por ID de centro (opcional)' },
          ],
          responses: {
            200: {
              description: 'Lista de asignaciones',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      asignaciones: { type: 'array', items: { $ref: '#/components/schemas/Asignacion' } },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ['Asignaciones'],
          summary: 'Crear asignación (supervisor+)',
          description: 'Asigna un usuario a un centro en un período de fechas. Si fecha_fin es NULL, la asignación es indefinida.',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateAsignacionInput' } } },
          },
          responses: {
            201: { description: 'Asignación creada exitosamente' },
            404: { description: 'Usuario o centro no encontrado' },
            409: { description: 'El usuario ya tiene una asignación en el período' },
          },
        },
      },
      '/api/v1/asignaciones/{id}': {
        put: {
          tags: ['Asignaciones'],
          summary: 'Actualizar asignación (supervisor+)',
          description: 'Actualiza las fechas de una asignación existente. Se debe proporcionar al menos un campo.',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'integer' }, description: 'ID de la asignación' },
          ],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateAsignacionInput' } } },
          },
          responses: {
            200: { description: 'Asignación actualizada exitosamente' },
            400: { description: 'Debe proporcionar al menos un campo' },
            404: { description: 'Asignación no encontrada' },
          },
        },
      },
      '/api/v1/dashboard/consumption': {
        get: {
          tags: ['Dashboard'],
          summary: 'Consumo analítico (supervisor+)',
          description: 'Devuelve datos de consumo agrupados por centro y producto, con filtros por centro, producto y período de fechas. Los movimientos se limitan a los últimos 100.',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'centro', in: 'query', schema: { type: 'integer' }, description: 'Filtrar por ID de centro (opcional)' },
            { name: 'producto', in: 'query', schema: { type: 'integer' }, description: 'Filtrar por ID de producto (opcional)' },
            { name: 'desde', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Fecha inicial YYYY-MM-DD (opcional)' },
            { name: 'hasta', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Fecha final YYYY-MM-DD (opcional)' },
          ],
          responses: {
            200: {
              description: 'Datos de consumo',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      total_consumo: { type: 'integer' },
                      total_movimientos: { type: 'integer' },
                      resumen_por_centro: { type: 'array', items: { type: 'object' } },
                      movimientos: { type: 'array', items: { type: 'object' } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/v1/dashboard/alerts': {
        get: {
          tags: ['Dashboard'],
          summary: 'Alertas críticas de stock (supervisor+)',
          description: 'Devuelve alertas de stock separadas en críticas (stock <= 0) y advertencias (stock por debajo del mínimo). Incluye déficit calculado.',
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: 'Alertas de stock',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      total_alertas: { type: 'integer' },
                      criticas: { type: 'array', items: { $ref: '#/components/schemas/AlertaCritica' } },
                      advertencias: { type: 'array', items: { $ref: '#/components/schemas/AlertaCritica' } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: [],
};

module.exports = swaggerJsdoc(options);
