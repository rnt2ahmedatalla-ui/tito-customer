import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Check, ExternalLink, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { formatEGP } from '@/lib/money';
import { instapayLink } from '@/lib/payLinks';
import { buildWhatsAppUrl } from '@/lib/urls';
import { cn } from '@/lib/cn';
import type { PaymentMethod, Settings } from '@/types/database';

// اسم صاحب الحساب (لسه ثابت في الكود، ممكن ننقله للإعدادات بعدين)
const INSTAPAY_ACCOUNT_NAME = 'Ahmed Atalla Mohamed Abd Elhalim';
const VODAFONE_ACCOUNT_NAME = 'أحمد عطاالله محمد عبدالحليم';

interface PaymentPanelProps {
  amount: number;
  settings: Settings;
  bookingId: string;
  serviceName: string;
  whenLabel: string;
  onMarkedSent: (data: { method: PaymentMethod }) => void | Promise<void>;
  loading?: boolean;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(area);
      return ok;
    } catch {
      return false;
    }
  }
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
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [waOpened, setWaOpened] = useState(false);
  const [copied, setCopied] = useState(false);
  const detailsRef = useRef<HTMLDivElement>(null);

  const paymentNote = i18n.language === 'ar' ? settings.payment_note_ar : settings.payment_note_en;
  const shortId = bookingId.slice(0, 8).toUpperCase();

  useEffect(() => {
    if (selectedMethod) {
      detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedMethod]);

  const selectMethod = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setCopied(false);
    setWaOpened(false);
  };

  const methodValue =
    selectedMethod === 'instapay'
      ? settings.instapay_number?.trim() ?? ''
      : selectedMethod === 'vodafone_cash'
        ? settings.vodafone_cash_number?.trim() ?? ''
        : '';
  const accountName =
    selectedMethod === 'instapay' ? INSTAPAY_ACCOUNT_NAME : VODAFONE_ACCOUNT_NAME;
  const payLink = selectedMethod === 'instapay' ? instapayLink(methodValue) : null;
  const methodLabel =
    selectedMethod === 'instapay' ? t('booking.instapay') : t('booking.vodafoneCash');

  const handleCopy = async () => {
    const ok = await copyText(methodValue);
    if (ok) {
      setCopied(true);
      toast.success(t('booking.copied'));
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const whatsappUrl = (() => {
    if (!settings.shop_whatsapp || !selectedMethod) return null;
    const message = t('booking.receiptMessage', {
      shop: settings.shop_name || 'tito',
      id: shortId,
      service: serviceName,
      when: whenLabel,
      amount: formatEGP(amount),
      method: methodLabel,
    });
    return buildWhatsAppUrl(settings.shop_whatsapp, message);
  })();

  const handleSent = () => {
    if (!selectedMethod || loading) return;
    void onMarkedSent({ method: selectedMethod });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* المبلغ المطلوب */}
      <div className="rounded-card bg-gold p-6 text-center">
        <p className="text-sm text-espresso/80">{t('booking.amountDue')}</p>
        <p className="mt-1 text-3xl font-bold text-espresso font-latin">{formatEGP(amount)}</p>
        <p className="mt-2 text-xs text-espresso/70 font-latin">#{shortId}</p>
      </div>

      {/* طرق الدفع */}
      <div>
        <p className="mb-1 text-sm font-semibold text-espresso">{t('booking.choosePayMethod')}</p>
        <p className="mb-3 text-xs text-ink">{t('booking.choosePayMethodHint')}</p>
        <div className="grid gap-2">
          {settings.vodafone_cash_number ? (
            <Button
              fullWidth
              size="lg"
              variant={selectedMethod === 'vodafone_cash' ? 'primary' : 'secondary'}
              onClick={() => selectMethod('vodafone_cash')}
            >
              {t('booking.vodafoneCash')}
            </Button>
          ) : null}

          {settings.instapay_number ? (
            <Button
              fullWidth
              size="lg"
              variant={selectedMethod === 'instapay' ? 'primary' : 'secondary'}
              onClick={() => selectMethod('instapay')}
            >
              {t('booking.instapay')}
            </Button>
          ) : null}

          {!settings.vodafone_cash_number && !settings.instapay_number ? (
            <p className="rounded-btn bg-sand/50 p-3 text-sm text-ink">{t('booking.payLinkMissing')}</p>
          ) : null}
        </div>
      </div>

      {/* تفاصيل الطريقة المختارة */}
      {selectedMethod && methodValue ? (
        <div
          ref={detailsRef}
          className="space-y-4 rounded-card border border-default bg-sand/30 p-4"
        >
          <div>
            <p className="mb-1 text-xs text-ink">{t('booking.accountHolder')}</p>
            <p className="text-sm font-bold text-espresso">{accountName}</p>
          </div>

          {payLink ? (
            <a href={payLink} target="_blank" rel="noopener noreferrer" className="block">
              <span
                className={cn(
                  'inline-flex w-full items-center justify-center gap-2 rounded-btn',
                  'min-h-[52px] bg-gold px-6 text-lg font-semibold text-espresso font-latin',
                )}
              >
                <ExternalLink className="size-5" aria-hidden />
                {t('booking.openInstapay')}
              </span>
            </a>
          ) : (
            <div>
              <p className="mb-1 text-xs text-ink">{t('booking.transferNumber')}</p>
              <div className="flex items-center justify-between gap-2 rounded-btn border border-default bg-white p-2.5">
                <span dir="ltr" className="select-all text-base font-bold text-espresso font-latin">
                  {methodValue}
                </span>
                <button
                  type="button"
                  onClick={() => void handleCopy()}
                  className="flex items-center gap-1 rounded bg-gold/20 px-3 py-1.5 text-xs font-medium text-espresso transition hover:bg-gold/40"
                >
                  {copied ? (
                    <>
                      <Check className="size-4 text-green-600" aria-hidden />
                      <span className="text-green-600">{t('booking.copied')}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-4" aria-hidden />
                      <span>{t('booking.copy')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          <p className="text-xs text-ink">{t('booking.receiptHint')}</p>

          {whatsappUrl ? (
            <div className="space-y-2">
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="block" onClick={() => setWaOpened(true)}>
                <span
                  className={cn(
                    'inline-flex w-full items-center justify-center gap-2 rounded-btn',
                    'min-h-[52px] bg-espresso px-6 text-lg font-semibold text-cream font-latin',
                  )}
                >
                  <MessageCircle className="size-5" aria-hidden />
                  {t('booking.sendReceiptWhatsApp')}
                </span>
              </a>
              {waOpened ? (
                <Button fullWidth size="lg" loading={loading} onClick={handleSent}>
                  {t('booking.receiptSent')}
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="rounded-btn bg-sand/50 p-3 text-sm text-ink">{t('booking.whatsappMissing')}</p>
              <Button fullWidth size="lg" loading={loading} onClick={handleSent}>
                {t('booking.markTransferred')}
              </Button>
            </div>
          )}
        </div>
      ) : null}

      {/* ملاحظات الدفع */}
      {paymentNote ? (
        <div className="rounded-card border border-default p-4">
          <p className="text-sm font-medium text-ink">{t('booking.paymentNote')}</p>
          <p className="mt-1 text-espresso">{paymentNote}</p>
        </div>
      ) : null}
    </div>
  );
}
