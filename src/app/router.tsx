import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Skeleton } from '@/components/ui/Skeleton';

const HomePage = lazy(() => import('@/features/home/HomePage'));
const BookingPage = lazy(() => import('@/features/booking/BookingPage'));
const BookingsPage = lazy(() => import('@/features/bookings/BookingsPage'));
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

const router = createBrowserRouter([
  { path: '/', element: withSuspense(HomePage) },
  { path: '/book', element: withSuspense(BookingPage) },
  { path: '/bookings', element: withSuspense(BookingsPage) },
  { path: '/profile', element: withSuspense(ProfilePage) },
  { path: '*', element: withSuspense(NotFoundPage) },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
