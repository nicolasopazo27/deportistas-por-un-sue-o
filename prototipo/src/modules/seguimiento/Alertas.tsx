// M04 · CU-03 Alertas de seguimiento (RF-08 · CA-08). AlertaService con umbral T configurable (DP-04).
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSistema } from '../../data/useSistema';
import { cambiarUmbral, marcarAlertaRevisada, revisarAlertas } from '../../data/servicios';
import { fmtFecha, puede } from '../../domain/reglas';
import { Aviso, Boton, Encabezado, Etiqueta, Selector, Texto, Volver } from '../../components/ui';

const TONO = { ACTIVA: 'rojo', REVISADA: 'amarillo', RESUELTA: 'verde' } as const;
const TEXTO = { ACTIVA: 'Activa', REVISADA: 'Revisada', RESUELTA: 'Resuelta' } as const;

export default function Alertas() {
  const { estado, usuario, ejecutar } = useSistema();
  const nav = useNavigate();
  const [filtro, setFiltro] = useState('');
  const [aplicado, setAplicado] = useState('');
  const [umbral, setUmbral] = useState(String(estado.parametros.umbralDiasAlerta));
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const lista = estado.alertas.filter(a => !aplicado || a.estado === aplicado).slice().reverse();
  const nombre = (id: string) => { const b = estado.beneficiarios.find(x => x.id === id); return b ? `${b.nombres} ${b.apellidos}` : id; };
  const ultima = (id: string, idCaso: string) => estado.beneficiarios.find(x => x.id === id)?.casos.find(c => c.id === idCaso)?.ultimaActualizacion;

  return (
    <section>
      <Encabezado titulo="Alertas de seguimiento" subtitulo="Seguimiento · Área interna" codigo="M04 · CU-03 Gestionar atención y seguimiento" />
      <Aviso tipo="alerta">Umbral de ensayo: <b>{estado.parametros.umbralDiasAlerta} días</b> sin actualización. El umbral, la periodicidad y el canal definitivos están pendientes de validación con el mandante (DP-04).</Aviso>
      {msg && <Aviso tipo="exito">{msg}</Aviso>}
      {err && <Aviso tipo="error">{err}</Aviso>}
      <table className="tabla" aria-label="Alertas">
        <thead><tr><th>Beneficiario</th><th>Última actualización</th><th>Tiempo sin actualizar</th><th>Estado alerta</th><th>Acción</th></tr></thead>
        <tbody>
          {lista.length === 0 && <tr><td colSpan={5} className="vacio">No hay alertas para el filtro seleccionado.</td></tr>}
          {lista.map(a => (
            <tr key={a.id}>
              <td>{nombre(a.idBeneficiario)}</td><td>{fmtFecha(ultima(a.idBeneficiario, a.idCaso))}</td>
              <td>{a.diasSinActualizacion} días</td><td><Etiqueta texto={TEXTO[a.estado]} tono={TONO[a.estado]} /></td>
              <td className="celda-acciones">
                <button type="button" className="enlace" onClick={() => nav(`/atenciones?b=${a.idBeneficiario}`)}>Abrir caso</button>
                {a.estado === 'ACTIVA' && <Boton onClick={() => {
                  const r = ejecutar(e => marcarAlertaRevisada(e, usuario!, a.id));
                  if (r.ok) { setMsg(`Alerta de ${nombre(a.idBeneficiario)} marcada como revisada.`); setErr(''); } else setErr(Object.values(r.errores)[0]);
                }}>Revisar</Boton>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <form className="filtros" onSubmit={e => { e.preventDefault(); setAplicado(filtro); }}>
        <Selector label="Estado" value={filtro} onChange={setFiltro} placeholder="Todas" opciones={[{ valor: 'ACTIVA', texto: 'Activas' }, { valor: 'REVISADA', texto: 'Revisadas' }, { valor: 'RESUELTA', texto: 'Resueltas' }]} />
        <Boton tipo="acento" type="submit">Filtrar</Boton>
      </form>
      <div className="acciones">
        <Volver />
        <Boton tipo="borde" onClick={() => { let n = 0; ejecutar(e => { n = revisarAlertas(e); return { ok: true }; }); setMsg(n ? `Revisión ejecutada: ${n} alerta(s) nueva(s).` : 'Revisión ejecutada: no hay casos nuevos sobre el umbral.'); }}>Ejecutar revisión ahora</Boton>
      </div>
      {puede(usuario?.rol, 'PARAMETROS_EDITAR') && (
        <form className="filtros" onSubmit={e => { e.preventDefault(); const r = ejecutar(x => cambiarUmbral(x, usuario!, Number(umbral))); if (r.ok) { setMsg('Umbral actualizado.'); setErr(''); } else setErr(Object.values(r.errores)[0]); }}>
          <Texto label="Umbral T (días, valor de ensayo)" type="number" value={umbral} onChange={setUmbral} />
          <Boton tipo="secundario" type="submit">Guardar umbral</Boton>
        </form>
      )}
    </section>
  );
}
