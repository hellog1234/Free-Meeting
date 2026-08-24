import React, { useEffect, Suspense, lazy } from 'react';
import { RouterProvider, useRouter } from './context/RouterContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Video, Loader2 } from 'lucide-react';

// Core Page directly imported for instant First Contentful Paint
import { HomePage } from './pages/HomePage';

// Lazy-loaded secondary pages for ultra-fast initial bundle loading
const FeaturesPage = lazy(() => import('./pages/FeaturesPage').then(m => ({ default: m.FeaturesPage })));
const HowItWorksPage = lazy(() => import('./pages/HowItWorksPage').then(m => ({ default: m.HowItWorksPage })));
const SecurityPage = lazy(() => import('./pages/SecurityPage').then(m => ({ default: m.SecurityPage })));
const PricingPage = lazy(() => import('./pages/PricingPage').then(m => ({ default: m.PricingPage })));
const AboutPage = lazy(() => import('./pages/AboutPage').then(m => ({ default: m.AboutPage })));
const FaqPage = lazy(() => import('./pages/FaqPage').then(m => ({ default: m.FaqPage })));
const ContactPage = lazy(() => import('./pages/ContactPage').then(m => ({ default: m.ContactPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import('./pages/SignupPage').then(m => ({ default: m.SignupPage })));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const TermsPage = lazy(() => import('./pages/TermsPage').then(m => ({ default: m.TermsPage })));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage').then(m => ({ default: m.PrivacyPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const PreJoinMeetingPage = lazy(() => import('./pages/PreJoinMeetingPage').then(m => ({ default: m.PreJoinMeetingPage })));
const MeetingRoomPage = lazy(() => import('./pages/MeetingRoomPage').then(m => ({ default: m.MeetingRoomPage })));
const MeetingEndedPage = lazy(() => import('./pages/MeetingEndedPage').then(m => ({ default: m.MeetingEndedPage })));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })));

// Fast Micro Loader for subpage transitions
const PageLoadingFallback: React.FC = () => (
  <div className="min-h-[50vh] flex flex-col items-center justify-center p-8">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 rounded-2xl bg-[#528d5a]/10 text-[#528d5a] flex items-center justify-center animate-pulse">
        <Loader2 className="w-5 h-5 animate-spin text-[#528d5a]" />
      </div>
      <span className="text-xs font-semibold text-[#5a6b5c] font-['Outfit']">Loading page...</span>
    </div>
  </div>
);

const AppContent: React.FC = () => {
  const { currentPath, navigate } = useRouter();
  const { isAuthenticated, loading } = useAuth();

  // Auth pages do NOT render the public Header/Footer
  const isAuthPage = ['/login', '/signup', '/forgot-password'].includes(currentPath);
  const isDashboardRoute = currentPath === '/dashboard' || currentPath.startsWith('/dashboard/');
  const isAdminRoute = currentPath === '/admin' || currentPath.startsWith('/admin/');
  const isMeetingRoute = currentPath.startsWith('/meeting/') || currentPath.startsWith('/room/');
  const isMeetingEndedRoute = currentPath === '/meeting-ended' || currentPath.startsWith('/meeting-ended');

  // Route guarding
  useEffect(() => {
    if (loading) return;

    if (isDashboardRoute && !isAuthenticated) {
      navigate('/login');
    } else if (isAuthPage && isAuthenticated) {
      navigate('/dashboard');
    }
  }, [loading, isAuthenticated, isDashboardRoute, isAuthPage, navigate]);

  // Loading Screen ONLY when attempting to access protected dashboard routes while checking auth
  if (loading && isDashboardRoute) {
    return (
      <div className="min-h-screen bg-[#f8f9f8] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#528d5a] flex items-center justify-center text-white shadow-sm shadow-[#528d5a]/20 animate-pulse">
            <Video className="w-6 h-6" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#528d5a] animate-ping" />
            <span className="text-sm font-medium text-[#5a6b5c] font-['Outfit']">Connecting to workspace...</span>
          </div>
        </div>
      </div>
    );
  }

  // Admin Dashboard routes
  if (isAdminRoute) {
    return (
      <Suspense fallback={<PageLoadingFallback />}>
        <AdminDashboardPage />
      </Suspense>
    );
  }

  // Guard render during transition
  if (isDashboardRoute) {
    if (isAuthenticated) {
      return (
        <Suspense fallback={<PageLoadingFallback />}>
          <DashboardPage />
        </Suspense>
      );
    }
    return (
      <main className="min-h-screen">
        <Suspense fallback={<PageLoadingFallback />}>
          <LoginPage />
        </Suspense>
      </main>
    );
  }

  if (isAuthPage && isAuthenticated) {
    return (
      <Suspense fallback={<PageLoadingFallback />}>
        <DashboardPage />
      </Suspense>
    );
  }

  // Route matching
  const renderCurrentPage = () => {
    switch (currentPath) {
      case '/':
        return <HomePage />;
      case '/features':
        return <FeaturesPage />;
      case '/how-it-works':
        return <HowItWorksPage />;
      case '/security':
        return <SecurityPage />;
      case '/pricing':
        return <PricingPage />;
      case '/about':
        return <AboutPage />;
      case '/faq':
        return <FaqPage />;
      case '/contact':
        return <ContactPage />;
      case '/login':
        return <LoginPage />;
      case '/signup':
        return <SignupPage />;
      case '/forgot-password':
        return <ForgotPasswordPage />;
      case '/terms':
        return <TermsPage />;
      case '/privacy':
        return <PrivacyPage />;
      default:
        // Default / Fallback to Home if unknown route
        return <HomePage />;
    }
  };

  if (isMeetingEndedRoute) {
    return (
      <Suspense fallback={<PageLoadingFallback />}>
        <MeetingEndedPage />
      </Suspense>
    );
  }

  if (isMeetingRoute) {
    // Extract meetingId from /meeting/:id/prejoin, /meeting/:id/ended, or /meeting/:id
    const parts = currentPath.split('/');
    const meetingId = parts[2] || 'adhoc';
    const subRoute = parts[3];

    if (subRoute === 'ended') {
      return (
        <Suspense fallback={<PageLoadingFallback />}>
          <MeetingEndedPage meetingId={meetingId} />
        </Suspense>
      );
    }
    if (subRoute === 'room') {
      return (
        <Suspense fallback={<PageLoadingFallback />}>
          <MeetingRoomPage meetingId={meetingId} />
        </Suspense>
      );
    }
    // Standard entry or /prejoin route directs to PreJoinMeetingPage first
    return (
      <Suspense fallback={<PageLoadingFallback />}>
        <PreJoinMeetingPage meetingId={meetingId} />
      </Suspense>
    );
  }

  if (isAuthPage) {
    return (
      <main className="min-h-screen">
        <Suspense fallback={<PageLoadingFallback />}>
          {renderCurrentPage()}
        </Suspense>
      </main>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#f8f9f8] text-[#2d3a2e] font-sans">
      <Header />
      <main className="flex-grow">
        <Suspense fallback={<PageLoadingFallback />}>
          {renderCurrentPage()}
        </Suspense>
      </main>
      <Footer />
    </div>
  );
};

export default function App() {
  return (
    <RouterProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </RouterProvider>
  );
}
