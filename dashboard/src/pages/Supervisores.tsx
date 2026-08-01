import { useState, useEffect } from 'react'
import {
  getSupervisoresDemo, createSupervisorDemo, getSessionId,
  type SupervisorDemo,
} from '../lib/api'

// Supervisores demo: los crea la oficina para probar el flujo de recuento.
// Se guardan en la BD asociados a la sesión de este navegador (session_id)
// y caducan automáticamente a las 24h (cron del backend).
export function Supervisores() {
  const [supervisores, setSupervisores] = useState<SupervisorDemo[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({ nombre: '', email: '', password: '' })

  const load = async () => {
    try {
      const sessionId = getSessionId()
      const list = await getSupervisoresDemo(sessionId)
      setSupervisores(list)
    } catch (e: any) { setMsg(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    try {
      const sessionId = getSessionId()
      await createSupervisorDemo({ ...form, session_id: sessionId })
      setShowForm(false)
      setMsg('Supervisor de prueba creado. Caduca en 24h.')
      setForm({ nombre: '', email: '', password: '' })
      load()
    } catch (e: any) { setMsg(e.message) }
  }

  if (loading) return <div className="loading"><div className="spinner" />Cargando supervisores...</div>

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Supervisores de prueba</h1>
          <p style={{ color: 'var(--text2)', fontSize: '.9rem', margin: 0 }}>
            Crea supervisores para probar el flujo de recuento. Se guardan solo en este navegador
            y caducan a las 24 horas.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}>
          {showForm ? 'Cancelar' : '+ Nuevo supervisor'}
        </button>
      </div>

      {msg && <div className="alert" style={{ marginTop: '1rem' }}>{msg}</div>}

      {showForm && (
        <div className="card" style={{ marginTop: '1rem', padding: '1.5rem' }}>
          <h3 style={{ marginTop: 0 }}>Nuevo supervisor de prueba</h3>
          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <div className="form-group">
              <label className="form-label">Nombre</label>
              <input className="form-input" value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Marta Ruiz" />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })} placeholder="marta@demo.local" />
            </div>
            <div className="form-group">
              <label className="form-label">Contraseña</label>
              <input className="form-input" value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })} placeholder="mínimo 4 caracteres" />
            </div>
          </div>
          <button className="btn btn-primary" style={{ marginTop: '1rem' }}
            onClick={handleCreate} disabled={!form.nombre || !form.email || !form.password}>
            Crear supervisor
          </button>
        </div>
      )}

      <div className="card" style={{ marginTop: '1rem', overflow: 'hidden' }}>
        <table className="table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Caduca</th>
            </tr>
          </thead>
          <tbody>
            {supervisores.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text2)' }}>
                Aún no hay supervisores de prueba en este navegador.
              </td></tr>
            )}
            {supervisores.map(s => (
              <tr key={s.id_usuario}>
                <td>{s.nombre}</td>
                <td>{s.email}</td>
                <td><span className="badge">{s.rol}</span></td>
                <td>{s.expira_en ? new Date(s.expira_en).toLocaleString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
