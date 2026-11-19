// Perfiles y permisos por rol (observación del mandante: «definir perfiles y permisos de acceso según los roles»).
// Matriz provisional (DP-07): debe validarse con la Dirección de la Fundación antes de usar datos reales.
import { Check, Minus } from 'lucide-react';
import { useSistema } from '../../data/useSistema';
import { DESCRIPCION_PERMISO, NOMBRE_ROL, PERMISOS } from '../../domain/reglas';
import type { Permiso, Rol } from '../../domain/tipos';
import { Aviso, Encabezado, Volver } from '../../components/ui';

const ROLES: Rol[] = ['TRABAJO_SOCIAL', 'COMUNICACION', 'TENS', 'PROFESIONAL', 'TUTOR', 'CONSULTA'];
const GRUPOS: { titulo: string; permisos: Permiso[] }[] = [
  { titulo: 'Ingreso al programa', permisos: ['POSTULACION_REGISTRAR', 'POSTULACION_EVALUAR'] },
  { titulo: 'Ficha del NNA', permisos: ['FICHA_CONSULTAR', 'FICHA_EDITAR', 'FOTO_EDITAR', 'SALUD_VER', 'SALUD_EDITAR', 'DATOS_SENSIBLES_VER', 'DATOS_SENSIBLES_EDITAR', 'OBSERVACION_REGISTRAR'] },
  { titulo: 'Atención y seguimiento', permisos: ['DERIVACION_REGISTRAR', 'ATENCION_REGISTRAR', 'CICLO_ACTUALIZAR', 'ALERTA_CONSULTAR', 'URGENCIA_MARCAR'] },
  { titulo: 'Gestión', permisos: ['BAJA_REGISTRAR', 'AYUDA_REGISTRAR', 'REPORTE_GENERAR', 'EXPORTAR_FICHA', 'PARAMETROS_EDITAR'] },
];

export default function Perfiles() {
  const { usuario } = useSistema();
  return (
    <section>
      <Encabezado titulo="Perfiles y permisos" subtitulo="Gestión · Quién puede hacer qué" codigo="M1 · Seguridad y acceso (RNF-3)" />
      <Aviso tipo="info">Su perfil actual es <b>{NOMBRE_ROL[usuario!.rol]}</b> (columna destacada). La matriz es provisional y debe validarse con la Dirección de la Fundación (DP-07).</Aviso>
      <table className="tabla tabla-permisos" aria-label="Matriz de permisos">
        <thead><tr><th>Permiso</th>{ROLES.map(r => <th key={r} className={r === usuario!.rol ? 'col-actual' : ''}>{NOMBRE_ROL[r]}</th>)}</tr></thead>
        <tbody>
          {GRUPOS.map(g => [
            <tr key={g.titulo} className="fila-grupo"><td colSpan={ROLES.length + 1}>{g.titulo}</td></tr>,
            ...g.permisos.map(p => (
              <tr key={p}>
                <td>{DESCRIPCION_PERMISO[p]}</td>
                {ROLES.map(r => <td key={r} className={`centro ${r === usuario!.rol ? 'col-actual' : ''}`}>{PERMISOS[r].includes(p) ? <Check size={16} aria-label="Sí" className="si" /> : <Minus size={16} aria-label="No" className="no" />}</td>)}
              </tr>
            )),
          ])}
        </tbody>
      </table>
      <div className="acciones"><Volver /></div>
    </section>
  );
}
