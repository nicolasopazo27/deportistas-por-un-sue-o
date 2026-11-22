// Estadísticas comparativas para el Inicio (pedido de la profesora en la revisión final):
// cuántos NNA postulan, ingresan y se dan de baja por año, cuántos siguen activos y cómo se reparten bajas y derivaciones.
// Suma el consolidado histórico (planillas anteriores, ficticio) con lo registrado en el sistema.
import { AREAS, CAUSALES } from '../domain/reglas';
import type { Area, CausalBaja, EstadoSistema } from '../domain/tipos';

export interface FilaAnual { anio: number; postulaciones: number; ingresos: number; bajas: number; atenciones: number; activosCierre: number }
export interface Estadisticas {
  anios: FilaAnual[];
  bajasPorCausal: { codigo: CausalBaja; nombre: string; total: number }[];
  derivacionesPorArea: { codigo: Area; nombre: string; total: number }[];
  /** Beneficiarios activos al 1 de enero del primer año mostrado (dato de partida ficticio). */
  activosIniciales: number;
}

export const ACTIVOS_INICIO_HISTORICO = 150;
const anioDe = (iso: string) => Number(iso.slice(0, 4));

export function calcularEstadisticas(e: EstadoSistema, hoy: Date = new Date(), cantidadAnios = 5): Estadisticas {
  const anioActual = hoy.getFullYear();
  const desde = anioActual - cantidadAnios + 1;
  const anios: FilaAnual[] = [];
  const causal: Record<CausalBaja, number> = { EGRESO: 0, DESVINCULACION: 0, FALLECIMIENTO: 0 };
  const area: Record<Area, number> = { DENTAL: 0, KINESIOLOGIA: 0, OTRA: 0 };

  // Activos al inicio del período: partida histórica + ingresos − bajas de años anteriores al rango.
  let activos = ACTIVOS_INICIO_HISTORICO;
  for (const h of e.historico.filter(x => x.anio < desde)) activos += h.ingresos - Object.values(h.bajas).reduce((s, n) => s + n, 0);
  const activosIniciales = activos;

  for (let anio = desde; anio <= anioActual; anio++) {
    const h = e.historico.find(x => x.anio === anio);
    const fila: FilaAnual = { anio, postulaciones: h?.postulaciones ?? 0, ingresos: h?.ingresos ?? 0, bajas: 0, atenciones: h?.atenciones ?? 0, activosCierre: 0 };
    if (h) {
      for (const c of Object.keys(h.bajas) as CausalBaja[]) { fila.bajas += h.bajas[c]; causal[c] += h.bajas[c]; }
      for (const a of Object.keys(h.derivaciones) as Area[]) area[a] += h.derivaciones[a];
    }
    // Registros del sistema en ese año.
    fila.postulaciones += e.postulaciones.filter(p => anioDe(p.fecha) === anio).length;
    for (const b of e.beneficiarios) {
      if (anioDe(b.fechaRegistro) === anio) fila.ingresos++;
      for (const x of b.bajas) if (anioDe(x.fecha) === anio) { fila.bajas++; causal[x.causal]++; }
      for (const c of b.casos) {
        for (const d of c.derivaciones) if (anioDe(d.fecha) === anio) area[d.area]++;
        fila.atenciones += c.atenciones.filter(a => anioDe(a.fecha) === anio).length;
      }
    }
    activos += fila.ingresos - fila.bajas;
    fila.activosCierre = activos;
    anios.push(fila);
  }
  return {
    anios, activosIniciales,
    bajasPorCausal: CAUSALES.map(c => ({ codigo: c.codigo as CausalBaja, nombre: c.nombre, total: causal[c.codigo as CausalBaja] })).sort((a, b) => b.total - a.total),
    derivacionesPorArea: AREAS.map(a => ({ codigo: a.codigo as Area, nombre: a.nombre, total: area[a.codigo as Area] })).sort((a, b) => b.total - a.total),
  };
}
