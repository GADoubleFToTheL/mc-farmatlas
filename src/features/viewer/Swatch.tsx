import { useEffect, useRef } from 'react';
import { drawBlock } from './draw';
import type { BlockVisual } from './visuals';

/**
 * Kleines Vorschaubild eines Blocks: mit Original-Textur (schräg von oben, wie im
 * Inventar), sonst farbig mit denselben Symbolen wie im Raster.
 */
export function Swatch({ visual, size = 32, icon }: { visual: BlockVisual; size?: number; icon?: CanvasImageSource | null }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    if (icon) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(icon, 0, 0, size, size);
    } else {
      drawBlock(ctx, visual, 0, 0, size, { labels: true });
    }
  }, [visual, size, icon]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{ width: size, height: size }}
      className={`shrink-0 rounded-[3px] ${icon ? '' : 'bg-surface-2'}`}
    />
  );
}
