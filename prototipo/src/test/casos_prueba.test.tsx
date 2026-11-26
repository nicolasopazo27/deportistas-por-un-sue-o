// Casos de prueba del prototipo (Matriz 03). Integración de componentes React con DOM emulado (jsdom).
// Cada caso parte del conjunto inicial ficticio (2 beneficiarios y 2 postulaciones) y deja su evidencia en pruebas/evidencias/.
import { beforeEach, describe, expect, it } from 'vitest';
import { screen, within, waitFor, cleanup } from '@testing-library/react';
import { act } from 'react';
import { almacenamiento, evidencia, ingresar, ir, montar, reiniciarEntorno } from './ayudantes';
import { crearDatosIniciales } from '../data/seed';
import { calcularEstadisticas } from '../data/estadisticas';
import { actualizarFicha, actualizarFoto, cambiarPermiso, evaluarPostulacion, registrarBaja, restablecerPermisos, marcarAlertaRevisada, registrarAtencion, registrarPostulacionPublica, revisarAlertas } from '../data/servicios';
import { consolidar, generarXlsx } from '../modules/reportes/exportar';
import type { Usuario } from '../domain/tipos';
import ExcelJS from 'exceljs';

const ADMIN = 'admin@demo.cl', SOCIAL = 'social@demo.cl', TENS = 'tens@demo.cl', CONSULTA = 'consulta@demo.cl', TUTOR = 'tutor@demo.cl', COMUNICACION = 'comunicacion@demo.cl';
const U_SOCIAL: Usuario = { id: 'U-01', nombre: 'Valentina Muñoz', email: SOCIAL, rol: 'TRABAJO_SOCIAL' };
const U_ADMIN: Usuario = { id: 'U-07', nombre: 'Patricia Soto', email: ADMIN, rol: 'ADMIN' };
const U_TUTOR: Usuario = { id: 'U-06', nombre: 'Francisca Herrera', email: TUTOR, rol: 'TUTOR' };
const nBenef = () => almacenamiento().beneficiarios.length;
const camila = () => almacenamiento().beneficiarios.find((b: { id: string }) => b.id === 'B-01');
const tomas = () => almacenamiento().beneficiarios.find((b: { id: string }) => b.id === 'B-02');
const POST_OK = { nombres: 'Martina', apellidos: 'Núñez Peña', rut: '9876543-3', fechaNacimiento: '2016-04-02', comuna: 'Peñalolén', apoderado: 'Jorge Núñez', telefono: '+56 9 7777 8888', prevision: 'FONASA', patologias: ['Neurológica'], centrosSalud: ['Teletón'], credencial: true, numeroCredencial: 'CD-777', porcentaje: '50', electrodependiente: false, descripcion: 'Dato ficticio', motivo: 'Requiere apoyo kinesiológico' };

async function llenarPostulacion(user: ReturnType<typeof montar>['user'], d: { nombres: string; apellidos: string; rut: string; telefono: string }) {
  await user.type(screen.getByLabelText('Nombres *'), d.nombres);
  await user.type(screen.getByLabelText('Apellidos *'), d.apellidos);
  await user.type(screen.getByLabelText('RUT del NNA *'), d.rut);
  await user.selectOptions(screen.getByLabelText('Comuna *'), 'Recoleta');
  await user.type(screen.getByLabelText('Nombre del apoderado *'), 'Inés Araya Núñez');
  await user.type(screen.getByLabelText('Teléfono *'), d.telefono);
  await user.click(screen.getByLabelText('Neurológica'));
  await user.type(screen.getByLabelText('Motivo de la postulación *'), 'Requiere apoyo kinesiológico (dato ficticio).');
}
async function elegirBeneficiario(user: ReturnType<typeof montar>['user'], texto: string, nombre: string) {
  await user.type(screen.getByLabelText('Buscar beneficiario ingresado (nombre o RUT) *'), texto);
  await user.click(await screen.findByRole('option', { name: new RegExp(nombre) }));
}

beforeEach(() => reiniciarEntorno());

describe('Matriz 03 · prototipo v2', () => {
  it('CP-P01 · M8 · postulación pública vacía rechazada; la gestión interna no registra postulaciones', async () => {
    const { user } = montar(); await act(() => ir('/postular'));
    await user.click(screen.getByRole('button', { name: 'Enviar postulación' }));
    const errores = screen.getAllByRole('alert').map(e => e.textContent);
    await act(() => ir('/ingreso')); await ingresar(user, ADMIN); await act(() => ir('/postulaciones'));
    const sinBotonInterno = screen.queryByRole('button', { name: 'Nueva postulación' }) === null && screen.queryByLabelText('Nombres *') === null;
    const ok = almacenamiento().postulaciones.length === 2 && errores.length >= 7 && sinBotonInterno;
    evidencia('CP-P01', { requisito: 'M8 (observación mandante), RF-01 · postulación pública (revisión final)', prueba: 'Enviar vacío el formulario público de postulación (sin sesión); luego abrir Postulaciones en la gestión interna como Administrador.', esperado: 'Se rechaza sin crear postulación indicando los campos obligatorios; la gestión interna no ofrece registrar postulaciones.', obtenido: `Postulaciones: ${almacenamiento().postulaciones.length}. Errores (${errores.length}): ${errores.join(' | ')}. Formulario o botón interno de postulación: ${sinBotonInterno ? 'no existe' : 'presente'}.`, aprobada: ok });
    expect(ok).toBe(true);
  });

  it('CP-P02 · M8, RF-04 · postulación pública, aceptación e ingreso con recuperación tras remontar', async () => {
    const r1 = montar(); await act(() => ir('/postular'));
    await llenarPostulacion(r1.user, { nombres: 'Martina', apellidos: 'Núñez Peña', rut: '9876543-3', telefono: '+56 9 7777 8888' });
    await r1.user.click(screen.getByRole('button', { name: 'Enviar postulación' }));
    await screen.findByText('¡Postulación enviada!');
    const p = almacenamiento().postulaciones.at(-1);
    r1.unmount(); cleanup(); window.sessionStorage.clear(); window.location.hash = '#/ingreso';
    const r2 = montar(); await ingresar(r2.user, SOCIAL); await act(() => ir(`/postulaciones?p=${p.id}`));
    await r2.user.click(screen.getByRole('button', { name: 'Aceptar e ingresar al programa' }));
    await r2.user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Aceptar postulación' }));
    await screen.findByLabelText(/Ficha de Martina Núñez Peña/);
    r2.unmount(); cleanup();
    const r3 = montar(); await act(() => ir('/beneficiarios'));
    await r3.user.click(await screen.findByRole('button', { name: 'Martina Núñez Peña' }));
    const ficha = screen.getByLabelText(/Ficha de Martina/);
    const b = almacenamiento().beneficiarios.at(-1);
    const ok = nBenef() === 3 && p.tutor === 'Inés Araya Núñez' && p.origen === 'WEB' && almacenamiento().postulaciones.find((x: { id: string }) => x.id === p.id).estado === 'ACEPTADA' && b.historial[0].tipo === 'Ingreso al programa' && within(ficha).getByText(/9876543-3/) !== null;
    evidencia('CP-P02', { requisito: 'M8, RF-01, RF-04', prueba: 'Un apoderado envía la postulación desde el formulario público (sin sesión); Trabajo social la acepta; se remonta la aplicación y se abre la ficha.', esperado: 'La postulación queda aceptada, se crea la ficha (ingreso al programa) y se recupera tras remontar.', obtenido: `Postulación ${p.id} enviada en línea por ${p.tutor} (origen ${p.origen}); estado final ACEPTADA; beneficiarios: ${nBenef()}; primer evento: «${b.historial[0].tipo}»; ficha recuperada tras remontar. Persistencia local (no SQL).`, aprobada: ok });
    expect(ok).toBe(true);
  });

  it('CP-P03 · RF-02 · advertencia de caso activo al derivar y cancelar no duplica', async () => {
    const { user } = montar(); await ingresar(user, SOCIAL); await act(() => ir('/derivaciones'));
    await elegirBeneficiario(user, '12345678', 'Camila Rojas Soto');
    await user.selectOptions(screen.getByLabelText('Prestación a la que se deriva *'), 'DENTAL');
    await user.click(screen.getByRole('button', { name: 'Guardar derivación' }));
    const modal = await screen.findByRole('dialog', { name: 'Caso activo encontrado' });
    const muestra = within(modal).getByText(/Camila Rojas Soto · Santiago/) !== null;
    await user.click(within(modal).getByRole('button', { name: 'Cancelar' }));
    const derivs = camila().casos[0].derivaciones.length;
    const ok = muestra && nBenef() === 2 && derivs === 1 && camila().casos.length === 1;
    evidencia('CP-P03', { requisito: 'RF-02', prueba: 'Buscar por RUT a Camila (caso activo), derivar a Dental y cancelar ante la advertencia.', esperado: 'Se muestra el caso activo y cancelar no crea caso ni derivación.', obtenido: `Advertencia con el caso de Camila Rojas Soto. Beneficiarios: ${nBenef()}; casos: ${camila().casos.length}; derivaciones del caso: ${derivs}.`, aprobada: ok });
    expect(ok).toBe(true);
  });

  it('CP-P04 · RF-12 · filtro por comuna', async () => {
    const { user } = montar(); await ingresar(user, SOCIAL); await act(() => ir('/beneficiarios'));
    await user.selectOptions(screen.getByLabelText('Filtro comuna'), 'Santiago');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    const filas1 = within(screen.getByLabelText('Listado de beneficiarios')).getAllByRole('row').slice(1).map(r => r.textContent ?? '');
    await user.selectOptions(screen.getByLabelText('Filtro comuna'), 'Puente Alto');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    const vacio = screen.queryByText('Sin resultados para los filtros seleccionados.') !== null;
    const ok = filas1.length === 1 && filas1[0].includes('Camila Rojas Soto') && vacio && nBenef() === 2;
    evidencia('CP-P04', { requisito: 'RF-12', prueba: 'Filtrar por Santiago y luego por Puente Alto.', esperado: 'Santiago devuelve solo a Camila; Puente Alto queda sin resultados.', obtenido: `Santiago: ${filas1.length} fila(s). Puente Alto: ${vacio ? 'sin resultados' : 'con filas'}. Fichas sin modificar.`, aprobada: ok });
    expect(ok).toBe(true);
  });

  it('CP-P05 · RF-13 · filtro por enfermedad', async () => {
    const { user } = montar(); await ingresar(user, SOCIAL); await act(() => ir('/beneficiarios'));
    await user.selectOptions(screen.getByLabelText('Filtro enfermedad'), 'Oncológica');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    const filas = within(screen.getByLabelText('Listado de beneficiarios')).getAllByRole('row').slice(1).map(r => r.textContent ?? '');
    const ok = filas.length === 1 && filas[0].includes('Tomás Díaz Pérez');
    evidencia('CP-P05', { requisito: 'RF-13', prueba: 'Filtrar por la enfermedad Oncológica con perfil Trabajo social.', esperado: 'Solo aparece Tomás Díaz Pérez.', obtenido: `${filas.length} fila(s): ${filas.map(f => f.replace(/^[A-Z]{2}/, '').slice(0, 16)).join(', ')}.`, aprobada: ok });
    expect(ok).toBe(true);
  });

  it('CP-P06 · RF-06, RF-21, RF-03 · atención realizada con observación suma sesión y avisa al área social', async () => {
    const { user } = montar(); await ingresar(user, TENS); await act(() => ir('/atenciones?b=B-01'));
    await user.selectOptions(screen.getByLabelText('Profesional *'), 'Diego Fuentes · Dental');
    await user.selectOptions(screen.getByLabelText('Prestación *'), 'Atención dental');
    await user.selectOptions(screen.getByLabelText('Asistencia *'), 'ASISTIO');
    await user.selectOptions(screen.getByLabelText('Resultado *'), 'REALIZADA');
    await user.type(screen.getByLabelText('Observación de la atención'), 'Buena tolerancia');
    await user.click(screen.getByRole('button', { name: 'Guardar atención' }));
    await screen.findByText(/Atención guardada/);
    const c = camila().casos[0];
    const ult = c.atenciones.at(-1);
    const aviso = almacenamiento().notificaciones.some((n: { tipo: string; rolDestino: string }) => n.tipo === 'ATENCION_REALIZADA' && n.rolDestino === 'TRABAJO_SOCIAL');
    const ok = c.atenciones.length === 3 && ult.numeroSesion === 3 && ult.observacion === 'Buena tolerancia' && aviso && camila().historial.at(-1).detalle.includes('Sesión 3');
    evidencia('CP-P06', { requisito: 'RF-06, RF-21, RF-03 · observación por atención (mandante)', prueba: 'TENS registra una atención realizada con observación para Camila.', esperado: 'Se guarda la atención con su observación, suma una sesión, queda en el historial y se avisa al área social.', obtenido: `Atenciones 2 → ${c.atenciones.length}; sesión ${ult.numeroSesion}; observación «${ult.observacion}»; historial: «${camila().historial.at(-1).detalle}»; aviso al área social: ${aviso ? 'sí' : 'no'}.`, aprobada: ok });
    expect(ok).toBe(true);
  });

  it('CP-P07 · RF-07 · atención no realizada sin motivo rechazada', async () => {
    const { user } = montar(); await ingresar(user, TENS); await act(() => ir('/atenciones?b=B-01'));
    await user.selectOptions(screen.getByLabelText('Profesional *'), 'Diego Fuentes · Dental');
    await user.selectOptions(screen.getByLabelText('Prestación *'), 'Atención dental');
    await user.selectOptions(screen.getByLabelText('Asistencia *'), 'NO_ASISTIO');
    await user.selectOptions(screen.getByLabelText('Resultado *'), 'NO_REALIZADA');
    await user.click(screen.getByRole('button', { name: 'Guardar atención' }));
    const msg = screen.queryByText('Debe indicar el motivo para guardar una atención no realizada.') !== null;
    const ok = msg && camila().casos[0].atenciones.length === 2;
    evidencia('CP-P07', { requisito: 'RF-07', prueba: 'Guardar una atención No realizada sin motivo.', esperado: 'Se rechaza el guardado y se exige el motivo.', obtenido: `Mensaje de motivo obligatorio: ${msg ? 'visible' : 'no visible'}; atenciones sin cambios (${camila().casos[0].atenciones.length}).`, aprobada: ok });
    expect(ok).toBe(true);
  });

  it('CP-P08 · RF-08 · alertas por umbral (caso y derivación) y revisión individual', async () => {
    const { user } = montar(); await ingresar(user, SOCIAL); await act(() => ir('/alertas'));
    const al0 = almacenamiento().alertas;
    const fila = within(screen.getByLabelText('Alertas')).getByText('Tomás Díaz Pérez').closest('tr')!;
    const tipoTxt = fila.textContent ?? '';
    await user.click(within(fila).getByRole('button', { name: 'Revisar' }));
    const al = almacenamiento().alertas;
    const t = al.find((a: { idBeneficiario: string }) => a.idBeneficiario === 'B-02');
    const c = al.find((a: { idBeneficiario: string }) => a.idBeneficiario === 'B-01');
    const ok = al0.length === 2 && t.tipo === 'DERIVACION_SIN_ATENCION' && c.tipo === 'CASO_SIN_ACTUALIZACION' && tipoTxt.includes('Derivación sin atención') && t.estado === 'REVISADA' && c.estado === 'ACTIVA' && tomas().historial.at(-1).tipo === 'Revisión de alerta';
    evidencia('CP-P08', { requisito: 'RF-08 · alertas asociadas a derivaciones (mandante)', prueba: 'Abrir Alertas (umbrales de ensayo: caso 14 días, derivación 7 días) y revisar la alerta de Tomás.', esperado: 'Se genera alerta de derivación sin atención (Tomás) y de caso sin actualización (Camila); solo la elegida pasa a Revisada.', obtenido: `Alertas al abrir: ${al0.length}. Tomás: ${t.tipo} → ${t.estado}; Camila: ${c.tipo} → ${c.estado}; historial: «${tomas().historial.at(-1).tipo}».`, aprobada: ok });
    expect(ok).toBe(true);
  });

  it('CP-P09 · RF-09 · baja con causal conserva el historial', async () => {
    const { user } = montar(); await ingresar(user, SOCIAL); await act(() => ir('/bajas?b=B-01'));
    const h0 = camila().historial.length;
    await user.selectOptions(screen.getByLabelText('Causal de baja (obligatoria) *'), 'EGRESO');
    await user.click(screen.getByRole('button', { name: 'Confirmar baja' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Registrar baja' }));
    await act(() => ir('/beneficiarios?b=B-01'));
    const fila = within(screen.getByLabelText('Listado de beneficiarios')).getByText('Camila Rojas Soto').closest('tr')!.textContent ?? '';
    const c = camila();
    const ok = c.bajas.length === 1 && c.bajas[0].causal === 'EGRESO' && c.historial.length === h0 + 1 && fila.includes('Baja');
    evidencia('CP-P09', { requisito: 'RF-09', prueba: 'Registrar baja por Egreso de Camila y consultar el listado.', esperado: 'La baja queda con causal; el estado muestra Baja y el historial previo se conserva.', obtenido: `Bajas: ${c.bajas.length} (${c.bajas[0]?.causal}); historial ${h0} → ${c.historial.length}; listado muestra estado Baja.`, aprobada: ok });
    expect(ok).toBe(true);
  });

  it('CP-P10 · RF-18 · ayuda sin número de guía rechazada', async () => {
    const { user } = montar(); await ingresar(user, SOCIAL); await act(() => ir('/ayudas?b=B-01'));
    await user.selectOptions(screen.getByLabelText('Tipo de ayuda entregada *'), 'Insumos');
    await user.click(screen.getByRole('button', { name: 'Guardar entrega' }));
    const msg = screen.queryByText('Ingrese el número de guía o comprobante de entrega.') !== null;
    const ok = msg && camila().ayudas.length === 0;
    evidencia('CP-P10', { requisito: 'RF-18', prueba: 'Guardar una entrega sin número de guía.', esperado: 'Se pide la guía y no se crea una entrega incompleta.', obtenido: `Mensaje de guía: ${msg ? 'visible' : 'no'}; ayudas registradas: ${camila().ayudas.length}.`, aprobada: ok });
    expect(ok).toBe(true);
  });

  it('CP-P11 · RNF-3 · perfil Consulta no guarda atenciones ni ve datos de salud', async () => {
    const { user } = montar(); await ingresar(user, CONSULTA); await act(() => ir('/atenciones?b=B-01'));
    const deshab = (screen.getByRole('button', { name: 'Guardar atención' }) as HTMLButtonElement).disabled;
    await act(() => ir('/beneficiarios?b=B-01'));
    const restringido = screen.getAllByText('Acceso restringido para su perfil').length >= 2;
    await user.click(screen.getByRole('tab', { name: 'Antecedentes' }));
    const antecRestr = screen.queryByText(/antecedentes de salud del NNA están restringidos/) !== null;
    const ok = deshab && restringido && antecRestr && screen.queryByLabelText('Filtro enfermedad') === null;
    evidencia('CP-P11', { requisito: 'RNF-3', prueba: 'Ingresar con perfil Consulta a Atenciones y a la ficha (pestañas Resumen y Antecedentes).', esperado: 'Guardar atención deshabilitado; datos sensibles y antecedentes de salud ocultos.', obtenido: `Guardar atención deshabilitado: ${deshab}; datos restringidos en resumen: ${restringido}; antecedentes restringidos: ${antecRestr}. Control en el navegador; la autorización en servidor corresponde a la etapa con backend.`, aprobada: ok });
    expect(ok).toBe(true);
  });

  it('CP-P12 · RF-18, RF-20 · TENS no registra entregas pero sí marca urgencia', async () => {
    const { user } = montar(); await ingresar(user, TENS); await act(() => ir('/ayudas?b=B-01'));
    const boton = screen.getByRole('button', { name: 'Guardar entrega' }) as HTMLButtonElement;
    await user.click(screen.getByRole('button', { name: 'Marcar urgencia' }));
    const ok = boton.disabled && camila().ayudas.length === 0 && camila().casos[0].urgencias.length === 1;
    evidencia('CP-P12', { requisito: 'RF-18, RF-20 (corrección de INC-02)', prueba: 'Con perfil TENS, intentar registrar una entrega y marcar urgencia.', esperado: 'TENS no puede registrar entregas (reservado al equipo social) pero sí marcar urgencia.', obtenido: `Guardar entrega deshabilitado: ${boton.disabled}; ayudas: ${camila().ayudas.length}; urgencias: ${camila().casos[0].urgencias.length}.`, aprobada: ok });
    expect(ok).toBe(true);
  });

  it('CP-P13 · M8, RF-01 · RUT y teléfono demasiado largos en la postulación', async () => {
    const { user } = montar(); await act(() => ir('/postular'));
    await llenarPostulacion(user, { nombres: 'Prueba', apellidos: 'Larga Uno', rut: '1234567890123-5', telefono: '+56 9 1234 5678 9999 0000' });
    await user.click(screen.getByRole('button', { name: 'Enviar postulación' }));
    const rut = screen.queryByText(/El RUT es demasiado largo/) !== null, tel = screen.queryByText('El teléfono es demasiado largo.') !== null;
    const ok = rut && tel && almacenamiento().postulaciones.length === 2;
    evidencia('CP-P13', { requisito: 'M8, RF-01', prueba: 'Ingresar RUT y teléfono con largo excesivo en el formulario público de postulación.', esperado: 'El formulario rechaza ambos datos y no guarda.', obtenido: `Error RUT: ${rut}; error teléfono: ${tel}; postulaciones: ${almacenamiento().postulaciones.length}.`, aprobada: ok });
    expect(ok).toBe(true);
  });

  it('CP-P14 · RNF-3 · acceso directo a una ficha sin sesión', async () => {
    window.location.hash = '#/beneficiarios?b=B-01';
    montar();
    await screen.findByRole('button', { name: 'Ingresar' });
    const sinDatos = screen.queryByText('Camila Rojas Soto') === null && screen.queryByText(/12345678-5/) === null;
    const ok = window.location.hash.startsWith('#/ingreso') && sinDatos;
    evidencia('CP-P14', { requisito: 'RNF-3', prueba: 'Abrir la URL de una ficha con la sesión cerrada.', esperado: 'Se redirige al inicio de sesión sin mostrar datos.', obtenido: `Ruta final: ${window.location.hash}; datos de la ficha visibles: ${!sinDatos}. Autenticación simulada en el navegador.`, aprobada: ok });
    expect(ok).toBe(true);
  });

  it('CP-P15 · RF-08 · límite del umbral y ciclo de la alerta', () => {
    const e = crearDatosIniciales(); e.parametros.umbralDiasAlerta = 10;
    const hoy = new Date();
    const hace = (n: number) => { const d = new Date(hoy); d.setDate(d.getDate() - n); return d.toISOString(); };
    const base = e.beneficiarios[0];
    e.beneficiarios = [9, 10, 11].map((n, i) => ({ ...structuredClone(base), id: `T-${i}`, rut: `1000000${i}-0`, casos: [{ ...structuredClone(base.casos[0]), id: `KT-${i}`, ultimaActualizacion: hace(n) }] }));
    const n1 = revisarAlertas(e, hoy), n2 = revisarAlertas(e, hoy);
    const u: Usuario = { id: 'U-03', nombre: 'Javiera Lagos', email: TENS, rol: 'TENS' };
    registrarAtencion(e, u, 'T-2', { fecha: hoy.toISOString().slice(0, 10), profesional: 'Diego Fuentes · Dental', prestacion: 'Atención dental', asistencia: 'ASISTIO', resultado: 'REALIZADA' });
    const ok = n1 === 1 && e.alertas[0].idCaso === 'KT-2' && n2 === 0 && e.alertas[0].estado === 'RESUELTA';
    evidencia('CP-P15', { requisito: 'RF-08', prueba: 'Casos con T−1, T y T+1 días (T=10); revisar dos veces; actualizar el caso T+1.', esperado: 'Solo T+1 genera alerta; la segunda revisión no duplica; al actualizar el caso la alerta se resuelve.', obtenido: `Primera revisión: ${n1} alerta (caso ${e.alertas[0]?.idCaso}); segunda: ${n2}; estado tras actualizar: ${e.alertas[0]?.estado}.`, aprobada: ok });
    expect(ok).toBe(true);
  });

  it('CP-P16 · RF-02 · continuar tras la advertencia asocia al caso activo', async () => {
    const { user } = montar(); await ingresar(user, COMUNICACION); await act(() => ir('/derivaciones'));
    await elegirBeneficiario(user, 'Camila', 'Camila Rojas Soto');
    await user.selectOptions(screen.getByLabelText('Prestación a la que se deriva *'), 'KINESIOLOGIA');
    await user.click(screen.getByRole('button', { name: 'Guardar derivación' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Asociar al caso activo' }));
    const c = camila();
    const ok = nBenef() === 2 && c.casos.length === 1 && c.casos[0].derivaciones.length === 2 && c.casos[0].derivaciones[1].advertenciaIgnorada === true;
    evidencia('CP-P16', { requisito: 'RF-02', prueba: 'Encargada de comunicación confirma la advertencia de caso activo al derivar a Camila.', esperado: 'Con el supuesto DP-02, la derivación se asocia al caso activo sin crear otro caso ni otra ficha.', obtenido: `Beneficiarios: ${nBenef()}; casos: ${c.casos.length}; derivaciones del caso: ${c.casos[0].derivaciones.length}; advertencia_ignorada: ${c.casos[0].derivaciones[1]?.advertenciaIgnorada}. Regla pendiente de validación (DP-02).`, aprobada: ok });
    expect(ok).toBe(true);
  });

  it('CP-P17 · RF-11, RNF-4 · informe mensual XLSX íntegro con tildes y ñ', async () => {
    const e = crearDatosIniciales();
    const hoy = new Date().toISOString().slice(0, 10);
    registrarPostulacionPublica(e, { ...POST_OK, nombres: 'Sofía', apellidos: 'Ñúñez Peña', rut: '9876543-3' });
    const tablas = consolidar(e, 'INFORME_MENSUAL', '2000-01-01', hoy, false);
    const origen = tablas.reduce((s, t) => s + t.filas.length, 0);
    const { buffer, filasVerificadas } = await generarXlsx(tablas);
    const wb = new ExcelJS.Workbook(); await wb.xlsx.load(buffer);
    const textos = wb.getWorksheet('Postulaciones')!.getSheetValues().flat().map(String);
    const conserva = textos.includes('Sofía Ñúñez Peña') && textos.includes('Peñalolén');
    const ok = filasVerificadas === origen && origen > 0 && conserva;
    evidencia('CP-P17', { requisito: 'RF-11, RNF-4', prueba: 'Generar el informe consolidado (postulaciones, derivaciones, atenciones, bajas, ayudas) en XLSX y releerlo.', esperado: 'Filas del archivo = registros de origen y caracteres preservados.', obtenido: `Registros de origen: ${origen}; filas verificadas: ${filasVerificadas}; «Sofía Ñúñez Peña» y «Peñalolén» preservados: ${conserva}.`, aprobada: ok });
    expect(ok).toBe(true);
  });

  it('CP-P18 · RF-10, RF-11 · período inválido en reportes', async () => {
    const { user } = montar(); await ingresar(user, SOCIAL); await act(() => ir('/reportes'));
    await user.selectOptions(screen.getByLabelText('Tipo de salida *'), 'INFORME_MENSUAL');
    const desde = screen.getByLabelText('Desde *'), hasta = screen.getByLabelText('Hasta *');
    await user.clear(desde); await user.type(desde, '2026-11-30');
    await user.clear(hasta); await user.type(hasta, '2026-11-01');
    await user.click(screen.getByRole('button', { name: 'Descargar Excel' }));
    const msg = screen.queryByText(/Período inválido/) !== null;
    const ok = msg && almacenamiento().reportes.length === 0;
    evidencia('CP-P18', { requisito: 'RF-10, RF-11', prueba: 'Pedir un informe con fecha de inicio posterior a la de término.', esperado: 'Se pide corregir el período y no se genera descarga.', obtenido: `Mensaje de período inválido: ${msg}; descargas registradas: ${almacenamiento().reportes.length}.`, aprobada: ok });
    expect(ok).toBe(true);
  });

  it('CP-P19 · RF-25, RNF-3 · exportación sin permiso', async () => {
    const { user } = montar(); await ingresar(user, CONSULTA); await act(() => ir('/reportes'));
    const bajar = (screen.getByRole('button', { name: 'Descargar Excel' }) as HTMLButtonElement).disabled;
    await act(() => ir('/beneficiarios?b=B-01'));
    const sinExport = screen.queryByRole('button', { name: 'Exportar ficha (XLSX)' }) === null;
    const ok = bajar && sinExport && almacenamiento().reportes.length === 0;
    evidencia('CP-P19', { requisito: 'RF-25, RNF-3', prueba: 'Con perfil Consulta, intentar descargar reportes y exportar la ficha.', esperado: 'Se deniega la salida protegida.', obtenido: `Descargar deshabilitado: ${bajar}; exportar ficha oculto: ${sinExport}; descargas: ${almacenamiento().reportes.length}.`, aprobada: ok });
    expect(ok).toBe(true);
  });

  it('CP-P20 · RF-23 · observación con autoría', async () => {
    const { user } = montar(); await ingresar(user, TENS); await act(() => ir('/beneficiarios?b=B-01'));
    await user.click(screen.getByRole('button', { name: 'Agregar observación' }));
    const dlg = await screen.findByRole('dialog');
    await user.type(within(dlg).getByLabelText('Observación'), 'Seguimiento de prueba');
    await user.click(within(dlg).getByRole('button', { name: 'Guardar observación' }));
    const o = camila().observaciones.at(-1);
    const ok = o?.texto === 'Seguimiento de prueba' && o.autor === 'Javiera Lagos' && tomas().observaciones.length === 0;
    evidencia('CP-P20', { requisito: 'RF-23', prueba: 'Agregar «Seguimiento de prueba» a Camila con perfil TENS.', esperado: 'La observación queda en B-01 con autoría y no se asocia a B-02.', obtenido: `Texto: «${o?.texto}»; autor: ${o?.autor}; observaciones de Tomás: ${tomas().observaciones.length}.`, aprobada: ok });
    expect(ok).toBe(true);
  });

  it('CP-P21 · RF-05, RF-06 · TENS confirma el término del ciclo', async () => {
    const { user } = montar(); await ingresar(user, TENS); await act(() => ir('/atenciones?b=B-01'));
    await user.click(screen.getByRole('button', { name: 'Confirmar término de ciclo' }));
    const c = camila().casos[0];
    const ok = !!c.fechaCierreCiclo && c.estado === 'ATENDIDO' && camila().historial.at(-1).tipo === 'Ciclo terminado';
    evidencia('CP-P21', { requisito: 'RF-05, RF-06', prueba: 'TENS confirma el término del ciclo de Camila.', esperado: 'El ciclo queda terminado, el estado pasa a Atendido y se registra en el historial.', obtenido: `Fecha de cierre: ${c.fechaCierreCiclo}; estado: ${c.estado}; historial: «${camila().historial.at(-1).tipo}».`, aprobada: ok });
    expect(ok).toBe(true);
  });

  it('CP-P22 · RNF-1 · botón Volver en todas las vistas', async () => {
    const { user } = montar(); await ingresar(user, SOCIAL);
    const vistas = ['/postulaciones', '/derivaciones', '/beneficiarios?b=B-01', '/atenciones?b=B-01', '/alertas', '/bajas?b=B-01', '/ayudas?b=B-01', '/reportes', '/perfiles'];
    const sin: string[] = [];
    for (const v of vistas) { await act(() => ir(v)); if (!screen.queryByRole('button', { name: /^Volver/ })) sin.push(v); }
    await act(() => ir('/derivaciones')); await act(() => ir('/bajas?b=B-01'));
    await user.click(screen.getByRole('button', { name: 'Volver' }));
    await waitFor(() => expect(window.location.hash).toContain('/derivaciones'));
    const ok = sin.length === 0;
    evidencia('CP-P22', { requisito: 'RNF-1', prueba: 'Recorrer nueve vistas y usar Volver desde Bajas (origen: Derivaciones).', esperado: 'Todas tienen control Volver y este regresa a la pantalla anterior.', obtenido: `Vistas sin Volver: ${sin.length ? sin.join(', ') : 'ninguna'}; tras Volver la ruta es ${window.location.hash}.`, aprobada: ok });
    expect(ok).toBe(true);
  });

  it('CP-P23 · RF-08 · la alerta revisada no se vuelve a generar', () => {
    const e = crearDatosIniciales();
    revisarAlertas(e);
    marcarAlertaRevisada(e, U_SOCIAL, e.alertas[0].id);
    const otra = revisarAlertas(e);
    const ok = e.alertas.length === 2 && otra === 0;
    evidencia('CP-P23', { requisito: 'RF-08', prueba: 'Revisar una alerta y volver a ejecutar la revisión periódica.', esperado: 'No se crea una segunda alerta para el mismo caso mientras la anterior no se resuelva.', obtenido: `Alertas totales: ${e.alertas.length}; nuevas en la segunda revisión: ${otra}.`, aprobada: ok });
    expect(ok).toBe(true);
  });

  it('CP-P24 · RF-01 · derivar a un NNA recién ingresado crea su caso; no se deriva a quien no ingresó', async () => {
    const { user } = montar(); await ingresar(user, SOCIAL); await act(() => ir('/postulaciones?p=P-02'));
    await user.click(screen.getByRole('button', { name: 'Aceptar e ingresar al programa' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Aceptar postulación' }));
    await act(() => ir('/derivaciones'));
    await user.type(screen.getByLabelText('Buscar beneficiario ingresado (nombre o RUT) *'), 'Sofía');
    const noIngresada = screen.queryByText(/No hay beneficiarios ingresados con ese dato/) !== null;
    await user.clear(screen.getByLabelText('Buscar beneficiario ingresado (nombre o RUT) *'));
    await user.click(await screen.findByRole('option', { name: /Benjamín Soto Lagos/ }).catch(async () => { await user.type(screen.getByLabelText('Buscar beneficiario ingresado (nombre o RUT) *'), 'Benjamín'); return screen.findByRole('option', { name: /Benjamín Soto Lagos/ }); }));
    await user.selectOptions(screen.getByLabelText('Prestación a la que se deriva *'), 'KINESIOLOGIA');
    await user.click(screen.getByRole('button', { name: 'Guardar derivación' }));
    await screen.findByText(/Derivación registrada para/);
    const b = almacenamiento().beneficiarios.find((x: { rut: string }) => x.rut === '23456789-6');
    const ok = noIngresada && b && b.casos.length === 1 && b.casos[0].derivaciones[0].area === 'KINESIOLOGIA' && b.casos[0].derivaciones[0].tipoIngreso === 'INGRESO';
    evidencia('CP-P24', { requisito: 'RF-01 · separación ingreso/derivación (mandante)', prueba: 'Aceptar la postulación de Benjamín y derivarlo a Kinesiología; buscar a Sofía (postulación no aceptada).', esperado: 'Benjamín queda con un caso nuevo (primera derivación); Sofía no aparece porque no ingresó al programa.', obtenido: `Sofía no ingresada encontrada en el buscador: ${!noIngresada}; casos de Benjamín: ${b?.casos.length}; área: ${b?.casos[0]?.derivaciones[0]?.area}; tipo: ${b?.casos[0]?.derivaciones[0]?.tipoIngreso}.`, aprobada: !!ok });
    expect(ok).toBeTruthy();
  });

  it('CP-P25 · M8 · la postulación pública no la evalúa el tutor; el rechazo exige comentario', () => {
    const e = crearDatosIniciales();
    const r1 = registrarPostulacionPublica(e, POST_OK);
    const id = r1.ok ? r1.dato!.id : '';
    const r2 = evaluarPostulacion(e, U_TUTOR, id, 'ACEPTADA', '');
    const r3 = evaluarPostulacion(e, U_SOCIAL, id, 'RECHAZADA', '');
    const r4 = registrarPostulacionPublica(e, POST_OK);
    const r5 = registrarPostulacionPublica(e, { ...POST_OK, rut: '12345678-5' });
    const ok = r1.ok && !r2.ok && 'permiso' in (r2.ok ? {} : r2.errores) && !r3.ok && !r4.ok && !r5.ok && e.beneficiarios.length === 2;
    evidencia('CP-P25', { requisito: 'M8 · perfil Tutor (mandante), RNF-3', prueba: 'Se registra una postulación pública y el Tutor trata de aceptarla; Trabajo social rechaza sin comentario; se repite el RUT y se postula a un NNA ya ingresado.', esperado: 'El tutor no puede evaluar; el rechazo exige motivo; no se duplican postulaciones en curso ni se postula a quien ya ingresó.', obtenido: `Postulación pública: ${r1.ok ? 'registrada' : 'rechazada'}; tutor acepta: ${r2.ok ? 'permitido' : 'denegado'}; rechazo sin comentario: ${r3.ok ? 'aceptado' : 'rechazado'}; RUT repetido: ${r4.ok ? 'aceptado' : 'rechazado'}; NNA ya ingresado: ${r5.ok ? 'aceptado' : 'rechazado'}.`, aprobada: !!ok });
    expect(ok).toBeTruthy();
  });

  it('CP-P26 · RF-14 · antecedentes del NNA: credencial, centro y hospitalización', () => {
    const e = crearDatosIniciales();
    const r0 = actualizarFicha(e, U_SOCIAL, 'B-02', { credencial: { tiene: true, numero: '' } });
    const r1 = actualizarFicha(e, U_SOCIAL, 'B-02', { credencial: { tiene: true, numero: 'CD-999', porcentaje: 70 }, centroSalud: 'Teletón', hospitalizacion: { ingreso: '2026-05-01', alta: '2026-05-10', centro: 'Teletón', descripcion: 'Dato ficticio' } });
    const r2 = actualizarFicha(e, U_SOCIAL, 'B-02', { hospitalizacion: { ingreso: '2026-06-10', alta: '2026-06-01', descripcion: 'Fechas incoherentes' } });
    const b = e.beneficiarios[1];
    const ok = !r0.ok && r1.ok && !r2.ok && b.credencial.numero === 'CD-999' && b.centrosSalud.includes('Teletón') && b.hospitalizaciones.length === 1;
    evidencia('CP-P26', { requisito: 'RF-14 · antecedentes del NNA (mandante)', prueba: 'Registrar credencial sin número, luego credencial completa, centro y hospitalización; después una hospitalización con alta anterior al ingreso.', esperado: 'Se exige el número de credencial; se guardan los antecedentes válidos y se rechaza la hospitalización incoherente.', obtenido: `Credencial sin número: ${r0.ok ? 'aceptada' : 'rechazada'}; antecedentes válidos: ${r1.ok}; hospitalización incoherente: ${r2.ok ? 'aceptada' : 'rechazada'}; credencial ${b.credencial.numero} (${b.credencial.porcentaje}%), centros: ${b.centrosSalud.join(', ')}; hospitalizaciones: ${b.hospitalizaciones.length}.`, aprobada: ok });
    expect(ok).toBe(true);
  });

  it('CP-P27 · Foto identificatoria del NNA con permiso y formato válido', () => {
    const e = crearDatosIniciales();
    const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const consulta: Usuario = { id: 'U-05', nombre: 'Roberto Díaz', email: CONSULTA, rol: 'CONSULTA' };
    const r1 = actualizarFoto(e, consulta, 'B-01', png);
    const r2 = actualizarFoto(e, U_SOCIAL, 'B-01', 'data:application/pdf;base64,AAAA');
    const r3 = actualizarFoto(e, U_SOCIAL, 'B-01', png);
    const ok = !r1.ok && !r2.ok && r3.ok && e.beneficiarios[0].foto === png && e.beneficiarios[0].historial.at(-1)!.tipo === 'Foto identificatoria';
    evidencia('CP-P27', { requisito: 'Imagen identificatoria del NNA (mandante), RNF-3', prueba: 'Cargar foto con perfil Consulta, luego un PDF y luego un PNG con Trabajo social.', esperado: 'Consulta no puede; el formato no admitido se rechaza; la imagen válida queda en la ficha y en el historial.', obtenido: `Consulta: ${r1.ok ? 'permitido' : 'denegado'}; PDF: ${r2.ok ? 'aceptado' : 'rechazado'}; PNG: ${r3.ok ? 'guardado' : 'rechazado'}; historial: «${e.beneficiarios[0].historial.at(-1)!.tipo}».`, aprobada: ok });
    expect(ok).toBe(true);
  });

  it('CP-P28 · RNF-3 · el Administrador quita y restablece un permiso desde Perfiles', async () => {
    const r1 = montar(); await ingresar(r1.user, ADMIN); await act(() => ir('/perfiles'));
    const casilla = screen.getByLabelText('TENS: Registrar atenciones') as HTMLInputElement;
    const antes = casilla.checked;
    await r1.user.click(casilla);
    const guardado = almacenamiento().permisos?.TENS?.includes('ATENCION_REGISTRAR') === false;
    r1.unmount(); cleanup(); window.sessionStorage.clear(); window.location.hash = '#/ingreso';
    const r2 = montar(); await ingresar(r2.user, TENS); await act(() => ir('/atenciones?b=B-01'));
    const bloqueado = (screen.getByRole('button', { name: 'Guardar atención' }) as HTMLButtonElement).disabled;
    await act(() => ir('/perfiles'));
    const tensSinCasillas = screen.queryAllByRole('checkbox').length === 0;
    r2.unmount(); cleanup(); window.sessionStorage.clear(); window.location.hash = '#/ingreso';
    const r3 = montar(); await ingresar(r3.user, ADMIN); await act(() => ir('/perfiles'));
    await r3.user.click(screen.getByRole('button', { name: 'Restablecer permisos originales' }));
    const restablecido = (screen.getByLabelText('TENS: Registrar atenciones') as HTMLInputElement).checked && !almacenamiento().permisos;
    const ok = antes && guardado && bloqueado && tensSinCasillas && restablecido;
    evidencia('CP-P28', { requisito: 'RNF-3 · perfil Administrador (revisión de la profesora)', prueba: 'Administrador quita a TENS «Registrar atenciones»; la TENS intenta registrar; luego el Administrador restablece la matriz.', esperado: 'El cambio se guarda y aplica de inmediato; la TENS no puede guardar atenciones ni editar permisos; al restablecer vuelve la matriz original.', obtenido: `Permiso inicial: ${antes ? 'sí' : 'no'}; quitado y guardado: ${guardado ? 'sí' : 'no'}; Guardar atención deshabilitado para TENS: ${bloqueado ? 'sí' : 'no'}; TENS sin casillas editables: ${tensSinCasillas ? 'sí' : 'no'}; matriz restablecida: ${restablecido ? 'sí' : 'no'}.`, aprobada: ok });
    expect(ok).toBe(true);
  });

  it('CP-P29 · RNF-3 · el Administrador puede todo; nadie más edita permisos', () => {
    const e = crearDatosIniciales();
    const pasos = [
      registrarPostulacionPublica(e, POST_OK).ok,
      evaluarPostulacion(e, U_ADMIN, e.postulaciones.at(-1)!.id, 'ACEPTADA', 'ok').ok,
      registrarAtencion(e, U_ADMIN, 'B-01', { fecha: new Date().toISOString().slice(0, 10), profesional: 'Diego Fuentes · Dental', prestacion: 'Atención dental', asistencia: 'ASISTIO', resultado: 'REALIZADA' }).ok,
      registrarBaja(e, U_ADMIN, 'B-02', 'EGRESO', new Date().toISOString().slice(0, 10), '').ok,
    ];
    const social = cambiarPermiso(e, U_SOCIAL, 'TENS', 'ATENCION_REGISTRAR', false);
    const propio = cambiarPermiso(e, U_ADMIN, 'ADMIN', 'FICHA_CONSULTAR', false);
    const restab = restablecerPermisos(e, U_SOCIAL);
    const ok = pasos.every(Boolean) && !social.ok && !propio.ok && !restab.ok && !e.permisos;
    evidencia('CP-P29', { requisito: 'RNF-3 · perfil Administrador (revisión de la profesora)', prueba: 'Llega una postulación pública; el Administrador la acepta y registra una atención y una baja; Trabajo social intenta editar permisos; el Administrador intenta quitarse un permiso.', esperado: 'El Administrador completa todas las operaciones; solo él edita permisos y sus propios permisos no se pueden quitar.', obtenido: `Operaciones del Administrador: ${pasos.filter(Boolean).length}/4; edición por Trabajo social: ${social.ok ? 'permitida' : 'denegada'}; quitar permiso al Administrador: ${propio.ok ? 'permitido' : 'rechazado'}; restablecer por Trabajo social: ${restab.ok ? 'permitido' : 'denegado'}.`, aprobada: ok });
    expect(ok).toBe(true);
  });

  it('CP-P30 · RF-10 · gráficos comparativos del Inicio suman histórico y registros del sistema', async () => {
    const e = crearDatosIniciales();
    const anio = new Date().getFullYear();
    const fila = (x: ReturnType<typeof calcularEstadisticas>) => x.anios.find(a => a.anio === anio)!;
    const e0 = calcularEstadisticas(e);
    const h = e.historico.find(x => x.anio === anio);
    const esperadoIngresos = (h?.ingresos ?? 0) + e.beneficiarios.filter(b => b.fechaRegistro.startsWith(String(anio))).length;
    evaluarPostulacion(e, U_SOCIAL, 'P-02', 'ACEPTADA', 'ok');
    registrarBaja(e, U_SOCIAL, 'B-02', 'DESVINCULACION', new Date().toISOString().slice(0, 10), '');
    const e1 = calcularEstadisticas(e);
    const egCausal = (x: typeof e0) => x.bajasPorCausal.find(c => c.codigo === 'DESVINCULACION')!.total;
    const calc = e0.anios.length === 5 && fila(e0).ingresos === esperadoIngresos && fila(e1).ingresos === fila(e0).ingresos + 1 && fila(e1).bajas === fila(e0).bajas + 1 && egCausal(e1) === egCausal(e0) + 1 && fila(e1).activosCierre === fila(e0).activosCierre;
    const { user } = montar(); await ingresar(user, SOCIAL); await act(() => ir('/inicio'));
    const figuras = ['Postulaciones, ingresos y bajas por año', 'Beneficiarios activos al cierre de cada año', 'Bajas por causal', 'Derivaciones por prestación'].every(t => screen.getAllByRole('figure', { name: t }).length === 1);
    const tabla = within(screen.getByRole('figure', { name: 'Postulaciones, ingresos y bajas por año' })).getByRole('table', { hidden: true }).textContent ?? '';
    const ok = calc && figuras && tabla.includes(String(anio)) && tabla.includes(String(fila(e0).ingresos));
    evidencia('CP-P30', { requisito: 'RF-10 · gráficos comparativos (revisión de la profesora)', prueba: 'Calcular los indicadores, aceptar una postulación y registrar una baja; abrir el Inicio con Trabajo social.', esperado: 'Cinco años de datos; el ingreso y la baja nuevos suman 1 al año en curso y a su causal; el Inicio muestra los cuatro gráficos con su tabla de datos.', obtenido: `Años: ${e0.anios.map(a => a.anio).join(', ')}; ingresos ${anio}: ${fila(e0).ingresos} → ${fila(e1).ingresos}; bajas ${anio}: ${fila(e0).bajas} → ${fila(e1).bajas}; desvinculaciones: ${egCausal(e0)} → ${egCausal(e1)}; activos al cierre: ${fila(e0).activosCierre} → ${fila(e1).activosCierre}; cuatro gráficos visibles: ${figuras ? 'sí' : 'no'}.`, aprobada: ok });
    expect(ok).toBe(true);
  });
});
