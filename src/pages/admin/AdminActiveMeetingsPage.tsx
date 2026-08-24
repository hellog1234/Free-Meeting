import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  Users, 
  Clock, 
  ExternalLink, 
  PowerOff, 
  Copy, 
  Check, 
  AlertCircle, 
  Video, 
  CheckCircle2 
} from 'lucide-react';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Meeting } from '../../types';
import { Link } from '../../context/RouterContext';
import { getMeetingUrl } from '../../utils/meetingUtils';
import { logActivity } from '../../lib/activityLogger';

export const AdminActiveMeetingsPage: React.FC = () => {
  const [activeMeetings, setActiveMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      const q = query(
        collection(db, 'meetings'),
        where('status', '==', 'active')
      );

      const unsub = onSnapshot(q, (snapshot) => {
        const list: Meeting[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          list.push({
            id: docSnap.id,
            hostId: d.hostId || '',
            hostName: d.hostName || 'Meeting Host',
            title: d.title || 'Live Meeting',
            code: d.code || docSnap.id,
            status: 'active',
            participantCount: d.participantCount || 0,
            participantLimit: d.participantLimit || 50,
            createdAt: d.createdAt,
            startedAt: d.startedAt,
          });
        });
        setActiveMeetings(list);
        setLoading(false);
      }, (err) => {
        console.warn('Active meetings listener error:', err);
        setLoading(false);
      });

      return () => unsub();
    } catch (e) {
      console.warn('Error setting up active meetings listener:', e);
      setLoading(false);
    }
  }, []);

  const handleCopyLink = (meetingId: string) => {
    const url = getMeetingUrl(meetingId);
    navigator.clipboard.writeText(url);
    setCopiedId(meetingId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleForceEndMeeting = async (meeting: Meeting) => {
    if (!window.confirm(`Are you sure you want to end active meeting "${meeting.title}" (${meeting.code}) as administrator?`)) {
      return;
    }

    try {
      setActionLoadingId(meeting.id);
      const meetingRef = doc(db, 'meetings', meeting.id);
      await updateDoc(meetingRef, {
        status: 'completed',
        endedAt: serverTimestamp(),
        endedBy: 'admin',
      });

      logActivity('meeting_completed', `Meeting forcibly terminated by Administrator: ${meeting.title}`, {
        meetingId: meeting.id,
        meetingCode: meeting.code,
      });

      setSuccessMessage(`Meeting "${meeting.title}" has been successfully terminated.`);
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      console.error('Error ending meeting:', err);
      alert('Failed to end meeting: ' + (err?.message || 'Permission denied'));
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-[#e2ede4] p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#1a241b] font-['Outfit']">
              Live Active Meetings
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
              {activeMeetings.length} Live
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#5a6b5c] mt-1">
            Real-time feed of video conference rooms currently in progress.
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-3xl border border-[#e2ede4] py-20 text-center space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto animate-pulse">
            <Radio className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold text-[#5a6b5c]">Checking for active video calls...</p>
        </div>
      ) : activeMeetings.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#e2ede4] py-20 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-[#eff5f0] text-[#8ca18f] flex items-center justify-center mx-auto">
            <Radio className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-[#1a241b] font-['Outfit']">
            No Active Meetings In Progress
          </h3>
          <p className="text-xs text-[#5a6b5c] max-w-md mx-auto">
            There are currently no active video conference calls running on the platform. When a host or participant starts a call, it will appear here in real time.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeMeetings.map((meeting) => (
            <div
              key={meeting.id}
              className="bg-white rounded-3xl border border-rose-200 p-6 shadow-xs space-y-4 hover:shadow-md transition-shadow relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                  <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">
                    Live Video Room
                  </span>
                </div>
                <span className="font-mono text-xs font-bold bg-[#eff5f0] text-[#3d6e44] px-2 py-0.5 rounded-lg">
                  {meeting.code}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-[#1a241b] font-['Outfit'] truncate">
                  {meeting.title}
                </h3>
                <div className="text-xs text-[#5a6b5c] mt-1 flex items-center gap-2">
                  <span>Host: <strong className="text-[#1a241b]">{meeting.hostName}</strong></span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#f8f9f8] border border-[#e2ede4] flex items-center justify-between text-xs">
                <span className="text-[#5a6b5c]">Room ID</span>
                <span className="font-mono text-[11px] text-[#1a241b]">{meeting.id}</span>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Link
                  to={`/meeting/${meeting.id}`}
                  className="flex-1 py-2.5 rounded-xl bg-[#528d5a] hover:bg-[#437549] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Join Room</span>
                </Link>
                <button
                  type="button"
                  onClick={() => handleCopyLink(meeting.id)}
                  className="p-2.5 rounded-xl bg-[#eff5f0] hover:bg-[#e2ede4] text-[#3d6e44] text-xs font-semibold transition-colors"
                  title="Copy Invite Link"
                >
                  {copiedId === meeting.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => handleForceEndMeeting(meeting)}
                  disabled={actionLoadingId === meeting.id}
                  className="px-3 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-rose-200 cursor-pointer disabled:opacity-50"
                  title="Terminate Meeting"
                >
                  <PowerOff className="w-3.5 h-3.5" />
                  <span>End</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
