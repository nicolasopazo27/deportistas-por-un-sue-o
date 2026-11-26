// Ficha imprimible / PDF (revisión final): vista limpia de la ficha para imprimir o "Guardar como PDF"
// desde el navegador. Respeta los permisos: requiere EXPORTAR_FICHA y oculta salud o datos sensibles si no corresponde.
import { useEffect, useState } from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import { useSistema } from '../../data/useSistema';
import { registrarReporte } from '../../data/servicios';
import { AREAS, NOMBRE_ROL, casoActivo, edad, estadoTexto, fmtFecha, nombreCompleto, puede, sesionesRealizadas } from '../../domain/reglas';
import { LineaTiempo } from '../../components/LineaTiempo';
import { Boton } from '../../components/ui';

const area = (c: string) => AREAS.find(a => a.codigo === c)?.nombre ?? c;

export default function FichaImprimible() {
  const { estado, usuario, ejecutar } = useSistema();
  const loc = useLocation();
  const [params] = useSearchParams();
  const b = estado.beneficiarios.find(x => x.id === params.get('b'));
  const permitido = !!usuario && puede(usuario.rol, 'EXPORTAR_FICHA');
  const [generada] = useState(() => new Date().toLocaleString('es-CL'));

  useEffect(() => {
    if (!b || !permitido) return;
    document.title = `Ficha ${nombreCompleto(b)} · Fundación Deportistas por un Sueño`;
    // Registro de la salida de datos (RF-25), igual que la exportación a Excel.
    ejecutar(e => { registrarReporte(e, usuario!, { tipo: 'FICHA', formato: 'PDF', idBeneficiario: b.id, incluyeApoderado: true, totalRegistros: 1, resultado: 'GENERADO' }); return { ok: true }; });
  }, [b?.id, permitido]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!usuario) return <Navigate to="/ingreso" replace state={{ desde: loc.pathname + loc.search }} />;
  if (!permitido) return <main className="impresion"><p role="alert">Su perfil no tiene permiso para imprimir o exportar fichas.</p></main>;
  if (!b) return <main className="impresion"><p role="alert">No se encontró la ficha solicitada.</p></main>;

  const verSalud = puede(usuario.rol, 'SALUD_VER'), verSens = puede(usuario.rol, 'DATOS_SENSIBLES_VER');
  const c = casoActivo(b) ?? b.casos.at(-1);
  const atenciones = b.casos.flatMap(k => k.atenciones).sort((x, y) => y.fecha.localeCompare(x.fecha));
  const est = estadoTexto(b);

  return (
    <main className="impresion" aria-label={`Ficha imprimible de ${nombreCompleto(b)}`}>
      <div className="no-imprimir barra-impresion">
        <span>Vista para imprimir. En el diálogo elige «Guardar como PDF» para obtener el archivo.</span>
        <Boton onClick={() => window.print()}><Printer size={16} /> Imprimir / Guardar PDF</Boton>
      </div>
      <header className="imp-cabecera">
        <img src={`${import.meta.env.BASE_URL}logo-fundacion.png`} alt="Fundación Deportistas por un Sueño" />
        <div><h1>Ficha del beneficiario</h1><span>Generada el {generada} por {usuario.nombre} ({NOMBRE_ROL[usuario.rol]}) · Documento interno, datos ficticios de demostración</span></div>
      </header>

      <section className="imp-identidad">
        {b.foto ? <img src={b.foto} alt="" className="imp-foto" /> : null}
        <div>
          <h2>{nombreCompleto(b)}</h2>
          <p>{verSens ? `RUT ${b.rut} · ` : ''}{b.fechaNacimiento ? `${edad(b.fechaNacimiento)} · ` : ''}{b.comuna} · Estado: <b>{est.texto}</b></p>
        </div>
      </section>

      <section className="imp-grilla">
        <div><h3>Apoderado/a</h3><p>{b.apoderado.nombre}<br />{verSens ? b.apoderado.telefono : 'Contacto restringido'}<br />Previsión: {b.apoderado.prevision ?? 'Sin registrar'}</p></div>
        <div><h3>Caso actual</h3>{c ? <p>{area(c.derivaciones.at(-1)!.area)} · desde {fmtFecha(c.fechaInicio)}<br />Sesiones realizadas: {sesionesRealizadas(c)}<br />{c.fechaCierreCiclo ? `Ciclo terminado el ${fmtFecha(c.fechaCierreCiclo)}` : 'Ciclo en curso'}</p> : <p>Sin derivaciones.</p>}</div>
        <div><h3>Antecedentes de salud</h3>{verSalud ? <p>Patologías: {b.enfermedades.map(e => e.nombre).join(', ') || '—'}<br />Centros: {b.centrosSalud.join(', ') || '—'}<br />Credencial: {b.credencial.tiene ? `${b.credencial.numero} (${b.credencial.porcentaje ?? '—'} %)` : 'No'}<br />Electrodependiente: {b.electrodependiente ? 'Sí' : 'No'}{b.hospitalizaciones.length ? <><br />Hospitalizaciones: {b.hospitalizaciones.length}</> : null}</p> : <p>Restringido para su perfil.</p>}</div>
      </section>

      <h3>Atenciones</h3>
      {atenciones.length ? (
        <table className="tabla imp-tabla"><thead><tr><th>Fecha</th><th>Prestación</th><th>Profesional</th><th>Resultado</th><th>Observación</th></tr></thead>
          <tbody>{atenciones.map(a => <tr key={a.id}><td>{fmtFecha(a.fecha)}</td><td>{a.prestacion}</td><td>{a.profesional}</td><td>{a.resultado === 'REALIZADA' ? `Sesión ${a.numeroSesion}` : `No realizada · ${a.motivo ?? ''}`}</td><td>{a.observacion ?? '—'}</td></tr>)}</tbody></table>
      ) : <p>Sin atenciones registradas.</p>}

      {b.observaciones.length > 0 && <><h3>Observaciones</h3><ul>{b.observaciones.map(o => <li key={o.id}>{fmtFecha(o.fechaHora)} · {o.autor}: {o.texto}</li>)}</ul></>}

      <h3>Historial</h3>
      <LineaTiempo eventos={b.historial} />
    </main>
  );
}
