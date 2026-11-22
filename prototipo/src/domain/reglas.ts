// Reglas de negocio y validaciones (RN-01 a RN-06). Las entidades guardan sus propias reglas;
// los servicios solo orquestan (decisión transversal del diseño de clases).
import type { Atencion, Beneficiario, CasoAtencion, Permiso, Rol } from './tipos';

// ---------- Catálogos provisionales (DP-08) ----------
export const COMUNAS = ['Santiago', 'Maipú', 'Puente Alto', 'La Florida', 'Peñalolén', 'Recoleta', 'San Bernardo'];
export const ENFERMEDADES = ['Oncológica', 'Renal', 'Neurológica', 'Cardiopatía', 'Respiratoria', 'Por completar'];
export const PREVISIONES = ['FONASA', 'ISAPRE', 'Otra', 'Sin previsión'];
export const PRESTACIONES = ['Atención dental', 'Kinesiología'];
export const PROFESIONALES = ['Camila Ríos · Kinesiología', 'Diego Fuentes · Dental', 'Paula Vera · Dental'];
export const MOTIVOS = ['Contraindicación médica', 'Falta de adherencia al programa', 'Caso complejo de atender'];
export const CENTROS_SALUD = ['Hospital Dr. Luis Calvo Mackenna', 'Hospital Exequiel González Cortés', 'Hospital Roberto del Río', 'Hospital Sótero del Río', 'CESFAM de la comuna', 'Teletón', 'Otro'];
export const TIPOS_AYUDA = ['ORASMI', 'Vivienda', 'Insumos', 'Alimentos', 'Medicamentos', 'Traslado'];
export const CAUSALES = [
  { codigo: 'FALLECIMIENTO', nombre: 'Fallecimiento' },
  { codigo: 'EGRESO', nombre: 'Egreso' },
  { codigo: 'DESVINCULACION', nombre: 'Desvinculación' },
] as const;
export const AREAS = [
  { codigo: 'DENTAL', nombre: 'Dental' },
  { codigo: 'KINESIOLOGIA', nombre: 'Kinesiología' },
  { codigo: 'OTRA', nombre: 'Otra prestación' },
] as const;
export const ESTADOS_CASO = [
  { codigo: 'EN_ATENCION', nombre: 'En atención' },
  { codigo: 'ATENDIDO', nombre: 'Atendido' },
  { codigo: 'NO_ATENDIDO', nombre: 'No atendido' },
] as const;

// ---------- Control de acceso (equivalente a IControlAcceso, M1). Perfiles provisionales DP-07 ----------
export const PERMISOS_BASE: Record<Rol, Permiso[]> = {
  TRABAJO_SOCIAL: ['DERIVACION_REGISTRAR', 'FICHA_CONSULTAR', 'FICHA_EDITAR', 'SALUD_VER', 'SALUD_EDITAR',
    'DATOS_SENSIBLES_VER', 'DATOS_SENSIBLES_EDITAR', 'OBSERVACION_REGISTRAR', 'ALERTA_CONSULTAR', 'BAJA_REGISTRAR',
    'AYUDA_REGISTRAR', 'URGENCIA_MARCAR', 'REPORTE_GENERAR', 'EXPORTAR_FICHA', 'PARAMETROS_EDITAR',
    'POSTULACION_REGISTRAR', 'POSTULACION_EVALUAR', 'FOTO_EDITAR'],
  COMUNICACION: ['DERIVACION_REGISTRAR', 'FICHA_CONSULTAR'],
  TENS: ['FICHA_CONSULTAR', 'OBSERVACION_REGISTRAR', 'ATENCION_REGISTRAR', 'CICLO_ACTUALIZAR', 'ALERTA_CONSULTAR', 'URGENCIA_MARCAR'],
  PROFESIONAL: ['FICHA_CONSULTAR', 'SALUD_VER', 'SALUD_EDITAR', 'ATENCION_REGISTRAR'],
  // Tutor: propuesto por el mandante para realizar la postulación, porque conoce al NNA (Certamen 1).
  TUTOR: ['POSTULACION_REGISTRAR', 'FICHA_CONSULTAR', 'OBSERVACION_REGISTRAR', 'FOTO_EDITAR'],
  CONSULTA: ['FICHA_CONSULTAR'],
  // Administrador: solicitado por la profesora en la revisión final; puede hacer todo y ajustar los permisos.
  ADMIN: [],
};
export const NOMBRE_ROL: Record<Rol, string> = {
  TRABAJO_SOCIAL: 'Trabajo social', COMUNICACION: 'Encargada de comunicación', TENS: 'TENS',
  PROFESIONAL: 'Profesional dental/kine', TUTOR: 'Tutor', CONSULTA: 'Consulta', ADMIN: 'Administrador',
};
export const DESCRIPCION_PERMISO: Record<Permiso, string> = {
  POSTULACION_REGISTRAR: 'Registrar postulaciones de NNA', POSTULACION_EVALUAR: 'Evaluar postulaciones (ingreso al programa)',
  DERIVACION_REGISTRAR: 'Registrar derivaciones a prestaciones', FICHA_CONSULTAR: 'Consultar fichas',
  FICHA_EDITAR: 'Editar datos de la ficha', FOTO_EDITAR: 'Cargar foto identificatoria', SALUD_VER: 'Ver antecedentes de salud',
  SALUD_EDITAR: 'Editar antecedentes de salud', DATOS_SENSIBLES_VER: 'Ver datos sensibles (documental, previsión)',
  DATOS_SENSIBLES_EDITAR: 'Editar datos sensibles', OBSERVACION_REGISTRAR: 'Registrar observaciones',
  ATENCION_REGISTRAR: 'Registrar atenciones', CICLO_ACTUALIZAR: 'Actualizar estado y cerrar ciclo',
  ALERTA_CONSULTAR: 'Consultar y revisar alertas', BAJA_REGISTRAR: 'Registrar bajas', AYUDA_REGISTRAR: 'Registrar ayudas entregadas',
  URGENCIA_MARCAR: 'Marcar urgencias', REPORTE_GENERAR: 'Generar reportes', EXPORTAR_FICHA: 'Exportar con datos del apoderado',
  PARAMETROS_EDITAR: 'Configurar umbrales de alerta', PERMISOS_EDITAR: 'Modificar permisos de los perfiles',
};
export const TODOS_LOS_PERMISOS = Object.keys(DESCRIPCION_PERMISO) as Permiso[];
PERMISOS_BASE.ADMIN = [...TODOS_LOS_PERMISOS];
/** Roles cuyos permisos puede ajustar el Administrador (el propio Administrador conserva siempre todos). */
export const ROLES_EDITABLES: Rol[] = ['TRABAJO_SOCIAL', 'COMUNICACION', 'TENS', 'PROFESIONAL', 'TUTOR', 'CONSULTA'];

let vigentes: Record<Rol, Permiso[]> = PERMISOS_BASE;
/** Aplica los ajustes guardados por el Administrador (o la matriz base si no hay). */
export function configurarPermisos(ajustes?: Partial<Record<Rol, Permiso[]>>): void {
  vigentes = { ...PERMISOS_BASE, ...(ajustes ?? {}), ADMIN: PERMISOS_BASE.ADMIN };
}
export function permisosDe(rol: Rol): Permiso[] { return vigentes[rol]; }
export function puede(rol: Rol | undefined, permiso: Permiso): boolean {
  return !!rol && vigentes[rol].includes(permiso);
}

// ---------- RUT chileno ----------
export function normalizarRut(rut: string): string {
  return rut.replace(/[.\s]/g, '').toUpperCase();
}
export function rutValido(rut: string): boolean {
  const r = normalizarRut(rut);
  if (!/^[0-9]{7,8}-[0-9K]$/.test(r)) return false;
  const [num, dv] = r.split('-');
  let suma = 0, m = 2;
  for (let i = num.length - 1; i >= 0; i--) { suma += Number(num[i]) * m; m = m === 7 ? 2 : m + 1; }
  const res = 11 - (suma % 11);
  const esperado = res === 11 ? '0' : res === 10 ? 'K' : String(res);
  return dv === esperado;
}

export function telefonoValido(t: string): boolean {
  const d = t.replace(/[^0-9]/g, '');
  return d.length >= 8 && d.length <= 11 && /^[+0-9\s-]+$/.test(t.trim());
}

// ---------- Derivación (CU-01) ----------
// La derivación envía a un NNA YA INGRESADO al programa hacia una prestación (dental, kine u otra).
// El ingreso al programa ocurre por una postulación aceptada (M8). Así se separan ambos conceptos.
export interface DatosDerivacion { idBeneficiario: string; area: string; tipoIngreso: string; fecha: string; origen: string; observacion: string }
export function validarDerivacion(d: DatosDerivacion): Record<string, string> {
  const e: Record<string, string> = {};
  if (!d.idBeneficiario) e.idBeneficiario = 'Busque y seleccione un beneficiario ingresado al programa.';
  if (!d.area) e.area = 'Seleccione la prestación a la que se deriva.';
  if (!d.tipoIngreso) e.tipoIngreso = 'Indique si es primera derivación o reingreso.';
  if (!d.fecha) e.fecha = 'Ingrese la fecha de la derivación.';
  if (d.observacion.length > 500) e.observacion = 'Máximo 500 caracteres.';
  return e;
}

// ---------- Postulación (M8) ----------
export interface DatosPostulacion {
  nombres: string; apellidos: string; rut: string; fechaNacimiento: string; comuna: string;
  apoderado: string; telefono: string; prevision: string; patologias: string[]; centrosSalud: string[];
  credencial: boolean; numeroCredencial: string; porcentaje: string; electrodependiente: boolean; descripcion: string; motivo: string;
}
export function validarPostulacion(d: DatosPostulacion): Record<string, string> {
  const e: Record<string, string> = {};
  if (!d.nombres.trim()) e.nombres = 'Ingrese los nombres del NNA.';
  if (!d.apellidos.trim()) e.apellidos = 'Ingrese los apellidos del NNA.';
  if (`${d.nombres} ${d.apellidos}`.length > 160) e.nombres = 'El nombre es demasiado largo.';
  if (!d.rut.trim()) e.rut = 'Ingrese el RUT del NNA.';
  else if (normalizarRut(d.rut).length > 10) e.rut = 'El RUT es demasiado largo (formato 12345678-5).';
  else if (!rutValido(d.rut)) e.rut = 'RUT inválido: revise el formato 12345678-5 y el dígito verificador.';
  if (d.fechaNacimiento && d.fechaNacimiento > hoyISO()) e.fechaNacimiento = 'La fecha de nacimiento no puede ser futura.';
  if (!d.comuna) e.comuna = 'Seleccione la comuna.';
  if (!d.apoderado.trim()) e.apoderado = 'Ingrese el nombre del apoderado.';
  if (!d.telefono.trim()) e.telefono = 'Ingrese un teléfono de contacto.';
  else if (d.telefono.replace(/[^0-9]/g, '').length > 11) e.telefono = 'El teléfono es demasiado largo.';
  else if (!telefonoValido(d.telefono)) e.telefono = 'Teléfono inválido (ej.: +56 9 1234 5678).';
  if (d.patologias.length === 0) e.patologias = 'Indique al menos una patología o «Por completar».';
  if (d.credencial && !d.numeroCredencial.trim()) e.numeroCredencial = 'Ingrese el número de la credencial de discapacidad.';
  if (d.porcentaje && (Number(d.porcentaje) < 0 || Number(d.porcentaje) > 100)) e.porcentaje = 'Porcentaje entre 0 y 100.';
  if (!d.motivo.trim()) e.motivo = 'Describa el motivo de la postulación.';
  return e;
}

export function casoActivo(b: Beneficiario): CasoAtencion | undefined {
  return b.casos.find(c => !c.fechaCierreCiclo);
}
export function estaDeBaja(b: Beneficiario): boolean { return b.bajas.length > 0; }

// RN-02: coincidencia por RUT y, como respaldo, por nombre completo (DP-01).
export function buscarCoincidencia(lista: Beneficiario[], rut: string, nombre: string): Beneficiario | undefined {
  const r = normalizarRut(rut);
  const n = nombre.trim().toLowerCase().replace(/\s+/g, ' ');
  return lista.find(b => b.rut === r) ?? (n ? lista.find(b => `${b.nombres} ${b.apellidos}`.toLowerCase() === n) : undefined);
}
export const nombreCompleto = (b: { nombres: string; apellidos: string }) => `${b.nombres} ${b.apellidos}`;
export const iniciales = (b: { nombres: string; apellidos: string }) => `${b.nombres[0] ?? ''}${b.apellidos[0] ?? ''}`.toUpperCase();
export function edad(fechaNac?: string): string {
  if (!fechaNac) return '—';
  const n = new Date(fechaNac), h = new Date();
  let a = h.getFullYear() - n.getFullYear();
  if (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())) a--;
  return `${a} años`;
}
// RN-01: reingreso si el beneficiario tiene un ciclo anterior cerrado.
export function sugerirTipoIngreso(b?: Beneficiario): 'INGRESO' | 'REINGRESO' {
  return b && b.casos.some(c => !!c.fechaCierreCiclo) ? 'REINGRESO' : 'INGRESO';
}

// ---------- Atención (CU-03): equivalente a Atencion.validar() ----------
export function validarAtencion(a: Partial<Atencion>): Record<string, string> {
  const e: Record<string, string> = {};
  if (!a.fecha) e.fecha = 'Ingrese la fecha.';
  if (!a.profesional) e.profesional = 'Seleccione el profesional.';
  if (!a.prestacion) e.prestacion = 'Seleccione la prestación.';
  if (!a.asistencia) e.asistencia = 'Indique la asistencia.';
  if (!a.resultado) e.resultado = 'Seleccione el resultado.';
  if (a.resultado === 'NO_REALIZADA' && !a.motivo) e.motivo = 'Debe indicar el motivo para guardar una atención no realizada.';
  if (a.resultado === 'REALIZADA' && a.motivo) e.motivo = 'El motivo solo corresponde si la atención no se realizó.';
  if (a.resultado === 'REALIZADA' && a.asistencia === 'NO_ASISTIO') e.asistencia = 'Una atención realizada exige asistencia.';
  return e;
}
export function sesionesRealizadas(c?: CasoAtencion): number {
  return c ? c.atenciones.filter(a => a.resultado === 'REALIZADA').length : 0;
}

// ---------- Alertas (RF-08) ----------
export function diasEntre(desdeIso: string, hasta: Date = new Date()): number {
  const d = new Date(desdeIso);
  const a = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const b = Date.UTC(hasta.getFullYear(), hasta.getMonth(), hasta.getDate());
  return Math.floor((b - a) / 86400000);
}

// ---------- Utilidades ----------
export const hoyISO = () => new Date().toISOString().slice(0, 10);
export const ahoraISO = () => new Date().toISOString();
export function fmtFecha(iso?: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}
export const nuevoId = (p: string) => `${p}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;

// Estado visible del beneficiario en listados y ficha.
export function estadoTexto(b: Beneficiario): { texto: string; tono: 'rojo' | 'verde' | 'gris' | 'amarillo' } {
  if (estaDeBaja(b)) return { texto: 'Baja', tono: 'gris' };
  const c = casoActivo(b);
  if (!c) return b.casos.length ? { texto: 'Ciclo terminado', tono: 'verde' } : { texto: 'Ingresado, sin derivación', tono: 'gris' };
  return { texto: ESTADOS_CASO.find(e => e.codigo === c.estado)!.nombre, tono: c.urgencias.length ? 'rojo' : 'amarillo' };
}
