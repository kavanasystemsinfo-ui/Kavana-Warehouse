// Kavana CleanStock Mobile — API Client
const BASE_URL = '/api/v1'

export interface ProductoInventario {
  id_centro: number
  id_producto: number
  cantidad_actual: number
  producto: {
    id_producto: number
    nombre_producto: string
    unidad_medida: string
    stock_minimo_alerta: number
  }
}

export interface CentroActivo {
  id_centro: number
  nombre_centro: string
  direccion?: string
}

export function isAuthenticated(): boolean {
  return !!getAccessToken()
}

// Token helpers
function getAccessToken(): string | null { return localStorage.getItem('access_token') }
function getRefreshToken(): string | null { return localStorage.getItem('refresh_token') }
function setTokens(token: string, refresh: string): void { localStorage.setItem('access_token', token); localStorage.setItem('refresh_token', refresh) }
export function clearTokens(): void { localStorage.removeItem('access_token'); localStorage.removeItem('refresh_token'); localStorage.removeItem('user') }
export function storeUser(u: { id_usuario: number; nombre: string; email: string; rol: string }): void { localStorage.setItem('user', JSON.stringify(u)) }
export function getStoredUser(): { id_usuario: number; nombre: string; email: string; rol: string } | null { try { return JSON.parse(localStorage.getItem('user') || 'null') } catch { return null } }

async function tryRefresh(): Promise<boolean> {
  const rt = getRefreshToken()
  if (!rt) return false
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: rt }) })
    if (!res.ok) { clearTokens(); return false }
    const data = await res.json()
    setTokens(data.token, data.refreshToken)
    return true
  } catch { clearTokens(); return false }
}

async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers as Record<string, string>) }
  if (token) headers['Authorization'] = `Bearer ${token}`
  let res: Response
  try { res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers }) }
  catch { throw new Error('Error de conexión') }
  if (res.status === 401 && getRefreshToken()) {
    if (await tryRefresh()) {
      headers['Authorization'] = `Bearer ${getAccessToken()}`
      try { res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers }) }
      catch { throw new Error('Error de conexión') }
    } else { clearTokens(); window.dispatchEvent(new Event('auth:unauthorized')); throw new Error('Sesión expirada') }
  }
  if (!res.ok) { const err = await res.json().catch(() => ({ error: 'Error desconocido' })); throw new Error(err.error || `HTTP ${res.status}`) }
  return res.json()
}

export async function login(email: string, password: string) {
  const res = await fetch(`${BASE_URL}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
  if (!res.ok) { const err = await res.json().catch(() => ({ error: 'Error al iniciar sesión' })); throw new Error(err.error) }
  const data = await res.json()
  setTokens(data.token, data.refreshToken || '')
  storeUser(data.usuario)
  return data
}

export function logout(): void { clearTokens() }

export async function getCentrosActivos(): Promise<CentroActivo[]> {
  const res = await apiFetch<{ centros: CentroActivo[] }>('/asignaciones/active')
  return res.centros || []
}

export async function getInventory(idCentro?: number) {
  const q = idCentro ? `?centro=${idCentro}` : ''
  const res = await apiFetch<{ inventario: ProductoInventario[] }>(`/stock/inventory${q}`)
  return res.inventario
}

// Recuento físico: setea la cantidad real del producto en el centro.
// El backend actualiza cantidad_actual y registra el histórico.
export async function guardarConteo(idCentro: number, idProducto: number, cantidad: number) {
  return apiFetch(`/inventario/${idCentro}/${idProducto}/conteo`, {
    method: 'POST',
    body: JSON.stringify({ stock_fisico: Math.max(0, Math.floor(cantidad)) }),
  })
}

export async function consumeStock(idProducto: number, cantidad: number) {
  return apiFetch('/stock/consume', { method: 'POST', body: JSON.stringify({ id_producto: idProducto, cantidad: Math.abs(cantidad) }) })
}

export async function createIncidencia(data: { id_centro: number; categoria: string; titulo: string; descripcion?: string }) {
  return apiFetch('/incidencias', { method: 'POST', body: JSON.stringify(data) })
}