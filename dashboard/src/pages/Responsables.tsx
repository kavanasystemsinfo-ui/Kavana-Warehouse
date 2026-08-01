import { useState, useEffect } from 'react'
import {
  getResponsables, createResponsable, getCentros, assignCentrosToResponsable, getRecuentos,
  type Responsable, type Recuento,
} from '../lib/api'
import { GuiaAyuda } from '../components/GuiaAyuda'

export function Responsables() {
  const [responsables, setResponsables] = useState<Responsable[]>([])
  const [centros, setCentros] = useState<any[]>([])
  const [recuentos, setRecuentos] = useState<Recuento[]>([])
  const [filtroCentro, setFiltroCentro] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({ nombre: '', email: '', password: '', telefono: '' })
  const [editId, setEditId] = useState<number | null>(null)
  const [selected, setSelected] = useState<number[]>([])

  const load = async () => {
    try {
      const [resp, ctrs, rec] = await Promise.all([getResponsables(), getCentros(), getRecuentos()])
      setResponsables(resp)
      setCentros(ctrs)
      setRecuentos(rec)
    } catch (e: any) { setMsg(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    try {
      await createResponsable({ ...form, password: form.password || 'cleanstock' })
      setShowForm(false)
      setMsg('Responsable creado')
      setForm({ nombre: '', email: '', password: '', telefono: '' })
      load()
    } catch (e: any) { setMsg(e.message) }
  }

  const abrirEdicion = (r: Responsable) => {
    setEditId(r.id_usuario)
    setSelected(r.centros_asignados?.map(c => c.id_centro) || [])
  }

  const toggleCentro = (id: number) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const guardarCentros = async (idUsuario: number) => {
    try {
      await assignCentrosToResponsable(idUsuario, selected)
      setMsg('Centros actualizados')
      setEditId(null)
      load()
    } catch (e: any) { setMsg(e.message) }
  }

  if (loading) return <div className="loading"><div className="spinner" />Cargando responsables...</div>

  const recuentosFiltrados = filtroCentro
    ? recuentos.filter(r => r.centro.id_centro === Number(filtroCentro))
    : recuentos

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">🧑‍💼 Responsables de centro</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Nuevo Responsable</button>
          <GuiaAyuda titulo="Responsables de centro">
            <p>Los <strong>responsables</strong> son personas que tú (supervisor) autorizas a entrar en la app móvil para hacer el <strong>recuento físico del stock</strong> de uno o varios centros.</p>
            <h3>¿Cómo crear uno?</h3>
            <p>Pulsa <strong>"+ Nuevo Responsable"</strong>, ponle nombre, email y contraseña. Él usará ese email y password en la app móvil.</p>
            <h3>¿Cómo darle centros?</h3>
            <p>En su fila pulsa <strong>"Centros"</strong>. Marca con ✓ los centros que puede gestionar y pulsa <strong>Guardar</strong>. Solo verá esos centros en su app.</p>
            <h3>¿Qué es la tabla de recuentos?</h3>
            <p>Abajo verás el <strong>histórico</strong>: cada vez que un responsable cuenta el stock real, queda registrado con su nombre, fecha, centro, producto y cantidad.</p>
          </GuiaAyuda>
        </div>
      </div>
      {msg && <div className={`alert ${msg.includes('Error') ? 'alert-danger' : 'alert-success'}`}>{msg}</div>}

      {showForm && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3>Nuevo Responsable</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
            <div className="form-group">
              <label className="form-label">Nombre</label>
              <input className="form-input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Contraseña</label>
              <input className="form-input" type="password" placeholder="cleanstock" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Teléfono</label>
              <input className="form-input" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} />
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
                <th>Teléfono</th>
                <th>Centros asignados</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {responsables.length === 0 ? (
                <tr><td colSpan={5} style={{ color: '#6b7280' }}>No hay responsables creados todavía</td></tr>
              ) : (
                responsables.map(r => (
                  <tr key={r.id_usuario}>
                    <td><strong>{r.nombre}</strong></td>
                    <td>{r.email}</td>
                    <td>{r.telefono || '—'}</td>
                    <td>{r.centros_asignados?.map(c => c.nombre_centro).join(', ') || '—'}</td>
                    <td>
                      {editId === r.id_usuario ? (
                        <div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                            {centros.map(c => (
                              <label key={c.id_centro} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                                <input type="checkbox" checked={selected.includes(c.id_centro)} onChange={() => toggleCentro(c.id_centro)} />
                                {c.nombre_centro || c.nombre}
                              </label>
                            ))}
                          </div>
                          <button className="btn btn-primary btn-sm" onClick={() => guardarCentros(r.id_usuario)}>Guardar</button>
                          <button className="btn btn-outline btn-sm" onClick={() => setEditId(null)}>Cancelar</button>
                        </div>
                      ) : (
                        <button className="btn btn-outline btn-sm" onClick={() => abrirEdicion(r)}>Centros</button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 28 }}>
        <h2 className="page-title">📋 Histórico de recuentos</h2>
        <select className="form-select" value={filtroCentro} onChange={e => setFiltroCentro(e.target.value)} style={{ minWidth: 200 }}>
          <option value="">Todos los centros</option>
          {centros.map((c: any) => <option key={c.id_centro} value={c.id_centro}>{c.nombre_centro || c.nombre}</option>)}
        </select>
      </div>
      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Responsable</th>
                <th>Centro</th>
                <th>Producto</th>
                <th>Cantidad registrada</th>
              </tr>
            </thead>
            <tbody>
              {recuentosFiltrados.length === 0 ? (
                <tr><td colSpan={5} style={{ color: '#6b7280' }}>Aún no hay recuentos registrados</td></tr>
              ) : (
                recuentosFiltrados.map(r => (
                  <tr key={r.id_movimiento}>
                    <td>{new Date(r.fecha_hora).toLocaleString('es-ES')}</td>
                    <td>{r.responsable.nombre}</td>
                    <td>{r.centro.nombre_centro}</td>
                    <td>{r.producto.nombre_producto} ({r.producto.unidad_medida})</td>
                    <td><strong>{r.cantidad_nueva}</strong></td>
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
