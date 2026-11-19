// M03 · CU-03 Gestionar atención y seguimiento (RF-03, RF-05–07, RF-21, RF-22 · CA-03, CA-05–07, CA-21, CA-22)
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSistema } from '../../data/useSistema';
import { actualizarCaso, registrarAtencion } from '../../data/servicios';
import { ESTADOS_CASO, MOTIVOS, PRESTACIONES, PROFESIONALES, casoActivo, fmtFecha, hoyISO, puede, sesionesRealizadas } from '../../domain/reglas';
import type { Atencion, EstadoCaso } from '../../domain/tipos';
import { Aviso, Boton, Encabezado, Selector, Texto, Volver } from '../../components/ui';

const VACIA: Partial<Atencion> = { fecha: hoyISO(), profesional: '', prestacion: '', asistencia: undefined, resultado: undefined, motivo: '', referenciaDentalSoft: '', observacion: '' };

export default function Atenciones() {
  const { estado, usuario, ejecutar } = useSistema();
  const [params, setParams] = useSearchParams();
  const idB = params.get('b') ?? '';
  const [a, setA] = useState<Partial<Atencion>>(VACIA);
  const [err, setErr] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');
  const [motivoNG, setMotivoNG] = useState('');
  const puedeRegistrar = puede(usuario?.rol, 'ATENCION_REGISTRAR');
  const puedeCiclo = puede(usuario?.rol, 'CICLO_ACTUALIZAR');
  const conCaso = estado.beneficiarios.filter(b => casoActivo(b));
  const b = estado.beneficiarios.find(x => x.id === idB);
  const caso = b && casoActivo(b);
  const set = (k: keyof Atencion) => (v: string) => { setA(x => ({ ...x, [k]: v || undefined })); setErr(e => ({ ...e, [k]: '' })); setMsg(''); };

  const guardar = () => {
    if (!b) { setErr({ beneficiario: 'Seleccione un beneficiario con caso activo.' }); return; }
    const r = ejecutar(e => registrarAtencion(e, usuario!, b.id, a));
    if (!r.ok) { setErr(r.errores); return; }
    setMsg(a.resultado === 'REALIZADA' ? 'Atención guardada. Se avisó al área social.' : 'Atención no realizada guardada con su motivo.');
    setA({ ...VACIA, fecha: hoyISO() });
  };
  const ciclo = (cambios: { estado?: EstadoCaso; cerrarCiclo?: boolean; motivoNoGestion?: string }, texto: string) => {
    const r = ejecutar(e => actualizarCaso(e, usuario!, b!.id, cambios));
    if (!r.ok) setErr(r.errores); else { setMsg(texto); setErr({}); }
  };

  return (
    <section>
      <Encabezado titulo="Atención y ciclo" subtitulo="Atención · Etapa 3: registrar atenciones del caso derivado" codigo="M03 · CU-03 Gestionar atención y seguimiento" />
      {!puedeRegistrar && <Aviso tipo="alerta">Su perfil solo permite consultar. El registro de atenciones está reservado a TENS y profesionales.</Aviso>}
      {msg && <Aviso tipo="exito">{msg}</Aviso>}
      {err.permiso && <Aviso tipo="error">{err.permiso}</Aviso>}
      <div className="grilla grilla-3">
        <Selector label="Beneficiario *" value={idB} onChange={v => { setParams(v ? { b: v } : {}); setErr({}); setMsg(''); }} error={err.beneficiario} placeholder="Seleccionar beneficiario"
          opciones={conCaso.map(x => ({ valor: x.id, texto: `${x.nombres} ${x.apellidos}` }))} />
        {conCaso.length === 0 && <p className="sugerencia">No hay casos activos: primero derive al beneficiario a una prestación.</p>}
        <Texto label="Fecha *" type="date" value={a.fecha ?? ''} onChange={set('fecha')} error={err.fecha} max={hoyISO()} />
        <Selector label="Profesional *" value={a.profesional ?? ''} onChange={set('profesional')} opciones={PROFESIONALES} error={err.profesional} />
        <Selector label="Prestación *" value={a.prestacion ?? ''} onChange={set('prestacion')} opciones={PRESTACIONES} error={err.prestacion} />
        <Selector label="Asistencia *" value={a.asistencia ?? ''} onChange={set('asistencia')} error={err.asistencia} opciones={[{ valor: 'ASISTIO', texto: 'Asistió' }, { valor: 'NO_ASISTIO', texto: 'No asistió' }]} />
        <Selector label="Resultado *" value={a.resultado ?? ''} onChange={v => { set('resultado')(v); if (v === 'REALIZADA') setA(x => ({ ...x, resultado: 'REALIZADA', motivo: '' })); }} error={err.resultado}
          placeholder="Seleccionar resultado" opciones={[{ valor: 'REALIZADA', texto: 'Atención realizada' }, { valor: 'NO_REALIZADA', texto: 'No realizada' }]} />
        <Selector label="Motivo de no atención" value={a.motivo ?? ''} onChange={set('motivo')} opciones={MOTIVOS} error={err.motivo} disabled={a.resultado === 'REALIZADA'}
          placeholder={a.resultado === 'REALIZADA' ? 'No aplica si la atención fue realizada' : 'Seleccionar motivo'} />
        <Texto label="Referencia Dental Soft (opcional)" value={a.referenciaDentalSoft ?? ''} onChange={set('referenciaDentalSoft')} placeholder="N.º de registro clínico" />
        <Texto label="Sesión" value={caso ? (a.resultado === 'NO_REALIZADA' ? 'No suma sesión' : `Sesión ${sesionesRealizadas(caso) + 1}`) : '—'} onChange={() => {}} disabled />
        <Texto label="Observación de la atención" value={a.observacion ?? ''} onChange={set('observacion')} error={err.observacion} placeholder="Ej.: buena tolerancia, continuar ejercicios en casa" ancho="completo" />
      </div>
      <Aviso tipo="alerta">El detalle clínico se registra en Dental Soft; aquí solo los datos de gestión. Alertas según umbral de ensayo (pendiente de validar).</Aviso>
      <div className="acciones">
        <Volver />
        <Boton onClick={guardar} disabled={!puedeRegistrar}>Guardar atención</Boton>
      </div>

      {b && caso && (
        <div className="ficha">
          <h2>Ciclo de atención · {b.nombres} {b.apellidos}</h2>
          <div className="datos">
            <div className="dato"><span>Inicio del ciclo</span><b>{fmtFecha(caso.fechaInicio)}</b></div>
            <div className="dato"><span>Sesiones realizadas</span><b>{sesionesRealizadas(caso)}</b></div>
            <div className="dato"><span>Última actualización</span><b>{fmtFecha(caso.ultimaActualizacion)}</b></div>
            <div className="dato"><span>Ciclo terminado</span><b>{caso.fechaCierreCiclo ? 'Sí' : 'No'}</b></div>
          </div>
          <table className="tabla" aria-label="Atenciones del caso">
            <thead><tr><th>Fecha</th><th>Sesión</th><th>Prestación</th><th>Profesional</th><th>Resultado</th><th>Motivo / observación</th></tr></thead>
            <tbody>{caso.atenciones.length === 0 ? <tr><td colSpan={6} className="vacio">Sin atenciones registradas.</td></tr> :
              caso.atenciones.map(x => <tr key={x.id}><td>{fmtFecha(x.fecha)}</td><td>{x.numeroSesion ?? '—'}</td><td>{x.prestacion}</td><td>{x.profesional}</td><td>{x.resultado === 'REALIZADA' ? 'Realizada' : 'No realizada'}</td><td>{[x.motivo, x.observacion].filter(Boolean).join(' · ') || '—'}</td></tr>)}</tbody>
          </table>
          <div className="grilla grilla-3">
            <Selector label="Estado del caso" value={caso.estado} disabled={!puedeCiclo} onChange={v => ciclo({ estado: v as EstadoCaso }, 'Estado del caso actualizado.')}
              opciones={ESTADOS_CASO.map(e => ({ valor: e.codigo, texto: e.nombre }))} />
            <Selector label="Motivo de no gestión" value={motivoNG} onChange={setMotivoNG} opciones={MOTIVOS} disabled={!puedeCiclo} />
            <div className="acciones-campo">
              <Boton tipo="borde" disabled={!puedeCiclo || !motivoNG} onClick={() => { ciclo({ motivoNoGestion: motivoNG }, 'Motivo de no gestión guardado.'); setMotivoNG(''); }}>Guardar motivo</Boton>
              <Boton tipo="acento" disabled={!puedeCiclo} onClick={() => ciclo({ cerrarCiclo: true, estado: 'ATENDIDO' }, 'Ciclo terminado y guardado.')}>Confirmar término de ciclo</Boton>
            </div>
          </div>
          {err.estado && <Aviso tipo="error">{err.estado}</Aviso>}
        </div>
      )}
    </section>
  );
}
