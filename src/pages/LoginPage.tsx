import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { Link, useRouter } from '../context/RouterContext';
import { useAuth, formatAuthError } from '../context/AuthContext';
import { GoogleIcon } from '../components/GoogleIcon';

export const LoginPage: React.FC = () => {
  const { login, loginWithGoogle, isAuthenticated, loading: authLoading } = useAuth();
  const { navigate } = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // If already authenticated and not loading, redirect to dashboard
  React.useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please enter both your email address and password.');
      return;
    }

    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      setError(formatAuthError(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back to FreeMeet"
      subtitle="Sign in to your account to launch and manage meetings"
    >
      <div className="space-y-5">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Google Sign-in Button */}
        <button
          type="button"
          id="google-login-btn"
          onClick={handleGoogleLogin}
          disabled={googleLoading || loading}
          className="w-full py-3 px-4 bg-white hover:bg-[#f4f8f5] active:bg-[#e9f1eb] text-[#1a241b] border border-[#d1e0d4] font-semibold text-sm rounded-xl shadow-2xs transition-all flex items-center justify-center gap-3 disabled:opacity-60 cursor-pointer"
        >
          {googleLoading ? (
            <div className="w-4 h-4 border-2 border-[#528d5a] border-t-transparent rounded-full animate-spin" />
          ) : (
            <GoogleIcon className="w-5 h-5 flex-shrink-0" />
          )}
          <span>{googleLoading ? 'Signing in with Google...' : 'Continue with Google'}</span>
        </button>

        {/* Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#e2ede4]" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-3 text-[#8ca18f] font-medium tracking-wide">
              or sign in with email
            </span>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-xs font-bold text-[#2d3b2e] uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#8ca18f] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full pl-10 pr-4 py-3 bg-white border border-[#e2ede4] rounded-xl text-sm text-[#1a241b] placeholder:text-[#8ca18f] focus:outline-none focus:ring-2 focus:ring-[#528d5a]"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="login-password" className="block text-xs font-bold text-[#2d3b2e] uppercase tracking-wider">
                Password
              </label>
              <Link
                to="/forgot-password"
                id="login-forgot-password-link"
                className="text-xs font-semibold text-[#528d5a] hover:text-[#43754a]"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#8ca18f] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-white border border-[#e2ede4] rounded-xl text-sm text-[#1a241b] placeholder:text-[#8ca18f] focus:outline-none focus:ring-2 focus:ring-[#528d5a]"
              />
            </div>
          </div>

          <button
            type="submit"
            id="login-submit-btn"
            disabled={loading || googleLoading}
            className="w-full py-3.5 px-4 bg-[#528d5a] hover:bg-[#43754a] text-white font-bold text-sm rounded-xl shadow-sm shadow-[#528d5a]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {loading ? (
              <span>Logging in...</span>
            ) : (
              <>
                <span>Login with Email</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-[#e2ede4] text-center text-xs text-[#5a6b5c]">
          Don't have an account?{' '}
          <Link
            to="/signup"
            id="login-to-signup-link"
            className="font-bold text-[#528d5a] hover:text-[#43754a] hover:underline"
          >
            Create Account
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
};
