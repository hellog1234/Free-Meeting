import React from 'react';
import { ShieldCheck, Lock } from 'lucide-react';

export const PrivacyPage: React.FC = () => {
  return (
    <div className="bg-[#f8f9f8] min-h-screen">
      {/* Header */}
      <section className="pt-16 pb-16 bg-gradient-to-b from-[#eff5f0] to-[#f8f9f8] border-b border-[#e2ede4]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#e3ece5] border border-[#cddfd0] text-[#3d6e44] text-xs sm:text-sm font-semibold mb-4">
            <ShieldCheck className="w-4 h-4 text-[#528d5a]" />
            <span>Privacy Protection</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#1a241b] tracking-tight font-['Outfit']">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-[#5a6b5c]">
            Last Updated: August 2026
          </p>
        </div>
      </section>

      {/* Privacy Body */}
      <section className="py-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl border border-[#e2ede4] p-8 sm:p-12 shadow-xs prose prose-slate max-w-none text-sm leading-relaxed text-[#5a6b5c] space-y-6">
          <div>
            <h2 className="text-xl font-bold text-[#1a241b] font-['Outfit'] mb-2">1. Our Core Privacy Commitment</h2>
            <p>
              FreeMeet is designed with strict data minimization principles. We do not sell your personal data, we do not analyze your audio/video streams for advertisement targeting, and we do not record private meetings on our servers.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-[#1a241b] font-['Outfit'] mb-2">2. Information We Collect</h2>
            <p>
              We collect only the minimum necessary information required to operate the service:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li><strong>Account Information:</strong> Name and email address when you voluntarily register.</li>
              <li><strong>Technical Signaling Logs:</strong> Transient network metadata (such as IP addresses and WebRTC candidate tokens) utilized strictly to establish peer-to-peer handshakes during call setup.</li>
              <li><strong>Support Inquiries:</strong> Information you submit when contacting our support or security team.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-bold text-[#1a241b] font-['Outfit'] mb-2">3. Video, Audio, and Screen Sharing Data</h2>
            <p>
              Real-time media is transmitted directly between call participants using DTLS-SRTP encryption. Video, audio, and shared screens are never saved, indexed, or stored on our servers.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-[#1a241b] font-['Outfit'] mb-2">4. Third-Party Disclosures &amp; Cookies</h2>
            <p>
              FreeMeet does not employ third-party advertising cookies or cross-site tracking trackers. We do not monetize user data.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-[#1a241b] font-['Outfit'] mb-2">5. Data Retention &amp; Rights</h2>
            <p>
              You have the right to request access to or deletion of your registered account information at any time by contacting our privacy officer at <span className="font-semibold text-[#1a241b]">privacy@freemeet.app</span>.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
