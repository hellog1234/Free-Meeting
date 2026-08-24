import React from 'react';
import { useRouter } from '../context/RouterContext';
import { AdminGuard } from '../components/admin/AdminGuard';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AdminOverviewPage } from './admin/AdminOverviewPage';
import { AdminUsersPage } from './admin/AdminUsersPage';
import { AdminMeetingsPage } from './admin/AdminMeetingsPage';
import { AdminActiveMeetingsPage } from './admin/AdminActiveMeetingsPage';
import { AdminHistoryPage } from './admin/AdminHistoryPage';
import { AdminReportsPage } from './admin/AdminReportsPage';
import { AdminNotificationsPage } from './admin/AdminNotificationsPage';
import { AdminSettingsPage } from './admin/AdminSettingsPage';

export const AdminDashboardPage: React.FC = () => {
  const { currentPath } = useRouter();

  const getSubRouteContent = () => {
    switch (currentPath) {
      case '/admin/users':
        return {
          title: 'Registered Users',
          component: <AdminUsersPage />,
        };
      case '/admin/meetings':
        return {
          title: 'All Meetings',
          component: <AdminMeetingsPage />,
        };
      case '/admin/active-meetings':
        return {
          title: 'Live Active Calls',
          component: <AdminActiveMeetingsPage />,
        };
      case '/admin/history':
        return {
          title: 'Meeting History',
          component: <AdminHistoryPage />,
        };
      case '/admin/reports':
        return {
          title: 'Platform Reports & Analytics',
          component: <AdminReportsPage />,
        };
      case '/admin/notifications':
        return {
          title: 'Notifications & Broadcasts',
          component: <AdminNotificationsPage />,
        };
      case '/admin/settings':
        return {
          title: 'System Settings',
          component: <AdminSettingsPage />,
        };
      case '/admin':
      default:
        return {
          title: 'Admin Dashboard Overview',
          component: <AdminOverviewPage />,
        };
    }
  };

  const { title, component } = getSubRouteContent();

  return (
    <AdminGuard>
      <AdminLayout pageTitle={title}>
        {component}
      </AdminLayout>
    </AdminGuard>
  );
};
