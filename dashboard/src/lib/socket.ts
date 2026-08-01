// =============================================================================
// Kavana CleanStock Dashboard — Socket.IO Client
//   - Se conecta al servidor Socket.IO usando el token JWT almacenado
//   - Proporciona hooks y helpers para que los componentes se suscriban
//     a eventos en tiempo real (stock:consumed, stock:restocked, stock:alert)
//   - Los supervisores se unen a rooms de centros para recibir solo eventos
//     de los centros que les interesan
// =============================================================================

import { io, type Socket } from 'socket.io-client'

const SOCKET_URL = '' // Vacío = mismo origen que el dashboard (proxy nginx/vite)

export interface SocketUser {
  id_usuario: number
  nombre: string
}

export interface StockConsumedPayload {
  id_centro: number
  id_producto: number
  nombre_producto: string
  cantidad: number // negativa = consumo
  usuario: SocketUser
  cantidad_actual: number
  timestamp: string
}

export interface StockRestockedPayload {
  id_centro: number
  id_producto: number
  nombre_producto: string
  cantidad: number // positiva = reposición
  usuario: SocketUser
  cantidad_actual: number
  timestamp: string
}

export interface StockAlertPayload extends StockConsumedPayload {
  tipo: 'critica' | 'advertencia'
  stock_minimo_alerta: number
  deficit: number
}

type EventHandler = (...args: unknown[]) => void

let socket: Socket | null = null
const listeners = new Map<string, Set<EventHandler>>()

// ---------------------------------------------------------------------------
// getAccessToken — Obtiene el token JWT del localStorage (misma key que api.ts)
// ---------------------------------------------------------------------------
function getAccessToken(): string | null {
  return localStorage.getItem('dashboard_access_token')
}

// ---------------------------------------------------------------------------
// connect — Inicia o reutiliza la conexión Socket.IO
//   Se conecta automáticamente si hay token. Si ya está conectado, no hace nada.
// ---------------------------------------------------------------------------
export function connect(): Socket | null {
  const token = getAccessToken()
  if (!token) return null

  if (socket?.connected) return socket

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    autoConnect: true,
  })

  socket.on('connect', () => {
    console.info('[Socket.IO] Conectado. socketId:', socket?.id)
    // Re-vincular todos los listeners guardados
    listeners.forEach((handlers, event) => {
      handlers.forEach((handler) => {
        socket?.on(event, handler)
      })
    })
  })

  socket.on('disconnect', (reason) => {
    console.info('[Socket.IO] Desconectado. Razón:', reason)
  })

  socket.on('connect_error', (err) => {
    console.warn('[Socket.IO] Error de conexión:', err.message)
  })

  return socket
}

// ---------------------------------------------------------------------------
// disconnect — Cierra la conexión Socket.IO
// ---------------------------------------------------------------------------
export function disconnect(): void {
  if (socket) {
    socket.removeAllListeners()
    socket.disconnect()
    socket = null
    listeners.clear()
    console.info('[Socket.IO] Desconectado manualmente.')
  }
}

// ---------------------------------------------------------------------------
// joinCentro — El cliente se suscribe a eventos de un centro específico
//   El servidor añade el socket al room "centro:{id}"
// ---------------------------------------------------------------------------
export function joinCentro(centroId: number): void {
  if (socket?.connected) {
    socket.emit('join:centro', centroId)
  }
}

// ---------------------------------------------------------------------------
// leaveCentro — El cliente abandona la suscripción a un centro
// ---------------------------------------------------------------------------
export function leaveCentro(centroId: number): void {
  if (socket?.connected) {
    socket.emit('leave:centro', centroId)
  }
}

// ---------------------------------------------------------------------------
// subscribe — Registra un listener para un evento Socket.IO
//   Devuelve una función de limpieza (unsubscribe).
// ---------------------------------------------------------------------------
export function subscribe(event: string, handler: EventHandler): () => void {
  if (!listeners.has(event)) {
    listeners.set(event, new Set())
  }
  listeners.get(event)!.add(handler)

  // Si el socket ya está conectado, vincular ahora
  if (socket?.connected) {
    socket.on(event, handler)
  }

  // Devolver función de limpieza
  return () => {
    listeners.get(event)?.delete(handler)
    socket?.off(event, handler)
  }
}

// ---------------------------------------------------------------------------
// isConnected — Indica si el socket está conectado
// ---------------------------------------------------------------------------
export function isConnected(): boolean {
  return socket?.connected ?? false
}

// ---------------------------------------------------------------------------
// getSocket — Retorna la instancia del socket (para uso avanzado)
// ---------------------------------------------------------------------------
export function getSocket(): Socket | null {
  return socket
}