import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from './Icon';

/** Von unten einfahrendes Blatt (am Desktop zentrierter Dialog). */
export function Sheet({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="m-0 mt-auto max-h-[88dvh] w-full max-w-none rounded-t-2xl border border-line bg-surface p-0 text-ink backdrop:bg-black/60 sm:m-auto sm:max-w-lg sm:rounded-2xl"
    >
      <div className="flex max-h-[88dvh] flex-col">
        <header className="flex items-center gap-2 border-b border-line py-2 pr-2 pl-4">
          <h2 className="flex-1 text-base font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Schließen" className="grid size-11 place-items-center rounded-lg hover:bg-surface-2">
            <Icon name="close" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto overscroll-contain p-4">{children}</div>
        {footer && (
          <footer className="border-t border-line p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">{footer}</footer>
        )}
      </div>
    </dialog>
  );
}
