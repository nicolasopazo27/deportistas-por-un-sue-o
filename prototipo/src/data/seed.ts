// Datos iniciales FICTICIOS para demostración y pruebas. No corresponden a personas reales.
import type { EstadoSistema } from '../domain/tipos';

const diasAtras = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};
const fecha = (n: number) => diasAtras(n).slice(0, 10);

export const VERSION_DATOS = 4;

// ---------- Beneficiarios adicionales FICTICIOS (para que listas, filtros y gráficos se vean con datos) ----------
// Se evitan las comunas Santiago y Puente Alto y la patología Oncológica para no alterar los casos de prueba base.
type Sesion = { dias: number; prof: string; prest: string; ok?: boolean; motivo?: string; obs?: string };
interface Extra {
  id: string; rut: string; nombres: string; apellidos: string; nac: string; comuna: string; apoderado: string; tel: string; prev: string;
  pat: string; centro: string; registro: number; area?: 'DENTAL' | 'KINESIOLOGIA'; derivacion?: number; sesiones?: Sesion[];
  cierre?: number; baja?: { causal: 'EGRESO' | 'DESVINCULACION'; dias: number; obs: string }; ayuda?: { tipo: string; dias: number; guia: string };
  credencial?: number; obs?: { dias: number; texto: string; autor: string };
}
const TS = 'Trabajo social (demo)', TN = 'TENS (demo)';
function construir(x: Extra): EstadoSistema['beneficiarios'][number] {
  const historial = [{ fecha: diasAtras(x.registro), tipo: 'Ingreso al programa', detalle: 'Postulación aceptada', autor: TS }];
  const casos: EstadoSistema['beneficiarios'][number]['casos'] = [];
  if (x.area && x.derivacion !== undefined) {
    const nombreArea = x.area === 'DENTAL' ? 'Dental' : 'Kinesiología';
    historial.push({ fecha: diasAtras(x.derivacion), tipo: 'Derivación', detalle: `Primera derivación · ${nombreArea} · llamado semanal`, autor: TS });
    let n = 0;
    const atenciones = (x.sesiones ?? []).map((a, i) => {
      const realizada = a.ok !== false; if (realizada) n++;
      historial.push({ fecha: diasAtras(a.dias), tipo: 'Atención', detalle: realizada ? `Sesión ${n} · Realizada · ${a.prest}` : `No realizada · ${a.prest} · ${a.motivo}`, autor: TN });
      return { id: `A-${x.id}-${i + 1}`, fecha: fecha(a.dias), profesional: a.prof, prestacion: a.prest, numeroSesion: realizada ? n : undefined,
        asistencia: realizada ? 'ASISTIO' as const : 'NO_ASISTIO' as const, resultado: realizada ? 'REALIZADA' as const : 'NO_REALIZADA' as const,
        motivo: realizada ? undefined : a.motivo, observacion: a.obs, autor: TN };
    });
    const cerrado = x.cierre !== undefined || !!x.baja;
    const ultima = Math.min(x.derivacion, ...(x.sesiones ?? []).map(a => a.dias));
    casos.push({ id: `K-${x.id}`, estado: cerrado ? 'ATENDIDO' : 'EN_ATENCION', fechaInicio: fecha(x.derivacion), ultimaActualizacion: diasAtras(x.cierre ?? ultima),
      fechaCierreCiclo: cerrado ? fecha(x.cierre ?? x.baja!.dias) : undefined,
      derivaciones: [{ id: `D-${x.id}`, fecha: fecha(x.derivacion), tipoIngreso: 'INGRESO', area: x.area, origen: 'LLAMADO_SEMANAL', advertenciaIgnorada: false, autor: TS }],
      atenciones, urgencias: [] } as EstadoSistema['beneficiarios'][number]['casos'][number]);
    if (x.cierre !== undefined) historial.push({ fecha: diasAtras(x.cierre), tipo: 'Ciclo terminado', detalle: `Ciclo de ${nombreArea} completado`, autor: TN });
  }
  if (x.ayuda) historial.push({ fecha: diasAtras(x.ayuda.dias), tipo: 'Ayuda entregada', detalle: `${x.ayuda.tipo} · guía ${x.ayuda.guia}`, autor: TS });
  if (x.baja) historial.push({ fecha: diasAtras(x.baja.dias), tipo: 'Baja', detalle: `${x.baja.causal === 'EGRESO' ? 'Egreso' : 'Desvinculación'} · ${x.baja.obs}`, autor: TS });
  historial.sort((a, b) => a.fecha.localeCompare(b.fecha));
  return {
    id: x.id, rut: x.rut, nombres: x.nombres, apellidos: x.apellidos, fechaNacimiento: x.nac, comuna: x.comuna,
    apoderado: { nombre: x.apoderado, telefono: x.tel, prevision: x.prev }, situacionDocumental: 'DOCUMENTADO', electrodependiente: false,
    enfermedades: [{ nombre: x.pat }], centrosSalud: [x.centro], credencial: x.credencial ? { tiene: true, numero: `CD-0${x.rut.slice(0, 5)}`, porcentaje: x.credencial } : { tiene: false },
    hospitalizaciones: [], fechaRegistro: diasAtras(x.registro),
    bajas: x.baja ? [{ id: `BJ-${x.id}`, causal: x.baja.causal, fecha: fecha(x.baja.dias), observacion: x.baja.obs, autor: TS }] : [],
    ayudas: x.ayuda ? [{ id: `AY-${x.id}`, tipo: x.ayuda.tipo, fecha: fecha(x.ayuda.dias), numeroGuia: x.ayuda.guia, autor: TS }] : [],
    observaciones: x.obs ? [{ id: `O-${x.id}`, fechaHora: diasAtras(x.obs.dias), texto: x.obs.texto, autor: x.obs.autor }] : [],
    casos, historial,
  } as EstadoSistema['beneficiarios'][number];
}
const DEN = 'Diego Fuentes · Dental', DEN2 = 'Paula Vera · Dental', KIN = 'Camila Ríos · Kinesiología';
const EXTRAS: Extra[] = [
  { id: 'B-03', rut: '20111222-2', nombres: 'Josefa', apellidos: 'Reyes Castro', nac: '2014-06-12', comuna: 'La Florida', apoderado: 'Paola Castro Ríos', tel: '+56 9 3111 2233', prev: 'FONASA', pat: 'Renal', centro: 'Hospital Sótero del Río', registro: 38, area: 'DENTAL', derivacion: 32, credencial: 30,
    sesiones: [{ dias: 25, prof: DEN, prest: 'Atención dental', obs: 'Evaluación inicial.' }, { dias: 14, prof: DEN, prest: 'Atención dental' }, { dias: 4, prof: DEN, prest: 'Atención dental', obs: 'Tratamiento avanzando bien.' }] },
  { id: 'B-04', rut: '19876123-0', nombres: 'Matías', apellidos: 'González Fuentes', nac: '2011-02-03', comuna: 'Peñalolén', apoderado: 'Rodrigo González Vidal', tel: '+56 9 4555 6677', prev: 'ISAPRE', pat: 'Neurológica', centro: 'Teletón', registro: 27, area: 'KINESIOLOGIA', derivacion: 21,
    sesiones: [{ dias: 13, prof: KIN, prest: 'Kinesiología', obs: 'Plan de ejercicios en casa.' }, { dias: 6, prof: KIN, prest: 'Kinesiología' }], obs: { dias: 6, texto: 'Apoderado pide horario de tarde (dato ficticio).', autor: 'Valentina Muñoz' } },
  { id: 'B-05', rut: '22987456-K', nombres: 'Isidora', apellidos: 'Pino Herrera', nac: '2016-09-30', comuna: 'Recoleta', apoderado: 'Daniela Herrera Soto', tel: '+56 9 6888 1122', prev: 'FONASA', pat: 'Cardiopatía', centro: 'Hospital Roberto del Río', registro: 9, area: 'DENTAL', derivacion: 3 },
  { id: 'B-06', rut: '21555333-7', nombres: 'Joaquín', apellidos: 'Muñoz Silva', nac: '2012-12-01', comuna: 'San Bernardo', apoderado: 'Claudia Silva Mora', tel: '+56 9 7222 3344', prev: 'FONASA', pat: 'Respiratoria', centro: 'Hospital Exequiel González Cortés', registro: 120, area: 'KINESIOLOGIA', derivacion: 110, cierre: 12,
    sesiones: [{ dias: 95, prof: KIN, prest: 'Kinesiología' }, { dias: 70, prof: KIN, prest: 'Kinesiología' }, { dias: 40, prof: KIN, prest: 'Kinesiología' }, { dias: 12, prof: KIN, prest: 'Kinesiología', obs: 'Alta kinesiológica.' }] },
  { id: 'B-07', rut: '23111444-0', nombres: 'Florencia', apellidos: 'Vera Ramírez', nac: '2018-04-17', comuna: 'Maipú', apoderado: 'Natalia Ramírez Pinto', tel: '+56 9 8111 4455', prev: 'Sin previsión', pat: 'Neurológica', centro: 'CESFAM de la comuna', registro: 2, credencial: 50 },
  { id: 'B-08', rut: '20444777-2', nombres: 'Agustín', apellidos: 'Rojas Morales', nac: '2009-07-08', comuna: 'La Florida', apoderado: 'Patricio Rojas Leiva', tel: '+56 9 5333 7788', prev: 'FONASA', pat: 'Renal', centro: 'Hospital Sótero del Río', registro: 210, area: 'DENTAL', derivacion: 200,
    sesiones: [{ dias: 180, prof: DEN2, prest: 'Atención dental' }, { dias: 150, prof: DEN2, prest: 'Atención dental' }, { dias: 30, prof: DEN2, prest: 'Atención dental' }], baja: { causal: 'EGRESO', dias: 15, obs: 'Cumplió 18 años y completó su tratamiento' } },
  { id: 'B-09', rut: '22222111-0', nombres: 'Antonia', apellidos: 'Castillo Díaz', nac: '2015-01-25', comuna: 'Peñalolén', apoderado: 'Verónica Díaz Rojas', tel: '+56 9 9444 5566', prev: 'FONASA', pat: 'Respiratoria', centro: 'Hospital Sótero del Río', registro: 18, area: 'KINESIOLOGIA', derivacion: 12,
    sesiones: [{ dias: 5, prof: KIN, prest: 'Kinesiología', obs: 'Requiere traslado para próximas sesiones.' }], ayuda: { tipo: 'Traslado', dias: 5, guia: 'GT-2041' } },
  { id: 'B-10', rut: '19333888-7', nombres: 'Lucas', apellidos: 'Fernández Torres', nac: '2010-10-14', comuna: 'Recoleta', apoderado: 'Marcela Torres Vega', tel: '+56 9 2777 8899', prev: 'ISAPRE', pat: 'Cardiopatía', centro: 'Hospital Roberto del Río', registro: 160, area: 'DENTAL', derivacion: 150,
    sesiones: [{ dias: 140, prof: DEN, prest: 'Atención dental' }, { dias: 120, prof: DEN, prest: 'Atención dental', ok: false, motivo: 'Falta de adherencia al programa' }], baja: { causal: 'DESVINCULACION', dias: 30, obs: 'Familia se trasladó a otra región' } },
  { id: 'B-11', rut: '24015632-6', nombres: 'Emilia', apellidos: 'Navarro Pizarro', nac: '2017-03-09', comuna: 'San Bernardo', apoderado: 'Felipe Navarro Cid', tel: '+56 9 3666 1200', prev: 'FONASA', pat: 'Neurológica', centro: 'Teletón', registro: 24, area: 'DENTAL', derivacion: 18, credencial: 70,
    sesiones: [{ dias: 8, prof: DEN2, prest: 'Atención dental', ok: false, motivo: 'Contraindicación médica' }, { dias: 2, prof: DEN2, prest: 'Atención dental', obs: 'Se realizó con sedación consciente.' }] },
  { id: 'B-12', rut: '21789004-7', nombres: 'Vicente', apellidos: 'Soto Carrasco', nac: '2013-11-19', comuna: 'Maipú', apoderado: 'Lorena Carrasco Bravo', tel: '+56 9 4123 9876', prev: 'FONASA', pat: 'Por completar', centro: 'CESFAM de la comuna', registro: 6 },
];


export function crearDatosIniciales(): EstadoSistema {
  return {
    version: VERSION_DATOS,
    // Valores de ensayo: el umbral definitivo está pendiente de validación con la Fundación (DP-04).
    parametros: { umbralDiasAlerta: 14, umbralDiasDerivacion: 7 },
    // Consolidado anual FICTICIO de las planillas Excel previas al sistema, para comparar años en el Inicio.
    // El año en curso suma estos valores de enero a la puesta en marcha más lo registrado en el sistema.
    historico: [
      { anio: 2022, postulaciones: 96, ingresos: 74, bajas: { EGRESO: 18, DESVINCULACION: 9, FALLECIMIENTO: 2 }, derivaciones: { DENTAL: 120, KINESIOLOGIA: 85, OTRA: 30 }, atenciones: 1480 },
      { anio: 2023, postulaciones: 112, ingresos: 88, bajas: { EGRESO: 22, DESVINCULACION: 11, FALLECIMIENTO: 3 }, derivaciones: { DENTAL: 140, KINESIOLOGIA: 101, OTRA: 36 }, atenciones: 1720 },
      { anio: 2024, postulaciones: 131, ingresos: 97, bajas: { EGRESO: 27, DESVINCULACION: 12, FALLECIMIENTO: 2 }, derivaciones: { DENTAL: 158, KINESIOLOGIA: 118, OTRA: 41 }, atenciones: 1950 },
      { anio: 2025, postulaciones: 148, ingresos: 109, bajas: { EGRESO: 31, DESVINCULACION: 14, FALLECIMIENTO: 4 }, derivaciones: { DENTAL: 176, KINESIOLOGIA: 134, OTRA: 47 }, atenciones: 2210 },
      { anio: 2026, postulaciones: 121, ingresos: 90, bajas: { EGRESO: 20, DESVINCULACION: 9, FALLECIMIENTO: 2 }, derivaciones: { DENTAL: 150, KINESIOLOGIA: 112, OTRA: 39 }, atenciones: 1890 },
    ],
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
      ...EXTRAS.map(construir),
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
