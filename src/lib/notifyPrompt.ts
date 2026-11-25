// طلب الإشعارات بيظهر مكان واحد في المرة: نافذة الخطوات أو الكارت العايم، مش الاتنين.
// «بعدين» في أي واحد فيهم بتسكّت الاتنين ٣ أيام.
const KEY = 'tito_push_snooze_until';
const DAYS = 3;
const OPEN_FLAG = 'tito:notify-modal-open';

export function notifySnoozed(): boolean {
  try { return Number(localStorage.getItem(KEY) || 0) > Date.now(); } catch { return false; }
}

export function snoozeNotify(days = DAYS) {
  try { localStorage.setItem(KEY, String(Date.now() + days * 86400000)); } catch { /* ignore */ }
  window.dispatchEvent(new Event('tito:notify-snoozed'));
}

export function setHowtoOpen(open: boolean) {
  (window as unknown as Record<string, boolean>)[OPEN_FLAG] = open;
  window.dispatchEvent(new Event('tito:howto-visibility'));
}

export function isHowtoOpen(): boolean {
  return !!(window as unknown as Record<string, boolean>)[OPEN_FLAG];
}
