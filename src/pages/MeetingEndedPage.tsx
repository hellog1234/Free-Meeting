import React, { useEffect, useState } from 'react';
import { Video, LogOut, Home, LayoutDashboard, Plus, Clock, ShieldCheck, ArrowRight } from 'lucide-react';
import { useRouter, Link } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Meeting } from '../types';

interface MeetingEndedPageProps {
  meetingId?: string;
}

export const MeetingEndedPage: React.FC<MeetingEndedPageProps> = ({ meetingId: propMeetingId }) => {
  const { currentPath, navigate } = useRouter();
  const { user, isAuthenticated } = useAuth();

  // Extract meetingId from URL parameters or prop
  const [meetingId] = useState<string>(() => {
    if (propMeetingId) return propMeetingId;
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const fromParam = urlParams.get('id');
      if (fromParam) return fromParam;
      
      const parts = window.location.pathname.split('/');
      if (parts[1] === 'meeting' && parts[3] === 'ended') {
        return parts[2];
      }
    }
    return '';
  });

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(Boolean(meetingId));

  useEffect(() => {
    if (!meetingId) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    const loadMeetingDetails = async () => {
      try {
        const meetingRef = doc(db, 'meetings', meetingId);
        const snap = await getDoc(meetingRef);
        if (snap.exists() && isMounted) {
          setMeeting({ id: snap.id, ...snap.data() } as Meeting);
        }
      } catch (err) {
        console.warn('Error loading ended meeting details:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadMeetingDetails();
    return () => {
      isMounted = false;
    };
  }, [meetingId]);

  return (
    <div className="min-h-screen bg-[#f8f9f8] text-[#1a241b] flex flex-col justify-between p-4 sm:p-6 lg:p-10 font-sans">
      {/* Header */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between py-2 mb-4">
        <Link to="/" className="inline-flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-[#528d5a] flex items-center justify-center text-white shadow-xs shadow-[#528d5a]/20">
            <Video className="w-5 h-5" />
          </div>
          <span className="text-xl sm:text-2xl font-bold font-['Outfit'] tracking-tight text-[#1a241b]">
            Free<span className="text-[#528d5a]">Meet</span>
          </span>
        </Link>

        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#eff5f0] border border-[#cddfd0] text-xs font-semibold text-[#3d6e44]">
          <ShieldCheck className="w-4 h-4 text-[#528d5a]" />
          <span>Call Concluded</span>
        </div>
      </header>

      {/* Main Ended Card */}
      <main className="max-w-lg w-full mx-auto my-auto py-6 animate-in zoom-in-95 duration-200">
        <div className="bg-white rounded-3xl border border-[#e2ede4] p-8 sm:p-10 shadow-md text-center space-y-6">
          {/* Icon Badge */}
          <div className="w-16 h-16 rounded-3xl bg-[#eff5f0] border border-[#cddfd0] text-[#528d5a] flex items-center justify-center mx-auto shadow-xs">
            <LogOut className="w-8 h-8 text-[#528d5a]" />
          </div>

          {/* Title & Status */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold font-['Outfit'] text-[#1a241b] tracking-tight">
              Meeting Ended
            </h1>
            <p className="text-sm text-[#5a6b5c]">
              The meeting host has concluded this conference. All participants have been disconnected and media streams closed.
            </p>
          </div>

          {/* Meeting Summary Box */}
          {meeting && (
            <div className="p-4 rounded-2xl bg-[#f8f9f8] border border-[#e2ede4] text-left space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#8ca18f] uppercase tracking-wider">Conference Title</span>
                <span className="text-xs font-mono font-bold text-[#528d5a]">{meeting.code || meeting.id}</span>
              </div>
              <p className="text-sm font-bold text-[#1a241b] truncate">{meeting.title || 'Video Meeting'}</p>
              {meeting.hostName && (
                <p className="text-xs text-[#5a6b5c]">Hosted by <strong className="text-[#1a241b]">{meeting.hostName}</strong></p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                id="meeting-ended-dashboard-btn"
                className="w-full py-3.5 px-6 bg-[#528d5a] hover:bg-[#43754a] text-white font-bold text-sm rounded-xl shadow-xs shadow-[#528d5a]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Return to Dashboard</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/')}
                id="meeting-ended-home-btn"
                className="w-full py-3.5 px-6 bg-[#528d5a] hover:bg-[#43754a] text-white font-bold text-sm rounded-xl shadow-xs shadow-[#528d5a]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Return to Home</span>
              </button>
            )}

            {isAuthenticated && (
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="w-full py-3 px-6 bg-white hover:bg-[#f8f9f8] border border-[#e2ede4] text-[#1a241b] font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#528d5a]" />
                <span>Start Another Meeting</span>
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Footer Tag */}
      <footer className="max-w-4xl w-full mx-auto text-center py-4 text-xs text-[#8ca18f]">
        FreeMeet • Secure &amp; Unlimited Video Conferencing
      </footer>
    </div>
  );
};
