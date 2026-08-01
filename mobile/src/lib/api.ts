// Kavana CleanStock Mobile — API Client
// Handles JWT auth, refresh token rotation, and offline queue

const BASE_URL = '/api/v1'

export interface AuthResponse {
  token: string
  refreshToken: string
  usuario: {
    id_usuario: number
    nombre: string
    email: string
    rol: 'limpiador' | 'supervisor' | 'admin'
    estado: string
  }
}

export interface CentroActivo {
  id_centro: number
  nombre_centro: string
  direccion?: string
}

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

export interface ConsumoResponse {
  message: string
  inventario: ProductoInventario
  movimiento: {
    id_movimiento: number
    cantidad: number
    fecha_hora: string
  }
}

interface RefreshResponse {
  token: string
  refreshToken: string
}

// Token storage helpers
function getAccessToken(): string | null {
  return localStorage.getItem('access_token')
}

function getRefreshToken(): string | null {
  return localStorage.getItem('refresh_token')
}

function setTokens(token: string, refreshToken: string): void {
  localStorage.setItem('access_token', token)
  localStorage.setItem('refresh_token', refreshToken)
}

export function clearTokens(): void {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user')
}

export function storeUser(user: AuthResponse['usuario']): void {
  localStorage.setItem('user', JSON.stringify(user))
}

export function getStoredUser(): AuthResponse['usuario'] | null {
  const raw = localStorage.getItem('user')
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function isAuthenticated(): boolean {
  return !!getAccessToken() && !!getStoredUser()
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
    const data: RefreshResponse = await res.json()
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
    res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    })
  } catch (error) {
    throw new Error('Error de conexión. Por favor, inténtalo de nuevo cuando tengas cobertura.')
  }

  // If 401, try refreshing the token
  if (res.status === 401) {
    let refreshed = false
    if (getRefreshToken()) {
      refreshed = await tryRefresh()
    }
    if (refreshed) {
      const newToken = getAccessToken()
      headers['Authorization'] = `Bearer ${newToken}`
      try {
        res = await fetch(`${BASE_URL}${endpoint}`, {
          ...options,
          headers,
        })
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
    const errorBody = await res.json().catch(() => ({ error: 'Error desconocido' }))
    throw new Error(errorBody.error || `HTTP ${res.status}`)
  }

  return res.json() as Promise<T>
}

// --- API Methods ---

export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error al iniciar sesión' }))
    throw new Error(err.error || 'Error al iniciar sesión')
  }
  const loginData: AuthResponse = await res.json()
  setTokens(loginData.token, loginData.refreshToken)
  storeUser(loginData.usuario)
  return loginData
}

export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken()
  try {
    await apiFetch('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    })
  } catch {
    // Ignore errors on logout
  }
  clearTokens()
}

export async function getCentroActivo(): Promise<CentroActivo> {
  const res = await apiFetch<{ asignacion: { centro: CentroActivo } }>('/asignaciones/active')
  return res.asignacion.centro
}

export async function getInventory(
  idCentro?: number
): Promise<ProductoInventario[]> {
  const query = idCentro ? `?centro=${idCentro}` : ''
  const res = await apiFetch<{ inventario: ProductoInventario[] }>(`/stock/inventory${query}`)
  return res.inventario
}

export async function consumeStock(
  idProducto: number,
  cantidad: number,
  offlineId?: string
): Promise<ConsumoResponse> {
  const body: Record<string, unknown> = {
    id_producto: idProducto,
    cantidad: Math.abs(cantidad),
  }
  if (offlineId) body.offline_id = offlineId
  return apiFetch<ConsumoResponse>('/stock/consume', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

// --- Incidencias ---
export async function createIncidencia(data: {
  id_centro: number;
  categoria: string;
  titulo: string;
  descripcion?: string;
  foto_url?: string;
}): Promise<{ message: string }> {
  return apiFetch('/incidencias', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}