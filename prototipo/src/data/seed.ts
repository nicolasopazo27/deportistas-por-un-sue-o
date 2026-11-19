// Datos iniciales FICTICIOS para demostración y pruebas. No corresponden a personas reales.
import type { EstadoSistema } from '../domain/tipos';

const diasAtras = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};
const fecha = (n: number) => diasAtras(n).slice(0, 10);

export const VERSION_DATOS = 2;

export function crearDatosIniciales(): EstadoSistema {
  return {
    version: VERSION_DATOS,
    // Valores de ensayo: el umbral definitivo está pendiente de validación con la Fundación (DP-04).
    parametros: { umbralDiasAlerta: 14, umbralDiasDerivacion: 7 },
    beneficiarios: [
      {
        id: 'B-01', rut: '12345678-5', nombres: 'Camila', apellidos: 'Rojas Soto', fechaNacimiento: '2015-03-14', comuna: 'Santiago',
        apoderado: { nombre: 'María Soto Pérez', telefono: '+56 9 1234 5678', prevision: 'FONASA' },
        situacionDocumental: 'DOCUMENTADO', electrodependiente: false,
        enfermedades: [{ nombre: 'Renal', descripcion: 'Control nefrológico mensual (dato ficticio).' }],
        centrosSalud: ['Hospital Dr. Luis Calvo Mackenna'], credencial: { tiene: true, numero: 'CD-000123', porcentaje: 40 },
        tutor: 'Francisca Herrera', idPostulacion: 'P-00',
        hospitalizaciones: [{ id: 'H-01', ingreso: fecha(200), alta: fecha(190), centro: 'Hospital Dr. Luis Calvo Mackenna', descripcion: 'Hospitalización por control renal (dato ficticio).', autor: 'Trabajo social (demo)' }],
        bajas: [], ayudas: [], fechaRegistro: diasAtras(45), observaciones: [],
        casos: [{
          id: 'K-01', estado: 'EN_ATENCION', fechaInicio: fecha(40), ultimaActualizacion: diasAtras(19),
          derivaciones: [{ id: 'D-01', fecha: fecha(40), tipoIngreso: 'INGRESO', area: 'DENTAL', origen: 'LLAMADO_SEMANAL', observacion: 'Requiere traslado.', advertenciaIgnorada: false, autor: 'Trabajo social (demo)' }],
          atenciones: [
            { id: 'A-01', fecha: fecha(26), profesional: 'Diego Fuentes · Dental', prestacion: 'Atención dental', numeroSesion: 1, asistencia: 'ASISTIO', resultado: 'REALIZADA', observacion: 'Evaluación inicial; se aplicó flúor.', autor: 'TENS (demo)' },
            { id: 'A-02', fecha: fecha(19), profesional: 'Diego Fuentes · Dental', prestacion: 'Atención dental', numeroSesion: 2, asistencia: 'ASISTIO', resultado: 'REALIZADA', observacion: 'Buena tolerancia; continuar tratamiento.', autor: 'TENS (demo)' },
          ],
          urgencias: [],
        }],
        historial: [
          { fecha: diasAtras(45), tipo: 'Ingreso al programa', detalle: 'Postulación aceptada', autor: 'Trabajo social (demo)' },
          { fecha: diasAtras(40), tipo: 'Derivación', detalle: 'Primera derivación · Dental · llamado semanal', autor: 'Trabajo social (demo)' },
          { fecha: diasAtras(26), tipo: 'Atención', detalle: 'Sesión 1 · Realizada · Atención dental', autor: 'TENS (demo)' },
          { fecha: diasAtras(19), tipo: 'Atención', detalle: 'Sesión 2 · Realizada · Atención dental', autor: 'TENS (demo)' },
        ],
      },
      {
        id: 'B-02', rut: '21234567-9', nombres: 'Tomás', apellidos: 'Díaz Pérez', fechaNacimiento: '2012-08-02', comuna: 'Maipú',
        apoderado: { nombre: 'Andrea Pérez Lagos', telefono: '+56 9 8765 4321', prevision: 'ISAPRE' },
        situacionDocumental: 'POR_VERIFICAR', electrodependiente: true,
        enfermedades: [{ nombre: 'Oncológica' }], centrosSalud: ['Hospital Exequiel González Cortés'], credencial: { tiene: false },
        tutor: 'Francisca Herrera', hospitalizaciones: [], bajas: [], ayudas: [], fechaRegistro: diasAtras(70), observaciones: [],
        casos: [{
          id: 'K-02', estado: 'EN_ATENCION', fechaInicio: fecha(60), ultimaActualizacion: diasAtras(60),
          derivaciones: [{ id: 'D-02', fecha: fecha(60), tipoIngreso: 'INGRESO', area: 'KINESIOLOGIA', origen: 'SOLICITUD_APODERADO', advertenciaIgnorada: false, autor: 'Trabajo social (demo)' }],
          atenciones: [], urgencias: [],
        }],
        historial: [
          { fecha: diasAtras(70), tipo: 'Ingreso al programa', detalle: 'Ingreso registrado antes del sistema', autor: 'Trabajo social (demo)' },
          { fecha: diasAtras(60), tipo: 'Derivación', detalle: 'Primera derivación · Kinesiología · solicitud del apoderado', autor: 'Trabajo social (demo)' },
        ],
      },
    ],
    postulaciones: [
      {
        id: 'P-01', fecha: fecha(3), estado: 'ENVIADA',
        nna: { nombres: 'Sofía', apellidos: 'Muñoz Araya', rut: '22345678-2', fechaNacimiento: '2017-05-21', comuna: 'Recoleta' },
        apoderado: { nombre: 'Inés Araya Núñez', telefono: '+56 9 2222 3333', prevision: 'FONASA' },
        antecedentes: { patologias: ['Neurológica'], centrosSalud: ['Teletón'], credencial: { tiene: true, numero: 'CD-004567', porcentaje: 60 }, electrodependiente: false, descripcion: 'Parálisis cerebral; usa silla de ruedas (dato ficticio).' },
        motivo: 'Requiere apoyo kinesiológico y evaluación dental; familia sin cobertura de traslado.', tutor: 'Francisca Herrera',
      },
      {
        id: 'P-02', fecha: fecha(8), estado: 'EN_EVALUACION',
        nna: { nombres: 'Benjamín', apellidos: 'Soto Lagos', rut: '23456789-6', fechaNacimiento: '2019-11-10', comuna: 'Puente Alto' },
        apoderado: { nombre: 'Carla Lagos Vera', telefono: '+56 9 4444 5555', prevision: 'FONASA' },
        antecedentes: { patologias: ['Respiratoria'], centrosSalud: ['Hospital Sótero del Río'], credencial: { tiene: false }, electrodependiente: true, descripcion: 'Oxígeno domiciliario nocturno (dato ficticio).' },
        motivo: 'Derivado por el hospital para seguimiento y apoyo social.', tutor: 'Francisca Herrera', evaluador: 'Valentina Muñoz',
      },
    ],
    alertas: [],
    notificaciones: [],
    reportes: [],
  };
}
