import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { formatEGP } from '@/lib/money';
import { buildWhatsAppUrl } from '@/lib/urls';
import type { PaymentMethod, Settings } from '@/types/database';

interface PaymentPanelProps {
  amount: number;
  settings: Settings;
  bookingId: string;
  serviceName: string;
  whenLabel: string;
  onMarkedSent: (data: { method: PaymentMethod }) => void;
  loading?: boolean;
}

export function PaymentPanel({
  amount,
  settings,
  bookingId,
  serviceName,
  whenLabel,
  onMarkedSent,
  loading,
}: PaymentPanelProps) {
  const { t, i18n } = useTranslation();
  const [method, setMethod] = useState<PaymentMethod>('instapay');

  const paymentNote = i18n.language === 'ar' ? settings.payment_note_ar : settings.payment_note_en;
  const shortId = bookingId.slice(0, 8).toUpperCase();
  const methodLabel = method === 'instapay' ? t('booking.instapay') : t('booking.vodafoneCash');
  const payTo =
    method === 'instapay' ? settings.instapay_number : settings.vodafone_cash_number;

  const copyNumber = async (number: string, label: string) => {
    await navigator.clipboard.writeText(number);
    toast.success(t('booking.copied'), { description: label });
  };

  const waMessage =
    i18n.language === 'ar'
      ? [
          `مرحباً ${settings.shop_name || 'tito'} 👋`,
          `حوّلت ${formatEGP(amount)} عن طريق ${methodLabel}`,
          `الخدمة: ${serviceName}`,
          `الموعد: ${whenLabel}`,
          `رقم الحجز: ${shortId}`,
          `مرفق صورة التحويل 👇`,
        ].join('\n')
      : [
          `Hi ${settings.shop_name || 'tito'} 👋`,
          `I transferred ${formatEGP(amount)} via ${methodLabel}`,
          `Service: ${serviceName}`,
          `When: ${whenLabel}`,
          `Booking: ${shortId}`,
          `Payment screenshot attached 👇`,
        ].join('\n');

  const whatsappUrl = settings.shop_whatsapp
    ? buildWhatsAppUrl(settings.shop_whatsapp, waMessage)
    : null;

  const openWhatsApp = () => {
    if (!whatsappUrl) {
      toast.error(t('booking.whatsappMissing'));
      return;
    }
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-card bg-gold p-6 text-center">
        <p className="text-sm text-espresso/80">{t('booking.amountDue')}</p>
        <p className="mt-1 text-3xl font-bold text-espresso font-latin">{formatEGP(amount)}</p>
        <p className="mt-2 text-xs text-espresso/70 font-latin">#{shortId}</p>
      </div>

      <div className="rounded-card border border-default bg-sand/40 p-4 text-sm text-espresso">
        <p className="font-semibold">{t('booking.payStepsTitle')}</p>
        <ol className="mt-2 list-decimal space-y-1 ps-5 text-ink">
          <li>{t('booking.payStep1')}</li>
          <li>{t('booking.payStep2')}</li>
          <li>{t('booking.payStep3')}</li>
        </ol>
      </div>

      {settings.instapay_number ? (
        <div className="rounded-card border border-default bg-sand/50 p-4">
          <p className="text-sm font-medium text-ink">{t('booking.instapay')}</p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="font-latin text-lg font-semibold text-espresso" dir="ltr">
              {settings.instapay_number}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void copyNumber(settings.instapay_number!, t('booking.instapay'))}
            >
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
            <span className="font-latin text-lg font-semibold text-espresso" dir="ltr">
              {settings.vodafone_cash_number}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                void copyNumber(settings.vodafone_cash_number!, t('booking.vodafoneCash'))
              }
            >
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
                method === m
                  ? 'border-gold bg-gold text-espresso'
                  : 'border-default bg-cream text-espresso'
              }`}
            >
              {m === 'instapay' ? t('booking.instapay') : t('booking.vodafoneCash')}
            </button>
          ))}
        </div>
        {payTo ? (
          <p className="mt-2 text-xs text-ink font-latin" dir="ltr">
            {t('booking.payTo')}: {payTo}
          </p>
        ) : null}
      </div>

      <Button fullWidth size="lg" onClick={openWhatsApp} disabled={!whatsappUrl}>
        <MessageCircle className="size-5" />
        {t('booking.sendProofWhatsApp')}
      </Button>

      <Button
        fullWidth
        size="lg"
        variant="secondary"
        loading={loading}
        onClick={() => onMarkedSent({ method })}
      >
        {t('booking.markedSentWhatsApp')}
      </Button>

      <p className="text-center text-xs text-ink">{t('booking.whatsappVerifyHint')}</p>
    </div>
  );
}
