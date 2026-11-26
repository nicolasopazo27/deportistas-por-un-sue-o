// Historial del NNA como línea de tiempo (revisión final): cada evento con ícono y color según su tipo,
// del más reciente al más antiguo, agrupado por mes. Muestra la trazabilidad completa de un vistazo.
import type { LucideIcon } from 'lucide-react';
import { Camera, CheckCircle2, ClipboardEdit, FileText, HandHeart, MessageSquare, Send, Siren, Stethoscope, TriangleAlert, UserMinus, UserPlus, XCircle } from 'lucide-react';
import type { EventoHistorial } from '../domain/tipos';

interface Estilo { icono: LucideIcon; tono: string }
function estilo(h: EventoHistorial): Estilo {
  switch (h.tipo) {
    case 'Ingreso al programa': return { icono: UserPlus, tono: 'verde' };
    case 'Derivación': return { icono: Send, tono: 'azul' };
    case 'Atención': return h.detalle.startsWith('No realizada') ? { icono: XCircle, tono: 'naranja' } : { icono: Stethoscope, tono: 'morado' };
    case 'Ciclo terminado': return { icono: CheckCircle2, tono: 'verde' };
    case 'Revisión de alerta': return { icono: TriangleAlert, tono: 'rojo' };
    case 'Urgencia': return { icono: Siren, tono: 'rojo' };
    case 'Baja': return { icono: UserMinus, tono: 'oscuro' };
    case 'Ayuda entregada': return { icono: HandHeart, tono: 'naranja' };
    case 'Observación': return { icono: MessageSquare, tono: 'gris' };
    case 'Foto identificatoria': return { icono: Camera, tono: 'gris' };
    case 'Ficha actualizada': case 'Estado del caso': case 'Motivo de no gestión': return { icono: ClipboardEdit, tono: 'gris' };
    default: return { icono: FileText, tono: 'gris' };
  }
}
const MES = new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric' });
const DIA = new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short' });
const fecha = (iso: string) => new Date(iso.slice(0, 10) + 'T12:00:00');

export function LineaTiempo({ eventos }: { eventos: EventoHistorial[] }) {
  const orden = [...eventos].sort((a, b) => b.fecha.localeCompare(a.fecha));
  if (!orden.length) return <p className="vacio">Sin eventos registrados.</p>;
  const items = orden.map((h, i) => {
    const f = fecha(h.fecha), mes = MES.format(f);
    return { h, f, mes, cabecera: i === 0 || mes !== MES.format(fecha(orden[i - 1].fecha)) };
  });
  return (
    <ol className="linea-tiempo" aria-label="Historial unificado">
      {items.map(({ h, f, mes, cabecera }, i) => {
        const { icono: Icono, tono } = estilo(h);
        return (
          <li key={i} className={`lt-item lt-${tono}`}>
            {cabecera && <div className="lt-mes">{mes}</div>}
            <div className="lt-fila">
              <span className="lt-fecha">{DIA.format(f)}</span>
              <span className="lt-punto" aria-hidden="true"><Icono size={15} /></span>
              <div className="lt-contenido">
                <b>{h.tipo}</b>
                <span>{h.detalle}</span>
                <small>Registrado por {h.autor}</small>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
