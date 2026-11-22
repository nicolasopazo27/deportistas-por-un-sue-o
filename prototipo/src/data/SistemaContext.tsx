import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import type { EstadoSistema, Usuario } from '../domain/tipos';
import { SistemaContext } from './contexto';
import { RepositorioLocalStorage, type IRepositorioEstado } from './repositorio';
import { revisarAlertas } from './servicios';
import { configurarPermisos } from '../domain/reglas';

const CLAVE_SESION = 'dpus-sesion';

function leerSesion(): Usuario | null {
  try { const s = window.sessionStorage.getItem(CLAVE_SESION); return s ? JSON.parse(s) : null; } catch { return null; }
}

export function SistemaProvider({ children, repositorio }: { children: ReactNode; repositorio?: IRepositorioEstado }) {
  const [repo] = useState<IRepositorioEstado>(() => repositorio ?? new RepositorioLocalStorage());
  const [inicial] = useState<EstadoSistema>(() => {
    const e = repo.cargar();
    configurarPermisos(e.permisos);
    // Planificador de tareas: al abrir el sistema se ejecuta la revisión periódica de alertas (RF-08).
    if (revisarAlertas(e) > 0) repo.guardar(e);
    return e;
  });
  const [estado, setEstado] = useState<EstadoSistema>(inicial);
  const [usuario, setUsuario] = useState<Usuario | null>(leerSesion);
  const actual = useRef<EstadoSistema>(inicial);

  const ejecutar = useCallback(<R extends { ok: boolean }>(op: (e: EstadoSistema) => R): R => {
    const copia = structuredClone(actual.current);
    const r = op(copia);
    if (r.ok) { repo.guardar(copia); actual.current = copia; setEstado(copia); }
    configurarPermisos(actual.current.permisos);
    return r;
  }, [repo]);
  const iniciarSesion = useCallback((u: Usuario) => {
    setUsuario(u);
    try { window.sessionStorage.setItem(CLAVE_SESION, JSON.stringify(u)); } catch { /* sin almacenamiento */ }
  }, []);
  const cerrarSesion = useCallback(() => {
    setUsuario(null);
    try { window.sessionStorage.removeItem(CLAVE_SESION); } catch { /* sin almacenamiento */ }
  }, []);
  const reiniciarDatos = useCallback(() => {
    const e = repo.reiniciar();
    configurarPermisos(e.permisos);
    revisarAlertas(e); repo.guardar(e); actual.current = e; setEstado(e);
  }, [repo]);

  const valor = useMemo(() => ({ estado, usuario, ejecutar, iniciarSesion, cerrarSesion, reiniciarDatos }), [estado, usuario, ejecutar, iniciarSesion, cerrarSesion, reiniciarDatos]);
  return <SistemaContext.Provider value={valor}>{children}</SistemaContext.Provider>;
}

