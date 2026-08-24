import React from 'react';
import { 
  Heart, 
  Globe, 
  ShieldCheck, 
  Zap, 
  Users, 
  Sparkles,
  ArrowRight,
  Code
} from 'lucide-react';
import { Link } from '../context/RouterContext';

export const AboutPage: React.FC = () => {
  return (
    <div className="bg-[#f8f9f8] min-h-screen">
      {/* Hero Banner */}
      <section className="pt-16 pb-20 bg-gradient-to-b from-[#eff5f0] to-[#f8f9f8] border-b border-[#e2ede4]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#e3ece5] border border-[#cddfd0] text-[#3d6e44] text-xs sm:text-sm font-semibold mb-6">
            <Heart className="w-4 h-4 text-[#528d5a] fill-[#528d5a]" />
            <span>Our Mission &amp; Values</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#1a241b] tracking-tight font-['Outfit']">
            Democratizing Global Communication
          </h1>
          <p className="mt-5 text-lg text-[#5a6b5c] max-w-2xl mx-auto">
            We believe that talking face-to-face with colleagues, friends, and family online should be as simple and cost-free as opening a browser tab.
          </p>
        </div>
      </section>

      {/* Story & Philosophy */}
      <section className="py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl border border-[#e2ede4] p-8 sm:p-12 shadow-xs space-y-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1a241b] font-['Outfit'] mb-4">
              Why We Created FreeMeet
            </h2>
            <p className="text-[#5a6b5c] text-base leading-relaxed">
              In recent years, video conferencing has transformed from an optional business tool into a fundamental requirement for education, work, and staying in touch. Yet, the dominant platforms have turned this essential utility into high-friction software bloated with 40-minute abrupt disconnects, expensive recurring paywalls, mandatory application downloads, and intrusive privacy practices.
            </p>
            <p className="text-[#5a6b5c] text-base leading-relaxed mt-4">
              We asked a simple question: <span className="font-semibold text-[#1a241b]">Why should you need a $20/month subscription or a 200MB background application just to have a video conversation?</span>
            </p>
          </div>

          <div className="pt-8 border-t border-[#e2ede4] grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-[#eff5f0] border border-[#e2ede4]">
              <div className="w-10 h-10 rounded-xl bg-[#528d5a] text-white flex items-center justify-center mb-4">
                <Globe className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#1a241b] mb-1 font-['Outfit']">Frictionless Accessibility</h3>
              <p className="text-[#5a6b5c] text-sm leading-relaxed">
                Anyone on any device can join a meeting in seconds without downloading apps or navigating paywalls.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#eff5f0] border border-[#e2ede4]">
              <div className="w-10 h-10 rounded-xl bg-[#528d5a] text-white flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#1a241b] mb-1 font-['Outfit']">Privacy First</h3>
              <p className="text-[#5a6b5c] text-sm leading-relaxed">
                Peer-to-peer architecture means your video calls stay private between participants, never saved to our servers.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#eff5f0] border border-[#e2ede4]">
              <div className="w-10 h-10 rounded-xl bg-[#528d5a] text-white flex items-center justify-center mb-4">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#1a241b] mb-1 font-['Outfit']">Engineered For Speed</h3>
              <p className="text-[#5a6b5c] text-sm leading-relaxed">
                Lean, modern browser code loads instantly and maximizes battery life without hogging system resources.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#eff5f0] border border-[#e2ede4]">
              <div className="w-10 h-10 rounded-xl bg-[#528d5a] text-white flex items-center justify-center mb-4">
                <Heart className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#1a241b] mb-1 font-['Outfit']">Free For Good</h3>
              <p className="text-[#5a6b5c] text-sm leading-relaxed">
                Our lightweight architecture keeps infrastructure overhead minimal, guaranteeing free service forever.
              </p>
            </div>
          </div>

          <div className="pt-8 border-t border-[#e2ede4] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-[#1a241b] font-['Outfit']">Join the movement for free video meetings</h4>
              <p className="text-xs text-[#5a6b5c]">Create your account in under 30 seconds</p>
            </div>
            <Link
              to="/signup"
              id="about-cta-signup-btn"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#528d5a] hover:bg-[#43754a] text-white text-sm font-bold rounded-xl transition-colors shadow-xs"
            >
              Create Account
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
