import React, { useState } from 'react';
import { Mail, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { Link, useRouter } from '../context/RouterContext';
import { useAuth, formatAuthError } from '../context/AuthContext';

export const ForgotPasswordPage: React.FC = () => {
  const { resetPassword, isAuthenticated, loading: authLoading } = useAuth();
  const { navigate } = useRouter();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If already authenticated and not loading, redirect to dashboard
  React.useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);

    try {
      await resetPassword(email);
      setSubmitted(true);
    } catch (err: any) {
      console.error('Password reset error:', err);
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your email to receive password reset instructions"
    >
      {submitted ? (
        <div className="text-center py-4">
          <div className="w-12 h-12 bg-[#eff5f0] text-[#528d5a] rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-[#1a241b] font-['Outfit']">Reset Link Sent</h3>
          <p className="text-xs text-[#5a6b5c] mt-2 leading-relaxed">
            If an account exists for <span className="font-semibold text-[#1a241b]">{email}</span>, you will receive password reset instructions shortly.
          </p>
          <div className="mt-6 pt-4 border-t border-[#e2ede4]">
            <Link
              to="/login"
              id="forgot-password-return-login-btn"
              className="inline-flex items-center gap-2 text-xs font-bold text-[#528d5a] hover:underline"
            >
              Return to Login
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label htmlFor="forgot-email" className="block text-xs font-bold text-[#2d3b2e] uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#8ca18f] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="forgot-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full pl-10 pr-4 py-3 bg-white border border-[#e2ede4] rounded-xl text-sm text-[#1a241b] placeholder:text-[#8ca18f] focus:outline-none focus:ring-2 focus:ring-[#528d5a]"
              />
            </div>
          </div>

          <button
            type="submit"
            id="forgot-submit-btn"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-[#528d5a] hover:bg-[#43754a] text-white font-bold text-sm rounded-xl shadow-sm shadow-[#528d5a]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {loading ? (
              <span>Sending instructions...</span>
            ) : (
              <>
                <span>Send Reset Link</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="pt-4 border-t border-[#e2ede4] text-center text-xs text-[#5a6b5c]">
            Remembered your password?{' '}
            <Link
              to="/login"
              id="forgot-back-to-login"
              className="font-bold text-[#528d5a] hover:text-[#43754a] hover:underline"
            >
              Login
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
};
