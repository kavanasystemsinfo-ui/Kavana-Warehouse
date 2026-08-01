// =============================================================================
// CleanStock API — Input Validation Middleware (Zod)
// =============================================================================
// Centraliza la validación de schemas en endpoints críticos (POST/PUT).
// Uso: router.post('/ruta', validate(loginSchema), handler)
// =============================================================================

const { z } = require('zod');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Middleware factory: valida req.body contra un schema Zod.
 * Si falla, responde 400 con los errores formateados.
 * Si pasa, reemplaza req.body con el objeto parseado (tipado y saneado).
 */
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      const first = Object.values(errors).flat()[0] || 'Datos inválidos';
      return res.status(400).json({ error: first, details: errors });
    }
    req.body = result.data;
    next();
  };
}

/**
 * Middleware factory: valida req.params contra un schema Zod.
 */
function validateParams(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      const first = Object.values(errors).flat()[0] || 'Parámetros inválidos';
      return res.status(400).json({ error: first, details: errors });
    }
    req.params = result.data;
    next();
  };
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email requerido' })
    .email('Email inválido'),
  password: z
    .string({ required_error: 'Contraseña requerida' })
    .min(4, 'La contraseña debe tener al menos 4 caracteres'),
});

const registerSchema = z.object({
  nombre: z
    .string({ required_error: 'Nombre requerido' })
    .min(2, 'Nombre demasiado corto'),
  email: z
    .string({ required_error: 'Email requerido' })
    .email('Email inválido'),
  password: z
    .string({ required_error: 'Contraseña requerida' })
    .min(6, 'La contraseña debe tener al menos 6 caracteres'),
  rol: z
    .enum(['limpiador', 'supervisor', 'admin'], {
      errorMap: () => ({ message: 'Rol inválido (limpiador/supervisor/admin)' }),
    }),
});

const centroSchema = z.object({
  nombre: z
    .string({ required_error: 'Nombre del centro requerido' })
    .min(2, 'Nombre demasiado corto'),
  direccion: z.string().optional(),
  telefono: z.string().optional(),
});

const presupuestoSchema = z.object({
  presupuesto_mensual: z
    .number({ required_error: 'Presupuesto mensual requerido' })
    .positive('Debe ser un número positivo'),
});

const categoríaSchema = z.object({
  nombre: z
    .string({ required_error: 'Nombre requerido' })
    .min(2, 'Nombre demasiado corto'),
  icono: z.string().optional(),
  descripcion: z.string().optional(),
});

module.exports = {
  validate,
  validateParams,
  loginSchema,
  registerSchema,
  centroSchema,
  presupuestoSchema,
  categoríaSchema,
};
