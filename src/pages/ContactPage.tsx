import React, { useState } from 'react';
import { 
  Mail, 
  MessageSquare, 
  Send, 
  CheckCircle2, 
  Sparkles, 
  HelpCircle,
  Github,
  Globe
} from 'lucide-react';
import { Link } from '../context/RouterContext';

export const ContactPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'General Inquiry',
    message: '',
  });

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 600);
  };

  return (
    <div className="bg-[#f8f9f8] min-h-screen">
      {/* Hero Banner */}
      <section className="pt-16 pb-20 bg-gradient-to-b from-[#eff5f0] to-[#f8f9f8] border-b border-[#e2ede4]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#e3ece5] border border-[#cddfd0] text-[#3d6e44] text-xs sm:text-sm font-semibold mb-6">
            <MessageSquare className="w-4 h-4 text-[#528d5a]" />
            <span>We’d Love to Hear From You</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#1a241b] tracking-tight font-['Outfit']">
            Get in Touch with FreeMeet
          </h1>
          <p className="mt-5 text-lg text-[#5a6b5c] max-w-2xl mx-auto">
            Have questions about FreeMeet, feedback, bug reports, or partnership opportunities? Reach out anytime.
          </p>
        </div>
      </section>

      {/* Main Form & Info Section */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left Info Column */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-3xl border border-[#e2ede4] p-8 shadow-xs">
              <h2 className="text-2xl font-bold text-[#1a241b] font-['Outfit'] mb-4">
                Support &amp; Community
              </h2>
              <p className="text-[#5a6b5c] text-sm leading-relaxed mb-6">
                Our core team and open-source contributors monitor issues and community discussions daily.
              </p>

              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-4 p-4 rounded-xl bg-[#eff5f0] border border-[#e2ede4]">
                  <div className="w-10 h-10 rounded-lg bg-[#e3ece5] text-[#528d5a] flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#1a241b]">Email Support</h4>
                    <p className="text-[#5a6b5c] text-xs mt-0.5">Average response under 24 hours</p>
                    <a href="mailto:support@freemeet.app" className="text-[#528d5a] font-semibold text-xs mt-1 inline-block hover:underline">
                      support@freemeet.app
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-xl bg-[#eff5f0] border border-[#e2ede4]">
                  <div className="w-10 h-10 rounded-lg bg-[#e3ece5] text-[#528d5a] flex items-center justify-center flex-shrink-0">
                    <Github className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#1a241b]">Open Source Community</h4>
                    <p className="text-[#5a6b5c] text-xs mt-0.5">Feature requests and issue tracker</p>
                    <a href="https://github.com" target="_blank" rel="noreferrer" className="text-[#528d5a] font-semibold text-xs mt-1 inline-block hover:underline">
                      github.com/freemeet
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-xl bg-[#eff5f0] border border-[#e2ede4]">
                  <div className="w-10 h-10 rounded-lg bg-[#e3ece5] text-[#528d5a] flex items-center justify-center flex-shrink-0">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#1a241b]">Help &amp; FAQ</h4>
                    <p className="text-[#5a6b5c] text-xs mt-0.5">Check instant answers first</p>
                    <Link to="/faq" className="text-[#528d5a] font-semibold text-xs mt-1 inline-block hover:underline">
                      Browse FAQs &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Form Column */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-3xl border border-[#e2ede4] p-8 sm:p-12 shadow-xs">
              {submitted ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-[#eff5f0] text-[#528d5a] rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-[#1a241b] font-['Outfit']">Message Received!</h3>
                  <p className="mt-2 text-[#5a6b5c] text-sm max-w-md mx-auto">
                    Thank you for reaching out. A member of the FreeMeet team will review your message and reply to <span className="font-semibold text-[#1a241b]">{formData.email}</span> shortly.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitted(false);
                      setFormData({ name: '', email: '', subject: 'General Inquiry', message: '' });
                    }}
                    className="mt-6 px-6 py-2.5 bg-[#eff5f0] hover:bg-[#e2ede4] text-[#2d3b2e] font-semibold text-sm rounded-xl transition-colors"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <h3 className="text-2xl font-bold text-[#1a241b] font-['Outfit']">Send Us a Message</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="contact-name" className="block text-sm font-semibold text-[#2d3b2e] mb-2">
                        Your Name <span className="text-[#528d5a]">*</span>
                      </label>
                      <input
                        type="text"
                        id="contact-name"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Sarah Jenkins"
                        className="w-full px-4 py-3 bg-white rounded-xl border border-[#e2ede4] text-sm text-[#1a241b] placeholder:text-[#8ca18f] focus:outline-none focus:ring-2 focus:ring-[#528d5a]"
                      />
                    </div>

                    <div>
                      <label htmlFor="contact-email" className="block text-sm font-semibold text-[#2d3b2e] mb-2">
                        Email Address <span className="text-[#528d5a]">*</span>
                      </label>
                      <input
                        type="email"
                        id="contact-email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="sarah@example.com"
                        className="w-full px-4 py-3 bg-white rounded-xl border border-[#e2ede4] text-sm text-[#1a241b] placeholder:text-[#8ca18f] focus:outline-none focus:ring-2 focus:ring-[#528d5a]"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="contact-subject" className="block text-sm font-semibold text-[#2d3b2e] mb-2">
                      Inquiry Subject
                    </label>
                    <select
                      id="contact-subject"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-4 py-3 bg-white rounded-xl border border-[#e2ede4] text-sm text-[#1a241b] focus:outline-none focus:ring-2 focus:ring-[#528d5a]"
                    >
                      <option value="General Inquiry">General Inquiry</option>
                      <option value="Feature Feedback">Feature Feedback</option>
                      <option value="Bug Report">Bug Report</option>
                      <option value="Security / Privacy Inquiry">Security / Privacy Inquiry</option>
                      <option value="Partnership / Sponsorship">Partnership / Sponsorship</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="contact-message" className="block text-sm font-semibold text-[#2d3b2e] mb-2">
                      Message <span className="text-[#528d5a]">*</span>
                    </label>
                    <textarea
                      id="contact-message"
                      rows={5}
                      required
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Tell us how we can help..."
                      className="w-full px-4 py-3 bg-white rounded-xl border border-[#e2ede4] text-sm text-[#1a241b] placeholder:text-[#8ca18f] focus:outline-none focus:ring-2 focus:ring-[#528d5a]"
                    />
                  </div>

                  <button
                    type="submit"
                    id="contact-submit-btn"
                    disabled={loading}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#528d5a] hover:bg-[#43754a] text-white font-bold text-sm rounded-xl shadow-sm shadow-[#528d5a]/20 transition-colors disabled:opacity-50"
                  >
                    {loading ? (
                      <span>Sending message...</span>
                    ) : (
                      <>
                        <span>Send Message</span>
                        <Send className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
