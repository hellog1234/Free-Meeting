import React from 'react';
import { 
  UserPlus, 
  Link as LinkIcon, 
  Video, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight,
  Monitor,
  CheckCircle2,
  Clock,
  Layers
} from 'lucide-react';
import { Link } from '../context/RouterContext';

export const HowItWorksPage: React.FC = () => {
  const steps = [
    {
      num: '01',
      title: 'Sign Up in Seconds',
      description: 'Create your free account with just an email and password. No credit cards, trial periods, or billing forms required.',
      details: ['Instant email validation', 'Immediate workspace access', 'Zero payment information required']
    },
    {
      num: '02',
      title: 'Generate an Instant Meeting Room',
      description: 'Head to your FreeMeet dashboard and launch an instant room. A unique, secure room identifier is generated on demand.',
      details: ['Randomized cryptographic room IDs', 'One-click invite link copy', 'Configurable room entry settings']
    },
    {
      num: '03',
      title: 'Share the Link with Anyone',
      description: 'Send your room link via Slack, Teams, email, WhatsApp, or SMS. Anyone with the link can participate directly.',
      details: ['Guests do not need to register', 'Universal cross-platform link', 'No app store installation required']
    },
    {
      num: '04',
      title: 'Collaborate Without Friction',
      description: 'Enjoy crisp HD video, low-latency audio, screen sharing, and interactive room chat right in your browser.',
      details: ['Peer-to-peer media routing', 'No 40-minute abrupt limits', 'Automatic cleanup when room ends']
    }
  ];

  return (
    <div className="bg-[#f8f9f8] min-h-screen">
      {/* Hero Banner */}
      <section className="pt-16 pb-20 bg-gradient-to-b from-[#eff5f0] to-[#f8f9f8] border-b border-[#e2ede4]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#e3ece5] border border-[#cddfd0] text-[#3d6e44] text-xs sm:text-sm font-semibold mb-6">
            <Sparkles className="w-4 h-4 text-[#528d5a]" />
            <span>Effortless 4-Step Process</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#1a241b] tracking-tight font-['Outfit']">
            How FreeMeet Works
          </h1>
          <p className="mt-5 text-lg text-[#5a6b5c] max-w-2xl mx-auto">
            From registration to meeting in under 30 seconds. Here is how FreeMeet eliminates the hassle of video conferencing.
          </p>
        </div>
      </section>

      {/* Step by Step Timeline */}
      <section className="py-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-12">
          {steps.map((step, idx) => (
            <div 
              key={idx} 
              className="bg-white rounded-2xl border border-[#e2ede4] p-8 sm:p-10 shadow-xs flex flex-col md:flex-row gap-8 items-start relative overflow-hidden"
            >
              <div className="flex-shrink-0">
                <div className="w-16 h-16 rounded-2xl bg-[#528d5a] text-white font-extrabold text-2xl flex items-center justify-center font-['Outfit'] shadow-sm shadow-[#528d5a]/20">
                  {step.num}
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-[#1a241b] mb-3 font-['Outfit']">
                  {step.title}
                </h3>
                <p className="text-[#5a6b5c] text-base leading-relaxed mb-6">
                  {step.description}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-[#e2ede4]">
                  {step.details.map((detail, dIdx) => (
                    <div key={dIdx} className="flex items-center gap-2 text-xs text-[#5a6b5c] font-medium">
                      <CheckCircle2 className="w-4 h-4 text-[#528d5a] flex-shrink-0" />
                      <span>{detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Technical Architecture Overview */}
        <div className="mt-16 bg-[#1a241b] text-white rounded-3xl p-8 sm:p-12 shadow-xl border border-[#2d3b2e]">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#8ca18f] uppercase tracking-wider mb-2">
            <Layers className="w-4 h-4 text-[#528d5a]" />
            Under The Hood
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-['Outfit'] mb-4 text-white">
            Direct Peer-to-Peer Browser Media
          </h2>
          <p className="text-[#cfd8d0] text-sm sm:text-base leading-relaxed max-w-3xl">
            Instead of routing every audio packet through expensive corporate relay centers where calls can be inspected, FreeMeet uses standards-compliant WebRTC mesh technology. This ensures ultra-low latency, crisp audio quality, and zero server storage overhead.
          </p>
          <div className="mt-8 pt-8 border-t border-[#2d3b2e] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-[#8ca18f]">
              Ready to experience modern video meetings?
            </div>
            <Link
              to="/signup"
              id="how-it-works-signup-btn"
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
