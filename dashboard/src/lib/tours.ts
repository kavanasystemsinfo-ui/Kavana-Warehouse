import type { TourStep } from '../components/Tour'

type Acciones = {
  /** Va a otra pantalla del panel (por ejemplo, '/centros'). */
  ir: (ruta: string) => void
  /** Abre o cierra el menú lateral (en móvil está plegado). */
  menu: (abierto: boolean) => void
}

/** Clave del recorrido de cada pantalla, según su ruta. */
export const CLAVE_POR_RUTA: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/centros': 'centros',
  '/responsables': 'responsables',
  '/supervisores': 'supervisores',
  '/desviaciones': 'desviaciones',
  '/costes': 'costes',
  '/inventario': 'inventario',
  '/asistente': 'asistente',
}

/**
 * Un recorrido por pantalla, encadenados. Las anclas son selectores CSS de elementos
 * que ya existen, así que no hace falta marcar nada en las pantallas.
 */
export function crearTours({ ir, menu }: Acciones): Record<string, TourStep[]> {
  const aqui = (ruta: string) => () => {
    menu(false)
    ir(ruta)
  }
  return {
    dashboard: [
      {
        id: 'bienvenida',
        title: 'Bienvenido a Kavana Warehouse',
        content:
          'Controla los consumibles de planta (EPIs, discos, hilo de soldadura…) por sección: dónde se van, qué falta y cuánto cuesta.\nLos datos son de una planta metalúrgica inventada. En un par de minutos te enseño cada pantalla; sal cuando quieras con Esc.',
        action: aqui('/dashboard'),
      },
      {
        id: 'menu',
        anchor: '.sidebar-nav',
        title: 'El menú',
        content:
          'Cada pantalla responde a una pregunta: dónde se consume (Dashboard y Centros), quién lo controla (Responsables), qué falta (Desviaciones), cuánto cuesta (Costes) y qué hay (Inventario).',
        action: () => menu(true),
      },
      {
        id: 'periodo',
        anchor: '.periodo-bar',
        title: 'El periodo',
        content: 'Elige mes actual, mes anterior, esta semana, todo el histórico o unas fechas a tu gusto, y las cifras se recalculan.',
        action: () => menu(false),
      },
      {
        id: 'cifras',
        anchor: '.stats-grid',
        title: 'Los números clave',
        content:
          'Gasto total, movimientos, alertas críticas (stock agotado ahora) y advertencias (stock por debajo del mínimo).',
      },
      {
        id: 'evolucion',
        anchor: '.main-content .card',
        title: 'La evolución del consumo',
        content: 'Cómo ha ido el consumo mes a mes. Debajo tienes el consumo por centro y los últimos movimientos, con su botón para exportar a CSV.',
        siguiente: 'centros',
      },
    ],
    centros: [
      {
        id: 'centros-tabla',
        anchor: '.main-content .table-container',
        title: 'Los centros de trabajo',
        content:
          'Cada sección de la planta, con su dirección, su presupuesto al mes y cuántos productos tiene. Pulsa una fila para desplegar su detalle.',
        action: aqui('/centros'),
        siguiente: 'responsables',
      },
    ],
    responsables: [
      {
        id: 'responsables-tabla',
        anchor: '.main-content .table-container',
        title: 'Quién controla cada centro',
        content:
          'Los responsables, con su contacto y los centros que tienen asignados. Más abajo queda el histórico de recuentos que han hecho.',
        action: aqui('/responsables'),
        siguiente: 'supervisores',
      },
    ],
    supervisores: [
      {
        id: 'supervisores-demo',
        anchor: '.main-content .card',
        title: 'Prueba el flujo de recuento',
        content:
          'Aquí puedes crear supervisores de prueba para recorrer el recuento de stock como lo haría la planta. Se guardan solo en este navegador y caducan a las 24 horas.',
        action: aqui('/supervisores'),
        siguiente: 'desviaciones',
      },
    ],
    desviaciones: [
      {
        id: 'desviaciones-cifras',
        anchor: '.stats-grid',
        title: 'Las mermas',
        content: 'Compara el stock registrado con el conteo físico. Aquí ves cuántos centros tienen menos stock del que figura en el sistema.',
        action: aqui('/desviaciones'),
      },
      {
        id: 'desviaciones-filtro',
        anchor: '.filters-bar',
        title: 'Filtra por centro',
        content: 'Elige un centro y pulsa Filtrar para ver solo sus líneas.',
      },
      {
        id: 'desviaciones-tabla',
        anchor: '.main-content .table-container',
        title: 'La diferencia, línea a línea',
        content: 'Para cada producto de cada centro: lo que figura en el sistema, lo que se contó y la diferencia.',
        siguiente: 'costes',
      },
    ],
    costes: [
      {
        id: 'costes-cifras',
        anchor: '.stats-grid',
        title: 'Cuánto cuesta',
        content: 'El coste del material consumido en el mes frente al presupuesto que has fijado para cada centro.',
        action: aqui('/costes'),
      },
      {
        id: 'costes-centros',
        anchor: '.coste-grid',
        title: 'Un centro, una tarjeta',
        content:
          'Cada tarjeta enseña lo gastado, el porcentaje del presupuesto y un aviso de color. Con «Cambiar presupuesto» ajustas el de ese centro.',
        siguiente: 'inventario',
      },
    ],
    inventario: [
      {
        id: 'inventario-cab',
        anchor: '.page-header',
        title: 'Propuesta de compra',
        content:
          'Con un clic mira qué productos de todos los centros están por debajo de su mínimo y cuánto comprar, con el coste estimado. Se descarga en CSV.',
        action: aqui('/inventario'),
      },
      {
        id: 'inventario-tabla',
        anchor: '.main-content .table-container',
        title: 'El catálogo',
        content: 'Todos los productos con su unidad, su coste unitario y su stock mínimo de referencia. Puedes editarlos, borrarlos o añadir uno nuevo.',
        siguiente: 'asistente',
      },
    ],
    asistente: [
      {
        id: 'asistente-chat',
        anchor: '.main-content',
        title: 'Un asistente que conoce el proyecto',
        content:
          'Pregúntale por la arquitectura, las decisiones, la seguridad o los costes: responde con la documentación real del proyecto.',
        action: aqui('/asistente'),
      },
      {
        id: 'asistente-fin',
        title: 'Ahora, a tu aire',
        content:
          'Cada pantalla tiene su botón «❓ Ayuda» con una guía más detallada. Puedes repetir este recorrido cuando quieras con «Tour guiado», abajo en el menú.',
      },
    ],
  }
}
