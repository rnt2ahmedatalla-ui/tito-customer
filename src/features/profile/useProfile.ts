import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { extractErrorCode, getErrorReferenceId, mapErrorToI18nKey } from '@/lib/errors';

export function useUpdateProfile() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fullName, phone }: { fullName: string; phone: string }) => {
      const { error } = await supabase.rpc('update_my_profile', {
        p_full_name: fullName,
        p_phone: phone,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success(t('profile.save'));
    },
    onError: (error) => {
      const code = extractErrorCode(error);
      const key = mapErrorToI18nKey(code);
      toast.error(t(key), {
        description: code === 'UNKNOWN' ? t('errors.reference', { id: getErrorReferenceId(error) }) : undefined,
      });
    },
  });
}
