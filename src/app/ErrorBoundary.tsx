import { Component, type ErrorInfo, type ReactNode } from 'react';
import i18n from '@/i18n';
import { Button } from '@/components/ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    if (import.meta.env.DEV) {
      /* dev only logging */
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-cream p-8 text-center">
          <h1 className="text-xl font-bold text-espresso">{i18n.t('common.errorTitle')}</h1>
          <p className="text-ink">{i18n.t('common.errorDesc')}</p>
          <Button onClick={() => window.location.reload()}>{i18n.t('common.reload')}</Button>
        </div>
      );
    }
    return this.props.children;
  }
}
