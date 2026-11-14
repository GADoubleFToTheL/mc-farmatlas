/**
 * Zeichnet Blöcke auf ein Canvas: eigene Farben und Symbole statt Texturen.
 *  - Pfeil: Ausrichtung (⊙ = nach oben, ⊗ = nach unten)
 *  - Zahl in der Ecke: Verzögerung eines Verstärkers
 *  - halb gefülltes Feld: obere bzw. untere Stufe
 *  - Wasser/Lava: Quelle mit Rahmen, fließend gestreift
 */
import type { Direction } from '../../lib/traits';
import type { BlockVisual } from './visuals';

const ANGLE: Record<Exclude<Direction, 'up' | 'down'>, number> = {
  north: -Math.PI / 2,
  east: 0,
  south: Math.PI / 2,
  west: Math.PI,
};

function rgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function shade(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) =>
    Math.round(factor < 0 ? v * (1 + factor) : v + (255 - v) * factor),
  );
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

function drawArrow(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, dir: Direction, color: string): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1.5, r * 0.22);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (dir === 'up' || dir === 'down') {
    const ring = r * 0.72;
    ctx.beginPath();
    ctx.arc(cx, cy, ring, 0, Math.PI * 2);
    ctx.stroke();
    if (dir === 'up') {
      ctx.beginPath();
      ctx.arc(cx, cy, ring * 0.3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const d = ring * 0.55;
      ctx.beginPath();
      ctx.moveTo(cx - d, cy - d);
      ctx.lineTo(cx + d, cy + d);
      ctx.moveTo(cx + d, cy - d);
      ctx.lineTo(cx - d, cy + d);
      ctx.stroke();
    }
  } else {
    ctx.translate(cx, cy);
    ctx.rotate(ANGLE[dir]);
    ctx.beginPath();
    ctx.moveTo(-r * 0.85, 0);
    ctx.lineTo(r * 0.1, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(r * 0.9, 0);
    ctx.lineTo(r * 0.05, -r * 0.6);
    ctx.lineTo(r * 0.05, r * 0.6);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function edgePoint(dir: Direction, x: number, y: number, s: number, inset: number): [number, number] {
  const c = s / 2;
  switch (dir) {
    case 'north':
      return [x + c, y + inset];
    case 'south':
      return [x + c, y + s - inset];
    case 'east':
      return [x + s - inset, y + c];
    case 'west':
      return [x + inset, y + c];
    default:
      return [x + c, y + c];
  }
}

function text(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, size: number, color: string, bold = true): void {
  ctx.font = `${bold ? '600 ' : ''}${size}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(value, x, y + size * 0.05);
}

export interface DrawOptions {
  /** Kürzel einblenden (bei kleinen Zellen aus). */
  labels?: boolean;
}

/** Zeichnet einen Block in das Quadrat (x, y, s). */
export function drawBlock(
  ctx: CanvasRenderingContext2D,
  v: BlockVisual,
  x: number,
  y: number,
  s: number,
  options: DrawOptions = {},
): void {
  const { traits, style } = v;
  const gap = s >= 14 ? 0.5 : 0;
  const cx = x + s / 2;
  const cy = y + s / 2;
  let symbolDrawn = false;

  if (v.shape === 'fluid' && traits.fluid) {
    const { source, level } = traits.fluid;
    ctx.fillStyle = source ? style.color : rgba(style.color, 0.45);
    ctx.fillRect(x + gap, y + gap, s - 2 * gap, s - 2 * gap);
    if (source) {
      // Quelle: heller Innenrahmen
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = Math.max(1.5, s * 0.07);
      const i = s * 0.2;
      ctx.strokeRect(x + i, y + i, s - 2 * i, s - 2 * i);
    } else {
      // Fließend: Schrägstreifen
      ctx.save();
      ctx.beginPath();
      ctx.rect(x + gap, y + gap, s - 2 * gap, s - 2 * gap);
      ctx.clip();
      ctx.strokeStyle = rgba(style.color, 0.95);
      ctx.lineWidth = Math.max(1, s * 0.08);
      for (let k = -1; k < 3; k++) {
        ctx.beginPath();
        ctx.moveTo(x + k * s * 0.4, y + s);
        ctx.lineTo(x + k * s * 0.4 + s * 0.6, y);
        ctx.stroke();
      }
      ctx.restore();
      if (level >= 8) drawArrow(ctx, cx, cy, s * 0.26, 'down', '#ffffff');
    }
    return;
  }

  if (v.shape === 'wire') {
    ctx.strokeStyle = style.color;
    ctx.fillStyle = style.color;
    ctx.lineWidth = Math.max(2, s * 0.16);
    ctx.lineCap = 'round';
    const sides = traits.wire ?? [];
    for (const side of sides) {
      const [ex, ey] = edgePoint(side, x, y, s, 0);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(cx, cy, s * (sides.length > 0 ? 0.12 : 0.24), 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (v.shape === 'inset') {
    const i = s * 0.16;
    ctx.fillStyle = rgba(style.color, 0.22);
    ctx.fillRect(x + gap, y + gap, s - 2 * gap, s - 2 * gap);
    ctx.fillStyle = style.color;
    ctx.beginPath();
    ctx.roundRect(x + i, y + i, s - 2 * i, s - 2 * i, s * 0.14);
    ctx.fill();
  } else if (traits.half && traits.half !== 'double') {
    // Stufe: dunkler Grund, helle Hälfte oben bzw. unten (wie von der Seite gesehen)
    ctx.fillStyle = shade(style.color, -0.55);
    ctx.fillRect(x + gap, y + gap, s - 2 * gap, s - 2 * gap);
    ctx.fillStyle = style.color;
    const h = (s - 2 * gap) / 2;
    ctx.fillRect(x + gap, traits.half === 'top' ? y + gap : y + gap + h, s - 2 * gap, h);
    symbolDrawn = true;
  } else {
    ctx.fillStyle = style.color;
    ctx.fillRect(x + gap, y + gap, s - 2 * gap, s - 2 * gap);
    if (traits.half === 'double') {
      ctx.strokeStyle = shade(style.color, -0.45);
      ctx.lineWidth = Math.max(1, s * 0.05);
      ctx.beginPath();
      ctx.moveTo(x + gap, cy);
      ctx.lineTo(x + s - gap, cy);
      ctx.stroke();
    }
  }

  const id = v.state.id.slice(v.state.id.indexOf(':') + 1);

  if (traits.arrow) {
    // Kolben: Balken an der Stoßseite. Beobachter: roter Punkt am Signalausgang (hinten).
    if ((id === 'piston' || id === 'sticky_piston') && traits.arrow !== 'up' && traits.arrow !== 'down') {
      ctx.fillStyle = shade(style.color, -0.5);
      const t = s * 0.14;
      if (traits.arrow === 'north') ctx.fillRect(x + gap, y + gap, s - 2 * gap, t);
      if (traits.arrow === 'south') ctx.fillRect(x + gap, y + s - gap - t, s - 2 * gap, t);
      if (traits.arrow === 'west') ctx.fillRect(x + gap, y + gap, t, s - 2 * gap);
      if (traits.arrow === 'east') ctx.fillRect(x + s - gap - t, y + gap, t, s - 2 * gap);
    }
    if (id === 'observer' && traits.arrow !== 'up' && traits.arrow !== 'down') {
      const back = ({ north: 'south', south: 'north', east: 'west', west: 'east' } as const)[traits.arrow];
      const [bx, by] = edgePoint(back, x, y, s, s * 0.16);
      ctx.fillStyle = '#ff4a3a';
      ctx.beginPath();
      ctx.arc(bx, by, Math.max(1.5, s * 0.09), 0, Math.PI * 2);
      ctx.fill();
    }
    drawArrow(ctx, cx, cy, s * 0.3, traits.arrow, style.ink);
    symbolDrawn = true;
  }

  if (traits.delay && s >= 14) {
    const r = s * 0.2;
    ctx.fillStyle = '#b81a10';
    ctx.beginPath();
    ctx.arc(x + s - r - 1, y + s - r - 1, r, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, String(traits.delay), x + s - r - 1, y + s - r - 1, r * 1.5, '#ffffff');
  }

  if (traits.waterlogged) {
    ctx.fillStyle = '#3f76e4';
    ctx.beginPath();
    ctx.moveTo(x + gap, y + s - gap);
    ctx.lineTo(x + gap, y + s * 0.6);
    ctx.lineTo(x + s * 0.4, y + s - gap);
    ctx.closePath();
    ctx.fill();
  }

  if (options.labels) {
    if (!symbolDrawn && s >= 24) {
      text(ctx, v.label, cx, cy, Math.min(15, s * 0.36), style.ink);
    } else if (symbolDrawn && s >= 44) {
      text(ctx, v.label, x + s * 0.2, y + s * 0.17, s * 0.2, style.ink, false);
    }
  }
}
