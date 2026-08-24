import React from 'react';
import { 
  Check, 
  X, 
  Sparkles, 
  ShieldCheck, 
  Heart, 
  HelpCircle, 
  ArrowRight,
  Zap,
  Globe
} from 'lucide-react';
import { Link } from '../context/RouterContext';

export const PricingPage: React.FC = () => {
  return (
    <div className="bg-[#f8f9f8] min-h-screen">
      {/* Hero Banner */}
      <section className="pt-16 pb-20 bg-gradient-to-b from-[#eff5f0] to-[#f8f9f8] border-b border-[#e2ede4]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#e3ece5] border border-[#cddfd0] text-[#3d6e44] text-xs sm:text-sm font-semibold mb-6">
            <Sparkles className="w-4 h-4 text-[#528d5a]" />
            <span>Transparent &amp; Predictable</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#1a241b] tracking-tight font-['Outfit']">
            100% Free. Always.
          </h1>
          <p className="mt-5 text-lg text-[#5a6b5c] max-w-2xl mx-auto">
            No credit card. No artificial 40-minute cutoffs. No tier traps. We provide video collaboration as a free public utility.
          </p>
        </div>
      </section>

      {/* Free Plan Showcase Card */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto bg-white rounded-3xl border-2 border-[#528d5a] p-8 sm:p-12 shadow-md shadow-[#528d5a]/10 relative">
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#528d5a] text-white font-bold text-xs uppercase tracking-wider shadow-xs">
            Everything Included Plan
          </div>

          <div className="text-center pb-8 border-b border-[#e2ede4]">
            <h2 className="text-2xl font-bold text-[#1a241b] font-['Outfit']">Free Forever</h2>
            <p className="text-[#5a6b5c] text-sm mt-1">For individuals, startups, educators, and global teams</p>
            <div className="mt-6 flex items-baseline justify-center gap-1">
              <span className="text-5xl sm:text-6xl font-extrabold text-[#1a241b] font-['Outfit']">$0</span>
              <span className="text-[#5a6b5c] font-medium">/ month</span>
            </div>
            <p className="text-xs text-[#528d5a] font-semibold mt-2">No payment info or billing setup required</p>

            <div className="mt-8">
              <Link
                to="/signup"
                id="pricing-card-create-account-btn"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-[#528d5a] hover:bg-[#43754a] text-white font-bold text-sm rounded-xl shadow-sm shadow-[#528d5a]/20 transition-colors"
              >
                Create Account
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="pt-8">
            <h3 className="text-sm font-bold text-[#1a241b] uppercase tracking-wider mb-4 font-['Outfit']">
              Included Features:
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-sm text-[#2d3b2e]">
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#528d5a] flex-shrink-0" />
                <span>Unlimited Meeting Length</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#528d5a] flex-shrink-0" />
                <span>HD Audio &amp; Video</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#528d5a] flex-shrink-0" />
                <span>Screen Sharing with Audio</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#528d5a] flex-shrink-0" />
                <span>Instant In-Meeting Chat</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#528d5a] flex-shrink-0" />
                <span>Encrypted P2P Media Streams</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#528d5a] flex-shrink-0" />
                <span>1-Click Room Invitation Links</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#528d5a] flex-shrink-0" />
                <span>No Software Downloads</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#528d5a] flex-shrink-0" />
                <span>Mobile &amp; Desktop Browser Support</span>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Comparison Table vs Competitors */}
        <div className="mt-20 bg-white rounded-3xl border border-[#e2ede4] p-6 sm:p-10 shadow-xs">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1a241b] font-['Outfit']">
              How FreeMeet Compares
            </h2>
            <p className="mt-2 text-sm text-[#5a6b5c]">
              See why switching to browser-native meetings saves time and eliminates software subscription fees.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#eff5f0] text-[#1a241b] font-bold border-b border-[#e2ede4]">
                <tr>
                  <th className="py-3.5 px-4 font-['Outfit'] text-[#1a241b]">Feature</th>
                  <th className="py-3.5 px-4 text-[#528d5a] font-bold bg-[#e6efe8]/60">FreeMeet</th>
                  <th className="py-3.5 px-4 text-[#5a6b5c]">Paid Corporate Alternatives</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2ede4] text-[#2d3b2e]">
                <tr>
                  <td className="py-4 px-4 font-semibold text-[#1a241b]">Monthly Price</td>
                  <td className="py-4 px-4 font-bold text-[#528d5a] bg-[#eff5f0]/40">$0 Forever</td>
                  <td className="py-4 px-4 text-[#5a6b5c]">$15 – $25 / user / month</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-semibold text-[#1a241b]">Free Tier Call Duration</td>
                  <td className="py-4 px-4 font-bold text-[#528d5a] bg-[#eff5f0]/40">Unlimited</td>
                  <td className="py-4 px-4 text-[#5a6b5c]">Strict 40-minute cutoff</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-semibold text-[#1a241b]">Software Installation Required</td>
                  <td className="py-4 px-4 font-bold text-[#528d5a] bg-[#eff5f0]/40">Never (100% Browser)</td>
                  <td className="py-4 px-4 text-[#5a6b5c]">Forced desktop/mobile apps</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-semibold text-[#1a241b]">Guest Sign-in Requirement</td>
                  <td className="py-4 px-4 font-bold text-[#528d5a] bg-[#eff5f0]/40">No account required</td>
                  <td className="py-4 px-4 text-[#5a6b5c]">Often requires sign-in</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-semibold text-[#1a241b]">Screen Sharing</td>
                  <td className="py-4 px-4 font-bold text-[#528d5a] bg-[#eff5f0]/40">Full HD Included</td>
                  <td className="py-4 px-4 text-[#5a6b5c]">Tier-gated resolutions</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-semibold text-[#1a241b]">Data Harvesting / Telemetry</td>
                  <td className="py-4 px-4 font-bold text-[#528d5a] bg-[#eff5f0]/40">None (Zero tracking)</td>
                  <td className="py-4 px-4 text-[#5a6b5c]">Extensive marketing tracking</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Why is it free FAQ */}
        <div className="mt-16 bg-[#eff5f0] rounded-3xl p-8 sm:p-10 border border-[#e2ede4]">
          <h3 className="text-xl font-bold text-[#1a241b] mb-2 font-['Outfit']">How can FreeMeet afford to be 100% free?</h3>
          <p className="text-[#5a6b5c] text-sm leading-relaxed">
            Legacy video meeting vendors maintain massive datacenters to re-encode and transcode millions of video streams simultaneously, passing those heavy server costs onto customers via steep monthly subscriptions. Because FreeMeet connects participants directly through peer-to-peer WebRTC in your browser, our infrastructure costs are over 95% lower. We operate sustainably through developer sponsorships and open-source infrastructure grants.
          </p>
        </div>
      </section>
    </div>
  );
};
