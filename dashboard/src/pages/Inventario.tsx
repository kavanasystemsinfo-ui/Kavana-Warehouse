import { useState, useEffect } from 'react'
import {
  getProductos, getPurchaseProposal,
  createProducto, updateProducto, deleteProducto,
  type Producto,
} from '../lib/api'
import { exportToCsv } from '../lib/csv'
import { GuiaAyuda } from '../components/GuiaAyuda'

export function Inventario() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Modal nuevo producto
  const [showNuevo, setShowNuevo] = useState(false)
  const [npNombre, setNpNombre] = useState('')
  const [npUnidad, setNpUnidad] = useState('unidades')
  const [npCoste, setNpCoste] = useState('')
  const [npMinimo, setNpMinimo] = useState('')
  const [npLoading, setNpLoading] = useState(false)
  const [npError, setNpError] = useState('')

  // Modal editar producto
  const [showEdit, setShowEdit] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [editNombre, setEditNombre] = useState('')
  const [editUnidad, setEditUnidad] = useState('unidades')
  const [editCoste, setEditCoste] = useState('')
  const [editMinimo, setEditMinimo] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')

  // Borrar
  const [borrando, setBorrando] = useState<number | null>(null)

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const prods = await getProductos()
      setProductos(prods)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar productos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const openNuevo = () => {
    setNpNombre(''); setNpUnidad('unidades'); setNpCoste(''); setNpMinimo(''); setNpError('')
    setShowNuevo(true)
  }

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!npNombre.trim()) { setNpError('Escribe el nombre del producto.'); return }
    const coste = parseFloat(npCoste)
    const minimo = parseInt(npMinimo) || 0
    if (isNaN(coste) || coste < 0) { setNpError('El coste debe ser un número válido.'); return }
    setNpLoading(true); setNpError('')
    try {
      await createProducto({
        nombre_producto: npNombre.trim(),
        unidad_medida: npUnidad,
        coste_unitario: coste,
        stock_minimo_alerta: minimo,
      })
      setSuccess(`"${npNombre.trim()}" creado en el catálogo.`)
      setShowNuevo(false)
      loadData()
    } catch (err: any) {
      setNpError(err?.message || 'Error al crear el producto.')
    } finally {
      setNpLoading(false)
    }
  }

  const openEdit = (p: Producto) => {
    setEditId(p.id_producto)
    setEditNombre(p.nombre_producto)
    setEditUnidad(p.unidad_medida)
    setEditCoste(String(p.coste_unitario))
    setEditMinimo(String(p.stock_minimo_alerta ?? 0))
    setEditError('')
    setShowEdit(true)
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editId) return
    const coste = parseFloat(editCoste)
    const minimo = parseInt(editMinimo) || 0
    if (isNaN(coste) || coste < 0) { setEditError('El coste debe ser un número válido.'); return }
    setEditLoading(true); setEditError('')
    try {
      await updateProducto(editId, {
        nombre_producto: editNombre.trim(),
        unidad_medida: editUnidad,
        coste_unitario: coste,
        stock_minimo_alerta: minimo,
      })
      setSuccess('Producto actualizado.')
      setShowEdit(false)
      loadData()
    } catch (err: any) {
      setEditError(err?.message || 'Error al editar el producto.')
    } finally {
      setEditLoading(false)
    }
  }

  const handleDelete = async (p: Producto) => {
    if (!confirm(`¿Borrar "${p.nombre_producto}" del catálogo?`)) return
    setBorrando(p.id_producto)
    try {
      await deleteProducto(p.id_producto)
      setSuccess(`"${p.nombre_producto}" borrado.`)
      loadData()
    } catch (err: any) {
      setError(err?.message || 'No se pudo borrar.')
    } finally {
      setBorrando(null)
    }
  }

  const handleGenerateProposal = async () => {
    try {
      setLoading(true)
      const proposal = await getPurchaseProposal()
      if (proposal.propuestas.length === 0) {
        setSuccess('No hay productos por debajo del stock mínimo. No se requiere compra.')
        setTimeout(() => setSuccess(''), 4000)
        return
      }
      const rows = proposal.propuestas.map(p => ({
        Centro: p.centro.nombre_centro,
        Producto: p.producto.nombre_producto,
        'Stock Actual': p.stock_actual,
        'Stock Mínimo': p.stock_minimo,
        'Déficit': p.deficit,
        'Cantidad a Pedir': p.cantidad_pedido,
        'Coste Estimado (€)': p.coste_estimado,
      }))
      exportToCsv(`propuesta-compra-${new Date().toISOString().split('T')[0]}`, rows)
      setSuccess(`Propuesta exportada. Coste total estimado: ${proposal.total_coste_estimado} €`)
      setTimeout(() => setSuccess(''), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar propuesta')
    } finally {
      setLoading(false)
    }
  }

  if (loading && productos.length === 0) {
    return (
      <div className="loading">
        <div className="spinner" />
        Cargando catálogo...
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Catálogo de Productos</h1>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-outline" onClick={handleGenerateProposal}>
            📥 Propuesta de Compra
          </button>
          <button className="btn btn-primary" onClick={openNuevo}>
            ➕ Nuevo Producto
          </button>
          <GuiaAyuda titulo="Catálogo de Productos">
            <p>Esta pantalla es el <strong>catálogo general</strong> de tu empresa: la lista de <strong>tipos de productos</strong> que existen (guantes, lejía, papel...).</p>
            <p><strong>No</strong> es el stock por centro. Aquí solo defines qué productos hay, su unidad, su coste y el stock mínimo de referencia.</p>
            <h3>➕ Nuevo Producto</h3>
            <p>Crea un tipo de producto nuevo que no exista todavía.</p>
            <h3>✏️ Editar</h3>
            <p>Cambia el nombre, la unidad, el coste o el mínimo de un producto.</p>
            <h3>🗑️ Borrar</h3>
            <p>Elimina un producto del catálogo. Solo se puede si <strong>no está en ningún centro</strong>. Si lo usa un centro, quítalo de ese centro primero (pestaña Centros).</p>
            <h3>📥 Propuesta de Compra</h3>
            <p>Mira qué productos de todos los centros están por debajo de su mínimo y cuánto comprar, con el coste estimado. Se descarga en CSV.</p>
            <div className="guia-ejemplo">
              💡 Para añadir un producto al almacén de un edificio concreto, ve a la pestaña <strong>Centros</strong>, despliega el centro y pulsa <strong>"➕ Añadir producto"</strong>.
            </div>
          </GuiaAyuda>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Unidad</th>
                <th>Coste unitario (€)</th>
                <th>Stock mínimo ref.</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {productos.map((p) => (
                <tr key={p.id_producto}>
                  <td><strong>{p.nombre_producto}</strong></td>
                  <td>{p.unidad_medida}</td>
                  <td>{p.coste_unitario}</td>
                  <td>{p.stock_minimo_alerta ?? '—'}</td>
                  <td style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-sm btn-outline" onClick={() => openEdit(p)}>✏️ Editar</button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(p)} disabled={borrando === p.id_producto}>
                      {borrando === p.id_producto ? '...' : '🗑️'}
                    </button>
                  </td>
                </tr>
              ))}
              {productos.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)' }}>
                    No hay productos en el catálogo. Pulsa "➕ Nuevo Producto" para crear el primero.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Nuevo Producto */}
      {showNuevo && (
        <div className="modal-overlay" onClick={() => setShowNuevo(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>➕ Nuevo Producto</span>
              <button type="button" className="btn btn-outline" style={{ padding: '0.25rem 0.6rem' }} onClick={() => setShowNuevo(false)}>✕</button>
            </div>
            {npError && <div className="alert alert-danger">{npError}</div>}
            <form onSubmit={handleCrear}>
              <div className="form-group">
                <label className="form-label">Nombre del producto *</label>
                <input className="form-input" value={npNombre} onChange={(e) => setNpNombre(e.target.value)} placeholder="Ej: Guantes de latex (par)" required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Unidad</label>
                  <select className="form-select" value={npUnidad} onChange={(e) => setNpUnidad(e.target.value)}>
                    <option value="unidades">unidades</option>
                    <option value="rollos">rollos</option>
                    <option value="litros">litros</option>
                    <option value="pares">pares</option>
                    <option value="paquetes">paquetes</option>
                    <option value="cajas">cajas</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Coste unitario (€)</label>
                  <input className="form-input" type="number" step="0.01" min="0" value={npCoste} onChange={(e) => setNpCoste(e.target.value)} placeholder="0.00" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Stock mínimo de referencia</label>
                <input className="form-input" type="number" min="0" value={npMinimo} onChange={(e) => setNpMinimo(e.target.value)} placeholder="0" />
              </div>
              <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
                💡 El producto se guarda en el catálogo general. Para usarlo en un centro, ve a <strong>Centros</strong> y añádelo desde el detalle.
              </p>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowNuevo(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={npLoading}>
                  {npLoading ? 'Creando...' : 'Crear producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Producto */}
      {showEdit && (
        <div className="modal-overlay" onClick={() => setShowEdit(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>✏️ Editar Producto</span>
              <button type="button" className="btn btn-outline" style={{ padding: '0.25rem 0.6rem' }} onClick={() => setShowEdit(false)}>✕</button>
            </div>
            {editError && <div className="alert alert-danger">{editError}</div>}
            <form onSubmit={handleEdit}>
              <div className="form-group">
                <label className="form-label">Nombre del producto *</label>
                <input className="form-input" value={editNombre} onChange={(e) => setEditNombre(e.target.value)} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Unidad</label>
                  <select className="form-select" value={editUnidad} onChange={(e) => setEditUnidad(e.target.value)}>
                    <option value="unidades">unidades</option>
                    <option value="rollos">rollos</option>
                    <option value="litros">litros</option>
                    <option value="pares">pares</option>
                    <option value="paquetes">paquetes</option>
                    <option value="cajas">cajas</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Coste unitario (€)</label>
                  <input className="form-input" type="number" step="0.01" min="0" value={editCoste} onChange={(e) => setEditCoste(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Stock mínimo de referencia</label>
                <input className="form-input" type="number" min="0" value={editMinimo} onChange={(e) => setEditMinimo(e.target.value)} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowEdit(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={editLoading}>
                  {editLoading ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
