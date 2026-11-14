/** Kompassrose: Norden ist im Raster immer oben. */
export function Compass({ className = '' }: { className?: string }) {
  return (
    <div
      aria-label="Kompass: Norden ist oben, Osten rechts"
      role="img"
      className={`relative grid size-12 shrink-0 place-items-center rounded-full border border-line font-mono text-[10px] text-muted ${className}`}
    >
      <span className="absolute top-0 text-xs font-bold text-accent">N</span>
      <span className="absolute right-1">O</span>
      <span className="absolute bottom-0">S</span>
      <span className="absolute left-1">W</span>
      <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
        <path d="M12 3 16 12H8Z" fill="var(--accent)" />
        <path d="M12 21 8 12h8Z" fill="var(--line)" />
      </svg>
    </div>
  );
}
