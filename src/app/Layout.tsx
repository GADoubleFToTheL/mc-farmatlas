import { useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Icon } from '../ui/Icon';
import { UpdatePrompt } from './UpdatePrompt';

export function Layout() {
  const { pathname } = useLocation();

  // Beim Seitenwechsel nach oben springen (nicht beim Wechsel der Reiter einer Farm).
  const page = pathname.split('/').slice(0, 3).join('/');
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-3 px-4">
          <Link to="/" className="flex min-h-11 items-center gap-2.5 rounded-md pr-2 text-lg font-semibold">
            <img src={`${import.meta.env.BASE_URL}icons/icon.svg`} alt="" className="size-7 rounded-[5px]" />
            Farmatlas
          </Link>
          <Link
            to="/import"
            aria-label="Schematic importieren"
            className="ml-auto grid size-11 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink"
          >
            <Icon name="upload" className="size-6" />
          </Link>
          <Link
            to="/einstellungen"
            aria-label="Einstellungen und Backup"
            className="-mr-2 grid size-11 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink"
          >
            <Icon name="settings" className="size-6" />
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
        <Outlet />
      </main>
      <UpdatePrompt />
    </div>
  );
}
