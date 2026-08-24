import React from 'react';
import { 
  ShieldCheck, 
  Lock, 
  EyeOff, 
  ServerOff, 
  FileCheck, 
  KeyRound, 
  UserCheck, 
  Sparkles,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { Link } from '../context/RouterContext';

export const SecurityPage: React.FC = () => {
  const securityPillars = [
    {
      icon: <Lock className="w-6 h-6 text-[#528d5a]" />,
      title: 'DTLS-SRTP Media Encryption',
      desc: 'All real-time audio and video communications are encrypted directly between endpoints using WebRTC’s mandatory DTLS and SRTP cryptography standards.'
    },
    {
      icon: <ServerOff className="w-6 h-6 text-[#528d5a]" />,
      title: 'Zero Central Call Recording',
      desc: 'FreeMeet does not record, buffer, or transcribe your conversations on our signaling infrastructure. What happens in your meeting stays between attendees.'
    },
    {
      icon: <EyeOff className="w-6 h-6 text-[#528d5a]" />,
      title: 'Zero Data Harvesting',
      desc: 'We never sell meeting logs, attendee lists, or behavioral telemetry to ad brokers or marketing trackers. Your conversations are not training data.'
    },
    {
      icon: <KeyRound className="w-6 h-6 text-[#528d5a]" />,
      title: 'Cryptographic Room Identifiers',
      desc: 'Room identifiers are generated using high-entropy secure randomness to prevent room guessing or unauthorized brute-force join attempts.'
    },
    {
      icon: <UserCheck className="w-6 h-6 text-[#528d5a]" />,
      title: 'Disposable Ephemeral State',
      desc: 'Meeting rooms exist in memory only while active. When the last participant exits the room, all temporary signaling metadata is immediately destroyed.'
    },
    {
      icon: <FileCheck className="w-6 h-6 text-[#528d5a]" />,
      title: 'GDPR & CCPA Compliant',
      desc: 'Because we minimize data retention by default, FreeMeet strictly aligns with international privacy regulations including GDPR, CCPA, and COPPA.'
    }
  ];

  return (
    <div className="bg-[#f8f9f8] min-h-screen">
      {/* Hero Banner */}
      <section className="pt-16 pb-20 bg-gradient-to-b from-[#eff5f0] to-[#f8f9f8] border-b border-[#e2ede4]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#e3ece5] border border-[#cddfd0] text-[#3d6e44] text-xs sm:text-sm font-semibold mb-6">
            <ShieldCheck className="w-4 h-4 text-[#528d5a]" />
            <span>Built For Total Confidentiality</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#1a241b] tracking-tight font-['Outfit']">
            Security &amp; Privacy By Design
          </h1>
          <p className="mt-5 text-lg text-[#5a6b5c] max-w-2xl mx-auto">
            FreeMeet is architected so that we never hold the keys to your conversations. Discover our peer-to-peer security model.
          </p>
        </div>
      </section>

      {/* Security Pillars */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {securityPillars.map((pillar, i) => (
            <div key={i} className="bg-white p-8 rounded-2xl border border-[#e2ede4] shadow-xs hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-[#eff5f0] border border-[#e2ede4] flex items-center justify-center mb-6">
                {pillar.icon}
              </div>
              <h3 className="text-xl font-bold text-[#1a241b] mb-3 font-['Outfit']">{pillar.title}</h3>
              <p className="text-[#5a6b5c] text-sm leading-relaxed">{pillar.desc}</p>
            </div>
          ))}
        </div>

        {/* Detailed Security Spec Table */}
        <div className="mt-16 bg-white rounded-3xl border border-[#e2ede4] p-8 sm:p-12 shadow-xs">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1a241b] mb-6 font-['Outfit']">
            Security Standards &amp; Protocol Specifications
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#5a6b5c]">
              <thead className="bg-[#eff5f0] text-[#1a241b] uppercase text-xs font-bold border-b border-[#e2ede4]">
                <tr>
                  <th className="py-3 px-4">Layer</th>
                  <th className="py-3 px-4">Standard / Technology</th>
                  <th className="py-3 px-4">Implementation Purpose</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2ede4]">
                <tr>
                  <td className="py-4 px-4 font-semibold text-[#1a241b]">Transport Security</td>
                  <td className="py-4 px-4 font-mono text-xs text-[#528d5a]">TLS 1.3 / HTTPS</td>
                  <td className="py-4 px-4">Protects all signaling and web asset delivery against eavesdropping.</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-semibold text-[#1a241b]">Media Encryption</td>
                  <td className="py-4 px-4 font-mono text-xs text-[#528d5a]">DTLS 1.2 + SRTP AES-128</td>
                  <td className="py-4 px-4">Direct stream encryption between browser participants.</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-semibold text-[#1a241b]">Data Channels</td>
                  <td className="py-4 px-4 font-mono text-xs text-[#528d5a]">SCTP Encrypted</td>
                  <td className="py-4 px-4">In-meeting chat and user state synchronization over encrypted channels.</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-semibold text-[#1a241b]">Room Identifiers</td>
                  <td className="py-4 px-4 font-mono text-xs text-[#528d5a]">CSPRN 128-bit</td>
                  <td className="py-4 px-4">Cryptographically random collision-resistant room codes.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-8 pt-8 border-t border-[#e2ede4] flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-[#5a6b5c]">
              Have specialized security requirements or questions? We are here to help.
            </p>
            <Link
              to="/contact"
              id="security-contact-btn"
              className="inline-flex items-center gap-2 text-sm font-bold text-[#528d5a] hover:text-[#43754a]"
            >
              Contact Security Team
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
