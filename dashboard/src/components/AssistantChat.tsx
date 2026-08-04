import { useState, useRef, FormEvent } from 'react'

// Asistente técnico de KAVANA WAREHOUSE: chat que responde con la documentación
// real del proyecto (README, DECISIONS, ADRs, docs técnicos).
// Reutilizado en el widget flotante del login y en la página /asistente.
const API_ASSISTANT = '/api/v1/assistant'

const sugerencias = [
  '¿Qué problema resuelve Kavana Warehouse?',
  '¿Cómo funciona el control de stock por centros?',
  '¿Cómo se calculan los costes reales?',
  '¿Qué decisiones técnicas tiene documentadas?',
]

interface Mensaje {
  role: 'user' | 'bot'
  text: string
  error?: boolean
}

export function AssistantChat() {
  const [q, setQ] = useState('')
  const [msgs, setMsgs] = useState<Mensaje[]>([])
  const [loading, setLoading] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    const pregunta = q.trim()
    if (!pregunta || loading) return
    setMsgs((m) => [...m, { role: 'user', text: pregunta }])
    setQ('')
    setLoading(true)
    try {
      const res = await fetch(API_ASSISTANT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: pregunta }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMsgs((m) => [...m, { role: 'bot', text: data.error || 'Algo falló, inténtalo de nuevo.', error: true }])
      } else {
        const fuentes = data.fuentes?.length ? `\n\n📄 ${data.fuentes.join(' · ')}` : ''
        setMsgs((m) => [...m, { role: 'bot', text: data.respuesta + fuentes }])
      }
    } catch {
      setMsgs((m) => [...m, { role: 'bot', text: 'No se pudo contactar con el asistente. Inténtalo de nuevo.', error: true }])
    }
    setLoading(false)
  }

  return (
    <>
      <div
        ref={boxRef}
        style={{ flex: 1, overflowY: 'auto', padding: 12, minHeight: 200, fontSize: 13, lineHeight: 1.5 }}
      >
        {msgs.length === 0 && (
          <div style={{ color: 'var(--gray-500)', fontSize: 12 }}>
            <div style={{ marginBottom: 10 }}>
              Pregunta lo que quieras sobre el proyecto (arquitectura, decisiones, seguridad, costes...).
            </div>
            {sugerencias.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setQ(s)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', marginBottom: 6, padding: '8px 10px',
                  background: 'var(--gray-100)', border: '1px solid var(--gray-200)', borderRadius: 8,
                  color: 'var(--gray-800)', cursor: 'pointer', fontSize: 12,
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} style={{ marginBottom: 10, textAlign: m.role === 'user' ? 'right' : 'left' }}>
            <div
              style={{
                display: 'inline-block', maxWidth: '85%', padding: '8px 12px', borderRadius: 10,
                whiteSpace: 'pre-wrap', fontSize: 13,
                background: m.role === 'user' ? 'var(--primary)' : 'var(--gray-100)',
                color: m.role === 'user' ? '#fff' : 'var(--gray-800)',
                border: m.role === 'user' ? 'none' : '1px solid var(--gray-200)',
              }}
            >
              {m.text}
            </div>
          </div>
        ))}
        {loading && <div style={{ color: 'var(--gray-500)', fontSize: 12 }}>Pensando…</div>}
      </div>
      <form
        onSubmit={enviar}
        style={{ padding: 10, borderTop: '1px solid var(--gray-200)', display: 'flex', gap: 8 }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Pregunta sobre el proyecto…"
          maxLength={500}
          style={{
            flex: 1, padding: '10px 12px', background: 'var(--gray-100)',
            border: '1px solid var(--gray-200)', borderRadius: 8, color: 'var(--gray-800)', fontSize: 13,
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '10px 16px', background: 'var(--primary)', color: '#fff',
            border: 'none', borderRadius: 8, fontWeight: 800, cursor: 'pointer',
          }}
        >
          →
        </button>
      </form>
    </>
  )
}

// Widget flotante del asistente, visible en la pantalla de login (sin credenciales).
export function AssistantWidget() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="Abrir asistente técnico"
        style={{
          position: 'fixed', right: 24, bottom: 24, zIndex: 1000, width: 60, height: 60,
          borderRadius: '50%', border: 'none', background: 'var(--primary)', color: '#fff',
          fontSize: 26, cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,.4)',
        }}
        title="Asistente técnico: pregunta sobre el código de Kavana Warehouse"
      >
        💬
      </button>

      {open && (
        <div
          style={{
            position: 'fixed', right: 24, bottom: 96, zIndex: 1000, width: 380,
            maxWidth: 'calc(100vw - 48px)', maxHeight: '70vh', background: '#fff',
            border: '1px solid var(--gray-200)', borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,.5)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}
        >
          <div style={{ padding: '14px 16px', background: 'var(--gray-100)', borderBottom: '1px solid var(--gray-200)' }}>
            <div style={{ fontWeight: 900, fontSize: 14 }}>💬 Asistente técnico de Kavana Warehouse</div>
            <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 2 }}>
              Responde con la documentación, ADRs y decisiones reales del proyecto.
            </div>
          </div>
          <AssistantChat />
        </div>
      )}
    </>
  )
}
