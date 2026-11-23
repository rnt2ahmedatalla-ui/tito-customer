import { Baby, Brush, Crown, Droplets, Eye, Flame, Gem, HandHeart, Home, Hotel, Palette, Scissors, Sparkles, Spline, Waves, Wind, type LucideIcon } from 'lucide-react';

/** موس الحلاقة (مش موجود في المكتبة) */
function RazorIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M4 15.5 14.5 5a2.1 2.1 0 0 1 3 3L7 18.5Z" />
      <path d="m7 18.5 1.8 1.8a1.5 1.5 0 0 0 2.1 0l1.6-1.6" />
      <path d="M15.5 9 19 12.5" />
    </svg>
  );
}
/** دقن */
function BeardIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M5 8c0 6 2.5 12 7 12s7-6 7-12" />
      <path d="M8.5 13.5c1-.8 2.2-1.2 3.5-1.2s2.5.4 3.5 1.2" />
      <path d="M12 16v2" />
    </svg>
  );
}

type IconC = LucideIcon | ((p: { className?: string }) => JSX.Element);
/** كل الأيقونات المتاحة للخدمات والإضافات — المفتاح بيتحفظ في services.icon */
export const SERVICE_ICONS: Array<[string, string, string, IconC]> = [
  ['cut', 'قص شعر', 'Haircut', Scissors],
  ['beard', 'لحية / دقن', 'Beard', BeardIcon],
  ['shave', 'حلاقة بالموس', 'Shave', RazorIcon],
  ['kid', 'أطفال', 'Kids', Baby],
  ['combo', 'باقة متكاملة', 'Full package', Crown],
  ['groom', 'عريس', 'Groom', Gem],
  ['home', 'في البيت', 'At home', Home],
  ['hall', 'في القاعة', 'At the venue', Hotel],
  ['facial', 'بشرة / تنظيف', 'Facial', Sparkles],
  ['mask', 'ماسك / غسيل', 'Mask / wash', Droplets],
  ['blow', 'سشوار', 'Blow-dry', Wind],
  ['curly', 'كيرلي', 'Curly', Waves],
  ['straight', 'فرد / بروتين', 'Straightening', Brush],
  ['dye', 'صبغة', 'Colour', Palette],
  ['wax', 'شمع', 'Wax', Flame],
  ['thread', 'خيط', 'Threading', Spline],
  ['brow', 'حواجب', 'Eyebrows', Eye],
  ['care', 'عناية / مساج', 'Care / massage', HandHeart],
];

/** لو مفيش أيقونة متختارة: بنخمّن من اسم الخدمة */
export function guessServiceIcon(name: string): string {
  const n = name.toLowerCase();
  const has = (...ws: string[]) => ws.some((w) => n.includes(w));
  if (has('عريس', 'groom', 'wedding')) return 'groom';
  if (has('متكامل', 'تجربة', 'vip', 'full', 'experience', 'package', 'باقة')) return 'combo';
  if (has('طفل', 'أطفال', 'اطفال', 'kid', 'child', 'boy')) return 'kid';
  if (has('بيت', 'منزل', 'home')) return 'home';
  if (has('قاعة', 'hall', 'venue')) return 'hall';
  if (has('لحية', 'لحيه', 'دقن', 'ذقن', 'beard')) return 'beard';
  if (has('موس', 'shave')) return 'shave';
  if (has('شمع', 'wax')) return 'wax';
  if (has('حواجب', 'brow')) return 'brow';
  if (has('خيط', 'thread')) return 'thread';
  if (has('صبغ', 'لون', 'dye', 'color', 'colour')) return 'dye';
  if (has('كيرل', 'curl', 'perm')) return 'curly';
  if (has('فرد', 'بروتين', 'كيراتين', 'straight', 'protein', 'keratin')) return 'straight';
  if (has('سشوار', 'استشوار', 'blow', 'dry')) return 'blow';
  if (has('ماسك', 'mask', 'غسيل', 'wash')) return 'mask';
  if (has('بشرة', 'تنظيف', 'skin', 'facial', 'clean')) return 'facial';
  if (has('مساج', 'massage', 'عناية', 'care')) return 'care';
  return 'cut';
}

export function ServiceIcon({ name, icon, className }: { name: string; icon?: string | null; className?: string }) {
  const key = icon && SERVICE_ICONS.some((x) => x[0] === icon) ? icon : guessServiceIcon(name);
  const C = (SERVICE_ICONS.find((x) => x[0] === key) ?? SERVICE_ICONS[0]!)[3];
  return <C className={className} aria-hidden />;
}
