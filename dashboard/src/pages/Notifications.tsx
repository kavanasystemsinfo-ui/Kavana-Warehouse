import { useState, useEffect } from 'react'
import {
  getNotifications,
  markNotificationRead,
  getNotificationRules,
  createNotificationRule,
  deleteNotificationRule,
  getCentros,
  getProductos,
  getUsuarios,
  type Notificacion,
  type ReglaNotificacion,
  type Centro,
  type Producto,
} from '../lib/api'

export function Notifications() {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [reglas, setReglas] = useState<ReglaNotificacion[]>([])
  const [centros, setCentros] = useState<Centro[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [usuarios, setUsuarios] = useState<{ id_usuario: number; nombre: string; email: string; rol: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'notificaciones' | 'reglas'>('notificaciones')

  // New rule form
  const [newCentro, setNewCentro] = useState('')
  const [newOperario, setNewOperario] = useState('')
  const [newProducto, setNewProducto] = useState('')

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [notiRes, reglasRes, centrosData, productosData, usuariosData] = await Promise.all([
        getNotifications(),
        getNotificationRules(),
        getCentros(),
        getProductos(),
        getUsuarios(),
      ])
      setNotificaciones(notiRes.notificaciones)
      setReglas(reglasRes.reglas)
      setCentros(centrosData)
      setProductos(productosData)
      setUsuarios(usuariosData.filter(u => u.rol === 'limpiador'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const handleMarkRead = async (id: number) => {
    try {
      await markNotificationRead(id)
      setNotificaciones(prev => prev.map(n => n.id_notificacion === id ? { ...n, leida: true } : n))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    }
  }

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createNotificationRule({
        id_centro: newCentro ? Number(newCentro) : undefined,
        id_operario: newOperario ? Number(newOperario) : undefined,
        id_producto: newProducto ? Number(newProducto) : undefined,
      })
      setNewCentro('')
      setNewOperario('')
      setNewProducto('')
      loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear regla')
    }
  }

  const handleDeleteRule = async (id: number) => {
    try {
      await deleteNotificationRule(id)
      setReglas(prev => prev.filter(r => r.id_regla !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar regla')
    }
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        Cargando notificaciones...
      </div>
    )
  }

  const noLeidas = notificaciones.filter(n => !n.leida).length

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          Notificaciones
          {noLeidas > 0 && (
            <span className="badge badge-danger" style={{ marginLeft: '0.75rem', fontSize: '0.9rem' }}>{noLeidas} sin leer</span>
          )}
        </h1>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button
          className={`btn ${tab === 'notificaciones' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setTab('notificaciones')}
        >
          📬 Notificaciones ({notificaciones.length})
        </button>
        <button
          className={`btn ${tab === 'reglas' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setTab('reglas')}
        >
          ⚙️ Configurar Reglas ({reglas.length})
        </button>
      </div>

      {tab === 'notificaciones' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Historial de Notificaciones</h2>
          </div>
          {notificaciones.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.5rem 0' }}>
              {notificaciones.map((n) => (
                <div
                  key={n.id_notificacion}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem',
                    padding: '1rem',
                    borderRadius: '8px',
                    background: n.leida ? 'var(--gray-50, #f9fafb)' : 'rgba(59, 130, 246, 0.08)',
                    border: n.leida ? '1px solid var(--gray-200, #e5e7eb)' : '1px solid rgba(59, 130, 246, 0.3)',
                    transition: 'background 0.2s',
                  }}
                >
                  <div style={{ fontSize: '1.5rem', lineHeight: 1 }}>
                    {n.leida ? '📭' : '📬'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: '0.9rem' }}>{n.titulo}</strong>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--gray-600, #4b5563)' }}>
                      {n.mensaje}
                    </p>
                    <small style={{ color: 'var(--gray-400, #9ca3af)' }}>
                      {new Date(n.fecha_creacion).toLocaleString('es-ES')}
                    </small>
                  </div>
                  {!n.leida && (
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => handleMarkRead(n.id_notificacion)}
                    >
                      ✓ Leída
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--gray-500)', padding: '1rem 0' }}>No tienes notificaciones.</p>
          )}
        </div>
      )}

      {tab === 'reglas' && (
        <>
          {/* Form for new rule */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Nueva Regla de Notificación</h2>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginBottom: '1rem' }}>
              Configura cuándo deseas recibir alertas. Deja un campo vacío para que aplique a <strong>todos</strong> los centros/operarios/productos.
            </p>
            <form className="filters-bar" onSubmit={handleCreateRule}>
              <div className="form-group">
                <label className="form-label">Centro (opcional)</label>
                <select className="form-select" value={newCentro} onChange={(e) => setNewCentro(e.target.value)}>
                  <option value="">Todos los centros</option>
                  {centros.map((c) => (
                    <option key={c.id_centro} value={c.id_centro}>{c.nombre_centro}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Operario (opcional)</label>
                <select className="form-select" value={newOperario} onChange={(e) => setNewOperario(e.target.value)}>
                  <option value="">Todos los operarios</option>
                  {usuarios.map((u) => (
                    <option key={u.id_usuario} value={u.id_usuario}>{u.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Producto (opcional)</label>
                <select className="form-select" value={newProducto} onChange={(e) => setNewProducto(e.target.value)}>
                  <option value="">Todos los productos</option>
                  {productos.map((p) => (
                    <option key={p.id_producto} value={p.id_producto}>{p.nombre_producto}</option>
                  ))}
                </select>
              </div>
              <button className="btn btn-primary" type="submit">Crear Regla</button>
            </form>
          </div>

          {/* Existing rules */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Reglas Activas</h2>
            </div>
            {reglas.length > 0 ? (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Centro</th>
                      <th>Operario</th>
                      <th>Producto</th>
                      <th>Estado</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reglas.map((r) => (
                      <tr key={r.id_regla}>
                        <td>{r.centro ? r.centro.nombre_centro : <em style={{ color: 'var(--gray-400)' }}>Todos</em>}</td>
                        <td>{r.operario ? r.operario.nombre : <em style={{ color: 'var(--gray-400)' }}>Todos</em>}</td>
                        <td>{r.producto ? r.producto.nombre_producto : <em style={{ color: 'var(--gray-400)' }}>Todos</em>}</td>
                        <td>
                          <span className={`badge ${r.activa ? 'badge-success' : 'badge-danger'}`}>
                            {r.activa ? '🟢 Activa' : '🔴 Inactiva'}
                          </span>
                        </td>
                        <td>
                          <button className="btn btn-sm" style={{ background: 'var(--danger)', color: '#fff' }} onClick={() => handleDeleteRule(r.id_regla)}>
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: 'var(--gray-500)', padding: '1rem 0' }}>No tienes reglas configuradas. Crea una para recibir alertas cuando los operarios retiren material.</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
