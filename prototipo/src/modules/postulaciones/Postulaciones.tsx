// M8 Postulación (observación del mandante, Certamen 1): etapa específica previa al ingreso del NNA.
// El apoderado/a o tutor/a postula desde el formulario PÚBLICO (/postular); aquí el área social solo la evalúa.
// Aceptar la postulación = INGRESO AL PROGRAMA (se crea la ficha única). Así se distingue de la derivación.
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useSistema } from '../../data/useSistema';
import { evaluarPostulacion } from '../../data/servicios';
import { fmtFecha, mensajeWhatsAppPostulacion, puede } from '../../domain/reglas';
import type { EstadoPostulacion, Postulacion } from '../../domain/tipos';
import { Aviso, Boton, BotonWhatsApp, Encabezado, Etiqueta, Modal, Pasos, Texto, Volver } from '../../components/ui';

const TEXTO_ESTADO: Record<EstadoPostulacion, string> = { ENVIADA: 'Enviada', EN_EVALUACION: 'En evaluación', ACEPTADA: 'Aceptada · ingresado', RECHAZADA: 'Rechazada' };
const TONO: Record<EstadoPostulacion, 'amarillo' | 'gris' | 'verde' | 'rojo'> = { ENVIADA: 'amarillo', EN_EVALUACION: 'amarillo', ACEPTADA: 'verde', RECHAZADA: 'rojo' };
const PASO: Record<EstadoPostulacion, number> = { ENVIADA: 1, EN_EVALUACION: 2, ACEPTADA: 4, RECHAZADA: 3 };

export default function Postulaciones() {
  const { estado, usuario, ejecutar } = useSistema();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const [msg, setMsg] = useState('');
  const [filtro, setFiltro] = useState<'ABIERTAS' | 'TODAS'>('ABIERTAS');
  const evalua = puede(usuario?.rol, 'POSTULACION_EVALUAR');
  const sel = estado.postulaciones.find(p => p.id === params.get('p'));
  const lista = estado.postulaciones.filter(p => filtro === 'TODAS' || p.estado === 'ENVIADA' || p.estado === 'EN_EVALUACION').slice().reverse();

  return (
    <section>
      <Encabezado titulo="Postulaciones" subtitulo="Ingreso al programa · Etapa 1" codigo="M8 · Postulación del NNA (observación del mandante, Certamen 1)" />
      <Aviso tipo="info">
        <b>Las postulaciones llegan desde el formulario público</b> que completan los apoderados o tutores en la web (<Link to="/postular" target="_blank" rel="noreferrer">ver formulario de postulación</Link>). Aquí el equipo las revisa y decide: si se acepta, el NNA <b>ingresa a la Fundación</b> y se crea su ficha. La derivación a una prestación ocurre después.
      </Aviso>
      {msg && <Aviso tipo="exito">{msg}</Aviso>}

      {!sel && (
        <>
          <div className="acciones">
            <Boton tipo={filtro === 'ABIERTAS' ? 'secundario' : 'borde'} onClick={() => setFiltro('ABIERTAS')}>En curso</Boton>
            <Boton tipo={filtro === 'TODAS' ? 'secundario' : 'borde'} onClick={() => setFiltro('TODAS')}>Todas</Boton>
          </div>
          <table className="tabla" aria-label="Postulaciones">
            <thead><tr><th>Fecha</th><th>NNA</th><th>Comuna</th><th>Patologías</th><th>Postulado por</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {lista.length === 0 && <tr><td colSpan={7} className="vacio">No hay postulaciones en curso.</td></tr>}
              {lista.map(p => (
                <tr key={p.id}>
                  <td>{fmtFecha(p.fecha)}</td><td>{p.nna.nombres} {p.nna.apellidos}</td><td>{p.nna.comuna}</td>
                  <td>{p.antecedentes.patologias.join(', ')}</td><td>{p.tutor}{p.origen === 'WEB' && <span className="tenue"> · en línea</span>}</td>
                  <td><Etiqueta texto={TEXTO_ESTADO[p.estado]} tono={TONO[p.estado]} /></td>
                  <td><button type="button" className="enlace" onClick={() => { setParams({ p: p.id }); setMsg(''); }}>{evalua && (p.estado === 'ENVIADA' || p.estado === 'EN_EVALUACION') ? 'Evaluar' : 'Ver'}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {sel && <Detalle p={sel} evalua={evalua} onVolver={() => setParams({})} onResuelta={(texto, idB) => { setMsg(texto); setParams({}); if (idB) nav(`/beneficiarios?b=${idB}`); }}
        ejecutar={(dec, res) => ejecutar(e => evaluarPostulacion(e, usuario!, sel.id, dec, res))} />}
      {!sel && <div className="acciones"><Volver /></div>}
    </section>
  );
}

function Detalle({ p, evalua, onVolver, onResuelta, ejecutar }: {
  p: Postulacion; evalua: boolean; onVolver: () => void; onResuelta: (msg: string, idB?: string) => void;
  ejecutar: (d: 'EN_EVALUACION' | 'ACEPTADA' | 'RECHAZADA', r: string) => ReturnType<typeof evaluarPostulacion>;
}) {
  const [res, setRes] = useState('');
  const [conf, setConf] = useState<'ACEPTADA' | 'RECHAZADA' | null>(null);
  const [err, setErr] = useState('');
  const abierta = p.estado === 'ENVIADA' || p.estado === 'EN_EVALUACION';
  const decidir = (dec: 'EN_EVALUACION' | 'ACEPTADA' | 'RECHAZADA') => {
    const r = ejecutar(dec, res);
    setConf(null);
    if (!r.ok) { setErr(Object.values(r.errores)[0]); return; }
    if (dec === 'ACEPTADA') onResuelta(`Postulación aceptada: ${p.nna.nombres} ${p.nna.apellidos} ingresó al programa y se creó su ficha.`, r.dato?.idBeneficiario);
    else if (dec === 'RECHAZADA') onResuelta(`Postulación de ${p.nna.nombres} ${p.nna.apellidos} rechazada.`);
  };
  const a = p.antecedentes;
  return (
    <div className="ficha" aria-label={`Postulación de ${p.nna.nombres} ${p.nna.apellidos}`}>
      <h2>Postulación de {p.nna.nombres} {p.nna.apellidos}</h2>
      <Pasos pasos={['Registrada', 'Enviada', 'En evaluación', 'Resuelta']} actual={PASO[p.estado]} />
      {err && <Aviso tipo="error">{err}</Aviso>}
      <div className="datos">
        <div className="dato"><span>RUT</span><b>{p.nna.rut}</b></div>
        <div className="dato"><span>Nacimiento</span><b>{fmtFecha(p.nna.fechaNacimiento)}</b></div>
        <div className="dato"><span>Comuna</span><b>{p.nna.comuna}</b></div>
        <div className="dato"><span>Apoderado</span><b>{p.apoderado.nombre} · {p.apoderado.telefono}</b></div>
        <div className="dato"><span>Previsión</span><b>{p.apoderado.prevision ?? '—'}</b></div>
        <div className="dato"><span>Postulado por</span><b>{p.tutor}</b></div>
        <div className="dato"><span>Patologías</span><b>{a.patologias.join(', ')}</b></div>
        <div className="dato"><span>Centros hospitalarios</span><b>{a.centrosSalud.join(', ') || '—'}</b></div>
        <div className="dato"><span>Credencial de discapacidad</span><b>{a.credencial.tiene ? `Sí · N.º ${a.credencial.numero}${a.credencial.porcentaje ? ` · ${a.credencial.porcentaje}%` : ''}` : 'No'}</b></div>
        <div className="dato"><span>Electrodependiente</span><b>{a.electrodependiente ? 'Sí' : 'No'}</b></div>
        <div className="dato"><span>Estado</span><b>{TEXTO_ESTADO[p.estado]}{p.fechaResolucion ? ` (${fmtFecha(p.fechaResolucion)})` : ''}</b></div>
        <div className="dato"><span>Evaluador</span><b>{p.evaluador ?? '—'}</b></div>
      </div>
      {a.descripcion && <p><b>Antecedentes:</b> {a.descripcion}</p>}
      <p><b>Motivo:</b> {p.motivo}</p>
      {p.resolucion && <p><b>Resolución:</b> {p.resolucion}</p>}
      {evalua && abierta && <>
        <Texto label="Comentario de la evaluación (obligatorio si se rechaza)" value={res} onChange={v => { setRes(v); setErr(''); }} ancho="completo" />
        <div className="acciones">
          {p.estado === 'ENVIADA' && <Boton tipo="borde" onClick={() => decidir('EN_EVALUACION')}>Pasar a evaluación</Boton>}
          <Boton tipo="secundario" onClick={() => setConf('RECHAZADA')}>Rechazar</Boton>
          <Boton onClick={() => setConf('ACEPTADA')}>Aceptar e ingresar al programa</Boton>
        </div>
      </>}
      {!evalua && abierta && <Aviso tipo="info">La postulación está en manos del área social. Recibirá la resolución en esta pantalla.</Aviso>}
      <div className="acciones"><Boton tipo="secundario" onClick={onVolver}>Volver al listado</Boton>{evalua && <BotonWhatsApp telefono={p.apoderado.telefono} mensaje={mensajeWhatsAppPostulacion(p)} />}</div>
      {conf && (
        <Modal titulo={conf === 'ACEPTADA' ? 'Confirmar ingreso al programa' : 'Confirmar rechazo'} onCerrar={() => setConf(null)} acciones={<>
          <Boton tipo="secundario" onClick={() => setConf(null)}>Cancelar</Boton>
          <Boton onClick={() => decidir(conf)}>{conf === 'ACEPTADA' ? 'Aceptar postulación' : 'Rechazar postulación'}</Boton></>}>
          {conf === 'ACEPTADA'
            ? <p>Se creará la ficha de <b>{p.nna.nombres} {p.nna.apellidos}</b> con sus antecedentes. Después podrá derivarse a una prestación.</p>
            : <p>La postulación de <b>{p.nna.nombres} {p.nna.apellidos}</b> quedará rechazada{res.trim() ? ` con el comentario: «${res.trim()}»` : ''}.</p>}
        </Modal>
      )}
    </div>
  );
}
