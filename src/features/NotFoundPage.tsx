import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageShell } from '@/components/layout/PageShell';
import { Button } from '@/components/ui/Button';

export default function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <PageShell>
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <h1 className="text-6xl font-bold text-gold font-latin">404</h1>
        <h2 className="text-xl font-semibold text-espresso">{t('common.notFound')}</h2>
        <p className="text-ink">{t('common.notFoundDesc')}</p>
        <Link to="/">
          <Button>{t('common.goHome')}</Button>
        </Link>
      </div>
    </PageShell>
  );
}
