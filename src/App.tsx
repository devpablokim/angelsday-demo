import { lazy, Suspense } from 'react';
import { createBrowserRouter, createHashRouter, RouterProvider } from 'react-router';
import { CustomerLayout } from './components/Layout';
import { PageLoading, ToastProvider } from './components/ui';
import { StoreContext } from './data/hooks';
import { ENV, type DataStore } from './data/store';
import { CalendarPage } from './pages/customer/CalendarPage';
import { CateringPage } from './pages/customer/CateringPage';
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
      { path: '/catering', element: <CateringPage /> },
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

// 데모 브랜드처럼 하위 경로(예: /demo/)에 배포할 때는 그 경로를 라우터 기준으로 씁니다
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined;
const router = ENV.hashRouter ? createHashRouter(routes) : createBrowserRouter(routes, { basename });

export function App({ store }: { store: DataStore }) {
  return (
    <StoreContext.Provider value={store}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </StoreContext.Provider>
  );
}
