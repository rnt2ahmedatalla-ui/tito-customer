import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/Input';
import { egyptianPhoneSchema } from '@/lib/phone';
import { supabase } from '@/lib/supabase';

type Rpc = (fn: string, a: Record<string, unknown>) => Promise<{ error: unknown }>;

/** رقم واتساب منفصل عن رقم المكالمات (اختياري). فاضي = نفس رقم المكالمات. */
export function useWhatsAppPhone(active: boolean) {
  const [same, setSame] = useState(true);
  const [wa, setWa] = useState('');
  const [error, setError] = useState<string | undefined>();
  useEffect(() => {
    if (!active) return;
    let alive = true;
    void (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      // لو العمود لسه مش موجود (قبل v94) بنتجاهل الخطأ والحقل بيفضل «نفس الرقم»
      const { data, error: e } = await supabase.from('profiles').select('whatsapp_phone' as never).eq('id', u.user.id).maybeSingle();
      if (!alive || e) return;
      const w = (data as { whatsapp_phone?: string | null } | null)?.whatsapp_phone ?? '';
      setWa(w);
      setSame(!w);
    })();
    return () => { alive = false; };
  }, [active]);

  const validate = () => {
    if (same || egyptianPhoneSchema.safeParse(wa.trim()).success) { setError(undefined); return true; }
    setError('invalid_phone');
    return false;
  };
  const save = async () => {
    try {
      await (supabase.rpc as unknown as Rpc)('set_my_whatsapp', { p_phone: same ? null : wa.trim() });
    } catch {
      /* السيرفر لسه مش متحدّث: الحفظ الأساسي اتعمل خلاص */
    }
  };
  return { same, setSame, wa, setWa, error, validate, save };
}

export function WhatsAppFields({ s }: { s: ReturnType<typeof useWhatsAppPhone> }) {
  const { t } = useTranslation();
  return (
    <>
      <label className="-mt-1 flex items-center gap-2 text-sm text-espresso">
        <input type="checkbox" className="size-4 accent-gold" checked={s.same} onChange={(e) => s.setSame(e.target.checked)} />
        {t('profile.waSame')}
      </label>
      {!s.same ? (
        <Input
          label={t('profile.waPhone')}
          value={s.wa}
          onChange={(e) => s.setWa(e.target.value)}
          placeholder={t('profile.phoneHint')}
          error={s.error}
          dir="ltr"
          className="font-latin"
          inputMode="numeric"
        />
      ) : null}
    </>
  );
}
