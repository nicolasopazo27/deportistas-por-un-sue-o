// Inicio: panel con indicadores y pendientes según el perfil (respuesta a «completar la pantalla faltante»
// y «revisar el diseño y la navegación», observaciones del mandante en el Certamen 1).
import { useNavigate } from 'react-router-dom';
import { useSistema } from '../../data/useSistema';
import { NOMBRE_ROL, casoActivo, estaDeBaja, fmtFecha, nombreCompleto, puede } from '../../domain/reglas';
import { Avatar, Boton, Etiqueta, Kpi, Pasos } from '../../components/ui';

export default function Inicio() {
  const { estado, usuario } = useSistema();
  const nav = useNavigate();
  const rol = usuario!.rol;
  const activos = estado.beneficiarios.filter(b => !estaDeBaja(b));
  const enAtencion = activos.filter(b => casoActivo(b));
  const sinDerivar = activos.filter(b => b.casos.length === 0);
  const alertas = estado.alertas.filter(a => a.estado === 'ACTIVA');
  const postulaciones = estado.postulaciones.filter(p => p.estado === 'ENVIADA' || p.estado === 'EN_EVALUACION');
  const urgentes = enAtencion.filter(b => (casoActivo(b)?.urgencias.length ?? 0) > 0);
  const nombre = (id: string) => { const b = estado.beneficiarios.find(x => x.id === id); return b ? nombreCompleto(b) : id; };
  const ultimos = estado.beneficiarios.flatMap(b => b.historial.map(h => ({ ...h, b }))).sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 6);
  const verFichas = puede(rol, 'FICHA_CONSULTAR');

  return (
    <section>
      <div className="encabezado">
        <h1>Hola, {usuario!.nombre.split(' ')[0]}</h1>
        <p className="subtitulo">Perfil {NOMBRE_ROL[rol]} · Resumen del día</p>
      </div>

      <Pasos pasos={['Postulación', 'Ingreso al programa', 'Derivación a prestación', 'Atenciones y seguimiento', 'Cierre de ciclo o baja']} actual={-1} />
      <p className="nota">Así avanza un NNA en la Fundación: primero <b>postula</b> e <b>ingresa</b> al programa; después se <b>deriva</b> a una prestación (dental, kine u otra) y se <b>atiende</b> hasta cerrar el ciclo.</p>

      <div className="kpis">
        {puede(rol, 'POSTULACION_REGISTRAR') && <Kpi titulo="Postulaciones en curso" valor={postulaciones.length} detalle="por evaluar" tono={postulaciones.length ? 'amarillo' : 'neutro'} onClick={() => nav('/postulaciones')} />}
        {verFichas && <Kpi titulo="Beneficiarios activos" valor={activos.length} detalle={`${sinDerivar.length} sin derivación`} onClick={() => nav('/beneficiarios')} />}
        {verFichas && <Kpi titulo="Casos en atención" valor={enAtencion.length} detalle={`${urgentes.length} urgente(s)`} tono={urgentes.length ? 'rojo' : 'neutro'} onClick={() => nav('/atenciones')} />}
        {puede(rol, 'ALERTA_CONSULTAR') && <Kpi titulo="Alertas activas" valor={alertas.length} detalle="sin novedades sobre el umbral" tono={alertas.length ? 'rojo' : 'verde'} onClick={() => nav('/alertas')} />}
      </div>

      <div className="columnas">
        <div className="panel">
          <h2>Pendientes</h2>
          {puede(rol, 'ALERTA_CONSULTAR') && alertas.map(a => (
            <div key={a.id} className="pendiente">
              <Etiqueta texto={a.tipo === 'DERIVACION_SIN_ATENCION' ? 'Derivación sin atención' : 'Caso sin actualizar'} tono="rojo" />
              <span>{nombre(a.idBeneficiario)} · {a.diasSinActualizacion} días</span>
              <button type="button" className="enlace" onClick={() => nav(`/atenciones?b=${a.idBeneficiario}`)}>Atender</button>
            </div>
          ))}
          {puede(rol, 'POSTULACION_REGISTRAR') && postulaciones.map(p => (
            <div key={p.id} className="pendiente">
              <Etiqueta texto={p.estado === 'ENVIADA' ? 'Postulación enviada' : 'En evaluación'} tono="amarillo" />
              <span>{p.nna.nombres} {p.nna.apellidos} · {fmtFecha(p.fecha)}</span>
              <button type="button" className="enlace" onClick={() => nav(`/postulaciones?p=${p.id}`)}>Revisar</button>
            </div>
          ))}
          {puede(rol, 'DERIVACION_REGISTRAR') && sinDerivar.map(b => (
            <div key={b.id} className="pendiente">
              <Etiqueta texto="Ingresado sin derivar" tono="gris" />
              <span>{nombreCompleto(b)}</span>
              <button type="button" className="enlace" onClick={() => nav(`/derivaciones?b=${b.id}`)}>Derivar</button>
            </div>
          ))}
          {!alertas.length && !postulaciones.length && !sinDerivar.length && <p className="tenue">No hay pendientes.</p>}
        </div>

        {verFichas && (
          <div className="panel">
            <h2>Actividad reciente</h2>
            {ultimos.map((h, i) => (
              <div key={i} className="actividad" onClick={() => nav(`/beneficiarios?b=${h.b.id}`)}>
                <Avatar nombres={h.b.nombres} apellidos={h.b.apellidos} foto={h.b.foto} tam="sm" />
                <div><b>{h.tipo}</b> · {nombreCompleto(h.b)}<br /><span className="tenue">{fmtFecha(h.fecha)} · {h.detalle.slice(0, 70)}</span></div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="acciones">
        {puede(rol, 'POSTULACION_REGISTRAR') && <Boton onClick={() => nav('/postulaciones?nueva=1')}>Nueva postulación</Boton>}
        {puede(rol, 'DERIVACION_REGISTRAR') && <Boton tipo="acento" onClick={() => nav('/derivaciones')}>Nueva derivación</Boton>}
        {puede(rol, 'ATENCION_REGISTRAR') && <Boton tipo="secundario" onClick={() => nav('/atenciones')}>Registrar atención</Boton>}
      </div>
    </section>
  );
}
