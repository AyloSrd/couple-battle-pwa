import { useEffect, useState } from 'react';

/**
 * PWA install affordance. Captures the Android/desktop `beforeinstallprompt`
 * event at module load (it can fire before any component mounts) and detects the
 * iOS case (no programmatic prompt — needs the Share → Add to Home Screen hint).
 */

type TInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export type TInstallPlatform = 'android' | 'ios' | 'none';

let deferred: TInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as TInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    notify();
  });
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}

/** Reactive install state for the Home hint. */
export function useInstallPrompt(): {
  platform: TInstallPlatform;
  promptInstall: () => Promise<void>;
} {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  const platform: TInstallPlatform = isStandalone()
    ? 'none'
    : deferred
      ? 'android'
      : isIos()
        ? 'ios'
        : 'none';

  const promptInstall = async () => {
    if (!deferred) return;
    await deferred.prompt();
    deferred = null;
    notify();
  };

  return { platform, promptInstall };
}
