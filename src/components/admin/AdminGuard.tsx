import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from '../../context/RouterContext';
import { ShieldAlert, ShieldCheck, Lock, ArrowRight, Video } from 'lucide-react';

export const ADMIN_EMAIL = 'behindyou358@gmail.com';

interface AdminGuardProps {
  children: React.ReactNode;
}

export const AdminGuard: React.FC<AdminGuardProps> = ({ children }) => {
  const { user, firebaseUser, isAuthenticated, loading } = useAuth();
  const { navigate } = useRouter();
  const [accessDenied, setAccessDenied] = useState(false);

  const userEmail = (firebaseUser?.email || user?.email || '').toLowerCase().trim();
  const isAdmin = isAuthenticated && userEmail === ADMIN_EMAIL.toLowerCase().trim();

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!isAdmin) {
      setAccessDenied(true);
      const timer = setTimeout(() => {
        navigate('/dashboard');
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [loading, isAuthenticated, isAdmin, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#141b15] text-white flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#528d5a] flex items-center justify-center text-white shadow-lg shadow-[#528d5a]/20 animate-pulse">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#528d5a] animate-ping" />
            <span className="text-sm font-medium text-[#8ca18f] font-['Outfit']">
              Verifying Administrative Security Credentials...
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (accessDenied || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#141b15] text-white flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#1c261e] border border-rose-500/30 rounded-3xl p-8 text-center space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold font-['Outfit'] text-white">
              Access Restricted
            </h2>
            <p className="text-xs text-[#8ca18f] leading-relaxed">
              The Admin Portal is strictly restricted to authorized administrators (<span className="text-rose-300 font-mono font-semibold">{ADMIN_EMAIL}</span>). Your account (<span className="text-white/80 font-mono">{userEmail || 'Unauthenticated'}</span>) does not have access permissions.
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="w-full py-3 px-4 rounded-xl bg-[#528d5a] hover:bg-[#437549] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
            >
              <span>Return to User Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[11px] text-[#5a6b5c]">
            Redirecting to user workspace in 2 seconds...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
