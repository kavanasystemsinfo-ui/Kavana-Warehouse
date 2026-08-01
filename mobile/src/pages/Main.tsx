// Kavana CleanStock Mobile — Main Dashboard (Responsable de centro)
// Flujo: Login → Elegir centro → Recuento físico (set cantidad real) → Confirmar
// El recuento actualiza el stock real del Dashboard y registra el histórico.

import { useState, useEffect, useCallback } from 'react'
import {
  getCentrosActivos,
  getInventory,
  guardarConteo,
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
} from '../lib/db'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import './Main.css'

interface MainProps {
  onLogout: () => void
}

export function Main({ onLogout }: MainProps) {
  const isOnline = useOnlineStatus()
  const user = getStoredUser()

  const [centros, setCentros] = useState<CentroActivo[]>([])
  const [centroId, setCentroId] = useState<number | null>(null)
  const [inventory, setInventory] = useState<ProductoInventario[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [syncing] = useState(false)
  const [conteoModal, setConteoModal] = useState<{ product: ProductoInventario } | null>(null)
  const [conteoAmount, setConteoAmount] = useState(0)
  const [conteoLoading, setConteoLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [offlineCount, setOfflineCount] = useState(0)

  const [activeTab, setActiveTab] = useState<'inventory' | 'incidents'>('inventory')

  const [incidenciaCategoria, setIncidenciaCategoria] = useState('limpieza')
  const [incidenciaTitulo, setIncidenciaTitulo] = useState('')
  const [incidenciaDescripcion, setIncidenciaDescripcion] = useState('')
  const [incidenciaLoading, setIncidenciaLoading] = useState(false)

  const centroActual = centros.find(c => c.id_centro === centroId) || null

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      if (isOnline) {
        const centrosData = await getCentrosActivos()
        setCentros(centrosData)
        // Seleccionar primer centro si no hay ninguno elegido
        const targetId = centroId ?? centrosData[0]?.id_centro ?? null
        setCentroId(targetId)
        if (targetId) {
          const inventoryData = await getInventory(targetId)
          setInventory(inventoryData)
          const c = centrosData.find(x => x.id_centro === targetId)
          if (c) await cacheCentroActivo(c)
          await cacheInventory(inventoryData)
        } else {
          setInventory([])
        }
      } else {
        const cachedCentro = await getCachedCentroActivo()
        const cachedCentros = cachedCentro ? [cachedCentro] : []
        setCentros(cachedCentros)
        const targetId = centroId ?? cachedCentro?.id_centro ?? null
        setCentroId(targetId)
        const cachedInventory = targetId ? await getCachedInventory(targetId) : []
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
      const cachedCentro = await getCachedCentroActivo()
      if (cachedCentro) {
        setCentros([cachedCentro])
        setCentroId(cachedCentro.id_centro)
        const cachedInventory = await getCachedInventory(cachedCentro.id_centro)
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
  }, [isOnline, centroId])

  const checkPendingCount = useCallback(async () => {
    const pending = await getPendingConsumptions()
    setOfflineCount(pending.filter((p) => !p.synced).length)
  }, [])

  useEffect(() => {
    loadData()
    checkPendingCount()
  }, [loadData, checkPendingCount, isOnline])

  const handleLogout = async () => {
    await logout()
    clearTokens()
    onLogout()
  }

  const handleConteo = async () => {
    if (!conteoModal || !centroActual) return
    setConteoLoading(true)
    try {
      const idProducto = conteoModal.product.id_producto
      const cantidad = Math.max(0, Math.floor(conteoAmount))
      if (isOnline) {
        await guardarConteo(centroActual.id_centro, idProducto, cantidad)
        setSuccessMessage(
          `Recuento guardado: ${cantidad} ${conteoModal.product.producto.unidad_medida} de ${conteoModal.product.producto.nombre_producto}`
        )
      } else {
        // Offline: guardamos el conteo como consumo pendiente (se sincroniza como recuento al volver)
        await addPendingConsumption(crypto.randomUUID(), idProducto, cantidad)
        await updateCachedInventoryItem(centroActual.id_centro, idProducto, cantidad)
        setSuccessMessage(`Recuento guardado offline (${conteoModal.product.producto.nombre_producto})`)
        await checkPendingCount()
      }
      await loadData()
      setConteoModal(null)
      setConteoAmount(0)
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar recuento')
    } finally {
      setConteoLoading(false)
    }
  }

  const isLowStock = (item: ProductoInventario) =>
    item.cantidad_actual <= item.producto.stock_minimo_alerta

  const handleReportIncidencia = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!centroActual) return
    if (!isOnline) {
      setError('No puedes reportar incidencias sin conexión.')
      return
    }
    setIncidenciaLoading(true)
    try {
      await createIncidencia({
        id_centro: centroActual.id_centro,
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
        <p>Cargando centros...</p>
      </div>
    )
  }

  return (
    <div className="main-container">
      <header className="main-header">
        <div className="header-top">
          <div>
            <h1 className="header-title">Kavana CleanStock</h1>
            <p className="header-user">
              {user?.nombre} — {user?.rol}
            </p>
          </div>
          <div className="header-actions">
            {!isOnline && <span className="badge badge-offline">Sin conexión</span>}
            {syncing && <span className="badge badge-syncing">Sincronizando...</span>}
            {offlineCount > 0 && (
              <span className="badge badge-pending">{offlineCount} pendientes</span>
            )}
            <button onClick={handleLogout} className="btn-logout">
              Salir
            </button>
          </div>
        </div>

        {centros.length > 0 && (
          <div className="centro-selector">
            <label className="centro-selector-label">Centro:</label>
            <select
              className="form-input"
              value={centroId ?? ''}
              onChange={(e) => setCentroId(Number(e.target.value))}
            >
              {centros.map((c) => (
                <option key={c.id_centro} value={c.id_centro}>
                  {c.nombre_centro}
                </option>
              ))}
            </select>
          </div>
        )}
      </header>

      {successMessage && <div className="alert alert-success">{successMessage}</div>}
      {error && (
        <div className="alert alert-error">
          {error}
          <button onClick={() => setError('')} className="alert-close">
            ✕
          </button>
        </div>
      )}

      {activeTab === 'inventory' ? (
        <main className="inventory-list">
          <h2 className="section-title">
            Recuento de inventario
            <button onClick={loadData} className="btn-refresh" disabled={loading}>
              ↻
            </button>
          </h2>

          {centros.length === 0 ? (
            <p className="empty-state">
              No tienes centros asignados. El supervisor debe darte acceso desde el Dashboard.
            </p>
          ) : inventory.length === 0 ? (
            <p className="empty-state">No hay productos en este centro.</p>
          ) : (
            inventory.map((item) => (
              <div
                key={`${item.id_centro}-${item.id_producto}`}
                className={`inventory-card ${isLowStock(item) ? 'low-stock' : ''}`}
              >
                <div className="card-info">
                  <p className="card-product-name">{item.producto.nombre_producto}</p>
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
                    setConteoModal({ product: item })
                    setConteoAmount(item.cantidad_actual)
                  }}
                >
                  Recuento
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

      {conteoModal && (
        <div className="modal-backdrop" onClick={() => setConteoModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Recuento físico</h3>
            <p className="modal-product">{conteoModal.product.producto.nombre_producto}</p>
            <p className="modal-stock">
              Stock registrado: {conteoModal.product.cantidad_actual}{' '}
              {conteoModal.product.producto.unidad_medida}
            </p>

            <div className="modal-input-group">
              <button
                className="btn-qty"
                onClick={() => setConteoAmount(Math.max(0, conteoAmount - 1))}
                disabled={conteoAmount <= 0}
              >
                −
              </button>
              <input
                type="number"
                value={conteoAmount}
                onChange={(e) =>
                  setConteoAmount(Math.max(0, parseInt(e.target.value) || 0))
                }
                min={0}
                className="modal-input"
              />
              <button
                className="btn-qty"
                onClick={() => setConteoAmount(conteoAmount + 1)}
              >
                +
              </button>
            </div>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setConteoModal(null)}>
                Cancelar
              </button>
              <button
                className="btn-confirm"
                onClick={handleConteo}
                disabled={conteoLoading}
              >
                {conteoLoading ? 'Guardando...' : isOnline ? 'Confirmar recuento' : 'Guardar offline'}
              </button>
            </div>

            {!isOnline && (
              <p className="modal-offline-note">
                📡 Sin conexión — el recuento se enviará cuando recuperes conexión.
              </p>
            )}
          </div>
        </div>
      )}

      <nav className="bottom-nav">
        <button
          className={`nav-item ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          <span className="nav-icon">📦</span>
          <span className="nav-text">Recuento</span>
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
