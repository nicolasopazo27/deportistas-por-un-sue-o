// Perfiles y permisos por rol (observación del mandante: «definir perfiles y permisos de acceso según los roles»).
// El Administrador (pedido en la revisión final) puede ajustar los permisos de los demás perfiles.
// Matriz provisional (DP-07): debe validarse con la Dirección de la Fundación antes de usar datos reales.
import { useState } from 'react';
import { Check, Minus } from 'lucide-react';
import { useSistema } from '../../data/useSistema';
import { cambiarPermiso, restablecerPermisos } from '../../data/servicios';
import { DESCRIPCION_PERMISO, NOMBRE_ROL, ROLES_EDITABLES, permisosDe, puede } from '../../domain/reglas';
import type { Permiso, Rol } from '../../domain/tipos';
import { Aviso, Boton, Encabezado, Volver } from '../../components/ui';

const ROLES: Rol[] = ['ADMIN', ...ROLES_EDITABLES];
const GRUPOS: { titulo: string; permisos: Permiso[] }[] = [
  { titulo: 'Ingreso al programa', permisos: ['POSTULACION_EVALUAR'] },
  { titulo: 'Ficha del NNA', permisos: ['FICHA_CONSULTAR', 'FICHA_EDITAR', 'FOTO_EDITAR', 'SALUD_VER', 'SALUD_EDITAR', 'DATOS_SENSIBLES_VER', 'DATOS_SENSIBLES_EDITAR', 'OBSERVACION_REGISTRAR'] },
  { titulo: 'Atención y seguimiento', permisos: ['DERIVACION_REGISTRAR', 'ATENCION_REGISTRAR', 'CICLO_ACTUALIZAR', 'ALERTA_CONSULTAR', 'URGENCIA_MARCAR'] },
  { titulo: 'Gestión', permisos: ['BAJA_REGISTRAR', 'AYUDA_REGISTRAR', 'REPORTE_GENERAR', 'EXPORTAR_FICHA', 'PARAMETROS_EDITAR', 'PERMISOS_EDITAR'] },
];

export default function Perfiles() {
  const { estado, usuario, ejecutar } = useSistema();
  const [msg, setMsg] = useState('');
  const editable = puede(usuario!.rol, 'PERMISOS_EDITAR');
  const ajustada = !!estado.permisos && Object.keys(estado.permisos).length > 0;

  const alternar = (r: Rol, p: Permiso, activo: boolean) => {
    const res = ejecutar(e => cambiarPermiso(e, usuario!, r, p, activo));
    setMsg(res.ok ? `${NOMBRE_ROL[r]}: «${DESCRIPCION_PERMISO[p]}» ${activo ? 'habilitado' : 'quitado'}.` : Object.values(res.errores)[0]);
  };
  const restablecer = () => {
    const res = ejecutar(e => restablecerPermisos(e, usuario!));
    setMsg(res.ok ? 'Se restableció la matriz de permisos original.' : Object.values(res.errores)[0]);
  };

  return (
    <section>
      <Encabezado titulo="Perfiles y permisos" subtitulo="Gestión · Quién puede hacer qué" codigo="M1 · Seguridad y acceso (RNF-3)" />
      <Aviso tipo="info">
        Su perfil actual es <b>{NOMBRE_ROL[usuario!.rol]}</b> (columna destacada).{' '}
        {editable
          ? 'Como Administrador puede marcar o desmarcar los permisos de los demás perfiles; el cambio se aplica de inmediato.'
          : 'Solo el Administrador puede modificar esta matriz.'}{' '}
        La matriz es provisional y debe validarse con la Dirección de la Fundación (DP-07).
      </Aviso>
      {msg && <Aviso tipo="exito">{msg}</Aviso>}
      <table className="tabla tabla-permisos" aria-label="Matriz de permisos">
        <thead><tr><th>Permiso</th>{ROLES.map(r => <th key={r} className={r === usuario!.rol ? 'col-actual' : ''}>{NOMBRE_ROL[r]}</th>)}</tr></thead>
        <tbody>
          {GRUPOS.map(g => [
            <tr key={g.titulo} className="fila-grupo"><td colSpan={ROLES.length + 1}>{g.titulo}</td></tr>,
            ...g.permisos.map(p => (
              <tr key={p}>
                <td>{DESCRIPCION_PERMISO[p]}</td>
                {ROLES.map(r => {
                  const tiene = permisosDe(r).includes(p);
                  return (
                    <td key={r} className={`centro ${r === usuario!.rol ? 'col-actual' : ''}`}>
                      {editable && r !== 'ADMIN'
                        ? <input type="checkbox" checked={tiene} onChange={ev => alternar(r, p, ev.target.checked)} aria-label={`${NOMBRE_ROL[r]}: ${DESCRIPCION_PERMISO[p]}`} />
                        : tiene ? <Check size={16} aria-label="Sí" className="si" /> : <Minus size={16} aria-label="No" className="no" />}
                    </td>
                  );
                })}
              </tr>
            )),
          ])}
        </tbody>
      </table>
      <div className="acciones">
        <Volver />
        {editable && <Boton tipo="secundario" onClick={restablecer} disabled={!ajustada}>Restablecer permisos originales</Boton>}
      </div>
    </section>
  );
}
