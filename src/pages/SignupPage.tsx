import React, { useState } from 'react';
import { Mail, Lock, User as UserIcon, ArrowRight, AlertCircle } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { Link, useRouter } from '../context/RouterContext';
import { useAuth, formatAuthError } from '../context/AuthContext';
import { GoogleIcon } from '../components/GoogleIcon';

export const SignupPage: React.FC = () => {
  const { signup, loginWithGoogle, isAuthenticated, loading: authLoading } = useAuth();
  const { navigate } = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // If already authenticated and not loading, redirect to dashboard
  React.useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!password) {
      setError('Please enter a password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter your password.');
      return;
    }
    if (!agreed) {
      setError('Please agree to the Terms of Service and Privacy Policy.');
      return;
    }

    setLoading(true);

    try {
      await signup(name, email, password);
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Google sign-up error:', err);
      setError(formatAuthError(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your FreeMeet account"
      subtitle="100% free video meetings. No credit card required."
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Google Sign-up Button */}
        <button
          type="button"
          id="google-signup-btn"
          onClick={handleGoogleSignup}
          disabled={googleLoading || loading}
          className="w-full py-3 px-4 bg-white hover:bg-[#f4f8f5] active:bg-[#e9f1eb] text-[#1a241b] border border-[#d1e0d4] font-semibold text-sm rounded-xl shadow-2xs transition-all flex items-center justify-center gap-3 disabled:opacity-60 cursor-pointer"
        >
          {googleLoading ? (
            <div className="w-4 h-4 border-2 border-[#528d5a] border-t-transparent rounded-full animate-spin" />
          ) : (
            <GoogleIcon className="w-5 h-5 flex-shrink-0" />
          )}
          <span>{googleLoading ? 'Signing up with Google...' : 'Continue with Google'}</span>
        </button>

        {/* Divider */}
        <div className="relative my-3">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#e2ede4]" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-3 text-[#8ca18f] font-medium tracking-wide">
              or sign up with email
            </span>
          </div>
        </div>

        <form onSubmit={handleSignup} className="space-y-3.5">
          <div>
            <label htmlFor="signup-name" className="block text-xs font-bold text-[#2d3b2e] uppercase tracking-wider mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-[#8ca18f] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="signup-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sarah Jenkins"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#e2ede4] rounded-xl text-sm text-[#1a241b] placeholder:text-[#8ca18f] focus:outline-none focus:ring-2 focus:ring-[#528d5a]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="signup-email" className="block text-xs font-bold text-[#2d3b2e] uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#8ca18f] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="signup-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sarah@example.com"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#e2ede4] rounded-xl text-sm text-[#1a241b] placeholder:text-[#8ca18f] focus:outline-none focus:ring-2 focus:ring-[#528d5a]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="signup-password" className="block text-xs font-bold text-[#2d3b2e] uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#8ca18f] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="signup-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#e2ede4] rounded-xl text-sm text-[#1a241b] placeholder:text-[#8ca18f] focus:outline-none focus:ring-2 focus:ring-[#528d5a]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="signup-confirm-password" className="block text-xs font-bold text-[#2d3b2e] uppercase tracking-wider mb-1.5">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#8ca18f] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="signup-confirm-password"
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#e2ede4] rounded-xl text-sm text-[#1a241b] placeholder:text-[#8ca18f] focus:outline-none focus:ring-2 focus:ring-[#528d5a]"
              />
            </div>
          </div>

          <div className="pt-1">
            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-[#5a6b5c] select-none">
              <input
                type="checkbox"
                id="signup-agree-terms"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 rounded border-[#cddfd0] text-[#528d5a] focus:ring-[#528d5a]"
              />
              <span>
                I agree to the{' '}
                <Link to="/terms" className="text-[#528d5a] font-semibold hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="text-[#528d5a] font-semibold hover:underline">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>
          </div>

          <button
            type="submit"
            id="signup-submit-btn"
            disabled={loading || googleLoading}
            className="w-full py-3.5 px-4 bg-[#528d5a] hover:bg-[#43754a] text-white font-bold text-sm rounded-xl shadow-sm shadow-[#528d5a]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60 mt-3 cursor-pointer"
          >
            {loading ? (
              <span>Creating account...</span>
            ) : (
              <>
                <span>Create Account with Email</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-3 border-t border-[#e2ede4] text-center text-xs text-[#5a6b5c]">
          Already have an account?{' '}
          <Link
            to="/login"
            id="signup-to-login-link"
            className="font-bold text-[#528d5a] hover:text-[#43754a] hover:underline"
          >
            Login
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
};
