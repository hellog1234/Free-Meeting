import React, { useState } from 'react';
import { 
  Video, 
  ShieldCheck, 
  Sparkles, 
  Zap, 
  Users, 
  MonitorUp, 
  Lock, 
  ChevronRight, 
  CheckCircle2, 
  ArrowRight, 
  Globe, 
  MessageSquare, 
  Sliders, 
  Plus, 
  Minus,
  Laptop,
  Check,
  Mic,
  Camera,
  Share2,
  PhoneOff,
  Smile
} from 'lucide-react';
import { Link } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import meetingRoomPreviewImg from '../assets/images/meeting_room_preview_1787399121434.jpg';

export const HomePage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const homeFaqs = [
    {
      q: 'Is FreeMeet truly 100% free with no hidden limits?',
      a: 'Yes, completely free. There are no credit card requirements, no 40-minute time cuts, no paywalls, and no locked features. We believe peer-to-peer communication tools should be accessible to everyone worldwide.',
    },
    {
      q: 'Do I or my guests need to download any apps or browser extensions?',
      a: 'Not at all. FreeMeet runs 100% natively in any modern browser (Chrome, Firefox, Safari, Edge, Brave) on desktop, tablets, and mobile devices without requiring any downloads.',
    },
    {
      q: 'How many participants can join a meeting?',
      a: 'FreeMeet supports fluid group meetings optimized for high quality audio and crystal-clear HD video with ultra-low latency direct browser streaming.',
    },
    {
      q: 'How does FreeMeet protect my privacy and meeting security?',
      a: 'FreeMeet uses peer-to-peer encrypted WebRTC media streams. Your video, audio, and screen sharing go directly between participants without being recorded, analyzed, or stored on our servers.',
    },
    {
      q: 'Can I share my screen and chat during a call?',
      a: 'Yes! Instant HD screen sharing with audio, live room chat, participant controls, and instant link invites are all built right into the browser meeting room.',
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#f8f9f8] text-[#2d3a2e]">
      {/* 1. HERO SECTION */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden bg-gradient-to-b from-[#eff5f0]/80 via-[#f8f9f8] to-[#f8f9f8] border-b border-[#e2ede4]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#eff5f0] border border-[#d1e0d4] text-[#4b7f52] text-xs sm:text-sm font-bold uppercase tracking-wider mb-6 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-[#4b7f52] animate-pulse"></span>
            <span>Free Forever • Browser-Based Video Meetings</span>
          </div>

          {/* Hero Heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-[#1a241b] tracking-tight leading-[1.1] max-w-4xl mx-auto font-['Outfit']">
            Simple Video Meetings. <span className="text-[#528d5a]">Completely Free.</span>
          </h1>

          {/* Hero Subtitle */}
          <p className="mt-6 text-lg sm:text-xl text-[#5a6b5c] max-w-2xl mx-auto leading-relaxed font-normal">
            Meet, talk and collaborate directly from your browser. No subscriptions and no complicated setup. Built for speed, privacy, and accessibility.
          </p>

          {/* Hero Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                id="hero-cta-dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-bold text-white bg-[#528d5a] hover:bg-[#43754a] active:bg-[#38623e] rounded-full shadow-xl shadow-[#528d5a]/25 transition-all hover:scale-[1.01]"
              >
                Go to Dashboard
                <ArrowRight className="w-5 h-5" />
              </Link>
            ) : (
              <>
                <Link
                  to="/signup"
                  id="hero-cta-create-account"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-bold text-white bg-[#528d5a] hover:bg-[#43754a] active:bg-[#38623e] rounded-full shadow-xl shadow-[#528d5a]/25 transition-all hover:scale-[1.01]"
                >
                  Create Account
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  to="/login"
                  id="hero-cta-login"
                  className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 text-base font-bold text-[#5a6b5c] bg-white hover:bg-[#eff5f0] border border-[#e2ede4] rounded-full shadow-xs transition-colors"
                >
                  Login
                </Link>
              </>
            )}
          </div>

          {/* Hero Proof Stats / Checkpoints */}
          <div className="mt-12 pt-8 border-t border-[#e2ede4] max-w-3xl mx-auto flex flex-wrap items-center justify-center gap-6 sm:gap-12">
            <div className="flex flex-col items-center">
              <span className="text-2xl sm:text-3xl font-bold text-[#1a241b]">100%</span>
              <span className="text-xs text-[#8ca18f] uppercase tracking-widest font-semibold mt-1">Browser Based</span>
            </div>
            <div className="hidden sm:block w-px h-10 bg-[#e2ede4]"></div>
            <div className="flex flex-col items-center">
              <span className="text-2xl sm:text-3xl font-bold text-[#1a241b]">Secure</span>
              <span className="text-xs text-[#8ca18f] uppercase tracking-widest font-semibold mt-1">End-to-End</span>
            </div>
            <div className="hidden sm:block w-px h-10 bg-[#e2ede4]"></div>
            <div className="flex flex-col items-center">
              <span className="text-2xl sm:text-3xl font-bold text-[#1a241b]">Unlimited</span>
              <span className="text-xs text-[#8ca18f] uppercase tracking-widest font-semibold mt-1">Meeting Length</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. REAL MEETING ROOM PREVIEW */}
      <section className="py-16 md:py-24 bg-white border-b border-[#e2ede4]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1a241b] tracking-tight font-['Outfit']">
              Live Video Meeting Experience
            </h2>
            <p className="mt-3 text-base sm:text-lg text-[#5a6b5c]">
              Crystal-clear video conferencing, fluid screen sharing, and instant chat right in your web browser.
            </p>
          </div>

          {/* Visual Browser Mockup with Real Meeting Preview */}
          <div className="relative mx-auto max-w-5xl rounded-[32px] sm:rounded-[40px] border border-[#e2ede4] bg-white p-3 sm:p-5 shadow-2xl shadow-[#528d5a]/10 overflow-hidden">
            {/* Mock browser top bar */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#f8f9f8] rounded-2xl mb-3 text-xs text-[#5a6b5c] border border-[#e2ede4]">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#ff605c]" />
                <div className="w-3 h-3 rounded-full bg-[#ffbd44]" />
                <div className="w-3 h-3 rounded-full bg-[#00ca4e]" />
              </div>
              <div className="px-4 py-1.5 rounded-full bg-[#f3f7f4] text-[#5a6b5c] font-medium text-[11px] flex items-center gap-2 border border-[#e2ede4]">
                <Lock className="w-3.5 h-3.5 text-[#528d5a]" />
                <span>freemeet.app/meeting/sync-892</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-semibold text-[#528d5a]">
                <span className="w-2 h-2 rounded-full bg-[#528d5a] animate-pulse"></span>
                <span>Live Call (1080p HD)</span>
              </div>
            </div>

            {/* Meeting Room Image & Visual Frame */}
            <div className="relative rounded-2xl overflow-hidden border border-[#e2ede4] bg-[#111912] shadow-inner group">
              <img
                src={meetingRoomPreviewImg}
                alt="FreeMeet live video meeting interface with participants on video grid"
                referrerPolicy="no-referrer"
                className="w-full h-auto object-cover max-h-[540px] transition-transform duration-500 group-hover:scale-[1.01]"
              />

              {/* Floating in-call badges */}
              <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2">
                <div className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-2 border border-white/10">
                  <Video className="w-3.5 h-3.5 text-[#528d5a]" />
                  <span>FreeMeet HD • 4 Participants</span>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#528d5a]/90 backdrop-blur-md text-white text-xs font-medium border border-white/20">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>P2P Encrypted</span>
                </div>
              </div>

              {/* Floating Bottom Bar Mock */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 sm:gap-3 px-4 py-2 rounded-full bg-black/75 backdrop-blur-md border border-white/15 shadow-2xl">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors">
                  <Mic className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                </div>
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors">
                  <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                </div>
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors">
                  <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors">
                  <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors">
                  <Smile className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center transition-colors">
                  <PhoneOff className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>
            </div>

            {/* In-Call Feature Highlights */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#f8f9f8] border border-[#e2ede4] flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#eff5f0] text-[#528d5a] flex items-center justify-center shrink-0">
                  <MonitorUp className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-[#1a241b]">Screen Sharing</div>
                  <div className="text-[11px] text-[#5a6b5c]">1080p HD with audio</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#f8f9f8] border border-[#e2ede4] flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#eff5f0] text-[#528d5a] flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-[#1a241b]">Room Chat</div>
                  <div className="text-[11px] text-[#5a6b5c]">Real-time messaging</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#f8f9f8] border border-[#e2ede4] flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#eff5f0] text-[#4b7f52] flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-[#1a241b]">P2P Security</div>
                  <div className="text-[11px] text-[#5a6b5c]">Direct encrypted media</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#f8f9f8] border border-[#e2ede4] flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#eff5f0] text-[#528d5a] flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-[#1a241b]">Zero Latency</div>
                  <div className="text-[11px] text-[#5a6b5c]">Ultra-fast WebRTC</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. POWERFUL FEATURES */}
      <section className="py-16 md:py-24 bg-[#f8f9f8] border-b border-[#e2ede4]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1a241b] tracking-tight font-['Outfit']">
              Powerful Features
            </h2>
            <p className="mt-3 text-base sm:text-lg text-[#5a6b5c]">
              Everything you need for seamless video collaboration, without the enterprise bloat.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Feature 1 */}
            <div className="bg-white p-7 rounded-2xl border border-[#e2ede4] shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-[#eff5f0] text-[#528d5a] flex items-center justify-center mb-5 border border-[#d1e0d4]">
                <Video className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-[#1a241b] mb-2 font-['Outfit']">Crystal-Clear HD Video</h3>
              <p className="text-[#5a6b5c] text-sm leading-relaxed">
                Adaptive high-definition video that dynamically adjusts to your connection for seamless video and crystal-clear audio.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-7 rounded-2xl border border-[#e2ede4] shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-[#eff5f0] text-[#4b7f52] flex items-center justify-center mb-5 border border-[#d1e0d4]">
                <MonitorUp className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-[#1a241b] mb-2 font-['Outfit']">Instant Screen Sharing</h3>
              <p className="text-[#5a6b5c] text-sm leading-relaxed">
                Share your entire screen, an application window, or a specific browser tab with crystal clarity and synchronized system audio.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-7 rounded-2xl border border-[#e2ede4] shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-[#eff5f0] text-[#528d5a] flex items-center justify-center mb-5 border border-[#d1e0d4]">
                <Globe className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-[#1a241b] mb-2 font-['Outfit']">100% Browser Native</h3>
              <p className="text-[#5a6b5c] text-sm leading-relaxed">
                No software installs, no desktop background daemons, and no mandatory app updates. Click the link and connect instantly.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white p-7 rounded-2xl border border-[#e2ede4] shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-[#eff5f0] text-[#4b7f52] flex items-center justify-center mb-5 border border-[#d1e0d4]">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-[#1a241b] mb-2 font-['Outfit']">P2P Privacy &amp; Security</h3>
              <p className="text-[#5a6b5c] text-sm leading-relaxed">
                Direct peer-to-peer data channels keep your communications strictly private. We never record, sell, or inspect your calls.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white p-7 rounded-2xl border border-[#e2ede4] shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-[#eff5f0] text-[#528d5a] flex items-center justify-center mb-5 border border-[#d1e0d4]">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-[#1a241b] mb-2 font-['Outfit']">In-Meeting Text Chat</h3>
              <p className="text-[#5a6b5c] text-sm leading-relaxed">
                Send messages, share links, and interact with all participants directly inside the active meeting room without interruption.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white p-7 rounded-2xl border border-[#e2ede4] shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-[#eff5f0] text-[#4b7f52] flex items-center justify-center mb-5 border border-[#d1e0d4]">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-[#1a241b] mb-2 font-['Outfit']">Ultra-Low Latency</h3>
              <p className="text-[#5a6b5c] text-sm leading-relaxed">
                High-speed media transport ensures minimal delay, eliminating awkward cross-talk and lag during fast-paced conversations.
              </p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link
              to="/features"
              id="features-explore-more-btn"
              className="inline-flex items-center gap-2 text-sm font-bold text-[#528d5a] hover:text-[#43754a] hover:gap-2.5 transition-all"
            >
              Explore All Features &amp; Capabilities
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS */}
      <section className="py-16 md:py-24 bg-white border-b border-[#e2ede4]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1a241b] tracking-tight font-['Outfit']">
              How It Works
            </h2>
            <p className="mt-3 text-base sm:text-lg text-[#5a6b5c]">
              Start or join a video meeting in three simple steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="relative bg-[#f8f9f8] p-8 rounded-2xl border border-[#e2ede4]">
              <div className="w-10 h-10 rounded-full bg-[#528d5a] text-white font-bold flex items-center justify-center mb-5 shadow-xs font-['Outfit']">
                1
              </div>
              <h3 className="text-xl font-bold text-[#1a241b] mb-2 font-['Outfit']">Create an Account</h3>
              <p className="text-[#5a6b5c] text-sm leading-relaxed">
                Sign up in 5 seconds with your email. No credit card or billing information is ever required.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative bg-[#f8f9f8] p-8 rounded-2xl border border-[#e2ede4]">
              <div className="w-10 h-10 rounded-full bg-[#528d5a] text-white font-bold flex items-center justify-center mb-5 shadow-xs font-['Outfit']">
                2
              </div>
              <h3 className="text-xl font-bold text-[#1a241b] mb-2 font-['Outfit']">Share Meeting Link</h3>
              <p className="text-[#5a6b5c] text-sm leading-relaxed">
                Generate a secure room link with one click and share it with your team, clients, or friends.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative bg-[#f8f9f8] p-8 rounded-2xl border border-[#e2ede4]">
              <div className="w-10 h-10 rounded-full bg-[#528d5a] text-white font-bold flex items-center justify-center mb-5 shadow-xs font-['Outfit']">
                3
              </div>
              <h3 className="text-xl font-bold text-[#1a241b] mb-2 font-['Outfit']">Meet in Browser</h3>
              <p className="text-[#5a6b5c] text-sm leading-relaxed">
                Participants click the link and join immediately. Talk, share screens, and collaborate with zero friction.
              </p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link
              to="/how-it-works"
              id="how-it-works-learn-more-btn"
              className="inline-flex items-center gap-2 text-sm font-bold text-[#528d5a] hover:text-[#43754a] hover:gap-2.5 transition-all"
            >
              Learn more about our connection architecture
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 5. SECURITY & PRIVACY */}
      <section className="py-16 md:py-24 bg-[#f8f9f8] border-b border-[#e2ede4]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#eff5f0] border border-[#d1e0d4] text-[#4b7f52] text-xs font-semibold mb-4">
                <ShieldCheck className="w-4 h-4 text-[#4b7f52]" />
                Privacy By Design
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1a241b] tracking-tight font-['Outfit']">
                Security &amp; Privacy You Can Trust
              </h2>
              <p className="mt-4 text-[#5a6b5c] text-base leading-relaxed">
                Unlike corporate meeting software that profiles participants and monetizes meeting telemetry, FreeMeet is built with strict privacy principles.
              </p>

              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-6 h-6 rounded-full bg-[#eff5f0] text-[#528d5a] flex items-center justify-center flex-shrink-0 mt-0.5 border border-[#d1e0d4]">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#1a241b] text-sm">Direct Peer-to-Peer Encryption</h4>
                    <p className="text-[#5a6b5c] text-xs sm:text-sm mt-0.5">Media streams travel directly between clients using industry-standard DTLS-SRTP encryption.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-6 h-6 rounded-full bg-[#eff5f0] text-[#528d5a] flex items-center justify-center flex-shrink-0 mt-0.5 border border-[#d1e0d4]">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#1a241b] text-sm">Zero Call Recording on Servers</h4>
                    <p className="text-[#5a6b5c] text-xs sm:text-sm mt-0.5">We don’t store audio, video, or chat transcripts on central servers.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-6 h-6 rounded-full bg-[#eff5f0] text-[#528d5a] flex items-center justify-center flex-shrink-0 mt-0.5 border border-[#d1e0d4]">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#1a241b] text-sm">No Advertising or Tracking Pixels</h4>
                    <p className="text-[#5a6b5c] text-xs sm:text-sm mt-0.5">Your identity, meetings, and contact connections are never sold or shared.</p>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <Link
                  to="/security"
                  id="home-security-details-btn"
                  className="inline-flex items-center gap-2 text-sm font-bold text-[#528d5a] hover:text-[#43754a]"
                >
                  Read our full Security Whitepaper
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Right Card */}
            <div className="bg-white p-8 rounded-3xl border border-[#e2ede4] shadow-sm">
              <h3 className="text-xl font-bold text-[#1a241b] mb-4 font-['Outfit']">FreeMeet Security Checklist</h3>
              <div className="divide-y divide-[#e2ede4]">
                <div className="py-3.5 flex items-center justify-between text-sm">
                  <span className="text-[#2d3a2e] font-medium">WebRTC Encrypted Streams</span>
                  <span className="text-[#4b7f52] font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Enabled
                  </span>
                </div>
                <div className="py-3.5 flex items-center justify-between text-sm">
                  <span className="text-[#2d3a2e] font-medium">Guest Access Control</span>
                  <span className="text-[#4b7f52] font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Enabled
                  </span>
                </div>
                <div className="py-3.5 flex items-center justify-between text-sm">
                  <span className="text-[#2d3a2e] font-medium">Disposable Meeting Rooms</span>
                  <span className="text-[#4b7f52] font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Enabled
                  </span>
                </div>
                <div className="py-3.5 flex items-center justify-between text-sm">
                  <span className="text-[#2d3a2e] font-medium">GDPR &amp; CCPA Compliant</span>
                  <span className="text-[#4b7f52] font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Compliant
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FREE FOREVER */}
      <section className="py-16 md:py-24 bg-white border-b border-[#e2ede4]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-[#528d5a] to-[#3a6841] rounded-3xl p-8 sm:p-12 lg:p-16 text-white shadow-xl shadow-[#528d5a]/20">
            <div className="max-w-3xl">
              <span className="inline-block px-3.5 py-1 rounded-full bg-white/20 text-white text-xs font-semibold uppercase tracking-wider mb-4">
                Our Guarantee
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight font-['Outfit'] leading-tight">
                Free Forever. No Credit Card. No Time Limits.
              </h2>
              <p className="mt-4 text-[#e2ede4] text-base sm:text-lg leading-relaxed">
                Why pay $15–$25 per user per month for video meetings? FreeMeet leverages modern browser capabilities to eliminate heavy server transcoding costs, allowing us to keep video calls free for everyone, forever.
              </p>

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-white/20 text-left">
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold font-['Outfit']">$0 / month</div>
                  <div className="text-xs text-[#d1e0d4] mt-1">100% Free for individuals and teams</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold font-['Outfit']">Unlimited</div>
                  <div className="text-xs text-[#d1e0d4] mt-1">No 40-minute abrupt cutoffs</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold font-['Outfit']">0 Installs</div>
                  <div className="text-xs text-[#d1e0d4] mt-1">Runs directly in modern browsers</div>
                </div>
              </div>

              <div className="mt-10">
                <Link
                  to="/pricing"
                  id="free-forever-pricing-btn"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-white text-[#3a6841] font-bold text-sm hover:bg-[#eff5f0] transition-colors shadow-sm"
                >
                  View Full Free Forever Details
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FAQ */}
      <section className="py-16 md:py-24 bg-[#f8f9f8] border-b border-[#e2ede4]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1a241b] tracking-tight font-['Outfit']">
              Frequently Asked Questions
            </h2>
            <p className="mt-3 text-base sm:text-lg text-[#5a6b5c]">
              Got questions? We've got answers.
            </p>
          </div>

          <div className="space-y-4">
            {homeFaqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className="bg-white rounded-2xl border border-[#e2ede4] overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 focus:outline-none"
                    aria-expanded={isOpen}
                  >
                    <span className="font-bold text-[#1a241b] text-base sm:text-lg font-['Outfit']">
                      {faq.q}
                    </span>
                    <span className="p-1.5 rounded-xl bg-[#eff5f0] text-[#528d5a] flex-shrink-0">
                      {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 pt-1 text-[#5a6b5c] text-sm leading-relaxed border-t border-[#e2ede4]">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-8 text-center">
            <Link
              to="/faq"
              id="view-all-faqs-btn"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-[#528d5a] hover:text-[#43754a]"
            >
              View all frequently asked questions
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 8. FINAL CTA */}
      <section className="py-20 md:py-28 bg-white text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#1a241b] tracking-tight font-['Outfit']">
            Ready to start meeting for free?
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#5a6b5c] max-w-xl mx-auto">
            Join thousands of individuals and teams having hassle-free, browser-based video meetings today.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                id="final-cta-dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-bold text-white bg-[#528d5a] hover:bg-[#43754a] rounded-full shadow-lg shadow-[#528d5a]/25 transition-all"
              >
                Go to Dashboard
                <ArrowRight className="w-5 h-5" />
              </Link>
            ) : (
              <Link
                to="/signup"
                id="final-cta-create-account"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-bold text-white bg-[#528d5a] hover:bg-[#43754a] rounded-full shadow-lg shadow-[#528d5a]/25 transition-all"
              >
                Create Account
                <ArrowRight className="w-5 h-5" />
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
