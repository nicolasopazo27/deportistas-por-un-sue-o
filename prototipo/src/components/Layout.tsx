import { useState } from 'react';
import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
import { Bell, ClipboardList, FileBarChart, HandHeart, Home, LogOut, Send, ShieldCheck, Stethoscope, TriangleAlert, UserMinus, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useSistema } from '../data/useSistema';
import { NOMBRE_ROL, puede } from '../domain/reglas';
import { leerNotificaciones } from '../data/servicios';
import type { Permiso } from '../domain/tipos';

interface ItemMenu { ruta: string; texto: string; icono: LucideIcon; permiso?: Permiso; cuenta?: number }

export function Cabecera() {
  return (
    <header className="cabecera">
      <img src={`${import.meta.env.BASE_URL}logo-fundacion.png`} alt="Fundación Deportistas por un Sueño" className="logo" />
      <span className="titulo-sistema">Gestión interna · Atención de beneficiarios</span>
    </header>
  );
}

export default function Layout() {
  const { usuario, estado, cerrarSesion, ejecutar } = useSistema();
  const loc = useLocation();
  const [verAvisos, setVerAvisos] = useState(false);
  // RNF-3: sin sesión no se muestra ningún dato; se redirige al inicio de sesión.
  if (!usuario) return <Navigate to="/ingreso" replace state={{ desde: loc.pathname + loc.search }} />;
  const pendientes = estado.notificaciones.filter(n => n.rolDestino === usuario.rol && n.estado === 'PENDIENTE');
  const mias = estado.notificaciones.filter(n => n.rolDestino === usuario.rol).slice(-10).reverse();
  const alertasActivas = estado.alertas.filter(a => a.estado === 'ACTIVA').length;
  const postPend = estado.postulaciones.filter(p => p.estado === 'ENVIADA' || p.estado === 'EN_EVALUACION').length;

  const grupos: { titulo: string; items: ItemMenu[] }[] = [
    { titulo: '', items: [{ ruta: '/inicio', texto: 'Inicio', icono: Home }] },
    { titulo: '1 · Ingreso al programa', items: [{ ruta: '/postulaciones', texto: 'Postulaciones', icono: ClipboardList, permiso: 'POSTULACION_REGISTRAR', cuenta: puede(usuario.rol, 'POSTULACION_EVALUAR') ? postPend : undefined }] },
    { titulo: '2 · Atención', items: [
      { ruta: '/derivaciones', texto: 'Derivaciones', icono: Send, permiso: 'DERIVACION_REGISTRAR' },
      { ruta: '/atenciones', texto: 'Atenciones', icono: Stethoscope, permiso: 'FICHA_CONSULTAR' },
      { ruta: '/alertas', texto: 'Alertas', icono: TriangleAlert, permiso: 'ALERTA_CONSULTAR', cuenta: alertasActivas },
    ] },
    { titulo: '3 · Beneficiarios', items: [
      { ruta: '/beneficiarios', texto: 'Fichas', icono: Users, permiso: 'FICHA_CONSULTAR' },
      { ruta: '/ayudas', texto: 'Ayudas y urgencias', icono: HandHeart, permiso: 'FICHA_CONSULTAR' },
      { ruta: '/bajas', texto: 'Bajas', icono: UserMinus, permiso: 'FICHA_CONSULTAR' },
    ] },
    { titulo: '4 · Gestión', items: [
      { ruta: '/reportes', texto: 'Reportes', icono: FileBarChart, permiso: 'FICHA_CONSULTAR' },
      { ruta: '/perfiles', texto: 'Perfiles y permisos', icono: ShieldCheck },
    ] },
  ];

  return (
    <div className="app">
      <Cabecera />
      <div className="cuerpo">
        <aside className="lateral">
          <div className="usuario-lateral">
            <span className="avatar avatar-sm avatar-ini">{usuario.nombre.split(' ').map(p => p[0]).join('').slice(0, 2)}</span>
            <div><b>{usuario.nombre}</b><span>{NOMBRE_ROL[usuario.rol]}</span></div>
          </div>
          <nav aria-label="Módulos">
            {grupos.map(g => {
              const visibles = g.items.filter(m => !m.permiso || puede(usuario.rol, m.permiso));
              if (!visibles.length) return null;
              return (
                <div key={g.titulo || 'inicio'} className="grupo-menu">
                  {g.titulo && <p className="grupo-titulo">{g.titulo}</p>}
                  {visibles.map(m => (
                    <NavLink key={m.ruta} to={m.ruta} className={({ isActive }) => isActive ? 'activo' : ''}>
                      <m.icono size={17} aria-hidden="true" /><span>{m.texto}</span>
                      {!!m.cuenta && <span className="globo-menu">{m.cuenta}</span>}
                    </NavLink>
                  ))}
                </div>
              );
            })}
          </nav>
          <button type="button" className="salir" onClick={cerrarSesion}><LogOut size={16} aria-hidden="true" /> Cerrar sesión</button>
        </aside>
        <main className="contenido">
          <div className="barra-perfil">
            <button type="button" className="campana" aria-label={`Avisos: ${pendientes.length} sin leer`} onClick={() => setVerAvisos(v => !v)}>
              <Bell size={20} aria-hidden="true" />{pendientes.length > 0 && <span className="globo">{pendientes.length}</span>}
            </button>
          </div>
          {verAvisos && (
            <div className="panel-avisos" role="region" aria-label="Avisos">
              <div className="panel-avisos-cab"><b>Avisos en plataforma</b>
                {pendientes.length > 0 && <button type="button" className="enlace" onClick={() => ejecutar(e => { leerNotificaciones(e, usuario); return { ok: true }; })}>Marcar como leídos</button>}
              </div>
              {mias.length === 0 ? <p className="tenue">Sin avisos.</p> : mias.map(n => (
                <p key={n.id} className={n.estado === 'PENDIENTE' ? 'aviso-nuevo' : ''}>{n.mensaje}</p>
              ))}
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
