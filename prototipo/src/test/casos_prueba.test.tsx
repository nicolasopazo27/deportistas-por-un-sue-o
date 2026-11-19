// Casos de prueba del prototipo (Matriz 03). Integración de componentes React con DOM emulado (jsdom).
// Cada caso parte del conjunto inicial de dos beneficiarios ficticios y deja su evidencia en pruebas/evidencias/.
import { beforeEach, describe, expect, it } from 'vitest';
import { screen, within, waitFor, cleanup } from '@testing-library/react';
import { act } from 'react';
import { almacenamiento, evidencia, ingresar, ir, montar, reiniciarEntorno } from './ayudantes';
import { crearDatosIniciales } from '../data/seed';
import { marcarAlertaRevisada, registrarAtencion, revisarAlertas, registrarDerivacion } from '../data/servicios';
import { consolidar, generarXlsx } from '../modules/reportes/exportar';
import type { Usuario } from '../domain/tipos';
import ExcelJS from 'exceljs';

const SOCIAL = 'social@demo.cl', TENS = 'tens@demo.cl', CONSULTA = 'consulta@demo.cl';
const nBenef = () => almacenamiento().beneficiarios.length;
const camila = () => almacenamiento().beneficiarios.find((b: { id: string }) => b.id === 'B-01');

beforeEach(() => reiniciarEntorno());

describe('Matriz 03 · prototipo', () => {
  it('CP-P01 · RF-01 · derivación vacía rechazada', async () => {
    const { user } = montar(); await ingresar(user, SOCIAL); await act(() => ir('/derivaciones'));
    await user.clear(screen.getByLabelText('Fecha *'));
    await user.click(screen.getByRole('button', { name: 'Guardar derivación' }));
    const errores = screen.getAllByRole('alert').map(e => e.textContent);
    const ok = nBenef() === 2 && errores.length >= 7;
    evidencia('CP-P01', { requisito: 'RF-01', prueba: 'Enviar el formulario de derivación vacío.', esperado: 'Se rechaza el formulario sin agregar beneficiarios.', obtenido: `Beneficiarios: ${nBenef()}. Errores mostrados (${errores.length}): ${errores.join(' | ')}`, aprobada: ok });
    expect(ok).toBe(true);
  });

  it('CP-P02 · RF-01, RF-04 · registro y recuperación tras remontar', async () => {
    const { user, unmount } = montar(); await ingresar(user, SOCIAL); await act(() => ir('/derivaciones'));
    await user.type(screen.getByLabelText('Nombre del beneficiario *'), 'Sofía Muñoz Araya');
    await user.type(screen.getByLabelText('RUT *'), '22345678-2');
    await user.selectOptions(screen.getByLabelText('Comuna *'), 'Recoleta');
    await user.type(screen.getByLabelText('Apoderado *'), 'Inés Araya Núñez');
    await user.type(screen.getByLabelText('Contacto (teléfono) *'), '+56 9 2222 3333');
    await user.selectOptions(screen.getByLabelText('Categoría de atención *'), 'KINESIOLOGIA');
    await user.selectOptions(screen.getByLabelText('Ingreso o reingreso *'), 'INGRESO');
    await user.type(screen.getByLabelText('Observación'), 'Niña postrada, requiere visita domiciliaria');
    await user.click(screen.getByRole('button', { name: 'Guardar derivación' }));
    await screen.findByText(/Derivación registrada/);
    unmount(); cleanup();
    const r2 = montar(); await act(() => ir('/beneficiarios'));
    await r2.user.click(await screen.findByRole('button', { name: 'Sofía Muñoz Araya' }));
    const ficha = screen.getByLabelText(/Ficha de Sofía/);
    const ok = nBenef() === 3 && within(ficha).getByText('22345678-2') !== null && within(ficha).getByText('Recoleta') !== null && within(ficha).getAllByText(/Niña postrada/).length > 0;
    evidencia('CP-P02', { requisito: 'RF-01, RF-04', prueba: 'Registrar una derivación válida, desmontar la aplicación y volver a montarla.', esperado: 'La ficha se crea y se recupera desde el almacenamiento al remontar.', obtenido: `Beneficiarios: ${nBenef()}. Ficha recuperada con RUT, comuna y observación tras remontar. Persistencia local (no SQL).`, aprobada: ok });
    expect(ok).toBe(true);
  });

  it('CP-P03 · RF-02 · advertencia por RUT existente y cancelar no duplica', async () => {
    const { user } = montar(); await ingresar(user, SOCIAL); await act(() => ir('/derivaciones'));
    await user.type(screen.getByLabelText('Nombre del beneficiario *'), 'Camila Rojas Soto');
    await user.type(screen.getByLabelText('RUT *'), '12345678-5');
    await user.selectOptions(screen.getByLabelText('Comuna *'), 'Santiago');
    await user.type(screen.getByLabelText('Apoderado *'), 'María Soto Pérez');
    await user.type(screen.getByLabelText('Contacto (teléfono) *'), '+56 9 1234 5678');
    await user.selectOptions(screen.getByLabelText('Categoría de atención *'), 'DENTAL');
    await user.selectOptions(screen.getByLabelText('Ingreso o reingreso *'), 'INGRESO');
    await user.click(screen.getByRole('button', { name: 'Guardar derivación' }));
    const modal = await screen.findByRole('dialog', { name: 'Caso activo encontrado' });
    const muestra = within(modal).getByText(/Camila Rojas Soto · Santiago/) !== null;
    await user.click(within(modal).getByRole('button', { name: 'Cancelar' }));
    const derivs = camila().casos[0].derivaciones.length;
    const ok = muestra && nBenef() === 2 && derivs === 1;
    evidencia('CP-P03', { requisito: 'RF-02', prueba: 'Ingresar el RUT de un beneficiario con caso activo y cancelar ante la advertencia.', esperado: 'Se muestra el caso activo y cancelar no crea ficha ni derivación.', obtenido: `Advertencia con el caso de Camila Rojas Soto. Beneficiarios: ${nBenef()}; derivaciones del caso: ${derivs}.`, aprobada: ok });
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
    evidencia('CP-P04', { requisito: 'RF-12', prueba: 'Filtrar por Santiago y luego por Puente Alto.', esperado: 'Santiago devuelve solo a Camila; Puente Alto queda sin resultados.', obtenido: `Santiago: ${filas1.length} fila(s) (${filas1.map(f => f.slice(0, 17)).join(', ')}). Puente Alto: ${vacio ? 'sin resultados' : 'con filas'}. Fichas sin modificar.`, aprobada: ok });
    expect(ok).toBe(true);
  });

  it('CP-P05 · RF-13 · filtro por enfermedad', async () => {
    const { user } = montar(); await ingresar(user, SOCIAL); await act(() => ir('/beneficiarios'));
    await user.selectOptions(screen.getByLabelText('Filtro enfermedad'), 'Oncológica');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    const filas = within(screen.getByLabelText('Listado de beneficiarios')).getAllByRole('row').slice(1).map(r => r.textContent ?? '');
    const ok = filas.length === 1 && filas[0].includes('Tomás Díaz Pérez');
    evidencia('CP-P05', { requisito: 'RF-13', prueba: 'Filtrar por la enfermedad Oncológica con perfil Trabajo social.', esperado: 'Solo aparece Tomás Díaz Pérez.', obtenido: `${filas.length} fila(s): ${filas.map(f => f.slice(0, 16)).join(', ')}.`, aprobada: ok });
    expect(ok).toBe(true);
  });

  it('CP-P06 · RF-06, RF-21, RF-03 · atención realizada suma sesión y avisa al área social', async () => {
    const { user } = montar(); await ingresar(user, TENS); await act(() => ir('/atenciones?b=B-01'));
    const antes = camila().casos[0].atenciones.length;
    await user.selectOptions(screen.getByLabelText('Profesional *'), 'Diego Fuentes · Dental');
    await user.selectOptions(screen.getByLabelText('Prestación *'), 'Atención dental');
    await user.selectOptions(screen.getByLabelText('Asistencia *'), 'ASISTIO');
    await user.selectOptions(screen.getByLabelText('Resultado *'), 'REALIZADA');
    await user.click(screen.getByRole('button', { name: 'Guardar atención' }));
    await screen.findByText(/Atención guardada/);
    const c = camila().casos[0];
    const despues = c.atenciones.length, sesiones = c.atenciones.filter((a: { resultado: string }) => a.resultado === 'REALIZADA').length;
    const aviso = almacenamiento().notificaciones.some((n: { tipo: string; rolDestino: string }) => n.tipo === 'ATENCION_REALIZADA' && n.rolDestino === 'TRABAJO_SOCIAL');
    const hist = camila().historial.at(-1).detalle;
    const ok = antes === 2 && despues === 3 && sesiones === 3 && aviso && hist.includes('Sesión 3');
    evidencia('CP-P06', { requisito: 'RF-06, RF-21, RF-03', prueba: 'TENS registra una atención realizada para Camila.', esperado: 'Se guarda la atención, suma una sesión, queda en el historial y se avisa al área social.', obtenido: `Atenciones ${antes} → ${despues}; sesiones realizadas ${sesiones}; historial: «${hist}»; aviso en plataforma al área social: ${aviso ? 'sí' : 'no'}. Sin envío por correo.`, aprobada: ok });
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
    const n = camila().casos[0].atenciones.length;
    const ok = msg && n === 2;
    evidencia('CP-P07', { requisito: 'RF-07', prueba: 'Guardar una atención No realizada sin motivo.', esperado: 'Se rechaza el guardado y se exige el motivo.', obtenido: `Mensaje de motivo obligatorio: ${msg ? 'visible' : 'no visible'}; atenciones sin cambios (${n}).`, aprobada: ok });
    expect(ok).toBe(true);
  });

  it('CP-P08 · RF-08 · alertas generadas por umbral y revisión individual', async () => {
    const { user } = montar(); await ingresar(user, SOCIAL); await act(() => ir('/alertas'));
    const al0 = almacenamiento().alertas;
    const tabla = screen.getByLabelText('Alertas');
    const fila = within(tabla).getByText('Tomás Díaz Pérez').closest('tr')!;
    await user.click(within(fila).getByRole('button', { name: 'Revisar' }));
    const al = almacenamiento().alertas;
    const tomas = al.find((a: { idBeneficiario: string }) => a.idBeneficiario === 'B-02');
    const cami = al.find((a: { idBeneficiario: string }) => a.idBeneficiario === 'B-01');
    const hist = almacenamiento().beneficiarios[1].historial.at(-1).tipo;
    const ok = al0.length === 2 && tomas.estado === 'REVISADA' && cami.estado === 'ACTIVA' && hist === 'Revisión de alerta';
    evidencia('CP-P08', { requisito: 'RF-08', prueba: 'Abrir Alertas (umbral de ensayo 14 días) y revisar la alerta de Tomás.', esperado: 'Al abrir el sistema se generan alertas para los casos sobre el umbral; solo la alerta elegida pasa a Revisada y queda en el historial.', obtenido: `Alertas generadas al abrir: ${al0.length} (19 y 41 días > 14). Tomás: ${tomas.estado}; Camila: ${cami.estado}; historial: «${hist}».`, aprobada: ok });
    expect(ok).toBe(true);
  });

  it('CP-P09 · RF-09 · baja con causal conserva el historial', async () => {
    const { user } = montar(); await ingresar(user, SOCIAL); await act(() => ir('/bajas?b=B-01'));
    const h0 = camila().historial.length;
    await user.selectOptions(screen.getByLabelText('Causal de baja (obligatoria) *'), 'EGRESO');
    await user.click(screen.getByRole('button', { name: 'Confirmar baja' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Registrar baja' }));
    await act(() => ir('/beneficiarios?b=B-01'));
    const estadoTabla = within(screen.getByLabelText('Listado de beneficiarios')).getByText('Camila Rojas Soto').closest('tr')!.textContent;
    const c = camila();
    const ok = c.bajas.length === 1 && c.bajas[0].causal === 'EGRESO' && c.historial.length === h0 + 1 && (estadoTabla ?? '').includes('Baja');
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

  it('CP-P11 · RNF-3 · perfil Consulta no puede guardar atención ni ver datos de salud', async () => {
    const { user } = montar(); await ingresar(user, CONSULTA); await act(() => ir('/atenciones?b=B-01'));
    const deshab = (screen.getByRole('button', { name: 'Guardar atención' }) as HTMLButtonElement).disabled;
    await act(() => ir('/beneficiarios?b=B-01'));
    const restringido = screen.getAllByText('Acceso restringido para su perfil').length >= 2;
    const sinFiltroSalud = screen.queryByLabelText('Filtro enfermedad') === null;
    const ok = deshab && restringido && sinFiltroSalud;
    evidencia('CP-P11', { requisito: 'RNF-3', prueba: 'Ingresar con perfil Consulta a Atenciones y a la ficha.', esperado: 'Guardar atención deshabilitado y datos de salud/sensibles ocultos.', obtenido: `Guardar atención deshabilitado: ${deshab}; datos sensibles y de salud restringidos: ${restringido}; filtro por enfermedad oculto: ${sinFiltroSalud}. Control en el navegador; la autorización en servidor queda para la etapa con backend.`, aprobada: ok });
    expect(ok).toBe(true);
  });

  it('CP-P12 · RF-18 · TENS no puede registrar entregas (corrección de INC-02)', async () => {
    const { user } = montar(); await ingresar(user, TENS); await act(() => ir('/ayudas?b=B-01'));
    const boton = screen.getByRole('button', { name: 'Guardar entrega' }) as HTMLButtonElement;
    const urg = screen.getByRole('button', { name: 'Marcar urgencia' }) as HTMLButtonElement;
    await user.click(urg);
    const ok = boton.disabled && !urg.disabled && camila().ayudas.length === 0 && camila().casos[0].urgencias.length === 1;
    evidencia('CP-P12', { requisito: 'RF-18, RF-20', prueba: 'Con perfil TENS, intentar registrar una entrega y marcar urgencia.', esperado: 'TENS no puede registrar entregas (reservado al equipo social) pero sí marcar urgencia.', obtenido: `Guardar entrega deshabilitado: ${boton.disabled}; ayudas: ${camila().ayudas.length}; urgencias marcadas: ${camila().casos[0].urgencias.length}.`, aprobada: ok });
    expect(ok).toBe(true);
  });

  it('CP-P13 · RF-01 · RUT y teléfono demasiado largos', async () => {
    const { user } = montar(); await ingresar(user, SOCIAL); await act(() => ir('/derivaciones'));
    await user.type(screen.getByLabelText('Nombre del beneficiario *'), 'Prueba Larga Uno');
    await user.type(screen.getByLabelText('RUT *'), '1234567890123-5');
    await user.type(screen.getByLabelText('Contacto (teléfono) *'), '+56 9 1234 5678 9999 0000');
    await user.click(screen.getByRole('button', { name: 'Guardar derivación' }));
    const rut = screen.queryByText(/El RUT es demasiado largo/) !== null, tel = screen.queryByText('El teléfono es demasiado largo.') !== null;
    const ok = rut && tel && nBenef() === 2;
    evidencia('CP-P13', { requisito: 'RF-01', prueba: 'Ingresar RUT y teléfono con largo excesivo.', esperado: 'El formulario rechaza ambos datos y no guarda.', obtenido: `Error RUT: ${rut}; error teléfono: ${tel}; beneficiarios: ${nBenef()}.`, aprobada: ok });
    expect(ok).toBe(true);
  });

  it('CP-P14 · RNF-3 · acceso directo a una ficha sin sesión', async () => {
    window.location.hash = '#/beneficiarios?b=B-01';
    montar();
    await screen.findByRole('button', { name: 'Ingresar' });
    const sinDatos = screen.queryByText('Camila Rojas Soto') === null && screen.queryByText('12345678-5') === null;
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
    const n1 = revisarAlertas(e, hoy);
    const n2 = revisarAlertas(e, hoy);
    const u: Usuario = { id: 'U-03', nombre: 'Javiera Lagos', email: 'tens@demo.cl', rol: 'TENS' };
    registrarAtencion(e, u, 'T-2', { fecha: hoy.toISOString().slice(0, 10), profesional: 'Diego Fuentes · Dental', prestacion: 'Atención dental', asistencia: 'ASISTIO', resultado: 'REALIZADA' });
    const estadoT1 = e.alertas[0]?.estado;
    const ok = n1 === 1 && e.alertas[0].idCaso === 'KT-2' && n2 === 0 && estadoT1 === 'RESUELTA';
    evidencia('CP-P15', { requisito: 'RF-08', prueba: 'Casos con T−1, T y T+1 días (T=10); revisar dos veces; actualizar el caso T+1.', esperado: 'Solo T+1 genera alerta; la segunda revisión no duplica; al actualizar el caso la alerta se resuelve.', obtenido: `Primera revisión: ${n1} alerta (caso ${e.alertas[0]?.idCaso}); segunda: ${n2}; estado tras actualizar: ${estadoT1}.`, aprobada: ok });
    expect(ok).toBe(true);
  });

  it('CP-P16 · RF-02 · continuar tras la coincidencia asocia al caso activo', async () => {
    const { user } = montar(); await ingresar(user, SOCIAL); await act(() => ir('/derivaciones'));
    await user.type(screen.getByLabelText('Nombre del beneficiario *'), 'Camila Rojas Soto');
    await user.type(screen.getByLabelText('RUT *'), '12345678-5');
    await user.selectOptions(screen.getByLabelText('Comuna *'), 'Santiago');
    await user.type(screen.getByLabelText('Apoderado *'), 'María Soto Pérez');
    await user.type(screen.getByLabelText('Contacto (teléfono) *'), '+56 9 1234 5678');
    await user.selectOptions(screen.getByLabelText('Categoría de atención *'), 'KINESIOLOGIA');
    await user.selectOptions(screen.getByLabelText('Ingreso o reingreso *'), 'INGRESO');
    await user.click(screen.getByRole('button', { name: 'Guardar derivación' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Asociar al caso activo' }));
    const c = camila();
    const ok = nBenef() === 2 && c.casos.length === 1 && c.casos[0].derivaciones.length === 2 && c.casos[0].derivaciones[1].advertenciaIgnorada === true;
    evidencia('CP-P16', { requisito: 'RF-02', prueba: 'Confirmar la advertencia de coincidencia y revisar caso y derivaciones.', esperado: 'Con el supuesto DP-02, la derivación se asocia al caso activo sin crear otro caso ni otra ficha.', obtenido: `Beneficiarios: ${nBenef()}; casos de Camila: ${c.casos.length}; derivaciones del caso: ${c.casos[0].derivaciones.length}; advertencia_ignorada: ${c.casos[0].derivaciones[1]?.advertenciaIgnorada}. Regla pendiente de validación (DP-02).`, aprobada: ok });
    expect(ok).toBe(true);
  });

  it('CP-P17 · RF-11, RNF-4 · informe mensual en XLSX íntegro y descarga registrada', async () => {
    const e = crearDatosIniciales();
    const u: Usuario = { id: 'U-01', nombre: 'Valentina Muñoz', email: 'social@demo.cl', rol: 'TRABAJO_SOCIAL' };
    const hoy = new Date().toISOString().slice(0, 10);
    registrarDerivacion(e, u, { nombre: 'Sofía Muñoz Ñúñez', rut: '22345678-2', comuna: 'Peñalolén', apoderado: 'José Ñúñez', telefono: '+56 9 3333 4444', area: 'DENTAL', tipoIngreso: 'INGRESO', fecha: hoy, origen: 'LLAMADO_SEMANAL', observacion: 'Atención con tildes: árbol, niño' });
    const desde = '2000-01-01';
    const tablas = consolidar(e, 'INFORME_MENSUAL', desde, hoy, false);
    const origen = tablas.reduce((s, t) => s + t.filas.length, 0);
    const { buffer, filasVerificadas } = await generarXlsx(tablas);
    const wb = new ExcelJS.Workbook(); await wb.xlsx.load(buffer);
    const textos = wb.getWorksheet('Derivaciones')!.getSheetValues().flat().map(String);
    const conserva = textos.includes('Sofía Muñoz Ñúñez') && textos.includes('Peñalolén');
    const claves = tablas[0].filas.map(f => `${f[0]}|${f[2]}`);
    const sinDuplicados = new Set(claves).size === claves.length;
    const ok = filasVerificadas === origen && origen > 0 && conserva && sinDuplicados;
    evidencia('CP-P17', { requisito: 'RF-11, RNF-4', prueba: 'Generar el informe consolidado en XLSX con un lote que incluye tildes y ñ; releer el archivo.', esperado: 'Filas del archivo = registros de origen, sin duplicados y con caracteres preservados.', obtenido: `Registros de origen: ${origen}; filas verificadas en el XLSX: ${filasVerificadas}; claves duplicadas: ${!sinDuplicados}; «Sofía Muñoz Ñúñez» y «Peñalolén» preservados: ${conserva}.`, aprobada: ok });
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
    evidencia('CP-P19', { requisito: 'RF-25, RNF-3', prueba: 'Con perfil Consulta, intentar descargar reportes y exportar la ficha con datos del apoderado.', esperado: 'Se deniega la salida protegida.', obtenido: `Descargar deshabilitado: ${bajar}; botón de exportar ficha oculto: ${sinExport}; descargas registradas: ${almacenamiento().reportes.length}.`, aprobada: ok });
    expect(ok).toBe(true);
  });

  it('CP-P20 · RF-23 · observación con autoría', async () => {
    const { user } = montar(); await ingresar(user, TENS); await act(() => ir('/beneficiarios?b=B-01'));
    await user.click(screen.getByRole('button', { name: 'Agregar observación' }));
    const dlg = await screen.findByRole('dialog');
    await user.type(within(dlg).getByLabelText('Observación'), 'Seguimiento de prueba');
    await user.click(within(dlg).getByRole('button', { name: 'Guardar observación' }));
    const o = camila().observaciones.at(-1);
    const otra = almacenamiento().beneficiarios[1].observaciones.length;
    const ok = o?.texto === 'Seguimiento de prueba' && o.autor === 'Javiera Lagos' && otra === 0;
    evidencia('CP-P20', { requisito: 'RF-23', prueba: 'Agregar «Seguimiento de prueba» a Camila con perfil TENS.', esperado: 'La observación queda en B-01 con autoría y no se asocia a B-02.', obtenido: `Texto: «${o?.texto}»; autor: ${o?.autor}; observaciones de Tomás: ${otra}.`, aprobada: ok });
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

  it('CP-P22 · RNF-1 · botón Volver en todas las vistas de registro', async () => {
    const { user } = montar(); await ingresar(user, SOCIAL);
    const vistas = ['/derivaciones', '/beneficiarios?b=B-01', '/atenciones?b=B-01', '/alertas', '/bajas?b=B-01', '/ayudas?b=B-01', '/reportes'];
    const sin: string[] = [];
    for (const v of vistas) { await act(() => ir(v)); if (!screen.queryByRole('button', { name: /^Volver/ })) sin.push(v); }
    await act(() => ir('/derivaciones')); await act(() => ir('/bajas?b=B-01'));
    await user.click(screen.getByRole('button', { name: 'Volver' }));
    await waitFor(() => expect(window.location.hash).toContain('/derivaciones'));
    const ok = sin.length === 0;
    evidencia('CP-P22', { requisito: 'RNF-1', prueba: 'Recorrer las siete vistas y usar Volver desde Bajas (origen: Derivaciones).', esperado: 'Todas tienen control Volver y este regresa a la pantalla anterior.', obtenido: `Vistas sin Volver: ${sin.length ? sin.join(', ') : 'ninguna'}; tras Volver la ruta es ${window.location.hash}.`, aprobada: ok });
    expect(ok).toBe(true);
  });

  it('CP-P23 · RF-08 · la alerta revisada no se vuelve a generar', () => {
    const e = crearDatosIniciales();
    revisarAlertas(e);
    const u: Usuario = { id: 'U-01', nombre: 'Valentina Muñoz', email: 'social@demo.cl', rol: 'TRABAJO_SOCIAL' };
    marcarAlertaRevisada(e, u, e.alertas[0].id);
    const otra = revisarAlertas(e);
    const ok = e.alertas.length === 2 && otra === 0;
    evidencia('CP-P23', { requisito: 'RF-08', prueba: 'Revisar una alerta y volver a ejecutar la revisión periódica.', esperado: 'No se crea una segunda alerta para el mismo caso mientras la anterior no se resuelva.', obtenido: `Alertas totales: ${e.alertas.length}; nuevas en la segunda revisión: ${otra}.`, aprobada: ok });
    expect(ok).toBe(true);
  });
});
