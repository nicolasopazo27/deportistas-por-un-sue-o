// Postulación pública (revisión final): cualquier persona (apoderado/a o tutor/a) postula a un NNA desde la web,
// sin iniciar sesión. La postulación llega al área social, que la evalúa en la gestión interna (M8).
// La gestión interna ya no registra postulaciones: solo las evalúa.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useSistema } from '../../data/useSistema';
import { registrarPostulacionPublica } from '../../data/servicios';
import { CENTROS_SALUD, COMUNAS, ENFERMEDADES, PREVISIONES, hoyISO, type DatosPostulacion } from '../../domain/reglas';
import { Cabecera } from '../../components/Layout';
import { Aviso, Boton, Multi, Selector, Texto } from '../../components/ui';

const VACIA: DatosPostulacion = { nombres: '', apellidos: '', rut: '', fechaNacimiento: '', comuna: '', apoderado: '', telefono: '', prevision: '', patologias: [], centrosSalud: [], credencial: false, numeroCredencial: '', porcentaje: '', electrodependiente: false, descripcion: '', motivo: '' };
const SI_NO = [{ valor: 'SI', texto: 'Sí' }, { valor: 'NO', texto: 'No' }];

export default function PostulacionPublica() {
  const { ejecutar } = useSistema();
  const [d, setD] = useState<DatosPostulacion>(VACIA);
  const [err, setErr] = useState<Record<string, string>>({});
  const [enviada, setEnviada] = useState<{ codigo: string; nombre: string } | null>(null);
  const set = <K extends keyof DatosPostulacion>(k: K) => (v: DatosPostulacion[K]) => { setD(x => ({ ...x, [k]: v })); setErr(e => ({ ...e, [k]: '' })); };

  const enviar = () => {
    const r = ejecutar(e => registrarPostulacionPublica(e, d));
    if (!r.ok) { setErr(r.errores); window.scrollTo?.(0, 0); return; }
    setEnviada({ codigo: r.dato!.id, nombre: `${d.nombres.trim()} ${d.apellidos.trim()}` });
    setD(VACIA);
  };

  return (
    <div className="app app-publica">
      <Cabecera titulo="Postulación en línea" />
      <main className="publica">
        <Link to="/ingreso" className="volver-publico"><ArrowLeft size={16} /> Volver al inicio</Link>
        <div className="publica-intro">
          <h1>Postula a nuestros programas</h1>
          <p>Si eres apoderado, apoderada o tutor de un niño, niña o adolescente que necesita apoyo dental, kinesiológico u otro, completa este formulario. El equipo social de la Fundación revisará la postulación y te contactará al teléfono que indiques.</p>
        </div>

        {enviada ? (
          <div className="tarjeta-publica exito-publico" role="status">
            <CheckCircle2 size={44} aria-hidden="true" />
            <h2>¡Postulación enviada!</h2>
            <p>Recibimos la postulación de <b>{enviada.nombre}</b>. Código de seguimiento: <b>{enviada.codigo}</b>.</p>
            <p>El equipo social la revisará y te contactará. Si es aceptada, el NNA ingresa al programa.</p>
            <div className="acciones">
              <Boton onClick={() => setEnviada(null)}>Enviar otra postulación</Boton>
              <Link to="/ingreso" className="boton boton-borde">Volver al inicio</Link>
            </div>
          </div>
        ) : (
          <form className="tarjeta-publica formulario" noValidate onSubmit={e => { e.preventDefault(); enviar(); }} aria-label="Formulario de postulación">
            {Object.values(err).some(Boolean) && <Aviso tipo="error">Revisa los campos marcados en rojo.</Aviso>}
            <h2>1. Datos del niño, niña o adolescente</h2>
            <div className="grilla grilla-3">
              <Texto label="Nombres *" value={d.nombres} onChange={set('nombres')} error={err.nombres} />
              <Texto label="Apellidos *" value={d.apellidos} onChange={set('apellidos')} error={err.apellidos} />
              <Texto label="RUT del NNA *" value={d.rut} onChange={set('rut')} error={err.rut} placeholder="12345678-5" />
              <Texto label="Fecha de nacimiento" type="date" value={d.fechaNacimiento} onChange={set('fechaNacimiento')} error={err.fechaNacimiento} max={hoyISO()} />
              <Selector label="Comuna *" value={d.comuna} onChange={set('comuna')} opciones={COMUNAS} error={err.comuna} />
            </div>
            <h2>2. Datos de contacto del apoderado/a</h2>
            <div className="grilla grilla-3">
              <Texto label="Nombre del apoderado *" value={d.apoderado} onChange={set('apoderado')} error={err.apoderado} />
              <Texto label="Teléfono *" value={d.telefono} onChange={set('telefono')} error={err.telefono} placeholder="+56 9 1234 5678" />
              <Selector label="Previsión de salud" value={d.prevision} onChange={set('prevision')} opciones={PREVISIONES} />
            </div>
            <h2>3. Antecedentes de salud</h2>
            <Multi label="Patologías *" opciones={ENFERMEDADES} valores={d.patologias} onChange={set('patologias')} error={err.patologias} />
            <Multi label="Centros hospitalarios donde se atiende" opciones={CENTROS_SALUD} valores={d.centrosSalud} onChange={set('centrosSalud')} />
            <div className="grilla grilla-3">
              <Selector label="¿Tiene credencial de discapacidad?" value={d.credencial ? 'SI' : 'NO'} onChange={v => set('credencial')(v === 'SI')} opciones={SI_NO} placeholder="Seleccionar" />
              {d.credencial && <Texto label="N.º credencial *" value={d.numeroCredencial} onChange={set('numeroCredencial')} error={err.numeroCredencial} />}
              {d.credencial && <Texto label="% de discapacidad" type="number" value={d.porcentaje} onChange={set('porcentaje')} error={err.porcentaje} />}
              <Selector label="Electrodependiente" value={d.electrodependiente ? 'SI' : 'NO'} onChange={v => set('electrodependiente')(v === 'SI')} opciones={SI_NO} placeholder="Seleccionar" />
            </div>
            <Texto label="Descripción de antecedentes (diagnóstico, apoyos, cuidados)" value={d.descripcion} onChange={set('descripcion')} ancho="completo" />
            <Texto label="Motivo de la postulación *" value={d.motivo} onChange={set('motivo')} error={err.motivo} ancho="completo" placeholder="¿Por qué el NNA requiere el apoyo de la Fundación?" />
            <p className="nota">Los datos se usan solo para evaluar la postulación. Este es un entorno de demostración: usa únicamente datos ficticios.</p>
            <div className="acciones">
              <Link to="/ingreso" className="boton boton-secundario">Cancelar</Link>
              <Boton type="submit">Enviar postulación</Boton>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
