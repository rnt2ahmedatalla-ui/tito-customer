import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';

type Rpc = (fn: string, a?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
const rpc = supabase.rpc.bind(supabase) as unknown as Rpc;

/** "هتيجي؟" على كارت الحجز: جاي / مش جاي (مش جاي بيلغي الحجز ويفضّي المعاد) */
export function AttendanceAsk({ bookingId, asked, attendance }: { bookingId: string; asked: boolean; attendance: string | null }) {
  const { i18n } = useTranslation();
  const isAr = !!i18n.language?.startsWith('ar');
  const L = (ar: string, en: string) => (isAr ? ar : en);
  const qc = useQueryClient();
  const [confirmNo, setConfirmNo] = useState(false);
  const m = useMutation({
    mutationFn: async (coming: boolean) => {
      const r = await rpc('set_attendance', { p_booking_id: bookingId, p_coming: coming });
      if (r.error) throw new Error(r.error.message);
    },
    onSuccess: (_d, coming) => {
      toast.success(coming ? L('تمام، مستنينك ✂️', 'Great, see you ✂️') : L('اتلغى الحجز. تقدر تحجز معاد تاني.', 'Booking cancelled. You can book another time.'));
      void qc.invalidateQueries({ queryKey: ['bookings'] });
      void qc.invalidateQueries({ queryKey: ['slots'] });
    },
    onError: () => toast.error(L('معرفناش نسجّل ردك. جرّب تاني.', 'Could not save your reply. Try again.')),
  });

  if (attendance === 'coming') {
    return <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-emerald-700"><Check className="size-4" aria-hidden />{L('أكدت حضورك', 'Attendance confirmed')}</p>;
  }
  if (!asked || attendance) return null;
  return (
    <div className="mt-3 rounded-btn border border-gold/50 bg-gold/10 p-3">
      <p className="text-sm font-semibold text-espresso">{L('هتيجي في المعاد؟', 'Are you coming?')}</p>
      {confirmNo ? (
        <div className="mt-2 space-y-2">
          <p className="text-xs text-ink">{L('ده هيلغي حجزك ويفضّي المعاد. متأكد؟', 'This cancels your booking and frees the slot. Sure?')}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="danger" loading={m.isPending} onClick={() => m.mutate(false)}>{L('أيوا، ألغي', 'Yes, cancel')}</Button>
            <Button size="sm" variant="secondary" onClick={() => setConfirmNo(false)}>{L('رجوع', 'Back')}</Button>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          <Button size="sm" variant="primary" loading={m.isPending} onClick={() => m.mutate(true)}><Check className="size-4" />{L('جاي', 'Coming')}</Button>
          <Button size="sm" variant="secondary" onClick={() => setConfirmNo(true)}><X className="size-4" />{L('مش جاي', 'Not coming')}</Button>
        </div>
      )}
    </div>
  );
}
