import { useState, useEffect } from 'react'
import { getEmpleados, createEmpleado, getCentros, type Empleado } from '../lib/api'

export function Empleados() {
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [centros, setCentros] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({ nombre: '', apellidos: '', email: '', password: 'cleanstock', numero_empleado: '', id_centro: 0 })

  const load = async () => {
    try {
      const [emps, ctrs] = await Promise.all([getEmpleados(), getCentros()])
      setEmpleados(emps)
      setCentros(ctrs)
    } catch (e: any) { setMsg(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    try {
      await createEmpleado({ ...form, id_centro: form.id_centro || centros[0]?.id_centro })
      setShowForm(false)
      setMsg('Empleado creado')
      setForm({ nombre: '', apellidos: '', email: '', password: 'cleanstock', numero_empleado: '', id_centro: 0 })
      load()
    } catch (e: any) { setMsg(e.message) }
  }

  if (loading) return <div className="loading"><div className="spinner" />Cargando empleados...</div>

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">👥 Empleados</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Nuevo Empleado</button>
      </div>
      {msg && <div className={`alert ${msg.includes('Error') ? 'alert-danger' : 'alert-success'}`}>{msg}</div>}

      {showForm && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3>Nuevo Empleado</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
            <div className="form-group">
              <label className="form-label">Nombre</label>
              <input className="form-input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Apellidos</label>
              <input className="form-input" value={form.apellidos} onChange={e => setForm({ ...form, apellidos: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Contraseña</label>
              <input className="form-input" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Nº Empleado</label>
              <input className="form-input" value={form.numero_empleado} onChange={e => setForm({ ...form, numero_empleado: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Centro</label>
              <select className="form-select" value={form.id_centro || centros[0]?.id_centro || ''} onChange={e => setForm({ ...form, id_centro: Number(e.target.value) })}>
                {centros.map((c: any) => <option key={c.id_centro} value={c.id_centro}>{c.nombre}</option>)}
              </select>
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
                <th>Email</th>
                <th>Nº Empleado</th>
                <th>Centro</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {empleados.length === 0 ? (
                <tr><td colSpan={5} style={{ color: '#9ca3af' }}>No hay empleados registrados</td></tr>
              ) : (
                empleados.map(e => (
                  <tr key={e.id_usuario}>
                    <td><strong>{e.nombre} {e.apellidos || ''}</strong></td>
                    <td>{e.email}</td>
                    <td>{e.numero_empleado || '—'}</td>
                    <td>{(e as any).centro?.nombre_centro || '—'}</td>
                    <td><span className="badge badge-info">{e.estado}</span></td>
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
