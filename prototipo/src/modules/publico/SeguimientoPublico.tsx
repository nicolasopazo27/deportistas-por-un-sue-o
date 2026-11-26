// Seguimiento público de la postulación (revisión final): el apoderado/a revisa el estado
// con el RUT del NNA y el código que recibió al postular. Muestra solo datos no sensibles.
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock, FileSearch, XCircle } from 'lucide-react';
import { useSistema } from '../../data/useSistema';
import { consultarPostulacionPublica, type EstadoPublico } from '../../data/servicios';
import { fmtFecha } from '../../domain/reglas';
import { Cabecera } from '../../components/Layout';
import { Boton, Pasos, Texto } from '../../components/ui';

const PASO = { ENVIADA: 1, EN_EVALUACION: 2, ACEPTADA: 3, RECHAZADA: 3 } as const;

export default function SeguimientoPublico() {
  const { estado } = useSistema();
  const [params] = useSearchParams();
  const [rut, setRut] = useState('');
  const [codigo, setCodigo] = useState(params.get('codigo') ?? '');
  const [err, setErr] = useState<Record<string, string>>({});
  const [res, setRes] = useState<EstadoPublico | null>(null);

  const consultar = () => {
    const r = consultarPostulacionPublica(estado, rut, codigo);
    if (!r.ok) { setErr(r.errores); setRes(null); return; }
    setErr({}); setRes(r.dato!);
  };

  return (
    <div className="app app-publica">
      <Cabecera titulo="Seguimiento de postulación" />
      <main className="publica">
        <Link to="/ingreso" className="volver-publico"><ArrowLeft size={16} /> Volver al inicio</Link>
        <div className="publica-intro">
          <h1>Revisa el estado de tu postulación</h1>
          <p>Ingresa el RUT del niño, niña o adolescente y el código de seguimiento que recibiste al enviar la postulación.</p>
        </div>
        <form className="tarjeta-publica formulario seguimiento-form" noValidate onSubmit={e => { e.preventDefault(); consultar(); }} aria-label="Consultar postulación">
          <div className="grilla grilla-3">
            <Texto label="RUT del NNA *" value={rut} onChange={v => { setRut(v); setErr(x => ({ ...x, rut: '' })); }} error={err.rut} placeholder="12345678-5" />
            <Texto label="Código de seguimiento *" value={codigo} onChange={v => { setCodigo(v); setErr(x => ({ ...x, codigo: '' })); }} error={err.codigo} placeholder="P-xxxxxx" />
            <div className="campo-boton"><Boton type="submit"><FileSearch size={16} /> Consultar estado</Boton></div>
          </div>
        </form>

        {res && (
          <section className="tarjeta-publica resultado-seguimiento" aria-label="Estado de la postulación" role="status">
            <div className={`estado-grande estado-${res.estado.toLowerCase()}`}>
              {res.estado === 'ACEPTADA' ? <CheckCircle2 size={34} /> : res.estado === 'RECHAZADA' ? <XCircle size={34} /> : <Clock size={34} />}
              <div>
                <span className="tenue">Postulación {res.codigo} · {res.nombre}</span>
                <h2>{{ ENVIADA: 'Recibida, en espera de revisión', EN_EVALUACION: 'En evaluación por el equipo social', ACEPTADA: 'Aceptada: ingresó al programa', RECHAZADA: 'No aceptada' }[res.estado]}</h2>
              </div>
            </div>
            <Pasos pasos={['Postulación enviada', 'Recibida', 'En evaluación', 'Resolución']} actual={PASO[res.estado]} />
            <dl className="datos-seguimiento">
              <div><dt>Fecha de postulación</dt><dd>{fmtFecha(res.fecha)}</dd></div>
              {res.fechaResolucion && <div><dt>Fecha de resolución</dt><dd>{fmtFecha(res.fechaResolucion)}</dd></div>}
            </dl>
            {res.estado === 'ACEPTADA' && <p>¡Buenas noticias! El equipo social se contactará para coordinar la primera derivación (dental, kinesiología u otra).</p>}
            {res.estado === 'RECHAZADA' && <p><b>Respuesta del equipo:</b> {res.resolucion || 'Sin comentario.'} Puedes volver a postular si cambia la situación.</p>}
            {(res.estado === 'ENVIADA' || res.estado === 'EN_EVALUACION') && <p>El equipo social está revisando los antecedentes. Te contactaremos al teléfono que indicaste.</p>}
          </section>
        )}
      </main>
    </div>
  );
}
