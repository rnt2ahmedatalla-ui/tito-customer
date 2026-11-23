import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Skeleton } from '@/components/ui/Skeleton';

const HomePage = lazy(() => import('@/features/home/HomePage'));
const BookingPage = lazy(() => import('@/features/booking/BookingPage'));
const GroupBookingPage = lazy(() => import('@/features/booking/GroupBookingPage'));
const BookingsPage = lazy(() => import('@/features/bookings/BookingsPage'));
const MovePage = lazy(() => import('@/features/move/MovePage'));
const AttendPage = lazy(() => import('@/features/attend/AttendPage'));
const RatePage = lazy(() => import('@/features/rate/RatePage'));
const ReviewPage = lazy(() => import('@/features/rate/ReviewPage'));
const ProductsPage = lazy(() => import('@/features/products/ProductsPage'));
const ProductOrderPage = lazy(() => import('@/features/products/ProductOrderPage'));
const ProfilePage = lazy(() => import('@/features/profile/ProfilePage'));
const NotFoundPage = lazy(() => import('@/features/NotFoundPage'));
const GalleryPage = lazy(() => import('@/features/gallery/GalleryPage'));
const QueueScreenPage = lazy(() => import('@/features/screen/QueueScreenPage'));

// بعد ما الموقع يفتح: نحمّل باقي الصفحات في الخلفية علشان التنقل يبقى فوري من غير تقطيع
const PRELOAD = [
  () => import('@/features/NotFoundPage'),
  () => import('@/features/attend/AttendPage'),
  () => import('@/features/booking/BookingPage'),
  () => import('@/features/booking/GroupBookingPage'),
  () => import('@/features/bookings/BookingsPage'),
  () => import('@/features/gallery/GalleryPage'),
  () => import('@/features/home/HomePage'),
  () => import('@/features/move/MovePage'),
  () => import('@/features/products/ProductOrderPage'),
  () => import('@/features/products/ProductsPage'),
  () => import('@/features/profile/ProfilePage'),
  () => import('@/features/rate/RatePage'),
  () => import('@/features/rate/ReviewPage'),
  () => import('@/features/screen/QueueScreenPage'),
];
if (typeof window !== 'undefined') {
  const run = () => PRELOAD.forEach((f, i) => window.setTimeout(() => void f().catch(() => undefined), i * 120));
  const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
  window.addEventListener('load', () => (w.requestIdleCallback ? w.requestIdleCallback(run, { timeout: 4000 }) : window.setTimeout(run, 2500)), { once: true });
}


function PageLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-cream p-8">
      <Skeleton className="h-8 w-48" />
    </div>
  );
}

/** كل صفحة جديدة تبدأ من فوق (مش من نفس مكان الصفحة اللي قبلها) */
function ScrollTop() {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);
  return null;
}

function withSuspense(Component: React.ComponentType) {
  return (
    <Suspense fallback={<PageLoader />}>
      <ScrollTop />
      <Component />
    </Suspense>
  );
}

const basename = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') || undefined;

const router = createBrowserRouter(
  [
    { path: '/', element: withSuspense(HomePage) },
    { path: '/book', element: withSuspense(BookingPage) },
    { path: '/book/group', element: withSuspense(GroupBookingPage) },
    { path: '/bookings', element: withSuspense(BookingsPage) },
    { path: '/move/:token', element: withSuspense(MovePage) },
    { path: '/attend/:token', element: withSuspense(AttendPage) },
    { path: '/rate/:token', element: withSuspense(RatePage) },
    { path: '/review', element: withSuspense(ReviewPage) },
    { path: '/products', element: withSuspense(ProductsPage) },
    { path: '/products/:id', element: withSuspense(ProductOrderPage) },
    { path: '/profile', element: withSuspense(ProfilePage) },
    { path: '/gallery', element: withSuspense(GalleryPage) },
    { path: '/screen/:token', element: withSuspense(QueueScreenPage) },
    { path: '*', element: withSuspense(NotFoundPage) },
  ],
  { basename },
);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
