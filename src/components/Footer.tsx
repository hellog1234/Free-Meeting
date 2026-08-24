import React from 'react';
import { Twitter, Github, Linkedin, Youtube, ShieldCheck, Heart } from 'lucide-react';
import { Link } from '../context/RouterContext';
import { Logo } from './Logo';

export const Footer: React.FC = () => {
  return (
    <footer id="main-footer" className="bg-white text-[#5a6b5c] pt-16 pb-12 mt-auto border-t border-[#e2ede4]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 pb-12 border-b border-[#e2ede4]">
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-4">
            <Logo />
            <p className="text-[#5a6b5c] text-sm leading-relaxed max-w-sm">
              Simple video meetings. Completely free. No subscriptions, no hidden limits, and no complicated setup.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#eff5f0] text-[#4b7f52] border border-[#d1e0d4]">
                <ShieldCheck className="w-3.5 h-3.5" />
                100% Free &amp; Private
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#eff5f0] text-[#528d5a] border border-[#d1e0d4]">
                <Heart className="w-3.5 h-3.5 text-[#528d5a]" />
                Open Access
              </span>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="text-[#528d5a] font-bold text-xs tracking-widest uppercase mb-4 font-['Outfit']">
              Product
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/features" id="footer-link-features" className="text-[#5a6b5c] hover:text-[#528d5a] transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link to="/how-it-works" id="footer-link-how-it-works" className="text-[#5a6b5c] hover:text-[#528d5a] transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link to="/pricing" id="footer-link-pricing" className="text-[#5a6b5c] hover:text-[#528d5a] transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/security" id="footer-link-security" className="text-[#5a6b5c] hover:text-[#528d5a] transition-colors">
                  Security
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="text-[#528d5a] font-bold text-xs tracking-widest uppercase mb-4 font-['Outfit']">
              Company
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/about" id="footer-link-about" className="text-[#5a6b5c] hover:text-[#528d5a] transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link to="/contact" id="footer-link-contact" className="text-[#5a6b5c] hover:text-[#528d5a] transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link to="/faq" id="footer-link-faq" className="text-[#5a6b5c] hover:text-[#528d5a] transition-colors">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="text-[#528d5a] font-bold text-xs tracking-widest uppercase mb-4 font-['Outfit']">
              Legal
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/terms" id="footer-link-terms" className="text-[#5a6b5c] hover:text-[#528d5a] transition-colors">
                  Terms
                </Link>
              </li>
              <li>
                <Link to="/privacy" id="footer-link-privacy" className="text-[#5a6b5c] hover:text-[#528d5a] transition-colors">
                  Privacy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#8ca18f]">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-6 text-center sm:text-left">
            <span className="font-semibold text-[#1e291f]">FreeMeet</span>
            <span>Simple video meetings. Completely free.</span>
            <span>&copy; {new Date().getFullYear()} FreeMeet. All rights reserved.</span>
          </div>

          {/* Social icons */}
          <div className="flex items-center gap-3 text-[#5a6b5c]">
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noreferrer"
              aria-label="Twitter"
              className="p-2 rounded-xl bg-[#f8f9f8] hover:text-[#528d5a] hover:bg-[#eff5f0] border border-[#e2ede4] transition-colors"
            >
              <Twitter className="w-4 h-4" />
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
              className="p-2 rounded-xl bg-[#f8f9f8] hover:text-[#528d5a] hover:bg-[#eff5f0] border border-[#e2ede4] transition-colors"
            >
              <Github className="w-4 h-4" />
            </a>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn"
              className="p-2 rounded-xl bg-[#f8f9f8] hover:text-[#528d5a] hover:bg-[#eff5f0] border border-[#e2ede4] transition-colors"
            >
              <Linkedin className="w-4 h-4" />
            </a>
            <a
              href="https://youtube.com"
              target="_blank"
              rel="noreferrer"
              aria-label="YouTube"
              className="p-2 rounded-xl bg-[#f8f9f8] hover:text-[#528d5a] hover:bg-[#eff5f0] border border-[#e2ede4] transition-colors"
            >
              <Youtube className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
