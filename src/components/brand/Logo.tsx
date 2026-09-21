interface LogoProps {
  variant?: 'light' | 'dark';
  height?: number;
  className?: string;
}

export function Logo({ variant = 'dark', height = 32, className }: LogoProps) {
  const src =
    variant === 'dark'
      ? '/brand/tito-logo-horizontal-gold-on-dark-1200.png'
      : '/brand/tito-logo-horizontal-transparent-1200.png';

  return (
    <img
      src={src}
      alt="tito"
      height={height}
      width={Math.round(height * 3.2)}
      className={className}
      style={{ height, width: 'auto' }}
    />
  );
}
