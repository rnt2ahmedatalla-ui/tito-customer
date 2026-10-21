import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, X, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { formatEGP } from '@/lib/money';
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

export function PaymentPanel({
  amount,
  settings,
  bookingId,
  onMarkedSent,
  loading,
}: PaymentPanelProps) {
  const { t, i18n } = useTranslation();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [copied, setCopied] = useState(false);

  const paymentNote = i18n.language === 'ar' ? settings.payment_note_ar : settings.payment_note_en;
  const shortId = bookingId.slice(0, 8).toUpperCase();

  // 🔹 يمكنك تعديل اسم صاحب الحساب والرقم مباشرة من هنا أو تركها تقرأ من settings
  const getAccountDetails = () => {
    if (selectedMethod === 'instapay') {
      return {
        name: 'Ahmed Atalla Mohamed Abd Elhalim',
        number: settings.instapay_number || '01012345678',
      };
    }
    return {
      name: 'أحمد عطاالله محمد عبدالحليم',
      number: settings.vodafone_cash_number || '01012345678',
    };
  };

  const accountDetails = selectedMethod ? getAccountDetails() : null;

  const handleCopyNumber = (num: string) => {
    navigator.clipboard.writeText(num.trim());
    setCopied(true);
    toast.success(i18n.language === 'ar' ? 'تم نسخ الرقم بنجاح' : 'Number copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setScreenshot(e.target.files[0]);
    }
  };

  const handleOpenModal = (m: PaymentMethod) => {
    const value = m === 'instapay' ? settings.instapay_number : settings.vodafone_cash_number;
    if (!value?.trim()) {
      toast.error(t('booking.payLinkMissing'));
      return;
    }
    setSelectedMethod(m);
    setScreenshot(null);
    setCopied(false);
  };

  const handleConfirmPayment = () => {
    if (!selectedMethod) return;
    if (!screenshot) {
      toast.error(i18n.language === 'ar' ? 'برجاء رفع صورة إيصال التحويل أولاً' : 'Please upload payment receipt first');
      return;
    }
    onMarkedSent({ method: selectedMethod, receipt: screenshot });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* صندوق المبلغ المطلوب */}
      <div className="rounded-card bg-gold p-6 text-center">
        <p className="text-sm text-espresso/80">{t('booking.amountDue')}</p>
        <p className="mt-1 text-3xl font-bold text-espresso font-latin">{formatEGP(amount)}</p>
        <p className="mt-2 text-xs text-espresso/70 font-latin">#{shortId}</p>
      </div>

      {/* خيارات طرق الدفع */}
      <div>
        <p className="mb-1 text-sm font-semibold text-espresso">{t('booking.choosePayMethod')}</p>
        <p className="mb-3 text-xs text-ink">{t('booking.choosePayMethodHint')}</p>
        <div className="grid gap-2">
          {settings.vodafone_cash_number ? (
            <Button
              fullWidth
              size="lg"
              variant={selectedMethod === 'vodafone_cash' ? 'primary' : 'secondary'}
              onClick={() => handleOpenModal('vodafone_cash')}
            >
              {t('booking.vodafoneCash')}
            </Button>
          ) : null}

          {settings.instapay_number ? (
            <Button
              fullWidth
              size="lg"
              variant={selectedMethod === 'instapay' ? 'primary' : 'secondary'}
              onClick={() => handleOpenModal('instapay')}
            >
              {t('booking.instapay')}
            </Button>
          ) : null}

          {!settings.vodafone_cash_number && !settings.instapay_number ? (
            <p className="rounded-btn bg-sand/50 p-3 text-sm text-ink">{t('booking.payLinkMissing')}</p>
          ) : null}
        </div>
      </div>

      {/* ملاحظات الدفع */}
      {paymentNote ? (
        <div className="rounded-card border border-default p-4">
          <p className="text-sm font-medium text-ink">{t('booking.paymentNote')}</p>
          <p className="mt-1 text-espresso">{paymentNote}</p>
        </div>
      ) : null}

      {/* ---------------- النافذة المنبثقة (Modal) ---------------- */}
      {selectedMethod && accountDetails && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl relative text-right dir-rtl">
            
            {/* زر الإغلاق */}
            <button
              onClick={() => setSelectedMethod(null)}
              className="absolute top-4 left-4 text-gray-400 hover:text-gray-700 transition"
            >
              <X className="size-5" />
            </button>

            {/* عنوان النافذة */}
            <h3 className="text-lg font-bold text-espresso mb-4 border-b pb-2">
              {selectedMethod === 'instapay' ? t('booking.instapay') : t('booking.vodafoneCash')}
            </h3>

            {/* تفاصيل الحساب */}
            <div className="bg-sand/30 p-4 rounded-lg mb-4 space-y-3 border border-default">
              
              {/* اسم صاحب الحساب */}
              <div>
                <p className="text-xs text-gray-500 mb-1">
                  {i18n.language === 'ar' ? 'اسم صاحب الحساب:' : 'Account Holder Name:'}
                </p>
                <p className="text-sm font-bold text-espresso">
                  {accountDetails.name}
                </p>
              </div>

              {/* الرقم المترجم ومعه زر النسخ */}
              <div>
                <p className="text-xs text-gray-500 mb-1">
                  {i18n.language === 'ar' ? 'رقم التحويل:' : 'Transfer Number:'}
                </p>
                <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border">
                  <span className="text-base font-bold text-espresso font-latin select-all">
                    {accountDetails.number}
                  </span>
                  <button
                    onClick={() => handleCopyNumber(accountDetails.number)}
                    className="flex items-center gap-1 text-xs bg-gold/20 hover:bg-gold/40 text-espresso px-3 py-1.5 rounded transition font-medium"
                    title="نسخ الرقم"
                  >
                    {copied ? (
                      <>
                        <Check className="size-4 text-green-600" />
                        <span className="text-green-600">تم النسخ</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-4" />
                        <span>نسخ</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>

            {/* خانة رفع الإسكرين */}
            <div className="mb-6 space-y-2">
              <label className="block text-sm font-semibold text-espresso">
                {i18n.language === 'ar' ? 'رفع إيصال الدفع (إسكرين شوت)' : 'Upload Payment Screenshot'}
              </label>
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6 px-4 text-center">
                    <Upload className="size-6 text-gray-400 mb-1" />
                    <p className="text-xs text-gray-500">
                      {screenshot ? screenshot.name : (i18n.language === 'ar' ? 'اضغط هنا لاختيار صورة الإيصال' : 'Click to select screenshot')}
                    </p>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
              </div>
            </div>

            {/* زر تأكيد الدفع */}
            <Button
              fullWidth
              size="lg"
              loading={loading}
              disabled={!screenshot || loading}
              onClick={handleConfirmPayment}
            >
              {i18n.language === 'ar' ? 'تأكيد الدفع' : 'Confirm Payment'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
