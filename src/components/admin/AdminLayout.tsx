import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Video, 
  Activity, 
  History, 
  BarChart3, 
  Bell, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  ShieldCheck, 
  ArrowLeft,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { Link, useRouter } from '../../context/RouterContext';
import { useAuth } from '../../context/AuthContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { ADMIN_EMAIL } from './AdminGuard';

interface AdminLayoutProps {
  children: React.ReactNode;
  pageTitle: string;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, pageTitle }) => {
  const { currentPath, navigate } = useRouter();
  const { user, logout } = useAuth();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [activeMeetingsCount, setActiveMeetingsCount] = useState<number>(0);

  // Close drawer on path change
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [currentPath]);

  // Real-time listener for active meetings count across entire platform
  useEffect(() => {
    try {
      const q = query(
        collection(db, 'meetings'),
        where('status', '==', 'active')
      );
      const unsub = onSnapshot(q, (snap) => {
        setActiveMeetingsCount(snap.size);
      }, (err) => {
        console.warn('Active meetings count listener error:', err);
      });
      return () => unsub();
    } catch (e) {
      console.warn('Error setting up active meetings count listener:', e);
    }
  }, []);

  const navSections = [
    {
      label: 'Platform Overview',
      items: [
        { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
        { 
          name: 'Active Meetings', 
          path: '/admin/active-meetings', 
          icon: Activity,
          badge: activeMeetingsCount > 0 ? activeMeetingsCount : undefined,
          isLive: activeMeetingsCount > 0
        },
      ]
    },
    {
      label: 'Management',
      items: [
        { name: 'All Users', path: '/admin/users', icon: Users },
        { name: 'All Meetings', path: '/admin/meetings', icon: Video },
        { name: 'Meeting History', path: '/admin/history', icon: History },
      ]
    },
    {
      label: 'System & Reports',
      items: [
        { name: 'Analytics & Reports', path: '/admin/reports', icon: BarChart3 },
        { name: 'System Alerts', path: '/admin/notifications', icon: Bell },
        { name: 'Platform Settings', path: '/admin/settings', icon: Settings },
      ]
    }
  ];

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Admin logout error:', error);
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9f8] flex">
      {/* ========================================================================= */}
      {/* DESKTOP PERMANENT ADMIN SIDEBAR                                           */}
      {/* ========================================================================= */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 xl:w-72 bg-[#1a241b] text-white border-r border-[#263528] shrink-0 sticky top-0 h-screen z-30 shadow-md">
        {/* Admin Brand Header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-[#263528] bg-[#141d15]">
          <Link to="/admin" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-[#528d5a] flex items-center justify-center text-white shadow-xs shadow-[#528d5a]/30 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-tight">
                <span className="font-['Outfit'] font-extrabold text-base text-white tracking-tight">
                  FreeMeet
                </span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-[#528d5a]/30 text-[#85cb8e] border border-[#528d5a]/40">
                  Admin
                </span>
              </div>
              <span className="block text-[10px] text-[#8ca18f] font-mono leading-none mt-0.5">
                Control Center
              </span>
            </div>
          </Link>
        </div>

        {/* Switch to User Workspace Link */}
        <div className="p-4 pb-2">
          <Link
            to="/dashboard"
            id="admin-switch-to-user-workspace"
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-[#233125] hover:bg-[#2d3f30] text-[#85cb8e] font-semibold text-xs border border-[#3d5440] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go to User Workspace</span>
          </Link>
        </div>

        {/* Navigation Menus */}
        <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-5 scrollbar-thin">
          {navSections.map((section) => (
            <div key={section.label} className="space-y-1">
              <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#6a806d]">
                {section.label}
              </div>
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentPath === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    id={`admin-sidebar-nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs xl:text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-[#528d5a] text-white font-semibold shadow-xs'
                        : 'text-[#a1b8a4] hover:text-white hover:bg-[#233125]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#8ca18f]'}`} />
                      <span>{item.name}</span>
                    </div>
                    {item.badge !== undefined && (
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full flex items-center gap-1 ${
                        item.isLive 
                          ? 'bg-rose-500 text-white animate-pulse' 
                          : 'bg-[#2f4232] text-[#85cb8e]'
                      }`}>
                        {item.isLive && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Admin Footer & Logout */}
        <div className="p-3.5 border-t border-[#263528] bg-[#141d15]">
          <div className="flex items-center justify-between p-2 rounded-xl bg-[#1c261e] border border-[#2d3f30]">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-lg bg-[#2b3c2d] text-[#85cb8e] border border-[#3d5440] flex items-center justify-center text-xs font-bold font-mono shrink-0">
                AD
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white truncate font-['Outfit']">
                  Super Admin
                </div>
                <div className="text-[10px] text-[#8ca18f] truncate font-mono">
                  {ADMIN_EMAIL}
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              id="admin-sidebar-logout-btn"
              className="p-1.5 text-[#8ca18f] hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors shrink-0 ml-1 cursor-pointer"
              title="Sign Out"
              aria-label="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* MOBILE SLIDE-OUT ADMIN DRAWER                                             */}
      {/* ========================================================================= */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative w-72 max-w-[85vw] h-full bg-[#1a241b] text-white shadow-2xl z-10 flex flex-col select-none border-r border-[#263528] animate-in slide-in-from-left duration-200">
            {/* Header */}
            <div className="h-16 px-5 flex items-center justify-between border-b border-[#263528] bg-[#141d15]">
              <Link 
                to="/admin" 
                className="flex items-center gap-3"
                onClick={() => setMobileDrawerOpen(false)}
              >
                <div className="w-8 h-8 rounded-xl bg-[#528d5a] flex items-center justify-center text-white shadow-xs">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-['Outfit'] font-extrabold text-base text-white">
                    FreeMeet
                  </span>
                  <span className="block text-[9px] uppercase font-bold text-[#85cb8e] tracking-wider">
                    Admin Portal
                  </span>
                </div>
              </Link>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1.5 rounded-lg text-[#8ca18f] hover:text-white hover:bg-[#233125]"
                aria-label="Close admin sidebar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation List */}
            <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-4">
              {navSections.map((section) => (
                <div key={section.label} className="space-y-1">
                  <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#6a806d]">
                    {section.label}
                  </div>
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPath === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        id={`mobile-admin-sidebar-nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                        className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                          isActive
                            ? 'bg-[#528d5a] text-white font-semibold shadow-xs'
                            : 'text-[#a1b8a4] hover:text-white hover:bg-[#233125]'
                        }`}
                        onClick={() => setMobileDrawerOpen(false)}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#8ca18f]'}`} />
                          <span>{item.name}</span>
                        </div>
                        {item.badge !== undefined && (
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full flex items-center gap-1 ${
                            item.isLive 
                              ? 'bg-rose-500 text-white animate-pulse' 
                              : 'bg-[#2f4232] text-[#85cb8e]'
                          }`}>
                            {item.isLive && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              ))}

              <div className="pt-2 border-t border-[#263528]">
                <Link
                  to="/dashboard"
                  id="mobile-admin-drawer-switch-workspace"
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm text-[#a1b8a4] hover:text-white hover:bg-[#233125] transition-all"
                  onClick={() => setMobileDrawerOpen(false)}
                >
                  <div className="flex items-center gap-3">
                    <ArrowLeft className="w-4 h-4 text-[#8ca18f]" />
                    <span>User Workspace</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-[#5a6b5c]" />
                </Link>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3.5 border-t border-[#263528] bg-[#141d15]">
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#1c261e] border border-[#2d3f30]">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-lg bg-[#2b3c2d] text-[#85cb8e] border border-[#3d5440] flex items-center justify-center text-xs font-bold font-mono shrink-0">
                    AD
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white truncate font-['Outfit']">
                      Super Admin
                    </div>
                    <div className="text-[10px] text-[#8ca18f] truncate font-mono">
                      {ADMIN_EMAIL}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    handleLogout();
                  }}
                  id="mobile-admin-drawer-logout-btn"
                  className="p-1.5 text-[#8ca18f] hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors shrink-0 ml-1 cursor-pointer"
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
      {/* MAIN ADMIN CONTENT AREA                                                   */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 bg-white border-b border-[#e2ede4] shadow-xs">
          <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Mobile hamburger menu button */}
              <button
                onClick={() => setMobileDrawerOpen(true)}
                id="admin-mobile-drawer-toggle"
                className="lg:hidden p-2 -ml-1 rounded-xl text-[#5a6b5c] hover:text-[#1a241b] hover:bg-[#eff5f0] transition-colors"
                aria-label="Open admin navigation sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div>
                <h1 className="text-base sm:text-lg font-extrabold text-[#1a241b] font-['Outfit'] tracking-tight">
                  {pageTitle}
                </h1>
                <div className="text-[11px] text-[#8ca18f] font-medium hidden sm:block">
                  Control Center Management
                </div>
              </div>
            </div>

            {/* Right Status Indicator & Quick Switch */}
            <div className="flex items-center gap-2 sm:gap-3">
              {activeMeetingsCount > 0 && (
                <Link
                  to="/admin/active-meetings"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold hover:bg-rose-100 transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <span>{activeMeetingsCount} Live Meeting{activeMeetingsCount > 1 ? 's' : ''}</span>
                </Link>
              )}

              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#eff5f0] text-[#3d6e44] border border-[#cddfd0]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#528d5a] animate-pulse" />
                Live Sync
              </span>

              <Link
                to="/dashboard"
                id="admin-topbar-switch-workspace"
                className="px-3 py-1.5 rounded-xl bg-[#eff5f0] hover:bg-[#e2ede4] text-[#3d6e44] text-xs font-semibold flex items-center gap-1.5 transition-colors border border-[#cddfd0]"
                title="Back to User Workspace"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Workspace</span>
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
