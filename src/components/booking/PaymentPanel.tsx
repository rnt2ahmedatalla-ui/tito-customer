import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Check, ExternalLink, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { formatEGP } from '@/lib/money';
import { buildWhatsAppUrl, isSafeUrl } from '@/lib/urls';
import type { PaymentMethod, Settings } from '@/types/database';

interface PaymentPanelProps {
  amount: number;
  settings: Settings;
  bookingId: string;
  serviceName: string;
  whenLabel: string;
  onMarkedSent: (data: { method: PaymentMethod; receipt?: File }) => void;
  loading?: boolean;
}

const ACCOUNT_NAME_AR = 'أحمد عطاالله محمد عبدالحليم';
const ACCOUNT_NAME_EN = 'Ahmed Atalla Mohamed Abd Elhalim';

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
  const isAr = i18n.language?.startsWith('ar');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [copied, setCopied] = useState(false);

  const paymentNote = isAr ? settings.payment_note_ar : settings.payment_note_en;
  const shortId = bookingId.slice(0, 8).toUpperCase();

  // لينك الإنستاباي من الإعدادات، ولازم يكون https عشان يتفتح
  const instapayLink = settings.instapay_number?.trim() ?? '';
  const instapayReady = !!instapayLink && isSafeUrl(instapayLink);
  const vodafoneNumber = settings.vodafone_cash_number?.trim() ?? '';

  const handleCopyNumber = (num: string) => {
    void navigator.clipboard.writeText(num);
    setCopied(true);
    toast.success(isAr ? 'تم نسخ الرقم' : 'Number copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenInstapay = () => {
    window.open(instapayLink, '_blank', 'noopener,noreferrer');
  };

  const handleSendWhatsApp = () => {
    if (!selectedMethod) return;

    const methodLabel =
      selectedMethod === 'instapay'
        ? isAr ? 'إنستاباي' : 'InstaPay'
        : isAr ? 'فودافون كاش' : 'Vodafone Cash';
    const shopName = settings.shop_name || 'tito';
    const amountStr = formatEGP(amount);

    const msg = isAr
      ? `مرحباً ${shopName} 👋\nدفعت ${amountStr} عن الحجز رقم #${shortId}\nالخدمة: ${serviceName}\nالتفاصيل: ${whenLabel}\nطريقة الدفع: ${methodLabel}\nهبعتلكم صورة الإيصال هنا 🧾`
      : `Hi ${shopName} 👋\nI paid ${amountStr} for booking #${shortId}\nService: ${serviceName}\nDetails: ${whenLabel}\nPayment method: ${methodLabel}\nI'll send the receipt here 🧾`;

    const url = buildWhatsAppUrl(settings.shop_whatsapp ?? '', msg);
    if (!url) {
      toast.error(isAr ? 'رقم واتساب المحل غير متظبط' : 'Shop WhatsApp number is not set');
      return;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
    onMarkedSent({ method: selectedMethod });
  };

  const methodCardClass = (active: boolean) =>
    `w-full rounded-card border p-4 text-start transition ${
      active ? 'border-gold bg-gold/15' : 'border-default bg-white'
    }`;

  return (
    <div className="flex flex-col gap-6">
      {/* المبلغ المطلوب */}
      <div className="rounded-card bg-gold p-6 text-center">
        <p className="text-sm text-espresso/80">{t('booking.amountDue')}</p>
        <p className="mt-1 font-latin text-3xl font-bold text-espresso">{formatEGP(amount)}</p>
        <p className="mt-2 font-latin text-xs text-espresso/70">#{shortId}</p>
      </div>

      {/* طرق الدفع */}
      <div>
        <p className="mb-1 text-sm font-semibold text-espresso">{t('booking.choosePayMethod')}</p>
        <p className="mb-3 text-xs text-ink">{t('booking.choosePayMethodHint')}</p>

        <div className="grid gap-3">
          {instapayReady ? (
            <div
              role="button"
              tabIndex={0}
              className={methodCardClass(selectedMethod === 'instapay')}
              onClick={() => setSelectedMethod('instapay')}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedMethod('instapay')}
            >
              <p className="font-semibold text-espresso">{t('booking.instapay')}</p>
              {selectedMethod === 'instapay' ? (
                <Button
                  fullWidth
                  size="lg"
                  variant="secondary"
                  className="mt-3"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenInstapay();
                  }}
                >
                  <ExternalLink className="size-4" />
                  {isAr ? 'افتح إنستاباي وادفع' : 'Open InstaPay and pay'}
                </Button>
              ) : null}
            </div>
          ) : null}

          {vodafoneNumber ? (
            <div
              role="button"
              tabIndex={0}
              className={methodCardClass(selectedMethod === 'vodafone_cash')}
              onClick={() => setSelectedMethod('vodafone_cash')}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedMethod('vodafone_cash')}
            >
              <p className="font-semibold text-espresso">{t('booking.vodafoneCash')}</p>
              {selectedMethod === 'vodafone_cash' ? (
                <div className="mt-3 space-y-3 rounded-btn border border-default bg-white p-3">
                  <div>
                    <p className="text-xs text-ink-70">{isAr ? 'اسم صاحب الحساب' : 'Account holder'}</p>
                    <p className="text-sm font-bold text-espresso">
                      {isAr ? ACCOUNT_NAME_AR : ACCOUNT_NAME_EN}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="select-all font-latin text-base font-bold text-espresso">
                      {vodafoneNumber}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyNumber(vodafoneNumber);
                      }}
                      className="flex items-center gap-1 rounded bg-gold/20 px-3 py-1.5 text-xs font-medium text-espresso hover:bg-gold/40"
                    >
                      {copied ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" />}
                      {copied ? (isAr ? 'تم النسخ' : 'Copied') : isAr ? 'نسخ' : 'Copy'}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {!instapayReady && !vodafoneNumber ? (
            <p className="rounded-btn bg-sand/50 p-3 text-sm text-ink">{t('booking.payLinkMissing')}</p>
          ) : null}
        </div>
      </div>

      {/* ملاحظة الدفع */}
      {paymentNote ? (
        <div className="rounded-card border border-default p-4">
          <p className="text-sm font-medium text-ink">{t('booking.paymentNote')}</p>
          <p className="mt-1 text-espresso">{paymentNote}</p>
        </div>
      ) : null}

      {/* إرسال الإيصال على واتساب */}
      <div className="space-y-2">
        <p className="text-xs text-ink-70">
          {isAr
            ? 'بعد ما تدفع، اضغط الزرار ده وهيفتحلك واتساب برسالة جاهزة، وتبعت فيها صورة الإيصال.'
            : 'After you pay, tap the button to open WhatsApp with a ready message, then send the receipt image in it.'}
        </p>
        <Button
          fullWidth
          size="lg"
          loading={loading}
          disabled={!selectedMethod || loading}
          onClick={handleSendWhatsApp}
        >
          <MessageCircle className="size-4" />
          {isAr ? 'ابعت الإيصال على واتساب' : 'Send receipt on WhatsApp'}
        </Button>
      </div>
    </div>
  );
}
