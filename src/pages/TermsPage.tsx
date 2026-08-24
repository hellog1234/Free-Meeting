import React from 'react';
import { ShieldCheck, FileText } from 'lucide-react';

export const TermsPage: React.FC = () => {
  return (
    <div className="bg-[#f8f9f8] min-h-screen">
      {/* Header */}
      <section className="pt-16 pb-16 bg-gradient-to-b from-[#eff5f0] to-[#f8f9f8] border-b border-[#e2ede4]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#e3ece5] border border-[#cddfd0] text-[#3d6e44] text-xs sm:text-sm font-semibold mb-4">
            <FileText className="w-4 h-4 text-[#528d5a]" />
            <span>Legal Documentation</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#1a241b] tracking-tight font-['Outfit']">
            Terms of Service
          </h1>
          <p className="mt-3 text-sm text-[#5a6b5c]">
            Last Updated: August 2026
          </p>
        </div>
      </section>

      {/* Terms Body */}
      <section className="py-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl border border-[#e2ede4] p-8 sm:p-12 shadow-xs prose prose-slate max-w-none text-sm leading-relaxed text-[#5a6b5c] space-y-6">
          <div>
            <h2 className="text-xl font-bold text-[#1a241b] font-['Outfit'] mb-2">1. Agreement to Terms</h2>
            <p>
              By accessing or using FreeMeet (the "Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not access or use the platform. FreeMeet provides browser-based peer-to-peer real-time video communication at zero monetary cost to users.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-[#1a241b] font-['Outfit'] mb-2">2. Description of the Service</h2>
            <p>
              FreeMeet enables users to create and join real-time audio, video, screen-sharing, and text messaging rooms directly through compliant web browsers. The service is provided "as-is" and "as-available" without warranties of uninterrupted uptime.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-[#1a241b] font-['Outfit'] mb-2">3. Acceptable Use Policy</h2>
            <p>
              You agree not to use the Service for any unlawful, harassing, fraudulent, or harmful purposes, including transmitting viruses, broadcasting illegal content, or violating the intellectual property or privacy rights of any third party.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-[#1a241b] font-['Outfit'] mb-2">4. User Accounts &amp; Ephemeral Data</h2>
            <p>
              When creating an account, you agree to provide accurate registration information. Meeting room media streams are transmitted on a peer-to-peer basis and are not stored on FreeMeet servers. Session logs and room state are automatically purged upon session completion.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-[#1a241b] font-['Outfit'] mb-2">5. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by applicable law, FreeMeet and its creators shall not be liable for any direct, indirect, incidental, or consequential damages resulting from your use or inability to use the Service.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-[#1a241b] font-['Outfit'] mb-2">6. Modifications to Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. Continued use of the platform following the posting of revised Terms constitutes your acceptance of the changes.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
