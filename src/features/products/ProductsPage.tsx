import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { PageShell } from '@/components/layout/PageShell';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { supabase } from '@/lib/supabase';
import { formatEGP } from '@/lib/money';

type Product = {
  id: string;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  price_egp: number;
  image_path: string | null;
};

export default function ProductsPage() {
  const { t, i18n } = useTranslation();
  const products = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name_ar, name_en, description_ar, description_en, price_egp, image_path')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as Product[];
    },
  });

  const img = (path: string | null) =>
    path
      ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/product-images/${path}`
      : null;

  return (
    <PageShell>
      <h1 className="text-2xl font-bold text-espresso">{t('products.title')}</h1>
      <p className="mt-2 text-sm text-ink">{t('products.support')}</p>
      {products.isLoading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (products.data ?? []).length === 0 ? (
        <p className="mt-8 text-center text-ink">{t('products.empty')}</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {(products.data ?? []).map((p) => {
            const name = i18n.language === 'ar' ? p.name_ar : p.name_en;
            const desc = i18n.language === 'ar' ? p.description_ar : p.description_en;
            return (
              <article key={p.id} className="overflow-hidden rounded-card border border-default bg-white">
                {img(p.image_path) ? (
                  <img src={img(p.image_path)!} alt="" className="h-40 w-full object-cover" />
                ) : (
                  <div className="h-28 bg-sand" />
                )}
                <div className="space-y-2 p-4">
                  <h2 className="font-semibold text-espresso">{name}</h2>
                  {desc ? <p className="text-sm text-ink">{desc}</p> : null}
                  <p className="font-latin font-bold text-espresso">{formatEGP(p.price_egp)}</p>
                  <Link to={`/products/${p.id}`}>
                    <Button size="sm" className="w-full">{t('products.order')}</Button>
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
