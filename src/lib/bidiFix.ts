/**
 * إصلاح عرض النِّسَب في النص العربي: المتصفح بيعرض «خصم 20%» كأنها «خصم %20»
 * (الرقم بعد حروف عربي بيتعامل كـ«رقم عربي» فعلامة % بتروح شماله).
 * الحل: نعزل «الرقم + %» بعلامات عزل يونيكود غير مرئية (LRI … PDI) فيتعرض «20%» صح في كل مكان.
 */
const RE = /(^|[^⁦\d.,٫])([+\-−]?[\d٠-٩]+(?:[.,٫][\d٠-٩]+)?\s?[%٪])(?!⁩)/g;
export const fixPercent = (s: string) => (s && /[%٪]/.test(s) ? s.replace(RE, (_m, pre: string, num: string) => `${pre}⁦${num}⁩`) : s);

function walk(node: Node) {
  if (node.nodeType === Node.TEXT_NODE) {
    const v = node.nodeValue;
    if (v && /[\d٠-٩]\s?[%٪]/.test(v)) {
      const f = fixPercent(v);
      if (f !== v) node.nodeValue = f;
    }
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const tag = (node as Element).tagName;
  if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA' || tag === 'INPUT' || (node as HTMLElement).isContentEditable) return;
  for (let c = node.firstChild; c; c = c.nextSibling) {
    walk(c);
    // React بيقسم «{x}%» لنصّين: «20» و«%» — نعزلهم مع بعض
    const n = c.nextSibling;
    if (c.nodeType === Node.TEXT_NODE && n && n.nodeType === Node.TEXT_NODE) {
      const a = c.nodeValue ?? '', b = n.nodeValue ?? '';
      const m = /([+\-−]?[\d٠-٩]+(?:[.,٫][\d٠-٩]+)?\s?)$/.exec(a);
      if (m && /^[%٪]/.test(b) && !a.includes('\u2066', m.index - 1)) {
        c.nodeValue = a.slice(0, m.index) + '\u2066' + m[1];
        n.nodeValue = b[0] + '\u2069' + b.slice(1);
      }
    }
  }
}

export function installBidiFix() {
  if (typeof window === 'undefined' || typeof MutationObserver === 'undefined') return;
  const start = () => {
    walk(document.body);
    new MutationObserver((list) => {
      for (const m of list) {
        if (m.type === 'characterData') walk(m.target);
        else m.addedNodes.forEach(walk);
      }
    }).observe(document.body, { subtree: true, childList: true, characterData: true });
  };
  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });
}
