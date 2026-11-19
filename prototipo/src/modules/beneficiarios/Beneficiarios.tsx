// M02 · CU-02 Consultar y actualizar ficha (RF-04, RF-12–17, RF-23 · CA-04, CA-12–17, CA-23)
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSistema } from '../../data/useSistema';
import { actualizarFicha, agregarObservacion, type CambiosFicha } from '../../data/servicios';
import { COMUNAS, ENFERMEDADES, PREVISIONES, casoActivo, estaDeBaja, estadoTexto, fmtFecha, puede, sesionesRealizadas } from '../../domain/reglas';
import type { Beneficiario } from '../../domain/tipos';
import { Aviso, Boton, Encabezado, Etiqueta, Modal, Selector, Texto, Volver } from '../../components/ui';
import { exportarFicha } from '../reportes/exportar';


export default function Beneficiarios() {
  const { estado, usuario, ejecutar } = useSistema();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const [f, setF] = useState({ comuna: '', enfermedad: '', estado: '', q: '' });
  const [aplicado, setAplicado] = useState(f);
  const [editar, setEditar] = useState(false);
  const [obs, setObs] = useState<string | null>(null);
  const [errObs, setErrObs] = useState('');
  const [msg, setMsg] = useState('');
  const verSalud = puede(usuario?.rol, 'SALUD_VER');
  const verSensibles = puede(usuario?.rol, 'DATOS_SENSIBLES_VER');

  const lista = useMemo(() => estado.beneficiarios.filter(b => {
    if (aplicado.comuna && b.comuna !== aplicado.comuna) return false;
    if (aplicado.enfermedad && !b.enfermedades.some(e => e.nombre === aplicado.enfermedad)) return false;
    if (aplicado.estado === 'ACTIVO' && estaDeBaja(b)) return false;
    if (aplicado.estado === 'BAJA' && !estaDeBaja(b)) return false;
    if (aplicado.q) {
      const q = aplicado.q.toLowerCase();
      if (!`${b.nombres} ${b.apellidos} ${b.rut}`.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [estado.beneficiarios, aplicado]);

  const sel = estado.beneficiarios.find(b => b.id === params.get('b'));
  const elegir = (id: string) => { setParams({ b: id }); setMsg(''); };
  const caso = sel && casoActivo(sel);

  const guardarObs = () => {
    const r = ejecutar(e => agregarObservacion(e, usuario!, sel!.id, obs ?? ''));
    if (!r.ok) { setErrObs(Object.values(r.errores)[0]); return; }
    setObs(null); setMsg('Observación guardada.');
  };

  return (
    <section>
      <Encabezado titulo="Ficha del beneficiario" subtitulo="Gestión de beneficiarios · Área interna" codigo="M02 · CU-02 Consultar y actualizar ficha" />
      <form className="filtros" onSubmit={e => { e.preventDefault(); setAplicado(f); }}>
        <Selector label="Filtro comuna" value={f.comuna} onChange={v => setF({ ...f, comuna: v })} opciones={COMUNAS} placeholder="Todas" />
        {verSalud && <Selector label="Filtro enfermedad" value={f.enfermedad} onChange={v => setF({ ...f, enfermedad: v })} opciones={ENFERMEDADES} placeholder="Todas" />}
        <Selector label="Estado" value={f.estado} onChange={v => setF({ ...f, estado: v })} opciones={[{ valor: 'ACTIVO', texto: 'Activo' }, { valor: 'BAJA', texto: 'Baja' }]} placeholder="Todos" />
        <Texto label="Buscar" value={f.q} onChange={v => setF({ ...f, q: v })} placeholder="Nombre o RUT" />
        <Boton tipo="acento" type="submit">Buscar</Boton>
      </form>

      <table className="tabla" aria-label="Listado de beneficiarios">
        <thead><tr><th>Beneficiario</th><th>RUT</th><th>Comuna</th>{verSalud && <th>Enfermedad</th>}<th>Estado</th><th>Sesiones</th></tr></thead>
        <tbody>
          {lista.length === 0 && <tr><td colSpan={6} className="vacio">Sin resultados para los filtros seleccionados.</td></tr>}
          {lista.map(b => {
            const est = estadoTexto(b);
            return (
              <tr key={b.id} className={sel?.id === b.id ? 'fila-sel' : ''} onClick={() => elegir(b.id)} tabIndex={0} onKeyDown={e => e.key === 'Enter' && elegir(b.id)}>
                <td><button type="button" className="enlace">{b.nombres} {b.apellidos}</button></td>
                <td>{b.rut}</td><td>{b.comuna}</td>
                {verSalud && <td>{b.enfermedades.map(e => e.nombre).join(', ') || 'Por completar'}</td>}
                <td><Etiqueta {...est} /></td><td>{sesionesRealizadas(casoActivo(b) ?? b.casos.at(-1))}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {sel && (
        <div className="ficha" aria-label={`Ficha de ${sel.nombres} ${sel.apellidos}`}>
          <h2>Ficha del beneficiario: {sel.nombres} {sel.apellidos}</h2>
          {msg && <Aviso tipo="exito">{msg}</Aviso>}
          <div className="datos">
            <Dato t="RUT" v={sel.rut} /><Dato t="Comuna" v={sel.comuna} /><Dato t="Estado" v={estadoTexto(sel).texto} />
            <Dato t="Apoderado" v={sel.apoderado.nombre} /><Dato t="Contacto" v={sel.apoderado.telefono} />
            <Dato t="Caso activo" v={caso ? `Desde ${fmtFecha(caso.fechaInicio)} · ${sesionesRealizadas(caso)} sesiones${caso.urgencias.length ? ' · URGENTE' : ''}` : 'Sin caso activo'} />
            {verSensibles ? <>
              <Dato t="Previsión apoderado" v={sel.apoderado.prevision ?? 'Sin registrar'} />
              <Dato t="Situación documental" v={{ DOCUMENTADO: 'Documentado', INDOCUMENTADO: 'Indocumentado', POR_VERIFICAR: 'Por verificar' }[sel.situacionDocumental]} />
              <Dato t="Electrodependiente" v={sel.electrodependiente ? 'Sí' : 'No'} />
            </> : <Dato t="Datos sensibles" v="Acceso restringido para su perfil" />}
            {verSalud ? <Dato t="Salud" v={sel.enfermedades.map(e => e.nombre + (e.descripcion ? ` (${e.descripcion})` : '')).join('; ') || 'Por completar'} />
              : <Dato t="Salud" v="Acceso restringido para su perfil" />}
          </div>

          <h3>Historial unificado</h3>
          <table className="tabla" aria-label="Historial unificado">
            <thead><tr><th>Fecha</th><th>Tipo</th><th>Detalle</th><th>Registrado por</th></tr></thead>
            <tbody>
              {[...sel.historial].reverse().map((h, i) => (
                <tr key={i}><td>{fmtFecha(h.fecha)}</td><td>{h.tipo}</td><td>{h.detalle}</td><td>{h.autor}</td></tr>
              ))}
            </tbody>
          </table>
          {sel.observaciones.length > 0 && <>
            <h3>Observaciones</h3>
            <ul className="observaciones">{sel.observaciones.map(o => <li key={o.id}><b>{fmtFecha(o.fechaHora)} · {o.autor}:</b> {o.texto}</li>)}</ul>
          </>}

          <div className="acciones">
            <Volver texto="Volver al listado" />
            {puede(usuario?.rol, 'FICHA_EDITAR') && <Boton tipo="acento" onClick={() => setEditar(true)}>Editar ficha</Boton>}
            {puede(usuario?.rol, 'BAJA_REGISTRAR') && !estaDeBaja(sel) && <Boton onClick={() => nav(`/bajas?b=${sel.id}`)}>Dar de baja</Boton>}
            {puede(usuario?.rol, 'OBSERVACION_REGISTRAR') && <Boton tipo="secundario" onClick={() => { setObs(''); setErrObs(''); }}>Agregar observación</Boton>}
            {puede(usuario?.rol, 'EXPORTAR_FICHA') && <Boton tipo="borde" onClick={async () => { await exportarFicha(sel, usuario!, ejecutar); setMsg('Ficha exportada a Excel; la descarga quedó registrada.'); }}>Exportar ficha (XLSX)</Boton>}
          </div>
        </div>
      )}

      {editar && sel && <EditarFicha b={sel} onCerrar={() => setEditar(false)} onGuardar={c => {
        const r = ejecutar(e => actualizarFicha(e, usuario!, sel.id, c));
        if (r.ok) { setEditar(false); setMsg('Cambios guardados en la ficha.'); }
        return r.ok ? '' : Object.values(r.errores)[0];
      }} puedeSalud={puede(usuario?.rol, 'SALUD_EDITAR')} puedeSensibles={puede(usuario?.rol, 'DATOS_SENSIBLES_EDITAR')} />}

      {obs !== null && (
        <Modal titulo="Agregar observación" onCerrar={() => setObs(null)} acciones={<>
          <Boton tipo="secundario" onClick={() => setObs(null)}>Cancelar</Boton><Boton onClick={guardarObs}>Guardar observación</Boton></>}>
          <Texto label="Observación" value={obs} onChange={v => { setObs(v); setErrObs(''); }} error={errObs} placeholder="Ej.: seguimiento telefónico con la familia" ancho="completo" />
        </Modal>
      )}
    </section>
  );
}

function Dato({ t, v }: { t: string; v: string }) {
  return <div className="dato"><span>{t}</span><b>{v}</b></div>;
}

function EditarFicha({ b, onCerrar, onGuardar, puedeSalud, puedeSensibles }: { b: Beneficiario; onCerrar: () => void; onGuardar: (c: CambiosFicha) => string; puedeSalud: boolean; puedeSensibles: boolean }) {
  const [c, setC] = useState<CambiosFicha>({ comuna: b.comuna, telefono: b.apoderado.telefono, prevision: b.apoderado.prevision ?? '', situacionDocumental: b.situacionDocumental, electrodependiente: b.electrodependiente, enfermedad: '', descripcionSalud: '' });
  const [err, setErr] = useState('');
  return (
    <Modal titulo={`Editar ficha · ${b.nombres} ${b.apellidos}`} onCerrar={onCerrar} acciones={<>
      <Boton tipo="secundario" onClick={onCerrar}>Cancelar</Boton><Boton onClick={() => setErr(onGuardar(c))}>Guardar cambios</Boton></>}>
      {err && <Aviso tipo="error">{err}</Aviso>}
      <div className="grilla">
        <Selector label="Comuna" value={c.comuna ?? ''} onChange={v => setC({ ...c, comuna: v })} opciones={COMUNAS} />
        <Texto label="Contacto" value={c.telefono ?? ''} onChange={v => setC({ ...c, telefono: v })} />
        {puedeSensibles && <>
          <Selector label="Previsión del apoderado" value={c.prevision ?? ''} onChange={v => setC({ ...c, prevision: v })} opciones={PREVISIONES} />
          <Selector label="Situación documental" value={c.situacionDocumental ?? ''} onChange={v => setC({ ...c, situacionDocumental: v as Beneficiario['situacionDocumental'] })}
            opciones={[{ valor: 'DOCUMENTADO', texto: 'Documentado' }, { valor: 'INDOCUMENTADO', texto: 'Indocumentado' }, { valor: 'POR_VERIFICAR', texto: 'Por verificar' }]} />
          <Selector label="Electrodependiente" value={c.electrodependiente ? 'SI' : 'NO'} onChange={v => setC({ ...c, electrodependiente: v === 'SI' })} opciones={[{ valor: 'SI', texto: 'Sí' }, { valor: 'NO', texto: 'No' }]} />
        </>}
        {puedeSalud && <>
          <Selector label="Agregar enfermedad / condición" value={c.enfermedad ?? ''} onChange={v => setC({ ...c, enfermedad: v })} opciones={ENFERMEDADES} placeholder="Sin cambios" />
          <Texto label="Descripción (enfermedades u hospitalizaciones)" value={c.descripcionSalud ?? ''} onChange={v => setC({ ...c, descripcionSalud: v })} ancho="completo" />
        </>}
      </div>
    </Modal>
  );
}
