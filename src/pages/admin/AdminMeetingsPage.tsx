import React, { useState, useEffect } from 'react';
import { 
  Video, 
  Search, 
  Calendar, 
  Users, 
  Radio, 
  CheckCircle2, 
  Copy, 
  Check, 
  ExternalLink, 
  Clock, 
  Filter,
  Eye,
  X,
  AlertCircle
} from 'lucide-react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Meeting } from '../../types';
import { Link } from '../../context/RouterContext';
import { getMeetingUrl } from '../../utils/meetingUtils';

export const AdminMeetingsPage: React.FC = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'scheduled' | 'completed'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  useEffect(() => {
    try {
      const colRef = collection(db, 'meetings');
      const q = query(colRef, orderBy('createdAt', 'desc'));

      const unsub = onSnapshot(q, (snapshot) => {
        const list: Meeting[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          list.push({
            id: docSnap.id,
            hostId: d.hostId || '',
            hostName: d.hostName || 'Meeting Host',
            title: d.title || 'Untitled Meeting',
            code: d.code || docSnap.id,
            status: d.status || 'scheduled',
            durationMinutes: d.durationMinutes || 0,
            participantCount: d.participantCount || 0,
            participantLimit: d.participantLimit || 50,
            createdAt: d.createdAt,
            startedAt: d.startedAt,
            endedAt: d.endedAt,
            settings: d.settings,
          });
        });
        setMeetings(list);
        setLoading(false);
      }, (err) => {
        console.warn('Meetings listener error:', err);
        setLoading(false);
      });

      return () => unsub();
    } catch (e) {
      console.warn('Error establishing meetings listener:', e);
      setLoading(false);
    }
  }, []);

  const handleCopyLink = (meetingId: string) => {
    const url = getMeetingUrl(meetingId);
    navigator.clipboard.writeText(url);
    setCopiedId(meetingId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatTimestamp = (ts: any): string => {
    if (!ts) return 'N/A';
    try {
      let date: Date;
      if (ts.toDate && typeof ts.toDate === 'function') {
        date = ts.toDate();
      } else if (ts.seconds) {
        date = new Date(ts.seconds * 1000);
      } else {
        date = new Date(ts);
      }
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString([], { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (e) {
      return 'N/A';
    }
  };

  const filteredMeetings = meetings.filter((m) => {
    const matchesSearch = 
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.hostName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.id.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter !== 'all' && m.status !== statusFilter) return false;
    return true;
  });

  const activeCount = meetings.filter(m => m.status === 'active').length;
  const scheduledCount = meetings.filter(m => m.status === 'scheduled').length;
  const completedCount = meetings.filter(m => m.status === 'completed' || m.status === 'ended').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-[#e2ede4] p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-[#1a241b] font-['Outfit']">
              All Meetings
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#eff5f0] text-[#3d6e44] border border-[#cddfd0]">
              {meetings.length} Total
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#5a6b5c] mt-1">
            Real-time directory of all scheduled, active, and completed video conferences.
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#8ca18f] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, room code, or host name..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-[#e2ede4] text-xs sm:text-sm text-[#1a241b] placeholder-[#8ca18f] focus:outline-none focus:border-[#528d5a] transition-all shadow-2xs"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-[#528d5a] text-white shadow-2xs'
                : 'bg-white border border-[#e2ede4] text-[#5a6b5c] hover:bg-[#eff5f0]'
            }`}
          >
            All ({meetings.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
              statusFilter === 'active'
                ? 'bg-[#528d5a] text-white shadow-2xs'
                : 'bg-white border border-[#e2ede4] text-[#5a6b5c] hover:bg-[#eff5f0]'
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('scheduled')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
              statusFilter === 'scheduled'
                ? 'bg-[#528d5a] text-white shadow-2xs'
                : 'bg-white border border-[#e2ede4] text-[#5a6b5c] hover:bg-[#eff5f0]'
            }`}
          >
            Scheduled ({scheduledCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
              statusFilter === 'completed'
                ? 'bg-[#528d5a] text-white shadow-2xs'
                : 'bg-white border border-[#e2ede4] text-[#5a6b5c] hover:bg-[#eff5f0]'
            }`}
          >
            Completed ({completedCount})
          </button>
        </div>
      </div>

      {/* Meetings Table */}
      <div className="bg-white rounded-3xl border border-[#e2ede4] overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-[#eff5f0] text-[#528d5a] flex items-center justify-center mx-auto animate-pulse">
              <Video className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-[#5a6b5c]">Loading meetings from Firebase...</p>
          </div>
        ) : filteredMeetings.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-[#eff5f0] text-[#8ca18f] flex items-center justify-center mx-auto">
              <Video className="w-6 h-6" />
            </div>
            <p className="text-xs font-semibold text-[#1a241b]">No meetings found</p>
            <p className="text-[11px] text-[#8ca18f]">Try adjusting your search criteria or status filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#eff5f0]/60 border-b border-[#e2ede4] text-[#5a6b5c] font-['Outfit'] font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">Meeting Details</th>
                  <th className="py-3.5 px-4">Host</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Created Date</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eff5f0]">
                {filteredMeetings.map((m) => (
                  <tr key={m.id} className="hover:bg-[#f8f9f8] transition-colors">
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          m.status === 'active' 
                            ? 'bg-rose-50 text-rose-600 border border-rose-200' 
                            : 'bg-[#eff5f0] text-[#3d6e44] border border-[#cddfd0]'
                        }`}>
                          {m.status === 'active' ? (
                            <Radio className="w-4 h-4 animate-pulse" />
                          ) : (
                            <Video className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-[#1a241b] truncate font-['Outfit']">
                            {m.title}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-[10px] bg-[#eff5f0] text-[#3d6e44] px-1.5 py-0.5 rounded font-semibold">
                              {m.code}
                            </span>
                            <span className="text-[10px] text-[#8ca18f] font-mono truncate max-w-[120px]">
                              ID: {m.id}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#1a241b] truncate">{m.hostName}</div>
                      <div className="text-[10px] text-[#8ca18f] font-mono truncate max-w-[100px]">{m.hostId}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1.5 ${
                        m.status === 'active'
                          ? 'bg-rose-100 text-rose-700'
                          : m.status === 'completed' || m.status === 'ended'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {m.status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />}
                        {m.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#5a6b5c]">
                      {formatTimestamp(m.createdAt)}
                    </td>
                    <td className="py-3.5 px-4 sm:px-6 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopyLink(m.id)}
                          className="p-1.5 rounded-lg bg-[#eff5f0] hover:bg-[#e2ede4] text-[#3d6e44] transition-colors"
                          title="Copy Link"
                        >
                          {copiedId === m.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedMeeting(m)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#eff5f0] hover:bg-[#e2ede4] text-[#3d6e44] font-semibold text-[11px] inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Details</span>
                        </button>
                        <Link
                          to={`/meeting/${m.id}`}
                          className="px-2.5 py-1.5 rounded-lg bg-[#528d5a] hover:bg-[#437549] text-white font-semibold text-[11px] inline-flex items-center gap-1 shadow-2xs"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Meeting Detail Modal */}
      {selectedMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-[#e2ede4] max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#e2ede4]">
              <div>
                <h3 className="text-base font-bold text-[#1a241b] font-['Outfit']">
                  {selectedMeeting.title}
                </h3>
                <p className="text-xs text-[#8ca18f] font-mono">Code: {selectedMeeting.code}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMeeting(null)}
                className="p-1.5 rounded-lg text-[#8ca18f] hover:text-[#1a241b] hover:bg-[#eff5f0]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-[#f8f9f8] border border-[#e2ede4] space-y-1">
                <span className="text-[10px] text-[#8ca18f] uppercase font-bold tracking-wider">Host</span>
                <p className="font-bold text-[#1a241b]">{selectedMeeting.hostName}</p>
              </div>
              <div className="p-3 rounded-2xl bg-[#f8f9f8] border border-[#e2ede4] space-y-1">
                <span className="text-[10px] text-[#8ca18f] uppercase font-bold tracking-wider">Status</span>
                <p className="font-bold text-emerald-700">{selectedMeeting.status.toUpperCase()}</p>
              </div>
              <div className="p-3 rounded-2xl bg-[#f8f9f8] border border-[#e2ede4] space-y-1">
                <span className="text-[10px] text-[#8ca18f] uppercase font-bold tracking-wider">Created At</span>
                <p className="text-[#1a241b]">{formatTimestamp(selectedMeeting.createdAt)}</p>
              </div>
              <div className="p-3 rounded-2xl bg-[#f8f9f8] border border-[#e2ede4] space-y-1">
                <span className="text-[10px] text-[#8ca18f] uppercase font-bold tracking-wider">Participant Limit</span>
                <p className="font-bold text-[#3d6e44]">{selectedMeeting.participantLimit || 50} max</p>
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <Link
                to={`/meeting/${selectedMeeting.id}`}
                className="flex-1 py-2.5 rounded-xl bg-[#528d5a] text-white text-xs font-semibold hover:bg-[#437549] transition-colors text-center shadow-xs"
              >
                Join Video Room
              </Link>
              <button
                type="button"
                onClick={() => setSelectedMeeting(null)}
                className="py-2.5 px-4 rounded-xl bg-[#eff5f0] text-[#3d6e44] text-xs font-semibold hover:bg-[#e2ede4] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
