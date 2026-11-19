import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { SistemaProvider } from './data/SistemaContext';
import type { IRepositorioEstado } from './data/repositorio';
import Layout from './components/Layout';
import Ingreso from './modules/seguridad/Ingreso';
import NuevaDerivacion from './modules/derivaciones/NuevaDerivacion';
import Beneficiarios from './modules/beneficiarios/Beneficiarios';
import Atenciones from './modules/seguimiento/Atenciones';
import Alertas from './modules/seguimiento/Alertas';
import Bajas from './modules/bajas/Bajas';
import Ayudas from './modules/ayudas/Ayudas';
import Reportes from './modules/reportes/Reportes';
import Inicio from './modules/inicio/Inicio';
import Postulaciones from './modules/postulaciones/Postulaciones';
import Perfiles from './modules/perfiles/Perfiles';

export default function App({ repositorio }: { repositorio?: IRepositorioEstado }) {
  return (
    <SistemaProvider repositorio={repositorio}>
      <HashRouter>
        <Routes>
          <Route path="/ingreso" element={<Ingreso />} />
          <Route element={<Layout />}>
            <Route path="/inicio" element={<Inicio />} />
            <Route path="/postulaciones" element={<Postulaciones />} />
            <Route path="/perfiles" element={<Perfiles />} />
            <Route path="/derivaciones" element={<NuevaDerivacion />} />
            <Route path="/beneficiarios" element={<Beneficiarios />} />
            <Route path="/atenciones" element={<Atenciones />} />
            <Route path="/alertas" element={<Alertas />} />
            <Route path="/bajas" element={<Bajas />} />
            <Route path="/ayudas" element={<Ayudas />} />
            <Route path="/reportes" element={<Reportes />} />
          </Route>
          <Route path="*" element={<Navigate to="/inicio" replace />} />
        </Routes>
      </HashRouter>
    </SistemaProvider>
  );
}
