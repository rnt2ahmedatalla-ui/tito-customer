import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BellOff, BellRing, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { enablePushDetailed, pushIsOn, pushSupported, withTimeout } from '@/lib/push';
import { isStandalone } from '@/lib/install';
import { IosInstallGuideButton, isIosDevice } from '@/components/layout/IosInstallGuide';

type State = 'loading' | 'on' | 'off' | 'blocked' | 'ios' | 'unsupported';

/** زرار تفعيل الإشعارات الثابت في «حسابي» — بيقول الحالة بوضوح */
export function NotificationsCard() {
  const { i18n } = useTranslation();
  const ar = !!i18n.language?.startsWith('ar');
  const L = (a: string, e: string) => (ar ? a : e);
  const [st, setSt] = useState<State>('loading');
  const [busy, setBusy] = useState(false);

  const check = async () => {
    if (!pushSupported()) {
      setSt(isIosDevice() && !isStandalone() ? 'ios' : 'unsupported');
      return;
    }
    if (Notification.permission === 'denied') return setSt('blocked');
    setSt((await withTimeout(pushIsOn(), 3000).catch(() => false)) ? 'on' : 'off');
  };
  useEffect(() => {
    void check();
  }, []);

  const turnOn = async () => {
    setBusy(true);
    try {
      const r = await enablePushDetailed(ar ? 'ar' : 'en', true);
      if (r === 'ok') toast.success(L('الإشعارات اشتغلت ✓', 'Notifications are on ✓'));
      else if (r === 'timeout' || r === 'error') toast.error(L('التفعيل أخد وقت. اتأكد من النت وجرّب تاني', 'That took too long. Check your connection and try again'));
      await check();
    } catch {
      toast.error(L('حصلت مشكلة، جرّب تاني', 'Something went wrong, try again'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      {st === 'on' ? (
        <p className="flex items-center gap-2 text-sm font-medium text-success"><CheckCircle2 className="size-5" />{L('الإشعارات شغالة على الجهاز ده', 'Notifications are on for this device')}</p>
      ) : st === 'off' ? (
        <>
          <p className="text-sm text-ink">{L('فعّلها علشان يوصلك تذكير قبل معادك، ولو فضي معاد أبكر، والعروض.', 'Get reminders, earlier slots and offers.')}</p>
          <Button className="w-full" loading={busy} onClick={() => void turnOn()}><BellRing className="size-4" />{L('فعّل الإشعارات', 'Turn on notifications')}</Button>
        </>
      ) : st === 'blocked' ? (
        <p className="flex items-start gap-2 text-sm text-ink"><BellOff className="mt-0.5 size-5 shrink-0 text-danger" />{L('الإشعارات مقفولة من إعدادات المتصفح. افتح إعدادات الموقع (القفل جنب اللينك) واختار «السماح بالإشعارات».', 'Notifications are blocked in your browser. Open site settings (the lock next to the address) and allow notifications.')}</p>
      ) : st === 'ios' ? (
        <>
          <p className="text-sm text-ink">{L('على الآيفون لازم تضيف tito للشاشة الرئيسية الأول، وبعدين تفعّل الإشعارات من هنا.', 'On iPhone, add tito to your Home Screen first, then turn notifications on here.')}</p>
          <IosInstallGuideButton />
        </>
      ) : st === 'unsupported' ? (
        <p className="text-sm text-ink">{L('المتصفح ده مش بيدعم الإشعارات. جرّب كروم أو نزّل التطبيق.', 'This browser does not support notifications. Try Chrome or install the app.')}</p>
      ) : null}
    </div>
  );
}
