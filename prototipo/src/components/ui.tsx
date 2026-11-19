import { useEffect, useId, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

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
