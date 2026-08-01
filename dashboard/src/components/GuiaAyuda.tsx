import { useState } from 'react'

interface GuiaAyudaProps {
  titulo: string
  children: React.ReactNode
}

// Componente reutilizable: botón "❓ Ayuda" en el header + modal con la guía de la página.
export function GuiaAyuda({ titulo, children }: GuiaAyudaProps) {
  const [abierto, setAbierto] = useState(false)

  return (
    <>
      <button
        type="button"
        className="btn btn-outline"
        style={{ marginLeft: 'auto' }}
        onClick={() => setAbierto(true)}
        aria-label="Abrir guía de ayuda"
      >
        ❓ Ayuda
      </button>

      {abierto && (
        <div className="modal-overlay" onClick={() => setAbierto(false)}>
          <div className="modal guia-modal" onClick={(e) => e.stopPropagation()}>
            <div className="guia-header">
              <h2 className="modal-title" style={{ margin: 0 }}>❓ Guía — {titulo}</h2>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setAbierto(false)}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
            <div className="guia-contenido">{children}</div>
            <div className="modal-actions">
              <button type="button" className="btn btn-primary" onClick={() => setAbierto(false)}>
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
