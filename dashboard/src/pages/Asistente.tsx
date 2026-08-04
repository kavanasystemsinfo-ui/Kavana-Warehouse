import { AssistantChat } from '../components/AssistantChat'
import { GuiaAyuda } from '../components/GuiaAyuda'

// Página con el asistente técnico a pantalla completa, dentro del panel.
// Un reclutador puede preguntar cómo funciona el proyecto sin conocer el código.
export function Asistente() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)', minHeight: 420 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">💬 Asistente técnico</h1>
          <span className="stat-sub">Responde con la documentación, ADRs y decisiones reales del proyecto</span>
        </div>
        <GuiaAyuda titulo="Asistente técnico">
          <p>El asistente responde preguntas sobre Kavana Warehouse usando <strong>solo la documentación real del proyecto</strong> (README, DECISIONS, ADRs, docs técnicos).</p>
          <p>Si algo no está documentado, lo dice y te remite al creador, sin inventar datos.</p>
          <p>Perfecto para que un reclutador pregunte cómo funciona el proyecto sin necesidad de conocer el código.</p>
        </GuiaAyuda>
      </div>

      <div
        style={{
          flex: 1, display: 'flex', flexDirection: 'column', background: '#fff',
          border: '1px solid var(--gray-200)', borderRadius: 14, overflow: 'hidden',
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
    </div>
  )
}
