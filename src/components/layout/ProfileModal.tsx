import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Sheet } from '@/components/ui/Sheet';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { egyptianPhoneSchema } from '@/lib/phone';
import { useUpdateProfile } from '@/features/profile/useProfile';

const profileSchema = z.object({
  fullName: z.string().min(2).max(100),
  phone: egyptianPhoneSchema,
});

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
  initialName?: string;
  initialPhone?: string;
}

export function ProfileModal({ open, onClose, onComplete, initialName = '', initialPhone = '' }: ProfileModalProps) {
  const { t } = useTranslation();
  const [fullName, setFullName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [errors, setErrors] = useState<{ fullName?: string; phone?: string }>({});
  const updateProfile = useUpdateProfile();

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
    try {
      await updateProfile.mutateAsync({ fullName, phone });
      onComplete();
      onClose();
    } catch {
      /* handled by mutation */
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={t('profile.completeProfile')}>
      <p className="mb-4 text-sm text-ink">{t('profile.completeProfileDesc')}</p>
      <div className="flex flex-col gap-4">
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
        <Button fullWidth onClick={handleSave} loading={updateProfile.isPending}>
          {t('profile.save')}
        </Button>
      </div>
    </Sheet>
  );
}
