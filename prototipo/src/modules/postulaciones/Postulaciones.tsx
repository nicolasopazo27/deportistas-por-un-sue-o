// M8 Postulación (observación del mandante, Certamen 1): etapa específica previa al ingreso del NNA.
// El tutor (o el área social) registra la postulación con los antecedentes del NNA; el área social la evalúa.
// Aceptar la postulación = INGRESO AL PROGRAMA (se crea la ficha única). Así se distingue de la derivación.
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSistema } from '../../data/useSistema';
import { evaluarPostulacion, registrarPostulacion } from '../../data/servicios';
import { CENTROS_SALUD, COMUNAS, ENFERMEDADES, PREVISIONES, fmtFecha, hoyISO, puede, type DatosPostulacion } from '../../domain/reglas';
import type { EstadoPostulacion, Postulacion } from '../../domain/tipos';
import { Aviso, Boton, Encabezado, Etiqueta, Modal, Multi, Pasos, Selector, Texto, Volver } from '../../components/ui';

const VACIA: DatosPostulacion = { nombres: '', apellidos: '', rut: '', fechaNacimiento: '', comuna: '', apoderado: '', telefono: '', prevision: '', patologias: [], centrosSalud: [], credencial: false, numeroCredencial: '', porcentaje: '', electrodependiente: false, descripcion: '', motivo: '' };
const TEXTO_ESTADO: Record<EstadoPostulacion, string> = { ENVIADA: 'Enviada', EN_EVALUACION: 'En evaluación', ACEPTADA: 'Aceptada · ingresado', RECHAZADA: 'Rechazada' };
const TONO: Record<EstadoPostulacion, 'amarillo' | 'gris' | 'verde' | 'rojo'> = { ENVIADA: 'amarillo', EN_EVALUACION: 'amarillo', ACEPTADA: 'verde', RECHAZADA: 'rojo' };
const PASO: Record<EstadoPostulacion, number> = { ENVIADA: 1, EN_EVALUACION: 2, ACEPTADA: 4, RECHAZADA: 3 };

export default function Postulaciones() {
  const { estado, usuario, ejecutar } = useSistema();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const [d, setD] = useState<DatosPostulacion>(VACIA);
  const [err, setErr] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');
  const [filtro, setFiltro] = useState<'ABIERTAS' | 'TODAS'>('ABIERTAS');
  const evalua = puede(usuario?.rol, 'POSTULACION_EVALUAR');
  const nueva = params.get('nueva') === '1';
  const sel = estado.postulaciones.find(p => p.id === params.get('p'));
  const set = <K extends keyof DatosPostulacion>(k: K) => (v: DatosPostulacion[K]) => { setD(x => ({ ...x, [k]: v })); setErr(e => ({ ...e, [k]: '' })); };
  const lista = estado.postulaciones.filter(p => filtro === 'TODAS' || p.estado === 'ENVIADA' || p.estado === 'EN_EVALUACION').slice().reverse();

  const enviar = () => {
    const r = ejecutar(e => registrarPostulacion(e, usuario!, d));
    if (!r.ok) { setErr(r.errores); return; }
    setMsg(`Postulación de ${d.nombres} ${d.apellidos} enviada al área social para su evaluación.`);
    setD(VACIA); setParams({});
  };

  return (
    <section>
      <Encabezado titulo="Postulaciones" subtitulo="Ingreso al programa · Etapa 1" codigo="M8 · Postulación del NNA (observación del mandante, Certamen 1)" />
      <Aviso tipo="info"><b>Postulación ≠ derivación.</b> La postulación es la solicitud para que un NNA <b>ingrese a la Fundación</b>; si se acepta, se crea su ficha. La derivación ocurre después y envía al NNA ya ingresado a una prestación (dental, kine u otra).</Aviso>
      {msg && <Aviso tipo="exito">{msg}</Aviso>}
      {err.permiso && <Aviso tipo="error">{err.permiso}</Aviso>}

      {!nueva && !sel && (
        <>
          <div className="acciones">
            <Boton onClick={() => { setParams({ nueva: '1' }); setMsg(''); setErr({}); }}>Nueva postulación</Boton>
            <Boton tipo={filtro === 'ABIERTAS' ? 'secundario' : 'borde'} onClick={() => setFiltro('ABIERTAS')}>En curso</Boton>
            <Boton tipo={filtro === 'TODAS' ? 'secundario' : 'borde'} onClick={() => setFiltro('TODAS')}>Todas</Boton>
          </div>
          <table className="tabla" aria-label="Postulaciones">
            <thead><tr><th>Fecha</th><th>NNA</th><th>Comuna</th><th>Patologías</th><th>Tutor</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {lista.length === 0 && <tr><td colSpan={7} className="vacio">No hay postulaciones en curso.</td></tr>}
              {lista.map(p => (
                <tr key={p.id}>
                  <td>{fmtFecha(p.fecha)}</td><td>{p.nna.nombres} {p.nna.apellidos}</td><td>{p.nna.comuna}</td>
                  <td>{p.antecedentes.patologias.join(', ')}</td><td>{p.tutor}</td>
                  <td><Etiqueta texto={TEXTO_ESTADO[p.estado]} tono={TONO[p.estado]} /></td>
                  <td><button type="button" className="enlace" onClick={() => { setParams({ p: p.id }); setMsg(''); }}>{evalua && (p.estado === 'ENVIADA' || p.estado === 'EN_EVALUACION') ? 'Evaluar' : 'Ver'}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {nueva && (
        <form className="formulario" noValidate onSubmit={e => { e.preventDefault(); enviar(); }}>
          <h2>Datos del NNA</h2>
          <div className="grilla grilla-3">
            <Texto label="Nombres *" value={d.nombres} onChange={set('nombres')} error={err.nombres} />
            <Texto label="Apellidos *" value={d.apellidos} onChange={set('apellidos')} error={err.apellidos} />
            <Texto label="RUT del NNA *" value={d.rut} onChange={set('rut')} error={err.rut} placeholder="12345678-5" />
            <Texto label="Fecha de nacimiento" type="date" value={d.fechaNacimiento} onChange={set('fechaNacimiento')} error={err.fechaNacimiento} max={hoyISO()} />
            <Selector label="Comuna *" value={d.comuna} onChange={set('comuna')} opciones={COMUNAS} error={err.comuna} />
          </div>
          <h2>Apoderado</h2>
          <div className="grilla grilla-3">
            <Texto label="Nombre del apoderado *" value={d.apoderado} onChange={set('apoderado')} error={err.apoderado} />
            <Texto label="Teléfono *" value={d.telefono} onChange={set('telefono')} error={err.telefono} placeholder="+56 9 1234 5678" />
            <Selector label="Previsión de salud" value={d.prevision} onChange={set('prevision')} opciones={PREVISIONES} />
          </div>
          <h2>Antecedentes del NNA</h2>
          <Multi label="Patologías *" opciones={ENFERMEDADES} valores={d.patologias} onChange={set('patologias')} error={err.patologias} />
          <Multi label="Centros hospitalarios donde se atiende" opciones={CENTROS_SALUD} valores={d.centrosSalud} onChange={set('centrosSalud')} />
          <div className="grilla grilla-3">
            <Selector label="¿Tiene credencial de discapacidad?" value={d.credencial ? 'SI' : 'NO'} onChange={v => set('credencial')(v === 'SI')} opciones={[{ valor: 'SI', texto: 'Sí' }, { valor: 'NO', texto: 'No' }]} placeholder="Seleccionar" />
            {d.credencial && <Texto label="N.º credencial *" value={d.numeroCredencial} onChange={set('numeroCredencial')} error={err.numeroCredencial} />}
            {d.credencial && <Texto label="% de discapacidad" type="number" value={d.porcentaje} onChange={set('porcentaje')} error={err.porcentaje} />}
            <Selector label="Electrodependiente" value={d.electrodependiente ? 'SI' : 'NO'} onChange={v => set('electrodependiente')(v === 'SI')} opciones={[{ valor: 'SI', texto: 'Sí' }, { valor: 'NO', texto: 'No' }]} placeholder="Seleccionar" />
          </div>
          <Texto label="Descripción de antecedentes (diagnóstico, apoyos, cuidados)" value={d.descripcion} onChange={set('descripcion')} ancho="completo" />
          <Texto label="Motivo de la postulación *" value={d.motivo} onChange={set('motivo')} error={err.motivo} ancho="completo" placeholder="¿Por qué el NNA requiere el apoyo de la Fundación?" />
          <div className="acciones">
            <Boton tipo="secundario" onClick={() => { setParams({}); setErr({}); }}>Cancelar</Boton>
            <Boton type="submit">Enviar postulación</Boton>
          </div>
        </form>
      )}

      {sel && <Detalle p={sel} evalua={evalua} onVolver={() => setParams({})} onResuelta={(texto, idB) => { setMsg(texto); setParams({}); if (idB) nav(`/beneficiarios?b=${idB}`); }}
        ejecutar={(dec, res) => ejecutar(e => evaluarPostulacion(e, usuario!, sel.id, dec, res))} />}
      {!nueva && !sel && <div className="acciones"><Volver /></div>}
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
        <div className="dato"><span>Tutor que postula</span><b>{p.tutor}</b></div>
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
      <div className="acciones"><Boton tipo="secundario" onClick={onVolver}>Volver al listado</Boton></div>
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
