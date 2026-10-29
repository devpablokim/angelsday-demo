import '../../styles/admin.css';

import type { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router';
import { PageLoading } from '../../components/ui';
import { useAdmin } from '../../data/hooks';
import { AdminLayout } from './AdminLayout';
import { AdminCalendarPage } from './AdminCalendarPage';
import { BookingDetailPage } from './BookingDetailPage';
import { BookingsPage } from './BookingsPage';
import { DashboardPage } from './DashboardPage';
import { EmailsPage } from './EmailsPage';
import { LoginPage } from './LoginPage';
import { PricingPage } from './PricingPage';
import { SettingsPage } from './SettingsPage';

function RequireAdmin({ children }: { children: ReactNode }) {
  const admin = useAdmin();
  const loc = useLocation();
  if (admin === undefined) return <PageLoading />;
  if (!admin) return <Navigate to="/admin/login" replace state={{ from: loc.pathname }} />;
  return <>{children}</>;
}

export default function AdminApp() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route
        element={
          <RequireAdmin>
            <AdminLayout />
          </RequireAdmin>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="bookings" element={<BookingsPage />} />
        <Route path="bookings/:id" element={<BookingDetailPage />} />
        <Route path="calendar" element={<AdminCalendarPage />} />
        <Route path="pricing" element={<PricingPage />} />
        <Route path="emails" element={<EmailsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  );
}
