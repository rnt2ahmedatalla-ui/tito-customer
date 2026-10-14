import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { isInAppBrowser } from '@/lib/browser';
import { cn } from '@/lib/cn';

interface InAppBrowserNoticeProps {
  className?: string;
  forceShow?: boolean;
}

export function InAppBrowserNotice({ className, forceShow = false }: InAppBrowserNoticeProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  if (!forceShow && !isInAppBrowser()) {
    return null;
  }

  const handleCopy = async () => {
    try {
      if (typeof window !== 'undefined' && navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // fallback
    }
  };

  return (
    <div
      role="alert"
      className={cn(
        'rounded-card border-2 border-amber-500/50 bg-amber-500/10 p-4 text-start text-espresso shadow-warm',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-btn bg-amber-500/20 text-amber-700">
          <ExternalLink className="size-5" aria-hidden />
        </div>
        <div className="flex-1 space-y-1">
          <h4 className="text-sm font-bold text-espresso">
            {t('auth.inAppBrowserTitle')}
          </h4>
          <p className="text-xs leading-relaxed text-ink">
            {t('auth.inAppBrowserNotice')}
          </p>
          <div className="pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void handleCopy()}
              className="inline-flex items-center gap-1.5"
            >
              {copied ? (
                <>
                  <Check className="size-3.5 text-emerald-600" aria-hidden />
                  <span className="text-emerald-700">{t('auth.linkCopied')}</span>
                </>
              ) : (
                <>
                  <Copy className="size-3.5" aria-hidden />
                  <span>{t('auth.copyLink')}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
