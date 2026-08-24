import React, { useState, useEffect, useMemo } from 'react';
import { 
  History as HistoryIcon, 
  Video, 
  Clock, 
  Users, 
  Calendar, 
  ShieldCheck,
  Search,
  ArrowDownToLine,
  ExternalLink,
  Copy,
  Check,
  Filter,
  RefreshCw,
  AlertCircle,
  X,
  Info,
  Sparkles,
  SlidersHorizontal,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Link, useRouter } from '../../context/RouterContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Meeting } from '../../types';
import { getMeetingUrl } from '../../utils/meetingUtils';

export const HistoryPage: React.FC = () => {
  const { user } = useAuth();
  const { navigate } = useRouter();

  // Data States
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'ended'>('all');
  const [timeframeFilter, setTimeframeFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'duration'>('newest');

  // UI Feedback & Modals
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedMeetingForDetails, setSelectedMeetingForDetails] = useState<Meeting | null>(null);

  // Fetch real Firebase meetings (host or participant)
  const fetchHistory = () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const hostedMeetingsMap = new Map<string, Meeting>();
    const attendedMeetingsMap = new Map<string, Meeting>();

    const updateCombinedMeetings = () => {
      const combinedMap = new Map<string, Meeting>();
      hostedMeetingsMap.forEach((m, id) => combinedMap.set(id, m));
      attendedMeetingsMap.forEach((m, id) => combinedMap.set(id, m));
      setMeetings(Array.from(combinedMap.values()));
      setLoading(false);
      setError(null);
    };

    try {
      // 1. Query meetings hosted by user
      const hostQuery = query(
        collection(db, 'meetings'),
        where('hostId', '==', user.id)
      );

      // 2. Query meetings where user is in participantIds
      const participantQuery = query(
        collection(db, 'meetings'),
        where('participantIds', 'array-contains', user.id)
      );

      const unsubHost = onSnapshot(
        hostQuery,
        (snapshot) => {
          hostedMeetingsMap.clear();
          snapshot.forEach((docSnap) => {
            hostedMeetingsMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as Meeting);
          });
          updateCombinedMeetings();
        },
        (err) => {
          console.error('[History] Host query error:', err);
          setError('Unable to load meeting history from the cloud. Please verify your connection.');
          setLoading(false);
        }
      );

      const unsubParticipant = onSnapshot(
        participantQuery,
        (snapshot) => {
          attendedMeetingsMap.clear();
          snapshot.forEach((docSnap) => {
            attendedMeetingsMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as Meeting);
          });
          updateCombinedMeetings();
        },
        (err) => {
          console.warn('[History] Participant query error:', err);
          // If array-contains fails or is empty, still keep hosted meetings
          updateCombinedMeetings();
        }
      );

      return () => {
        unsubHost();
        unsubParticipant();
      };
    } catch (e) {
      console.error('[History] Setup error:', e);
      setError('An unexpected error occurred while loading history.');
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsub = fetchHistory();
    return () => {
      if (unsub) unsub();
    };
  }, [user?.id]);

  // Format Duration
  const calculateDuration = (meeting: Meeting): string => {
    if (meeting.createdAt && meeting.endedAt) {
      try {
        const start = meeting.createdAt.toMillis ? meeting.createdAt.toMillis() : new Date(meeting.createdAt).getTime();
        const end = meeting.endedAt.toMillis ? meeting.endedAt.toMillis() : new Date(meeting.endedAt).getTime();
        const diffMinutes = Math.max(1, Math.round((end - start) / (1000 * 60)));
        if (diffMinutes < 60) return `${diffMinutes} mins`;
        const hrs = Math.floor(diffMinutes / 60);
        const mins = diffMinutes % 60;
        return mins > 0 ? `${hrs}h ${mins}m` : `${hrs} hrs`;
      } catch (e) {}
    }
    if (meeting.durationMinutes) {
      if (meeting.durationMinutes < 60) return `${meeting.durationMinutes} mins`;
      const hrs = Math.floor(meeting.durationMinutes / 60);
      const mins = meeting.durationMinutes % 60;
      return mins > 0 ? `${hrs}h ${mins}m` : `${hrs} hrs`;
    }
    return '45 mins';
  };

  // Format Date & Time
  const formatDate = (timestamp: any) => {
    if (!timestamp) return { date: 'Past Session', time: '' };
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return {
        date: date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        time: date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }),
        full: date.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }),
      };
    } catch {
      return { date: 'Concluded', time: '', full: 'Concluded Session' };
    }
  };

  // Copy URL with dynamic origin
  const handleCopyLink = (meeting: Meeting, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const url = getMeetingUrl(meeting.id);
    navigator.clipboard.writeText(url);
    setCopiedId(meeting.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Copy Meeting Summary
  const handleCopySummary = (meeting: Meeting) => {
    const duration = calculateDuration(meeting);
    const dateFormatted = formatDate(meeting.createdAt).full;
    const summary = `FreeMeet Meeting Summary:\n\nTitle: ${meeting.title}\nRoom Code: ${meeting.code}\nHost: ${meeting.hostName || 'Host'}\nDate: ${dateFormatted}\nDuration: ${duration}\nStatus: ${meeting.status}\nAttendees: ${meeting.participantCount || 0}`;
    navigator.clipboard.writeText(summary);
    setCopiedId(`summary_${meeting.id}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter and Sort past / completed meetings
  const filteredHistory = useMemo(() => {
    return meetings
      .filter((m) => {
        // Only include completed, ended, or past records with an endedAt timestamp
        const isHistory = m.status === 'completed' || m.status === 'ended' || m.endedAt != null;
        if (!isHistory) return false;

        // Status Filter
        if (statusFilter === 'completed' && m.status !== 'completed') return false;
        if (statusFilter === 'ended' && m.status !== 'ended') return false;

        // Timeframe filter
        if (timeframeFilter !== 'all' && m.createdAt) {
          const itemTime = m.createdAt.toMillis ? m.createdAt.toMillis() : new Date(m.createdAt).getTime();
          const now = Date.now();
          const oneDay = 24 * 60 * 60 * 1000;
          if (timeframeFilter === 'today' && now - itemTime > oneDay) return false;
          if (timeframeFilter === 'week' && now - itemTime > 7 * oneDay) return false;
          if (timeframeFilter === 'month' && now - itemTime > 30 * oneDay) return false;
        }

        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = m.title?.toLowerCase().includes(q);
          const matchCode = m.code?.toLowerCase().includes(q);
          const matchHost = m.hostName?.toLowerCase().includes(q);
          return matchTitle || matchCode || matchHost;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'duration') {
          const durA = a.durationMinutes || 0;
          const durB = b.durationMinutes || 0;
          return durB - durA;
        }

        const timeA = a.endedAt?.toMillis 
          ? a.endedAt.toMillis() 
          : a.createdAt?.toMillis 
          ? a.createdAt.toMillis() 
          : new Date(a.createdAt || 0).getTime();
        
        const timeB = b.endedAt?.toMillis 
          ? b.endedAt.toMillis() 
          : b.createdAt?.toMillis 
          ? b.createdAt.toMillis() 
          : new Date(b.createdAt || 0).getTime();

        if (sortBy === 'oldest') {
          return timeA - timeB;
        }
        return timeB - timeA;
      });
  }, [meetings, statusFilter, timeframeFilter, searchQuery, sortBy]);

  // Counts for tabs
  const completedCount = useMemo(() => meetings.filter(m => m.status === 'completed').length, [meetings]);
  const endedCount = useMemo(() => meetings.filter(m => m.status === 'ended').length, [meetings]);
  const totalHistoryCount = useMemo(() => meetings.filter(m => m.status === 'completed' || m.status === 'ended' || m.endedAt != null).length, [meetings]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 font-sans">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#1a241b] font-['Outfit'] tracking-tight">
            Meeting History
          </h2>
          <p className="text-xs sm:text-sm text-[#5a6b5c] mt-0.5">
            Audit logs and records of all your concluded video conferences.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchHistory}
            className="p-2.5 rounded-xl bg-white hover:bg-[#eff5f0] border border-[#e2ede4] text-[#5a6b5c] hover:text-[#1a241b] transition-colors cursor-pointer"
            title="Refresh history"
            aria-label="Refresh history"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#528d5a]' : ''}`} />
          </button>
          <div className="px-3.5 py-2 rounded-xl bg-[#eff5f0] border border-[#cddfd0] text-xs font-semibold text-[#3d6e44] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#528d5a]" />
            <span>Zero Audio/Video Recordings Stored</span>
          </div>
        </div>
      </div>

      {/* 2. Filter, Search & Sort Bar */}
      <div className="bg-white rounded-2xl border border-[#e2ede4] p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 shadow-xs">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              statusFilter === 'all'
                ? 'bg-[#eff5f0] text-[#3d6e44] border border-[#cddfd0]'
                : 'text-[#5a6b5c] hover:bg-[#eff5f0]/50'
            }`}
          >
            All History ({totalHistoryCount})
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              statusFilter === 'completed'
                ? 'bg-[#eff5f0] text-[#3d6e44] border border-[#cddfd0]'
                : 'text-[#5a6b5c] hover:bg-[#eff5f0]/50'
            }`}
          >
            Completed ({completedCount})
          </button>
          <button
            onClick={() => setStatusFilter('ended')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              statusFilter === 'ended'
                ? 'bg-[#eff5f0] text-[#3d6e44] border border-[#cddfd0]'
                : 'text-[#5a6b5c] hover:bg-[#eff5f0]/50'
            }`}
          >
            Ended ({endedCount})
          </button>
        </div>

        {/* Search, Timeframe & Sort Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          {/* Search Box */}
          <div className="relative w-full sm:w-60">
            <Search className="w-4 h-4 text-[#8ca18f] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title, code, host..."
              className="w-full bg-[#f8f9f8] border border-[#e2ede4] rounded-xl pl-9 pr-8 py-1.5 text-xs text-[#1a241b] placeholder:text-[#8ca18f] focus:outline-none focus:ring-2 focus:ring-[#528d5a]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8ca18f] hover:text-[#1a241b]"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Timeframe Dropdown */}
          <select
            value={timeframeFilter}
            onChange={(e: any) => setTimeframeFilter(e.target.value)}
            className="w-full sm:w-auto bg-[#f8f9f8] border border-[#e2ede4] rounded-xl px-3 py-1.5 text-xs font-semibold text-[#1a241b] focus:outline-none focus:ring-2 focus:ring-[#528d5a] cursor-pointer"
          >
            <option value="all">All Time</option>
            <option value="today">Past 24 Hours</option>
            <option value="week">Past 7 Days</option>
            <option value="month">Past 30 Days</option>
          </select>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            className="w-full sm:w-auto bg-[#f8f9f8] border border-[#e2ede4] rounded-xl px-3 py-1.5 text-xs font-semibold text-[#1a241b] focus:outline-none focus:ring-2 focus:ring-[#528d5a] cursor-pointer"
          >
            <option value="newest">Most Recent</option>
            <option value="oldest">Oldest First</option>
            <option value="duration">Longest Duration</option>
          </select>
        </div>
      </div>

      {/* 3. Error Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchHistory}
            className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors shrink-0 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* 4. History Table & Cards Container */}
      <div className="bg-white rounded-3xl border border-[#e2ede4] shadow-xs overflow-hidden">
        {loading ? (
          /* Loading State */
          <div className="p-12 text-center space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-[#528d5a] border-t-transparent animate-spin mx-auto" />
            <p className="text-xs text-[#8ca18f] font-medium">
              Loading past meeting records from cloud...
            </p>
          </div>
        ) : filteredHistory.length === 0 ? (
          /* Empty State */
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#eff5f0] text-[#528d5a] flex items-center justify-center mx-auto mb-3.5 border border-[#cddfd0]">
              <HistoryIcon className="w-7 h-7" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-[#1a241b] font-['Outfit']">
              {searchQuery || timeframeFilter !== 'all' ? 'No matching history records' : 'No completed meetings yet'}
            </h3>
            <p className="text-xs sm:text-sm text-[#5a6b5c] mt-1 max-w-sm mx-auto leading-relaxed">
              {searchQuery || timeframeFilter !== 'all'
                ? 'Try broadening your search keywords or resetting your timeframe filter.'
                : 'Concluded meetings and session records will automatically be logged here for compliance and history.'}
            </p>
            {(searchQuery || timeframeFilter !== 'all') ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setTimeframeFilter('all');
                  setStatusFilter('all');
                }}
                className="mt-5 px-4 py-2 bg-[#eff5f0] hover:bg-[#e2ede4] text-[#1a241b] text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            ) : (
              <div className="mt-5">
                <Link
                  to="/dashboard/new-meeting"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#528d5a] hover:bg-[#43754a] text-white text-xs font-bold rounded-xl shadow-xs shadow-[#528d5a]/20 transition-all cursor-pointer"
                >
                  <Video className="w-4 h-4" />
                  <span>Start Your First Meeting</span>
                </Link>
              </div>
            )}
          </div>
        ) : (
          /* History Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f8f9f8] border-b border-[#e2ede4] text-[#5a6b5c] font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-4 px-5">Meeting Name</th>
                  <th className="py-4 px-4">Room Code</th>
                  <th className="py-4 px-4">Date &amp; Time</th>
                  <th className="py-4 px-4">Host</th>
                  <th className="py-4 px-4">Participants</th>
                  <th className="py-4 px-4">Duration</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2ede4]">
                {filteredHistory.map((m) => {
                  const dateInfo = formatDate(m.createdAt);
                  const duration = calculateDuration(m);
                  const isHost = m.hostId === user?.id;

                  return (
                    <tr
                      key={m.id}
                      onClick={() => setSelectedMeetingForDetails(m)}
                      className="hover:bg-[#eff5f0]/40 transition-colors cursor-pointer group"
                    >
                      {/* Meeting Name */}
                      <td className="py-4 px-5 font-bold text-[#1a241b] font-['Outfit'] text-sm">
                        <div className="flex items-center gap-2">
                          <span className="group-hover:text-[#528d5a] transition-colors truncate max-w-[220px]">
                            {m.title || 'FreeMeet Session'}
                          </span>
                        </div>
                      </td>

                      {/* Code */}
                      <td className="py-4 px-4 font-mono text-[#5a6b5c]">
                        <span className="bg-[#f8f9f8] border border-[#e2ede4] px-2 py-0.5 rounded text-[11px] text-[#1a241b]">
                          {m.code}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-4 px-4 text-[#5a6b5c] whitespace-nowrap">
                        <div className="font-semibold text-[#1a241b]">{dateInfo.date}</div>
                        <div className="text-[11px] text-[#8ca18f]">{dateInfo.time}</div>
                      </td>

                      {/* Host */}
                      <td className="py-4 px-4 text-[#1a241b]">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-md bg-[#eff5f0] text-[#528d5a] flex items-center justify-center font-bold text-[10px]">
                            {isHost ? 'Y' : (m.hostName?.charAt(0) || 'H')}
                          </div>
                          <span className="font-medium text-xs">
                            {isHost ? 'You' : (m.hostName || 'Host')}
                          </span>
                        </div>
                      </td>

                      {/* Participants */}
                      <td className="py-4 px-4 text-[#5a6b5c]">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-[#8ca18f]" />
                          <span>{m.participantCount || 0} attendees</span>
                        </div>
                      </td>

                      {/* Duration */}
                      <td className="py-4 px-4 font-mono text-[#1a241b] font-semibold">
                        {duration}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            m.status === 'completed'
                              ? 'bg-[#eff5f0] text-[#3d6e44] border border-[#cddfd0]'
                              : m.status === 'ended'
                              ? 'bg-stone-100 text-stone-700 border border-stone-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>

                      {/* Details Button */}
                      <td className="py-4 px-5 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMeetingForDetails(m);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-white group-hover:bg-[#eff5f0] border border-[#e2ede4] text-xs font-semibold text-[#528d5a] inline-flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <span>Details</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Meeting Details Modal */}
      {selectedMeetingForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1a241b]/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-[#e2ede4] max-w-lg w-full p-6 sm:p-8 shadow-2xl relative animate-in zoom-in-95 duration-150 space-y-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#e2ede4]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#eff5f0] text-[#528d5a] flex items-center justify-center border border-[#cddfd0]">
                  <HistoryIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1a241b] font-['Outfit']">
                    Conference Record
                  </h3>
                  <span className="text-xs font-mono text-[#5a6b5c]">
                    Code: {selectedMeetingForDetails.code}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedMeetingForDetails(null)}
                className="p-1.5 rounded-xl hover:bg-[#eff5f0] text-[#5a6b5c] hover:text-[#1a241b] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Details Grid */}
            <div className="space-y-4 text-xs text-[#1a241b]">
              <div>
                <span className="text-[#8ca18f] font-bold uppercase tracking-wider text-[10px] block mb-1">
                  Meeting Name
                </span>
                <p className="text-sm font-bold text-[#1a241b]">
                  {selectedMeetingForDetails.title}
                </p>
                {selectedMeetingForDetails.description && (
                  <p className="text-xs text-[#5a6b5c] mt-1">
                    {selectedMeetingForDetails.description}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-[#f8f9f8] border border-[#e2ede4]">
                <div>
                  <span className="text-[#8ca18f] font-bold uppercase text-[10px] block">Status</span>
                  <span className="font-bold text-[#3d6e44] uppercase text-xs">
                    {selectedMeetingForDetails.status}
                  </span>
                </div>
                <div>
                  <span className="text-[#8ca18f] font-bold uppercase text-[10px] block">Duration</span>
                  <span className="font-bold text-[#1a241b] text-xs font-mono">
                    {calculateDuration(selectedMeetingForDetails)}
                  </span>
                </div>
                <div>
                  <span className="text-[#8ca18f] font-bold uppercase text-[10px] block">Host</span>
                  <span className="font-semibold text-[#1a241b] text-xs">
                    {selectedMeetingForDetails.hostId === user?.id ? 'You (Host)' : (selectedMeetingForDetails.hostName || 'Host')}
                  </span>
                </div>
                <div>
                  <span className="text-[#8ca18f] font-bold uppercase text-[10px] block">Recorded Attendees</span>
                  <span className="font-semibold text-[#1a241b] text-xs">
                    {selectedMeetingForDetails.participantCount || 0} participants
                  </span>
                </div>
                <div className="col-span-2 pt-2 border-t border-[#e2ede4]/80">
                  <span className="text-[#8ca18f] font-bold uppercase text-[10px] block">Date &amp; Time</span>
                  <span className="font-medium text-[#1a241b] text-xs">
                    {formatDate(selectedMeetingForDetails.createdAt).full}
                  </span>
                </div>
              </div>

              {/* Security & Privacy Banner */}
              <div className="p-3 rounded-xl bg-[#eff5f0] border border-[#cddfd0] flex items-center gap-2.5 text-xs text-[#3d6e44]">
                <ShieldCheck className="w-4 h-4 text-[#528d5a] shrink-0" />
                <span>Zero server logs of audio, video, or screen sharing. Peer-to-peer WebRTC encrypted.</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-[#e2ede4] flex flex-wrap items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={() => handleCopySummary(selectedMeetingForDetails)}
                className="px-3.5 py-2 rounded-xl bg-[#f8f9f8] hover:bg-[#eff5f0] border border-[#e2ede4] text-[#1a241b] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedId === `summary_${selectedMeetingForDetails.id}` ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#528d5a]" />
                    <span className="text-[#528d5a]">Summary Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#8ca18f]" />
                    <span>Copy Summary</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedMeetingForDetails(null)}
                  className="px-4 py-2 rounded-xl bg-[#eff5f0] text-[#1a241b] text-xs font-bold hover:bg-[#e2ede4] transition-colors cursor-pointer"
                >
                  Close
                </button>
                <Link
                  to="/dashboard/new-meeting"
                  className="px-4 py-2 rounded-xl bg-[#528d5a] hover:bg-[#43754a] text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Start New Meeting</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
