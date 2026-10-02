import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { formatEGP } from '@/lib/money';
import { buildWhatsAppUrl } from '@/lib/urls';
import { paymentHref } from '@/lib/payLinks';
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
  const [method, setMethod] = useState<PaymentMethod | null>(null);

  const paymentNote = i18n.language === 'ar' ? settings.payment_note_ar : settings.payment_note_en;
  const shortId = bookingId.slice(0, 8).toUpperCase();
  const methodLabel =
    method === 'instapay'
      ? t('booking.instapay')
      : method === 'vodafone_cash'
        ? t('booking.vodafoneCash')
        : '';

  const waMessage =
    i18n.language === 'ar'
      ? [
          `مرحباً ${settings.shop_name || 'tito'} 👋`,
          `حوّلت ${formatEGP(amount)} عن طريق ${methodLabel || 'الدفع الإلكتروني'}`,
          `الخدمة: ${serviceName}`,
          `الموعد: ${whenLabel}`,
          `رقم الحجز: ${shortId}`,
          `مرفق صورة التحويل 👇`,
        ].join('\n')
      : [
          `Hi ${settings.shop_name || 'tito'} 👋`,
          `I transferred ${formatEGP(amount)} via ${methodLabel || 'online payment'}`,
          `Service: ${serviceName}`,
          `When: ${whenLabel}`,
          `Booking: ${shortId}`,
          `Payment screenshot attached 👇`,
        ].join('\n');

  const whatsappUrl = settings.shop_whatsapp
    ? buildWhatsAppUrl(settings.shop_whatsapp, waMessage)
    : null;

  const openPayOption = (m: 'instapay' | 'vodafone_cash') => {
    const value = m === 'instapay' ? settings.instapay_number : settings.vodafone_cash_number;
    const href = paymentHref(value);
    setMethod(m);
    if (!value?.trim()) {
      toast.error(t('booking.payLinkMissing'));
      return;
    }
    if (href) {
      window.open(href, '_blank', 'noopener,noreferrer');
      return;
    }
    void navigator.clipboard.writeText(value.trim()).then(() => {
      toast.success(t('booking.copied'), {
        description: m === 'instapay' ? t('booking.instapay') : t('booking.vodafoneCash'),
      });
    });
  };

  const openWhatsApp = () => {
    if (!method) {
      toast.error(t('booking.pickMethodFirst'));
      return;
    }
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

      <div>
        <p className="mb-1 text-sm font-semibold text-espresso">{t('booking.choosePayMethod')}</p>
        <p className="mb-3 text-xs text-ink">{t('booking.choosePayMethodHint')}</p>
        <div className="grid gap-2">
          {settings.vodafone_cash_number ? (
            <Button
              fullWidth
              size="lg"
              variant={method === 'vodafone_cash' ? 'primary' : 'secondary'}
              onClick={() => openPayOption('vodafone_cash')}
            >
              <ExternalLink className="size-4" />
              {t('booking.vodafoneCash')}
            </Button>
          ) : null}
          {settings.instapay_number ? (
            <Button
              fullWidth
              size="lg"
              variant={method === 'instapay' ? 'primary' : 'secondary'}
              onClick={() => openPayOption('instapay')}
            >
              <ExternalLink className="size-4" />
              {t('booking.instapay')}
            </Button>
          ) : null}
          {!settings.vodafone_cash_number && !settings.instapay_number ? (
            <p className="rounded-btn bg-sand/50 p-3 text-sm text-ink">{t('booking.payLinkMissing')}</p>
          ) : null}
        </div>
      </div>

      {method ? (
        <div className="rounded-card border border-default bg-sand/40 p-4 text-sm text-espresso">
          <p className="font-semibold">{t('booking.afterPayTitle')}</p>
          <ol className="mt-2 list-decimal space-y-1 ps-5 text-ink">
            <li>{t('booking.payStepPayApp')}</li>
            <li>{t('booking.payStep2')}</li>
            <li>{t('booking.payStep3')}</li>
          </ol>
        </div>
      ) : null}

      {paymentNote ? (
        <div className="rounded-card border border-default p-4">
          <p className="text-sm font-medium text-ink">{t('booking.paymentNote')}</p>
          <p className="mt-1 text-espresso">{paymentNote}</p>
        </div>
      ) : null}

      <Button fullWidth size="lg" onClick={openWhatsApp} disabled={!whatsappUrl || !method}>
        <MessageCircle className="size-5" />
        {t('booking.sendProofWhatsApp')}
      </Button>

      <Button
        fullWidth
        size="lg"
        variant="secondary"
        loading={loading}
        disabled={!method}
        onClick={() => method && onMarkedSent({ method })}
      >
        {t('booking.markedSentWhatsApp')}
      </Button>

      <p className="text-center text-xs text-ink">{t('booking.whatsappVerifyHint')}</p>
    </div>
  );
}
