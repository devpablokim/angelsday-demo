import { lazy, Suspense } from 'react';
import { createBrowserRouter, createHashRouter, RouterProvider } from 'react-router';
import { CustomerLayout } from './components/Layout';
import { PageLoading, ToastProvider } from './components/ui';
import { StoreContext } from './data/hooks';
import { ENV, type DataStore } from './data/store';
import { CalendarPage } from './pages/customer/CalendarPage';
import { HomePage } from './pages/customer/HomePage';
import { InquiryDonePage, InquiryPage } from './pages/customer/InquiryPage';
import { MyEventPage } from './pages/customer/MyEventPage';
import { MyLookupPage } from './pages/customer/MyLookupPage';
import { NotFoundPage } from './pages/customer/NotFoundPage';
import { PaymentPage } from './pages/customer/PaymentPage';

const AdminApp = lazy(() => import('./pages/admin/AdminApp'));

const routes = [
  {
    element: <CustomerLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/calendar', element: <CalendarPage /> },
      { path: '/inquiry', element: <InquiryPage /> },
      { path: '/inquiry/done/:id', element: <InquiryDonePage /> },
      { path: '/my', element: <MyLookupPage /> },
      { path: '/my/:id', element: <MyEventPage /> },
      { path: '/my/:id/pay', element: <PaymentPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    path: '/admin/*',
    element: (
      <Suspense fallback={<PageLoading />}>
        <AdminApp />
      </Suspense>
    ),
  },
];

const router = ENV.hashRouter ? createHashRouter(routes) : createBrowserRouter(routes);

export function App({ store }: { store: DataStore }) {
  return (
    <StoreContext.Provider value={store}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </StoreContext.Provider>
  );
}
