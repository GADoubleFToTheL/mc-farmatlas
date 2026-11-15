/**
 * Angebot direkt am Bauplan: Original-Texturen mit einem Tipp laden, damit die Blöcke
 * aussehen wie im Spiel. Erscheint nur, solange die einfache Darstellung aktiv ist.
 */
import { useState } from 'react';
import { useCatalog } from '../../data/farms';
import { Button, cx } from '../../ui/controls';
import { Icon } from '../../ui/Icon';
import { installTextures } from './install';
import { usePack } from './usePack';

/** „Nicht jetzt“ gilt, bis die App neu geöffnet wird. */
let dismissed = false;

export function TexturePrompt({ dismissible = false, className }: { dismissible?: boolean; className?: string }) {
  const pack = usePack();
  const catalog = useCatalog();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [failed, setFailed] = useState(false);
  const [hidden, setHidden] = useState(dismissed);

  if (pack.status === 'bereit' && !busy) return null;
  if (pack.status === 'laedt' && !busy) return null;
  if (dismissible && hidden && !busy) return null;

  const load = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const result = await installTextures(
        catalog.summaries.map((s) => s.farm),
        (done, total) => setProgress({ done, total }),
      );
      if (!result.ok) setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const problem = failed || pack.status === 'fehler';

  return (
    <div className={cx('rounded-xl border bg-surface p-3 shadow-lg', problem ? 'border-warn/60' : 'border-accent/60', className)} role="region" aria-label="Aussehen der Blöcke">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{problem ? 'Texturen konnten nicht geladen werden' : 'Blöcke wie im Spiel anzeigen?'}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">
            {problem
              ? 'Bitte prüfe deine Internetverbindung und versuche es noch einmal. Bis dahin siehst du einfache Farben.'
              : 'Gerade siehst du einfache Farben. Die Original-Texturen von Mojang werden einmalig auf dein Gerät geladen (braucht kurz Internet, es gilt die Minecraft-EULA).'}
          </p>
        </div>
        {dismissible && !busy && (
          <button
            type="button"
            className="-mt-1 -mr-1 grid size-11 shrink-0 place-items-center rounded-lg text-muted"
            aria-label="Nicht jetzt"
            onClick={() => {
              dismissed = true;
              setHidden(true);
            }}
          >
            <Icon name="close" className="size-5" />
          </button>
        )}
      </div>
      <Button variant="primary" className="mt-2 w-full" disabled={busy} onClick={() => void load()}>
        <Icon name="download" />
        {busy ? (progress ? `Lade … ${progress.done} von ${progress.total}` : 'Lade …') : problem ? 'Erneut versuchen' : 'Wie im Spiel anzeigen'}
      </Button>
    </div>
  );
}
