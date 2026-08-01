// =============================================================================
// Kavana CleanOps — Zod Validation Middleware
//   Valida el cuerpo de la solicitud contra un esquema Zod antes de
//   llegar al controlador.
//   Uso: router.post('/ruta', validate(zodSchema), handler)
// =============================================================================

const { z } = require('zod');
const logger = require('../lib/logger');

/**
 * Middleware factory: valida req.body contra un esquema Zod.
 * Si falla, devuelve 400 con los errores detallados.
 * Si pasa, reemplaza req.body con los datos parseados (tipos seguros).
 */
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map((e) => ({
          campo: e.path.join('.'),
          mensaje: e.message,
        }));
      logger.warn('Validación fallida', {
        url: req.originalUrl,
        errors,
        body: req.body,
      });
      return res.status(400).json({
        error: 'Datos de entrada inválidos.',
        detalles: errors,
      });
    }
    // Reemplazar body con datos parseados (tipos seguros)
    req.body = result.data;
    next();
  };
}

// =============================================================================
// Schemas compartidos
// =============================================================================

// --- Auth ---
const loginSchema = z.object({
  email: z.string().email('Email inválido.'),
  password: z.string().min(1, 'La contraseña es requerida.'),
});

const registerSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido.').max(100),
  email: z.string().email('Email inválido.'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.'),
  rol: z.enum(['limpiador', 'supervisor', 'admin']).optional(),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token requerido.'),
});

// --- Stock ---
const consumeStockSchema = z.object({
  id_producto: z.number().int().positive('id_producto debe ser un entero positivo.'),
  cantidad: z.number().int().positive('cantidad debe ser un entero positivo para consumo.'),
  id_centro: z.number().int().positive().optional(),
});

const restockSchema = z.object({
  id_producto: z.number().int().positive('id_producto debe ser un entero positivo.'),
  cantidad: z.number().int().positive('cantidad debe ser positiva para reposición.'),
  id_centro: z.number().int().positive('id_centro debe ser un entero positivo.'),
});

// --- Asignaciones ---
const createAsignacionSchema = z.object({
  id_usuario: z.number().int().positive(),
  id_centro: z.number().int().positive(),
  fecha_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'fecha_inicio debe ser YYYY-MM-DD.'),
  fecha_fin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'fecha_fin debe ser YYYY-MM-DD.').nullable().optional(),
});

const updateAsignacionSchema = z.object({
  fecha_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'fecha_inicio debe ser YYYY-MM-DD.').optional(),
  fecha_fin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'fecha_fin debe ser YYYY-MM-DD.').nullable().optional(),
}).refine(
  (data) => data.fecha_inicio !== undefined || data.fecha_fin !== undefined,
  { message: 'Debe proporcionar al menos un campo a actualizar.' },
);

module.exports = {
  validate,
  loginSchema,
  registerSchema,
  refreshSchema,
  consumeStockSchema,
  restockSchema,
  createAsignacionSchema,
  updateAsignacionSchema,
};