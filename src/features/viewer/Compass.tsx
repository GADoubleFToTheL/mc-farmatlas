/** Kompass: Norden ist im Raster immer oben. */
export function Compass() {
  return (
    <div
      aria-label="Kompass: Norden ist oben, Osten rechts"
      role="img"
      className="pointer-events-none absolute right-2 bottom-2 grid size-14 place-items-center rounded-full border border-line bg-bg/85 font-mono text-[10px] text-muted"
    >
      <span className="absolute top-0.5 text-xs font-bold text-accent">N</span>
      <span className="absolute right-1.5">O</span>
      <span className="absolute bottom-0.5">S</span>
      <span className="absolute left-1.5">W</span>
      <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
        <path d="M12 3 16 12H8Z" fill="var(--accent)" />
        <path d="M12 21 8 12h8Z" fill="var(--line)" />
      </svg>
    </div>
  );
}
