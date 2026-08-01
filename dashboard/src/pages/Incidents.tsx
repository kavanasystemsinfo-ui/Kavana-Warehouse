import { useState, useEffect } from 'react'
import { getIncidencias, updateIncidencia, getCentros, type Incidencia, type Centro } from '../lib/api'

const CATEGORIAS = [
  { value: '', label: 'Todas' },
  { value: 'limpieza', label: '🧼 Limpieza' },
  { value: 'fontaneria', label: '🚰 Fontanería' },
  { value: 'electricidad', label: '⚡ Electricidad' },
  { value: 'cerrajeria', label: '🔑 Cerrajería' },
  { value: 'otros', label: '❓ Otros' },
]

const ESTADOS = [
  { value: '', label: 'Todos' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'en_proceso', label: 'En Proceso' },
  { value: 'resuelta', label: 'Resuelta' },
]

const CATEGORIA_ICONS: Record<string, string> = {
  limpieza: '🧼',
  fontaneria: '🚰',
  electricidad: '⚡',
  cerrajeria: '🔑',
  otros: '❓',
}

export function Incidents() {
  const [incidencias, setIncidencias] = useState<Incidencia[]>([])
  const [centros, setCentros] = useState<Centro[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filtroCentro, setFiltroCentro] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [res, centrosData] = await Promise.all([
        getIncidencias({
          centro: filtroCentro ? Number(filtroCentro) : undefined,
          estado: filtroEstado || undefined,
          categoria: filtroCategoria || undefined,
        }),
        getCentros(),
      ])
      setIncidencias(res.incidencias)
      setTotal(res.total)
      setCentros(centrosData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar incidencias')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault()
    loadData()
  }

  const handleChangeEstado = async (id: number, nuevoEstado: string) => {
    try {
      await updateIncidencia(id, { estado: nuevoEstado })
      loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar')
    }
  }

  if (loading && incidencias.length === 0) {
    return (
      <div className="loading">
        <div className="spinner" />
        Cargando incidencias...
      </div>
    )
  }

  const pendientes = incidencias.filter(i => i.estado === 'pendiente').length
  const enProceso = incidencias.filter(i => i.estado === 'en_proceso').length
  const resueltas = incidencias.filter(i => i.estado === 'resuelta').length

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Incidencias en Instalaciones</h1>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card danger">
          <span className="stat-label">Pendientes</span>
          <span className="stat-value">{pendientes}</span>
          <span className="stat-sub">sin resolver</span>
        </div>
        <div className="stat-card warning">
          <span className="stat-label">En Proceso</span>
          <span className="stat-value">{enProceso}</span>
          <span className="stat-sub">en resolución</span>
        </div>
        <div className="stat-card primary">
          <span className="stat-label">Resueltas</span>
          <span className="stat-value">{resueltas}</span>
          <span className="stat-sub">completadas</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total</span>
          <span className="stat-value">{total}</span>
          <span className="stat-sub">incidencias registradas</span>
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
            <label className="form-label">Categoría</label>
            <select className="form-select" value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
              {CATEGORIAS.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Estado</label>
            <select className="form-select" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
              {ESTADOS.map((est) => (
                <option key={est.value} value={est.value}>{est.label}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary" type="submit">Filtrar</button>
        </form>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Listado de Incidencias</h2>
        </div>
        {incidencias.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Centro</th>
                  <th>Categoría</th>
                  <th>Título</th>
                  <th>Reportado por</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {incidencias.map((inc) => (
                  <tr key={inc.id_incidencia}>
                    <td>{new Date(inc.fecha_creacion).toLocaleString('es-ES')}</td>
                    <td><strong>{inc.centro.nombre_centro}</strong></td>
                    <td>
                      <span className="badge badge-info">
                        {CATEGORIA_ICONS[inc.categoria] || '❓'} {inc.categoria}
                      </span>
                    </td>
                    <td title={inc.descripcion}>{inc.titulo}</td>
                    <td>{inc.usuario.nombre}</td>
                    <td>
                      <span className={`badge ${inc.estado === 'pendiente' ? 'badge-danger' : inc.estado === 'en_proceso' ? 'badge-warning' : 'badge-success'}`}>
                        {inc.estado === 'pendiente' ? '🔴 Pendiente' : inc.estado === 'en_proceso' ? '🟡 En proceso' : '🟢 Resuelta'}
                      </span>
                    </td>
                    <td>
                      {inc.estado === 'pendiente' && (
                        <button className="btn btn-sm" style={{ background: 'var(--warning)', color: '#000' }} onClick={() => handleChangeEstado(inc.id_incidencia, 'en_proceso')}>
                          Iniciar
                        </button>
                      )}
                      {inc.estado === 'en_proceso' && (
                        <button className="btn btn-sm btn-primary" onClick={() => handleChangeEstado(inc.id_incidencia, 'resuelta')}>
                          Resolver
                        </button>
                      )}
                      {inc.estado === 'resuelta' && (
                        <span style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>✔ Cerrada</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: 'var(--gray-500)', padding: '1rem 0' }}>No hay incidencias registradas.</p>
        )}
      </div>
    </div>
  )
}
