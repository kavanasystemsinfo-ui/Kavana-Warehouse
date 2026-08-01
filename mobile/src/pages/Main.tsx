// Kavana CleanStock Mobile — Main Dashboard
// Shows active center and inventory, allows quick consumption
// 3-click flow: Login → Centro → Restar stock → Confirmar

import { useState, useEffect, useCallback } from 'react'
import {
  getCentroActivo,
  getInventory,
  consumeStock,
  createIncidencia,
  logout,
  getStoredUser,
  clearTokens,
  type CentroActivo,
  type ProductoInventario,
} from '../lib/api'
import {
  cacheCentroActivo,
  cacheInventory,
  getCachedCentroActivo,
  getCachedInventory,
  addPendingConsumption,
  getPendingConsumptions,
  updateCachedInventoryItem,
  removePendingConsumption,
} from '../lib/db'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import './Main.css'

interface MainProps {
  onLogout: () => void
}

export function Main({ onLogout }: MainProps) {
  const isOnline = useOnlineStatus()
  const user = getStoredUser()

  const [centro, setCentro] = useState<CentroActivo | null>(null)
  const [inventory, setInventory] = useState<ProductoInventario[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [consumeModal, setConsumeModal] = useState<{
    product: ProductoInventario
  } | null>(null)
  const [consumeAmount, setConsumeAmount] = useState(1)
  const [consumeLoading, setConsumeLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [offlineCount, setOfflineCount] = useState(0)
  
  // Tab Navigation
  const [activeTab, setActiveTab] = useState<'inventory' | 'incidents'>('inventory')

  // Incident form
  const [incidenciaCategoria, setIncidenciaCategoria] = useState('limpieza')
  const [incidenciaTitulo, setIncidenciaTitulo] = useState('')
  const [incidenciaDescripcion, setIncidenciaDescripcion] = useState('')
  const [incidenciaLoading, setIncidenciaLoading] = useState(false)

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      if (isOnline) {
        // Fetch from API
        const [centroData, inventoryData] = await Promise.all([
          getCentroActivo(),
          getInventory(centro?.id_centro),
        ])
        setCentro(centroData)
        setInventory(inventoryData)

        // Cache offline
        await cacheCentroActivo(centroData)
        await cacheInventory(inventoryData)
      } else {
        // Load from cache
        const cachedCentro = await getCachedCentroActivo()
        const cachedInventory = cachedCentro
          ? await getCachedInventory(cachedCentro.id_centro)
          : []
        setCentro(cachedCentro ?? null)
        // Convert cached items to ProductoInventario format
        setInventory(
          cachedInventory.map((item) => ({
            id_centro: item.id_centro,
            id_producto: item.id_producto,
            cantidad_actual: item.cantidad_actual,
            producto: {
              id_producto: item.id_producto,
              nombre_producto: item.nombre_producto,
              unidad_medida: item.unidad_medida,
              stock_minimo_alerta: item.stock_minimo_alerta,
            },
          }))
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos')
      // Try cache as fallback
      const cachedCentro = await getCachedCentroActivo()
      const cachedInventory = cachedCentro
        ? await getCachedInventory(cachedCentro.id_centro)
        : []
      if (cachedCentro) {
        setCentro(cachedCentro)
        setInventory(
          cachedInventory.map((item) => ({
            id_centro: item.id_centro,
            id_producto: item.id_producto,
            cantidad_actual: item.cantidad_actual,
            producto: {
              id_producto: item.id_producto,
              nombre_producto: item.nombre_producto,
              unidad_medida: item.unidad_medida,
              stock_minimo_alerta: item.stock_minimo_alerta,
            },
          }))
        )
      }
    } finally {
      setLoading(false)
    }
  }, [isOnline])

  // Check pending consumptions count
  const checkPendingCount = useCallback(async () => {
    const pending = await getPendingConsumptions()
    setOfflineCount(pending.filter((p) => !p.synced).length)
  }, [])

  useEffect(() => {
    loadData()
    checkPendingCount()
  }, [loadData, checkPendingCount, isOnline])

  // Sync pending consumptions when back online
  useEffect(() => {
    if (!isOnline) return

    const syncPending = async () => {
      setSyncing(true)
      try {
        const pending = await getPendingConsumptions()
        const unsynced = pending.filter((p) => !p.synced)

        for (const item of unsynced) {
          try {
            await consumeStock(item.id_producto, Math.abs(item.cantidad))
            await removePendingConsumption(item.offline_id)
          } catch {
            // Leave in queue for next sync attempt
          }
        }

        await checkPendingCount()
        // Refresh data after sync
        await loadData()
      } finally {
        setSyncing(false)
      }
    }

    syncPending()
  }, [isOnline, loadData, checkPendingCount])

  const handleLogout = async () => {
    await logout()
    clearTokens()
    onLogout()
  }

  const handleConsume = async () => {
    if (!consumeModal) return
    setConsumeLoading(true)

    try {
      const offlineId = crypto.randomUUID()
      const idProducto = consumeModal.product.id_producto
      const cantidad = consumeAmount

      if (isOnline) {
        await consumeStock(idProducto, cantidad)
        setSuccessMessage(
          `Consumido ${cantidad} ${consumeModal.product.producto.unidad_medida} de ${consumeModal.product.producto.nombre_producto}`
        )
      } else {
        // Queue offline
        await addPendingConsumption(offlineId, idProducto, cantidad)

        // Optimistic UI update
        const newCantidad =
          consumeModal.product.cantidad_actual - Math.abs(cantidad)
        await updateCachedInventoryItem(
          centro!.id_centro,
          idProducto,
          newCantidad
        )

        setSuccessMessage(
          `Consumo guardado offline (${consumeModal.product.producto.nombre_producto})`
        )
        await checkPendingCount()
      }

      // Refresh inventory
      await loadData()
      setConsumeModal(null)
      setConsumeAmount(1)

      // Clear success message after 3s
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al consumir')
    } finally {
      setConsumeLoading(false)
    }
  }

  const isLowStock = (item: ProductoInventario) =>
    item.cantidad_actual <= item.producto.stock_minimo_alerta

  const handleReportIncidencia = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!centro) return
    if (!isOnline) {
      setError('No puedes reportar incidencias sin conexión.')
      return
    }
    setIncidenciaLoading(true)
    try {
      await createIncidencia({
        id_centro: centro.id_centro,
        categoria: incidenciaCategoria,
        titulo: incidenciaTitulo,
        descripcion: incidenciaDescripcion,
      })
      setSuccessMessage('Incidencia reportada correctamente')
      setIncidenciaTitulo('')
      setIncidenciaDescripcion('')
      setIncidenciaCategoria('limpieza')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al reportar incidencia')
    } finally {
      setIncidenciaLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="main-loading">
        <div className="spinner" />
        <p>Cargando centro activo...</p>
      </div>
    )
  }

  return (
    <div className="main-container">
      {/* Header */}
      <header className="main-header">
        <div className="header-top">
          <div>
            <h1 className="header-title">Kavana CleanStock</h1>
            <p className="header-user">
              {user?.nombre} — {user?.rol}
            </p>
          </div>
          <div className="header-actions">
            {!isOnline && (
              <span className="badge badge-offline">Sin conexión</span>
            )}
            {syncing && <span className="badge badge-syncing">Sincronizando...</span>}
            {offlineCount > 0 && (
              <span className="badge badge-pending">{offlineCount} pendientes</span>
            )}
            <button onClick={handleLogout} className="btn-logout">
              Salir
            </button>
          </div>
        </div>

        {centro && (
          <div className="centro-banner">
            <span className="centro-icon">🏢</span>
            <div>
              <p className="centro-nombre">{centro.nombre_centro}</p>
              {centro.direccion && (
                <p className="centro-direccion">{centro.direccion}</p>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Success/Error messages */}
      {successMessage && (
        <div className="alert alert-success">{successMessage}</div>
      )}
      {error && (
        <div className="alert alert-error">
          {error}
          <button onClick={() => setError('')} className="alert-close">
            ✕
          </button>
        </div>
      )}

      {/* Content based on active tab */}
      {activeTab === 'inventory' ? (
        <main className="inventory-list">
          <h2 className="section-title">
            Inventario
            <button
              onClick={loadData}
              className="btn-refresh"
              disabled={loading}
            >
              ↻
            </button>
          </h2>

          {inventory.length === 0 ? (
            <p className="empty-state">
              No hay productos asignados a este centro.
            </p>
          ) : (
            inventory.map((item) => (
              <div
                key={`${item.id_centro}-${item.id_producto}`}
                className={`inventory-card ${isLowStock(item) ? 'low-stock' : ''}`}
              >
                <div className="card-info">
                  <p className="card-product-name">
                    {item.producto.nombre_producto}
                  </p>
                  <p className="card-stock">
                    <span
                      className={`stock-value ${item.cantidad_actual <= 0 ? 'stock-critical' : ''}`}
                    >
                      {item.cantidad_actual}
                    </span>{' '}
                    {item.producto.unidad_medida}
                  </p>
                  {isLowStock(item) && (
                    <p className="stock-alert">
                      {item.cantidad_actual <= 0
                        ? '⚠️ Sin stock'
                        : `⚠️ Mínimo: ${item.producto.stock_minimo_alerta}`}
                    </p>
                  )}
                </div>
                <button
                  className="btn-consume"
                  onClick={() => {
                    setConsumeModal({ product: item })
                    setConsumeAmount(1)
                  }}
                  disabled={item.cantidad_actual <= 0}
                >
                  Consumir
                </button>
              </div>
            ))
          )}
        </main>
      ) : (
        <main className="incidents-form-container">
          <h2 className="section-title">Reportar Incidencia</h2>
          <form className="incidents-form" onSubmit={handleReportIncidencia}>
            <div className="form-group">
              <label>Categoría</label>
              <select 
                value={incidenciaCategoria} 
                onChange={(e) => setIncidenciaCategoria(e.target.value)}
                className="form-input"
              >
                <option value="limpieza">🧼 Limpieza</option>
                <option value="fontaneria">🚰 Fontanería</option>
                <option value="electricidad">⚡ Electricidad</option>
                <option value="cerrajeria">🔑 Cerrajería</option>
                <option value="otros">❓ Otros</option>
              </select>
            </div>
            <div className="form-group">
              <label>Título (Breve descripción)</label>
              <input 
                type="text" 
                value={incidenciaTitulo}
                onChange={(e) => setIncidenciaTitulo(e.target.value)}
                placeholder="Ej. Fuga de agua en baño 1"
                required
                minLength={3}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>Detalles adicionales</label>
              <textarea 
                value={incidenciaDescripcion}
                onChange={(e) => setIncidenciaDescripcion(e.target.value)}
                placeholder="Explica qué ha ocurrido con más detalle..."
                rows={4}
                className="form-input"
              />
            </div>
            <button 
              type="submit" 
              className="btn-confirm" 
              style={{ width: '100%', padding: '1rem', marginTop: '0.5rem' }}
              disabled={incidenciaLoading || !incidenciaTitulo.trim()}
            >
              {incidenciaLoading ? 'Enviando...' : 'Enviar Reporte'}
            </button>
          </form>
        </main>
      )}

      {/* Consume Modal */}
      {consumeModal && (
        <div className="modal-backdrop" onClick={() => setConsumeModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Consumir producto</h3>
            <p className="modal-product">
              {consumeModal.product.producto.nombre_producto}
            </p>
            <p className="modal-stock">
              Stock actual: {consumeModal.product.cantidad_actual}{' '}
              {consumeModal.product.producto.unidad_medida}
            </p>

            <div className="modal-input-group">
              <button
                className="btn-qty"
                onClick={() => setConsumeAmount(Math.max(1, consumeAmount - 1))}
                disabled={consumeAmount <= 1}
              >
                −
              </button>
              <input
                type="number"
                value={consumeAmount}
                onChange={(e) =>
                  setConsumeAmount(
                    Math.max(1, parseInt(e.target.value) || 1)
                  )
                }
                min={1}
                max={consumeModal.product.cantidad_actual}
                className="modal-input"
              />
              <button
                className="btn-qty"
                onClick={() => setConsumeAmount(consumeAmount + 1)}
              >
                +
              </button>
            </div>

            <div className="modal-actions">
              <button
                className="btn-cancel"
                onClick={() => setConsumeModal(null)}
              >
                Cancelar
              </button>
              <button
                className="btn-confirm"
                onClick={handleConsume}
                disabled={consumeLoading || consumeAmount <= 0}
              >
                {consumeLoading
                  ? 'Consumiendo...'
                  : isOnline
                    ? 'Confirmar consumo'
                    : 'Guardar offline'}
              </button>
            </div>

            {!isOnline && (
              <p className="modal-offline-note">
                📡 Sin conexión — el consumo se registrará cuando recuperes
                conexión.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <button 
          className={`nav-item ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          <span className="nav-icon">📦</span>
          <span className="nav-text">Inventario</span>
        </button>
        <button 
          className={`nav-item ${activeTab === 'incidents' ? 'active' : ''}`}
          onClick={() => setActiveTab('incidents')}
        >
          <span className="nav-icon">🛠️</span>
          <span className="nav-text">Incidencias</span>
        </button>
      </nav>
    </div>
  )
}