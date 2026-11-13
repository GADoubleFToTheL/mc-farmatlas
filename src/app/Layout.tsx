import { Link, Outlet } from 'react-router-dom';
import { UpdatePrompt } from './UpdatePrompt';

export function Layout() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-3 px-4">
          <Link to="/" className="flex min-h-11 items-center gap-2.5 rounded-md pr-2 text-lg font-semibold">
            <img src={`${import.meta.env.BASE_URL}icons/icon.svg`} alt="" className="size-7 rounded-[5px]" />
            Farmatlas
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-4">
        <Outlet />
      </main>
      <UpdatePrompt />
    </div>
  );
}
