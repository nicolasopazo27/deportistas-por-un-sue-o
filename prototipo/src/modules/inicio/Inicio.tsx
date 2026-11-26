// Inicio: panel con indicadores y pendientes según el perfil (respuesta a «completar la pantalla faltante»
// y «revisar el diseño y la navegación», observaciones del mandante en el Certamen 1).
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Users, Stethoscope, TriangleAlert, UserPlus, UserMinus } from 'lucide-react';
import { calcularEstadisticas } from '../../data/estadisticas';
import { BarrasAgrupadas, BarrasHorizontales, Linea } from '../../components/Graficos';
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
  const [periodo, setPeriodo] = useState<3 | 5>(5);
  const est = useMemo(() => calcularEstadisticas(estado, undefined, periodo), [estado, periodo]);
  const anioAct = est.anios[est.anios.length - 1], anioAnt = est.anios[est.anios.length - 2];
  const categorias = est.anios.map(a => String(a.anio));
  const desde = categorias[0], hasta = categorias[categorias.length - 1];

  return (
    <section>
      <div className="encabezado">
        <h1>Hola, {usuario!.nombre.split(' ')[0]}</h1>
        <p className="subtitulo">Perfil {NOMBRE_ROL[rol]} · Resumen del día</p>
      </div>

      <Pasos pasos={['Postulación', 'Ingreso al programa', 'Derivación a prestación', 'Atenciones y seguimiento', 'Cierre de ciclo o baja']} actual={-1} />
      <p className="nota">Así avanza un NNA en la Fundación: primero <b>postula</b> e <b>ingresa</b> al programa; después se <b>deriva</b> a una prestación (dental, kine u otra) y se <b>atiende</b> hasta cerrar el ciclo.</p>

      <div className="kpis">
        {puede(rol, 'POSTULACION_EVALUAR') && <Kpi titulo="Postulaciones en curso" valor={postulaciones.length} detalle="por evaluar" tono="azul" icono={<ClipboardList size={18} />} onClick={() => nav('/postulaciones')} />}
        {verFichas && <Kpi titulo="Fichas activas en el sistema" valor={activos.length} detalle={`${sinDerivar.length} sin derivación`} tono="verde" icono={<Users size={18} />} onClick={() => nav('/beneficiarios')} />}
        {verFichas && <Kpi titulo="Casos en atención" valor={enAtencion.length} detalle={`${urgentes.length} urgente(s)`} tono="morado" icono={<Stethoscope size={18} />} onClick={puede(rol, 'ATENCION_REGISTRAR') || puede(rol, 'ALERTA_CONSULTAR') ? () => nav('/atenciones') : undefined} />}
        {puede(rol, 'ALERTA_CONSULTAR') && <Kpi titulo="Alertas activas" valor={alertas.length} detalle={alertas.length ? "casos sobre el umbral de días" : "todo al día"} tono={alertas.length ? 'rojo' : 'verde'} icono={<TriangleAlert size={18} />} onClick={() => nav('/alertas')} />}
        {verFichas && <Kpi titulo={`Ingresos ${anioAct.anio}`} valor={anioAct.ingresos} detalle={`${anioAnt.anio}: ${anioAnt.ingresos} en todo el año`} tono="amarillo" icono={<UserPlus size={18} />} />}
        {verFichas && <Kpi titulo={`Bajas ${anioAct.anio}`} valor={anioAct.bajas} detalle={`${anioAnt.anio}: ${anioAnt.bajas} en todo el año`} tono="neutro" icono={<UserMinus size={18} />} />}
      </div>

      {verFichas && (
        <div className="panel panel-graficos">
          <div className="graficos-cabecera">
            <h2>Indicadores {desde}–{hasta}</h2>
            <div className="segmentado" role="group" aria-label="Período de comparación">
              {([5, 3] as const).map(n => <button key={n} type="button" className={periodo === n ? 'activo' : ''} aria-pressed={periodo === n} onClick={() => setPeriodo(n)}>Últimos {n} años</button>)}
            </div>
          </div>
          <p className="nota">Comparación anual: consolidado de las planillas anteriores (datos ficticios de demostración) más lo registrado en el sistema. {hasta} considera el año en curso.</p>
          <div className="graficos">
            <BarrasAgrupadas titulo="Postulaciones, ingresos y bajas por año" subtitulo="NNA por año" categorias={categorias} series={[
              { nombre: 'Postulaciones', color: '#2a78d6', valores: est.anios.map(a => a.postulaciones) },
              { nombre: 'Ingresos', color: '#1baf7a', valores: est.anios.map(a => a.ingresos) },
              { nombre: 'Bajas', color: '#eb6834', valores: est.anios.map(a => a.bajas) },
            ]} />
            <Linea titulo="Beneficiarios activos al cierre de cada año" subtitulo={`NNA · planillas + sistema · ${hasta} a la fecha`} categorias={categorias}
              serie={{ nombre: 'Activos', color: '#2a78d6', valores: est.anios.map(a => a.activosCierre) }} />
            <BarrasHorizontales titulo="Bajas por causal" subtitulo={`total ${desde}–${hasta}`} columna="Causal" color="#eb6834" items={est.bajasPorCausal} />
            <BarrasHorizontales titulo="Derivaciones por prestación" subtitulo={`total ${desde}–${hasta}`} columna="Prestación" color="#2a78d6" items={est.derivacionesPorArea} />
          </div>
        </div>
      )}

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
          {puede(rol, 'POSTULACION_EVALUAR') && postulaciones.map(p => (
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
        {puede(rol, 'DERIVACION_REGISTRAR') && <Boton tipo="acento" onClick={() => nav('/derivaciones')}>Nueva derivación</Boton>}
        {puede(rol, 'ATENCION_REGISTRAR') && <Boton tipo="secundario" onClick={() => nav('/atenciones')}>Registrar atención</Boton>}
      </div>
    </section>
  );
}
