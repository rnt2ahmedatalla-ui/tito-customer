import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { PageShell } from '@/components/layout/PageShell';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth, useProfile, useSignIn, useSignOut } from './useAuth';
import { useUpdateProfile } from './useProfile';
import { setLanguage } from '@/i18n';
import { egyptianPhoneSchema } from '@/lib/phone';
import { buildWhatsAppUrl } from '@/lib/urls';
import { useSettings } from '@/features/home/useHomeData';
import { MessageCircle } from 'lucide-react';

const profileSchema = z.object({
  fullName: z.string().min(2).max(100),
  phone: egyptianPhoneSchema,
});

export default function ProfilePage() {
  const { t, i18n } = useTranslation();
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

  const whatsappUrl = settings.data?.shop_whatsapp
    ? buildWhatsAppUrl(settings.data.shop_whatsapp)
    : null;

  if (!user && !authLoading) {
    return (
      <PageShell>
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-ink">{t('booking.loginRequired')}</p>
          <Button onClick={() => signIn()}>{t('booking.signInGoogle')}</Button>
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

      <div className="mt-6 flex flex-col gap-4">
        <Input
          label={t('profile.fullName')}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          error={errors.fullName}
        />
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
        <Button onClick={handleSave} loading={updateProfile.isPending}>
          {t('profile.save')}
        </Button>
      </div>

      <div className="mt-8">
        <p className="mb-2 text-sm font-medium text-espresso">{t('profile.language')}</p>
        <div className="flex gap-2">
          <Button
            variant={i18n.language === 'ar' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setLanguage('ar')}
          >
            {t('profile.arabic')}
          </Button>
          <Button
            variant={i18n.language === 'en' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setLanguage('en')}
          >
            {t('profile.english')}
          </Button>
        </div>
      </div>

      <div className="mt-8">
        <Button variant="danger" onClick={() => signOut()}>
          {t('profile.signOut')}
        </Button>
      </div>
    </PageShell>
  );
}
