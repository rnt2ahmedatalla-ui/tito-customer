import { Logo } from './Logo';

interface WordmarkProps {
  variant?: 'light' | 'dark';
  height?: number;
}

export function Wordmark({ variant = 'dark', height = 32 }: WordmarkProps) {
  return <Logo variant={variant} height={height} />;
}
