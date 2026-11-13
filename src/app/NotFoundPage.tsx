import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h1 className="text-xl font-semibold">Seite nicht gefunden</h1>
      <p className="mt-2 text-muted">Diese Adresse gibt es im Farmatlas nicht.</p>
      <Link
        to="/"
        className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-accent px-4 font-semibold text-accent-ink"
      >
        Zur Übersicht
      </Link>
    </section>
  );
}
