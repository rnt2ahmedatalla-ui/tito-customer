import { MyPhotos } from './MyPhotos';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { MyPackagesCard } from '@/features/extras/ExtrasCards';
import { BirthdayCard } from './BirthdayCard';
import { IosInstallGuideButton } from '@/components/layout/IosInstallGuide';
import { PageShell } from '@/components/layout/PageShell';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { InAppBrowserNotice } from '@/components/auth/InAppBrowserNotice';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { useAuth, useProfile, useSignIn, useSignOut } from './useAuth';
import { useUpdateProfile } from './useProfile';
import { setLanguage } from '@/i18n';
import { egyptianPhoneSchema } from '@/lib/phone';
import { buildWhatsAppUrl } from '@/lib/urls';
import { useSettings } from '@/features/home/useHomeData';
import { BellRing, MessageCircle, Palette, UserRound, type LucideIcon } from 'lucide-react';
import { NotificationsCard } from './NotificationsCard';
import { ReferralCard } from '@/features/referral/Referral';
import { RewardsCard } from '@/features/loyalty/Rewards';
import { ThemePicker } from '@/components/layout/ThemeToggle';
import { cn } from '@/lib/cn';

/** كارت قسم في «حسابي» */
function Section({ icon: Icon, title, children, delay = 0 }: { icon: LucideIcon; title: string; children: React.ReactNode; delay?: number }) {
  return (
    <section className="animate-rise rounded-card border border-default bg-white p-4 shadow-warm" style={{ animationDelay: `${delay * 70}ms` }}>
      <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-espresso">
        <span className="flex size-8 items-center justify-center rounded-full bg-gold/15 text-gold"><Icon className="size-4" /></span>
        {title}
      </h2>
      {children}
    </section>
  );
}

const profileSchema = z.object({
  fullName: z.string().min(2).max(100),
  phone: egyptianPhoneSchema,
});

export default function ProfilePage() {
  const { t, i18n } = useTranslation();
  const L = (a: string, e: string) => (i18n.language === 'ar' ? a : e);
  const { user, loading: authLoading } = useAuth();
  const profile = useProfile();
  const settings = useSettings();
  const signIn = useSignIn();
  const signOut = useSignOut();
  const updateProfile = useUpdateProfile();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<{ fullName?: string; phone?: string }>({});

  useEffect(() => {
    if (profile.data) {
      setFullName(profile.data.full_name ?? '');
      setPhone(profile.data.phone ?? '');
    }
  }, [profile.data]);

  // جاي من «ارفع صورة حلاقتك»: ننزل لقسم الصور
  useEffect(() => {
    if (window.location.hash !== '#photos' || !profile.data) return;
    const id = window.setTimeout(() => document.getElementById('photos')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
    return () => window.clearTimeout(id);
  }, [profile.data]);

  const whatsappUrl = settings.data?.shop_whatsapp
    ? buildWhatsAppUrl(settings.data.shop_whatsapp)
    : null;

  if (authLoading) {
    return (
      <PageShell>
        <div className="flex flex-col items-center gap-4 py-16">
          <Skeleton className="h-8 w-48" />
        </div>
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell>
        <div className="mx-auto flex max-w-md flex-col items-center gap-5 py-16 text-center">
          <p className="text-base font-semibold text-espresso">{t('booking.loginRequired')}</p>
          <InAppBrowserNotice className="w-full text-start" />
          <GoogleSignInButton
            variant="gold"
            label={t('booking.signInGoogle')}
            onClick={() => void signIn()}
          />
        </div>
      </PageShell>
    );
  }

  const handleSave = async () => {
    const result = profileSchema.safeParse({ fullName, phone });
    if (!result.success) {
      const fieldErrors: { fullName?: string; phone?: string } = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0];
        if (field === 'fullName' || field === 'phone') fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    await updateProfile.mutateAsync({ fullName, phone });
  };

  return (
    <PageShell>
      <h1 className="text-2xl font-bold text-espresso">{t('profile.title')}</h1>

      {profile.data?.is_blocked ? (
        <div className="mt-4 rounded-card border border-danger/30 bg-danger/10 p-4 text-danger" role="alert">
          <p className="text-sm font-medium">{t('profile.blocked')}</p>
          {whatsappUrl ? (
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm underline">
              <MessageCircle className="size-4" />
              {t('home.whatsapp')}
            </a>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 space-y-4">
        <Section icon={UserRound} title={L('بياناتي', 'My details')} delay={0}>
          <div className="flex flex-col gap-4">
            <Input label={t('profile.fullName')} value={fullName} onChange={(e) => setFullName(e.target.value)} error={errors.fullName} />
            <Input
              label={t('profile.phone')}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t('profile.phoneHint')}
              error={errors.phone}
              dir="ltr"
              className="font-latin"
              inputMode="numeric"
            />
            <p className="-mt-2 text-xs text-ink-70">{t('profile.phoneWa')}</p>
            <Button onClick={handleSave} loading={updateProfile.isPending}>{t('profile.save')}</Button>
          </div>
          <BirthdayCard />
        </Section>

        <Section icon={BellRing} title={L('الإشعارات', 'Notifications')} delay={1}>
          <NotificationsCard />
        </Section>

        <RewardsCard />
        <ReferralCard />

        <MyPackagesCard />

        <MyPhotos />

        <Section icon={Palette} title={L('الشكل واللغة', 'Look & language')} delay={2}>
          <p className="mb-2 text-sm font-medium text-espresso">{L('الشكل', 'Theme')}</p>
          <ThemePicker />
          <p className="mb-2 mt-4 text-sm font-medium text-espresso">{t('profile.language')}</p>
          <div className="grid grid-cols-2 gap-1.5 rounded-btn bg-sand/60 p-1">
            {(['ar', 'en'] as const).map((lng) => (
              <button key={lng} type="button" onClick={() => setLanguage(lng)}
                className={cn('min-h-11 rounded-btn text-sm font-medium transition-[color,background-color,border-color,box-shadow,transform,opacity]', i18n.language === lng ? 'bg-white text-espresso shadow-warm' : 'text-ink')}>
                {lng === 'ar' ? t('profile.arabic') : t('profile.english')}
              </button>
            ))}
          </div>
          <IosInstallGuideButton className="mt-4" />
        </Section>

        <Button variant="danger" className="w-full" onClick={() => signOut()}>{t('profile.signOut')}</Button>
      </div>
    </PageShell>
  );
}
