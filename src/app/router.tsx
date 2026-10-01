import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Skeleton } from '@/components/ui/Skeleton';

const HomePage = lazy(() => import('@/features/home/HomePage'));
const BookingPage = lazy(() => import('@/features/booking/BookingPage'));
const BookingsPage = lazy(() => import('@/features/bookings/BookingsPage'));
const MovePage = lazy(() => import('@/features/move/MovePage'));
const RatePage = lazy(() => import('@/features/rate/RatePage'));
const ProductsPage = lazy(() => import('@/features/products/ProductsPage'));
const ProductOrderPage = lazy(() => import('@/features/products/ProductOrderPage'));
const ProfilePage = lazy(() => import('@/features/profile/ProfilePage'));
const NotFoundPage = lazy(() => import('@/features/NotFoundPage'));

function PageLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-cream p-8">
      <Skeleton className="h-8 w-48" />
    </div>
  );
}

function withSuspense(Component: React.ComponentType) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  );
}

const basename = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') || undefined;

const router = createBrowserRouter(
  [
    { path: '/', element: withSuspense(HomePage) },
    { path: '/book', element: withSuspense(BookingPage) },
    { path: '/bookings', element: withSuspense(BookingsPage) },
    { path: '/move/:token', element: withSuspense(MovePage) },
    { path: '/rate/:token', element: withSuspense(RatePage) },
    { path: '/products', element: withSuspense(ProductsPage) },
    { path: '/products/:id', element: withSuspense(ProductOrderPage) },
    { path: '/profile', element: withSuspense(ProfilePage) },
    { path: '*', element: withSuspense(NotFoundPage) },
  ],
  { basename },
);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
