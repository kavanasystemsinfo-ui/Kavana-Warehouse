import { useState, useEffect, Fragment } from 'react'
import { getCentros, createCentro, updateCentro, getCatalogoProductos, addProductoCentro, type Centro, type Producto } from '../lib/api'
import { GuiaAyuda } from '../components/GuiaAyuda'

export function Centros() {
  const [centros, setCentros] = useState<Centro[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  // Modal nuevo
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nombre: '', direccion: '', presupuesto: '' })

  // Modal editar
  const [editando, setEditando] = useState<Centro | null>(null)
  const [editForm, setEditForm] = useState({ nombre_centro: '', direccion: '', presupuesto_mensual: '' })
  const [guardando, setGuardando] = useState(false)

  // Modal añadir producto a centro
  const [showAddProd, setShowAddProd] = useState(false)
  const [addCentroId, setAddCentroId] = useState<number | null>(null)
  const [catalogo, setCatalogo] = useState<Producto[]>([])
  const [addProdId, setAddProdId] = useState('')
  const [addCantidad, setAddCantidad] = useState('')
  const [addMinimo, setAddMinimo] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState('')
  const [addSuccess, setAddSuccess] = useState('')

  const load = async () => {
    try { setCentros(await getCentros()) }
    catch (e: any) { setMsg(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    try {
      await createCentro({ nombre: form.nombre, direccion: form.direccion })
      setShowForm(false)
      setMsg('Centro creado')
      setForm({ nombre: '', direccion: '', presupuesto: '' })
      load()
    } catch (e: any) { setMsg(e.message) }
  }

  const abrirEditar = (c: Centro) => {
    setEditando(c)
    setEditForm({
      nombre_centro: (c as any).nombre_centro || '',
      direccion: c.direccion || '',
      presupuesto_mensual: String((c as any).presupuesto_mensual ?? ''),
    })
    setMsg('')
  }
  const cerrarEditar = () => { setEditando(null); setMsg('') }

  const abrirAddProd = async (idCentro: number) => {
    setAddCentroId(idCentro)
    setAddProdId('')
    setAddCantidad('')
    setAddMinimo('')
    setAddError('')
    setAddSuccess('')
    setShowAddProd(true)
    try {
      const cats = await getCatalogoProductos()
      setCatalogo(cats)
    } catch {
      setCatalogo([])
    }
  }

  const guardarAddProd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addCentroId || !addProdId) {
      setAddError('Elige un producto del catálogo.')
      return
    }
    const cantidad = parseInt(addCantidad) || 0
    const minimo = parseInt(addMinimo) || 0
    setAddLoading(true)
    setAddError('')
    try {
      await addProductoCentro({
        id_centro: addCentroId,
        id_producto: parseInt(addProdId),
        cantidad_actual: cantidad,
        stock_minimo: minimo,
      })
      setAddSuccess('Producto añadido al centro.')
      await load()
      setTimeout(() => { setShowAddProd(false); setAddSuccess('') }, 1000)
    } catch (err: any) {
      setAddError(err?.message || 'Error al añadir el producto.')
    } finally {
      setAddLoading(false)
    }
  }

  const handleUpdate = async () => {
    if (!editando) return
    const v = Number(editForm.presupuesto_mensual)
    if (!Number.isFinite(v) || v < 0) { setMsg('Presupuesto inválido'); return }
    setGuardando(true)
    setMsg('')
    try {
      await updateCentro((editando as any).id_centro, {
        nombre_centro: editForm.nombre_centro,
        direccion: editForm.direccion,
        presupuesto_mensual: v,
      })
      cerrarEditar()
      setMsg('Centro actualizado')
      load()
    } catch (e: any) { setMsg(e.message) }
    finally { setGuardando(false) }
  }

  const [centroAbierto, setCentroAbierto] = useState<number | null>(null)

  if (loading) return <div className="loading"><div className="spinner" />Cargando centros...</div>

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">🏢 Centros de Trabajo</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Nuevo Centro</button>
          <GuiaAyuda titulo="Centros">
            <p>Esta pantalla muestra <strong>tus centros de trabajo</strong> (los lugares donde limpias) y qué tienen cada uno.</p>
            <h3>¿Qué ves en la tabla?</h3>
            <ul>
              <li><strong>Nombre y dirección:</strong> el centro y dónde está.</li>
              <li><strong>Presupuesto/mes:</strong> lo que quieres gastar al mes en ese centro.</li>
              <li><strong>Empleados y Productos:</strong> cuánta gente y qué material hay asignado.</li>
            </ul>
            <h3>¿Cómo ver el detalle de un centro?</h3>
            <p><strong>Clica en cualquier fila</strong> (en el nombre). Se despliega la lista de empleados y los productos que tiene ese centro, con su stock.</p>
            <h3>¿Cómo cambiar datos de un centro?</h3>
            <p>Pulsa <strong>"Editar"</strong> en la fila. Puedes cambiar el nombre, la dirección y el presupuesto mensual.</p>
            <h3>¿Cómo añadir productos a un centro?</h3>
            <p>Despliega el centro y pulsa <strong>"➕ Añadir producto"</strong>. Eliges un producto del catálogo general, pones la cantidad inicial y el stock mínimo. Aparece en la lista de productos del centro.</p>
            <p>Para crear un producto nuevo que no exista, ve a la pestaña <strong>Inventario → "➕ Nuevo Producto"</strong>. Se guarda en el catálogo general y luego lo añades desde aquí.</p>
          </GuiaAyuda>
        </div>
      </div>
      {msg && <div className={`alert ${msg.includes('Error') || msg.includes('inválido') ? 'alert-danger' : 'alert-success'}`}>{msg}</div>}

      {showForm && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3>Nuevo Centro</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
            <div className="form-group">
              <label className="form-label">Nombre</label>
              <input className="form-input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
            </div>
            <div className="form-group">
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
                <th>Presupuesto/mes</th>
                <th>Empleados</th>
                <th>Productos</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {centros.length === 0 ? (
                <tr><td colSpan={6} style={{ color: '#9ca3af' }}>No hay centros registrados</td></tr>
              ) : (
                centros.map(c => {
                  const id = (c as any).id_centro;
                  const abierto = centroAbierto === id;
                  const emps = (c as any).asignaciones || [];
                  const prods = (c as any).inventarioCentros || [];
                  return (
                    <Fragment key={id}>
                      <tr
                        className={`centro-fila${abierto ? ' abierto' : ''}`}
                        onClick={() => setCentroAbierto(abierto ? null : id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>
                          <span className="centro-flecha">{abierto ? '▾' : '▸'}</span>
                          <strong>{(c as any).nombre_centro || '—'}</strong>
                        </td>
                        <td>{c.direccion || '—'}</td>
                        <td>{(c as any).presupuesto_mensual ? `${(c as any).presupuesto_mensual} €` : '—'}</td>
                        <td>{(c as any)._count?.asignaciones ?? '—'}</td>
                        <td>{(c as any)._count?.inventarioCentros ?? '—'}</td>
                        <td>
                          <button className="btn btn-sm btn-outline" onClick={(e) => { e.stopPropagation(); abrirEditar(c); }}>Editar</button>
                        </td>
                      </tr>
                      {abierto && (
                        <tr className="detalle-fila">
                          <td colSpan={6}>
                            <div className="detalle-grid">
                              <div>
                                <h4>👷 Empleados ({emps.length})</h4>
                                {emps.length === 0 ? (
                                  <p className="detalle-vacio">Sin personal asignado</p>
                                ) : (
                                  <ul className="detalle-lista">
                                    {emps.map((a: any, i: number) => (
                                      <li key={i}>
                                        {a.usuario.nombre}
                                        <span className="detalle-rol">{a.usuario.rol}</span>
                                        {a.usuario.numero_empleado && <span className="detalle-extra"> · Nº {a.usuario.numero_empleado}</span>}
                                        {a.usuario.telefono && <span className="detalle-extra"> · 📞 {a.usuario.telefono}</span>}
                                        {a.usuario.email && <span className="detalle-extra"> · ✉️ {a.usuario.email}</span>}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                              <div>
                                <h4>📦 Productos ({prods.length})</h4>
                                <button className="btn btn-sm btn-primary" style={{ marginBottom: '0.75rem' }} onClick={(e) => { e.stopPropagation(); abrirAddProd(id); }}>➕ Añadir producto</button>
                                {prods.length === 0 ? (
                                  <p className="detalle-vacio">Sin inventario</p>
                                ) : (
                                  <ul className="detalle-lista">
                                    {prods.map((inv: any, i: number) => {
                                      const reg = inv.cantidad_actual;
                                      const fis = inv.stock_fisico;
                                      const merma = (fis !== null && reg > fis) ? reg - fis : null;
                                      return (
                                        <li key={i}>
                                          {inv.producto.nombre_producto} ({inv.producto.unidad_medida})
                                          <span className="detalle-stock">reg. {reg}{fis !== null ? ` · fís. ${fis}` : ''}{merma !== null ? ` · 🔴 -${merma}` : ''}</span>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editando && (
        <div className="modal-overlay" onClick={cerrarEditar}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Editar Centro</h3>
            <div className="form-group">
              <label className="form-label">Nombre</label>
              <input className="form-input" value={editForm.nombre_centro} onChange={e => setEditForm({ ...editForm, nombre_centro: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Dirección</label>
              <input className="form-input" value={editForm.direccion} onChange={e => setEditForm({ ...editForm, direccion: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Presupuesto mensual (€)</label>
              <input className="form-input" type="number" min="0" step="10" value={editForm.presupuesto_mensual} onChange={e => setEditForm({ ...editForm, presupuesto_mensual: e.target.value })} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={cerrarEditar} disabled={guardando}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleUpdate} disabled={guardando}>
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Añadir producto al centro */}
      {showAddProd && (
        <div className="modal-overlay" onClick={() => setShowAddProd(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>➕ Añadir producto al centro</span>
              <button type="button" className="btn btn-outline" style={{ padding: '0.25rem 0.6rem' }} onClick={() => setShowAddProd(false)}>✕</button>
            </div>
            {addSuccess && <div className="alert alert-success">{addSuccess}</div>}
            {addError && <div className="alert alert-danger">{addError}</div>}
            <form onSubmit={guardarAddProd}>
              <div className="form-group">
                <label className="form-label">Producto del catálogo *</label>
                <select className="form-select" value={addProdId} onChange={(e) => setAddProdId(e.target.value)} required>
                  <option value="">Selecciona un producto...</option>
                  {catalogo.map((p) => (
                    <option key={p.id_producto} value={p.id_producto}>{p.nombre_producto} ({p.unidad_medida})</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Cantidad inicial</label>
                  <input className="form-input" type="number" min="0" value={addCantidad} onChange={(e) => setAddCantidad(e.target.value)} placeholder="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">Stock mínimo</label>
                  <input className="form-input" type="number" min="0" value={addMinimo} onChange={(e) => setAddMinimo(e.target.value)} placeholder="0" />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowAddProd(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={addLoading}>
                  {addLoading ? 'Añadiendo...' : 'Añadir al centro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
