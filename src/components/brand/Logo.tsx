interface LogoProps {
  /** light = for cream backgrounds; dark = for espresso backgrounds */
  variant?: 'light' | 'dark';
  /** Square icon instead of wide wordmark */
  mark?: boolean;
  height?: number;
  className?: string;
}

export function Logo({ variant = 'dark', mark = false, height = 32, className }: LogoProps) {
  let src: string;
  if (mark) {
    src =
      variant === 'dark'
        ? '/brand/tito-icon-gold-on-dark-512.png'
        : '/brand/tito-icon-512.png';
  } else if (variant === 'dark') {
    src = '/brand/tito-logo-horizontal-gold-on-dark-1200.png';
  } else {
    src = '/brand/tito-logo-horizontal-transparent-1200.png';
  }

  const maxW = mark ? height : Math.round(height * 3.2);

  return (
    <img
      src={src}
      alt="tito"
      height={height}
      width={mark ? height : Math.round(height * 3.1)}
      className={className}
      style={{
        height,
        width: 'auto',
        maxWidth: maxW,
        objectFit: 'contain',
        display: 'block',
      }}
    />
  );
}
