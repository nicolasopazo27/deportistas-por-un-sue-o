// M7 Reportes y exportaciones: ConsolidadorInformacion + GeneradorArchivo (XLSX).
// RNF-4: después de generar, se vuelve a leer el archivo y se comprueba que las filas coincidan con el origen.
import type { Beneficiario, EstadoSistema, Usuario } from '../../domain/tipos';
import { CAUSALES, fmtFecha, hoyISO, puede } from '../../domain/reglas';
import { registrarReporte } from '../../data/servicios';

export type TipoSalida = 'INFORME_MENSUAL' | 'REPORTE_BAJAS' | 'AYUDAS_URGENCIAS' | 'EXPORT_EXCEL_GENERAL';
export interface Tabla { titulo: string; columnas: string[]; filas: (string | number)[][] }

const enPeriodo = (iso: string, desde: string, hasta: string) => iso.slice(0, 10) >= desde && iso.slice(0, 10) <= hasta;
const nombre = (b: Beneficiario) => `${b.nombres} ${b.apellidos}`;

export function consolidar(e: EstadoSistema, tipo: TipoSalida, desde: string, hasta: string, incluirApoderado: boolean): Tabla[] {
  const B = e.beneficiarios;
  const ap = (b: Beneficiario) => incluirApoderado ? [b.apoderado.nombre, b.apoderado.rut ?? '', b.apoderado.telefono] : [];
  const apCols = incluirApoderado ? ['Apoderado', 'RUT apoderado', 'Contacto apoderado'] : [];
  const der = { titulo: 'Derivaciones', columnas: ['Fecha', 'Beneficiario', 'RUT', 'Comuna', 'Tipo', 'Área'], filas: B.flatMap(b => b.casos.flatMap(c => c.derivaciones.filter(d => enPeriodo(d.fecha, desde, hasta)).map(d => [fmtFecha(d.fecha), nombre(b), b.rut, b.comuna, d.tipoIngreso === 'INGRESO' ? 'Ingreso' : 'Reingreso', d.area]))) };
  const ate = { titulo: 'Atenciones', columnas: ['Fecha', 'Beneficiario', 'Prestación', 'Profesional', 'Sesión', 'Resultado', 'Motivo'], filas: B.flatMap(b => b.casos.flatMap(c => c.atenciones.filter(a => enPeriodo(a.fecha, desde, hasta)).map(a => [fmtFecha(a.fecha), nombre(b), a.prestacion, a.profesional, a.numeroSesion ?? '', a.resultado === 'REALIZADA' ? 'Realizada' : 'No realizada', a.motivo ?? '']))) };
  const baj = { titulo: 'Bajas', columnas: ['Fecha', 'Beneficiario', 'RUT', 'Comuna', 'Causal', 'Observación'], filas: B.flatMap(b => b.bajas.filter(x => enPeriodo(x.fecha, desde, hasta)).map(x => [fmtFecha(x.fecha), nombre(b), b.rut, b.comuna, CAUSALES.find(c => c.codigo === x.causal)?.nombre ?? x.causal, x.observacion ?? ''])) };
  const ayu = { titulo: 'Ayudas entregadas', columnas: ['Fecha', 'Beneficiario', 'Tipo', 'N.º guía'], filas: B.flatMap(b => b.ayudas.filter(x => enPeriodo(x.fecha, desde, hasta)).map(x => [fmtFecha(x.fecha), nombre(b), x.tipo, x.numeroGuia])) };
  const urg = { titulo: 'Urgencias', columnas: ['Fecha', 'Beneficiario', 'Motivo'], filas: B.flatMap(b => b.casos.flatMap(c => c.urgencias.filter(u => enPeriodo(u.fecha, desde, hasta)).map(u => [fmtFecha(u.fecha), nombre(b), u.motivo ?? '']))) };
  const pos = { titulo: 'Postulaciones', columnas: ['Fecha', 'NNA', 'RUT', 'Comuna', 'Estado', 'Tutor'], filas: e.postulaciones.filter(p => enPeriodo(p.fecha, desde, hasta)).map(p => [fmtFecha(p.fecha), `${p.nna.nombres} ${p.nna.apellidos}`, p.nna.rut, p.nna.comuna, p.estado, p.tutor]) };
  switch (tipo) {
    case 'INFORME_MENSUAL': return [pos, der, ate, baj, ayu];
    case 'REPORTE_BAJAS': return [baj];
    case 'AYUDAS_URGENCIAS': return [ayu, urg];
    case 'EXPORT_EXCEL_GENERAL': { const ids = idsAnalisis(e); return [{ titulo: 'Beneficiarios', columnas: ['Beneficiario', 'RUT', 'Comuna', 'Estado', 'ID análisis', ...apCols], filas: B.map(b => [nombre(b), b.rut, b.comuna, b.bajas.length ? 'Baja' : 'Activo', ids.get(b.id)!, ...ap(b)]) }]; }
  }
}

// ---------- Versión anonimizada (para compartir con terceros: análisis, universidades, financistas) ----------
// Reemplaza nombre y RUT por un ID de análisis, generaliza fechas a mes y edad a tramo, y quita texto libre,
// nombres de profesionales, números de guía, datos del apoderado y antecedentes de salud.
// La correspondencia ID ↔ beneficiario solo aparece en el Excel completo (perfiles autorizados).

/** ID de análisis estable: orden de registro del beneficiario (no deriva del RUT ni del nombre). */
export function idsAnalisis(e: EstadoSistema): Map<string, string> {
  const orden = [...e.beneficiarios].sort((a, b) => (a.fechaRegistro + a.id).localeCompare(b.fechaRegistro + b.id));
  return new Map(orden.map((b, i) => [b.id, `BEN-${String(i + 1).padStart(4, '0')}`]));
}
const mes = (iso: string) => iso.slice(0, 7);
export function tramoEdad(fechaNac?: string, hoy = hoyISO()): string {
  if (!fechaNac) return 'Sin dato';
  const anios = Number(hoy.slice(0, 4)) - Number(fechaNac.slice(0, 4)) - (hoy.slice(5) < fechaNac.slice(5) ? 1 : 0);
  return anios < 6 ? '0 a 5' : anios < 12 ? '6 a 11' : anios < 18 ? '12 a 17' : '18 o más';
}
const DICCIONARIO: Tabla = {
  titulo: 'Diccionario',
  columnas: ['Columna', 'Descripción'],
  filas: [
    ['ID análisis', 'Identificador del beneficiario para análisis (BEN-0001…). No contiene ni deriva de nombre o RUT; es el mismo en todas las hojas y exportaciones.'],
    ['ID postulación', 'Identificador correlativo de la postulación en este archivo (POS-0001…).'],
    ['Mes', 'Año y mes del registro (AAAA-MM); no se entrega el día.'],
    ['Tramo de edad', 'Edad agrupada: 0 a 5, 6 a 11, 12 a 17, 18 o más.'],
    ['Datos excluidos', 'Nombres, RUT, fecha de nacimiento, apoderado y contacto, foto, profesional que atendió, observaciones y texto libre, N.º de guía, salud y situación documental.'],
    ['Uso', 'Archivo anonimizado para análisis estadístico. No intentar reidentificar a las personas ni cruzarlo con otras fuentes.'],
  ],
};

export function consolidarAnonimo(e: EstadoSistema, tipo: TipoSalida, desde: string, hasta: string): Tabla[] {
  const B = e.beneficiarios, ids = idsAnalisis(e), id = (b: { id: string }) => ids.get(b.id)!;
  const der: Tabla = { titulo: 'Derivaciones', columnas: ['Mes', 'ID análisis', 'Comuna', 'Tipo', 'Área'], filas: B.flatMap(b => b.casos.flatMap(c => c.derivaciones.filter(d => enPeriodo(d.fecha, desde, hasta)).map(d => [mes(d.fecha), id(b), b.comuna, d.tipoIngreso === 'INGRESO' ? 'Ingreso' : 'Reingreso', d.area]))) };
  const ate: Tabla = { titulo: 'Atenciones', columnas: ['Mes', 'ID análisis', 'Prestación', 'Sesión', 'Resultado', 'Motivo'], filas: B.flatMap(b => b.casos.flatMap(c => c.atenciones.filter(a => enPeriodo(a.fecha, desde, hasta)).map(a => [mes(a.fecha), id(b), a.prestacion, a.numeroSesion ?? '', a.resultado === 'REALIZADA' ? 'Realizada' : 'No realizada', a.motivo ?? '']))) };
  const baj: Tabla = { titulo: 'Bajas', columnas: ['Mes', 'ID análisis', 'Comuna', 'Causal'], filas: B.flatMap(b => b.bajas.filter(x => enPeriodo(x.fecha, desde, hasta)).map(x => [mes(x.fecha), id(b), b.comuna, CAUSALES.find(c => c.codigo === x.causal)?.nombre ?? x.causal])) };
  const ayu: Tabla = { titulo: 'Ayudas entregadas', columnas: ['Mes', 'ID análisis', 'Tipo'], filas: B.flatMap(b => b.ayudas.filter(x => enPeriodo(x.fecha, desde, hasta)).map(x => [mes(x.fecha), id(b), x.tipo])) };
  const urg: Tabla = { titulo: 'Urgencias', columnas: ['Mes', 'ID análisis'], filas: B.flatMap(b => b.casos.flatMap(c => c.urgencias.filter(u => enPeriodo(u.fecha, desde, hasta)).map(u => [mes(u.fecha), id(b)]))) };
  const pos: Tabla = { titulo: 'Postulaciones', columnas: ['Mes', 'ID postulación', 'Comuna', 'Tramo de edad', 'Estado', 'Canal'], filas: e.postulaciones.filter(p => enPeriodo(p.fecha, desde, hasta)).map((p, i) => [mes(p.fecha), `POS-${String(i + 1).padStart(4, '0')}`, p.nna.comuna, tramoEdad(p.nna.fechaNacimiento), p.estado, p.origen === 'WEB' ? 'Formulario web' : 'Interno']) };
  const ben: Tabla = { titulo: 'Beneficiarios', columnas: ['ID análisis', 'Año de ingreso', 'Comuna', 'Tramo de edad', 'Estado', 'Derivaciones', 'Atenciones realizadas', 'Atenciones no realizadas', 'Ayudas', 'Causal de baja'],
    filas: [...B].sort((a, b) => id(a).localeCompare(id(b))).map(b => {
      const at = b.casos.flatMap(c => c.atenciones);
      const baja = b.bajas.at(-1);
      return [id(b), b.fechaRegistro.slice(0, 4), b.comuna, tramoEdad(b.fechaNacimiento), baja ? 'Baja' : 'Activo', b.casos.reduce((s, c) => s + c.derivaciones.length, 0),
        at.filter(a => a.resultado === 'REALIZADA').length, at.filter(a => a.resultado !== 'REALIZADA').length, b.ayudas.length,
        baja ? CAUSALES.find(c => c.codigo === baja.causal)?.nombre ?? baja.causal : ''];
    }) };
  const tablas = tipo === 'INFORME_MENSUAL' ? [pos, der, ate, baj, ayu] : tipo === 'REPORTE_BAJAS' ? [baj] : tipo === 'AYUDAS_URGENCIAS' ? [ayu, urg] : [ben];
  return [...tablas, DICCIONARIO];
}

export async function generarXlsx(tablas: Tabla[]): Promise<{ buffer: ArrayBuffer; filasVerificadas: number }> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Sistema de gestión · Fundación Deportistas por un Sueño';
  for (const t of tablas) {
    const ws = wb.addWorksheet(t.titulo.slice(0, 31));
    ws.addRow(t.columnas).font = { bold: true };
    t.filas.forEach(f => ws.addRow(f));
    ws.columns.forEach(c => { c.width = 22; });
  }
  const buffer = (await wb.xlsx.writeBuffer()) as ArrayBuffer;
  // Verificación de integridad (RNF-4 / CA-29): se relee el archivo generado.
  const control = new ExcelJS.Workbook();
  await control.xlsx.load(buffer);
  let filasVerificadas = 0;
  for (const t of tablas) {
    const ws = control.getWorksheet(t.titulo.slice(0, 31))!;
    const filas = ws.actualRowCount - 1;
    if (filas !== t.filas.length) throw new Error(`Las filas de «${t.titulo}» no coinciden con el origen.`);
    t.filas.forEach((f, i) => {
      const fila = ws.getRow(i + 2).values as unknown[];
      if (String(fila[2] ?? '') !== String(f[1] ?? '')) throw new Error('Caracteres alterados en la exportación.');
    });
    filasVerificadas += filas;
  }
  return { buffer, filasVerificadas };
}

export function descargar(buffer: ArrayBuffer, nombreArchivo: string) {
  if (typeof URL.createObjectURL !== 'function') return; // entorno de pruebas
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = nombreArchivo; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

type Ejecutar = <R extends { ok: boolean }>(op: (e: EstadoSistema) => R) => R;

export async function exportarFicha(b: Beneficiario, u: Usuario, ejecutar: Ejecutar) {
  if (!puede(u.rol, 'EXPORTAR_FICHA')) throw new Error('Sin permiso de exportación.');
  const tablas: Tabla[] = [
    { titulo: 'Ficha', columnas: ['Campo', 'Valor'], filas: [['Beneficiario', nombre(b)], ['RUT', b.rut], ['Comuna', b.comuna], ['Apoderado', b.apoderado.nombre], ['RUT apoderado', b.apoderado.rut ?? ''], ['Contacto apoderado', b.apoderado.telefono], ['Previsión apoderado', b.apoderado.prevision ?? '']] },
    { titulo: 'Historial', columnas: ['Fecha', 'Tipo', 'Detalle', 'Autor'], filas: b.historial.map(h => [fmtFecha(h.fecha), h.tipo, h.detalle, h.autor]) },
  ];
  const { buffer, filasVerificadas } = await generarXlsx(tablas);
  ejecutar(e => { registrarReporte(e, u, { tipo: 'EXPORT_FICHA', formato: 'XLSX', idBeneficiario: b.id, incluyeApoderado: true, totalRegistros: filasVerificadas, resultado: 'GENERADO' }); return { ok: true }; });
  descargar(buffer, `ficha_${b.rut}.xlsx`);
}
