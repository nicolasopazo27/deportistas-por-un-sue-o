// Servicios de aplicación por módulo (M1–M8). Cada operación de escritura:
// 1) verifica el permiso con puede() (equivalente a IControlAcceso), 2) valida, 3) modifica el estado,
// 4) deja autoría e historial. Devuelven { ok, errores } para que la vista muestre los mensajes por campo.
import type { Alerta, Atencion, Beneficiario, CausalBaja, EstadoCaso, EstadoSistema, Postulacion, ReporteGenerado, Usuario } from '../domain/tipos';
import {
  ahoraISO, buscarCoincidencia, casoActivo, diasEntre, estaDeBaja, hoyISO, normalizarRut, nuevoId, puede,
  sugerirTipoIngreso, validarAtencion, validarDerivacion, validarPostulacion, type DatosDerivacion, type DatosPostulacion, CAUSALES, AREAS,
} from '../domain/reglas';

export type Resultado<T = unknown> = { ok: true; dato?: T } | { ok: false; errores: Record<string, string> };
const denegado = (accion: string): Resultado<never> => ({ ok: false, errores: { permiso: `Su perfil no tiene permiso para ${accion}.` } });
const autor = (u: Usuario) => `${u.nombre}`;
const nombreArea = (a: string) => AREAS.find(x => x.codigo === a)?.nombre ?? a;

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
function notificar(e: EstadoSistema, rol: Usuario['rol'], tipo: 'ATENCION_REALIZADA' | 'ALERTA_CASO' | 'POSTULACION', mensaje: string) {
  e.notificaciones.push({ id: nuevoId('N'), tipo, canal: 'PLATAFORMA', rolDestino: rol, mensaje, estado: 'PENDIENTE', fecha: ahoraISO() });
}

// ---------- M8 Postulación: etapa previa al ingreso del NNA ----------
export function registrarPostulacion(e: EstadoSistema, u: Usuario, d: DatosPostulacion): Resultado<{ id: string }> {
  if (!puede(u.rol, 'POSTULACION_REGISTRAR')) return denegado('registrar postulaciones');
  const errores = validarPostulacion(d);
  if (Object.keys(errores).length) return { ok: false, errores };
  const rut = normalizarRut(d.rut);
  const yaBenef = e.beneficiarios.find(b => b.rut === rut);
  if (yaBenef) return { ok: false, errores: { rut: `Este NNA ya ingresó al programa (${yaBenef.nombres} ${yaBenef.apellidos}). Use Derivaciones para enviarlo a una prestación.` } };
  const abierta = e.postulaciones.find(p => p.nna.rut === rut && (p.estado === 'ENVIADA' || p.estado === 'EN_EVALUACION'));
  if (abierta) return { ok: false, errores: { rut: 'Ya existe una postulación en curso para este RUT.' } };
  const p: Postulacion = {
    id: nuevoId('P'), fecha: hoyISO(), estado: 'ENVIADA',
    nna: { nombres: d.nombres.trim(), apellidos: d.apellidos.trim(), rut, fechaNacimiento: d.fechaNacimiento || undefined, comuna: d.comuna },
    apoderado: { nombre: d.apoderado.trim(), telefono: d.telefono.trim(), prevision: d.prevision || undefined },
    antecedentes: {
      patologias: d.patologias, centrosSalud: d.centrosSalud, electrodependiente: d.electrodependiente, descripcion: d.descripcion.trim() || undefined,
      credencial: d.credencial ? { tiene: true, numero: d.numeroCredencial.trim(), porcentaje: d.porcentaje ? Number(d.porcentaje) : undefined } : { tiene: false },
    },
    motivo: d.motivo.trim(), tutor: autor(u),
  };
  e.postulaciones.push(p);
  notificar(e, 'TRABAJO_SOCIAL', 'POSTULACION', `Nueva postulación de ${p.nna.nombres} ${p.nna.apellidos} (registrada por ${autor(u)}).`);
  return { ok: true, dato: { id: p.id } };
}

export function evaluarPostulacion(e: EstadoSistema, u: Usuario, id: string, decision: 'EN_EVALUACION' | 'ACEPTADA' | 'RECHAZADA', resolucion: string): Resultado<{ idBeneficiario?: string }> {
  if (!puede(u.rol, 'POSTULACION_EVALUAR')) return denegado('evaluar postulaciones');
  const p = e.postulaciones.find(x => x.id === id);
  if (!p) return { ok: false, errores: { postulacion: 'Postulación inexistente.' } };
  if (p.estado === 'ACEPTADA' || p.estado === 'RECHAZADA') return { ok: false, errores: { postulacion: 'La postulación ya fue resuelta.' } };
  if (decision === 'RECHAZADA' && !resolucion.trim()) return { ok: false, errores: { resolucion: 'Indique el motivo del rechazo.' } };
  p.evaluador = autor(u);
  if (decision === 'EN_EVALUACION') { p.estado = 'EN_EVALUACION'; return { ok: true }; }
  p.estado = decision; p.fechaResolucion = hoyISO(); p.resolucion = resolucion.trim() || undefined;
  if (decision === 'RECHAZADA') return { ok: true };
  // Aceptada = INGRESO AL PROGRAMA: se crea la ficha única con los antecedentes de la postulación.
  const b: Beneficiario = {
    id: nuevoId('B'), rut: p.nna.rut, nombres: p.nna.nombres, apellidos: p.nna.apellidos, fechaNacimiento: p.nna.fechaNacimiento, comuna: p.nna.comuna,
    apoderado: { ...p.apoderado }, situacionDocumental: 'POR_VERIFICAR', electrodependiente: p.antecedentes.electrodependiente,
    enfermedades: p.antecedentes.patologias.map(n => ({ nombre: n, descripcion: p.antecedentes.descripcion })),
    centrosSalud: [...p.antecedentes.centrosSalud], credencial: { ...p.antecedentes.credencial }, tutor: p.tutor, idPostulacion: p.id,
    hospitalizaciones: [], casos: [], bajas: [], ayudas: [], observaciones: [], historial: [], fechaRegistro: ahoraISO(),
  };
  e.beneficiarios.push(b);
  p.idBeneficiario = b.id;
  evento(b, 'Ingreso al programa', `Postulación aceptada${p.resolucion ? ': ' + p.resolucion : ''} (tutor: ${p.tutor})`, u);
  return { ok: true, dato: { idBeneficiario: b.id } };
}

// ---------- M3 Derivación (CU-01): solo para NNA ya ingresados ----------
export function revisarCasoActivo(e: EstadoSistema, idBeneficiario: string) {
  const b = e.beneficiarios.find(x => x.id === idBeneficiario);
  return b ? { beneficiario: b, caso: casoActivo(b) } : null;
}
export function buscarBeneficiario(e: EstadoSistema, texto: string): Beneficiario[] {
  const t = texto.trim().toLowerCase();
  if (t.length < 2) return [];
  const rut = normalizarRut(texto);
  return e.beneficiarios.filter(b => b.rut === rut || b.rut.startsWith(rut.replace('-', '')) || `${b.nombres} ${b.apellidos}`.toLowerCase().includes(t)).slice(0, 8);
}
export { buscarCoincidencia };

export function registrarDerivacion(e: EstadoSistema, u: Usuario, d: DatosDerivacion, opciones: { continuarTrasAdvertencia?: boolean } = {}): Resultado<{ idBeneficiario: string; asociadaACasoActivo: boolean }> {
  if (!puede(u.rol, 'DERIVACION_REGISTRAR')) return denegado('registrar derivaciones');
  const errores = validarDerivacion(d);
  if (Object.keys(errores).length) return { ok: false, errores };
  const b = e.beneficiarios.find(x => x.id === d.idBeneficiario);
  if (!b) return { ok: false, errores: { idBeneficiario: 'El NNA no está ingresado al programa. Primero debe registrarse y aceptarse su postulación.' } };
  if (estaDeBaja(b)) return { ok: false, errores: { idBeneficiario: 'El beneficiario tiene una baja registrada; no se puede derivar.' } };
  const activo = casoActivo(b);
  if (activo && !opciones.continuarTrasAdvertencia) return { ok: false, errores: { coincidencia: 'Existe un caso activo para este beneficiario.' } };
  const der = {
    id: nuevoId('D'), fecha: d.fecha, tipoIngreso: d.tipoIngreso as 'INGRESO' | 'REINGRESO', area: d.area as 'DENTAL',
    origen: (d.origen || 'LLAMADO_SEMANAL') as 'LLAMADO_SEMANAL', observacion: d.observacion.trim() || undefined,
    advertenciaIgnorada: !!activo, autor: autor(u),
  };
  if (activo) {
    // Supuesto DP-02: la derivación confirmada tras la advertencia se asocia al caso activo.
    activo.derivaciones.push(der);
    tocarCaso(e, b, activo.id);
  } else {
    b.casos.push({ id: nuevoId('K'), estado: 'EN_ATENCION', fechaInicio: d.fecha, ultimaActualizacion: ahoraISO(), derivaciones: [der], atenciones: [], urgencias: [] });
  }
  if (d.observacion.trim()) b.observaciones.push({ id: nuevoId('O'), fechaHora: ahoraISO(), texto: d.observacion.trim(), autor: autor(u) });
  evento(b, 'Derivación', `${der.tipoIngreso === 'INGRESO' ? 'Primera derivación' : 'Reingreso'} · ${nombreArea(d.area)}${activo ? ' · asociada al caso activo' : ''}`, u);
  return { ok: true, dato: { idBeneficiario: b.id, asociadaACasoActivo: !!activo } };
}
export { sugerirTipoIngreso };

// ---------- M2 Beneficiario y ficha (CU-02) ----------
export interface CambiosFicha {
  comuna?: string; telefono?: string; prevision?: string; situacionDocumental?: Beneficiario['situacionDocumental'];
  electrodependiente?: boolean; enfermedad?: string; descripcionSalud?: string;
  centroSalud?: string; credencial?: Beneficiario['credencial'];
  hospitalizacion?: { ingreso?: string; alta?: string; centro?: string; descripcion: string };
}
export function actualizarFicha(e: EstadoSistema, u: Usuario, id: string, c: CambiosFicha): Resultado {
  const b = e.beneficiarios.find(x => x.id === id);
  if (!b) return { ok: false, errores: { ficha: 'Ficha inexistente.' } };
  const tocaSalud = !!(c.enfermedad || c.centroSalud || c.credencial || c.hospitalizacion);
  if (!puede(u.rol, 'FICHA_EDITAR') && !(tocaSalud && puede(u.rol, 'SALUD_EDITAR'))) return denegado('editar la ficha');
  if (c.telefono !== undefined && !c.telefono.trim()) return { ok: false, errores: { telefono: 'El contacto no puede quedar vacío.' } };
  if (c.credencial?.tiene && !c.credencial.numero?.trim()) return { ok: false, errores: { credencial: 'Ingrese el número de la credencial de discapacidad.' } };
  if (c.hospitalizacion) {
    if (!c.hospitalizacion.descripcion.trim()) return { ok: false, errores: { hospitalizacion: 'Describa la hospitalización.' } };
    if (c.hospitalizacion.ingreso && c.hospitalizacion.alta && c.hospitalizacion.alta < c.hospitalizacion.ingreso) return { ok: false, errores: { hospitalizacion: 'La fecha de alta no puede ser anterior al ingreso.' } };
  }
  const cambios: string[] = [];
  if (puede(u.rol, 'FICHA_EDITAR')) {
    if (c.comuna && c.comuna !== b.comuna) { b.comuna = c.comuna; cambios.push('comuna'); }
    if (c.telefono && c.telefono !== b.apoderado.telefono) { b.apoderado.telefono = c.telefono.trim(); cambios.push('contacto'); }
  }
  if (puede(u.rol, 'DATOS_SENSIBLES_EDITAR')) {
    if (c.prevision !== undefined && c.prevision !== (b.apoderado.prevision ?? '')) { b.apoderado.prevision = c.prevision; cambios.push('previsión'); }
    if (c.situacionDocumental && c.situacionDocumental !== b.situacionDocumental) { b.situacionDocumental = c.situacionDocumental; cambios.push('situación documental'); }
    if (c.electrodependiente !== undefined && c.electrodependiente !== b.electrodependiente) { b.electrodependiente = c.electrodependiente; cambios.push('electrodependencia'); }
  }
  if (puede(u.rol, 'SALUD_EDITAR')) {
    if (c.enfermedad) {
      const ex = b.enfermedades.find(x => x.nombre === c.enfermedad);
      if (ex) ex.descripcion = c.descripcionSalud || ex.descripcion;
      else b.enfermedades.push({ nombre: c.enfermedad, descripcion: c.descripcionSalud || undefined });
      if (c.enfermedad !== 'Por completar') b.enfermedades = b.enfermedades.filter(x => x.nombre !== 'Por completar');
      cambios.push('patologías');
    }
    if (c.centroSalud && !b.centrosSalud.includes(c.centroSalud)) { b.centrosSalud.push(c.centroSalud); cambios.push('centro de salud'); }
    if (c.credencial) { b.credencial = { ...c.credencial, numero: c.credencial.numero?.trim() }; cambios.push('credencial de discapacidad'); }
    if (c.hospitalizacion) { b.hospitalizaciones.push({ id: nuevoId('H'), ...c.hospitalizacion, descripcion: c.hospitalizacion.descripcion.trim(), autor: autor(u) }); cambios.push('hospitalización'); }
  }
  if (cambios.length) evento(b, 'Ficha actualizada', `Cambios: ${cambios.join(', ')}`, u);
  return { ok: true };
}
export function actualizarFoto(e: EstadoSistema, u: Usuario, id: string, foto: string | undefined): Resultado {
  if (!puede(u.rol, 'FOTO_EDITAR')) return denegado('cargar la foto');
  const b = e.beneficiarios.find(x => x.id === id);
  if (!b) return { ok: false, errores: { ficha: 'Ficha inexistente.' } };
  if (foto && !/^data:image\/(png|jpe?g|webp);base64,/.test(foto)) return { ok: false, errores: { foto: 'Formato no admitido. Use JPG, PNG o WebP.' } };
  if (foto && foto.length > 400_000) return { ok: false, errores: { foto: 'La imagen es demasiado grande.' } };
  b.foto = foto;
  evento(b, 'Foto identificatoria', foto ? 'Foto actualizada' : 'Foto eliminada', u);
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
  if (!b || !c) return { ok: false, errores: { beneficiario: 'Seleccione un beneficiario con un caso activo (derivado a una prestación).' } };
  const errores = validarAtencion(a);
  if (a.observacion && a.observacion.length > 500) errores.observacion = 'Máximo 500 caracteres.';
  if (Object.keys(errores).length) return { ok: false, errores };
  const numero = a.resultado === 'REALIZADA' ? (Math.max(0, ...c.atenciones.map(x => x.numeroSesion ?? 0)) + 1) : undefined;
  const at: Atencion = {
    id: nuevoId('A'), fecha: a.fecha!, profesional: a.profesional!, prestacion: a.prestacion!, numeroSesion: numero,
    asistencia: a.asistencia!, resultado: a.resultado!, motivo: a.motivo || undefined, detalleMotivo: a.detalleMotivo || undefined,
    observacion: a.observacion?.trim() || undefined, referenciaDentalSoft: a.referenciaDentalSoft || undefined, autor: autor(u),
  };
  c.atenciones.push(at);
  tocarCaso(e, b, c.id);
  const obs = at.observacion ? ` · Obs.: ${at.observacion}` : '';
  if (at.resultado === 'REALIZADA') {
    evento(b, 'Atención', `Sesión ${numero} · Realizada · ${at.prestacion}${obs}`, u);
    // RF-03: aviso al área social (canal plataforma; el correo queda para la etapa con backend).
    notificar(e, 'TRABAJO_SOCIAL', 'ATENCION_REALIZADA', `Atención realizada a ${b.nombres} ${b.apellidos} (sesión ${numero}, ${at.prestacion}).`);
  } else {
    evento(b, 'Atención', `No realizada · motivo: ${at.motivo}${obs}`, u);
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

// AlertaService: revisa los casos abiertos y genera UNA alerta activa por caso:
//  · DERIVACION_SIN_ATENCION si la última derivación supera el umbral de derivación sin atenciones posteriores
//    (alertas asociadas a derivaciones, observación del mandante);
//  · CASO_SIN_ACTUALIZACION si el caso supera el umbral T sin novedades (RF-08).
export function revisarAlertas(e: EstadoSistema, hoy: Date = new Date()): number {
  let nuevas = 0;
  const T = e.parametros.umbralDiasAlerta, TD = e.parametros.umbralDiasDerivacion;
  for (const b of e.beneficiarios) {
    if (estaDeBaja(b)) continue;
    const c = casoActivo(b);
    if (!c) continue;
    const vigente = e.alertas.find(a => a.idCaso === c.id && a.estado !== 'RESUELTA');
    const ultDer = c.derivaciones.at(-1)!;
    const sinAtencion = !c.atenciones.some(a => a.fecha >= ultDer.fecha);
    const diasDer = diasEntre(ultDer.fecha, hoy);
    const diasCaso = diasEntre(c.ultimaActualizacion, hoy);
    let tipo: Alerta['tipo'] | null = null, dias = 0, umbral = 0;
    if (sinAtencion && diasDer > TD) { tipo = 'DERIVACION_SIN_ATENCION'; dias = diasDer; umbral = TD; }
    else if (diasCaso > T) { tipo = 'CASO_SIN_ACTUALIZACION'; dias = diasCaso; umbral = T; }
    if (tipo && !vigente) {
      e.alertas.push({ id: nuevoId('AL'), tipo, idBeneficiario: b.id, idCaso: c.id, idDerivacion: tipo === 'DERIVACION_SIN_ATENCION' ? ultDer.id : undefined, fechaGeneracion: hoy.toISOString(), diasSinActualizacion: dias, umbralDias: umbral, estado: 'ACTIVA' });
      const texto = tipo === 'DERIVACION_SIN_ATENCION'
        ? `Derivación de ${b.nombres} ${b.apellidos} a ${nombreArea(ultDer.area)} lleva ${dias} días sin atención (umbral ${umbral}).`
        : `Caso de ${b.nombres} ${b.apellidos} lleva ${dias} días sin actualización (umbral ${umbral}).`;
      notificar(e, 'TRABAJO_SOCIAL', 'ALERTA_CASO', texto);
      notificar(e, 'TENS', 'ALERTA_CASO', texto);
      nuevas++;
    } else if (vigente) {
      vigente.diasSinActualizacion = vigente.tipo === 'DERIVACION_SIN_ATENCION' ? diasDer : diasCaso;
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
  if (b) evento(b, 'Revisión de alerta', `${a.tipo === 'DERIVACION_SIN_ATENCION' ? 'Derivación sin atención' : 'Caso sin actualización'}: ${a.diasSinActualizacion} días (umbral ${a.umbralDias})`, u);
  return { ok: true };
}
export function cambiarUmbral(e: EstadoSistema, u: Usuario, dias: number, tipo: 'CASO' | 'DERIVACION' = 'CASO'): Resultado {
  if (!puede(u.rol, 'PARAMETROS_EDITAR')) return denegado('modificar parámetros');
  if (!Number.isInteger(dias) || dias < 1 || dias > 365) return { ok: false, errores: { umbral: 'Ingrese un número de días entre 1 y 365.' } };
  if (tipo === 'CASO') e.parametros.umbralDiasAlerta = dias; else e.parametros.umbralDiasDerivacion = dias;
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
