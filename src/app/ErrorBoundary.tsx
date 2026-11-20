import { Component, type ErrorInfo, type ReactNode } from 'react';
import i18n from '@/i18n';
import { Button } from '@/components/ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  detail: string;
}

/** أخطاء تحميل ملفات الموقع بعد تحديث جديد (التليفون لسه ماسك النسخة القديمة) */
const CHUNK_RE = /dynamically imported module|importing a module script|ChunkLoadError|Loading chunk|Unable to preload/i;

/** بيعيد تحميل الصفحة مرة واحدة بس (من غير لفّة لا نهائية) */
export function reloadOnceForNewVersion(): boolean {
  try {
    const key = 'tito-chunk-reload';
    const last = Number(sessionStorage.getItem(key) ?? 0);
    if (Date.now() - last < 30_000) return false;
    sessionStorage.setItem(key, String(Date.now()));
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, detail: '' };

  static getDerivedStateFromError(error: unknown): State {
    const msg = error instanceof Error ? error.message : String(error);
    return { hasError: true, detail: msg.slice(0, 160) };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    // لو السبب إن الموقع اتحدّث والتليفون لسه ماسك النسخة القديمة، نعمل تحديث تلقائي مرة واحدة
    if (CHUNK_RE.test(error?.message ?? '')) reloadOnceForNewVersion();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-cream p-8 text-center">
          <h1 className="text-xl font-bold text-espresso">{i18n.t('common.errorTitle')}</h1>
          <p className="text-ink">{i18n.t('common.errorDesc')}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => window.location.reload()}>{i18n.t('common.reload')}</Button>
            <Button variant="secondary" onClick={() => window.location.assign(import.meta.env.BASE_URL || '/')}>
              {i18n.language?.startsWith('ar') ? 'الرئيسية' : 'Home'}
            </Button>
          </div>
          {this.state.detail ? (
            <p dir="ltr" className="max-w-sm break-words font-latin text-[11px] text-ink-70/70">
              {this.state.detail}
            </p>
          ) : null}
        </div>
      );
    }
    return this.props.children;
  }
}
