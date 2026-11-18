import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// المتصفح بيبعت حدث التثبيت مرة واحدة بس، فبنمسكه هنا على مستوى الملف
// (مش جوه كومبوننت) عشان ميضيعش لما الصفحة تتغير.
let deferred: BeforeInstallPromptEvent | null = null;
let installedFlag = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    installedFlag = true;
    deferred = null;
    notify();
  });
}

export type InstallPlatform =
  | 'ios-safari'
  | 'ios-other'
  | 'android-samsung'
  | 'android-firefox'
  | 'android-chrome'
  | 'desktop-safari'
  | 'desktop-firefox'
  | 'desktop-chromium'
  | 'in-app';

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    );
  } catch {
    return false;
  }
}

export function detectPlatform(): InstallPlatform {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  if (/FBAN|FBAV|Instagram|Line\/|TikTok|Snapchat/i.test(ua)) return 'in-app';
  const ios =
    /iPhone|iPad|iPod/i.test(ua) ||
    (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (ios) return /CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua) ? 'ios-other' : 'ios-safari';
  if (/Android/i.test(ua)) {
    if (/SamsungBrowser/i.test(ua)) return 'android-samsung';
    if (/Firefox/i.test(ua)) return 'android-firefox';
    return 'android-chrome';
  }
  if (/Firefox/i.test(ua)) return 'desktop-firefox';
  if (/Safari/i.test(ua) && !/Chrome|Chromium|Edg/i.test(ua)) return 'desktop-safari';
  return 'desktop-chromium';
}

export function useInstall() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  const installed = installedFlag || isStandalone();

  const promptInstall = async (): Promise<boolean> => {
    if (!deferred) return false;
    const ev = deferred;
    await ev.prompt();
    const choice = await ev.userChoice;
    deferred = null;
    notify();
    return choice.outcome === 'accepted';
  };

  return { installed, canPrompt: !!deferred, promptInstall };
}
