// M7 Reportes y exportaciones: ConsolidadorInformacion + GeneradorArchivo (XLSX).
// RNF-4: después de generar, se vuelve a leer el archivo y se comprueba que las filas coincidan con el origen.
import type { Beneficiario, EstadoSistema, Usuario } from '../../domain/tipos';
import { CAUSALES, fmtFecha, puede } from '../../domain/reglas';
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
    case 'EXPORT_EXCEL_GENERAL': return [{ titulo: 'Beneficiarios', columnas: ['Beneficiario', 'RUT', 'Comuna', 'Estado', ...apCols], filas: B.map(b => [nombre(b), b.rut, b.comuna, b.bajas.length ? 'Baja' : 'Activo', ...ap(b)]) }];
  }
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
