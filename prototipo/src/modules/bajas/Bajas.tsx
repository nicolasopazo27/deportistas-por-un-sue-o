// M05 · CU-04 Registrar baja (RF-09 · RN-05 · CA-09)
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSistema } from '../../data/useSistema';
import { registrarBaja } from '../../data/servicios';
import { CAUSALES, estaDeBaja, fmtFecha, hoyISO, puede } from '../../domain/reglas';
import { Aviso, Boton, Encabezado, Modal, Selector, Texto, Volver } from '../../components/ui';

export default function Bajas() {
  const { estado, usuario, ejecutar } = useSistema();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const idB = params.get('b') ?? '';
  const [causal, setCausal] = useState('');
  const [fecha, setFecha] = useState(hoyISO());
  const [obs, setObs] = useState('');
  const [err, setErr] = useState<Record<string, string>>({});
  const [confirmar, setConfirmar] = useState(false);
  const [msg, setMsg] = useState('');
  const b = estado.beneficiarios.find(x => x.id === idB);
  const puedeBaja = puede(usuario?.rol, 'BAJA_REGISTRAR');

  const pedirConfirmacion = () => {
    const e: Record<string, string> = {};
    if (!b) e.beneficiario = 'Seleccione un beneficiario.';
    if (!causal) e.causal = 'Seleccione una causal: fallecimiento, egreso o desvinculación.';
    if (!fecha) e.fecha = 'Ingrese la fecha de la baja.';
    setErr(e); setMsg('');
    if (!Object.keys(e).length) setConfirmar(true);
  };
  const guardar = () => {
    const r = ejecutar(e => registrarBaja(e, usuario!, b!.id, causal, fecha, obs));
    setConfirmar(false);
    if (!r.ok) { setErr(r.errores); return; }
    setMsg(`Baja registrada para ${b!.nombres} ${b!.apellidos}. El historial se conserva.`);
    setCausal(''); setObs('');
  };

  return (
    <section>
      <Encabezado titulo="Baja de beneficiario" subtitulo="Gestión de beneficiarios · Área interna" codigo="M05 · CU-04 Registrar baja" />
      {!puedeBaja && <Aviso tipo="alerta">El registro de bajas está reservado al área social.</Aviso>}
      {msg && <Aviso tipo="exito">{msg} <button type="button" className="enlace" onClick={() => nav(`/beneficiarios?b=${idB}`)}>Ver ficha</button></Aviso>}
      {err.permiso && <Aviso tipo="error">{err.permiso}</Aviso>}
      <div className="grilla">
        <Selector label="Beneficiario *" value={idB} onChange={v => { setParams(v ? { b: v } : {}); setErr({}); setMsg(''); }} error={err.beneficiario}
          opciones={estado.beneficiarios.map(x => ({ valor: x.id, texto: `${x.nombres} ${x.apellidos}${estaDeBaja(x) ? ' (con baja)' : ''}` }))} placeholder="Seleccionar beneficiario" />
        <Selector label="Causal de baja (obligatoria) *" value={causal} onChange={v => { setCausal(v); setErr(x => ({ ...x, causal: '' })); }} error={err.causal}
          opciones={CAUSALES.map(c => ({ valor: c.codigo, texto: c.nombre }))} placeholder="Seleccionar causal" />
        <Texto label="Fecha de la baja *" type="date" value={fecha} onChange={setFecha} error={err.fecha} max={hoyISO()} />
        <Texto label="Observaciones" value={obs} onChange={setObs} placeholder="Detalle o respaldo de la baja" />
      </div>
      {b && b.bajas.length > 0 && <Aviso tipo="info">Bajas registradas: {b.bajas.map(x => `${CAUSALES.find(c => c.codigo === x.causal)?.nombre} (${fmtFecha(x.fecha)})`).join(', ')}.</Aviso>}
      <p className="nota">La baja conserva el historial completo del beneficiario. El efecto sobre casos activos está pendiente de validación (DP-09).</p>
      <div className="acciones">
        <Volver />
        <Boton onClick={pedirConfirmacion} disabled={!puedeBaja}>Confirmar baja</Boton>
      </div>
      {confirmar && b && (
        <Modal titulo="Confirmar baja" onCerrar={() => setConfirmar(false)} acciones={<>
          <Boton tipo="secundario" onClick={() => setConfirmar(false)}>Cancelar</Boton><Boton onClick={guardar}>Registrar baja</Boton></>}>
          <p>Se registrará la baja de <b>{b.nombres} {b.apellidos}</b> por <b>{CAUSALES.find(c => c.codigo === causal)?.nombre}</b> con fecha {fmtFecha(fecha)}.</p>
        </Modal>
      )}
    </section>
  );
}
