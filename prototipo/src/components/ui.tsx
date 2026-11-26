import { useEffect, useId, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { enlaceWhatsApp } from '../domain/reglas';

export function Encabezado({ titulo, subtitulo, codigo }: { titulo: string; subtitulo: string; codigo: string }) {
  return (
    <div className="encabezado">
      <h1>{titulo}</h1>
      <p className="subtitulo">{subtitulo}</p>
      <p className="codigo">{codigo}</p>
    </div>
  );
}

interface CampoProps { label: string; error?: string; children: (id: string) => ReactNode; ayuda?: string; ancho?: 'completo' }
export function Campo({ label, error, children, ayuda, ancho }: CampoProps) {
  const id = useId();
  return (
    <div className={`campo ${ancho === 'completo' ? 'campo-completo' : ''} ${error ? 'con-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children(id)}
      {ayuda && !error && <span className="ayuda">{ayuda}</span>}
      {error && <span className="error" role="alert">{error}</span>}
    </div>
  );
}

export function Texto(p: { label: string; value: string; onChange: (v: string) => void; error?: string; placeholder?: string; type?: string; ancho?: 'completo'; disabled?: boolean; ayuda?: string; max?: string }) {
  return (
    <Campo label={p.label} error={p.error} ancho={p.ancho} ayuda={p.ayuda}>
      {id => <input id={id} type={p.type ?? 'text'} value={p.value} placeholder={p.placeholder} disabled={p.disabled} max={p.max}
        aria-invalid={!!p.error} onChange={e => p.onChange(e.target.value)} />}
    </Campo>
  );
}

export function Selector(p: { label: string; value: string; onChange: (v: string) => void; opciones: (string | { valor: string; texto: string })[]; error?: string; placeholder?: string; disabled?: boolean; ancho?: 'completo' }) {
  return (
    <Campo label={p.label} error={p.error} ancho={p.ancho}>
      {id => (
        <select id={id} value={p.value} disabled={p.disabled} aria-invalid={!!p.error} onChange={e => p.onChange(e.target.value)}>
          <option value="">{p.placeholder ?? 'Seleccionar'}</option>
          {p.opciones.map(o => typeof o === 'string'
            ? <option key={o} value={o}>{o}</option>
            : <option key={o.valor} value={o.valor}>{o.texto}</option>)}
        </select>
      )}
    </Campo>
  );
}

export function Boton({ tipo = 'primario', children, ...rest }: { tipo?: 'primario' | 'secundario' | 'acento' | 'borde'; children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className={`boton boton-${tipo}`} {...rest}>{children}</button>;
}

export function Volver({ texto = 'Volver' }: { texto?: string }) {
  const nav = useNavigate();
  return <Boton tipo="secundario" onClick={() => nav(-1)}>{texto}</Boton>;
}

export function Aviso({ tipo = 'info', children }: { tipo?: 'info' | 'exito' | 'error' | 'alerta'; children: ReactNode }) {
  return <div className={`aviso aviso-${tipo}`} role={tipo === 'error' ? 'alert' : 'status'}>{children}</div>;
}

export function Modal({ titulo, children, acciones, onCerrar }: { titulo: string; children: ReactNode; acciones: ReactNode; onCerrar: () => void }) {
  useEffect(() => {
    const f = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [onCerrar]);
  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={titulo} onClick={e => e.stopPropagation()}>
        <h2>{titulo}</h2>
        <div className="modal-cuerpo">{children}</div>
        <div className="acciones">{acciones}</div>
      </div>
    </div>
  );
}

export function Etiqueta({ texto, tono }: { texto: string; tono: 'rojo' | 'verde' | 'gris' | 'amarillo' }) {
  return <span className={`etiqueta etiqueta-${tono}`}>{texto}</span>;
}

export function Avatar({ nombres, apellidos, foto, tam = 'md' }: { nombres: string; apellidos: string; foto?: string; tam?: 'sm' | 'md' | 'lg' }) {
  const ini = `${nombres[0] ?? ''}${apellidos[0] ?? ''}`.toUpperCase();
  return foto
    ? <img className={`avatar avatar-${tam}`} src={foto} alt={`Foto de ${nombres} ${apellidos}`} />
    : <span className={`avatar avatar-${tam} avatar-ini`} aria-label={`Sin foto de ${nombres} ${apellidos}`}>{ini}</span>;
}

export function Pestanas<T extends string>({ opciones, activa, onCambiar }: { opciones: { id: T; texto: string; cuenta?: number }[]; activa: T; onCambiar: (t: T) => void }) {
  return (
    <div className="pestanas" role="tablist">
      {opciones.map(o => (
        <button key={o.id} type="button" role="tab" aria-selected={activa === o.id} className={activa === o.id ? 'pestana activa' : 'pestana'} onClick={() => onCambiar(o.id)}>
          {o.texto}{o.cuenta !== undefined && <span className="cuenta">{o.cuenta}</span>}
        </button>
      ))}
    </div>
  );
}

export function Kpi({ titulo, valor, detalle, tono = 'neutro', icono, onClick }: { titulo: string; valor: number | string; detalle?: string; tono?: 'neutro' | 'rojo' | 'amarillo' | 'verde' | 'azul' | 'morado'; icono?: ReactNode; onClick?: () => void }) {
  return (
    <button type="button" className={`kpi kpi-${tono}`} onClick={onClick} disabled={!onClick}>
      {icono && <span className="kpi-icono" aria-hidden="true">{icono}</span>}
      <span className="kpi-titulo">{titulo}</span>
      <span className="kpi-valor">{valor}</span>
      {detalle && <span className="kpi-detalle">{detalle}</span>}
    </button>
  );
}

export function Pasos({ pasos, actual }: { pasos: string[]; actual: number }) {
  return (
    <ol className="pasos" aria-label="Etapas">
      {pasos.map((p, i) => <li key={p} className={i < actual ? 'hecho' : i === actual ? 'actual' : ''}><span>{i + 1}</span>{p}</li>)}
    </ol>
  );
}

export function Multi({ label, opciones, valores, onChange, error }: { label: string; opciones: string[]; valores: string[]; onChange: (v: string[]) => void; error?: string }) {
  return (
    <fieldset className={`multi ${error ? 'con-error' : ''}`}>
      <legend>{label}</legend>
      <div className="multi-opciones">
        {opciones.map(o => (
          <label key={o} className={valores.includes(o) ? 'chip chip-on' : 'chip'}>
            <input type="checkbox" checked={valores.includes(o)} onChange={e => onChange(e.target.checked ? [...valores, o] : valores.filter(x => x !== o))} />{o}
          </label>
        ))}
      </div>
      {error && <span className="error" role="alert">{error}</span>}
    </fieldset>
  );
}

/** Abre WhatsApp (web o app) con un mensaje prellenado para el apoderado/a. */
export function BotonWhatsApp({ telefono, mensaje, texto = 'Contactar por WhatsApp' }: { telefono: string; mensaje: string; texto?: string }) {
  const href = enlaceWhatsApp(telefono, mensaje);
  if (!href) return null;
  return (
    <a className="boton boton-whatsapp" href={href} target="_blank" rel="noreferrer" title={`Abrir WhatsApp con ${telefono}`}>
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 2s.9 2.3 1 2.5c.1.2 1.7 2.6 4.1 3.6 1.5.7 2.1.7 2.9.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.3-.1Z"/></svg>
      {texto}
    </a>
  );
}
