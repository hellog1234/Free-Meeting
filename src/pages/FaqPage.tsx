import React, { useState } from 'react';
import { 
  HelpCircle, 
  Search, 
  Plus, 
  Minus, 
  Sparkles,
  ArrowRight,
  Shield,
  Video,
  Monitor,
  Users
} from 'lucide-react';
import { Link } from '../context/RouterContext';

export const FaqPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [openItems, setOpenItems] = useState<{ [key: string]: boolean }>({ '0-0': true });

  const categories = ['All', 'General', 'Meetings', 'Security', 'Compatibility'];

  const allFaqs = [
    {
      category: 'General',
      q: 'Is FreeMeet really 100% free forever?',
      a: 'Yes, completely free. There are no credit cards needed, no trials, and no features locked behind premium tiers. Video calling is provided as a free web service.'
    },
    {
      category: 'General',
      q: 'How does FreeMeet sustain itself without charging users?',
      a: 'Unlike legacy platforms that maintain multi-million-dollar video transcoding server farms, FreeMeet uses browser-native peer-to-peer WebRTC. This lowers our hosting costs by more than 95%, which is supported through developer sponsorships and cloud open-source grants.'
    },
    {
      category: 'Meetings',
      q: 'Is there a 40-minute meeting cutoff like Zoom?',
      a: 'No! There are zero artificial time limits on your meetings. You can meet for 15 minutes or 4 hours without being abruptly disconnected.'
    },
    {
      category: 'Meetings',
      q: 'Do meeting guests need to register or sign up to join?',
      a: 'No. Hosts can invite guests simply by sharing the unique room URL. Guests click the link and immediately join the call in their browser without signing up.'
    },
    {
      category: 'Meetings',
      q: 'Can I share my screen with audio during calls?',
      a: 'Yes. FreeMeet supports full HD screen sharing for entire screens, specific windows, or individual browser tabs, including system audio.'
    },
    {
      category: 'Security',
      q: 'Are FreeMeet video calls encrypted?',
      a: 'Yes. All real-time media streams utilize industry-standard DTLS-SRTP encryption natively built into modern browser WebRTC implementations.'
    },
    {
      category: 'Security',
      q: 'Does FreeMeet record or store meetings on servers?',
      a: 'No. FreeMeet does not record audio, video, or chat transcripts on central servers. Rooms are completely ephemeral and wiped once participants leave.'
    },
    {
      category: 'Security',
      q: 'Is FreeMeet compliant with privacy regulations like GDPR?',
      a: 'Yes. We adhere to privacy-by-design principles, minimize data retention, and do not track or sell personal user data to third parties.'
    },
    {
      category: 'Compatibility',
      q: 'Which web browsers are supported?',
      a: 'FreeMeet works on all modern standard web browsers including Google Chrome, Mozilla Firefox, Apple Safari, Microsoft Edge, Brave, and Opera.'
    },
    {
      category: 'Compatibility',
      q: 'Does FreeMeet work on smartphones and tablets?',
      a: 'Yes. You can join and host meetings on iOS (Safari/Chrome) and Android devices directly in the browser without installing apps from the App Store or Google Play.'
    }
  ];

  const filteredFaqs = allFaqs.filter((item) => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch =
      item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.a.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleItem = (id: string) => {
    setOpenItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div className="bg-[#f8f9f8] min-h-screen">
      {/* Hero Banner */}
      <section className="pt-16 pb-20 bg-gradient-to-b from-[#eff5f0] to-[#f8f9f8] border-b border-[#e2ede4]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#e3ece5] border border-[#cddfd0] text-[#3d6e44] text-xs sm:text-sm font-semibold mb-6">
            <HelpCircle className="w-4 h-4 text-[#528d5a]" />
            <span>Help Center &amp; Common Inquiries</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#1a241b] tracking-tight font-['Outfit']">
            Frequently Asked Questions
          </h1>
          <p className="mt-5 text-lg text-[#5a6b5c] max-w-2xl mx-auto">
            Everything you need to know about FreeMeet features, privacy, compatibility, and architecture.
          </p>

          {/* Search bar */}
          <div className="mt-8 max-w-xl mx-auto relative">
            <Search className="w-5 h-5 text-[#8ca18f] absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="faq-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search questions (e.g. time limits, security, screen share)..."
              className="w-full pl-12 pr-4 py-3.5 bg-white rounded-xl border border-[#e2ede4] shadow-xs text-sm text-[#1a241b] placeholder:text-[#8ca18f] focus:outline-none focus:ring-2 focus:ring-[#528d5a] focus:border-[#528d5a]"
            />
          </div>
        </div>
      </section>

      {/* Category Pills & Accordion List */}
      <section className="py-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Category filters */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          {categories.map((cat) => (
            <button
              key={cat}
              id={`faq-category-${cat.toLowerCase()}`}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                selectedCategory === cat
                  ? 'bg-[#528d5a] text-white shadow-xs'
                  : 'bg-white text-[#2d3b2e] border border-[#e2ede4] hover:bg-[#eff5f0]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* FAQs */}
        {filteredFaqs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-[#e2ede4] p-8">
            <p className="text-[#5a6b5c] text-base">No questions matching "{searchQuery}" in this category.</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
              }}
              className="mt-4 text-sm font-bold text-[#528d5a] hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredFaqs.map((faq, index) => {
              const itemId = `${selectedCategory}-${index}`;
              const isOpen = !!openItems[itemId];
              return (
                <div
                  key={itemId}
                  className="bg-white rounded-2xl border border-[#e2ede4] overflow-hidden shadow-2xs transition-all"
                >
                  <button
                    type="button"
                    onClick={() => toggleItem(itemId)}
                    className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 focus:outline-none"
                    aria-expanded={isOpen}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded bg-[#eff5f0] text-[#3f6e45]">
                        {faq.category}
                      </span>
                      <span className="font-bold text-[#1a241b] text-base sm:text-lg font-['Outfit']">
                        {faq.q}
                      </span>
                    </div>
                    <span className="p-1 rounded-lg bg-[#eff5f0] text-[#528d5a] flex-shrink-0">
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
        )}

        {/* Still have questions */}
        <div className="mt-16 text-center bg-white rounded-3xl border border-[#e2ede4] p-8 sm:p-10 shadow-xs">
          <h3 className="text-xl font-bold text-[#1a241b] font-['Outfit']">Still have questions?</h3>
          <p className="mt-2 text-sm text-[#5a6b5c]">
            Can’t find the answer you’re looking for? Reach out to our community and team directly.
          </p>
          <div className="mt-6">
            <Link
              to="/contact"
              id="faq-contact-us-btn"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#528d5a] hover:bg-[#43754a] text-white text-sm font-bold rounded-xl transition-colors shadow-xs"
            >
              Contact Us
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
