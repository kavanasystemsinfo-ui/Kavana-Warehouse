import { useState, useEffect } from 'react'
import { getCentros, createCentro, type Centro } from '../lib/api'

export function Centros() {
  const [centros, setCentros] = useState<Centro[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({ nombre: '', direccion: '', telefono: '' })

  const load = async () => {
    try { setCentros(await getCentros()) }
    catch (e: any) { setMsg(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    try {
      await createCentro(form)
      setShowForm(false)
      setMsg('Centro creado')
      setForm({ nombre: '', direccion: '', telefono: '' })
      load()
    } catch (e: any) { setMsg(e.message) }
  }

  if (loading) return <div className="loading"><div className="spinner" />Cargando centros...</div>

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">🏢 Centros de Trabajo</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Nuevo Centro</button>
      </div>
      {msg && <div className={`alert ${msg.includes('Error') ? 'alert-danger' : 'alert-success'}`}>{msg}</div>}

      {showForm && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3>Nuevo Centro</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
            <div className="form-group">
              <label className="form-label">Nombre</label>
              <input className="form-input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Teléfono</label>
              <input className="form-input" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Dirección</label>
              <input className="form-input" value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn btn-primary" onClick={handleCreate}>Crear</button>
            <button className="btn btn-outline" onClick={() => setShowForm(false)}>Cancelar</button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Dirección</th>
                <th>Teléfono</th>
                <th>Empleados</th>
                <th>Productos</th>
              </tr>
            </thead>
            <tbody>
              {centros.length === 0 ? (
                <tr><td colSpan={5} style={{ color: '#9ca3af' }}>No hay centros registrados</td></tr>
              ) : (
                centros.map(c => (
                  <tr key={c.id_centro}>
                    <td><strong>{(c as any).nombre_centro || '—'}</strong></td>
                    <td>{c.direccion || '—'}</td>
                    <td>{c.telefono || '—'}</td>
                    <td>{c._count?.usuarios || '—'}</td>
                    <td>{c._count?.inventario_centros || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
