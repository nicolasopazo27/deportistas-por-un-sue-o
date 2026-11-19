// M07 · CU-06 Generar reportes y exportaciones (RF-10, RF-11, RF-25 · RNF-4 · CA-10, CA-11, CA-25, CA-29)
import { useState } from 'react';
import { useSistema } from '../../data/useSistema';
import { registrarReporte } from '../../data/servicios';
import { fmtFecha, hoyISO, puede } from '../../domain/reglas';
import { Aviso, Boton, Encabezado, Selector, Texto, Volver } from '../../components/ui';
import { consolidar, descargar, generarXlsx, type Tabla, type TipoSalida } from './exportar';

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
  const [vista, setVista] = useState<Tabla[] | null>(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const puedeReporte = puede(usuario?.rol, 'REPORTE_GENERAR');
  const puedeExportar = puede(usuario?.rol, 'EXPORTAR_FICHA');

  const validar = (): boolean => {
    setMsg('');
    if (!puedeReporte) { setErr('Su perfil no tiene permiso para generar reportes.'); return false; }
    if (!tipo) { setErr('Seleccione el tipo de salida.'); return false; }
    if (!desde || !hasta || desde > hasta) { setErr('Período inválido: la fecha de inicio debe ser anterior o igual a la de término.'); setVista(null); return false; }
    if (apoderado && !puedeExportar) { setErr('Su perfil no puede exportar datos del apoderado.'); return false; }
    setErr(''); return true;
  };
  const previa = () => { if (validar()) setVista(consolidar(estado, tipo as TipoSalida, desde, hasta, apoderado)); };
  const bajar = async () => {
    if (!validar()) return;
    const tablas = consolidar(estado, tipo as TipoSalida, desde, hasta, apoderado);
    const total = tablas.reduce((s, t) => s + t.filas.length, 0);
    try {
      const { buffer, filasVerificadas } = await generarXlsx(tablas);
      ejecutar(e => { registrarReporte(e, usuario!, { tipo, formato: 'XLSX', desde, hasta, incluyeApoderado: apoderado, totalRegistros: filasVerificadas, resultado: total ? 'GENERADO' : 'VACIO' }); return { ok: true }; });
      descargar(buffer, `${tipo.toLowerCase()}_${desde}_${hasta}.xlsx`);
      setMsg(`Archivo generado: ${filasVerificadas} filas verificadas contra los registros de origen. La descarga quedó registrada.`);
    } catch (e) {
      ejecutar(x => { registrarReporte(x, usuario!, { tipo, formato: 'XLSX', desde, hasta, incluyeApoderado: apoderado, totalRegistros: 0, resultado: 'FALLIDO' }); return { ok: true }; });
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
      {tipo === 'EXPORT_EXCEL_GENERAL' && (
        <label className="casilla"><input type="checkbox" checked={apoderado} onChange={e => setApoderado(e.target.checked)} disabled={!puedeExportar} /> Incluir datos de identificación del apoderado (solo perfiles autorizados)</label>
      )}
      <h3>Condicionados a formato oficial</h3>
      <table className="tabla"><tbody><tr><td>Reporte ministerial definitivo de bajas</td><td>Pendiente de plantilla oficial (DP-05)</td></tr></tbody></table>
      {err && <Aviso tipo="error">{err}</Aviso>}
      {msg && <Aviso tipo="exito">{msg}</Aviso>}
      <Aviso tipo="error">Exportar: solo perfiles autorizados. Cada descarga queda registrada.</Aviso>
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
          <thead><tr><th>Fecha</th><th>Salida</th><th>Período</th><th>Filas</th><th>Apoderado</th><th>Resultado</th><th>Usuario</th></tr></thead>
          <tbody>{estado.reportes.slice().reverse().map(r => <tr key={r.id}><td>{fmtFecha(r.fecha)}</td><td>{r.tipo}</td><td>{r.desde ? `${fmtFecha(r.desde)}–${fmtFecha(r.hasta)}` : '—'}</td><td>{r.totalRegistros}</td><td>{r.incluyeApoderado ? 'Sí' : 'No'}</td><td>{r.resultado}</td><td>{r.usuario}</td></tr>)}</tbody>
        </table>
      </>}
    </section>
  );
}
