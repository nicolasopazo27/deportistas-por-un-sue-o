// M1 Seguridad y acceso: inicio de sesión con usuarios FICTICIOS.
// En el prototipo la verificación ocurre en el navegador; la autenticación real con servidor
// (contraseñas con hash y permisos verificados en backend) corresponde a la etapa siguiente.
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSistema } from '../../data/useSistema';
import { Cabecera } from '../../components/Layout';
import { Aviso, Boton, Selector, Texto } from '../../components/ui';
import { NOMBRE_ROL } from '../../domain/reglas';
import { CLAVE_DEMO, USUARIOS_DEMO } from './usuarios';



const INICIO: Record<string, string> = { TUTOR: '/postulaciones' };

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
      <main className="ingreso">
        <div className="tarjeta-ingreso">
          <h1>Gestión interna</h1>
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
