import React from 'react';
import { 
  Video, 
  MonitorUp, 
  Lock, 
  MessageSquare, 
  Zap, 
  Users, 
  ShieldCheck, 
  Sparkles, 
  Smartphone, 
  Share2, 
  Volume2, 
  Sliders, 
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { Link } from '../context/RouterContext';

export const FeaturesPage: React.FC = () => {
  const featureList = [
    {
      icon: <Video className="w-6 h-6 text-[#528d5a]" />,
      title: 'HD Video & Crystal Audio',
      desc: 'Adaptive bandwidth optimization guarantees seamless framerates and clear audio even on varying connection speeds.',
      highlights: ['720p/1080p dynamic resolution', 'Automatic noise suppression', 'Echo cancellation']
    },
    {
      icon: <MonitorUp className="w-6 h-6 text-[#528d5a]" />,
      title: 'High-Res Screen Sharing',
      desc: 'Present slide decks, code editors, or browser tabs with zero quality degradation and integrated system audio playback.',
      highlights: ['Entire screen or single window', 'System audio capture', 'Low-latency presentation']
    },
    {
      icon: <Lock className="w-6 h-6 text-[#528d5a]" />,
      title: 'Peer-to-Peer Encryption',
      desc: 'Calls are encrypted in transit using DTLS-SRTP protocols directly between participants, ensuring total confidentiality.',
      highlights: ['No centralized recording', 'Zero telemetry mining', 'Encrypted WebRTC data channels']
    },
    {
      icon: <MessageSquare className="w-6 h-6 text-[#528d5a]" />,
      title: 'Real-Time In-Meeting Chat',
      desc: 'Exchange links, questions, code snippets, and messages without interrupting the active presenter or meeting flow.',
      highlights: ['Instant link detection', 'Room-wide broadcasts', 'Non-intrusive notification badges']
    },
    {
      icon: <Users className="w-6 h-6 text-[#528d5a]" />,
      title: 'Participant Management',
      desc: 'Intuitive host controls to manage meeting participants, toggle active speaker focus, and control room access.',
      highlights: ['Mute audio controls', 'Active speaker highlight', 'Grid & speaker layouts']
    },
    {
      icon: <Share2 className="w-6 h-6 text-[#528d5a]" />,
      title: 'Instant 1-Click Link Invites',
      desc: 'Invite anyone simply by sharing a custom room URL. Guests join with a single click in their browser.',
      highlights: ['No account required for guests', 'Customizable room names', 'Instant clipboard copying']
    },
    {
      icon: <Smartphone className="w-6 h-6 text-[#528d5a]" />,
      title: 'Universal Cross-Device Support',
      desc: 'Works across laptops, desktops, tablets, and smartphones without installing proprietary software.',
      highlights: ['iOS Safari & Android Chrome', 'Responsive touch controls', 'Zero app store friction']
    },
    {
      icon: <Zap className="w-6 h-6 text-[#528d5a]" />,
      title: 'Ultra-Lightweight Performance',
      desc: 'No heavy background processes eating your battery or CPU. FreeMeet uses native browser WebRTC primitives.',
      highlights: ['Minimal battery drain', 'Instant page load times', 'Low memory footprint']
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-[#528d5a]" />,
      title: 'Disposable Meeting Rooms',
      desc: 'Rooms exist only while participants are present. When the last user disconnects, the session state is completely wiped.',
      highlights: ['Ephemeral data lifecycle', 'Automatic room cleanup', 'No leftover logs']
    }
  ];

  return (
    <div className="bg-[#f8f9f8] min-h-screen">
      {/* Header Banner */}
      <section className="pt-16 pb-20 bg-gradient-to-b from-[#eff5f0] to-[#f8f9f8] border-b border-[#e2ede4]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#e3ece5] border border-[#cddfd0] text-[#3d6e44] text-xs sm:text-sm font-semibold mb-6">
            <Sparkles className="w-4 h-4 text-[#528d5a]" />
            <span>Everything Built For Modern Teams</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#1a241b] tracking-tight font-['Outfit']">
            Features Built For Effortless Collaboration
          </h1>
          <p className="mt-5 text-lg text-[#5a6b5c] max-w-2xl mx-auto">
            Discover all the powerful capabilities engineered into FreeMeet to provide frictionless, browser-first video conferencing.
          </p>
        </div>
      </section>

      {/* Grid of Features */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featureList.map((f, i) => (
            <div key={i} className="bg-white p-8 rounded-2xl border border-[#e2ede4] shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#eff5f0] border border-[#e2ede4] flex items-center justify-center mb-6">
                  {f.icon}
                </div>
                <h3 className="text-xl font-bold text-[#1a241b] mb-3 font-['Outfit']">{f.title}</h3>
                <p className="text-[#5a6b5c] text-sm leading-relaxed mb-6">{f.desc}</p>
              </div>
              <div className="pt-4 border-t border-[#e2ede4] space-y-2">
                {f.highlights.map((h, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-[#5a6b5c] font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#528d5a] flex-shrink-0" />
                    <span>{h}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Feature comparison banner */}
        <div className="mt-20 bg-white rounded-3xl border border-[#e2ede4] p-8 sm:p-12 shadow-xs">
          <div className="max-w-3xl">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1a241b] font-['Outfit']">
              Why Browser-First Video Matters
            </h2>
            <p className="mt-3 text-[#5a6b5c] text-sm sm:text-base leading-relaxed">
              Traditional meeting software requires bulky 150MB+ desktop clients that run background update services and collect invasive user metrics. FreeMeet eliminates the client layer entirely by harnessing standard browser APIs for secure real-time audio and video.
            </p>
            <div className="mt-8">
              <Link
                to="/signup"
                id="features-cta-create-account"
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#528d5a] hover:bg-[#43754a] text-white text-sm font-bold rounded-xl shadow-xs shadow-[#528d5a]/20 transition-colors"
              >
                Create Account
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
