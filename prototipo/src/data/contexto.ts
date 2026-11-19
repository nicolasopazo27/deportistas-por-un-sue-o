import { createContext } from 'react';
import type { EstadoSistema, Usuario } from '../domain/tipos';

export interface Ctx {
  estado: EstadoSistema;
  usuario: Usuario | null;
  /** Ejecuta una operación sobre una copia del estado; si devuelve ok, se persiste. */
  ejecutar: <R extends { ok: boolean }>(op: (e: EstadoSistema) => R) => R;
  iniciarSesion: (u: Usuario) => void;
  cerrarSesion: () => void;
  reiniciarDatos: () => void;
}
export const SistemaContext = createContext<Ctx | null>(null);
