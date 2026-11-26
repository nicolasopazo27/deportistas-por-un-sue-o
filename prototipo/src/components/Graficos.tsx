// Gráficos SVG livianos para el Inicio: barras agrupadas, línea y barras horizontales.
// Cada gráfico trae leyenda (si hay más de una serie), tooltip al pasar el mouse y una tabla con los datos.
import { useRef, useState, type ReactNode } from 'react';
import { Download } from 'lucide-react';

export interface Serie { nombre: string; color: string; valores: number[] }
const fmt = (n: number) => n.toLocaleString('es-CL');

function escala(max: number) {
  const pasos = [1, 2, 2.5, 5, 10];
  const bruto = max / 4 || 1;
  const mag = 10 ** Math.floor(Math.log10(bruto));
  const paso = (pasos.find(p => p * mag >= bruto) ?? 10) * mag;
  return { tope: Math.ceil(max / paso) * paso || paso, paso };
}
/** Barra con el extremo de datos redondeado (4 px) y la base recta sobre el eje. */
function barraV(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}
function barraH(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, h / 2, w);
  return `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x}Z`;
}

/** Descarga el gráfico como PNG (con título y leyenda) copiando los estilos calculados al SVG. */
async function descargarPng(fig: HTMLElement, titulo: string, subtitulo: string | undefined, leyenda: Serie[] | undefined) {
  const svg = fig.querySelector('svg'); if (!svg) return;
  const copia = svg.cloneNode(true) as SVGSVGElement;
  const orig = svg.querySelectorAll('*'), dest = copia.querySelectorAll('*');
  orig.forEach((el, i) => {
    const cs = getComputedStyle(el), d = dest[i] as SVGElement;
    for (const prop of ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'font-size', 'font-weight', 'font-family', 'opacity']) d.style.setProperty(prop, cs.getPropertyValue(prop));
  });
  const vb = svg.viewBox.baseVal, escala = 2, cab = leyenda && leyenda.length > 1 ? 62 : 42;
  const w = vb.width, h = vb.height + cab + 10;
  copia.setAttribute('width', String(vb.width)); copia.setAttribute('height', String(vb.height));
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copia)], { type: 'image/svg+xml' }));
  const img = new Image();
  await new Promise<void>((ok, mal) => { img.onload = () => ok(); img.onerror = () => mal(new Error('svg')); img.src = url; });
  const canvas = document.createElement('canvas'); canvas.width = w * escala; canvas.height = h * escala;
  const ctx = canvas.getContext('2d'); if (!ctx) return;
  ctx.scale(escala, escala); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#1f2328'; ctx.font = 'bold 14px Arial'; ctx.fillText(titulo, 10, 20);
  if (subtitulo) { ctx.fillStyle = '#5f6368'; ctx.font = '11px Arial'; ctx.fillText(subtitulo, 10, 36); }
  if (leyenda && leyenda.length > 1) { let x = 10; ctx.font = '11px Arial'; for (const s of leyenda) { ctx.fillStyle = s.color; ctx.fillRect(x, 46, 10, 10); ctx.fillStyle = '#3c4043'; ctx.fillText(s.nombre, x + 14, 55); x += ctx.measureText(s.nombre).width + 32; } }
  ctx.drawImage(img, 0, cab, vb.width, vb.height);
  URL.revokeObjectURL(url);
  const a = document.createElement('a'); a.download = `${titulo.replace(/[^\wáéíóúñ ]/gi, '').trim().replace(/\s+/g, '_')}.png`; a.href = canvas.toDataURL('image/png'); a.click();
}

function Marco({ titulo, subtitulo, leyenda, tabla, children }: { titulo: string; subtitulo?: string; leyenda?: Serie[]; tabla: { columnas: string[]; filas: (string | number)[][] }; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  return (
    <figure className="grafico" aria-label={titulo} ref={ref}>
      <figcaption><b>{titulo}</b>{subtitulo && <span className="tenue"> · {subtitulo}</span>}
        <button type="button" className="descargar-grafico" title="Descargar como imagen PNG" aria-label={`Descargar ${titulo} como imagen`} onClick={() => ref.current && descargarPng(ref.current, titulo, subtitulo, leyenda).catch(() => undefined)}><Download size={14} /></button>
      </figcaption>
      {leyenda && leyenda.length > 1 && (
        <ul className="leyenda">{leyenda.map(s => <li key={s.nombre}><i style={{ background: s.color }} />{s.nombre}</li>)}</ul>
      )}
      <div className="grafico-area">{children}</div>
      <details className="grafico-datos">
        <summary>Ver datos</summary>
        <table className="tabla"><thead><tr>{tabla.columnas.map(c => <th key={c}>{c}</th>)}</tr></thead>
          <tbody>{tabla.filas.map((f, i) => <tr key={i}>{f.map((v, j) => <td key={j}>{typeof v === 'number' ? fmt(v) : v}</td>)}</tr>)}</tbody></table>
      </details>
    </figure>
  );
}

const W = 520, H = 230, M = { t: 12, r: 12, b: 26, l: 40 };

function Ejes({ tope, paso }: { tope: number; paso: number }) {
  const ys: number[] = []; for (let v = 0; v <= tope; v += paso) ys.push(v);
  const alto = H - M.t - M.b;
  return <g>{ys.map(v => { const y = M.t + alto - (v / tope) * alto; return <g key={v}><line x1={M.l} x2={W - M.r} y1={y} y2={y} className={v === 0 ? 'eje-base' : 'eje-grilla'} /><text x={M.l - 6} y={y + 4} textAnchor="end" className="eje-texto">{fmt(v)}</text></g>; })}</g>;
}

export function BarrasAgrupadas({ titulo, subtitulo, categorias, series }: { titulo: string; subtitulo?: string; categorias: string[]; series: Serie[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const { tope, paso } = escala(Math.max(...series.flatMap(s => s.valores), 1));
  const ancho = W - M.l - M.r, alto = H - M.t - M.b;
  const grupo = ancho / categorias.length, interior = grupo * 0.7, barra = (interior - (series.length - 1) * 2) / series.length;
  return (
    <Marco titulo={titulo} subtitulo={subtitulo} leyenda={series}
      tabla={{ columnas: ['Año', ...series.map(s => s.nombre)], filas: categorias.map((c, i) => [c, ...series.map(s => s.valores[i])]) }}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={titulo} onMouseLeave={() => setHover(null)}>
        <Ejes tope={tope} paso={paso} />
        {categorias.map((c, i) => {
          const x0 = M.l + i * grupo + (grupo - interior) / 2;
          return (
            <g key={c} onMouseEnter={() => setHover(i)}>
              <rect x={M.l + i * grupo} y={M.t} width={grupo} height={alto} className={hover === i ? 'zona-hover activa' : 'zona-hover'} />
              {series.map((s, k) => { const h = (s.valores[i] / tope) * alto; return <path key={s.nombre} d={barraV(x0 + k * (barra + 2), M.t + alto - h, barra, h)} fill={s.color}><title>{`${s.nombre} ${c}: ${fmt(s.valores[i])}`}</title></path>; })}
              <text x={M.l + i * grupo + grupo / 2} y={H - 8} textAnchor="middle" className="eje-texto">{c}</text>
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div className="tooltip" style={{ left: `${((M.l + (hover + 0.5) * grupo) / W) * 100}%` }}>
          <b>{categorias[hover]}</b>
          {series.map(s => <div key={s.nombre}><i style={{ background: s.color }} />{s.nombre}: <b>{fmt(s.valores[hover])}</b></div>)}
        </div>
      )}
    </Marco>
  );
}

export function Linea({ titulo, subtitulo, categorias, serie }: { titulo: string; subtitulo?: string; categorias: string[]; serie: Serie }) {
  const [hover, setHover] = useState<number | null>(null);
  const { tope, paso } = escala(Math.max(...serie.valores, 1));
  const ancho = W - M.l - M.r, alto = H - M.t - M.b, dx = ancho / categorias.length;
  const pts = serie.valores.map((v, i) => [M.l + (i + 0.5) * dx, M.t + alto - (v / tope) * alto] as const);
  const ultimo = pts.length - 1;
  return (
    <Marco titulo={titulo} subtitulo={subtitulo} tabla={{ columnas: ['Año', serie.nombre], filas: categorias.map((c, i) => [c, serie.valores[i]]) }}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={titulo} onMouseLeave={() => setHover(null)}>
        <Ejes tope={tope} paso={paso} />
        {hover !== null && <line x1={pts[hover][0]} x2={pts[hover][0]} y1={M.t} y2={M.t + alto} className="cruz" />}
        <polyline points={pts.map(p => p.join(',')).join(' ')} fill="none" stroke={serie.color} strokeWidth={2} strokeLinejoin="round" />
        {pts.map(([x, y], i) => (
          <g key={i} onMouseEnter={() => setHover(i)}>
            <rect x={x - dx / 2} y={M.t} width={dx} height={alto} className="zona-hover" />
            <circle cx={x} cy={y} r={hover === i || i === ultimo ? 5 : 4} fill={serie.color} stroke="#fff" strokeWidth={2}><title>{`${categorias[i]}: ${fmt(serie.valores[i])}`}</title></circle>
            <text x={x} y={H - 8} textAnchor="middle" className="eje-texto">{categorias[i]}</text>
          </g>
        ))}
        <text x={pts[ultimo][0]} y={pts[ultimo][1] - 10} textAnchor="middle" className="etiqueta-dato">{fmt(serie.valores[ultimo])}</text>
      </svg>
      {hover !== null && (
        <div className="tooltip" style={{ left: `${(pts[hover][0] / W) * 100}%` }}>
          <b>{categorias[hover]}</b><div><i style={{ background: serie.color }} />{serie.nombre}: <b>{fmt(serie.valores[hover])}</b></div>
        </div>
      )}
    </Marco>
  );
}

export function BarrasHorizontales({ titulo, subtitulo, items, color, columna }: { titulo: string; subtitulo?: string; items: { nombre: string; total: number }[]; color: string; columna: string }) {
  const max = Math.max(...items.map(i => i.total), 1);
  const etiqueta = 118, ancho = W - etiqueta - 60, fila = 34, alto = items.length * fila + 8;
  return (
    <Marco titulo={titulo} subtitulo={subtitulo} tabla={{ columnas: [columna, 'Total'], filas: items.map(i => [i.nombre, i.total]) }}>
      <svg viewBox={`0 0 ${W} ${alto}`} role="img" aria-label={titulo}>
        {items.map((it, i) => {
          const y = 4 + i * fila, w = Math.max((it.total / max) * ancho, it.total ? 2 : 0);
          return (
            <g key={it.nombre}>
              <text x={etiqueta - 8} y={y + 17} textAnchor="end" className="eje-texto fuerte">{it.nombre}</text>
              <rect x={etiqueta} y={y + 4} width={ancho} height={18} className="pista" rx={4} />
              <path d={barraH(etiqueta, y + 4, w, 18)} fill={color}><title>{`${it.nombre}: ${fmt(it.total)}`}</title></path>
              <text x={etiqueta + w + 6} y={y + 17} className="etiqueta-dato">{fmt(it.total)}</text>
            </g>
          );
        })}
      </svg>
    </Marco>
  );
}
