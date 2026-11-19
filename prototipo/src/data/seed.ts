// Datos iniciales FICTICIOS para demostración y pruebas. No corresponden a personas reales.
import type { EstadoSistema } from '../domain/tipos';

const diasAtras = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};
const fecha = (n: number) => diasAtras(n).slice(0, 10);

export function crearDatosIniciales(): EstadoSistema {
  return {
    version: 1,
    parametros: { umbralDiasAlerta: 14 }, // valor de ensayo; el umbral definitivo está pendiente (DP-04)
    beneficiarios: [
      {
        id: 'B-01', rut: '12345678-5', nombres: 'Camila', apellidos: 'Rojas Soto', comuna: 'Santiago',
        apoderado: { nombre: 'María Soto Pérez', telefono: '+56 9 1234 5678', prevision: 'FONASA' },
        situacionDocumental: 'DOCUMENTADO', electrodependiente: false,
        enfermedades: [{ nombre: 'Renal', descripcion: 'Control nefrológico mensual (dato ficticio).' }],
        hospitalizaciones: [], bajas: [], ayudas: [], fechaRegistro: diasAtras(40),
        observaciones: [],
        casos: [{
          id: 'K-01', estado: 'EN_ATENCION', fechaInicio: fecha(40), ultimaActualizacion: diasAtras(19),
          derivaciones: [{ id: 'D-01', fecha: fecha(40), tipoIngreso: 'INGRESO', area: 'DENTAL', origen: 'LLAMADO_SEMANAL', observacion: 'Requiere traslado.', advertenciaIgnorada: false, autor: 'Trabajo social (demo)' }],
          atenciones: [
            { id: 'A-01', fecha: fecha(26), profesional: 'Diego Fuentes · Dental', prestacion: 'Atención dental', numeroSesion: 1, asistencia: 'ASISTIO', resultado: 'REALIZADA', autor: 'TENS (demo)' },
            { id: 'A-02', fecha: fecha(19), profesional: 'Diego Fuentes · Dental', prestacion: 'Atención dental', numeroSesion: 2, asistencia: 'ASISTIO', resultado: 'REALIZADA', autor: 'TENS (demo)' },
          ],
          urgencias: [],
        }],
        historial: [
          { fecha: diasAtras(40), tipo: 'Derivación', detalle: 'Ingreso · Dental · llamado semanal', autor: 'Trabajo social (demo)' },
          { fecha: diasAtras(26), tipo: 'Atención', detalle: 'Sesión 1 · Realizada · Atención dental', autor: 'TENS (demo)' },
          { fecha: diasAtras(19), tipo: 'Atención', detalle: 'Sesión 2 · Realizada · Atención dental', autor: 'TENS (demo)' },
        ],
      },
      {
        id: 'B-02', rut: '21234567-9', nombres: 'Tomás', apellidos: 'Díaz Pérez', comuna: 'Maipú',
        apoderado: { nombre: 'Andrea Pérez Lagos', telefono: '+56 9 8765 4321', prevision: 'ISAPRE' },
        situacionDocumental: 'POR_VERIFICAR', electrodependiente: true,
        enfermedades: [{ nombre: 'Oncológica' }],
        hospitalizaciones: [], bajas: [], ayudas: [], fechaRegistro: diasAtras(60),
        observaciones: [],
        casos: [{
          id: 'K-02', estado: 'EN_ATENCION', fechaInicio: fecha(60), ultimaActualizacion: diasAtras(41),
          derivaciones: [{ id: 'D-02', fecha: fecha(60), tipoIngreso: 'INGRESO', area: 'KINESIOLOGIA', origen: 'SOLICITUD_APODERADO', advertenciaIgnorada: false, autor: 'Trabajo social (demo)' }],
          atenciones: [], urgencias: [],
        }],
        historial: [
          { fecha: diasAtras(60), tipo: 'Derivación', detalle: 'Ingreso · Kinesiología · solicitud del apoderado', autor: 'Trabajo social (demo)' },
        ],
      },
    ],
    alertas: [],
    notificaciones: [],
    reportes: [],
  };
}
