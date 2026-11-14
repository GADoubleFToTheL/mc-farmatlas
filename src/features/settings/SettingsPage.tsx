import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  exportBackup,
  importBackup,
  updateSettings,
  useAllFarmStates,
  usePersistent,
  useSettings,
} from '../../db/store';
import { EDITIONS, type Edition } from '../../lib/schema';
import { isEmptyFarmState, parseBackup, type Backup } from '../../lib/userdata';
import { isValidVersion } from '../../lib/version';
import { EDITION_LABELS } from '../../lib/catalog';
import { Button, Segmented } from '../../ui/controls';
import { Icon } from '../../ui/Icon';

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <h2 className="mb-3 text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function VersionField({ edition }: { edition: Edition }) {
  const settings = useSettings();
  const [value, setValue] = useState(settings.versions[edition]);
  const valid = isValidVersion(value);
  return (
    <label className="block">
      <span className="text-sm text-muted">Version {EDITION_LABELS[edition]}</span>
      <input
        value={value}
        inputMode="decimal"
        autoComplete="off"
        aria-invalid={!valid}
        onChange={(e) => {
          setValue(e.target.value);
          if (isValidVersion(e.target.value)) {
            updateSettings({ versions: { ...settings.versions, [edition]: e.target.value.trim() } });
          }
        }}
        className="mt-1 h-12 w-full rounded-lg border border-line bg-bg px-3 font-mono aria-invalid:border-danger"
      />
      {!valid && <span className="mt-1 block text-sm text-danger">Bitte eine Version wie 26.62 oder 1.21.11 eingeben.</span>}
    </label>
  );
}

export function SettingsPage() {
  const settings = useSettings();
  const persistent = usePersistent();
  const farmStates = useAllFarmStates();
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Backup | null>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const entries = [...farmStates.values()].filter((s) => !isEmptyFarmState(s)).length;

  const download = async () => {
    const backup = await exportBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `farmatlas-backup-${backup.exportedAt.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage({ tone: 'ok', text: `Backup mit ${backup.farmStates.length} Farm-Einträgen gespeichert.` });
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const parsed = parseBackup(await file.text());
    if (parsed.ok) {
      setPending(parsed.backup);
      setMessage(null);
    } else {
      setPending(null);
      setMessage({ tone: 'error', text: parsed.error });
    }
    if (fileInput.current) fileInput.current.value = '';
  };

  const apply = async (mode: 'merge' | 'replace') => {
    if (!pending) return;
    const count = await importBackup(pending, mode);
    setPending(null);
    setMessage({
      tone: 'ok',
      text:
        mode === 'merge'
          ? `${count} Farm-Einträge zusammengeführt. Bei doppelten Einträgen gilt der neuere Stand.`
          : `Daten durch das Backup ersetzt (${count} Farm-Einträge).`,
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1">
        <Link to="/" aria-label="Zurück zur Übersicht" className="-ml-2 grid size-11 place-items-center rounded-lg hover:bg-surface-2">
          <Icon name="back" className="size-6" />
        </Link>
        <h1 className="text-xl font-semibold">Einstellungen</h1>
      </div>

      <Card title="Mein Spiel">
        <p className="mb-3 text-sm text-muted">
          Damit zeigt die Übersicht zuerst die passenden Farmen und warnt, wenn eine Farm für deine Version nicht bestätigt ist.
        </p>
        <Segmented
          label="Meine Edition"
          className="mb-3 w-full"
          value={settings.edition}
          onChange={(edition) => updateSettings({ edition })}
          options={EDITIONS.map((e) => ({ value: e, label: EDITION_LABELS[e] })).reverse()}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <VersionField edition="bedrock" />
          <VersionField edition="java" />
        </div>
      </Card>

      <Card title="Darstellung">
        <Segmented
          label="Farbschema"
          className="w-full"
          value={settings.theme}
          onChange={(theme) => updateSettings({ theme })}
          options={[
            { value: 'dark', label: 'Dunkel' },
            { value: 'light', label: 'Hell' },
          ]}
        />
      </Card>

      <Card title="Backup: Daten zwischen Handy und PC übertragen">
        <p className="text-sm leading-relaxed text-muted">
          Favoriten, Baufortschritt, Notizen und importierte Farmen liegen nur auf diesem Gerät. Speichere ein Backup
          als Datei, schick sie dir selbst (z. B. per E-Mail oder Cloud) und lade sie auf dem anderen Gerät hier wieder ein.
        </p>
        <p className="mt-2 text-sm">
          Auf diesem Gerät: <strong>{entries}</strong> {entries === 1 ? 'Farm' : 'Farmen'} mit eigenen Daten.
        </p>
        {!persistent && (
          <p className="mt-2 flex gap-2 rounded-lg border border-warn/40 bg-warn/10 p-3 text-sm">
            <Icon name="warn" className="mt-0.5 size-4 shrink-0 text-warn" />
            Dieser Browser erlaubt gerade keinen dauerhaften Speicher (z. B. privater Modus). Deine Daten gehen beim Schließen verloren.
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => void download()}>
            <Icon name="download" />
            Backup speichern
          </Button>
          <Button onClick={() => fileInput.current?.click()}>
            <Icon name="upload" />
            Backup laden
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            aria-label="Backup-Datei auswählen"
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
        </div>

        {pending && (
          <div className="mt-3 rounded-lg border border-line bg-bg p-3">
            <p className="text-sm">
              Backup vom <strong>{new Date(pending.exportedAt).toLocaleString('de-DE')}</strong> mit{' '}
              {pending.farmStates.length} Farm-Einträgen. Wie soll es geladen werden?
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="primary" onClick={() => void apply('merge')}>
                Zusammenführen
              </Button>
              <Button onClick={() => void apply('replace')}>Alles ersetzen</Button>
              <Button variant="ghost" onClick={() => setPending(null)}>
                Abbrechen
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted">
              „Zusammenführen“ behält deine Daten und übernimmt pro Farm den neueren Stand. „Alles ersetzen“ löscht die
              Daten auf diesem Gerät und übernimmt auch die Einstellungen aus dem Backup.
            </p>
          </div>
        )}

        {message && (
          <p role="status" className={`mt-3 text-sm ${message.tone === 'ok' ? 'text-accent' : 'text-danger'}`}>
            {message.text}
          </p>
        )}
      </Card>

      <p className="px-1 text-xs leading-relaxed text-muted">
        Farmatlas ist ein privates Fanprojekt ohne Verbindung zu Mojang oder Microsoft. Blöcke werden mit eigenen Farben
        und Symbolen dargestellt, nicht mit Texturen aus dem Spiel.
      </p>
    </div>
  );
}
