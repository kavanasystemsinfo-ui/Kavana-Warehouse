// Kavana CleanStock Dashboard — API Client
// Handles JWT auth, refresh token rotation

const BASE_URL = '/api/v1'

export interface AuthResponse {
  token: string
  refreshToken: string
  usuario: Usuario
}

export interface Usuario {
  id_usuario: number
  nombre: string
  email: string
  rol: 'limpiador' | 'supervisor' | 'admin'
  estado: string
}

export interface Centro {
  id_centro: number
  nombre_centro: string
  direccion?: string
}

export interface Producto {
  id_producto: number
  nombre_producto: string
  unidad_medida: string
  stock_minimo_alerta: number
}

export interface InventarioItem {
  id_centro: number
  id_producto: number
  cantidad_actual: number
  producto: Producto
  centro?: Centro
}

export interface Asignacion {
  id_asignacion: number
  id_usuario: number
  id_centro: number
  fecha_inicio: string
  fecha_fin: string | null
  usuario?: { id_usuario: number; nombre: string; email: string; rol: string }
  centro?: { id_centro: number; nombre_centro: string }
}

export interface ConsumptionData {
  total_consumo_unidades: number
  total_gasto_euros: number
  total_movimientos: number
  resumen_por_centro: Array<{
    centro: { id_centro: number; nombre_centro: string; presupuesto_mensual: number }
    presupuesto_mensual: number
    total_consumo_unidades: number
    gasto_total_euros: number
    movimientos: number
    porcentaje_consumido: number
    productos: Array<{
      id_producto: number
      nombre_producto: string
      unidad_medida: string
      coste_unitario: number
      cantidad: number
      gasto_euros: number
    }>
  }>
  movimientos: Array<{
    id_movimiento: number
    id_centro: number
    id_producto: number
    id_usuario: number
    cantidad: number
    fecha_hora: string
    gasto_euros: number
    producto: { id_producto: number; nombre_producto: string; unidad_medida: string; coste_unitario: number }
    centro: { id_centro: number; nombre_centro: string; presupuesto_mensual: number }
    usuario: { id_usuario: number; nombre: string }
  }>
}

export interface AlertsData {
  total_alertas: number
  criticas: Array<AlertItem>
  advertencias: Array<AlertItem>
}

export interface AlertItem {
  id_centro: number
  centro: string
  id_producto: number
  producto: string
  unidad_medida: string
  cantidad_actual: number
  stock_minimo_alerta: number
  deficit: number
}

// Token storage
function getAccessToken(): string | null {
  return localStorage.getItem('dashboard_access_token')
}
function getRefreshToken(): string | null {
  return localStorage.getItem('dashboard_refresh_token')
}
function setTokens(token: string, refreshToken: string): void {
  localStorage.setItem('dashboard_access_token', token)
  localStorage.setItem('dashboard_refresh_token', refreshToken)
}
export function clearTokens(): void {
  localStorage.removeItem('dashboard_access_token')
  localStorage.removeItem('dashboard_refresh_token')
  localStorage.removeItem('dashboard_user')
}
export function storeUser(user: Usuario): void {
  localStorage.setItem('dashboard_user', JSON.stringify(user))
}
export function getStoredUser(): Usuario | null {
  const raw = localStorage.getItem('dashboard_user')
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

// Refresh token with rotation
async function tryRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) {
      clearTokens()
      return false
    }
    const data: { token: string; refreshToken: string } = await res.json()
    setTokens(data.token, data.refreshToken)
    return true
  } catch {
    clearTokens()
    return false
  }
}

// Core fetch with JWT auth + auto-refresh
export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAccessToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  let res: Response
  try {
    res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers })
  } catch (error) {
    throw new Error('Error de conexión. Por favor, inténtalo de nuevo cuando tengas cobertura.')
  }

  if (res.status === 401) {
    let refreshed = false
    if (getRefreshToken()) {
      refreshed = await tryRefresh()
    }
    if (refreshed) {
      headers['Authorization'] = `Bearer ${getAccessToken()}`
      try {
        res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers })
      } catch (error) {
        throw new Error('Error de conexión. Por favor, inténtalo de nuevo cuando tengas cobertura.')
      }
    } else {
      clearTokens()
      localStorage.setItem('auth_error', 'Su sesión ha expirado. Por favor, inicie sesión de nuevo.')
      window.dispatchEvent(new Event('auth:unauthorized'))
      throw new Error('Su sesión ha expirado. Por favor, inicie sesión de nuevo.')
    }
  }

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ error: 'Error de conexión' }))
    throw new Error(errorBody.error || `HTTP ${res.status}`)
  }

  return res.json() as Promise<T>
}

// --- Auth ---
export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Credenciales inválidas' }))
    throw new Error(err.error || 'Error al iniciar sesión')
  }
  const data: AuthResponse = await res.json()
  setTokens(data.token, data.refreshToken)
  storeUser(data.usuario)
  return data
}

export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken()
  try {
    await apiFetch('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    })
  } catch {
    // Ignore
  }
  clearTokens()
}

// --- Dashboard ---
export async function getConsumption(filters?: {
  centro?: number
  producto?: number
  desde?: string
  hasta?: string
}): Promise<ConsumptionData> {
  const params = new URLSearchParams()
  if (filters?.centro) params.set('centro', String(filters.centro))
  if (filters?.producto) params.set('producto', String(filters.producto))
  if (filters?.desde) params.set('desde', filters.desde)
  if (filters?.hasta) params.set('hasta', filters.hasta)
  const qs = params.toString()
  return apiFetch<ConsumptionData>(`/dashboard/consumption${qs ? `?${qs}` : ''}`)
}

export async function getAlerts(): Promise<AlertsData> {
  return apiFetch<AlertsData>('/dashboard/alerts')
}

// --- Asignaciones ---
export async function getAsignaciones(): Promise<Asignacion[]> {
  const res = await apiFetch<{ asignaciones: Asignacion[] }>('/asignaciones')
  return res.asignaciones
}

export async function createAsignacion(data: {
  id_usuario: number
  id_centro: number
  fecha_inicio: string
  fecha_fin?: string | null
}): Promise<Asignacion> {
  const res = await apiFetch<{ asignacion: Asignacion }>('/asignaciones', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return res.asignacion
}

export async function updateAsignacion(
  id: number,
  data: {
    id_centro?: number
    fecha_inicio?: string
    fecha_fin?: string | null
  }
): Promise<Asignacion> {
  const res = await apiFetch<{ asignacion: Asignacion }>(`/asignaciones/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  return res.asignacion
}

// --- Stock ---
export async function getInventory(centroId?: number): Promise<InventarioItem[]> {
  const qs = centroId ? `?centro=${centroId}` : ''
  const res = await apiFetch<{ inventario: InventarioItem[] }>(`/stock/inventory${qs}`)
  return res.inventario
}

export async function restock(data: {
  id_centro: number
  id_producto: number
  cantidad: number
}): Promise<{ message: string }> {
  return apiFetch('/stock/restock', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function registerUser(data: {
  nombre: string
  email: string
  password: string
  rol: 'limpiador' | 'supervisor' | 'admin'
}): Promise<{ message: string; usuario: Usuario }> {
  return apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function getUsuarios(): Promise<{ id_usuario: number; nombre: string; email: string; rol: string }[]> {
  const res = await apiFetch<{ usuarios: { id_usuario: number; nombre: string; email: string; rol: string }[] }>('/asignaciones/users')
  return res.usuarios
}

export async function getCentros(): Promise<Centro[]> {
  const res = await apiFetch<{ centros: Centro[] }>('/stock/centros')
  return res.centros
}

export async function getProductos(): Promise<Producto[]> {
  const inv = await getInventory()
  const seen = new Set<number>()
  const productos: Producto[] = []
  for (const item of inv) {
    if (!seen.has(item.producto.id_producto)) {
      seen.add(item.producto.id_producto)
      productos.push(item.producto)
    }
  }
  return productos
}

// --- Deviations ---
export interface DeviationItem {
  centro: { id_centro: number; nombre_centro: string }
  producto: { id_producto: number; nombre_producto: string; unidad_medida: string; coste_unitario: number }
  consumo_teorico: number
  consumo_real: number
  desviacion: number
  porcentaje_consumido: number
  coste_desviacion: number
  estado: 'exceso' | 'infraconsumo' | 'normal'
}

export interface DeviationsData {
  mes: string
  total_desviaciones: number
  desviaciones: DeviationItem[]
}

export async function getDeviations(filters?: { centro?: number; mes?: string }): Promise<DeviationsData> {
  const params = new URLSearchParams()
  if (filters?.centro) params.set('centro', String(filters.centro))
  if (filters?.mes) params.set('mes', filters.mes)
  const qs = params.toString()
  return apiFetch<DeviationsData>(`/dashboard/deviations${qs ? `?${qs}` : ''}`)
}

// --- Incidencias ---
export interface Incidencia {
  id_incidencia: number
  id_centro: number
  id_usuario: number
  categoria: string
  titulo: string
  descripcion: string
  foto_url: string | null
  estado: string
  fecha_creacion: string
  centro: { id_centro: number; nombre_centro: string }
  usuario: { id_usuario: number; nombre: string }
}

export async function getIncidencias(filters?: { centro?: number; estado?: string; categoria?: string }): Promise<{ total: number; incidencias: Incidencia[] }> {
  const params = new URLSearchParams()
  if (filters?.centro) params.set('centro', String(filters.centro))
  if (filters?.estado) params.set('estado', filters.estado)
  if (filters?.categoria) params.set('categoria', filters.categoria)
  const qs = params.toString()
  return apiFetch(`/incidencias${qs ? `?${qs}` : ''}`)
}

export async function updateIncidencia(id: number, data: { estado: string }): Promise<{ message: string; incidencia: Incidencia }> {
  return apiFetch(`/incidencias/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

// --- Purchases ---
export interface PurchaseProposal {
  fecha_generacion: string
  total_articulos: number
  total_unidades: number
  total_coste_estimado: number
  propuestas: Array<{
    centro: { id_centro: number; nombre_centro: string }
    producto: { id_producto: number; nombre_producto: string; unidad_medida: string; coste_unitario: number }
    stock_actual: number
    stock_minimo: number
    deficit: number
    cantidad_pedido: number
    coste_estimado: number
  }>
}

export async function getPurchaseProposal(centroId?: number): Promise<PurchaseProposal> {
  const qs = centroId ? `?centro=${centroId}` : ''
  return apiFetch<PurchaseProposal>(`/purchases/proposal${qs}`)
}

// --- Notifications ---
export interface Notificacion {
  id_notificacion: number
  id_usuario: number
  titulo: string
  mensaje: string
  leida: boolean
  fecha_creacion: string
}

export interface ReglaNotificacion {
  id_regla: number
  id_supervisor: number
  id_centro: number | null
  id_operario: number | null
  id_producto: number | null
  activa: boolean
  centro: { id_centro: number; nombre_centro: string } | null
  operario: { id_usuario: number; nombre: string } | null
  producto: { id_producto: number; nombre_producto: string } | null
}

export async function getNotifications(): Promise<{ notificaciones: Notificacion[] }> {
  return apiFetch('/notifications')
}

export async function markNotificationRead(id: number): Promise<{ success: boolean }> {
  return apiFetch(`/notifications/${id}/read`, { method: 'PUT' })
}

export async function getNotificationRules(): Promise<{ reglas: ReglaNotificacion[] }> {
  return apiFetch('/notifications/rules')
}

export async function createNotificationRule(data: { id_centro?: number; id_operario?: number; id_producto?: number }): Promise<{ message: string; regla: ReglaNotificacion }> {
  return apiFetch('/notifications/rules', { method: 'POST', body: JSON.stringify(data) })
}

export async function deleteNotificationRule(id: number): Promise<{ success: boolean }> {
  return apiFetch(`/notifications/rules/${id}`, { method: 'DELETE' })
}