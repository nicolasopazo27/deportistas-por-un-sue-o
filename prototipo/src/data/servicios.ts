// Servicios de aplicación por módulo (M1–M7). Cada operación de escritura:
// 1) verifica el permiso con puede() (equivalente a IControlAcceso), 2) valida, 3) modifica el estado,
// 4) deja autoría e historial. Devuelven { ok, errores } para que la vista muestre los mensajes por campo.
import type { Alerta, Atencion, Beneficiario, CausalBaja, EstadoCaso, EstadoSistema, ReporteGenerado, Usuario } from '../domain/tipos';
import {
  ahoraISO, buscarCoincidencia, casoActivo, diasEntre, estaDeBaja, hoyISO, normalizarRut, nuevoId, puede,
  sugerirTipoIngreso, validarAtencion, validarDerivacion, type DatosDerivacion, CAUSALES,
} from '../domain/reglas';

export type Resultado<T = unknown> = { ok: true; dato?: T } | { ok: false; errores: Record<string, string> };
const denegado = (accion: string): Resultado<never> => ({ ok: false, errores: { permiso: `Su perfil no tiene permiso para ${accion}.` } });
const autor = (u: Usuario) => `${u.nombre}`;

function evento(b: Beneficiario, tipo: string, detalle: string, u: Usuario) {
  b.historial.push({ fecha: ahoraISO(), tipo, detalle, autor: autor(u) });
}
function tocarCaso(e: EstadoSistema, b: Beneficiario, idCaso: string) {
  const c = b.casos.find(x => x.id === idCaso);
  if (!c) return;
  c.ultimaActualizacion = ahoraISO();
  // Una alerta se resuelve cuando el caso se actualiza (Alerta.resolver()).
  e.alertas.filter(a => a.idCaso === idCaso && a.estado !== 'RESUELTA').forEach(a => { a.estado = 'RESUELTA'; a.fechaResolucion = ahoraISO(); });
}

// ---------- M3 Derivación (CU-01) ----------
export function revisarCoincidencia(e: EstadoSistema, rut: string, nombre: string) {
  const b = buscarCoincidencia(e.beneficiarios, rut, nombre);
  return b ? { beneficiario: b, caso: casoActivo(b) } : null;
}

export function registrarDerivacion(e: EstadoSistema, u: Usuario, d: DatosDerivacion, opciones: { continuarTrasAdvertencia?: boolean } = {}): Resultado<{ idBeneficiario: string; asociadaACasoActivo: boolean }> {
  if (!puede(u.rol, 'DERIVACION_REGISTRAR')) return denegado('registrar derivaciones');
  const errores = validarDerivacion(d);
  if (Object.keys(errores).length) return { ok: false, errores };
  const existente = buscarCoincidencia(e.beneficiarios, d.rut, d.nombre);
  const activo = existente && casoActivo(existente);
  if (activo && !opciones.continuarTrasAdvertencia) return { ok: false, errores: { coincidencia: 'Existe un caso activo para este beneficiario.' } };

  const der = {
    id: nuevoId('D'), fecha: d.fecha, tipoIngreso: d.tipoIngreso as 'INGRESO' | 'REINGRESO', area: d.area as 'DENTAL',
    origen: (d.origen || 'LLAMADO_SEMANAL') as 'LLAMADO_SEMANAL', observacion: d.observacion.trim() || undefined,
    advertenciaIgnorada: !!activo, autor: autor(u),
  };
  let b = existente;
  if (!b) {
    const partes = d.nombre.trim().split(/\s+/);
    const nombres = partes.length > 2 ? partes.slice(0, partes.length - 2).join(' ') : partes[0];
    const apellidos = partes.length > 2 ? partes.slice(-2).join(' ') : partes.slice(1).join(' ');
    b = {
      id: nuevoId('B'), rut: normalizarRut(d.rut), nombres, apellidos, comuna: d.comuna,
      apoderado: { nombre: d.apoderado.trim(), telefono: d.telefono.trim() }, situacionDocumental: 'POR_VERIFICAR',
      electrodependiente: false, enfermedades: [], hospitalizaciones: [], casos: [], bajas: [], ayudas: [],
      observaciones: [], historial: [], fechaRegistro: ahoraISO(),
    };
    e.beneficiarios.push(b);
  }
  if (activo) {
    // Supuesto DP-02: la derivación confirmada tras la advertencia se asocia al caso activo.
    activo.derivaciones.push(der);
    tocarCaso(e, b, activo.id);
  } else {
    b.casos.push({ id: nuevoId('K'), estado: 'EN_ATENCION', fechaInicio: d.fecha, ultimaActualizacion: ahoraISO(), derivaciones: [der], atenciones: [], urgencias: [] });
  }
  if (d.observacion.trim()) b.observaciones.push({ id: nuevoId('O'), fechaHora: ahoraISO(), texto: d.observacion.trim(), autor: autor(u) });
  evento(b, 'Derivación', `${der.tipoIngreso === 'INGRESO' ? 'Ingreso' : 'Reingreso'} · ${d.area === 'DENTAL' ? 'Dental' : d.area === 'KINESIOLOGIA' ? 'Kinesiología' : 'Otra'}${activo ? ' · asociada al caso activo' : ''}`, u);
  return { ok: true, dato: { idBeneficiario: b.id, asociadaACasoActivo: !!activo } };
}
export { sugerirTipoIngreso };

// ---------- M2 Beneficiario y ficha (CU-02) ----------
export interface CambiosFicha {
  comuna?: string; telefono?: string; prevision?: string; situacionDocumental?: Beneficiario['situacionDocumental'];
  electrodependiente?: boolean; enfermedad?: string; descripcionSalud?: string;
}
export function actualizarFicha(e: EstadoSistema, u: Usuario, id: string, c: CambiosFicha): Resultado {
  if (!puede(u.rol, 'FICHA_EDITAR')) return denegado('editar la ficha');
  const b = e.beneficiarios.find(x => x.id === id);
  if (!b) return { ok: false, errores: { ficha: 'Ficha inexistente.' } };
  if (c.telefono !== undefined && !c.telefono.trim()) return { ok: false, errores: { telefono: 'El contacto no puede quedar vacío.' } };
  const cambios: string[] = [];
  if (c.comuna && c.comuna !== b.comuna) { b.comuna = c.comuna; cambios.push('comuna'); }
  if (c.telefono && c.telefono !== b.apoderado.telefono) { b.apoderado.telefono = c.telefono.trim(); cambios.push('contacto'); }
  if (puede(u.rol, 'DATOS_SENSIBLES_EDITAR')) {
    if (c.prevision !== undefined && c.prevision !== b.apoderado.prevision) { b.apoderado.prevision = c.prevision; cambios.push('previsión'); }
    if (c.situacionDocumental && c.situacionDocumental !== b.situacionDocumental) { b.situacionDocumental = c.situacionDocumental; cambios.push('situación documental'); }
    if (c.electrodependiente !== undefined && c.electrodependiente !== b.electrodependiente) { b.electrodependiente = c.electrodependiente; cambios.push('electrodependencia'); }
  }
  if (puede(u.rol, 'SALUD_EDITAR') && c.enfermedad) {
    const ex = b.enfermedades.find(x => x.nombre === c.enfermedad);
    if (ex) ex.descripcion = c.descripcionSalud || ex.descripcion;
    else b.enfermedades.push({ nombre: c.enfermedad, descripcion: c.descripcionSalud || undefined });
    b.enfermedades = b.enfermedades.filter(x => x.nombre !== 'Por completar' || x.nombre === c.enfermedad);
    cambios.push('salud');
  }
  if (cambios.length) evento(b, 'Ficha actualizada', `Cambios: ${cambios.join(', ')}`, u);
  return { ok: true };
}
export function agregarObservacion(e: EstadoSistema, u: Usuario, id: string, texto: string): Resultado {
  if (!puede(u.rol, 'OBSERVACION_REGISTRAR')) return denegado('registrar observaciones');
  const b = e.beneficiarios.find(x => x.id === id);
  if (!b) return { ok: false, errores: { ficha: 'Ficha inexistente.' } };
  if (!texto.trim()) return { ok: false, errores: { texto: 'La observación no puede estar vacía.' } };
  b.observaciones.push({ id: nuevoId('O'), fechaHora: ahoraISO(), texto: texto.trim(), autor: autor(u) });
  evento(b, 'Observación', texto.trim().slice(0, 80), u);
  const c = casoActivo(b); if (c) tocarCaso(e, b, c.id);
  return { ok: true };
}

// ---------- M4 Atención y seguimiento (CU-03) ----------
export function registrarAtencion(e: EstadoSistema, u: Usuario, idBeneficiario: string, a: Partial<Atencion>): Resultado {
  if (!puede(u.rol, 'ATENCION_REGISTRAR')) return denegado('registrar atenciones');
  const b = e.beneficiarios.find(x => x.id === idBeneficiario);
  const c = b && casoActivo(b);
  if (!b || !c) return { ok: false, errores: { beneficiario: 'Seleccione un beneficiario con un caso activo.' } };
  const errores = validarAtencion(a);
  if (Object.keys(errores).length) return { ok: false, errores };
  const numero = a.resultado === 'REALIZADA' ? (Math.max(0, ...c.atenciones.map(x => x.numeroSesion ?? 0)) + 1) : undefined;
  const at: Atencion = {
    id: nuevoId('A'), fecha: a.fecha!, profesional: a.profesional!, prestacion: a.prestacion!, numeroSesion: numero,
    asistencia: a.asistencia!, resultado: a.resultado!, motivo: a.motivo || undefined, detalleMotivo: a.detalleMotivo || undefined,
    referenciaDentalSoft: a.referenciaDentalSoft || undefined, autor: autor(u),
  };
  c.atenciones.push(at);
  tocarCaso(e, b, c.id);
  if (at.resultado === 'REALIZADA') {
    evento(b, 'Atención', `Sesión ${numero} · Realizada · ${at.prestacion}`, u);
    // RF-03: aviso al área social (canal plataforma; el correo queda para la etapa con backend).
    e.notificaciones.push({ id: nuevoId('N'), tipo: 'ATENCION_REALIZADA', canal: 'PLATAFORMA', rolDestino: 'TRABAJO_SOCIAL', mensaje: `Atención realizada a ${b.nombres} ${b.apellidos} (sesión ${numero}, ${at.prestacion}).`, estado: 'PENDIENTE', fecha: ahoraISO() });
  } else {
    evento(b, 'Atención', `No realizada · motivo: ${at.motivo}`, u);
  }
  return { ok: true };
}
export function actualizarCaso(e: EstadoSistema, u: Usuario, idBeneficiario: string, cambios: { estado?: EstadoCaso; cerrarCiclo?: boolean; motivoNoGestion?: string }): Resultado {
  const b = e.beneficiarios.find(x => x.id === idBeneficiario);
  const c = b && casoActivo(b);
  if (!b || !c) return { ok: false, errores: { beneficiario: 'No hay un caso activo.' } };
  if ((cambios.estado || cambios.cerrarCiclo) && !puede(u.rol, 'CICLO_ACTUALIZAR')) return denegado('actualizar el estado o el ciclo');
  if (cambios.motivoNoGestion && !puede(u.rol, 'CICLO_ACTUALIZAR') && !puede(u.rol, 'FICHA_EDITAR')) return denegado('registrar el motivo de no gestión');
  if (cambios.estado && !['EN_ATENCION', 'ATENDIDO', 'NO_ATENDIDO'].includes(cambios.estado)) return { ok: false, errores: { estado: 'Estado no permitido.' } };
  if (cambios.estado && cambios.estado !== c.estado) { c.estado = cambios.estado; evento(b, 'Estado del caso', `Cambia a ${cambios.estado.replace('_', ' ').toLowerCase()}`, u); }
  if (cambios.motivoNoGestion) { c.motivoNoGestion = cambios.motivoNoGestion; evento(b, 'Motivo de no gestión', cambios.motivoNoGestion, u); }
  if (cambios.cerrarCiclo) {
    c.fechaCierreCiclo = hoyISO();
    evento(b, 'Ciclo terminado', `Confirmado por ${u.nombre}; sesiones realizadas: ${c.atenciones.filter(a => a.resultado === 'REALIZADA').length}`, u);
  }
  tocarCaso(e, b, c.id);
  return { ok: true };
}

// AlertaService: revisa los casos abiertos y genera una sola alerta activa por caso al superar el umbral T.
export function revisarAlertas(e: EstadoSistema, hoy: Date = new Date()): number {
  let nuevas = 0;
  const T = e.parametros.umbralDiasAlerta;
  for (const b of e.beneficiarios) {
    if (estaDeBaja(b)) continue;
    const c = casoActivo(b);
    if (!c) continue;
    const dias = diasEntre(c.ultimaActualizacion, hoy);
    const vigente = e.alertas.find(a => a.idCaso === c.id && a.estado !== 'RESUELTA');
    if (dias > T && !vigente) {
      const al: Alerta = { id: nuevoId('AL'), idBeneficiario: b.id, idCaso: c.id, fechaGeneracion: hoy.toISOString(), diasSinActualizacion: dias, umbralDias: T, estado: 'ACTIVA' };
      e.alertas.push(al);
      e.notificaciones.push({ id: nuevoId('N'), tipo: 'ALERTA_CASO', canal: 'PLATAFORMA', rolDestino: 'TRABAJO_SOCIAL', mensaje: `Caso de ${b.nombres} ${b.apellidos} lleva ${dias} días sin actualización (umbral ${T}).`, estado: 'PENDIENTE', fecha: ahoraISO() });
      nuevas++;
    } else if (vigente) {
      vigente.diasSinActualizacion = dias;
    }
  }
  return nuevas;
}
export function marcarAlertaRevisada(e: EstadoSistema, u: Usuario, idAlerta: string): Resultado {
  if (!puede(u.rol, 'ALERTA_CONSULTAR')) return denegado('revisar alertas');
  const a = e.alertas.find(x => x.id === idAlerta);
  if (!a) return { ok: false, errores: { alerta: 'Alerta inexistente.' } };
  if (a.estado !== 'ACTIVA') return { ok: false, errores: { alerta: 'La alerta ya fue revisada o resuelta.' } };
  a.estado = 'REVISADA';
  const b = e.beneficiarios.find(x => x.id === a.idBeneficiario);
  if (b) evento(b, 'Revisión de alerta', `${a.diasSinActualizacion} días sin actualización (umbral ${a.umbralDias})`, u);
  return { ok: true };
}
export function cambiarUmbral(e: EstadoSistema, u: Usuario, dias: number): Resultado {
  if (!puede(u.rol, 'PARAMETROS_EDITAR')) return denegado('modificar parámetros');
  if (!Number.isInteger(dias) || dias < 1 || dias > 365) return { ok: false, errores: { umbral: 'Ingrese un número de días entre 1 y 365.' } };
  e.parametros.umbralDiasAlerta = dias;
  return { ok: true };
}

// ---------- M5 Bajas (CU-04) ----------
export function registrarBaja(e: EstadoSistema, u: Usuario, idBeneficiario: string, causal: string, fecha: string, observacion: string): Resultado<{ existente: boolean }> {
  if (!puede(u.rol, 'BAJA_REGISTRAR')) return denegado('registrar bajas');
  const b = e.beneficiarios.find(x => x.id === idBeneficiario);
  if (!b) return { ok: false, errores: { beneficiario: 'Seleccione un beneficiario.' } };
  if (!causal) return { ok: false, errores: { causal: 'Seleccione una causal: fallecimiento, egreso o desvinculación.' } };
  if (!fecha) return { ok: false, errores: { fecha: 'Ingrese la fecha de la baja.' } };
  if (b.bajas.some(x => x.causal === causal && x.fecha === fecha)) return { ok: false, errores: { causal: 'Esta baja ya está registrada; se muestra el registro existente.' } };
  b.bajas.push({ id: nuevoId('BA'), causal: causal as CausalBaja, fecha, observacion: observacion.trim() || undefined, autor: autor(u) });
  const nombre = CAUSALES.find(c => c.codigo === causal)?.nombre ?? causal;
  evento(b, 'Baja', `Causal: ${nombre}${observacion.trim() ? ' · ' + observacion.trim() : ''}`, u);
  return { ok: true, dato: { existente: false } };
}

// ---------- M6 Ayudas y urgencia (CU-05) ----------
export function registrarAyuda(e: EstadoSistema, u: Usuario, idBeneficiario: string, tipo: string, fecha: string, guia: string): Resultado {
  if (!puede(u.rol, 'AYUDA_REGISTRAR')) return denegado('registrar entregas de ayuda (acción reservada al equipo social)');
  const b = e.beneficiarios.find(x => x.id === idBeneficiario);
  const er: Record<string, string> = {};
  if (!b) er.beneficiario = 'Seleccione un beneficiario.';
  if (!tipo) er.tipo = 'Seleccione el tipo de ayuda.';
  if (!fecha) er.fecha = 'Ingrese la fecha de entrega.';
  if (!guia.trim()) er.guia = 'Ingrese el número de guía o comprobante de entrega.';
  if (Object.keys(er).length) return { ok: false, errores: er };
  b!.ayudas.push({ id: nuevoId('AY'), tipo, fecha, numeroGuia: guia.trim(), autor: autor(u) });
  evento(b!, 'Ayuda entregada', `${tipo} · guía ${guia.trim()}`, u);
  return { ok: true };
}
export function marcarUrgencia(e: EstadoSistema, u: Usuario, idBeneficiario: string, motivo: string): Resultado {
  if (!puede(u.rol, 'URGENCIA_MARCAR')) return denegado('marcar urgencia');
  const b = e.beneficiarios.find(x => x.id === idBeneficiario);
  const c = b && casoActivo(b);
  if (!b || !c) return { ok: false, errores: { beneficiario: 'Seleccione un beneficiario con un caso activo.' } };
  c.urgencias.push({ id: nuevoId('U'), fecha: ahoraISO(), motivo: motivo.trim() || undefined, autor: autor(u) });
  evento(b, 'Urgencia', `Caso marcado como urgente${motivo.trim() ? ': ' + motivo.trim() : ''}`, u);
  tocarCaso(e, b, c.id);
  return { ok: true };
}

// ---------- M7 Reportes (CU-06): registro de descargas ----------
export function registrarReporte(e: EstadoSistema, u: Usuario, r: Omit<ReporteGenerado, 'id' | 'usuario' | 'fecha'>): ReporteGenerado {
  const rep: ReporteGenerado = { ...r, id: nuevoId('R'), usuario: autor(u), fecha: ahoraISO() };
  e.reportes.push(rep);
  return rep;
}
export function leerNotificaciones(e: EstadoSistema, u: Usuario) {
  e.notificaciones.filter(n => n.rolDestino === u.rol && n.estado === 'PENDIENTE').forEach(n => { n.estado = 'LEIDA'; });
}
