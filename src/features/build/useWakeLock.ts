import { useEffect, useState } from 'react';

export type WakeLockStatus = 'aktiv' | 'ersatz' | 'aus';

/**
 * Hält den Bildschirm an, solange `active` gilt.
 * 1. Wahl: Screen Wake Lock API (wird nach einem Tab-Wechsel neu angefordert).
 * Ersatz:  ein stummes, unsichtbares Video aus einem Canvas-Stream – solange
 *          ein Video läuft, schalten Browser den Bildschirm nicht ab.
 */
export function useWakeLock(active: boolean): WakeLockStatus {
  const [status, setStatus] = useState<WakeLockStatus>('aus');

  useEffect(() => {
    if (!active) {
      setStatus('aus');
      return;
    }
    let cancelled = false;
    let sentinel: WakeLockSentinel | null = null;
    let video: HTMLVideoElement | null = null;
    let timer = 0;

    const startFallback = () => {
      if (video || cancelled) return;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 2;
        canvas.height = 2;
        const ctx = canvas.getContext('2d');
        const stream = canvas.captureStream?.(1);
        if (!ctx || !stream) throw new Error('captureStream fehlt');
        // Regelmäßig neu zeichnen, damit der Stream nicht einfriert.
        timer = window.setInterval(() => {
          ctx.fillStyle = Math.random() > 0.5 ? '#000' : '#010101';
          ctx.fillRect(0, 0, 2, 2);
        }, 1000);
        video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        video.srcObject = stream;
        video.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;';
        document.body.appendChild(video);
        void video
          .play()
          .then(() => !cancelled && setStatus('ersatz'))
          .catch(() => !cancelled && setStatus('aus'));
      } catch {
        setStatus('aus');
      }
    };

    const request = async () => {
      if (cancelled || document.visibilityState !== 'visible') return;
      if (!('wakeLock' in navigator)) {
        startFallback();
        return;
      }
      try {
        sentinel = await navigator.wakeLock.request('screen');
        if (cancelled) {
          void sentinel.release();
          return;
        }
        setStatus('aktiv');
        sentinel.addEventListener('release', () => {
          if (!cancelled && document.visibilityState === 'visible') void request();
        });
      } catch {
        // z. B. Energiesparmodus oder fehlende Berechtigung
        startFallback();
      }
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') void request();
    };
    void request();
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      void sentinel?.release().catch(() => undefined);
      window.clearInterval(timer);
      if (video) {
        video.pause();
        video.srcObject = null;
        video.remove();
      }
    };
  }, [active]);

  return status;
}
