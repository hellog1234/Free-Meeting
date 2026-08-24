import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Video, 
  PlusCircle, 
  LogIn, 
  Calendar, 
  History, 
  Users, 
  MessageSquare, 
  Bell, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  ShieldCheck,
  Plus,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { Link, useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ADMIN_EMAIL } from './admin/AdminGuard';

interface DashboardLayoutProps {
  children: React.ReactNode;
  pageTitle: string;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, pageTitle }) => {
  const { currentPath, navigate } = useRouter();
  const { user, firebaseUser, logout } = useAuth();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  const userEmail = (firebaseUser?.email || user?.email || '').toLowerCase().trim();
  const isAdmin = userEmail === ADMIN_EMAIL.toLowerCase().trim();

  // Close mobile drawer on path change
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [currentPath]);

  // Real-time unread notifications count from Firestore
  useEffect(() => {
    if (!user?.id) return;
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', user.id),
        where('read', '==', false)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setUnreadNotificationsCount(snapshot.size);
      }, (err) => {
        console.warn('Notifications listener warning:', err);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn('Error setting up notifications listener:', e);
    }
  }, [user?.id]);

  // Real-time unread chat messages count from Conversations
  useEffect(() => {
    if (!user?.id) return;
    try {
      const q = query(
        collection(db, 'conversations'),
        where('participantIds', 'array-contains', user.id)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        let totalUnread = 0;
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.unreadCounts && typeof data.unreadCounts[user.id] === 'number') {
            totalUnread += data.unreadCounts[user.id];
          }
        });
        setUnreadChatCount(totalUnread);
      }, (err) => {
        console.warn('Conversations unread listener warning:', err);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn('Error setting up chat unread listener:', e);
    }
  }, [user?.id]);

  const navSections = [
    {
      label: 'Main',
      items: [
        { name: 'Overview', path: '/dashboard', icon: LayoutDashboard },
        { name: 'New Meeting', path: '/dashboard/new-meeting', icon: PlusCircle },
        { name: 'Join Meeting', path: '/dashboard/join-meeting', icon: LogIn },
        { name: 'My Meetings', path: '/dashboard/meetings', icon: Calendar },
        { name: 'Meeting History', path: '/dashboard/history', icon: History },
      ]
    },
    {
      label: 'Collaborate',
      items: [
        { name: 'Contacts', path: '/dashboard/contacts', icon: Users },
        { 
          name: 'Chat & Messages', 
          path: '/dashboard/chat', 
          icon: MessageSquare,
          badge: unreadChatCount > 0 ? unreadChatCount : undefined
        },
        { 
          name: 'Notifications', 
          path: '/dashboard/notifications', 
          icon: Bell,
          badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined 
        },
      ]
    },
    {
      label: 'Account',
      items: [
        { name: 'Settings', path: '/dashboard/settings', icon: Settings },
      ]
    }
  ];

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      navigate('/login');
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'FM';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-[#f8f9f8] flex">
      {/* ========================================================================= */}
      {/* DESKTOP PERMANENT NAVIGATION SIDEBAR (AFTER LOGIN)                        */}
      {/* ========================================================================= */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 xl:w-72 bg-white border-r border-[#e2ede4] shrink-0 sticky top-0 h-screen z-30 shadow-xs">
        {/* Brand Header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-[#e2ede4]">
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-[#528d5a] flex items-center justify-center text-white shadow-xs shadow-[#528d5a]/25 group-hover:scale-105 transition-transform">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <span className="font-['Outfit'] font-extrabold text-lg text-[#1a241b] tracking-tight leading-tight block">
                FreeMeet
              </span>
              <span className="text-[10px] uppercase font-bold text-[#528d5a] tracking-wider leading-none block">
                Workspace
              </span>
            </div>
          </Link>
        </div>

        {/* Quick Launch Action Button */}
        <div className="p-4 pb-2">
          <Link
            to="/dashboard/new-meeting"
            id="sidebar-quick-start-meeting"
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-[#528d5a] hover:bg-[#43754a] active:bg-[#38623e] text-white font-semibold text-xs tracking-wide shadow-xs shadow-[#528d5a]/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Instant Meeting</span>
          </Link>
        </div>

        {/* Navigation Menus */}
        <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-5 scrollbar-thin">
          {navSections.map((section) => (
            <div key={section.label} className="space-y-1">
              <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#8ca18f]">
                {section.label}
              </div>
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentPath === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    id={`sidebar-nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs xl:text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-[#eff5f0] text-[#3d6e44] font-semibold border-l-3 border-[#528d5a] shadow-2xs'
                        : 'text-[#5a6b5c] hover:text-[#1a241b] hover:bg-[#eff5f0]/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-[#528d5a]' : 'text-[#8ca18f]'}`} />
                      <span>{item.name}</span>
                    </div>
                    {item.badge !== undefined && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-[#528d5a] text-white">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}

          {/* Admin link for Authorized Admins */}
          {isAdmin && (
            <div className="pt-2 border-t border-[#e2ede4]/80">
              <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#528d5a]">
                Administration
              </div>
              <Link
                to="/admin"
                id="sidebar-admin-portal-link"
                className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs xl:text-sm font-semibold bg-[#1a241b] text-white hover:bg-[#233125] transition-all shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-4 h-4 text-[#85cb8e]" />
                  <span>Admin Portal</span>
                </div>
                <span className="text-[10px] font-mono bg-[#528d5a]/40 text-[#85cb8e] px-1.5 py-0.5 rounded border border-[#528d5a]/50">
                  SUPER
                </span>
              </Link>
            </div>
          )}
        </nav>

        {/* User Card & Logout Bottom */}
        <div className="p-3.5 border-t border-[#e2ede4] bg-[#f8f9f8]">
          <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#e2ede4] shadow-2xs">
            <Link
              to="/dashboard/settings"
              id="sidebar-user-profile-btn"
              className="flex items-center gap-2.5 min-w-0 flex-1 hover:opacity-80 transition-opacity"
              title="Account Settings"
            >
              <div className="w-8 h-8 rounded-lg bg-[#eff5f0] text-[#3d6e44] border border-[#cddfd0] flex items-center justify-center text-xs font-bold font-mono shrink-0">
                {getInitials(user?.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-[#1a241b] truncate font-['Outfit']">
                  {user?.name || 'My Account'}
                </div>
                <div className="text-[10px] text-[#8ca18f] truncate font-mono">
                  {user?.email || 'user@freemeet.app'}
                </div>
              </div>
            </Link>
            <button
              onClick={handleLogout}
              id="sidebar-logout-btn"
              className="p-1.5 text-[#8ca18f] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0 ml-1 cursor-pointer"
              title="Sign Out"
              aria-label="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* MOBILE SLIDE-OUT SIDEBAR DRAWER (AFTER LOGIN)                             */}
      {/* ========================================================================= */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-[#1a241b]/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative w-72 max-w-[85vw] h-full bg-white shadow-2xl z-10 flex flex-col select-none animate-in slide-in-from-left duration-200">
            {/* Drawer Brand Header */}
            <div className="h-16 px-5 flex items-center justify-between border-b border-[#e2ede4]">
              <Link 
                to="/dashboard" 
                className="flex items-center gap-2.5"
                onClick={() => setMobileDrawerOpen(false)}
              >
                <div className="w-8 h-8 rounded-xl bg-[#528d5a] flex items-center justify-center text-white shadow-xs">
                  <Video className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-['Outfit'] font-extrabold text-base text-[#1a241b]">
                    FreeMeet
                  </span>
                  <span className="block text-[9px] uppercase font-bold text-[#528d5a] tracking-wider">
                    Workspace
                  </span>
                </div>
              </Link>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1.5 rounded-lg text-[#5a6b5c] hover:text-[#1a241b] hover:bg-[#eff5f0]"
                aria-label="Close sidebar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Navigation List */}
            <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-4">
              {navSections.map((section) => (
                <div key={section.label} className="space-y-1">
                  <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#8ca18f]">
                    {section.label}
                  </div>
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPath === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        id={`mobile-sidebar-nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                          isActive
                            ? 'bg-[#eff5f0] text-[#3d6e44] font-semibold border-l-3 border-[#528d5a]'
                            : 'text-[#5a6b5c] hover:text-[#1a241b] hover:bg-[#eff5f0]/70'
                        }`}
                        onClick={() => setMobileDrawerOpen(false)}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={`w-4 h-4 ${isActive ? 'text-[#528d5a]' : 'text-[#8ca18f]'}`} />
                          <span>{item.name}</span>
                        </div>
                        {item.badge !== undefined && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-[#528d5a] text-white">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              ))}

              {isAdmin && (
                <div className="pt-2">
                  <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#528d5a]">
                    Super Admin
                  </div>
                  <Link
                    to="/admin"
                    id="mobile-sidebar-admin-link"
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold bg-[#1a241b] text-white hover:bg-[#233125] transition-all shadow-xs"
                    onClick={() => setMobileDrawerOpen(false)}
                  >
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-4 h-4 text-[#85cb8e]" />
                      <span>Admin Portal</span>
                    </div>
                    <span className="text-[10px] font-mono bg-[#528d5a]/40 text-[#85cb8e] px-1.5 py-0.5 rounded border border-[#528d5a]/50">
                      SUPER
                    </span>
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Sidebar Footer */}
            <div className="p-3.5 border-t border-[#e2ede4] bg-[#f8f9f8]">
              <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#e2ede4] shadow-2xs">
                <Link
                  to="/dashboard/settings"
                  id="mobile-sidebar-profile-btn"
                  className="flex items-center gap-2.5 min-w-0 flex-1"
                  onClick={() => setMobileDrawerOpen(false)}
                >
                  <div className="w-8 h-8 rounded-lg bg-[#eff5f0] text-[#3d6e44] border border-[#cddfd0] flex items-center justify-center text-xs font-bold font-mono shrink-0">
                    {getInitials(user?.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-[#1a241b] truncate font-['Outfit']">
                      {user?.name || 'My Account'}
                    </div>
                    <div className="text-[10px] text-[#8ca18f] truncate font-mono">
                      {user?.email || 'user@freemeet.app'}
                    </div>
                  </div>
                </Link>
                <button
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    handleLogout();
                  }}
                  id="mobile-sidebar-logout-btn"
                  className="p-1.5 text-[#8ca18f] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0 ml-1 cursor-pointer"
                  title="Sign Out"
                  aria-label="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MAIN DASHBOARD CONTENT AREA                                               */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar for Workspace */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-[#e2ede4] shadow-xs">
          <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Mobile hamburger menu button */}
              <button
                onClick={() => setMobileDrawerOpen(true)}
                id="dashboard-mobile-menu-btn"
                className="lg:hidden p-2 -ml-1 rounded-xl text-[#5a6b5c] hover:text-[#1a241b] hover:bg-[#eff5f0] transition-colors"
                aria-label="Open navigation sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div>
                <h1 className="text-base sm:text-lg font-extrabold text-[#1a241b] font-['Outfit'] tracking-tight">
                  {pageTitle}
                </h1>
                <div className="text-[11px] text-[#8ca18f] font-medium hidden sm:block">
                  FreeMeet Workspace
                </div>
              </div>
            </div>

            {/* Right Top Header Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                to="/dashboard/notifications"
                id="header-notifications-btn"
                className="relative p-2 rounded-xl text-[#5a6b5c] hover:text-[#1a241b] hover:bg-[#eff5f0] transition-colors"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#528d5a] ring-2 ring-white" />
                )}
              </Link>

              <Link
                to="/dashboard/new-meeting"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#528d5a] rounded-xl hover:bg-[#43754a] transition-all shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </Link>

              <Link
                to="/dashboard/settings"
                className="flex items-center gap-2 pl-2 border-l border-[#e2ede4]"
              >
                <div className="w-8 h-8 rounded-xl bg-[#eff5f0] text-[#3d6e44] border border-[#cddfd0] flex items-center justify-center text-xs font-bold font-mono">
                  {getInitials(user?.name)}
                </div>
              </Link>
            </div>
          </div>
        </header>

        {/* View Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full">
          {children}
        </main>
      </div>
    </div>
  );
};
