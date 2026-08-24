import React, { useState, useEffect } from 'react';
import { 
  History, 
  Search, 
  Download, 
  Calendar, 
  Clock, 
  Users, 
  CheckCircle2,
  Video,
  ExternalLink
} from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Meeting } from '../../types';

export const AdminHistoryPage: React.FC = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    try {
      const q = query(
        collection(db, 'meetings'),
        orderBy('createdAt', 'desc')
      );

      const unsub = onSnapshot(q, (snapshot) => {
        const list: Meeting[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          const status = d.status || 'scheduled';
          if (status === 'completed' || status === 'ended') {
            list.push({
              id: docSnap.id,
              hostId: d.hostId || '',
              hostName: d.hostName || 'Meeting Host',
              title: d.title || 'Completed Meeting',
              code: d.code || docSnap.id,
              status,
              durationMinutes: d.durationMinutes || 0,
              participantCount: d.participantCount || 0,
              createdAt: d.createdAt,
              startedAt: d.startedAt,
              endedAt: d.endedAt,
            });
          }
        });
        setMeetings(list);
        setLoading(false);
      }, (err) => {
        console.warn('Meeting history listener error:', err);
        setLoading(false);
      });

      return () => unsub();
    } catch (e) {
      console.warn('Error setting up history listener:', e);
      setLoading(false);
    }
  }, []);

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
        year: 'numeric',
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (e) {
      return 'N/A';
    }
  };

  const calculateDuration = (startedAt: any, endedAt: any, fallbackMins?: number): string => {
    if (fallbackMins && fallbackMins > 0) return `${fallbackMins}m`;
    if (!startedAt || !endedAt) return 'Brief session';

    try {
      const start = startedAt.toDate ? startedAt.toDate() : new Date(startedAt.seconds ? startedAt.seconds * 1000 : startedAt);
      const end = endedAt.toDate ? endedAt.toDate() : new Date(endedAt.seconds ? endedAt.seconds * 1000 : endedAt);
      const diffMs = end.getTime() - start.getTime();
      if (isNaN(diffMs) || diffMs <= 0) return 'Brief session';

      const totalMins = Math.round(diffMs / 60000);
      if (totalMins < 60) return `${totalMins} mins`;
      const hours = Math.floor(totalMins / 60);
      const mins = totalMins % 60;
      return `${hours}h ${mins}m`;
    } catch (e) {
      return 'Brief session';
    }
  };

  const exportCSV = () => {
    if (meetings.length === 0) return;
    const headers = ['Meeting ID', 'Title', 'Code', 'Host Name', 'Host ID', 'Status', 'Created Date'];
    const rows = meetings.map(m => [
      `"${m.id}"`,
      `"${m.title.replace(/"/g, '""')}"`,
      `"${m.code}"`,
      `"${m.hostName.replace(/"/g, '""')}"`,
      `"${m.hostId}"`,
      `"${m.status}"`,
      `"${formatTimestamp(m.createdAt)}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `freemeet_meeting_history_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredMeetings = meetings.filter(m => 
    m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.hostName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-[#e2ede4] p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-[#1a241b] font-['Outfit']">
              Meeting History
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#eff5f0] text-[#3d6e44] border border-[#cddfd0]">
              {meetings.length} Completed
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#5a6b5c] mt-1">
            Audit log of all completed and concluded video conference sessions.
          </p>
        </div>
        <button
          type="button"
          onClick={exportCSV}
          disabled={meetings.length === 0}
          className="px-4 py-2.5 rounded-xl bg-[#528d5a] hover:bg-[#437549] text-white text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
        >
          <Download className="w-4 h-4" />
          <span>Export History (CSV)</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative w-full">
        <Search className="w-4 h-4 text-[#8ca18f] absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search concluded meetings by title, room code, or host..."
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-[#e2ede4] text-xs sm:text-sm text-[#1a241b] placeholder-[#8ca18f] focus:outline-none focus:border-[#528d5a] transition-all shadow-2xs"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-[#e2ede4] overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-[#eff5f0] text-[#528d5a] flex items-center justify-center mx-auto animate-pulse">
              <History className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-[#5a6b5c]">Loading meeting history from Firebase...</p>
          </div>
        ) : filteredMeetings.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-[#eff5f0] text-[#8ca18f] flex items-center justify-center mx-auto">
              <History className="w-6 h-6" />
            </div>
            <p className="text-xs font-semibold text-[#1a241b]">No completed meetings yet</p>
            <p className="text-[11px] text-[#8ca18f]">Concluded calls will be archived here automatically.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#eff5f0]/60 border-b border-[#e2ede4] text-[#5a6b5c] font-['Outfit'] font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">Meeting / Code</th>
                  <th className="py-3.5 px-4">Host</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Duration</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eff5f0]">
                {filteredMeetings.map((m) => (
                  <tr key={m.id} className="hover:bg-[#f8f9f8] transition-colors">
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="font-bold text-[#1a241b] font-['Outfit']">
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
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#1a241b]">{m.hostName}</div>
                      <div className="text-[10px] text-[#8ca18f] font-mono truncate max-w-[100px]">{m.hostId}</div>
                    </td>
                    <td className="py-3.5 px-4 text-[#5a6b5c]">
                      {formatTimestamp(m.createdAt)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-[#5a6b5c]">
                        <Clock className="w-3.5 h-3.5 text-[#8ca18f]" />
                        <span>{calculateDuration(m.startedAt, m.endedAt, m.durationMinutes)}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 sm:px-6 text-right">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">
                        COMPLETED
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
