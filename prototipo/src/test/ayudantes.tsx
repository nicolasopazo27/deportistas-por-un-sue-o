// Ayudantes de prueba: montaje de la App, inicio de sesión y registro de evidencias (EV-CP-*.json / .html).
import fs from 'node:fs';
import path from 'node:path';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { CLAVE_ALMACENAMIENTO } from '../data/repositorio';
import { configurarPermisos } from '../domain/reglas';

const DIR = path.resolve(__dirname, '../../../pruebas/evidencias');
export const resultados: Record<string, unknown>[] = [];

export function reiniciarEntorno() {
  cleanup();
  window.localStorage.clear();
  window.sessionStorage.clear();
  window.location.hash = '#/ingreso';
  configurarPermisos();
}

export function montar() {
  const user = userEvent.setup();
  const r = render(<App />);
  return { user, ...r };
}

export async function ingresar(user: ReturnType<typeof userEvent.setup>, email: string) {
  await user.selectOptions(screen.getByLabelText('Usuario'), email);
  await user.type(screen.getByLabelText('Contraseña'), 'demo2026');
  await user.click(screen.getByRole('button', { name: 'Ingresar' }));
}

export async function ir(ruta: string) {
  window.location.hash = '#' + ruta;
  await new Promise(r => setTimeout(r, 30));
}

export function almacenamiento() {
  return JSON.parse(window.localStorage.getItem(CLAVE_ALMACENAMIENTO) ?? 'null');
}

export function evidencia(id: string, datos: { requisito: string; prueba: string; esperado: string; obtenido: string; aprobada: boolean; extra?: unknown }) {
  fs.mkdirSync(DIR, { recursive: true });
  const reg = { id, ...datos, estado: datos.aprobada ? 'Aprobada' : 'Fallida', fechaUTC: new Date().toISOString(), almacenamiento: almacenamiento() };
  fs.writeFileSync(path.join(DIR, `EV-${id}.json`), JSON.stringify(reg, null, 2));
  fs.writeFileSync(path.join(DIR, `EV-${id}.html`), `<!-- Registro del DOM emulado (jsdom) al finalizar ${id}; no es una captura de navegador -->\n` + document.body.innerHTML);
  resultados.push({ id, requisito: datos.requisito, esperado: datos.esperado, obtenido: datos.obtenido, estado: reg.estado, fechaUTC: reg.fechaUTC });
  fs.writeFileSync(path.join(DIR, 'resultados.json'), JSON.stringify(resultados, null, 2));
}
