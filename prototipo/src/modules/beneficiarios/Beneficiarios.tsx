// M02 · CU-02 Consultar y actualizar ficha (RF-04, RF-12–17, RF-23 · CA-04, CA-12–17, CA-23)
// v2 (observaciones del mandante): ficha en pestañas, foto identificatoria del NNA y carga de antecedentes
// (patologías, centros hospitalarios, credencial de discapacidad, hospitalizaciones).
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Camera, Printer } from 'lucide-react';
import { useSistema } from '../../data/useSistema';
import { actualizarFicha, actualizarFoto, agregarObservacion, type CambiosFicha } from '../../data/servicios';
import { AREAS, CENTROS_SALUD, COMUNAS, ENFERMEDADES, PREVISIONES, casoActivo, edad, estaDeBaja, estadoTexto, fmtFecha, mensajeWhatsAppFicha, nombreCompleto, puede, sesionesRealizadas } from '../../domain/reglas';
import type { Beneficiario } from '../../domain/tipos';
import { Aviso, Avatar, Boton, BotonWhatsApp, Encabezado, Etiqueta, Modal, Pestanas, Selector, Texto, Volver } from '../../components/ui';
import { exportarFicha } from '../reportes/exportar';
import { LineaTiempo } from '../../components/LineaTiempo';

type Tab = 'resumen' | 'antecedentes' | 'historial' | 'atenciones' | 'observaciones';

// Reduce la foto a 320 px para guardarla liviana en el almacenamiento.
function leerFoto(archivo: File): Promise<string> {
  return new Promise((ok, mal) => {
    if (!/^image\/(png|jpe?g|webp)$/.test(archivo.type)) { mal(new Error('Formato no admitido. Use JPG, PNG o WebP.')); return; }
    const lector = new FileReader();
    lector.onload = () => {
      const img = new Image();
      img.onload = () => {
        const lado = 320, c = document.createElement('canvas');
        const esc = Math.min(1, lado / Math.max(img.width, img.height));
        c.width = Math.round(img.width * esc); c.height = Math.round(img.height * esc);
        c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height);
        ok(c.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => mal(new Error('No se pudo leer la imagen.'));
      img.src = String(lector.result);
    };
    lector.readAsDataURL(archivo);
  });
}

export default function Beneficiarios() {
  const { estado, usuario, ejecutar } = useSistema();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const [f, setF] = useState({ comuna: '', enfermedad: '', estado: '', q: '' });
  const [aplicado, setAplicado] = useState(f);
  const [tab, setTab] = useState<Tab>('resumen');
  const [editar, setEditar] = useState<'datos' | 'antecedentes' | null>(null);
  const [obs, setObs] = useState<string | null>(null);
  const [errObs, setErrObs] = useState('');
  const [msg, setMsg] = useState('');
  const [errFoto, setErrFoto] = useState('');
  const rol = usuario?.rol;
  const verSalud = puede(rol, 'SALUD_VER');
  const verSensibles = puede(rol, 'DATOS_SENSIBLES_VER');

  const lista = useMemo(() => estado.beneficiarios.filter(b => {
    if (aplicado.comuna && b.comuna !== aplicado.comuna) return false;
    if (aplicado.enfermedad && !b.enfermedades.some(e => e.nombre === aplicado.enfermedad)) return false;
    if (aplicado.estado === 'ACTIVO' && estaDeBaja(b)) return false;
    if (aplicado.estado === 'BAJA' && !estaDeBaja(b)) return false;
    if (aplicado.q && !`${b.nombres} ${b.apellidos} ${b.rut}`.toLowerCase().includes(aplicado.q.toLowerCase())) return false;
    return true;
  }), [estado.beneficiarios, aplicado]);

  const sel = estado.beneficiarios.find(b => b.id === params.get('b'));
  const elegir = (id: string) => { setParams({ b: id }); setMsg(''); setTab('resumen'); };
  const caso = sel && casoActivo(sel);

  const guardarObs = () => {
    const r = ejecutar(e => agregarObservacion(e, usuario!, sel!.id, obs ?? ''));
    if (!r.ok) { setErrObs(Object.values(r.errores)[0]); return; }
    setObs(null); setMsg('Observación guardada.');
  };
  const subirFoto = async (archivo?: File) => {
    if (!archivo || !sel) return;
    try {
      const dataUrl = await leerFoto(archivo);
      const r = ejecutar(e => actualizarFoto(e, usuario!, sel.id, dataUrl));
      if (r.ok) { setMsg('Foto identificatoria actualizada.'); setErrFoto(''); } else setErrFoto(Object.values(r.errores)[0]);
    } catch (e) { setErrFoto((e as Error).message); }
  };
  const atenciones = sel ? sel.casos.flatMap(c => c.atenciones.map(a => ({ ...a, area: AREAS.find(x => x.codigo === c.derivaciones[0]?.area)?.nombre }))).reverse() : [];

  return (
    <section>
      <Encabezado titulo="Fichas de beneficiarios" subtitulo="Beneficiarios · Ficha única del NNA" codigo="M02 · CU-02 Consultar y actualizar ficha" />
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
          {lista.map(b => (
            <tr key={b.id} className={sel?.id === b.id ? 'fila-sel' : ''} onClick={() => elegir(b.id)} tabIndex={0} onKeyDown={e => e.key === 'Enter' && elegir(b.id)}>
              <td className="celda-nombre"><Avatar nombres={b.nombres} apellidos={b.apellidos} foto={b.foto} tam="sm" /><button type="button" className="enlace">{nombreCompleto(b)}</button></td>
              <td>{b.rut}</td><td>{b.comuna}</td>
              {verSalud && <td>{b.enfermedades.map(e => e.nombre).join(', ') || 'Por completar'}</td>}
              <td><Etiqueta {...estadoTexto(b)} /></td><td>{sesionesRealizadas(casoActivo(b) ?? b.casos.at(-1))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {sel && (
        <div className="ficha" aria-label={`Ficha de ${nombreCompleto(sel)}`}>
          <div className="ficha-cab">
            <div className="foto-ficha">
              <Avatar nombres={sel.nombres} apellidos={sel.apellidos} foto={sel.foto} tam="lg" />
              {puede(rol, 'FOTO_EDITAR') && (
                <label className="subir-foto"><Camera size={14} aria-hidden="true" /> {sel.foto ? 'Cambiar foto' : 'Agregar foto'}
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => subirFoto(e.target.files?.[0])} aria-label="Foto identificatoria del NNA" />
                </label>
              )}
            </div>
            <div className="ficha-titulo">
              <h2>{nombreCompleto(sel)}</h2>
              <p>RUT {sel.rut} · {edad(sel.fechaNacimiento)} · {sel.comuna} · <Etiqueta {...estadoTexto(sel)} /></p>
              <p className="tenue">Ingreso al programa: {fmtFecha(sel.fechaRegistro)}{sel.tutor ? ` · Tutor: ${sel.tutor}` : ''}</p>
            </div>
          </div>
          {errFoto && <Aviso tipo="error">{errFoto}</Aviso>}
          {msg && <Aviso tipo="exito">{msg}</Aviso>}

          <Pestanas<Tab> activa={tab} onCambiar={setTab} opciones={[
            { id: 'resumen', texto: 'Resumen' }, { id: 'antecedentes', texto: 'Antecedentes' },
            { id: 'historial', texto: 'Historial', cuenta: sel.historial.length }, { id: 'atenciones', texto: 'Atenciones', cuenta: atenciones.length },
            { id: 'observaciones', texto: 'Observaciones', cuenta: sel.observaciones.length },
          ]} />

          {tab === 'resumen' && (
            <div className="datos">
              <Dato t="Apoderado" v={sel.apoderado.nombre} /><Dato t="Contacto" v={sel.apoderado.telefono} />
              <Dato t="Caso activo" v={caso ? `Desde ${fmtFecha(caso.fechaInicio)} · ${sesionesRealizadas(caso)} sesiones${caso.urgencias.length ? ' · URGENTE' : ''}` : 'Sin caso activo'} />
              {verSensibles ? <>
                <Dato t="Previsión apoderado" v={sel.apoderado.prevision ?? 'Sin registrar'} />
                <Dato t="Situación documental" v={{ DOCUMENTADO: 'Documentado', INDOCUMENTADO: 'Indocumentado', POR_VERIFICAR: 'Por verificar' }[sel.situacionDocumental]} />
                <Dato t="Electrodependiente" v={sel.electrodependiente ? 'Sí' : 'No'} />
              </> : <Dato t="Datos sensibles" v="Acceso restringido para su perfil" />}
              {verSalud ? <Dato t="Salud" v={sel.enfermedades.map(e => e.nombre).join(', ') || 'Por completar'} /> : <Dato t="Salud" v="Acceso restringido para su perfil" />}
              <Dato t="Ayudas entregadas" v={String(sel.ayudas.length)} /><Dato t="Bajas" v={sel.bajas.length ? sel.bajas.map(x => x.causal.toLowerCase()).join(', ') : 'No'} />
            </div>
          )}

          {tab === 'antecedentes' && (verSalud ? (
            <div>
              <div className="datos">
                <Dato t="Patologías" v={sel.enfermedades.map(e => e.nombre + (e.descripcion ? ` (${e.descripcion})` : '')).join('; ') || 'Por completar'} />
                <Dato t="Centros hospitalarios" v={sel.centrosSalud.join(', ') || 'Sin registrar'} />
                <Dato t="Credencial de discapacidad" v={sel.credencial.tiene ? `Sí · N.º ${sel.credencial.numero}${sel.credencial.porcentaje ? ` · ${sel.credencial.porcentaje}%` : ''}` : 'No'} />
                <Dato t="Electrodependiente" v={sel.electrodependiente ? 'Sí' : 'No'} />
              </div>
              <h3>Hospitalizaciones</h3>
              <table className="tabla" aria-label="Hospitalizaciones">
                <thead><tr><th>Ingreso</th><th>Alta</th><th>Centro</th><th>Descripción</th></tr></thead>
                <tbody>{sel.hospitalizaciones.length === 0 ? <tr><td colSpan={4} className="vacio">Sin hospitalizaciones registradas.</td></tr>
                  : sel.hospitalizaciones.map(h => <tr key={h.id}><td>{fmtFecha(h.ingreso)}</td><td>{fmtFecha(h.alta)}</td><td>{h.centro ?? '—'}</td><td>{h.descripcion}</td></tr>)}</tbody>
              </table>
            </div>
          ) : <Aviso tipo="alerta">Los antecedentes de salud del NNA están restringidos para su perfil.</Aviso>)}

          {tab === 'historial' && <LineaTiempo eventos={sel.historial} />}

          {tab === 'atenciones' && (
            <table className="tabla" aria-label="Atenciones del beneficiario">
              <thead><tr><th>Fecha</th><th>Sesión</th><th>Prestación</th><th>Profesional</th><th>Resultado</th><th>Observación</th></tr></thead>
              <tbody>{atenciones.length === 0 ? <tr><td colSpan={6} className="vacio">Sin atenciones registradas.</td></tr>
                : atenciones.map(a => <tr key={a.id}><td>{fmtFecha(a.fecha)}</td><td>{a.numeroSesion ?? '—'}</td><td>{a.prestacion}</td><td>{a.profesional}</td><td>{a.resultado === 'REALIZADA' ? 'Realizada' : `No realizada (${a.motivo})`}</td><td>{a.observacion ?? '—'}</td></tr>)}</tbody>
            </table>
          )}

          {tab === 'observaciones' && (sel.observaciones.length === 0 ? <p className="tenue">Sin observaciones.</p> :
            <ul className="observaciones">{[...sel.observaciones].reverse().map(o => <li key={o.id}><b>{fmtFecha(o.fechaHora)} · {o.autor}:</b> {o.texto}</li>)}</ul>)}

          <div className="acciones">
            <Volver texto="Volver al listado" />
            {puede(rol, 'FICHA_EDITAR') && <Boton tipo="acento" onClick={() => setEditar('datos')}>Editar ficha</Boton>}
            {puede(rol, 'SALUD_EDITAR') && <Boton tipo="borde" onClick={() => setEditar('antecedentes')}>Agregar antecedentes</Boton>}
            {puede(rol, 'DERIVACION_REGISTRAR') && !estaDeBaja(sel) && <Boton tipo="borde" onClick={() => nav(`/derivaciones?b=${sel.id}`)}>Derivar</Boton>}
            {puede(rol, 'BAJA_REGISTRAR') && !estaDeBaja(sel) && <Boton onClick={() => nav(`/bajas?b=${sel.id}`)}>Dar de baja</Boton>}
            {puede(rol, 'OBSERVACION_REGISTRAR') && <Boton tipo="secundario" onClick={() => { setObs(''); setErrObs(''); }}>Agregar observación</Boton>}
            {puede(rol, 'EXPORTAR_FICHA') && <Boton tipo="borde" onClick={async () => { await exportarFicha(sel, usuario!, ejecutar); setMsg('Ficha exportada a Excel; la descarga quedó registrada.'); }}>Exportar ficha (XLSX)</Boton>}
            {puede(rol, 'EXPORTAR_FICHA') && <Boton tipo="borde" onClick={() => window.open(`#/ficha-imprimir?b=${sel.id}`, '_blank')}><Printer size={15} /> Imprimir / PDF</Boton>}
            {(puede(rol, 'FICHA_EDITAR') || puede(rol, 'ATENCION_REGISTRAR')) && <BotonWhatsApp telefono={sel.apoderado.telefono} mensaje={mensajeWhatsAppFicha(sel)} />}
          </div>
        </div>
      )}

      {editar === 'datos' && sel && <EditarFicha b={sel} onCerrar={() => setEditar(null)} onGuardar={c => {
        const r = ejecutar(e => actualizarFicha(e, usuario!, sel.id, c));
        if (r.ok) { setEditar(null); setMsg('Cambios guardados en la ficha.'); }
        return r.ok ? '' : Object.values(r.errores)[0];
      }} puedeSensibles={puede(rol, 'DATOS_SENSIBLES_EDITAR')} />}

      {editar === 'antecedentes' && sel && <EditarAntecedentes b={sel} onCerrar={() => setEditar(null)} onGuardar={c => {
        const r = ejecutar(e => actualizarFicha(e, usuario!, sel.id, c));
        if (r.ok) { setEditar(null); setTab('antecedentes'); setMsg('Antecedentes guardados en la ficha.'); }
        return r.ok ? '' : Object.values(r.errores)[0];
      }} />}

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

function EditarFicha({ b, onCerrar, onGuardar, puedeSensibles }: { b: Beneficiario; onCerrar: () => void; onGuardar: (c: CambiosFicha) => string; puedeSensibles: boolean }) {
  const [c, setC] = useState<CambiosFicha>({ comuna: b.comuna, telefono: b.apoderado.telefono, prevision: b.apoderado.prevision ?? '', situacionDocumental: b.situacionDocumental, electrodependiente: b.electrodependiente });
  const [err, setErr] = useState('');
  return (
    <Modal titulo={`Editar ficha · ${nombreCompleto(b)}`} onCerrar={onCerrar} acciones={<>
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
      </div>
    </Modal>
  );
}

function EditarAntecedentes({ b, onCerrar, onGuardar }: { b: Beneficiario; onCerrar: () => void; onGuardar: (c: CambiosFicha) => string }) {
  const [enf, setEnf] = useState(''); const [desc, setDesc] = useState(''); const [centro, setCentro] = useState('');
  const [cred, setCred] = useState(b.credencial.tiene ? 'SI' : 'NO'); const [num, setNum] = useState(b.credencial.numero ?? ''); const [pct, setPct] = useState(b.credencial.porcentaje ? String(b.credencial.porcentaje) : '');
  const [h, setH] = useState({ ingreso: '', alta: '', centro: '', descripcion: '' });
  const [err, setErr] = useState('');
  const guardar = () => {
    const c: CambiosFicha = {};
    if (enf) { c.enfermedad = enf; c.descripcionSalud = desc; }
    if (centro) c.centroSalud = centro;
    if ((cred === 'SI') !== b.credencial.tiene || num !== (b.credencial.numero ?? '') || pct !== (b.credencial.porcentaje ? String(b.credencial.porcentaje) : ''))
      c.credencial = cred === 'SI' ? { tiene: true, numero: num, porcentaje: pct ? Number(pct) : undefined } : { tiene: false };
    if (h.descripcion || h.ingreso || h.alta) c.hospitalizacion = { ingreso: h.ingreso || undefined, alta: h.alta || undefined, centro: h.centro || undefined, descripcion: h.descripcion };
    if (!Object.keys(c).length) { setErr('No hay cambios para guardar.'); return; }
    setErr(onGuardar(c));
  };
  return (
    <Modal titulo={`Antecedentes del NNA · ${nombreCompleto(b)}`} onCerrar={onCerrar} acciones={<>
      <Boton tipo="secundario" onClick={onCerrar}>Cancelar</Boton><Boton onClick={guardar}>Guardar antecedentes</Boton></>}>
      {err && <Aviso tipo="error">{err}</Aviso>}
      <div className="grilla">
        <Selector label="Agregar patología" value={enf} onChange={setEnf} opciones={ENFERMEDADES} placeholder="Sin cambios" />
        <Texto label="Descripción de la patología" value={desc} onChange={setDesc} />
        <Selector label="Agregar centro hospitalario" value={centro} onChange={setCentro} opciones={CENTROS_SALUD} placeholder="Sin cambios" />
        <Selector label="Credencial de discapacidad" value={cred} onChange={setCred} opciones={[{ valor: 'SI', texto: 'Sí' }, { valor: 'NO', texto: 'No' }]} />
        {cred === 'SI' && <Texto label="N.º credencial" value={num} onChange={setNum} />}
        {cred === 'SI' && <Texto label="% de discapacidad" type="number" value={pct} onChange={setPct} />}
      </div>
      <h3>Registrar hospitalización</h3>
      <div className="grilla">
        <Texto label="Fecha de ingreso" type="date" value={h.ingreso} onChange={v => setH({ ...h, ingreso: v })} />
        <Texto label="Fecha de alta" type="date" value={h.alta} onChange={v => setH({ ...h, alta: v })} />
        <Selector label="Centro" value={h.centro} onChange={v => setH({ ...h, centro: v })} opciones={CENTROS_SALUD} />
        <Texto label="Descripción" value={h.descripcion} onChange={v => setH({ ...h, descripcion: v })} />
      </div>
    </Modal>
  );
}
