// Tipos del dominio. Siguen el modelo de datos (DDL PostgreSQL 16) y el diagrama de clases.
// v2: incorpora las observaciones del mandante (Certamen 1): postulación (M8), perfil Tutor,
// antecedentes del NNA, foto identificatoria, alertas de derivación y observación por atención.

export type Rol = 'TRABAJO_SOCIAL' | 'COMUNICACION' | 'TENS' | 'PROFESIONAL' | 'TUTOR' | 'CONSULTA' | 'ADMIN';
export type Permiso =
  | 'DERIVACION_REGISTRAR' | 'FICHA_CONSULTAR' | 'FICHA_EDITAR' | 'SALUD_VER' | 'SALUD_EDITAR'
  | 'DATOS_SENSIBLES_VER' | 'DATOS_SENSIBLES_EDITAR' | 'OBSERVACION_REGISTRAR' | 'ATENCION_REGISTRAR'
  | 'CICLO_ACTUALIZAR' | 'ALERTA_CONSULTAR' | 'BAJA_REGISTRAR' | 'AYUDA_REGISTRAR' | 'URGENCIA_MARCAR'
  | 'REPORTE_GENERAR' | 'EXPORTAR_FICHA' | 'PARAMETROS_EDITAR'
  | 'POSTULACION_EVALUAR' | 'FOTO_EDITAR' | 'PERMISOS_EDITAR';

export interface Usuario { id: string; nombre: string; email: string; rol: Rol }

export type EstadoCaso = 'EN_ATENCION' | 'ATENDIDO' | 'NO_ATENDIDO';
export type TipoIngreso = 'INGRESO' | 'REINGRESO';
export type Area = 'DENTAL' | 'KINESIOLOGIA' | 'OTRA';
export type SituacionDocumental = 'DOCUMENTADO' | 'INDOCUMENTADO' | 'POR_VERIFICAR';
export type CausalBaja = 'FALLECIMIENTO' | 'EGRESO' | 'DESVINCULACION';
export type Resultado = 'REALIZADA' | 'NO_REALIZADA';
export type Asistencia = 'ASISTIO' | 'NO_ASISTIO';

export interface Apoderado { nombre: string; rut?: string; telefono: string; email?: string; prevision?: string }

export interface Derivacion {
  id: string; fecha: string; tipoIngreso: TipoIngreso; area: Area; origen: 'LLAMADO_SEMANAL' | 'SOLICITUD_APODERADO';
  observacion?: string; advertenciaIgnorada: boolean; autor: string;
}

export interface Atencion {
  id: string; fecha: string; profesional: string; prestacion: string; numeroSesion?: number;
  asistencia: Asistencia; resultado: Resultado; motivo?: string; detalleMotivo?: string;
  observacion?: string; referenciaDentalSoft?: string; autor: string;
}

export interface CasoAtencion {
  id: string; estado: EstadoCaso; fechaInicio: string; fechaCierreCiclo?: string;
  motivoNoGestion?: string; ultimaActualizacion: string; derivaciones: Derivacion[]; atenciones: Atencion[];
  urgencias: { id: string; fecha: string; motivo?: string; autor: string }[];
}

export interface Baja { id: string; causal: CausalBaja; fecha: string; observacion?: string; autor: string }
export interface AyudaEntregada { id: string; tipo: string; fecha: string; numeroGuia: string; autor: string }
export interface Observacion { id: string; fechaHora: string; texto: string; autor: string }
export interface Hospitalizacion { id: string; ingreso?: string; alta?: string; centro?: string; descripcion: string; autor: string }

export interface CredencialDiscapacidad { tiene: boolean; numero?: string; porcentaje?: number; vigencia?: string }

export interface EventoHistorial { fecha: string; tipo: string; detalle: string; autor: string }

export interface Beneficiario {
  id: string; rut: string; nombres: string; apellidos: string; fechaNacimiento?: string; comuna: string; apoderado: Apoderado;
  situacionDocumental: SituacionDocumental; electrodependiente: boolean;
  enfermedades: { nombre: string; descripcion?: string }[]; hospitalizaciones: Hospitalizacion[];
  centrosSalud: string[]; credencial: CredencialDiscapacidad; foto?: string; tutor?: string; idPostulacion?: string;
  casos: CasoAtencion[]; bajas: Baja[]; ayudas: AyudaEntregada[]; observaciones: Observacion[];
  historial: EventoHistorial[]; fechaRegistro: string;
}

// M8 Postulación: etapa previa al ingreso del NNA al programa (observación del mandante, Certamen 1).
export type EstadoPostulacion = 'ENVIADA' | 'EN_EVALUACION' | 'ACEPTADA' | 'RECHAZADA';
export interface Postulacion {
  id: string; fecha: string; estado: EstadoPostulacion;
  nna: { nombres: string; apellidos: string; rut: string; fechaNacimiento?: string; comuna: string };
  apoderado: Apoderado;
  antecedentes: { patologias: string[]; centrosSalud: string[]; credencial: CredencialDiscapacidad; electrodependiente: boolean; descripcion?: string };
  /** Quién postuló (apoderado/a o tutor/a); origen WEB = formulario público. */
  motivo: string; tutor: string; origen?: 'WEB'; evaluador?: string; fechaResolucion?: string; resolucion?: string; idBeneficiario?: string;
}

export type EstadoAlerta = 'ACTIVA' | 'REVISADA' | 'RESUELTA';
export type TipoAlerta = 'CASO_SIN_ACTUALIZACION' | 'DERIVACION_SIN_ATENCION';
export interface Alerta {
  id: string; tipo: TipoAlerta; idBeneficiario: string; idCaso: string; idDerivacion?: string; fechaGeneracion: string;
  diasSinActualizacion: number; umbralDias: number; estado: EstadoAlerta; fechaResolucion?: string;
}

export interface Notificacion {
  id: string; tipo: 'ATENCION_REALIZADA' | 'ALERTA_CASO' | 'POSTULACION'; canal: 'PLATAFORMA'; rolDestino: Rol;
  mensaje: string; estado: 'PENDIENTE' | 'LEIDA'; fecha: string;
}

export interface ReporteGenerado {
  id: string; tipo: string; formato: 'XLSX' | 'PDF'; desde?: string; hasta?: string; idBeneficiario?: string;
  incluyeApoderado: boolean; totalRegistros: number; resultado: 'GENERADO' | 'VACIO' | 'FALLIDO';
  usuario: string; fecha: string;
}

export interface EstadoSistema {
  version: number;
  beneficiarios: Beneficiario[];
  postulaciones: Postulacion[];
  alertas: Alerta[];
  notificaciones: Notificacion[];
  reportes: ReporteGenerado[];
  parametros: { umbralDiasAlerta: number; umbralDiasDerivacion: number };
  /** Permisos ajustados por el Administrador; si falta un rol se usa la matriz base. */
  permisos?: Partial<Record<Rol, Permiso[]>>;
  /** Consolidado anual de las planillas anteriores al sistema (datos FICTICIOS de demostración). */
  historico: RegistroHistorico[];
}
export interface RegistroHistorico {
  anio: number; postulaciones: number; ingresos: number;
  bajas: Record<CausalBaja, number>; derivaciones: Record<Area, number>; atenciones: number;
}
