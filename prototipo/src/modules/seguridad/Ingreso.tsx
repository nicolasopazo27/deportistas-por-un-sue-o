// M1 Seguridad y acceso: inicio de sesión con usuarios FICTICIOS.
// En el prototipo la verificación ocurre en el navegador; la autenticación real con servidor
// (contraseñas con hash y permisos verificados en backend) corresponde a la etapa siguiente.
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarCheck, Compass, Megaphone, Users } from 'lucide-react';
import { useSistema } from '../../data/useSistema';
import { Cabecera } from '../../components/Layout';
import { Aviso, Boton, Selector, Texto } from '../../components/ui';
import { NOMBRE_ROL } from '../../domain/reglas';
import { CLAVE_DEMO, USUARIOS_DEMO } from './usuarios';



const INICIO: Record<string, string> = {};

export default function Ingreso() {
  const { iniciarSesion, reiniciarDatos } = useSistema();
  const nav = useNavigate();
  const loc = useLocation() as { state?: { desde?: string } };
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [reiniciado, setReiniciado] = useState(false);

  const entrar = () => {
    const u = USUARIOS_DEMO.find(x => x.email === email);
    if (!u || clave !== CLAVE_DEMO) { setError('Usuario o contraseña incorrectos.'); return; }
    iniciarSesion(u);
    nav(loc.state?.desde && loc.state.desde !== '/' ? loc.state.desde : INICIO[u.rol] ?? '/inicio', { replace: true });
  };

  return (
    <div className="app">
      <Cabecera />
      <main className="ingreso ingreso-v2">
        <section className="bienvenida" aria-label="Fundación Deportistas por un Sueño">
          <Ilustracion />
          <div className="bienvenida-texto">
            <h1>Fundación Deportistas<br />por un Sueño</h1>
            <span className="subrayado" aria-hidden="true" />
            <p>Bienvenidos a la Fundación Deportistas por un Sueño, una organización que apoya a beneficiarios y deportistas a través de la orientación, la generación de oportunidades y el apoyo social, para impulsar su desarrollo deportivo y personal.</p>
            <ul className="beneficios">
              <li><span className="icono-beneficio"><Users size={20} /></span><div><b>Apoyo a beneficiarios</b><span>Impulsamos el acceso a recursos y beneficios que favorecen su desarrollo.</span></div></li>
              <li><span className="icono-beneficio"><CalendarCheck size={20} /></span><div><b>Seguimiento de postulaciones</b><span>Acompañamos cada etapa del proceso, con información clara y oportuna.</span></div></li>
              <li><span className="icono-beneficio"><Compass size={20} /></span><div><b>Acompañamiento y orientación</b><span>Brindamos guía y apoyo permanente a beneficiarios y deportistas para alcanzar sus objetivos.</span></div></li>
            </ul>
          </div>
          <div className="cta-postula">
            <Megaphone size={30} className="cta-icono" aria-hidden="true" />
            <div><b>Postula a nuestros programas</b><span>Cualquier persona puede acceder y realizar su postulación en línea.</span></div>
            <div className="cta-acciones">
              <Link to="/postular" className="boton boton-primario cta-boton">Ir a postulación pública <ArrowRight size={16} /></Link>
              <Link to="/seguimiento" className="cta-seguimiento">¿Ya postulaste? Revisa el estado</Link>
            </div>
          </div>
        </section>

        <div className="tarjeta-ingreso">
          <h2>Gestión interna</h2>
          <p className="subtitulo">Registro, gestión y trazabilidad de la atención del beneficiario</p>
          <form onSubmit={e => { e.preventDefault(); entrar(); }}>
            <Selector label="Usuario" value={email} onChange={v => { setEmail(v); setError(''); }} placeholder="Seleccione su usuario"
              opciones={USUARIOS_DEMO.map(u => ({ valor: u.email, texto: `${u.nombre} · ${NOMBRE_ROL[u.rol]}` }))} />
            <Texto label="Contraseña" type="password" value={clave} onChange={v => { setClave(v); setError(''); }} />
            {error && <Aviso tipo="error">{error}</Aviso>}
            <div className="acciones"><Boton type="submit">Ingresar</Boton></div>
          </form>
          <Aviso tipo="info">Entorno de demostración con datos ficticios. Contraseña de los usuarios de prueba: <b>{CLAVE_DEMO}</b>.</Aviso>
          <p className="tenue">
            <button type="button" className="enlace" onClick={() => { reiniciarDatos(); setReiniciado(true); }}>Restablecer datos de demostración</button>
            {reiniciado && ' · Datos restablecidos.'}
          </p>
        </div>
      </main>
    </div>
  );
}

/** Ilustración propia (siluetas de deportistas al atardecer) para la bienvenida. */
function Ilustracion() {
  return (
    <svg className="ilustracion" viewBox="0 0 320 260" aria-hidden="true">
      <defs>
        <radialGradient id="sol" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#ffe9d6" /><stop offset=".55" stopColor="#fcd3c4" stopOpacity=".7" /><stop offset="1" stopColor="#fbe3e3" stopOpacity="0" /></radialGradient>
        <linearGradient id="silueta" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e2525b" /><stop offset="1" stopColor="#ef8a8f" /></linearGradient>
        <linearGradient id="cerro" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f2a9ad" /><stop offset=".55" stopColor="#f8cfd1" /><stop offset="1" stopColor="#fdf1f1" stopOpacity="0" /></linearGradient>
        <linearGradient id="cerro2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f4b8bb" /><stop offset="1" stopColor="#fdf1f1" stopOpacity="0" /></linearGradient>
      </defs>
      <circle cx="190" cy="175" r="95" fill="url(#sol)" />
      <path d="M0,232 C60,205 110,215 160,200 C210,186 250,176 320,188 L320,260 L0,260 Z" fill="url(#cerro)" opacity=".75" />
      <path d="M40,260 C100,236 150,228 200,214 C240,203 285,210 320,222 L320,260 Z" fill="url(#cerro2)" opacity=".7" />
      <g fill="url(#silueta)" stroke="url(#silueta)" strokeLinecap="round" strokeLinejoin="round">
        {/* Deportista celebrando en la cima */}
        <circle cx="200" cy="62" r="12" stroke="none" />
        <path d="M185,79 Q200,74 215,79 L209,134 L191,134 Z" stroke="none" />
        <path d="M189,84 L170,58 L162,28" fill="none" strokeWidth="10" />
        <path d="M211,84 L230,58 L240,28" fill="none" strokeWidth="10" />
        <path d="M195,130 L188,168 L184,200" fill="none" strokeWidth="12.5" />
        <path d="M205,130 L212,168 L218,200" fill="none" strokeWidth="12.5" />
        {/* Corredora */}
        <circle cx="96" cy="128" r="8.5" stroke="none" />
        <path d="M102,124 C112,120 116,126 110,132" fill="none" strokeWidth="4" />
        <path d="M92,140 L101,140 L98,170 L88,170 Z" stroke="none" transform="rotate(10 95 155)" />
        <path d="M93,144 L80,156 L86,168" fill="none" strokeWidth="7" />
        <path d="M100,144 L112,156 L122,150" fill="none" strokeWidth="7" />
        <path d="M95,170 L84,190 L72,198" fill="none" strokeWidth="8.5" />
        <path d="M98,170 L110,188 L106,212" fill="none" strokeWidth="8.5" />
        {/* Deportista con pelota */}
        <circle cx="270" cy="108" r="10.5" stroke="none" />
        <path d="M258,124 L282,124 L279,170 L261,170 Z" stroke="none" />
        <path d="M260,128 L250,150 L254,170" fill="none" strokeWidth="8" />
        <path d="M280,128 L292,148 L294,160" fill="none" strokeWidth="8" />
        <path d="M265,170 L262,200 L260,228" fill="none" strokeWidth="10" />
        <path d="M276,170 L280,200 L284,228" fill="none" strokeWidth="10" />
      </g>
      <circle cx="298" cy="168" r="11" fill="#e2525b" />
      <path d="M288,164 Q298,172 308,164 M298,157 L298,179" stroke="#fbe3e4" strokeWidth="1.5" fill="none" />
    </svg>
  );
}
