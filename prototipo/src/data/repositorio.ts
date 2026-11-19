// Patrón Repository (decisión de diseño de M4): los servicios dependen de esta interfaz y no
// conocen dónde se guardan los datos. En el prototipo la implementación usa localStorage;
// en la etapa con backend se reemplaza por una implementación sobre la API/PostgreSQL 16.
import type { EstadoSistema } from '../domain/tipos';
import { crearDatosIniciales } from './seed';

export interface IRepositorioEstado {
  cargar(): EstadoSistema;
  guardar(estado: EstadoSistema): void;
  reiniciar(): EstadoSistema;
}

export const CLAVE_ALMACENAMIENTO = 'dpus-gestion-v1';
export const VERSION_DATOS = 1;

export class RepositorioLocalStorage implements IRepositorioEstado {
  private almacen: Storage;
  constructor(almacen: Storage = window.localStorage) { this.almacen = almacen; }
  cargar(): EstadoSistema {
    try {
      const raw = this.almacen.getItem(CLAVE_ALMACENAMIENTO);
      if (raw) {
        const e = JSON.parse(raw) as EstadoSistema;
        if (e.version === VERSION_DATOS && Array.isArray(e.beneficiarios)) return e;
      }
    } catch { /* datos dañados: se reinicia */ }
    return this.reiniciar();
  }
  guardar(estado: EstadoSistema): void {
    try { this.almacen.setItem(CLAVE_ALMACENAMIENTO, JSON.stringify(estado)); } catch { /* almacenamiento no disponible */ }
  }
  reiniciar(): EstadoSistema {
    const e = crearDatosIniciales();
    this.guardar(e);
    return e;
  }
}

// Implementación en memoria: usada por las pruebas automatizadas.
export class RepositorioMemoria implements IRepositorioEstado {
  private estado: EstadoSistema | null = null;
  cargar() { return this.estado ?? this.reiniciar(); }
  guardar(e: EstadoSistema) { this.estado = structuredClone(e); }
  reiniciar() { this.estado = crearDatosIniciales(); return structuredClone(this.estado); }
}
