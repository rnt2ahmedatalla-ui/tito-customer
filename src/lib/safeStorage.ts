// When the site runs inside an iframe with storage blocked (e.g. the admin's
// queue-screen preview with third-party cookies off), reading localStorage throws.
// Swap in an in-memory store so the page still works instead of crashing.
function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() { return m.size; },
    clear: () => m.clear(),
    getItem: (k) => (m.has(k) ? (m.get(k) as string) : null),
    key: (i) => Array.from(m.keys())[i] ?? null,
    removeItem: (k) => { m.delete(k); },
    setItem: (k, v) => { m.set(k, String(v)); },
  };
}
for (const name of ['localStorage', 'sessionStorage'] as const) {
  try {
    const s = window[name];
    s.getItem('__t');
  } catch {
    try { Object.defineProperty(window, name, { value: memoryStorage(), configurable: true }); } catch { /* ignore */ }
  }
}
export {};
