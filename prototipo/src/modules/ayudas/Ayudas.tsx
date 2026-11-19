// M06 · CU-05 Registrar ayuda y urgencia (RF-18, RF-20 · CA-18, CA-20)
// Registrar ayudas: solo trabajo social. Marcar urgencia: trabajo social y TENS (CU-05 A2).
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSistema } from '../../data/useSistema';
import { marcarUrgencia, registrarAyuda } from '../../data/servicios';
import { TIPOS_AYUDA, casoActivo, fmtFecha, hoyISO, puede } from '../../domain/reglas';
import { Aviso, Boton, Encabezado, Selector, Texto, Volver } from '../../components/ui';

export default function Ayudas() {
  const { estado, usuario, ejecutar } = useSistema();
  const [params, setParams] = useSearchParams();
  const idB = params.get('b') ?? '';
  const [tipo, setTipo] = useState('');
  const [fecha, setFecha] = useState(hoyISO());
  const [guia, setGuia] = useState('');
  const [motivo, setMotivo] = useState('');
  const [err, setErr] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');
  const b = estado.beneficiarios.find(x => x.id === idB);
  const puedeAyuda = puede(usuario?.rol, 'AYUDA_REGISTRAR');
  const puedeUrgencia = puede(usuario?.rol, 'URGENCIA_MARCAR');

  const guardar = () => {
    const r = ejecutar(e => registrarAyuda(e, usuario!, idB, tipo, fecha, guia));
    if (!r.ok) { setErr(r.errores); setMsg(''); return; }
    setMsg(`Entrega de ${tipo} registrada para ${b!.nombres} ${b!.apellidos}.`); setErr({}); setTipo(''); setGuia('');
  };
  const urgencia = () => {
    const r = ejecutar(e => marcarUrgencia(e, usuario!, idB, motivo));
    if (!r.ok) { setErr(r.errores); setMsg(''); return; }
    setMsg(`Caso de ${b!.nombres} ${b!.apellidos} marcado como urgente.`); setErr({}); setMotivo('');
  };

  return (
    <section>
      <Encabezado titulo="Ayudas y urgencia" subtitulo="Gestión de ayudas · Área interna" codigo="M06 · CU-05 Registrar ayuda y urgencia" />
      {msg && <Aviso tipo="exito">{msg}</Aviso>}
      {err.permiso && <Aviso tipo="error">{err.permiso}</Aviso>}
      {!puedeAyuda && puedeUrgencia && <Aviso tipo="info">Su perfil puede marcar urgencias, pero el registro de entregas está reservado al equipo social.</Aviso>}
      <div className="grilla">
        <Selector label="Beneficiario *" value={idB} onChange={v => { setParams(v ? { b: v } : {}); setErr({}); setMsg(''); }} error={err.beneficiario}
          opciones={estado.beneficiarios.map(x => ({ valor: x.id, texto: `${x.nombres} ${x.apellidos}` }))} placeholder="Seleccionar beneficiario" />
        <Selector label="Tipo de ayuda entregada *" value={tipo} onChange={v => { setTipo(v); setErr(x => ({ ...x, tipo: '' })); }} error={err.tipo} opciones={TIPOS_AYUDA} placeholder="Seleccionar tipo de ayuda" disabled={!puedeAyuda} />
        <Texto label="Fecha de entrega *" type="date" value={fecha} onChange={setFecha} error={err.fecha} max={hoyISO()} disabled={!puedeAyuda} />
        <Texto label="N.º guía *" value={guia} onChange={v => { setGuia(v); setErr(x => ({ ...x, guia: '' })); }} error={err.guia} placeholder="GUIA-DEMO-001" disabled={!puedeAyuda} />
        <Texto label="Motivo de la urgencia (opcional)" value={motivo} onChange={setMotivo} placeholder="Ej.: requiere medicamento esta semana" />
      </div>
      <p className="nota">Solo se registra la ayuda entregada y la urgencia. Stock y rutas quedan fuera del alcance.</p>
      <div className="acciones">
        <Volver />
        <Boton tipo="acento" onClick={urgencia} disabled={!puedeUrgencia}>Marcar urgencia</Boton>
        <Boton onClick={guardar} disabled={!puedeAyuda}>Guardar entrega</Boton>
      </div>
      {b && (b.ayudas.length > 0 || (casoActivo(b)?.urgencias.length ?? 0) > 0) && (
        <table className="tabla" aria-label="Ayudas y urgencias del beneficiario">
          <thead><tr><th>Fecha</th><th>Registro</th><th>Detalle</th><th>Registrado por</th></tr></thead>
          <tbody>
            {b.ayudas.map(x => <tr key={x.id}><td>{fmtFecha(x.fecha)}</td><td>Ayuda entregada</td><td>{x.tipo} · guía {x.numeroGuia}</td><td>{x.autor}</td></tr>)}
            {casoActivo(b)?.urgencias.map(x => <tr key={x.id}><td>{fmtFecha(x.fecha)}</td><td>Urgencia</td><td>{x.motivo ?? '—'}</td><td>{x.autor}</td></tr>)}
          </tbody>
        </table>
      )}
    </section>
  );
}
