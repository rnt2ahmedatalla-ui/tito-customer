import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CalendarClock, Copy, Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { formatEGP } from '@/lib/money';
import { formatCairoDate, formatCairoTime } from '@/lib/time';
import { useAuth } from '@/features/profile/useAuth';
import type { CustomerNotification } from './CustomerNotificationsBell';

const EVENT = 'tito:open-notification';

/** يفتح تفاصيل الإشعار نفسه (من الجرس) */
export function openNotificationDetail(n: CustomerNotification) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: n }));
}

const STATUS: Record<string, [string, string]> = {
  confirmed: ['مؤكد ✓', 'Confirmed ✓'],
  pending_payment: ['مستني الدفع', 'Awaiting payment'],
  cancelled: ['اتلغى', 'Cancelled'],
  completed: ['خلص', 'Completed'],
  no_show: ['مجاش', 'No-show'],
  expired: ['انتهى', 'Expired'],
};
const ORDER: Record<string, [string, string]> = {
  reserved: ['محجوز — ادفع كاش وانت بتستلم', 'Reserved — pay cash on pickup'],
  awaiting: ['مستني الدفع أونلاين', 'Awaiting online payment'],
  submitted: ['بنراجع التحويل', 'Checking your transfer'],
  confirmed: ['مدفوع — جاهز تستلمه', 'Paid — ready for pickup'],
  picked_up: ['استلمته ✓', 'Picked up ✓'],
  rejected: ['التحويل محتاج مراجعة', 'Transfer needs a check'],
  cancelled: ['اتلغى', 'Cancelled'],
};

/**
 * تفاصيل الإشعار: بتفتح لما تدوس على إشعار في الجرس، أو من إشعار الموبايل (?notif=<id>).
 * بتعرض نص الإشعار كامل + الحاجة اللي يخصها (الحجز / الطلب / الكوبون) + زرار للخطوة الجاية.
 */
export function NotificationDetailHost() {
  const { i18n } = useTranslation();
  const ar = !!i18n.language?.startsWith('ar');
  const L = (a: string, e: string) => (ar ? a : e);
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [n, setN] = useState<CustomerNotification | null>(null);
  const [go, setGo] = useState<string | null>(null);

  useEffect(() => {
    const on = (e: Event) => { setGo(null); setN((e as CustomEvent<CustomerNotification>).detail); };
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);

  // من إشعار الموبايل
  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const id = sp.get('notif');
    if (!id || !user) return;
    const link = sp.get('go');
    sp.delete('notif');
    sp.delete('go');
    const rest = sp.toString();
    navigate({ pathname: location.pathname, search: rest ? `?${rest}` : '' }, { replace: true });
    void supabase.from('customer_notifications').select('*').eq('id', id).maybeSingle().then(({ data }) => {
      if (data) { setGo(link && link.startsWith('/') ? link : null); setN(data as CustomerNotification); }
    });
  }, [location.search, location.pathname, user, navigate]);

  // اتقري
  useEffect(() => {
    if (!n || n.is_read) return;
    void supabase.rpc('customer_mark_notifications_read', { p_ids: [n.id] }).then(() => void qc.invalidateQueries({ queryKey: ['customer-notifications'] }));
  }, [n, qc]);

  const entity = n?.entity ?? '';
  const eid = n?.entity_id ?? null;

  const booking = useQuery({
    queryKey: ['notif-booking', eid],
    enabled: !!n && entity === 'booking' && !!eid,
    queryFn: async () => {
      const { data } = await supabase.from('bookings').select('id, start_at, status, service_name_ar, service_name_en, price_egp').eq('id', eid!).maybeSingle();
      return data;
    },
  });
  const order = useQuery({
    queryKey: ['notif-order', eid],
    enabled: !!n && entity === 'product_order' && !!eid,
    queryFn: async () => {
      const { data } = await supabase.from('product_orders').select('id, product_id, product_name_ar, product_name_en, qty, price_egp, status').eq('id', eid!).maybeSingle();
      return data;
    },
  });
  const request = useQuery({
    queryKey: ['notif-request', eid],
    enabled: !!n && entity === 'product_request' && !!eid,
    queryFn: async () => {
      const { data } = await supabase.from('product_requests').select('id, product_id, product_name').eq('id', eid!).maybeSingle();
      return data;
    },
  });

  if (!n) return null;
  const close = () => setN(null);
  const to = (path: string) => { close(); navigate(path); };
  const title = ar ? n.title_ar : n.title_en || n.title_ar;
  const body = (ar ? n.body_ar : n.body_en || n.body_ar) ?? '';
  const when = new Intl.DateTimeFormat(ar ? 'ar-EG' : 'en-US', { timeZone: 'Africa/Cairo', weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' }).format(new Date(n.created_at));
  const code = n.kind === 'birthday' || n.kind === 'reward' ? (body.match(/\b[A-Z0-9]{6,}\b/)?.[0] ?? null) : null;

  let action: { label: string; path: string } | null = null;
  let related: React.ReactNode = null;

  if (entity === 'booking' && eid) {
    const b = booking.data;
    action = { label: L('افتح الحجز', 'Open booking'), path: `/bookings?focus=${eid}` };
    related = b ? (
      <div className="flex items-start gap-3 rounded-btn border border-default bg-cream p-3">
        <CalendarClock className="mt-0.5 size-5 shrink-0 text-bark" />
        <div className="min-w-0 text-sm">
          <p className="font-semibold text-espresso">{ar ? b.service_name_ar : b.service_name_en || b.service_name_ar}</p>
          <p className="text-ink">{formatCairoDate(b.start_at, ar ? 'ar' : 'en')} · <span className="font-latin" dir="ltr">{formatCairoTime(b.start_at, ar ? 'ar' : 'en')}</span></p>
          <p className="mt-0.5 text-xs font-medium text-bark">{L(...(STATUS[b.status] ?? [b.status, b.status]))} · <span className="font-latin">{formatEGP(Number(b.price_egp))}</span></p>
        </div>
      </div>
    ) : null;
  } else if (entity === 'product_order' && eid) {
    const o = order.data;
    action = { label: L('طلباتي', 'My orders'), path: '/products' };
    related = o ? (
      <div className="flex items-start gap-3 rounded-btn border border-default bg-cream p-3">
        <Package className="mt-0.5 size-5 shrink-0 text-bark" />
        <div className="min-w-0 text-sm">
          <p className="font-semibold text-espresso">{ar ? o.product_name_ar : o.product_name_en || o.product_name_ar}{o.qty > 1 ? ` ×${o.qty}` : ''} · <span className="font-latin">{formatEGP(Number(o.price_egp))}</span></p>
          <p className="text-xs font-medium text-bark">{L(...(ORDER[o.status] ?? [o.status, o.status]))}</p>
        </div>
      </div>
    ) : null;
  } else if (entity === 'product_request') {
    const r = request.data;
    action = { label: L('احجزه دلوقتي', 'Reserve it now'), path: r?.product_id ? `/products/${r.product_id}` : '/products' };
  } else if (entity === 'customer_photo') {
    action = { label: L('شوف شغلنا', 'See our work'), path: '/gallery' };
  } else if (n.kind === 'reward') {
    action = { label: L('احجز واستخدم الهدية', 'Book & use your gift'), path: '/book' };
  } else if (entity === 'rebook' || n.kind === 'rebook') {
    action = { label: L('احجز معادك', 'Book now'), path: '/book' };
  } else if (n.kind === 'birthday') {
    action = { label: L('احجز واستخدم الكود', 'Book & use the code'), path: '/book' };
  } else if (go) {
    action = { label: L('افتح', 'Open'), path: go };
  }

  return (
    <Sheet open onClose={close} title={L('تفاصيل الإشعار', 'Notification')}>
      <div className="space-y-4">
        <div>
          <p className="text-lg font-bold leading-snug text-espresso">{title}</p>
          <p className="mt-0.5 text-xs text-ink">{when}</p>
        </div>
        {body ? <p className="whitespace-pre-line break-words leading-relaxed text-ink">{linkify(body)}</p> : null}
        {code ? (
          <button
            type="button"
            onClick={() => { void navigator.clipboard?.writeText(code).then(() => toast.success(L('اتنسخ الكود ✓', 'Code copied ✓'))).catch(() => undefined); }}
            className="flex w-full items-center justify-between gap-3 rounded-btn border-2 border-dashed border-gold bg-gold/10 px-4 py-3"
          >
            <span className="font-latin text-lg font-bold tracking-widest text-espresso">{code}</span>
            <span className="flex items-center gap-1 text-sm font-medium text-bark"><Copy className="size-4" /> {L('انسخ', 'Copy')}</span>
          </button>
        ) : null}
        {related}
        <div className="flex gap-2 pt-1">
          {action ? <Button className="flex-1" onClick={() => to(action!.path)}>{action.label}</Button> : null}
          <Button variant="secondary" className={action ? '' : 'flex-1'} onClick={close}>{L('تمام', 'OK')}</Button>
        </div>
      </div>
    </Sheet>
  );
}

/** أي لينك في نص الإشعار يبقى قابل للضغط */
function linkify(text: string): React.ReactNode[] {
  const parts = text.split(/(https?:\/\/[^\s<>"']+)/g);
  return parts.map((part, i) => {
    if (!/^https?:\/\//.test(part)) return part;
    const clean = part.replace(/[.,،!?؟)]+$/, '');
    const rest = part.slice(clean.length);
    return (
      <span key={i}>
        <a href={clean} target="_blank" rel="noopener noreferrer" dir="ltr" className="font-medium text-bark underline underline-offset-2 [overflow-wrap:anywhere]">
          {clean}
        </a>
        {rest}
      </span>
    );
  });
}
