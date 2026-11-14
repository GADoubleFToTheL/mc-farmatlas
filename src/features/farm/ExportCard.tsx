import { useState } from 'react';
import type { Structure } from '../../lib/structure';
import { slugify } from '../../lib/localfarm';
import { Button } from '../../ui/controls';
import { Icon } from '../../ui/Icon';

function download(bytes: Uint8Array, fileName: string): void {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/octet-stream' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

/** Export des (gedrehten) Bauplans als Datei für Litematica bzw. den Bedrock-Konstruktionsblock. */
export function ExportCard({
  structure,
  name,
  bedrockVersion,
  rotated,
}: {
  structure: Structure;
  name: string;
  bedrockVersion: string;
  rotated: boolean;
}) {
  const [message, setMessage] = useState<{ tone: 'ok' | 'warn' | 'error'; lines: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const base = slugify(name);

  const run = async (kind: 'litematic' | 'mcstructure') => {
    setBusy(true);
    try {
      if (kind === 'litematic') {
        const { exportLitematic } = await import('../../lib/exporters/litematic');
        download(await exportLitematic(structure, { name }), `${base}.litematic`);
        setMessage({ tone: 'ok', lines: [`${base}.litematic gespeichert. Lege die Datei in den Ordner „schematics“ deiner Minecraft-Installation.`] });
      } else {
        const { exportMcstructure } = await import('../../lib/exporters/mcstructure');
        const result = exportMcstructure(structure, { bedrockVersion });
        download(result.bytes, `${base}.mcstructure`);
        setMessage({
          tone: result.warnings.length > 0 ? 'warn' : 'ok',
          lines: [`${base}.mcstructure gespeichert.`, ...result.warnings],
        });
      }
    } catch (e) {
      setMessage({ tone: 'error', lines: [`Export fehlgeschlagen: ${e instanceof Error ? e.message : String(e)}`] });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <h3 className="text-sm font-semibold text-muted">Bauplan exportieren{rotated ? ' (in der gewählten Ausrichtung)' : ''}</h3>
      <div className="mt-2.5 flex flex-wrap gap-2">
        <Button disabled={busy} onClick={() => void run('mcstructure')}>
          <Icon name="download" />
          .mcstructure (Bedrock)
        </Button>
        <Button disabled={busy} onClick={() => void run('litematic')}>
          <Icon name="download" />
          .litematic (Java)
        </Button>
      </div>
      <p className="mt-2.5 text-xs leading-relaxed text-muted">
        <strong className="font-semibold text-ink">Bedrock:</strong> Laden mit einem Konstruktionsblock – den Import-Knopf gibt es nur unter
        Windows. Dieser Export ist noch nicht im Spiel getestet; prüfe das Ergebnis zuerst in einer Kreativwelt.{' '}
        <strong className="font-semibold text-ink">Java:</strong> Mit der Mod Litematica als Hologramm einblenden.
      </p>
      {message && (
        <div role="status" className={`mt-2 text-sm leading-relaxed ${message.tone === 'ok' ? 'text-accent' : message.tone === 'warn' ? 'text-warn' : 'text-danger'}`}>
          {message.lines.map((l) => (
            <p key={l}>{l}</p>
          ))}
        </div>
      )}
    </section>
  );
}
