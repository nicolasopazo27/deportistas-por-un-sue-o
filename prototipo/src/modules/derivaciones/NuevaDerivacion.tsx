// M01 · CU-01 Registrar derivación (RF-01, RF-02 · RN-01, RN-02 · CA-01, CA-02)
// Solo se deriva a NNA ya ingresados al programa (postulación aceptada). Los datos de identificación,
// comuna, apoderado y contacto se toman de la ficha única, evitando volver a digitarlos (D4).
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSistema } from '../../data/useSistema';
import { buscarBeneficiario, registrarDerivacion, revisarCasoActivo } from '../../data/servicios';
import { AREAS, estaDeBaja, fmtFecha, hoyISO, nombreCompleto, puede, sugerirTipoIngreso, validarDerivacion, type DatosDerivacion } from '../../domain/reglas';
import { Aviso, Avatar, Boton, Encabezado, Modal, Pasos, Selector, Texto, Volver } from '../../components/ui';

export default function NuevaDerivacion() {
  const { estado, usuario, ejecutar } = useSistema();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const idB = params.get('b') ?? '';
  const b = estado.beneficiarios.find(x => x.id === idB);
  const [q, setQ] = useState('');
  const [d, setD] = useState<Omit<DatosDerivacion, 'idBeneficiario'>>({ area: '', tipoIngreso: '', fecha: hoyISO(), origen: 'LLAMADO_SEMANAL', observacion: '' });
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [advertencia, setAdvertencia] = useState(false);
  const [guardado, setGuardado] = useState<{ id: string; nombre: string; asociada: boolean } | null>(null);
  const resultados = buscarBeneficiario(estado, q);
  const set = (k: keyof typeof d) => (v: string) => { setD(x => ({ ...x, [k]: v })); setErrores(e => ({ ...e, [k]: '' })); };
  const sugerido = sugerirTipoIngreso(b);
  const datos = (): DatosDerivacion => ({ ...d, idBeneficiario: idB, tipoIngreso: d.tipoIngreso || sugerido });

  const elegir = (id: string) => { setParams({ b: id }); setQ(''); setErrores({}); setGuardado(null); };
  const guardar = (continuar = false) => {
    const dd = datos();
    const err = validarDerivacion(dd);
    if (Object.keys(err).length) { setErrores(err); return; }
    if (!continuar && revisarCasoActivo(estado, idB)?.caso) { setAdvertencia(true); return; }
    const r = ejecutar(e => registrarDerivacion(e, usuario!, dd, { continuarTrasAdvertencia: continuar }));
    setAdvertencia(false);
    if (!r.ok) { setErrores(r.errores); return; }
    setGuardado({ id: idB, nombre: b ? nombreCompleto(b) : '', asociada: r.dato!.asociadaACasoActivo });
    setD({ area: '', tipoIngreso: '', fecha: hoyISO(), origen: 'LLAMADO_SEMANAL', observacion: '' });
  };
  const caso = b && revisarCasoActivo(estado, b.id)?.caso;

  return (
    <section>
      <Encabezado titulo="Nueva derivación" subtitulo="Atención · Etapa 2: enviar a un NNA ingresado a una prestación" codigo="M01 · CU-01 Registrar derivación" />
      <Pasos pasos={['Buscar beneficiario', 'Prestación y tipo', 'Revisión de caso activo', 'Confirmación']} actual={guardado ? 4 : b ? 1 : 0} />
      {guardado && (
        <Aviso tipo="exito">
          Derivación registrada para <b>{guardado.nombre}</b>{guardado.asociada ? ' y asociada al caso activo existente' : ''}.{' '}
          <button type="button" className="enlace" onClick={() => nav(`/beneficiarios?b=${guardado.id}`)}>Ver ficha</button>
        </Aviso>
      )}
      {errores.permiso && <Aviso tipo="error">{errores.permiso}</Aviso>}

      <div className="buscador">
        <Texto label="Buscar beneficiario ingresado (nombre o RUT) *" value={q} onChange={v => { setQ(v); setErrores(e => ({ ...e, idBeneficiario: '' })); }} placeholder="Ej.: Camila o 12345678-5" error={!b ? errores.idBeneficiario : undefined} />
        {q.trim().length >= 2 && (
          <ul className="resultados" role="listbox" aria-label="Resultados de búsqueda">
            {resultados.length === 0 && <li className="sin-res">No hay beneficiarios ingresados con ese dato. {puede(usuario?.rol, 'POSTULACION_REGISTRAR') && <button type="button" className="enlace" onClick={() => nav('/postulaciones?nueva=1')}>Registrar una postulación</button>}</li>}
            {resultados.map(r => (
              <li key={r.id}><button type="button" role="option" aria-selected={r.id === idB} onClick={() => elegir(r.id)} disabled={estaDeBaja(r)}>
                <Avatar nombres={r.nombres} apellidos={r.apellidos} foto={r.foto} tam="sm" /> <b>{nombreCompleto(r)}</b> · {r.rut} · {r.comuna}{estaDeBaja(r) ? ' · con baja' : ''}
              </button></li>
            ))}
          </ul>
        )}
      </div>

      {b && (
        <form className="formulario" noValidate onSubmit={e => { e.preventDefault(); guardar(); }}>
          <div className="tarjeta-benef">
            <Avatar nombres={b.nombres} apellidos={b.apellidos} foto={b.foto} />
            <div>
              <b>{nombreCompleto(b)}</b> · RUT {b.rut} · {b.comuna}<br />
              <span className="tenue">Apoderado: {b.apoderado.nombre} · {b.apoderado.telefono}{caso ? ` · Caso activo desde ${fmtFecha(caso.fechaInicio)}` : ' · Sin caso activo'}</span>
            </div>
            <button type="button" className="enlace" onClick={() => setParams({})}>Cambiar</button>
          </div>
          <div className="grilla grilla-3">
            <Selector label="Prestación a la que se deriva *" value={d.area} onChange={set('area')} error={errores.area} placeholder="Seleccionar prestación"
              opciones={AREAS.map(a => ({ valor: a.codigo, texto: a.nombre }))} />
            <Selector label="Tipo de derivación *" value={d.tipoIngreso || sugerido} onChange={set('tipoIngreso')} error={errores.tipoIngreso}
              opciones={[{ valor: 'INGRESO', texto: 'Primera derivación (nuevo ciclo)' }, { valor: 'REINGRESO', texto: 'Reingreso (tuvo un ciclo cerrado)' }]} />
            <Texto label="Fecha *" type="date" value={d.fecha} onChange={set('fecha')} error={errores.fecha} max={hoyISO()} />
            <Selector label="Origen de la detección" value={d.origen} onChange={set('origen')}
              opciones={[{ valor: 'LLAMADO_SEMANAL', texto: 'Llamado semanal' }, { valor: 'SOLICITUD_APODERADO', texto: 'Solicitud del apoderado' }]} />
            <Texto label="Observación" value={d.observacion} onChange={set('observacion')} error={errores.observacion} placeholder="Ej.: niño postrado, requiere traslado" ancho="completo" />
          </div>
          <p className="sugerencia">Sugerido según RN-01: <b>{sugerido === 'INGRESO' ? 'Primera derivación' : 'Reingreso'}</b>{sugerido === 'REINGRESO' ? ' (tiene un ciclo anterior cerrado)' : ''}.</p>
          <div className="acciones">
            <Volver />
            <Boton type="submit">Guardar derivación</Boton>
          </div>
        </form>
      )}
      {!b && <div className="acciones"><Volver /></div>}

      {advertencia && b && caso && (
        <Modal titulo="Caso activo encontrado" onCerrar={() => setAdvertencia(false)} acciones={<>
          <Boton tipo="secundario" onClick={() => setAdvertencia(false)}>Cancelar</Boton>
          <Boton tipo="borde" onClick={() => nav(`/beneficiarios?b=${b.id}`)}>Ver caso existente</Boton>
          <Boton onClick={() => guardar(true)}>Asociar al caso activo</Boton>
        </>}>
          <p>Se encontró un caso activo que debes revisar:</p>
          <p><b>{nombreCompleto(b)} · {b.comuna} · Ciclo en curso desde {fmtFecha(caso.fechaInicio)} · {caso.atenciones.length} atención(es)</b></p>
          <p className="tenue">Si continúas, la derivación se asocia al caso activo sin crear otro (supuesto DP-02). La regla final de coincidencia está pendiente de validación.</p>
        </Modal>
      )}
    </section>
  );
}
