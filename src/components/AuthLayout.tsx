import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from '../context/RouterContext';
import { Logo } from './Logo';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen bg-[#f8f9f8] text-[#2d3a2e] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative subtle light background shapes */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-[#eff5f0] to-transparent pointer-events-none -z-10" />
      
      {/* Top back button */}
      <div className="absolute top-6 left-6">
        <Link
          to="/"
          id="auth-back-home"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#5a6b5c] hover:text-[#528d5a] transition-colors bg-white px-4 py-2 rounded-full border border-[#e2ede4] shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to FreeMeet
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <div className="flex justify-center mb-5">
          <Logo />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1a241b] tracking-tight font-['Outfit']">
          {title}
        </h2>
        <p className="mt-2 text-sm text-[#5a6b5c]">
          {subtitle}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl shadow-[#528d5a]/5 rounded-3xl border border-[#e2ede4]">
          {children}
        </div>
      </div>

      <div className="mt-8 text-center text-xs text-[#8ca18f]">
        &copy; {new Date().getFullYear()} FreeMeet. 100% Free Video Meetings.
      </div>
    </div>
  );
};
