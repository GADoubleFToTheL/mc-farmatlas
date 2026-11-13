import { useRegisterSW } from 'virtual:pwa-register/react';

/** Zeigt „Neue Version verfügbar“ bzw. einmalig „Offline bereit“. */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Bei lange geöffneter App stündlich nach einer neuen Version sehen.
      if (registration) setInterval(() => void registration.update(), 60 * 60 * 1000);
    },
  });

  if (!needRefresh && !offlineReady) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-50 mx-auto flex max-w-md items-center gap-3 rounded-xl border border-line bg-surface-2 p-3 shadow-lg shadow-black/40"
    >
      <p className="flex-1 text-sm">
        {needRefresh ? 'Eine neue Version ist verfügbar.' : 'Farmatlas ist jetzt offline nutzbar.'}
      </p>
      {needRefresh && (
        <button
          type="button"
          className="min-h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-ink"
          onClick={() => void updateServiceWorker(true)}
        >
          Aktualisieren
        </button>
      )}
      <button
        type="button"
        className="min-h-11 rounded-lg px-3 text-sm text-muted"
        onClick={() => {
          setNeedRefresh(false);
          setOfflineReady(false);
        }}
      >
        {needRefresh ? 'Später' : 'OK'}
      </button>
    </div>
  );
}
