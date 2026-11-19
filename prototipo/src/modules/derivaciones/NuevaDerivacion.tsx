// M01 · CU-01 Registrar derivación (RF-01, RF-02 · RN-01, RN-02 · CA-01, CA-02)
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSistema } from '../../data/useSistema';
import { registrarDerivacion, revisarCoincidencia } from '../../data/servicios';
import { AREAS, COMUNAS, fmtFecha, hoyISO, sugerirTipoIngreso, validarDerivacion, type DatosDerivacion } from '../../domain/reglas';
import { Aviso, Boton, Encabezado, Modal, Selector, Texto, Volver } from '../../components/ui';

const VACIO: DatosDerivacion = { nombre: '', rut: '', comuna: '', apoderado: '', telefono: '', area: '', tipoIngreso: '', fecha: hoyISO(), origen: 'LLAMADO_SEMANAL', observacion: '' };

export default function NuevaDerivacion() {
  const { estado, usuario, ejecutar } = useSistema();
  const nav = useNavigate();
  const [d, setD] = useState<DatosDerivacion>(VACIO);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [coincidencia, setCoincidencia] = useState<ReturnType<typeof revisarCoincidencia>>(null);
  const [guardado, setGuardado] = useState<{ id: string; nombre: string; asociada: boolean } | null>(null);
  const set = (k: keyof DatosDerivacion) => (v: string) => { setD(x => ({ ...x, [k]: v })); setErrores(e => ({ ...e, [k]: '' })); };

  const previo = d.rut.length >= 9 ? revisarCoincidencia(estado, d.rut, d.nombre) : null;
  const sugerido = sugerirTipoIngreso(previo?.beneficiario);

  const guardar = (continuar = false) => {
    const err = validarDerivacion(d);
    if (Object.keys(err).length) { setErrores(err); return; }
    const c = revisarCoincidencia(estado, d.rut, d.nombre);
    if (c?.caso && !continuar) { setCoincidencia(c); return; }
    const r = ejecutar(e => registrarDerivacion(e, usuario!, d, { continuarTrasAdvertencia: continuar }));
    if (!r.ok) { setErrores(r.errores); return; }
    setCoincidencia(null);
    setGuardado({ id: r.dato!.idBeneficiario, nombre: d.nombre, asociada: r.dato!.asociadaACasoActivo });
    setD({ ...VACIO, fecha: hoyISO() });
  };

  return (
    <section>
      <Encabezado titulo="Nueva derivación" subtitulo="Gestión de beneficiarios · Área interna" codigo="M01 · CU-01 Registrar derivación" />
      {guardado && (
        <Aviso tipo="exito">
          Derivación registrada para <b>{guardado.nombre}</b>{guardado.asociada ? ' y asociada al caso activo existente' : ''}.{' '}
          <button type="button" className="enlace" onClick={() => nav(`/beneficiarios?b=${guardado.id}`)}>Ver ficha</button>
        </Aviso>
      )}
      {errores.permiso && <Aviso tipo="error">{errores.permiso}</Aviso>}
      <form className="formulario" noValidate onSubmit={e => { e.preventDefault(); guardar(); }}>
        <div className="grilla">
          <Texto label="Nombre del beneficiario *" value={d.nombre} onChange={set('nombre')} error={errores.nombre} placeholder="Nombres y apellidos" />
          <Texto label="RUT *" value={d.rut} onChange={set('rut')} error={errores.rut} placeholder="12345678-5" />
          <Selector label="Comuna *" value={d.comuna} onChange={set('comuna')} opciones={COMUNAS} error={errores.comuna} placeholder="Seleccionar comuna" />
          <Texto label="Apoderado *" value={d.apoderado} onChange={set('apoderado')} error={errores.apoderado} placeholder="Nombre del apoderado" />
          <Texto label="Contacto (teléfono) *" value={d.telefono} onChange={set('telefono')} error={errores.telefono} placeholder="+56 9 1234 5678" />
          <Selector label="Categoría de atención *" value={d.area} onChange={set('area')} error={errores.area} placeholder="Seleccionar categoría"
            opciones={AREAS.map(a => ({ valor: a.codigo, texto: a.nombre }))} />
          <Selector label="Ingreso o reingreso *" value={d.tipoIngreso} onChange={set('tipoIngreso')} error={errores.tipoIngreso} placeholder="Seleccionar ingreso"
            opciones={[{ valor: 'INGRESO', texto: 'Ingreso (primera atención)' }, { valor: 'REINGRESO', texto: 'Reingreso (ciclo anterior cerrado)' }]} />
          {previo && <p className="sugerencia">Sugerido según RN-01: <b>{sugerido === 'INGRESO' ? 'Ingreso' : 'Reingreso'}</b> ({previo.beneficiario.nombres} {previo.beneficiario.apellidos} ya está registrado).</p>}
          <Texto label="Fecha *" type="date" value={d.fecha} onChange={set('fecha')} error={errores.fecha} max={hoyISO()} />
          <Selector label="Origen de la detección" value={d.origen} onChange={set('origen')}
            opciones={[{ valor: 'LLAMADO_SEMANAL', texto: 'Llamado semanal' }, { valor: 'SOLICITUD_APODERADO', texto: 'Solicitud del apoderado' }]} />
          <Texto label="Observación" value={d.observacion} onChange={set('observacion')} error={errores.observacion} placeholder="Ej.: niño postrado, requiere traslado" ancho="completo" />
        </div>
        <p className="nota">Al guardar se revisa si existe un caso activo o una coincidencia con otro registro (RUT y, como respaldo, nombre).</p>
        <div className="acciones">
          <Volver />
          <Boton type="submit">Guardar derivación</Boton>
        </div>
      </form>

      {coincidencia && (
        <Modal titulo="Caso activo encontrado" onCerrar={() => setCoincidencia(null)} acciones={<>
          <Boton tipo="secundario" onClick={() => setCoincidencia(null)}>Cancelar</Boton>
          <Boton tipo="borde" onClick={() => nav(`/beneficiarios?b=${coincidencia.beneficiario.id}`)}>Ver caso existente</Boton>
          <Boton onClick={() => guardar(true)}>Asociar al caso activo</Boton>
        </>}>
          <p>Se encontró un caso activo que debes revisar:</p>
          <p><b>{coincidencia.beneficiario.nombres} {coincidencia.beneficiario.apellidos} · {coincidencia.beneficiario.comuna} · Ciclo en curso desde {fmtFecha(coincidencia.caso?.fechaInicio)}</b></p>
          <p className="tenue">Si continúas, la derivación se asocia al caso activo sin crear otro (supuesto DP-02). La regla final de coincidencia está pendiente de validación.</p>
        </Modal>
      )}
    </section>
  );
}
