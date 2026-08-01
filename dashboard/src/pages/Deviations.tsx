import { useState, useEffect } from 'react'
import { getDeviations, getCentros, guardarConteo, resetDemo, type DeviationsData, type Centro, type DeviationItem } from '../lib/api'

export function Deviations() {
  const [data, setData] = useState<DeviationsData | null>(null)
  const [centros, setCentros] = useState<Centro[]>([])
  const [filtroCentro, setFiltroCentro] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editando, setEditando] = useState<DeviationItem | null>(null)
  const [valorConteo, setValorConteo] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [resetMsg, setResetMsg] = useState('')

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [deviations, centrosData] = await Promise.all([
        getDeviations({ centro: filtroCentro ? Number(filtroCentro) : undefined }),
        getCentros(),
      ])
      setData(deviations)
      setCentros(centrosData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault()
    loadData()
  }

  const abrirConteo = (d: DeviationItem) => {
    setEditando(d)
    setValorConteo(d.stock_fisico !== null ? String(d.stock_fisico) : '')
  }

  const cerrarConteo = () => {
    setEditando(null)
    setValorConteo('')
  }

  const guardar = async () => {
    if (!editando) return
    const v = Number(valorConteo)
    if (!Number.isFinite(v) || v < 0) {
      setError('Introduce un número válido (0 o superior)')
      return
    }
    setGuardando(true)
    setError('')
    try {
      await guardarConteo(editando.centro.id_centro, editando.producto.id_producto, v)
      cerrarConteo()
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar conteo')
    } finally {
      setGuardando(false)
    }
  }

  const limpiarDemo = async () => {
    if (!confirm('¿Borrar todos los datos de demostración? El panel quedará vacío para empezar con tu empresa.')) return
    setGuardando(true)
    setError('')
    try {
      const r = await resetDemo()
      setResetMsg(r.mensaje)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al limpiar demo')
    } finally {
      setGuardando(false)
    }
  }

  if (loading && !data) {
    return (
      <div className="loading">
        <div className="spinner" />
        Cargando desviaciones...
      </div>
    )
  }

  const badgeClass = (estado: string) =>
    estado === 'falta' ? 'badge-danger' : estado === 'sobra' ? 'badge-info' : 'badge-warning'

  const badgeText = (estado: string) =>
    estado === 'falta' ? '⚠️ Falta material' : estado === 'sobra' ? '✅ Sobra' : '⏳ Pendiente de contar'

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Control de Mermas</h1>
          <span className="stat-sub">Stock registrado vs. conteo físico — {data?.mes}</span>
        </div>
        <button className="btn btn-outline" onClick={limpiarDemo} disabled={guardando}>
          🧹 Limpiar datos demo
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {resetMsg && <div className="alert alert-success">{resetMsg}</div>}

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card danger">
          <span className="stat-label">Faltas detectadas</span>
          <span className="stat-value">{data?.total_desviaciones ?? 0}</span>
          <span className="stat-sub">centros con menos stock del registrado</span>
        </div>
        <div className="stat-card primary">
          <span className="stat-label">Líneas controladas</span>
          <span className="stat-value">{data?.desviaciones.length ?? 0}</span>
          <span className="stat-sub">productos por centro</span>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <form className="filters-bar" onSubmit={handleFilter}>
          <div className="form-group">
            <label className="form-label">Centro</label>
            <select className="form-select" value={filtroCentro} onChange={(e) => setFiltroCentro(e.target.value)}>
              <option value="">Todos</option>
              {centros.map((c) => (
                <option key={c.id_centro} value={c.id_centro}>{c.nombre_centro}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary" type="submit">Filtrar</button>
        </form>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Diferencia entre registrado y físico</h2>
        </div>
        {data && data.desviaciones.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Centro</th>
                  <th>Producto</th>
                  <th>Registrado</th>
                  <th>Físico (conteo)</th>
                  <th>Diferencia</th>
                  <th>% Desvío</th>
                  <th>Coste pérdida</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.desviaciones.map((d, i) => (
                  <tr key={i}>
                    <td><strong>{d.centro.nombre_centro}</strong></td>
                    <td>{d.producto.nombre_producto}</td>
                    <td>{d.cantidad_actual}</td>
                    <td>{d.stock_fisico === null ? '—' : d.stock_fisico}</td>
                    <td style={{
                      color: d.desviacion && d.desviacion > 0 ? 'var(--danger)' : d.desviacion && d.desviacion < 0 ? 'var(--success)' : 'inherit',
                      fontWeight: 600,
                    }}>
                      {d.desviacion === null ? '—' : (d.desviacion > 0 ? '−' : '+') + Math.abs(d.desviacion)}
                    </td>
                    <td>{d.porcentaje_desviacion === null ? '—' : `${d.porcentaje_desviacion}%`}</td>
                    <td style={{ color: 'var(--danger)', fontWeight: 600 }}>{d.coste_desviacion} €</td>
                    <td><span className={`badge ${badgeClass(d.estado)}`}>{badgeText(d.estado)}</span></td>
                    <td>
                      <button className="btn btn-sm btn-outline" onClick={() => abrirConteo(d)}>
                        {d.stock_fisico === null ? 'Contar' : 'Ajustar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: 'var(--gray-500)', padding: '1rem 0' }}>No hay diferencias registradas.</p>
        )}
      </div>

      {/* Modal de conteo */}
      {editando && (
        <div className="modal-overlay" onClick={cerrarConteo}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Conteo físico</h3>
            <p>
              <strong>{editando.centro.nombre_centro}</strong> — {editando.producto.nombre_producto}
            </p>
            <p className="stat-sub">Registrado en sistema: {editando.cantidad_actual} {editando.producto.unidad_medida}</p>
            <div className="form-group">
              <label className="form-label">Stock físico contado ({editando.producto.unidad_medida})</label>
              <input
                className="form-input"
                type="number"
                min="0"
                value={valorConteo}
                onChange={(e) => setValorConteo(e.target.value)}
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={cerrarConteo} disabled={guardando}>Cancelar</button>
              <button className="btn btn-primary" onClick={guardar} disabled={guardando}>
                {guardando ? 'Guardando...' : 'Guardar conteo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
