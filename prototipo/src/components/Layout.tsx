import { useState } from 'react';
import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
import { useSistema } from '../data/useSistema';
import { NOMBRE_ROL, puede } from '../domain/reglas';
import { leerNotificaciones } from '../data/servicios';
import type { Permiso } from '../domain/tipos';

const MENU: { ruta: string; texto: string; permiso?: Permiso }[] = [
  { ruta: '/derivaciones', texto: 'Derivaciones', permiso: 'DERIVACION_REGISTRAR' },
  { ruta: '/beneficiarios', texto: 'Beneficiarios', permiso: 'FICHA_CONSULTAR' },
  { ruta: '/atenciones', texto: 'Atenciones', permiso: 'FICHA_CONSULTAR' },
  { ruta: '/alertas', texto: 'Alertas', permiso: 'ALERTA_CONSULTAR' },
  { ruta: '/bajas', texto: 'Bajas', permiso: 'FICHA_CONSULTAR' },
  { ruta: '/ayudas', texto: 'Ayudas', permiso: 'FICHA_CONSULTAR' },
  { ruta: '/reportes', texto: 'Reportes', permiso: 'FICHA_CONSULTAR' },
];

export function Cabecera() {
  return (
    <header className="cabecera">
      <img src={`${import.meta.env.BASE_URL}logo-fundacion.png`} alt="Fundación Deportistas por un Sueño" className="logo" />
      <nav className="nav-publica" aria-label="Sitio de la Fundación">
        <span>Inicio</span><span>Nosotros</span><span>Programas</span><span>Contacto</span>
      </nav>
      <span className="boton boton-acento boton-gestion">Gestión interna</span>
    </header>
  );
}

export default function Layout() {
  const { usuario, estado, cerrarSesion, ejecutar } = useSistema();
  const loc = useLocation();
  const [verAvisos, setVerAvisos] = useState(false);
  // RNF-3: sin sesión no se muestra ningún dato; se redirige al inicio de sesión.
  if (!usuario) return <Navigate to="/ingreso" replace state={{ desde: loc.pathname }} />;
  const pendientes = estado.notificaciones.filter(n => n.rolDestino === usuario.rol && n.estado === 'PENDIENTE');
  const mias = estado.notificaciones.filter(n => n.rolDestino === usuario.rol).slice(-8).reverse();

  return (
    <div className="app">
      <Cabecera />
      <div className="cuerpo">
        <aside className="lateral">
          <p className="lateral-titulo">Panel de gestión</p>
          <nav aria-label="Módulos">
            {MENU.filter(m => !m.permiso || puede(usuario.rol, m.permiso)).map(m => (
              <NavLink key={m.ruta} to={m.ruta} className={({ isActive }) => isActive ? 'activo' : ''}>{m.texto}</NavLink>
            ))}
          </nav>
        </aside>
        <main className="contenido">
          <div className="barra-perfil">
            <button type="button" className="campana" aria-label={`Avisos: ${pendientes.length} sin leer`} onClick={() => setVerAvisos(v => !v)}>
              🔔{pendientes.length > 0 && <span className="globo">{pendientes.length}</span>}
            </button>
            <span>Perfil: <b>{NOMBRE_ROL[usuario.rol]}</b> · {usuario.nombre}</span>
            <button type="button" className="enlace" onClick={cerrarSesion}>Cerrar sesión</button>
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
