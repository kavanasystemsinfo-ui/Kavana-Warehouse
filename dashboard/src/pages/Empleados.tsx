import { useState, useEffect } from 'react'
import { getEmpleados, createEmpleado, getCentros, type Empleado } from '../lib/api'
import { GuiaAyuda } from '../components/GuiaAyuda'

export function Empleados() {
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [centros, setCentros] = useState<any[]>([])
  const [filtroCentro, setFiltroCentro] = useState<string>('')
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

  const empleadosFiltrados = filtroCentro
    ? empleados.filter(e => e.asignaciones?.[0]?.centro?.id_centro === Number(filtroCentro))
    : empleados;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">👥 Empleados</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select className="form-select" value={filtroCentro} onChange={e => setFiltroCentro(e.target.value)} style={{ minWidth: 200 }}>
            <option value="">Todos los centros</option>
            {centros.map((c: any) => <option key={c.id_centro} value={c.id_centro}>{c.nombre_centro || c.nombre}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Nuevo Empleado</button>
          <GuiaAyuda titulo="Empleados">
            <p>Aquí ves <strong>todos tus empleados</strong> y a qué centro pertenece cada uno.</p>
            <h3>¿Qué ves en la tabla?</h3>
            <ul>
              <li><strong>Nombre y email:</strong> datos de contacto del empleado.</li>
              <li><strong>Nº Empleado:</strong> un número que se le asigna a cada persona (para identificarla rápido).</li>
              <li><strong>Centro:</strong> el lugar donde trabaja.</li>
              <li><strong>Estado:</strong> si está activo o de baja.</li>
            </ul>
            <h3>¿Cómo filtrar por centro?</h3>
            <p>Usa el desplegable de arriba a la derecha (<strong>"Todos los centros"</strong>). Elige un centro y solo verás a sus empleados.</p>
            <h3>¿Cómo añadir un empleado?</h3>
            <p>Pulsa <strong>"+ Nuevo Empleado"</strong>, rellena nombre, email, centro y su número. Se guarda al momento.</p>
          </GuiaAyuda>
        </div>
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
              {empleadosFiltrados.length === 0 ? (
                <tr><td colSpan={5} style={{ color: '#6b7280' }}>No hay empleados en este centro</td></tr>
              ) : (
                empleadosFiltrados.map(e => (
                  <tr key={e.id_usuario}>
                    <td><strong>{e.nombre} {e.apellidos || ''}</strong></td>
                    <td>{e.email}</td>
                    <td>{e.numero_empleado || '—'}</td>
                    <td>{e.asignaciones?.[0]?.centro?.nombre_centro || '—'}</td>
                    <td><span className={`badge ${e.estado === 'activo' ? 'badge-success' : 'badge-secondary'}`}>{e.estado}</span></td>
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
