import { useState, useEffect } from 'react'
import { getCostes, setPresupuesto, type CostesData, type CosteCentro } from '../lib/api'

export function Costes() {
  const [data, setData] = useState<CostesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editando, setEditando] = useState<CosteCentro | null>(null)
  const [valor, setValor] = useState('')
  const [guardando, setGuardando] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const d = await getCostes()
      setData(d)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar costes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const abrir = (c: CosteCentro) => {
    setEditando(c)
    setValor(String(c.presupuesto_mensual))
  }
  const cerrar = () => { setEditando(null); setValor('') }

  const guardar = async () => {
    if (!editando) return
    const v = Number(valor)
    if (!Number.isFinite(v) || v < 0) { setError('Introduce un importe válido'); return }
    setGuardando(true)
    setError('')
    try {
      await setPresupuesto(editando.centro.id_centro, v)
      cerrar()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  if (loading && !data) {
    return <div className="loading"><div className="spinner" /> Calculando costes...</div>
  }

  const barColor = (e: string) => e === 'rojo' ? 'var(--danger)' : e === 'ambar' ? 'var(--warning)' : e === 'verde' ? 'var(--success)' : 'var(--gray-300)'
  const badgeText = (e: string) => e === 'rojo' ? '🔴 Te pasas' : e === 'ambar' ? '🟡 Vas justo' : e === 'verde' ? '🟢 Controlado' : '⚪ Sin presupuesto'

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">💶 Coste por Centro</h1>
          <span className="stat-sub">Material consumido vs. lo que quieres gastar — {data?.mes}</span>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="stats-grid">
        <div className="stat-card danger">
          <span className="stat-label">Coste total material (mes)</span>
          <span className="stat-value">{data?.total_coste ?? 0} €</span>
          <span className="stat-sub">suma de todos los centros</span>
        </div>
        <div className="stat-card primary">
          <span className="stat-label">Presupuesto total fijado</span>
          <span className="stat-value">{data?.total_presupuesto ?? 0} €</span>
          <span className="stat-sub">lo que tú quieres gastar</span>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h2 className="card-title">Por centro</h2></div>
        {data && data.centros.length > 0 ? (
          <div className="coste-grid">
            {data.centros.map((c) => (
              <div key={c.centro.id_centro} className="coste-card">
                <div className="coste-card-header">
                  <strong>{c.centro.nombre_centro}</strong>
                  <span className={`badge ${c.estado === 'rojo' ? 'badge-danger' : c.estado === 'ambar' ? 'badge-warning' : c.estado === 'verde' ? 'badge-success' : 'badge-secondary'}`}>
                    {badgeText(c.estado)}
                  </span>
                </div>
                <div className="coste-amount">{c.coste_material} € <span className="coste-sub">gastado</span></div>
                {c.porcentaje_usado !== null ? (
                  <>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${Math.min(c.porcentaje_usado, 100)}%`, background: barColor(c.estado) }} />
                    </div>
                    <div className="coste-meta">
                      {c.porcentaje_usado}% de tu presupuesto ({c.presupuesto_mensual} €)
                      {c.diferencia !== null && (
                        <span style={{ color: c.diferencia >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                          {c.diferencia >= 0 ? ` · Te sobran ${c.diferencia} €` : ` · Te pasas ${Math.abs(c.diferencia)} €`}
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="coste-meta">Aún no has fijado presupuesto para este centro</div>
                )}
                <button className="btn btn-sm btn-outline" onClick={() => abrir(c)} style={{ marginTop: '0.75rem' }}>
                  {c.presupuesto_mensual > 0 ? 'Cambiar presupuesto' : 'Fijar presupuesto'}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--gray-500)', padding: '1rem 0' }}>No hay datos de coste todavía.</p>
        )}
      </div>

      {editando && (
        <div className="modal-overlay" onClick={cerrar}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Presupuesto mensual — {editando.centro.nombre_centro}</h3>
            <p className="stat-sub">¿Cuánto quieres gastar en material al mes en este centro?</p>
            <div className="form-group">
              <label className="form-label">Importe (€/mes)</label>
              <input className="form-input" type="number" min="0" step="10" value={valor} onChange={(e) => setValor(e.target.value)} autoFocus />
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={cerrar} disabled={guardando}>Cancelar</button>
              <button className="btn btn-primary" onClick={guardar} disabled={guardando}>
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
