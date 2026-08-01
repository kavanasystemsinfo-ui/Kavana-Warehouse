import { useState, useEffect, useRef, useCallback } from 'react'
import {
  getInventory, restock, getCentros, getPurchaseProposal,
  type InventarioItem, type Centro,
} from '../lib/api'
import {
  connect, disconnect, subscribe,
  joinCentro, leaveCentro,
  type StockConsumedPayload, type StockRestockedPayload,
} from '../lib/socket'
import { exportToCsv } from '../lib/csv'

export function Inventario() {
  const [inventory, setInventory] = useState<InventarioItem[]>([])
  const [centros, setCentros] = useState<Centro[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [filtroCentro, setFiltroCentro] = useState('')

  // Real-time toast notification
  const [notification, setNotification] = useState<{
    type: 'consumed' | 'restocked'
    message: string
  } | null>(null)

  // Restock modal
  const [showRestock, setShowRestock] = useState(false)
  const [restockCentro, setRestockCentro] = useState('')
  const [restockProducto, setRestockProducto] = useState('')
  const [restockCantidad, setRestockCantidad] = useState(1)
  const [restockLoading, setRestockLoading] = useState(false)
  const [restockError, setRestockError] = useState('')

  // Ref para evitar doble conexión en modo Strict
  const socketInitialized = useRef(false)

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [invData, centrosData] = await Promise.all([
        getInventory(filtroCentro ? Number(filtroCentro) : undefined),
        getCentros(),
      ])
      setInventory(invData)
      setCentros(centrosData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar inventario')
    } finally {
      setLoading(false)
    }
  }

  // --------------------------------------------------------------------------
  // Socket.IO: Conexión y suscripción a eventos en tiempo real
  // --------------------------------------------------------------------------
  useEffect(() => {
    // Conectar al servidor Socket.IO
    const socket = connect()

    if (!socket) {
      // No hay token — probablemente no autenticado
      return
    }

    // Suscribirse a eventos de consumo
    const unsubConsumed = subscribe('stock:consumed', (raw) => {
      const payload = raw as StockConsumedPayload
      const cantidad = Math.abs(payload.cantidad)

      // Mostrar notificación toast
      setNotification({
        type: 'consumed',
        message: `${payload.usuario.nombre} consumió ${cantidad} de ${payload.nombre_producto} en centro #${payload.id_centro}`,
      })

      // Actualizar el inventario local sin recargar toda la página
      setInventory((prev) =>
        prev.map((item) =>
          item.id_centro === payload.id_centro && item.id_producto === payload.id_producto
            ? { ...item, cantidad_actual: payload.cantidad_actual }
            : item
        )
      )
    })

    // Suscribirse a eventos de reposición
    const unsubRestocked = subscribe('stock:restocked', (raw) => {
      const payload = raw as StockRestockedPayload

      setNotification({
        type: 'restocked',
        message: `${payload.usuario.nombre} repuso ${payload.cantidad} de ${payload.nombre_producto} en centro #${payload.id_centro}`,
      })

      // Actualizar el inventario local
      setInventory((prev) =>
        prev.map((item) =>
          item.id_centro === payload.id_centro && item.id_producto === payload.id_producto
            ? { ...item, cantidad_actual: payload.cantidad_actual }
            : item
        )
      )
    })

    // Unirse al room global (todos los centros — supervisores ven todo)
    // Si hay un filtro de centro activo, unirse solo a ese centro
    if (filtroCentro) {
      joinCentro(Number(filtroCentro))
    }

    // Limpiar notificación después de 4 segundos
    const notifTimer = setTimeout(() => setNotification(null), 4000)

    return () => {
      clearTimeout(notifTimer)
      unsubConsumed()
      unsubRestocked()
      if (filtroCentro) {
        leaveCentro(Number(filtroCentro))
      }
      disconnect()
      socketInitialized.current = false
    }
  }, [filtroCentro])

  // Auto-limpiar notificación cuando cambia
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  // Cargar datos al inicio o cuando cambia el filtro
  useEffect(() => {
    loadData()
  }, [filtroCentro])

  const openRestock = () => {
    setRestockCentro('')
    setRestockProducto('')
    setRestockCantidad(1)
    setRestockError('')
    setShowRestock(true)
  }

  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!restockCentro || !restockProducto || restockCantidad < 1) {
      setRestockError('Debe completar todos los campos.')
      return
    }
    setRestockLoading(true)
    setRestockError('')
    try {
      await restock({
        id_centro: Number(restockCentro),
        id_producto: Number(restockProducto),
        cantidad: restockCantidad,
      })
      setSuccess(`Reposición de ${restockCantidad} unidades registrada.`)
      setShowRestock(false)
      loadData()
    } catch (err) {
      setRestockError(err instanceof Error ? err.message : 'Error al reponer')
    } finally {
      setRestockLoading(false)
    }
  }

  const handleGenerateProposal = async () => {
    try {
      setLoading(true)
      const proposal = await getPurchaseProposal(filtroCentro ? Number(filtroCentro) : undefined)
      if (proposal.propuestas.length === 0) {
        setSuccess('No hay productos por debajo del stock mínimo. No se requiere compra.')
        setTimeout(() => setSuccess(''), 4000)
        return
      }
      const rows = proposal.propuestas.map(p => ({
        Centro: p.centro.nombre_centro,
        Producto: p.producto.nombre_producto,
        'Stock Actual': p.stock_actual,
        'Stock Mínimo': p.stock_minimo,
        'Déficit': p.deficit,
        'Cantidad a Pedir': p.cantidad_pedido,
        'Coste Estimado (€)': p.coste_estimado
      }))
      exportToCsv(`propuesta-compra-${new Date().toISOString().split('T')[0]}`, rows)
      setSuccess(`Propuesta exportada. Coste total estimado: ${proposal.total_coste_estimado} €`)
      setTimeout(() => setSuccess(''), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar propuesta')
    } finally {
      setLoading(false)
    }
  }

  const availableProducts = inventory
    .filter((item) => !restockCentro || item.id_centro === Number(restockCentro))
    .map((item) => item.producto)
    .filter((p, i, arr) => arr.findIndex((x) => x.id_producto === p.id_producto) === i)

  if (loading && inventory.length === 0) {
    return (
      <div className="loading">
        <div className="spinner" />
        Cargando inventario...
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Inventario</h1>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-outline" onClick={handleGenerateProposal}>
            📥 Propuesta de Compra
          </button>
          <button className="btn btn-primary" onClick={openRestock}>
            + Reponer Stock
          </button>
        </div>
      </div>

      {/* Real-time notification toast */}
      {notification && (
        <div className={`alert ${notification.type === 'consumed' ? 'alert-warning' : 'alert-success'}`}
          style={{ animation: 'slideIn 0.3s ease-out' }}>
          <strong>
            {notification.type === 'consumed' ? '📦 Consumo' : '📥 Reposición'}
          </strong>
          : {notification.message}
        </div>
      )}

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Filter */}
      <div className="card">
        <div className="filters-bar">
          <div className="form-group">
            <label className="form-label">Filtrar por centro</label>
            <select className="form-select" value={filtroCentro} onChange={(e) => setFiltroCentro(e.target.value)}>
              <option value="">Todos los centros</option>
              {centros.map((c) => (
                <option key={c.id_centro} value={c.id_centro}>{c.nombre_centro}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Centro</th>
                <th>Producto</th>
                <th>Unidad</th>
                <th>Stock Actual</th>
                <th>Stock Mínimo</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => {
                const isLow = item.cantidad_actual <= item.producto.stock_minimo_alerta
                const isCritical = item.cantidad_actual <= 0
                return (
                  <tr key={`${item.id_centro}-${item.id_producto}`}>
                    <td><strong>{item.centro?.nombre_centro}</strong></td>
                    <td>{item.producto.nombre_producto}</td>
                    <td>{item.producto.unidad_medida}</td>
                    <td style={{ fontWeight: 600, color: isCritical ? 'var(--danger)' : isLow ? 'var(--warning)' : 'inherit' }}>
                      {item.cantidad_actual}
                    </td>
                    <td>{item.producto.stock_minimo_alerta}</td>
                    <td>
                      {isCritical ? (
                        <span className="badge badge-danger">Crítico</span>
                      ) : isLow ? (
                        <span className="badge badge-warning">Bajo</span>
                      ) : (
                        <span className="badge badge-success">Normal</span>
                      )}
                    </td>
                  </tr>
                )
              })}
              {inventory.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)' }}>
                    No hay inventario disponible.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Restock Modal */}
      {showRestock && (
        <div className="modal-overlay" onClick={() => setShowRestock(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Reponer Stock</h2>
            {restockError && <div className="alert alert-danger">{restockError}</div>}
            <form onSubmit={handleRestock}>
              <div className="form-group">
                <label className="form-label">Centro</label>
                <select className="form-select" value={restockCentro} onChange={(e) => { setRestockCentro(e.target.value); setRestockProducto('') }} required>
                  <option value="">Seleccionar centro...</option>
                  {centros.map((c) => (
                    <option key={c.id_centro} value={c.id_centro}>{c.nombre_centro}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Producto</label>
                <select className="form-select" value={restockProducto} onChange={(e) => setRestockProducto(e.target.value)} required>
                  <option value="">Seleccionar producto...</option>
                  {availableProducts.map((p) => (
                    <option key={p.id_producto} value={p.id_producto}>{p.nombre_producto}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Cantidad</label>
                <input className="form-input" type="number" min="1" value={restockCantidad} onChange={(e) => setRestockCantidad(Number(e.target.value))} required />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowRestock(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={restockLoading}>
                  {restockLoading ? 'Reponiendo...' : 'Reponer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}