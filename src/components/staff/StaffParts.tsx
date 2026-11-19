import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { useActiveStaff, type StaffMember } from '@/features/booking/useBooking';
import { cn } from '@/lib/cn';

export function StaffAvatar({ member, className }: { member: Pick<StaffMember, 'name' | 'photo'>; className?: string }) {
  if (member.photo) {
    return <img src={member.photo} alt={member.name} loading="lazy" className={cn('shrink-0 rounded-full object-cover', className)} />;
  }
  return (
    <span className={cn('flex shrink-0 items-center justify-center rounded-full bg-gold/25 font-bold text-espresso', className)} aria-hidden>
      {member.name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

export function staffBio(m: StaffMember, isAr: boolean): string {
  return ((isAr ? m.bio : m.bio_en || m.bio) ?? '').trim();
}

const SOCIAL_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  whatsapp: 'WhatsApp',
};

/** بيحوّل اللي الأدمن كتبه (يوزر أو رابط أو رقم) لرابط آمن، أو null لو مش مفهوم */
export function socialUrl(kind: string, raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  if (kind === 'whatsapp') {
    let d = v.replace(/\D/g, '');
    if (!d) return null;
    if (d.startsWith('00')) d = d.slice(2);
    else if (d.startsWith('0')) d = `20${d.slice(1)}`;
    return `https://wa.me/${d}`;
  }
  const handle = v.replace(/^@/, '').replace(/^(www\.)?(instagram|facebook|tiktok|youtube)\.com\//i, '');
  if (/\s/.test(handle)) return null;
  switch (kind) {
    case 'instagram':
      return `https://instagram.com/${handle}`;
    case 'facebook':
      return `https://facebook.com/${handle}`;
    case 'tiktok':
      return `https://tiktok.com/@${handle.replace(/^@/, '')}`;
    case 'youtube':
      return `https://youtube.com/${handle.startsWith('@') || handle.startsWith('channel') || handle.startsWith('c/') ? handle : `@${handle}`}`;
    default:
      return null;
  }
}

export function socialLinks(m: StaffMember): Array<{ kind: string; label: string; url: string }> {
  const out: Array<{ kind: string; label: string; url: string }> = [];
  for (const [kind, label] of Object.entries(SOCIAL_LABELS)) {
    const url = socialUrl(kind, m.socials?.[kind] ?? '');
    if (url) out.push({ kind, label, url });
  }
  return out;
}

export function expLabel(m: StaffMember, isAr: boolean): string | null {
  if (m.experience_years == null) return null;
  return isAr ? `${m.experience_years} سنة خبرة` : `${m.experience_years} yrs experience`;
}

/** تفاصيل الحلاق كاملة: الصورة والاسم والخبرة والنبذة الطويلة + زرار احجز معاه */
export function StaffDetailsSheet({
  member,
  onClose,
  onPick,
}: {
  member: StaffMember | null;
  onClose: () => void;
  /** لو متحدد، زرار الحجز بيختار الحلاق ده بدل ما ينقل لصفحة الحجز */
  onPick?: (m: StaffMember) => void;
}) {
  const { i18n } = useTranslation();
  const isAr = !!i18n.language?.startsWith('ar');
  const navigate = useNavigate();
  if (!member) return null;
  const bio = staffBio(member, isAr);
  const exp = expLabel(member, isAr);
  return (
    <Sheet open onClose={onClose} title={member.name}>
      <div className="flex flex-col items-center text-center">
        <StaffAvatar member={member} className="size-28 text-4xl shadow-warm" />
        <p className="mt-3 text-xl font-bold text-espresso">{member.name}</p>
        {exp ? <span className="mt-1 rounded-full bg-gold/20 px-3 py-0.5 text-sm font-medium text-espresso">{exp}</span> : null}
      </div>
      {socialLinks(member).length > 0 ? (
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {socialLinks(member).map((l) => (
            <a
              key={l.kind}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center rounded-full border border-default bg-white px-4 text-sm font-semibold text-espresso hover:bg-sand"
            >
              {l.label}
            </a>
          ))}
        </div>
      ) : null}
      {bio ? <p className="mt-5 whitespace-pre-line break-words text-start leading-relaxed text-ink">{bio}</p> : null}
      <Button
        className="mt-6 w-full"
        onClick={() => {
          if (onPick) {
            onPick(member);
            onClose();
          } else {
            navigate(`/book?staff=${member.id}`);
          }
        }}
      >
        {isAr ? `احجز مع ${member.name}` : `Book with ${member.name}`}
      </Button>
    </Sheet>
  );
}

/** قسم "فريقنا" في الرئيسية */
export function TeamSection() {
  const { i18n } = useTranslation();
  const isAr = !!i18n.language?.startsWith('ar');
  const staff = useActiveStaff().data ?? [];
  const [open, setOpen] = useState<StaffMember | null>(null);
  if (staff.length === 0) return null;

  return (
    <section className="mx-auto max-w-5xl px-5 pb-4 pt-6 sm:pb-8">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-gold font-latin">{isAr ? 'الفريق' : 'The team'}</p>
      <h2 className="mt-2 text-2xl font-bold text-espresso sm:text-3xl">{isAr ? 'فريقنا' : 'Meet our team'}</h2>
      <ul className={cn('mt-5 grid gap-3', staff.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2')}>
        {staff.map((m) => {
          const bio = staffBio(m, isAr);
          const exp = expLabel(m, isAr);
          return (
            <li key={m.id} className="min-w-0 rounded-card border border-default bg-white p-4 shadow-warm">
              <div className="flex items-center gap-4">
                <StaffAvatar member={m} className="size-20 text-3xl" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-bold text-espresso">{m.name}</p>
                  {exp ? <p className="mt-0.5 text-sm font-medium text-gold-dark">{exp}</p> : null}
                </div>
              </div>
              {bio ? (
                <p className="mt-3 overflow-hidden whitespace-pre-line break-words text-sm leading-relaxed text-ink [-webkit-box-orient:vertical] [-webkit-line-clamp:3] [display:-webkit-box]">
                  {bio}
                </p>
              ) : null}
              <button type="button" onClick={() => setOpen(m)} className="mt-3 text-sm font-semibold text-gold-dark underline underline-offset-4">
                {isAr ? 'اعرف أكتر' : 'Learn more'}
              </button>
            </li>
          );
        })}
      </ul>
      <StaffDetailsSheet member={open} onClose={() => setOpen(null)} />
    </section>
  );
}
