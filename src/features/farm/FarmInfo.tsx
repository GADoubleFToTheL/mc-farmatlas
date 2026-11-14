import type { ReactNode } from 'react';
import {
  CATEGORY_LABELS,
  DIFFICULTY_LABELS,
  DIMENSION_LABELS,
  EDITION_LABELS,
  STATUS_LABELS,
  type FarmSummary,
} from '../../lib/catalog';
import { displayName } from '../../lib/names';
import { EDITIONS, type Edition, type Farm } from '../../lib/schema';
import { Badge, Difficulty } from '../../ui/controls';
import { Icon } from '../../ui/Icon';
import { formatSize } from '../catalog/FarmCard';

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <h2 className="mb-2.5 text-sm font-semibold tracking-wide text-muted uppercase">{title}</h2>
      {children}
    </section>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="contents">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

const ORIGIN_LABELS: Record<NonNullable<Farm['blueprintOrigin']>['kind'], string> = {
  quelle: 'aus der Quelle übernommen',
  standarddesign: 'eigene Umsetzung eines Standarddesigns',
  import: 'aus Schematic importiert',
};

const ACCESS_LABELS = {
  frei: 'frei ladbar',
  login: 'nur mit Anmeldung',
  discord: 'nur über Discord',
  bezahlt: 'kostenpflichtig',
  unklar: 'Zugang unklar',
} as const;

function formatRate(n: number): string {
  return n.toLocaleString('de-DE');
}

export function FarmInfo({
  summary,
  myEdition,
  onOpenLayer,
}: {
  summary: FarmSummary;
  myEdition: Edition;
  onOpenLayer: (layer: number) => void;
}) {
  const { farm, size } = summary;
  const req = farm.requirements;
  const notes = EDITIONS.filter((e) => farm.editions[e] && farm.editionNotes?.[e]);
  const rateSource = farm.rate ? farm.sources[farm.rate.source] : undefined;

  return (
    <div className="flex flex-col gap-3">
      <Card title="Steckbrief">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
          <Fact label="Kategorie">{CATEGORY_LABELS[farm.category]}</Fact>
          {farm.outputs.length > 0 && <Fact label="Ertrag">{farm.outputs.map(displayName).join(', ')}</Fact>}
          <Fact label="Schwierigkeit">
            <span className="inline-flex items-center gap-2">
              <Difficulty value={farm.difficulty} /> {DIFFICULTY_LABELS[farm.difficulty]}
            </span>
          </Fact>
          <Fact label="Maße (B × H × T)">
            {size ? (
              <>
                <span className="font-mono">{formatSize(size)}</span>
                {!summary.sizeFromBlueprint && <span className="text-muted"> · laut Quelle</span>}
              </>
            ) : (
              <span className="text-muted">nicht bekannt</span>
            )}
          </Fact>
          <Fact label="Rate pro Stunde">
            {farm.rate ? (
              <>
                {farm.rate.entries.map((e) => `${formatRate(e.perHour)} ${displayName(e.item)}`).join(', ')}
                <span className="text-muted"> · laut Quelle{rateSource ? ` (${rateSource.author})` : ''}</span>
                {farm.rate.note && <span className="block text-muted">{farm.rate.note}</span>}
              </>
            ) : (
              <span className="text-muted">keine Angabe in der Quelle</span>
            )}
          </Fact>
          <Fact label="Edition">
            <span className="flex flex-col gap-1">
              {EDITIONS.filter((e) => farm.editions[e]).map((e) => (
                <span key={e}>
                  <Badge tone={e === myEdition ? 'accent' : 'neutral'}>{EDITION_LABELS[e]}</Badge>{' '}
                  <span className="font-mono text-xs">
                    {farm.editions[e]!.from} – {farm.editions[e]!.to}
                  </span>
                </span>
              ))}
            </span>
          </Fact>
          <Fact label="Status">{STATUS_LABELS[farm.status]}</Fact>
        </dl>
      </Card>

      <Card title="Voraussetzungen">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
          <Fact label="Dimension">{req.dimension.map((d) => DIMENSION_LABELS[d]).join(', ')}</Fact>
          {req.biome && <Fact label="Biom">{req.biome}</Fact>}
          {req.yLevel && <Fact label="Y-Höhe">{req.yLevel}</Fact>}
          {req.specialLocation && <Fact label="Sonderort">{req.specialLocation}</Fact>}
          <Fact label="AFK">
            {req.afk.required ? 'nötig' : 'nicht nötig'}
            {req.afk.distance && ` · ${req.afk.distance}`}
            {req.afk.note && <span className="block text-muted">{req.afk.note}</span>}
          </Fact>
          {req.mobs.length > 0 && <Fact label="Mobs">{req.mobs.join(', ')}</Fact>}
          {req.simulationDistance && <Fact label="Simulationsdistanz">{req.simulationDistance}</Fact>}
          <Fact label="Chunk-Grenzen">
            {req.chunkAligned ? 'wichtig' : 'egal'}
            {req.chunkNote && <span className="block text-muted">{req.chunkNote}</span>}
          </Fact>
        </dl>
      </Card>

      {notes.length > 0 && (
        <Card title="Unterschiede zwischen den Editionen">
          {notes.map((e) => (
            <p key={e} className="mb-1.5 text-sm leading-relaxed last:mb-0">
              <Badge tone={e === myEdition ? 'accent' : 'neutral'}>{EDITION_LABELS[e]}</Badge> {farm.editionNotes![e]}
            </p>
          ))}
        </Card>
      )}

      <Card title="Funktionsprinzip">
        <p className="text-sm leading-relaxed">{farm.principle}</p>
      </Card>

      {farm.steps.length > 0 && (
        <Card title="Bauschritte">
          <ol className="flex flex-col gap-3">
            {farm.steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-2 font-mono text-sm font-semibold">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-relaxed">{step.text}</p>
                  {step.layers && step.layers.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {step.layers.map((l) => (
                        <button
                          key={l}
                          type="button"
                          onClick={() => onOpenLayer(l - 1)}
                          className="inline-flex min-h-9 items-center gap-1 rounded-md border border-line px-2.5 text-xs font-medium text-accent hover:bg-surface-2"
                        >
                          <Icon name="layers" className="size-4" />
                          Ebene {l}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {farm.pitfalls.length > 0 && (
        <Card title="Häufige Fehler">
          <ul className="flex flex-col gap-2">
            {farm.pitfalls.map((p) => (
              <li key={p} className="flex gap-2.5 text-sm leading-relaxed">
                <Icon name="warn" className="mt-0.5 size-4 shrink-0 text-warn" />
                {p}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="Quellen und Herkunft">
        <ul className="flex flex-col gap-2">
          {farm.sources.map((s) => (
            <li key={s.url}>
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-accent underline-offset-2 hover:underline"
              >
                <Icon name="external" className="size-4 shrink-0" />
                <span>
                  {s.title}
                  <span className="block text-xs font-normal text-muted">
                    {s.author}
                    {s.license && ` · ${s.license}`}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
        {farm.blueprintOrigin && (
          <p className="mt-2 border-t border-line pt-2 text-sm leading-relaxed">
            <span className="font-medium">Bauplan: {ORIGIN_LABELS[farm.blueprintOrigin.kind]}.</span>{' '}
            <span className="text-muted">{farm.blueprintOrigin.note}</span>
          </p>
        )}
        {farm.schematics && farm.schematics.length > 0 && (
          <div className="mt-2 border-t border-line pt-2">
            <p className="text-sm font-medium">Bekannte Schematic-Dateien</p>
            <ul className="mt-1 flex flex-col gap-1">
              {farm.schematics.map((s) => (
                <li key={s.url}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex min-h-11 items-center gap-2 text-sm text-accent underline-offset-2 hover:underline"
                  >
                    <Icon name="download" className="size-4 shrink-0" />
                    <span>
                      .{s.format} · {ACCESS_LABELS[s.access]}
                      {s.note && <span className="block text-xs text-muted">{s.note}</span>}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </div>
  );
}
