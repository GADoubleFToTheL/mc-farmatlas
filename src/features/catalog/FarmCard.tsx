import { Link } from 'react-router-dom';
import { toggleFavorite } from '../../db/store';
import { CATEGORY_LABELS, EDITION_LABELS, versionFit, type FarmSummary } from '../../lib/catalog';
import { displayName } from '../../lib/names';
import { EDITIONS, type Edition } from '../../lib/schema';
import { Badge, Difficulty, cx } from '../../ui/controls';
import { Icon } from '../../ui/Icon';

export function formatSize(size: { width: number; height: number; depth: number }): string {
  return `${size.width} × ${size.height} × ${size.depth}`;
}

export function FarmCard({
  summary,
  favorite,
  myEdition,
  myVersion,
}: {
  summary: FarmSummary;
  favorite: boolean;
  myEdition: Edition;
  myVersion: string;
}) {
  const { farm, size } = summary;
  const fit = versionFit(farm, myEdition, myVersion);

  return (
    <article className="relative flex flex-col rounded-xl border border-line bg-surface transition-colors hover:border-muted/60">
      <Link to={`/farm/${farm.id}`} className="flex flex-1 flex-col gap-2 p-4 pr-14">
        <p className="text-xs font-medium tracking-wide text-muted uppercase">{CATEGORY_LABELS[farm.category]}</p>
        <h2 className="text-base leading-snug font-semibold">{farm.name}</h2>
        {farm.outputs.length > 0 && (
          <p className="text-sm text-muted">{farm.outputs.map(displayName).join(' · ')}</p>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-1 text-sm text-muted">
          <Difficulty value={farm.difficulty} />
          {size && (
            <span className="font-mono text-xs" title="Breite × Höhe × Tiefe">
              {formatSize(size)}
            </span>
          )}
          {farm.requirements.afk.required && <span>AFK</span>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {EDITIONS.filter((e) => farm.editions[e]).map((e) => (
            <Badge key={e} tone={e === myEdition ? 'accent' : 'neutral'}>
              {EDITION_LABELS[e]}
            </Badge>
          ))}
          {fit === 'andere-edition' && <Badge tone="warn">nicht für {EDITION_LABELS[myEdition]}</Badge>}
          {fit === 'andere-version' && <Badge tone="warn">nicht für {myVersion} bestätigt</Badge>}
          {!summary.hasBlueprint && <Badge tone="warn">Bauplan fehlt</Badge>}
          {summary.local?.kind === 'eigen' && <Badge tone="accent">eigener Import</Badge>}
          {summary.local?.kind === 'angehaengt' && <Badge tone="accent">Bauplan importiert</Badge>}
        </div>
      </Link>
      <button
        type="button"
        onClick={() => toggleFavorite(farm.id)}
        aria-pressed={favorite}
        aria-label={favorite ? `${farm.name} aus den Favoriten entfernen` : `${farm.name} als Favorit merken`}
        className={cx(
          'absolute top-1.5 right-1.5 grid size-12 place-items-center rounded-lg',
          favorite ? 'text-warn' : 'text-muted hover:text-ink',
        )}
      >
        <Icon name="star" className="size-6" filled={favorite} />
      </button>
    </article>
  );
}
