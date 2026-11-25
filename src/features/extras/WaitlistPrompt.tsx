import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { enablePush, pushIsOn, pushSupported } from '@/lib/push';
import { useMyWaitlist, useWaitlistActions } from './useExtras';

/** زر تفعيل الإشعارات جوه تأكيد قايمة الانتظار: يظهر لو الإشعارات مش مفعّلة فعلاً على الجهاز، وغير كده يظهر إنها شغالة */
function WaitlistPushToggle({ isAr }: { isAr: boolean }) {
  const L = (a: string, e: string) => (isAr ? a : e);
  const [state, setState] = useState<'loading' | 'on' | 'off' | 'busy' | 'unsupported'>('loading');
  useEffect(() => {
    void (async () => {
      if (!pushSupported()) { setState('unsupported'); return; }
      setState((await pushIsOn()) ? 'on' : 'off');
    })();
  }, []);
  if (state === 'loading' || state === 'unsupported') return null;
  if (state === 'on') return <p className="mt-2 text-xs font-medium text-green-700">{L('الإشعارات مفعّلة على جهازك ✅', 'Notifications are on for this device ✅')}</p>;
  return (
    <Button size="sm" variant="secondary" className="mt-2" loading={state === 'busy'}
      onClick={() => { setState('busy'); void enablePush(isAr ? 'ar' : 'en').then((ok) => setState(ok ? 'on' : 'off')).catch(() => setState('off')); }}>
      {L('فعّل إشعارات الموبايل', 'Turn on mobile notifications')}
    </Button>
  );
}

/** بيظهر لما اليوم مفيهوش معاد فاضي: العميل يسجّل في الانتظار */
export function WaitlistPrompt({ day, serviceId, defaultOpen = false }: { day: string; serviceId: string | null; defaultOpen?: boolean }) {
  const { i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const L = (ar: string, en: string) => (isAr ? ar : en);
  const [note, setNote] = useState('');
  const [open, setOpen] = useState(defaultOpen);
  const mine = useMyWaitlist(day, true);
  const { join, cancel } = useWaitlistActions();

  if (mine.data) {
    return (
      <div className="rounded-card border border-gold/40 bg-gold/10 p-4 text-sm text-espresso">
        <p className="font-semibold">{L('إنت في قايمة الانتظار ليوم ده ✅', 'You are on the waiting list for this day ✅')}</p>
        <p className="mt-1 text-ink">{L('هيوصلك إشعار على الموبايل لو حد لغى معاده. فعّل الإشعارات عشان يوصلك.', 'We will send a mobile notification if someone cancels. Turn on notifications so it reaches you.')}</p>
        <WaitlistPushToggle isAr={isAr} />
        <Button size="sm" variant="secondary" className="mt-3" loading={cancel.isPending} onClick={() => cancel.mutate(mine.data!.id)}>
          {L('إلغاء الانتظار', 'Leave the list')}
        </Button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-11 w-full rounded-card border border-dashed border-gold/60 bg-gold/10 px-4 py-3 text-start text-sm font-medium text-espresso"
      >
        {L('مفيش معاد يناسبك؟ سجّل في قايمة الانتظار وهنبلّغك لو فضي معاد 🔔', 'No time that suits you? Join the waiting list and we will notify you 🔔')}
      </button>
    );
  }

  return (
    <div className="rounded-card border border-default bg-sand/50 p-4">
      <p className="font-semibold text-espresso">{L('سجّل في قايمة الانتظار', 'Join the waiting list')}</p>
      <p className="mt-1 text-sm text-ink">{L('هيوصلك إشعار على الموبايل لو حد لغى معاده.', 'We will send you a mobile notification if someone cancels.')}</p>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value.slice(0, 120))}
        placeholder={L('ملاحظة (مثلاً: أي وقت بعد 5)', 'Note (e.g. any time after 5pm)')}
        className="mt-3 min-h-11 w-full rounded-btn border border-bark/20 bg-white px-3 text-sm text-espresso"
      />
      <Button
        className="mt-3 w-full sm:w-auto"
        loading={join.isPending}
        onClick={() =>
          join.mutate(
            { service: serviceId, day, note },
            {
              onSuccess: () => toast.success(L('اتسجّلت في قايمة الانتظار', 'Added to the waiting list')),
              onError: () => toast.error(L('مقدرناش نسجّلك، جرّب تاني', 'Could not add you, try again')),
            },
          )
        }
      >
        {L('سجّلني في الانتظار', 'Join the waiting list')}
      </Button>
    </div>
  );
}
