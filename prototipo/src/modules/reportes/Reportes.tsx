// M07 · CU-06 Generar reportes y exportaciones (RF-10, RF-11, RF-25, RF-34 · RNF-4, RNF-7 · CA-10, CA-11, CA-25, CA-29, CA-38)
// Dos versiones de cada Excel: completa (datos personales, solo perfiles autorizados) y anonimizada (ID de análisis, para terceros).
import { useState } from 'react';
import { useSistema } from '../../data/useSistema';
import { registrarReporte } from '../../data/servicios';
import { fmtFecha, hoyISO, puede } from '../../domain/reglas';
import { Aviso, Boton, Encabezado, Selector, Texto, Volver } from '../../components/ui';
import { consolidar, consolidarAnonimo, descargar, generarXlsx, type Tabla, type TipoSalida } from './exportar';

const SALIDAS: { valor: TipoSalida; texto: string }[] = [
  { valor: 'INFORME_MENSUAL', texto: 'Informe mensual de gestión' },
  { valor: 'REPORTE_BAJAS', texto: 'Bajas por causal (provisional)' },
  { valor: 'AYUDAS_URGENCIAS', texto: 'Ayudas entregadas y urgencias' },
  { valor: 'EXPORT_EXCEL_GENERAL', texto: 'Excel general de beneficiarios' },
];
const primerDiaMes = () => hoyISO().slice(0, 8) + '01';

export default function Reportes() {
  const { estado, usuario, ejecutar } = useSistema();
  const [tipo, setTipo] = useState<TipoSalida | ''>('');
  const [desde, setDesde] = useState(primerDiaMes());
  const [hasta, setHasta] = useState(hoyISO());
  const [apoderado, setApoderado] = useState(false);
  const [version, setVersion] = useState<'COMPLETA' | 'ANONIMIZADA' | ''>('');
  const [vista, setVista] = useState<Tabla[] | null>(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const puedeReporte = puede(usuario?.rol, 'REPORTE_GENERAR');
  const puedeExportar = puede(usuario?.rol, 'EXPORTAR_FICHA');
  // Por defecto: completa para perfiles autorizados; anonimizada para el resto.
  const ver = version || (puedeExportar ? 'COMPLETA' : 'ANONIMIZADA');
  const anonima = ver === 'ANONIMIZADA';
  const tablasDe = () => anonima ? consolidarAnonimo(estado, tipo as TipoSalida, desde, hasta) : consolidar(estado, tipo as TipoSalida, desde, hasta, apoderado);

  const validar = (): boolean => {
    setMsg('');
    if (!puedeReporte) { setErr('Su perfil no tiene permiso para generar reportes.'); return false; }
    if (!tipo) { setErr('Seleccione el tipo de salida.'); return false; }
    if (!desde || !hasta || desde > hasta) { setErr('Período inválido: la fecha de inicio debe ser anterior o igual a la de término.'); setVista(null); return false; }
    if (!anonima && !puedeExportar) { setErr('Su perfil no puede descargar la versión completa con datos personales. Use la versión anonimizada.'); return false; }
    if (!anonima && apoderado && !puedeExportar) { setErr('Su perfil no puede exportar datos del apoderado.'); return false; }
    setErr(''); return true;
  };
  const previa = () => { if (validar()) setVista(tablasDe()); };
  const bajar = async () => {
    if (!validar()) return;
    const tablas = tablasDe();
    const total = tablas.filter(t => t.titulo !== 'Diccionario').reduce((s, t) => s + t.filas.length, 0);
    const conAp = !anonima && apoderado;
    try {
      const { buffer, filasVerificadas } = await generarXlsx(tablas);
      ejecutar(e => { registrarReporte(e, usuario!, { tipo, formato: 'XLSX', desde, hasta, incluyeApoderado: conAp, anonimizado: anonima, totalRegistros: filasVerificadas, resultado: total ? 'GENERADO' : 'VACIO' }); return { ok: true }; });
      descargar(buffer, `${tipo.toLowerCase()}_${desde}_${hasta}${anonima ? '_anonimizado' : ''}.xlsx`);
      setMsg(`${anonima ? 'Excel anonimizado' : 'Excel completo'} generado: ${filasVerificadas} filas verificadas contra los registros de origen. La descarga quedó registrada.`);
    } catch (e) {
      ejecutar(x => { registrarReporte(x, usuario!, { tipo, formato: 'XLSX', desde, hasta, incluyeApoderado: conAp, anonimizado: anonima, totalRegistros: 0, resultado: 'FALLIDO' }); return { ok: true }; });
      setErr(`No se entregó el archivo: ${(e as Error).message}`);
    }
  };

  return (
    <section>
      <Encabezado titulo="Reportes y exportaciones" subtitulo="Reportes · Área interna" codigo="M07 · CU-06 Generar reportes y exportaciones" />
      {!puedeReporte && <Aviso tipo="alerta">Su perfil no tiene permiso para generar reportes ni exportaciones.</Aviso>}
      <div className="grilla grilla-3">
        <Selector label="Tipo de salida *" value={tipo} onChange={v => { setTipo(v as TipoSalida); setVista(null); }} opciones={SALIDAS} placeholder="Seleccionar salida" disabled={!puedeReporte} />
        <Texto label="Desde *" type="date" value={desde} onChange={setDesde} disabled={!puedeReporte} />
        <Texto label="Hasta *" type="date" value={hasta} onChange={setHasta} disabled={!puedeReporte} />
      </div>
      <fieldset className="version-excel" disabled={!puedeReporte}>
        <legend>Versión del archivo</legend>
        <label className={`opcion-version${!anonima ? ' activa' : ''}`}>
          <input type="radio" name="version" checked={!anonima} onChange={() => { setVersion('COMPLETA'); setVista(null); }} disabled={!puedeExportar} />
          <span><strong>Completa (datos personales)</strong><small>Nombres, RUT y demás datos para uso interno. Solo perfiles autorizados.{!puedeExportar && ' Su perfil no tiene este permiso.'}</small></span>
        </label>
        <label className={`opcion-version${anonima ? ' activa' : ''}`}>
          <input type="radio" name="version" checked={anonima} onChange={() => { setVersion('ANONIMIZADA'); setApoderado(false); setVista(null); }} />
          <span><strong>Anonimizada (para terceros)</strong><small>Cada beneficiario se identifica con un ID de análisis (BEN-0001…). Sin nombres, RUT, contacto, salud ni texto libre; fechas por mes. Incluye hoja «Diccionario».</small></span>
        </label>
      </fieldset>
      {tipo === 'EXPORT_EXCEL_GENERAL' && !anonima && (
        <label className="casilla"><input type="checkbox" checked={apoderado} onChange={e => setApoderado(e.target.checked)} disabled={!puedeExportar} /> Incluir datos de identificación del apoderado (solo perfiles autorizados)</label>
      )}
      <h3>Condicionados a formato oficial</h3>
      <table className="tabla"><tbody><tr><td>Reporte ministerial definitivo de bajas</td><td>Pendiente de plantilla oficial (DP-05)</td></tr></tbody></table>
      {err && <Aviso tipo="error">{err}</Aviso>}
      {msg && <Aviso tipo="exito">{msg}</Aviso>}
      <Aviso tipo="error">La versión completa contiene datos personales: solo perfiles autorizados y uso interno. Para enviar datos a terceros use la versión anonimizada. Cada descarga queda registrada.</Aviso>
      <div className="acciones">
        <Volver />
        <Boton tipo="acento" onClick={previa} disabled={!puedeReporte}>Generar vista previa</Boton>
        <Boton onClick={bajar} disabled={!puedeReporte}>Descargar Excel</Boton>
      </div>
      {vista && vista.map(t => (
        <div key={t.titulo}>
          <h3>{t.titulo} ({t.filas.length})</h3>
          <table className="tabla" aria-label={`Vista previa ${t.titulo}`}>
            <thead><tr>{t.columnas.map(c => <th key={c}>{c}</th>)}</tr></thead>
            <tbody>{t.filas.length === 0 ? <tr><td colSpan={t.columnas.length} className="vacio">Sin registros en el período.</td></tr> : t.filas.map((f, i) => <tr key={i}>{f.map((v, j) => <td key={j}>{v}</td>)}</tr>)}</tbody>
          </table>
        </div>
      ))}
      {estado.reportes.length > 0 && <>
        <h3>Registro de descargas</h3>
        <table className="tabla" aria-label="Registro de descargas">
          <thead><tr><th>Fecha</th><th>Salida</th><th>Período</th><th>Filas</th><th>Versión</th><th>Apoderado</th><th>Resultado</th><th>Usuario</th></tr></thead>
          <tbody>{estado.reportes.slice().reverse().map(r => <tr key={r.id}><td>{fmtFecha(r.fecha)}</td><td>{r.tipo}</td><td>{r.desde ? `${fmtFecha(r.desde)}–${fmtFecha(r.hasta)}` : '—'}</td><td>{r.totalRegistros}</td><td>{r.anonimizado ? 'Anonimizada' : 'Completa'}</td><td>{r.incluyeApoderado ? 'Sí' : 'No'}</td><td>{r.resultado}</td><td>{r.usuario}</td></tr>)}</tbody>
        </table>
      </>}
    </section>
  );
}
