import { useState, useEffect } from 'react'
import { getDeviations, getCentros, type DeviationsData, type Centro } from '../lib/api'

export function Deviations() {
  const [data, setData] = useState<DeviationsData | null>(null)
  const [centros, setCentros] = useState<Centro[]>([])
  const [filtroCentro, setFiltroCentro] = useState('')
  const [filtroMes, setFiltroMes] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [deviations, centrosData] = await Promise.all([
        getDeviations({
          centro: filtroCentro ? Number(filtroCentro) : undefined,
          mes: filtroMes || undefined,
        }),
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

  if (loading && !data) {
    return (
      <div className="loading">
        <div className="spinner" />
        Cargando desviaciones...
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Control de Desviaciones</h1>
        <span className="stat-sub">Consumo Teórico vs. Real — Mes: {data?.mes}</span>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card danger">
          <span className="stat-label">Excesos Detectados</span>
          <span className="stat-value">{data?.total_desviaciones ?? 0}</span>
          <span className="stat-sub">productos por encima del teórico</span>
        </div>
        <div className="stat-card primary">
          <span className="stat-label">Productos Controlados</span>
          <span className="stat-value">{data?.desviaciones.length ?? 0}</span>
          <span className="stat-sub">con consumo teórico asignado</span>
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
          <div className="form-group">
            <label className="form-label">Mes</label>
            <input className="form-input" type="month" value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)} />
          </div>
          <button className="btn btn-primary" type="submit">Filtrar</button>
        </form>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Detalle de Desviaciones</h2>
        </div>
        {data && data.desviaciones.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Centro</th>
                  <th>Producto</th>
                  <th>Teórico</th>
                  <th>Real</th>
                  <th>Desviación</th>
                  <th>% Consumido</th>
                  <th>Coste Extra</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {data.desviaciones.map((d, i) => (
                  <tr key={i}>
                    <td><strong>{d.centro.nombre_centro}</strong></td>
                    <td>{d.producto.nombre_producto}</td>
                    <td>{d.consumo_teorico}</td>
                    <td>{d.consumo_real}</td>
                    <td style={{ 
                      color: d.desviacion > 0 ? 'var(--danger)' : d.desviacion < 0 ? 'var(--success)' : 'inherit',
                      fontWeight: 600 
                    }}>
                      {d.desviacion > 0 ? '+' : ''}{d.desviacion}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                          <div 
                            style={{ 
                              width: `${Math.min(150, d.porcentaje_consumido)}%`, 
                              maxWidth: '100%',
                              height: '100%', 
                              background: d.porcentaje_consumido > 100 ? 'var(--danger)' : d.porcentaje_consumido > 80 ? 'var(--warning)' : 'var(--primary)',
                              transition: 'width 0.3s ease'
                            }} 
                          />
                        </div>
                        <small style={{ fontSize: '11px' }}>{d.porcentaje_consumido}%</small>
                      </div>
                    </td>
                    <td style={{ color: 'var(--danger)', fontWeight: 600 }}>{d.coste_desviacion} €</td>
                    <td>
                      <span className={`badge ${d.estado === 'exceso' ? 'badge-danger' : d.estado === 'infraconsumo' ? 'badge-success' : 'badge-info'}`}>
                        {d.estado === 'exceso' ? '⚠️ Exceso' : d.estado === 'infraconsumo' ? '✅ Bajo' : '✔️ Normal'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: 'var(--gray-500)', padding: '1rem 0' }}>No hay datos de desviación para los filtros seleccionados.</p>
        )}
      </div>
    </div>
  )
}
