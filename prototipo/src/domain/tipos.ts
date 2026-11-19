// Tipos del dominio. Siguen el modelo de datos (DDL PostgreSQL 16) y el diagrama de clases.

export type Rol = 'TRABAJO_SOCIAL' | 'COMUNICACION' | 'TENS' | 'PROFESIONAL' | 'CONSULTA';
export type Permiso =
  | 'DERIVACION_REGISTRAR' | 'FICHA_CONSULTAR' | 'FICHA_EDITAR' | 'SALUD_VER' | 'SALUD_EDITAR'
  | 'DATOS_SENSIBLES_VER' | 'DATOS_SENSIBLES_EDITAR' | 'OBSERVACION_REGISTRAR' | 'ATENCION_REGISTRAR'
  | 'CICLO_ACTUALIZAR' | 'ALERTA_CONSULTAR' | 'BAJA_REGISTRAR' | 'AYUDA_REGISTRAR' | 'URGENCIA_MARCAR'
  | 'REPORTE_GENERAR' | 'EXPORTAR_FICHA' | 'PARAMETROS_EDITAR';

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
  referenciaDentalSoft?: string; autor: string;
}

export interface CasoAtencion {
  id: string; estado: EstadoCaso; fechaInicio: string; fechaCierreCiclo?: string;
  motivoNoGestion?: string; ultimaActualizacion: string; derivaciones: Derivacion[]; atenciones: Atencion[];
  urgencias: { id: string; fecha: string; motivo?: string; autor: string }[];
}

export interface Baja { id: string; causal: CausalBaja; fecha: string; observacion?: string; autor: string }
export interface AyudaEntregada { id: string; tipo: string; fecha: string; numeroGuia: string; autor: string }
export interface Observacion { id: string; fechaHora: string; texto: string; autor: string }
export interface Hospitalizacion { id: string; ingreso?: string; alta?: string; descripcion: string; autor: string }

export interface EventoHistorial { fecha: string; tipo: string; detalle: string; autor: string }

export interface Beneficiario {
  id: string; rut: string; nombres: string; apellidos: string; comuna: string; apoderado: Apoderado;
  situacionDocumental: SituacionDocumental; electrodependiente: boolean;
  enfermedades: { nombre: string; descripcion?: string }[]; hospitalizaciones: Hospitalizacion[];
  casos: CasoAtencion[]; bajas: Baja[]; ayudas: AyudaEntregada[]; observaciones: Observacion[];
  historial: EventoHistorial[]; fechaRegistro: string;
}

export type EstadoAlerta = 'ACTIVA' | 'REVISADA' | 'RESUELTA';
export interface Alerta {
  id: string; idBeneficiario: string; idCaso: string; fechaGeneracion: string;
  diasSinActualizacion: number; umbralDias: number; estado: EstadoAlerta; fechaResolucion?: string;
}

export interface Notificacion {
  id: string; tipo: 'ATENCION_REALIZADA' | 'ALERTA_CASO'; canal: 'PLATAFORMA'; rolDestino: Rol;
  mensaje: string; estado: 'PENDIENTE' | 'LEIDA'; fecha: string;
}

export interface ReporteGenerado {
  id: string; tipo: string; formato: 'XLSX'; desde?: string; hasta?: string; idBeneficiario?: string;
  incluyeApoderado: boolean; totalRegistros: number; resultado: 'GENERADO' | 'VACIO' | 'FALLIDO';
  usuario: string; fecha: string;
}

export interface EstadoSistema {
  version: number;
  beneficiarios: Beneficiario[];
  alertas: Alerta[];
  notificaciones: Notificacion[];
  reportes: ReporteGenerado[];
  parametros: { umbralDiasAlerta: number };
}
