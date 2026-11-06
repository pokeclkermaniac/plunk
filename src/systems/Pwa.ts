/** Offline support + "add to home screen" helpers. */
import { registerSW } from 'virtual:pwa-register';

let deferred: any = null;
const listeners = new Set<() => void>();

export function setupPwa(): void {
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    registerSW({ immediate: true });
  }
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    listeners.forEach((l) => l());
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    listeners.forEach((l) => l());
  });
}

export const Pwa = {
  canPrompt: () => !!deferred,
  async prompt(): Promise<void> {
    if (!deferred) return;
    deferred.prompt();
    try {
      await deferred.userChoice;
    } finally {
      deferred = null;
      listeners.forEach((l) => l());
    }
  },
  isStandalone(): boolean {
    return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true;
  },
  isIOS(): boolean {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  },
  onChange(l: () => void): () => void {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};
