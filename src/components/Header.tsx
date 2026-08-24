import React, { useState, useEffect } from 'react';
import { 
  Menu, 
  X, 
  ArrowRight, 
  LayoutDashboard, 
  LogOut, 
  Sparkles, 
  HelpCircle, 
  ShieldCheck, 
  CreditCard, 
  Info, 
  PhoneCall, 
  LogIn, 
  UserPlus, 
  Video,
  ChevronRight 
} from 'lucide-react';
import { useRouter, Link } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Logo';

export const Header: React.FC = () => {
  const { currentPath, navigate } = useRouter();
  const { isAuthenticated, logout, user } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [currentPath]);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileSidebarOpen]);

  const navLinks = [
    { name: 'Features', href: '/features', icon: Sparkles },
    { name: 'How It Works', href: '/how-it-works', icon: HelpCircle },
    { name: 'Security', href: '/security', icon: ShieldCheck },
    { name: 'Pricing', href: '/pricing', icon: CreditCard },
    { name: 'About', href: '/about', icon: Info },
    { name: 'FAQ', href: '/faq', icon: HelpCircle },
    { name: 'Contact', href: '/contact', icon: PhoneCall },
  ];

  const isActive = (path: string) => currentPath === path;

  return (
    <>
      {/* ========================================================================= */}
      {/* TOP HEADER BAR                                                            */}
      {/* Desktop: Shows Logo + Full Horizontal Navigation Menu + Auth Buttons       */}
      {/* Mobile: Shows Logo + Hamburger Button (No menu bar, sidebar only)         */}
      {/* ========================================================================= */}
      <header
        id="main-header"
        className={`sticky top-0 z-40 transition-all duration-200 ${
          isScrolled
            ? 'bg-white/95 backdrop-blur-md border-b border-[#e2ede4] shadow-xs'
            : 'bg-white/90 backdrop-blur-md border-b border-[#e2ede4]'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-18">
            
            {/* Left: Brand Logo & Mobile Sidebar Trigger */}
            <div className="flex items-center gap-3">
              {/* Mobile Only: Hamburger button to trigger sidebar */}
              <button
                id="public-mobile-menu-toggle"
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                className="lg:hidden p-2 -ml-1 rounded-xl text-[#5a6b5c] hover:text-[#1a241b] hover:bg-[#eff5f0] transition-colors focus:outline-none focus:ring-2 focus:ring-[#528d5a]"
                aria-label="Open navigation sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="flex-shrink-0">
                <Logo />
              </div>
            </div>

            {/* =================================================================== */}
            {/* DESKTOP ONLY: Top Navigation Menu (Hidden on Mobile)                 */}
            {/* =================================================================== */}
            <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
              {navLinks.map((link) => {
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.name}
                    to={link.href}
                    id={`nav-link-${link.name.toLowerCase().replace(/\s+/g, '-')}`}
                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                      active
                        ? 'text-[#528d5a] bg-[#eff5f0] font-semibold'
                        : 'text-[#5a6b5c] hover:text-[#528d5a] hover:bg-[#eff5f0]'
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </nav>

            {/* =================================================================== */}
            {/* DESKTOP ONLY: Right Action Buttons (Hidden on Mobile)               */}
            {/* =================================================================== */}
            <div className="hidden lg:flex items-center gap-3">
              {isAuthenticated ? (
                <div className="flex items-center gap-2.5">
                  <Link
                    to="/dashboard"
                    id="header-dashboard-btn"
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#528d5a] rounded-xl hover:bg-[#43754a] active:bg-[#38623e] shadow-xs shadow-[#528d5a]/20 transition-colors"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </Link>
                  <button
                    id="header-logout-btn"
                    onClick={async () => {
                      await logout();
                      navigate('/login');
                    }}
                    className="p-2 text-[#5a6b5c] hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <Link
                    to="/login"
                    id="header-login-btn"
                    className="px-4 py-2 text-sm font-semibold text-[#3d6e44] hover:bg-[#eff5f0] rounded-xl transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    id="header-create-account-btn"
                    className="inline-flex items-center gap-1.5 px-4.5 py-2 text-sm font-semibold text-white bg-[#528d5a] rounded-xl hover:bg-[#43754a] active:bg-[#38623e] shadow-xs shadow-[#528d5a]/20 transition-all"
                  >
                    Create Account
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Quick Action on Top Bar */}
            {!isAuthenticated && (
              <div className="lg:hidden flex items-center">
                <Link
                  to="/login"
                  className="text-xs font-bold text-[#528d5a] bg-[#eff5f0] px-3 py-1.5 rounded-lg hover:bg-[#e2ede4] transition-colors"
                >
                  Login
                </Link>
              </div>
            )}

            {isAuthenticated && (
              <div className="lg:hidden flex items-center">
                <Link
                  to="/dashboard"
                  className="flex items-center gap-1 text-xs font-bold text-white bg-[#528d5a] px-3 py-1.5 rounded-lg shadow-2xs"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Workspace</span>
                </Link>
              </div>
            )}

          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MOBILE ONLY: Slide-out Sidebar Drawer (Before Login)                      */}
      {/* ========================================================================= */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Dark Backdrop */}
          <div 
            className="fixed inset-0 bg-[#1a241b]/50 backdrop-blur-xs transition-opacity duration-200"
            onClick={() => setMobileSidebarOpen(false)}
          />

          {/* Slide-out Sidebar Drawer Panel */}
          <div className="relative w-72 max-w-[85vw] h-full bg-white shadow-2xl z-10 flex flex-col select-none animate-in slide-in-from-left duration-200">
            {/* Sidebar Top Brand Header */}
            <div className="h-16 px-5 flex items-center justify-between border-b border-[#e2ede4]">
              <Link 
                to="/" 
                className="flex items-center gap-2.5"
                onClick={() => setMobileSidebarOpen(false)}
              >
                <div className="w-8 h-8 rounded-xl bg-[#528d5a] flex items-center justify-center text-white shadow-xs">
                  <Video className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-['Outfit'] font-extrabold text-base text-[#1a241b] tracking-tight">
                    FreeMeet
                  </span>
                  <span className="block text-[9px] uppercase font-bold text-[#528d5a] tracking-wider leading-none">
                    Video Platform
                  </span>
                </div>
              </Link>
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="p-1.5 rounded-lg text-[#5a6b5c] hover:text-[#1a241b] hover:bg-[#eff5f0]"
                aria-label="Close sidebar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sidebar Navigation Items */}
            <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-1">
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-[#8ca18f]">
                Menu & Explore
              </div>
              {navLinks.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    id={`mobile-sidebar-link-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      active
                        ? 'bg-[#eff5f0] text-[#3d6e44] font-semibold border-l-3 border-[#528d5a]'
                        : 'text-[#5a6b5c] hover:text-[#1a241b] hover:bg-[#eff5f0]/70'
                    }`}
                    onClick={() => setMobileSidebarOpen(false)}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${active ? 'text-[#528d5a]' : 'text-[#8ca18f]'}`} />
                      <span>{item.name}</span>
                    </div>
                    {active && <span className="w-1.5 h-1.5 rounded-full bg-[#528d5a]" />}
                  </Link>
                );
              })}
            </div>

            {/* Sidebar Bottom Actions (Login & Create Account) */}
            <div className="p-4 border-t border-[#e2ede4] bg-[#f8f9f8] space-y-2">
              {isAuthenticated ? (
                <div className="space-y-2">
                  <Link
                    to="/dashboard"
                    id="mobile-sidebar-dashboard-btn"
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-bold text-white bg-[#528d5a] rounded-xl hover:bg-[#43754a] shadow-xs"
                    onClick={() => setMobileSidebarOpen(false)}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Open Dashboard
                  </Link>
                  <button
                    onClick={async () => {
                      setMobileSidebarOpen(false);
                      await logout();
                      navigate('/login');
                    }}
                    id="mobile-sidebar-logout-btn"
                    className="flex items-center justify-center gap-2 w-full px-4 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Link
                    to="/login"
                    id="mobile-sidebar-login-btn"
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-bold text-[#3d6e44] bg-white border border-[#cddfd0] hover:bg-[#eff5f0] rounded-xl transition-colors shadow-2xs"
                    onClick={() => setMobileSidebarOpen(false)}
                  >
                    <LogIn className="w-4 h-4 text-[#528d5a]" />
                    Login to Account
                  </Link>
                  <Link
                    to="/signup"
                    id="mobile-sidebar-signup-btn"
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-bold text-white bg-[#528d5a] hover:bg-[#43754a] rounded-xl shadow-xs transition-colors"
                    onClick={() => setMobileSidebarOpen(false)}
                  >
                    <UserPlus className="w-4 h-4" />
                    Create Free Account
                  </Link>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
};
