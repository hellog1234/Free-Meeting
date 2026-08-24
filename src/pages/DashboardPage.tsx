import React from 'react';
import { useRouter } from '../context/RouterContext';
import { DashboardLayout } from '../components/DashboardLayout';

// Subpages
import { DashboardHomePage } from './dashboard/DashboardHomePage';
import { NewMeetingPage } from './dashboard/NewMeetingPage';
import { JoinMeetingPage } from './dashboard/JoinMeetingPage';
import { MyMeetingsPage } from './dashboard/MyMeetingsPage';
import { HistoryPage } from './dashboard/HistoryPage';
import { ContactsPage } from './dashboard/ContactsPage';
import { ChatPage } from './dashboard/ChatPage';
import { NotificationsPage } from './dashboard/NotificationsPage';
import { SettingsPage } from './dashboard/SettingsPage';

export const DashboardPage: React.FC = () => {
  const { currentPath } = useRouter();

  const getPageInfo = () => {
    switch (currentPath) {
      case '/dashboard/new-meeting':
        return {
          title: 'New Meeting',
          component: <NewMeetingPage />,
        };
      case '/dashboard/join-meeting':
        return {
          title: 'Join Meeting',
          component: <JoinMeetingPage />,
        };
      case '/dashboard/meetings':
        return {
          title: 'My Meetings',
          component: <MyMeetingsPage />,
        };
      case '/dashboard/history':
        return {
          title: 'Meeting History',
          component: <HistoryPage />,
        };
      case '/dashboard/contacts':
        return {
          title: 'Contacts',
          component: <ContactsPage />,
        };
      case '/dashboard/chat':
        return {
          title: 'Workspace Chat',
          component: <ChatPage />,
        };
      case '/dashboard/notifications':
        return {
          title: 'Notifications',
          component: <NotificationsPage />,
        };
      case '/dashboard/settings':
        return {
          title: 'Account Settings',
          component: <SettingsPage />,
        };
      case '/dashboard':
      default:
        return {
          title: 'Dashboard Overview',
          component: <DashboardHomePage />,
        };
    }
  };

  const { title, component } = getPageInfo();

  return (
    <DashboardLayout pageTitle={title}>
      {component}
    </DashboardLayout>
  );
};
