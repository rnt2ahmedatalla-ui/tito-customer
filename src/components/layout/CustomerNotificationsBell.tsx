import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCircle2, XCircle, CalendarClock, BellRing, AlertTriangle, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/profile/useAuth';
import { cn } from '@/lib/cn';

export type CustomerNotification = {
  id: string;
  kind: string;
  title_ar: string;
  title_en: string;
  body_ar: string | null;
  body_en: string | null;
  entity: string | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
};

export function useCustomerNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['customer-notifications', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as CustomerNotification[];
    },
    staleTime: 15_000,
    refetchInterval: user ? 45_000 : false,
  });

  const markAll = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('customer_mark_notifications_read');
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['customer-notifications'] }),
  });

  const markOne = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('customer_mark_notifications_read', { p_ids: [id] });
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['customer-notifications'] }),
  });

  const data = query.data ?? [];
  const unread = data.filter((n) => !n.is_read).length;

  return { data, unread, markAll, markOne, isLoading: query.isLoading };
}

type Tone = 'reject' | 'cancel' | 'ok' | 'move' | 'info';

function toneOf(kind: string): Tone {
  const k = kind.toLowerCase();
  if (k.includes('reject') || k.includes('fail')) return 'reject';
  if (k.includes('cancel')) return 'cancel';
  if (k.includes('confirm') || k.includes('approved') || k.includes('paid')) return 'ok';
  if (k.includes('move') || k.includes('resched')) return 'move';
  return 'info';
}

const TONES: Record<Tone, { Icon: typeof Bell; badge: string }> = {
  reject: { Icon: AlertTriangle, badge: 'bg-danger/15 text-danger' },
  cancel: { Icon: XCircle, badge: 'bg-bark/10 text-bark' },
  ok: { Icon: CheckCircle2, badge: 'bg-success/15 text-success' },
  move: { Icon: CalendarClock, badge: 'bg-gold/25 text-espresso' },
  info: { Icon: BellRing, badge: 'bg-gold/25 text-espresso' },
};

// بعض النصوص بتيجي من قاعدة البيانات بالإنجليزي، فبنترجمها هنا
function localize(text: string, isAr: boolean): string {
  if (!text) return text;
  if (isAr) {
    return text
      .replace(/سبب الإلغاء:\s*cancelled by admin/gi, 'الحجز اتلغى من المحل')
      .replace(/سبب الإلغاء:\s*cancelled by customer/gi, 'إنت لغيت الحجز')
      .replace(/cancelled by admin/gi, 'اتلغى من المحل')
      .replace(/cancelled by customer/gi, 'إنت لغيت الحجز');
  }
  return text
    .replace(/cancelled by admin/gi, 'cancelled by the shop')
    .replace(/cancelled by customer/gi, 'cancelled by you');
}

function timeAgo(iso: string, isAr: boolean): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return isAr ? 'دلوقتي' : 'now';
  if (mins < 60) return isAr ? `من ${mins} د` : `${mins}m ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return isAr ? `من ${h} س` : `${h}h ago`;
  const d = Math.round(h / 24);
  return isAr ? `من ${d} يوم` : `${d}d ago`;
}

const DESKTOP_BREAKPOINT = 640;
const PANEL_WIDTH = 380;

export function CustomerNotificationsBell({ dark = false }: { dark?: boolean }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { data, unread, markAll, markOne } = useCustomerNotifications();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number | null }>({ top: 64, left: null });
  const btnRef = useRef<HTMLButtonElement>(null);
  const isAr = !!i18n.language?.startsWith('ar');

  // يقفل لما الصفحة تتغير أو تدوس Escape
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  if (!user) return null;

  const toggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const desktop = window.innerWidth >= DESKTOP_BREAKPOINT;
      setPos({
        top: rect.bottom + 8,
        // الموبايل: في نص الشاشة. اللابتوب: تحت الجرس وجوه الشاشة
        left: desktop ? Math.max(8, Math.min(rect.left + rect.width / 2 - PANEL_WIDTH / 2, window.innerWidth - PANEL_WIDTH - 8)) : null,
      });
    }
    setOpen((v) => !v);
  };

  const openItem = (n: CustomerNotification) => {
    setOpen(false);
    if (!n.is_read) void markOne.mutate(n.id);
    navigate('/bookings');
  };

  const panel = (
    <>
      <div className="fixed inset-0 z-[90] bg-espresso/30 sm:bg-transparent" onClick={() => setOpen(false)} aria-hidden />
      <div
        role="dialog"
        aria-label={t('notifications.title')}
        style={pos.left !== null ? { top: pos.top, left: pos.left, width: PANEL_WIDTH } : { top: pos.top }}
        className={cn(
          'fixed z-[95] overflow-hidden rounded-card border border-default bg-white shadow-warm-raised',
          pos.left === null && 'inset-x-3 mx-auto max-w-md',
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b border-default bg-cream px-4 py-3">
          <div className="flex items-center gap-2">
            <p className="text-base font-bold text-espresso">{t('notifications.title')}</p>
            {unread > 0 ? (
              <span className="rounded-full bg-gold px-2 py-0.5 font-latin text-xs font-bold text-espresso">
                {unread} {isAr ? 'جديد' : 'new'}
              </span>
            ) : null}
          </div>
          {unread > 0 ? (
            <button type="button" className="text-sm font-medium text-bark underline" onClick={() => void markAll.mutate()}>
              {t('notifications.markAll')}
            </button>
          ) : null}
        </div>

        <ul className="max-h-[min(65dvh,26rem)] divide-y divide-default overflow-y-auto overscroll-contain">
          {data.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-ink">{t('notifications.empty')}</li>
          ) : (
            data.map((n) => {
              const tone = toneOf(n.kind ?? '');
              const { Icon, badge } = TONES[tone];
              const title = isAr ? n.title_ar : n.title_en;
              const body = localize((isAr ? n.body_ar : n.body_en) ?? '', isAr);
              const rejected = tone === 'reject';
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => openItem(n)}
                    className={cn(
                      'flex w-full items-start gap-3 px-4 py-3.5 text-start transition-colors hover:bg-sand/50',
                      rejected ? 'border-s-4 border-danger bg-danger/5' : !n.is_read && 'bg-gold/10',
                    )}
                  >
                    <span className={cn('mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full', badge)}>
                      <Icon className="size-[18px]" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className={cn('text-sm font-bold', rejected ? 'text-danger' : 'text-espresso')}>{title}</span>
                        {!n.is_read ? <span className="mt-1.5 size-2 shrink-0 rounded-full bg-gold" aria-hidden /> : null}
                      </span>
                      {body ? <span className="mt-1 block break-words text-sm leading-relaxed text-ink">{body}</span> : null}
                      {rejected ? (
                        <span className="mt-2 inline-flex items-center gap-1 rounded-btn bg-danger px-3 py-1.5 text-xs font-semibold text-white">
                          {isAr ? 'ابعت الإيصال تاني' : 'Send the receipt again'}
                          <ChevronRight className="size-3.5 rtl:-scale-x-100" aria-hidden />
                        </span>
                      ) : null}
                      <span className="mt-1.5 block text-xs text-ink">{timeAgo(n.created_at, isAr)}</span>
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </>
  );

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        className={cn(
          'relative inline-flex min-h-10 min-w-10 items-center justify-center rounded-btn p-2',
          dark ? 'border border-cream/20 text-cream hover:bg-cream/10' : 'border border-default text-ink hover:bg-sand',
        )}
        aria-label={t('notifications.title')}
        aria-expanded={open}
        onClick={toggle}
      >
        <Bell className="size-5" />
        {unread > 0 ? (
          <span className="absolute -end-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-espresso">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>

      {open ? createPortal(panel, document.body) : null}
    </div>
  );
}
