import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Upload, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatEGP } from '@/lib/money';
import { compressPaymentProof } from '@/lib/image';
import type { Settings } from '@/types/database';
import type { PaymentMethod } from '@/types/database';

interface PaymentPanelProps {
  amount: number;
  settings: Settings;
  onSubmit: (data: { method: PaymentMethod; transactionRef: string; proofBlob: Blob | null }) => void;
  loading?: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

export function PaymentPanel({ amount, settings, onSubmit, loading }: PaymentPanelProps) {
  const { t, i18n } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [method, setMethod] = useState<PaymentMethod>('instapay');
  const [transactionRef, setTransactionRef] = useState('');
  const [proofBlob, setProofBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [sizeInfo, setSizeInfo] = useState<{ before: number; after: number } | null>(null);

  const paymentNote = i18n.language === 'ar' ? settings.payment_note_ar : settings.payment_note_en;

  const copyNumber = async (number: string, label: string) => {
    await navigator.clipboard.writeText(number);
    toast.success(t('booking.copied'), { description: label });
  };

  const handleFile = async (file: File) => {
    setCompressing(true);
    try {
      const result = await compressPaymentProof(file);
      setProofBlob(result.blob);
      setSizeInfo({ before: result.beforeBytes, after: result.afterBytes });
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(result.blob));
    } catch {
      toast.error(t('errors.UNKNOWN'));
    } finally {
      setCompressing(false);
    }
  };

  const handleSubmit = () => {
    if (!transactionRef.trim() && !proofBlob) {
      toast.error(t('booking.proofRequired'));
      return;
    }
    onSubmit({ method, transactionRef: transactionRef.trim(), proofBlob });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-card bg-gold p-6 text-center">
        <p className="text-sm text-espresso/80">{t('booking.amountDue')}</p>
        <p className="mt-1 text-3xl font-bold text-espresso font-latin">{formatEGP(amount)}</p>
      </div>

      {settings.instapay_number ? (
        <div className="rounded-card border border-default bg-sand/50 p-4">
          <p className="text-sm font-medium text-ink">{t('booking.instapay')}</p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="font-latin text-lg font-semibold text-espresso" dir="ltr">{settings.instapay_number}</span>
            <Button variant="secondary" size="sm" onClick={() => copyNumber(settings.instapay_number!, t('booking.instapay'))}>
              <Copy className="size-4" />
              {t('booking.copy')}
            </Button>
          </div>
        </div>
      ) : null}

      {settings.vodafone_cash_number ? (
        <div className="rounded-card border border-default bg-sand/50 p-4">
          <p className="text-sm font-medium text-ink">{t('booking.vodafoneCash')}</p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="font-latin text-lg font-semibold text-espresso" dir="ltr">{settings.vodafone_cash_number}</span>
            <Button variant="secondary" size="sm" onClick={() => copyNumber(settings.vodafone_cash_number!, t('booking.vodafoneCash'))}>
              <Copy className="size-4" />
              {t('booking.copy')}
            </Button>
          </div>
        </div>
      ) : null}

      {paymentNote ? (
        <div className="rounded-card border border-default p-4">
          <p className="text-sm font-medium text-ink">{t('booking.paymentNote')}</p>
          <p className="mt-1 text-espresso">{paymentNote}</p>
        </div>
      ) : null}

      <div>
        <p className="mb-2 text-sm font-medium text-espresso">{t('booking.paymentMethod')}</p>
        <div className="flex gap-2">
          {(['instapay', 'vodafone_cash'] as PaymentMethod[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMethod(m)}
              className={`flex-1 min-h-[44px] rounded-btn border px-3 text-sm font-medium transition-colors ${
                method === m ? 'border-gold bg-gold text-espresso' : 'border-default bg-cream text-espresso'
              }`}
            >
              {m === 'instapay' ? t('booking.instapay') : t('booking.vodafoneCash')}
            </button>
          ))}
        </div>
      </div>

      <Input
        label={t('booking.transactionRef')}
        placeholder={t('booking.transactionRefPlaceholder')}
        value={transactionRef}
        onChange={(e) => setTransactionRef(e.target.value)}
        dir="ltr"
        className="font-latin"
      />

      <div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <Button
          variant="secondary"
          fullWidth
          onClick={() => fileRef.current?.click()}
          loading={compressing}
        >
          <Upload className="size-4" />
          {compressing ? t('booking.compressing') : t('booking.uploadProof')}
        </Button>
        {previewUrl ? (
          <div className="mt-3 flex items-start gap-3">
            <img src={previewUrl} alt="" className="size-20 rounded-btn object-cover" width={80} height={80} />
            <div className="text-sm text-ink font-latin">
              {sizeInfo ? (
                <>
                  <p>{t('booking.beforeSize', { size: formatBytes(sizeInfo.before) })}</p>
                  <p>{t('booking.afterSize', { size: formatBytes(sizeInfo.after) })}</p>
                </>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="mt-2 flex items-center gap-1 text-xs text-ink">
            <ImageIcon className="size-3" aria-hidden />
            {t('booking.proofRequired')}
          </p>
        )}
      </div>

      <Button fullWidth size="lg" onClick={handleSubmit} loading={loading}>
        {t('booking.submitPayment')}
      </Button>
    </div>
  );
}
