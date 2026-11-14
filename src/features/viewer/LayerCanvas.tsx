/**
 * Canvas für eine Ebene: Raster, Lineal (relativ zum Startblock),
 * Pinch-Zoom, Verschieben, Wischen zum Ebenenwechsel, Antippen.
 */
import { useCallback, useEffect, useImperativeHandle, useRef, type CSSProperties, type Ref } from 'react';
import { paletteIndexAt, type Structure } from '../../lib/structure';
import { drawBlock } from './draw';
import type { BlockVisual } from './visuals';

const RULER_LEFT = 28;
const RULER_TOP = 22;
const MAX_FIT_CELL = 56;
const MAX_CELL = 110;

export interface CellPos {
  x: number;
  z: number;
}

export interface LayerCanvasHandle {
  resetZoom: () => void;
}

interface Props {
  structure: Structure;
  visuals: Array<BlockVisual | null>;
  /** Nullbasierte Ebene. */
  layer: number;
  showBelow: boolean;
  start: { x: number; y: number; z: number };
  selected: CellPos | null;
  /** Palettenindizes, die hervorgehoben werden (aus der Legende). */
  highlight: ReadonlySet<number> | null;
  onSelect: (cell: CellPos | null) => void;
  /** +1 = nächste (höhere) Ebene, −1 = vorherige. */
  onSwipe: (direction: 1 | -1) => void;
  /** true: Seite scrollt nie mit (Bau-Modus). */
  lockScroll?: boolean;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<LayerCanvasHandle>;
}

interface View {
  scale: number;
  ox: number;
  oy: number;
  fit: number;
}

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function rulerStep(scale: number): number {
  for (const step of [1, 2, 5, 10, 20, 50]) if (step * scale >= 24) return step;
  return 100;
}

export function LayerCanvas({
  structure,
  visuals,
  layer,
  showBelow,
  start,
  selected,
  highlight,
  onSelect,
  onSwipe,
  lockScroll = false,
  className,
  style,
  ref,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const view = useRef<View>({ scale: 24, ox: 0, oy: 0, fit: 24 });
  const size = useRef({ w: 0, h: 0 });
  const frame = useRef(0);
  const props = useRef({ structure, visuals, layer, showBelow, start, selected, highlight });
  props.current = { structure, visuals, layer, showBelow, start, selected, highlight };

  const clamp = useCallback(() => {
    const v = view.current;
    const { w, h } = size.current;
    const { size: s } = props.current.structure;
    const vw = w - RULER_LEFT;
    const vh = h - RULER_TOP;
    const gw = s.x * v.scale;
    const gh = s.z * v.scale;
    v.ox = gw <= vw ? (vw - gw) / 2 : Math.min(0, Math.max(vw - gw, v.ox));
    v.oy = gh <= vh ? (vh - gh) / 2 : Math.min(0, Math.max(vh - gh, v.oy));
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const p = props.current;
    const v = view.current;
    const { w, h } = size.current;
    const dpr = window.devicePixelRatio || 1;
    const { x: sx, z: sz } = p.structure.size;
    const c = v.scale;
    const gx = RULER_LEFT + v.ox;
    const gy = RULER_TOP + v.oy;
    const colors = {
      bg: cssVar('--bg'),
      surface: cssVar('--surface'),
      line: cssVar('--line'),
      muted: cssVar('--muted'),
      accent: cssVar('--accent'),
      ink: cssVar('--ink'),
    };

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, w, h);

    // Sichtbarer Ausschnitt
    const x0 = Math.max(0, Math.floor(-v.ox / c));
    const x1 = Math.min(sx, Math.ceil((w - gx) / c));
    const z0 = Math.max(0, Math.floor(-v.oy / c));
    const z1 = Math.min(sz, Math.ceil((h - gy) / c));

    ctx.save();
    ctx.beginPath();
    ctx.rect(RULER_LEFT, RULER_TOP, w - RULER_LEFT, h - RULER_TOP);
    ctx.clip();

    // Fläche des Bauplans
    ctx.fillStyle = colors.surface;
    ctx.fillRect(gx, gy, sx * c, sz * c);

    const labels = c >= 24;
    for (let z = z0; z < z1; z++) {
      for (let x = x0; x < x1; x++) {
        const index = paletteIndexAt(p.structure, x, p.layer, z);
        const px = gx + x * c;
        const py = gy + z * c;
        if (index !== 0) {
          const visual = p.visuals[index];
          if (!visual) continue;
          const dim = p.highlight !== null && !p.highlight.has(index);
          if (dim) ctx.globalAlpha = 0.22;
          drawBlock(ctx, visual, px, py, c, { labels });
          ctx.globalAlpha = 1;
        } else if (p.showBelow && p.layer > 0) {
          const below = p.visuals[paletteIndexAt(p.structure, x, p.layer - 1, z)];
          if (below) {
            ctx.globalAlpha = 0.26;
            drawBlock(ctx, below, px, py, c);
            ctx.globalAlpha = 1;
          }
        }
      }
    }

    // Rasterlinien
    if (c >= 8) {
      ctx.strokeStyle = colors.line;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = x0; x <= x1; x++) {
        const px = Math.round(gx + x * c) + 0.5;
        ctx.moveTo(px, gy + z0 * c);
        ctx.lineTo(px, gy + z1 * c);
      }
      for (let z = z0; z <= z1; z++) {
        const py = Math.round(gy + z * c) + 0.5;
        ctx.moveTo(gx + x0 * c, py);
        ctx.lineTo(gx + x1 * c, py);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Startblock: Rahmen mit Ecke
    if (p.start.y === p.layer) {
      const px = gx + p.start.x * c;
      const py = gy + p.start.z * c;
      ctx.strokeStyle = colors.accent;
      ctx.lineWidth = Math.max(2, c * 0.1);
      ctx.strokeRect(px + 1, py + 1, c - 2, c - 2);
      ctx.fillStyle = colors.accent;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + c * 0.42, py);
      ctx.lineTo(px, py + c * 0.42);
      ctx.closePath();
      ctx.fill();
    }

    // Auswahl
    if (p.selected) {
      ctx.strokeStyle = colors.ink;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(gx + p.selected.x * c + 1, gy + p.selected.z * c + 1, c - 2, c - 2);
    }
    ctx.restore();

    // Lineal (Abstand zum Startblock; 0 = Spalte/Zeile des Startblocks)
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, w, RULER_TOP);
    ctx.fillRect(0, 0, RULER_LEFT, h);
    ctx.font = '11px ui-monospace, Menlo, Consolas, monospace';
    ctx.textBaseline = 'middle';
    const step = rulerStep(c);
    ctx.textAlign = 'center';
    for (let x = x0; x < x1; x++) {
      const rel = x - p.start.x;
      if (rel % step !== 0) continue;
      const px = gx + (x + 0.5) * c;
      if (px < RULER_LEFT + 6) continue;
      ctx.fillStyle = rel === 0 ? colors.accent : colors.muted;
      ctx.fillText(String(rel), px, RULER_TOP / 2);
    }
    ctx.textAlign = 'right';
    for (let z = z0; z < z1; z++) {
      const rel = z - p.start.z;
      if (rel % step !== 0) continue;
      const py = gy + (z + 0.5) * c;
      if (py < RULER_TOP + 6) continue;
      ctx.fillStyle = rel === 0 ? colors.accent : colors.muted;
      ctx.fillText(String(rel), RULER_LEFT - 5, py);
    }
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, RULER_LEFT, RULER_TOP);
  }, []);

  const requestDraw = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(draw);
  }, [draw]);

  const fit = useCallback(() => {
    const { w, h } = size.current;
    const { size: s } = props.current.structure;
    if (w === 0 || h === 0) return;
    const scale = Math.max(4, Math.min(MAX_FIT_CELL, (w - RULER_LEFT - 8) / s.x, (h - RULER_TOP - 8) / s.z));
    view.current = { scale, fit: scale, ox: 0, oy: 0 };
    clamp();
    requestDraw();
  }, [clamp, requestDraw]);

  useImperativeHandle(ref, () => ({ resetZoom: fit }), [fit]);

  // Größe verfolgen
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const zoomed = view.current.scale > view.current.fit * 1.02;
      size.current = { w: rect.width, h: rect.height };
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      if (zoomed) {
        clamp();
        requestDraw();
      } else {
        fit();
      }
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [clamp, fit, requestDraw]);

  // Neuer Bauplan → neu einpassen
  useEffect(() => {
    fit();
  }, [structure, fit]);

  useEffect(() => {
    requestDraw();
  }, [layer, showBelow, selected, highlight, visuals, start, requestDraw]);

  // Farbwechsel (hell/dunkel) neu zeichnen
  useEffect(() => {
    const observer = new MutationObserver(requestDraw);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, [requestDraw]);

  const zoomAt = useCallback(
    (px: number, py: number, factor: number) => {
      const v = view.current;
      const next = Math.min(MAX_CELL, Math.max(v.fit, v.scale * factor));
      const wx = (px - RULER_LEFT - v.ox) / v.scale;
      const wz = (py - RULER_TOP - v.oy) / v.scale;
      v.scale = next;
      v.ox = px - RULER_LEFT - wx * next;
      v.oy = py - RULER_TOP - wz * next;
      clamp();
      updateTouchAction();
      requestDraw();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clamp, requestDraw],
  );

  const isZoomed = () => view.current.scale > view.current.fit * 1.02;

  const updateTouchAction = () => {
    const canvas = canvasRef.current;
    if (canvas) canvas.style.touchAction = lockScroll || isZoomed() ? 'none' : 'pan-y';
  };

  useEffect(updateTouchAction);

  // Zeiger: 1 Finger = verschieben/wischen/tippen, 2 Finger = Pinch-Zoom
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({ startX: 0, startY: 0, startTime: 0, moved: false, pinchDist: 0, lastTap: 0, multi: false });

  const local = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    e.currentTarget.setPointerCapture(e.pointerId);
    const g = gesture.current;
    if (pointers.current.size === 1) {
      g.startX = p.x;
      g.startY = p.y;
      g.startTime = performance.now();
      g.moved = false;
      g.multi = false;
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      g.pinchDist = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      g.multi = true;
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const p = local(e);
    const g = gesture.current;
    if (pointers.current.size === 2) {
      pointers.current.set(e.pointerId, p);
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      const mx = (a!.x + b!.x) / 2;
      const my = (a!.y + b!.y) / 2;
      if (g.pinchDist > 0) zoomAt(mx, my, dist / g.pinchDist);
      g.pinchDist = dist;
      view.current.ox += (p.x - prev.x) / 2;
      view.current.oy += (p.y - prev.y) / 2;
      clamp();
      requestDraw();
      return;
    }
    if (Math.hypot(p.x - g.startX, p.y - g.startY) > 8) g.moved = true;
    if (isZoomed() && g.moved) {
      view.current.ox += p.x - prev.x;
      view.current.oy += p.y - prev.y;
      clamp();
      requestDraw();
    }
    pointers.current.set(e.pointerId, p);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = local(e);
    const wasSingle = pointers.current.size === 1;
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (!wasSingle || g.multi) return;
    const dx = p.x - g.startX;
    const dy = p.y - g.startY;
    const now = performance.now();

    if (!g.moved) {
      // Doppeltipp: Zoom zurücksetzen bzw. hineinzoomen
      if (now - g.lastTap < 300) {
        if (isZoomed()) fit();
        else zoomAt(p.x, p.y, 2.2);
        g.lastTap = 0;
        return;
      }
      g.lastTap = now;
      const v = view.current;
      const x = Math.floor((p.x - RULER_LEFT - v.ox) / v.scale);
      const z = Math.floor((p.y - RULER_TOP - v.oy) / v.scale);
      const s = props.current.structure.size;
      const inside = p.x >= RULER_LEFT && p.y >= RULER_TOP && x >= 0 && z >= 0 && x < s.x && z < s.z;
      const current = props.current.selected;
      onSelect(inside && !(current && current.x === x && current.z === z) ? { x, z } : null);
      return;
    }
    // Wischen wechselt die Ebene – nur wenn nicht hineingezoomt (sonst wird verschoben)
    if (!isZoomed() && Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.8 && now - g.startTime < 700) {
      onSwipe(dx < 0 ? 1 : -1);
    }
  };

  const onPointerCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    pointers.current.delete(e.pointerId);
  };

  // Mausrad zoomt (nicht passiv, damit die Seite nicht mitscrollt)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !isZoomed() && e.deltaY > 0) return; // Seite normal scrollen lassen
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      zoomAt(e.clientX - rect.left, e.clientY - rect.top, Math.exp(-e.deltaY * 0.0022));
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const { w, h } = size.current;
    if (e.key === '+' || e.key === '=') zoomAt(w / 2, h / 2, 1.3);
    else if (e.key === '-') zoomAt(w / 2, h / 2, 1 / 1.3);
    else if (e.key === '0') fit();
    else if (e.key === 'ArrowRight' || e.key === 'PageUp') onSwipe(1);
    else if (e.key === 'ArrowLeft' || e.key === 'PageDown') onSwipe(-1);
    else return;
    e.preventDefault();
  };

  return (
    <canvas
      ref={canvasRef}
      tabIndex={0}
      role="img"
      aria-label={`Bauplan, Ebene ${layer + 1} von ${structure.size.y}. Die Blöcke stehen in der Legende.`}
      className={className}
      style={style}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onKeyDown={onKeyDown}
    />
  );
}
