import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Download, Share2 } from 'lucide-react';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';

const SHARE_TEXT = 'tito — احجز دورك / Book your slot';

function pageShareUrl() {
  if (typeof window === 'undefined') return 'https://tito-customer.vercel.app/';
  const base = import.meta.env.BASE_URL || '/';
  const url = new URL(base, window.location.origin);
  return url.href.endsWith('/') ? url.href : `${url.href}/`;
}

interface ShareAndQrProps {
  className?: string;
  /** When true, skip the top border used on RatePage */
  compact?: boolean;
}

export function ShareAndQr({ className, compact }: ShareAndQrProps) {
  const { t } = useTranslation();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const shareUrl = pageShareUrl();

  useEffect(() => {
    void QRCode.toDataURL(shareUrl, {
      width: 280,
      margin: 2,
      color: { dark: '#2C1810', light: '#FFFBF5' },
    }).then(setQrDataUrl);
  }, [shareUrl]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success(t('rate.shareCopied'));
    } catch {
      toast.message(shareUrl);
    }
  };

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'tito',
          text: SHARE_TEXT,
          url: shareUrl,
        });
        return;
      }
    } catch {
      /* cancelled or unsupported */
    }
    await copyLink();
  };

  const downloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = 'tito-qr.png';
    a.click();
  };

  const shareQrImage = async () => {
    if (!qrDataUrl || !navigator.share || !navigator.canShare) {
      downloadQr();
      return;
    }
    try {
      const res = await fetch(qrDataUrl);
      const blob = await res.blob();
      const file = new File([blob], 'tito-qr.png', { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'tito QR', text: SHARE_TEXT });
        return;
      }
    } catch {
      /* fall through */
    }
    downloadQr();
  };

  return (
    <div className={cn(!compact && 'mt-8 space-y-4 border-t border-default pt-6', compact && 'space-y-4', className)}>
      <p className="text-sm font-medium text-espresso">{t('rate.share')}</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="secondary" className="w-full sm:flex-1" onClick={() => void share()}>
          <Share2 className="size-4" />
          {t('rate.shareLink')}
        </Button>
        <Button variant="ghost" className="w-full sm:flex-1" onClick={() => void copyLink()}>
          <Copy className="size-4" />
          {t('rate.copyLink')}
        </Button>
      </div>
      <div className="text-center">
        <p className="mb-3 text-sm font-medium text-espresso">{t('rate.qrTitle')}</p>
        {qrDataUrl ? (
          <img src={qrDataUrl} alt="" className="mx-auto size-48 rounded-btn border border-default bg-white p-2" />
        ) : (
          <Skeleton className="mx-auto size-48" />
        )}
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button variant="ghost" size="sm" onClick={downloadQr} disabled={!qrDataUrl}>
            <Download className="size-4" />
            {t('rate.qrDownload')}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => void shareQrImage()} disabled={!qrDataUrl}>
            <Share2 className="size-4" />
            {t('rate.share')}
          </Button>
        </div>
      </div>
    </div>
  );
}
