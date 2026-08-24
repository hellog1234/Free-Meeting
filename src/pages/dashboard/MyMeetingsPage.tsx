import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Calendar, 
  PlusCircle, 
  Copy, 
  Check, 
  Trash2, 
  Clock, 
  Video, 
  Users, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit3, 
  ExternalLink, 
  ShieldCheck, 
  Lock, 
  Sparkles, 
  AlertCircle, 
  RefreshCw, 
  SlidersHorizontal, 
  X, 
  Share2, 
  CalendarCheck2, 
  Info, 
  Bell,
  CheckCircle2
} from 'lucide-react';
import { Link, useRouter } from '../../context/RouterContext';
import { useAuth } from '../../context/AuthContext';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  deleteDoc, 
  updateDoc, 
  addDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Meeting } from '../../types';
import { getMeetingUrl, getMeetingCodeUrl } from '../../utils/meetingUtils';

export const MyMeetingsPage: React.FC = () => {
  const { user } = useAuth();
  const { navigate } = useRouter();

  // Data States
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'scheduled'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest');

  // UI Feedback States
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  // Modal States
  const [selectedMeetingForDetails, setSelectedMeetingForDetails] = useState<Meeting | null>(null);
  const [meetingToEdit, setMeetingToEdit] = useState<Meeting | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);
  const [meetingToDelete, setMeetingToDelete] = useState<Meeting | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [meetingToComplete, setMeetingToComplete] = useState<Meeting | null>(null);
  const [isCompleting, setIsCompleting] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Close dropdown when clicking outside
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setActiveDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch real Firebase meetings
  const fetchMeetings = () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const q = query(
        collection(db, 'meetings'),
        where('hostId', '==', user.id)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const items: Meeting[] = [];
          snapshot.forEach((docSnap) => {
            items.push({ id: docSnap.id, ...docSnap.data() } as Meeting);
          });
          setMeetings(items);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error('[MyMeetings] Firestore query error:', err);
          setError('Unable to load your meetings from the cloud. Please check your network connection.');
          setLoading(false);
        }
      );

      return unsubscribe;
    } catch (e: any) {
      console.error('[MyMeetings] Setup error:', e);
      setError('An unexpected error occurred while connecting to the database.');
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsub = fetchMeetings();
    return () => {
      if (unsub) unsub();
    };
  }, [user?.id]);

  // Copy URL with dynamic origin
  const handleCopyLink = (meeting: Meeting, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const url = getMeetingUrl(meeting.id);
    navigator.clipboard.writeText(url);
    setCopiedId(meeting.id);
    setTimeout(() => setCopiedId(null), 2200);
    setActiveDropdownId(null);
  };

  // Copy Full Invitation text
  const handleCopyInvitation = (meeting: Meeting, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const url = getMeetingUrl(meeting.id);
    const text = `Join my FreeMeet video meeting:\n\nTitle: ${meeting.title}\nRoom Code: ${meeting.code}\nLink: ${url}\n\nNo app download needed. Works directly in your browser.`;
    navigator.clipboard.writeText(text);
    setCopiedId(`invite_${meeting.id}`);
    setTimeout(() => setCopiedId(null), 2200);
    setActiveDropdownId(null);
  };

  // Copy Room Code
  const handleCopyCode = (meeting: Meeting, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(meeting.code);
    setCopiedId(`code_${meeting.id}`);
    setTimeout(() => setCopiedId(null), 2200);
    setActiveDropdownId(null);
  };

  // Trigger real meeting reminder notification
  const handleCreateReminder = async (meeting: Meeting, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!user?.id) return;
    try {
      const timeFormatted = formatMeetingDate(meeting.scheduledFor || meeting.createdAt).relative;
      await addDoc(collection(db, 'notifications'), {
        userId: user.id,
        type: 'reminder',
        title: 'Meeting Reminder',
        message: `Upcoming meeting "${meeting.title}" scheduled for ${timeFormatted}.`,
        meetingCode: meeting.code,
        actionUrl: `/meeting/${meeting.code}`,
        senderName: user.name || 'Workspace Host',
        senderAvatar: user.avatar || null,
        read: false,
        createdAt: serverTimestamp(),
      });
      setCopiedId(`remind_${meeting.id}`);
      setTimeout(() => setCopiedId(null), 2500);
      setActiveDropdownId(null);
    } catch (err) {
      console.error('Error creating reminder notification:', err);
    }
  };

  // Complete Meeting Action
  const confirmCompleteMeeting = async () => {
    if (!meetingToComplete) return;
    setIsCompleting(true);
    try {
      const now = Date.now();
      const startTime = meetingToComplete.startedAt?.toMillis 
        ? meetingToComplete.startedAt.toMillis() 
        : (meetingToComplete.createdAt?.toMillis ? meetingToComplete.createdAt.toMillis() : now);
      
      const diffMinutes = Math.max(1, Math.round((now - startTime) / (1000 * 60)));
      let durationText = `${diffMinutes} mins`;
      if (diffMinutes >= 60) {
        const hrs = Math.floor(diffMinutes / 60);
        const mins = diffMinutes % 60;
        durationText = mins > 0 ? `${hrs}h ${mins}m` : `${hrs} hrs`;
      }

      await updateDoc(doc(db, 'meetings', meetingToComplete.id), {
        status: 'completed',
        endedAt: serverTimestamp(),
        duration: durationText,
        durationMinutes: diffMinutes,
      });

      setSuccessToast(`Meeting "${meetingToComplete.title || 'Conference'}" has been marked as completed.`);
      setTimeout(() => setSuccessToast(null), 4000);
      setMeetingToComplete(null);
      if (selectedMeetingForDetails?.id === meetingToComplete.id) {
        setSelectedMeetingForDetails(null);
      }
    } catch (err) {
      console.error('Error completing meeting:', err);
    } finally {
      setIsCompleting(false);
    }
  };

  const handleOpenComplete = (meeting: Meeting, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setMeetingToComplete(meeting);
    setActiveDropdownId(null);
  };

  // Delete Meeting Action
  const confirmDeleteMeeting = async () => {
    if (!meetingToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'meetings', meetingToDelete.id));
      setMeetingToDelete(null);
    } catch (err) {
      console.error('Error deleting meeting:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Edit Meeting Action
  const handleOpenEdit = (meeting: Meeting, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setMeetingToEdit(meeting);
    setEditTitle(meeting.title || '');
    setEditDescription(meeting.description || '');
    setActiveDropdownId(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingToEdit || !editTitle.trim()) return;
    setIsSavingEdit(true);
    try {
      const meetingRef = doc(db, 'meetings', meetingToEdit.id);
      await updateDoc(meetingRef, {
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        updatedAt: serverTimestamp(),
      });
      setMeetingToEdit(null);
    } catch (err) {
      console.error('Error updating meeting:', err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Date Formatter
  const formatMeetingDate = (timestamp: any) => {
    if (!timestamp) return { full: 'Instant Session', relative: 'Live Room' };
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      
      const tomorrow = new Date();
      tomorrow.setDate(now.getDate() + 1);
      const isTomorrow = date.toDateString() === tomorrow.toDateString();

      const timeStr = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      const dateStr = date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });

      let relative = dateStr;
      if (isToday) relative = `Today at ${timeStr}`;
      else if (isTomorrow) relative = `Tomorrow at ${timeStr}`;
      else relative = `${dateStr} • ${timeStr}`;

      return {
        full: `${dateStr} at ${timeStr}`,
        relative,
      };
    } catch {
      return { full: 'Scheduled Session', relative: 'Upcoming' };
    }
  };

  // Filter and Sort Meetings
  // In My Meetings we display Active & Upcoming (scheduled) by default, or all active records
  const filteredMeetings = useMemo(() => {
    return meetings
      .filter((m) => {
        // Exclude completed or ended meetings unless explicitly searched
        const isActiveOrScheduled = m.status === 'scheduled' || m.status === 'active' || !m.endedAt;
        
        if (statusFilter === 'scheduled') {
          if (m.status !== 'scheduled') return false;
        } else if (statusFilter === 'active') {
          if (m.status !== 'active') return false;
        } else {
          // 'all' in My Meetings displays active and scheduled meetings
          if (m.status === 'completed' || m.status === 'ended') return false;
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = m.title?.toLowerCase().includes(q);
          const matchCode = m.code?.toLowerCase().includes(q);
          const matchHost = m.hostName?.toLowerCase().includes(q);
          const matchDesc = m.description?.toLowerCase().includes(q);
          return matchTitle || matchCode || matchHost || matchDesc;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'title') {
          return (a.title || '').localeCompare(b.title || '');
        }
        
        const timeA = a.scheduledFor?.toMillis 
          ? a.scheduledFor.toMillis() 
          : a.createdAt?.toMillis 
          ? a.createdAt.toMillis() 
          : new Date(a.scheduledFor || a.createdAt || 0).getTime();
        
        const timeB = b.scheduledFor?.toMillis 
          ? b.scheduledFor.toMillis() 
          : b.createdAt?.toMillis 
          ? b.createdAt.toMillis() 
          : new Date(b.scheduledFor || b.createdAt || 0).getTime();

        if (sortBy === 'oldest') {
          return timeA - timeB;
        }
        // Default newest
        return timeB - timeA;
      });
  }, [meetings, statusFilter, searchQuery, sortBy]);

  // Counts for tabs
  const scheduledCount = useMemo(() => meetings.filter(m => m.status === 'scheduled').length, [meetings]);
  const activeCount = useMemo(() => meetings.filter(m => m.status === 'active').length, [meetings]);
  const totalActiveUpcoming = useMemo(() => meetings.filter(m => m.status !== 'completed' && m.status !== 'ended').length, [meetings]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 font-sans">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#1a241b] font-['Outfit'] tracking-tight">
            My Meetings
          </h2>
          <p className="text-xs sm:text-sm text-[#5a6b5c] mt-0.5">
            Manage your scheduled conferences, live room codes, and instant invitations.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={fetchMeetings}
            className="p-2.5 rounded-xl bg-white hover:bg-[#eff5f0] border border-[#e2ede4] text-[#5a6b5c] hover:text-[#1a241b] transition-colors cursor-pointer"
            title="Refresh meetings"
            aria-label="Refresh meetings"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#528d5a]' : ''}`} />
          </button>
          <Link
            to="/dashboard/new-meeting"
            id="my-meetings-new-meeting-btn"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#528d5a] hover:bg-[#43754a] text-white font-bold text-xs rounded-xl shadow-xs shadow-[#528d5a]/20 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Meeting</span>
          </Link>
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
            All Active &amp; Scheduled ({totalActiveUpcoming})
          </button>
          <button
            onClick={() => setStatusFilter('scheduled')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              statusFilter === 'scheduled'
                ? 'bg-[#eff5f0] text-[#3d6e44] border border-[#cddfd0]'
                : 'text-[#5a6b5c] hover:bg-[#eff5f0]/50'
            }`}
          >
            Scheduled ({scheduledCount})
          </button>
          {activeCount > 0 && (
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                statusFilter === 'active'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                  : 'text-[#5a6b5c] hover:bg-[#eff5f0]/50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>In Progress ({activeCount})</span>
            </button>
          )}
        </div>

        {/* Search & Sort Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[#8ca18f] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title, code, or host..."
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

          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#8ca18f] shrink-0" />
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="w-full sm:w-auto bg-[#f8f9f8] border border-[#e2ede4] rounded-xl px-3 py-1.5 text-xs font-semibold text-[#1a241b] focus:outline-none focus:ring-2 focus:ring-[#528d5a] cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="title">Title (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Success Toast Banner */}
      {successToast && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successToast}</span>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="text-emerald-700 hover:text-emerald-900 p-1 rounded-lg hover:bg-emerald-100/50 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3b. Error Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchMeetings}
            className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors shrink-0 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* 4. Meetings Content State */}
      {loading ? (
        /* Loading Skeletons */
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-white rounded-2xl border border-[#e2ede4] p-5 animate-pulse flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs"
            >
              <div className="space-y-2 flex-1">
                <div className="h-5 bg-[#eff5f0] rounded-md w-1/3" />
                <div className="h-3.5 bg-[#f8f9f8] rounded-md w-1/2" />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-9 w-20 bg-[#eff5f0] rounded-xl" />
                <div className="h-9 w-24 bg-[#eff5f0] rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredMeetings.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-3xl border border-[#e2ede4] p-12 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-[#eff5f0] text-[#528d5a] flex items-center justify-center mx-auto mb-3.5 border border-[#cddfd0]">
            <Calendar className="w-7 h-7" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-[#1a241b] font-['Outfit']">
            {searchQuery ? 'No matching meetings found' : 'No active or scheduled meetings'}
          </h3>
          <p className="text-xs sm:text-sm text-[#5a6b5c] mt-1.5 max-w-md mx-auto leading-relaxed">
            {searchQuery
              ? `We couldn't find any conference matching "${searchQuery}". Try searching with a different room code or title.`
              : 'You have no scheduled calls or live rooms at the moment. Generate an instant meeting room code or schedule one for your team.'}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 bg-[#eff5f0] hover:bg-[#e2ede4] text-[#1a241b] text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Clear Search
              </button>
            )}
            <Link
              to="/dashboard/new-meeting"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#528d5a] hover:bg-[#43754a] text-white text-xs font-bold rounded-xl shadow-xs shadow-[#528d5a]/20 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create a Meeting</span>
            </Link>
          </div>
        </div>
      ) : (
        /* Meetings List Cards */
        <div className="space-y-3.5">
          {filteredMeetings.map((meeting) => {
            const dateInfo = formatMeetingDate(meeting.scheduledFor || meeting.createdAt);
            const isMenuOpen = activeDropdownId === meeting.id;

            return (
              <div
                key={meeting.id}
                className="bg-white rounded-2xl border border-[#e2ede4] p-4 sm:p-5 shadow-2xs hover:border-[#cddfd0] transition-all relative flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                {/* Meeting Meta Left Side */}
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-[#1a241b] font-['Outfit'] truncate">
                      {meeting.title || 'FreeMeet Video Conference'}
                    </h3>
                    
                    {/* Status Pill */}
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        meeting.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 animate-pulse'
                          : meeting.status === 'scheduled'
                          ? 'bg-[#eff5f0] text-[#3d6e44] border border-[#cddfd0]'
                          : 'bg-stone-100 text-[#5a6b5c]'
                      }`}
                    >
                      {meeting.status}
                    </span>

                    {/* Password protected badge */}
                    {meeting.password && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                        <Lock className="w-2.5 h-2.5" />
                        <span>Protected</span>
                      </span>
                    )}
                  </div>

                  {/* Metadata Row: Code, Date, Host, Participants */}
                  <div className="flex flex-wrap items-center gap-y-1.5 gap-x-3 text-xs text-[#5a6b5c]">
                    {/* Room Code */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#8ca18f] font-semibold">Code:</span>
                      <button
                        onClick={(e) => handleCopyCode(meeting, e)}
                        className="font-mono text-xs font-bold text-[#1a241b] bg-[#f8f9f8] hover:bg-[#eff5f0] px-2 py-0.5 rounded-lg border border-[#e2ede4] transition-colors flex items-center gap-1 cursor-pointer"
                        title="Click to copy code"
                      >
                        <span>{meeting.code}</span>
                        {copiedId === `code_${meeting.id}` ? (
                          <Check className="w-3 h-3 text-[#528d5a]" />
                        ) : (
                          <Copy className="w-3 h-3 text-[#8ca18f]" />
                        )}
                      </button>
                    </div>

                    <span className="text-[#cddfd0] hidden sm:inline">•</span>

                    {/* Date */}
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#528d5a] shrink-0" />
                      <span>{dateInfo.relative}</span>
                    </div>

                    <span className="text-[#cddfd0] hidden sm:inline">•</span>

                    {/* Host */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#8ca18f]">Host:</span>
                      <strong className="text-[#1a241b] font-medium">
                        {meeting.hostId === user?.id ? 'You' : (meeting.hostName || 'Host')}
                      </strong>
                    </div>

                    <span className="text-[#cddfd0] hidden sm:inline">•</span>

                    {/* Participants */}
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#528d5a] shrink-0" />
                      <span>
                        {meeting.participantCount || 0}
                        {meeting.participantLimit ? ` / ${meeting.participantLimit}` : ''} participants
                      </span>
                    </div>
                  </div>

                  {/* Optional Description */}
                  {meeting.description && (
                    <p className="text-xs text-[#5a6b5c] pt-0.5 line-clamp-1">
                      {meeting.description}
                    </p>
                  )}
                </div>

                {/* Actions Right Side */}
                <div className="flex items-center gap-2 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-[#e2ede4] justify-between lg:justify-end">
                  {/* Complete Meeting Button */}
                  <button
                    onClick={(e) => handleOpenComplete(meeting, e)}
                    id={`my-meetings-complete-btn-${meeting.id}`}
                    className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Mark meeting as completed"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Complete</span>
                  </button>

                  {/* Copy Link Button */}
                  <button
                    onClick={(e) => handleCopyLink(meeting, e)}
                    id={`my-meetings-copy-btn-${meeting.id}`}
                    className="px-3.5 py-2 rounded-xl bg-[#f8f9f8] hover:bg-[#eff5f0] border border-[#e2ede4] text-xs font-bold text-[#1a241b] flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Copy conference link"
                  >
                    {copiedId === meeting.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#528d5a]" />
                        <span className="text-[#528d5a]">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#8ca18f]" />
                        <span className="hidden sm:inline">Copy Link</span>
                      </>
                    )}
                  </button>

                  {/* Join / Start Button */}
                  <Link
                    to={`/meeting/${meeting.id}/prejoin`}
                    id={`my-meetings-join-btn-${meeting.id}`}
                    className="px-4 py-2 rounded-xl bg-[#528d5a] hover:bg-[#43754a] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs shadow-[#528d5a]/20 transition-all cursor-pointer"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Join</span>
                  </Link>

                  {/* More Dropdown Menu */}
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDropdownId(isMenuOpen ? null : meeting.id);
                      }}
                      id={`my-meetings-more-btn-${meeting.id}`}
                      className={`p-2 rounded-xl border text-[#5a6b5c] transition-colors cursor-pointer ${
                        isMenuOpen 
                          ? 'bg-[#eff5f0] text-[#1a241b] border-[#cddfd0]' 
                          : 'bg-white hover:bg-[#f8f9f8] border-[#e2ede4]'
                      }`}
                      title="More options"
                      aria-label="More options"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {isMenuOpen && (
                      <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-2xl border border-[#e2ede4] shadow-xl py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
                        {/* Complete Meeting */}
                        <button
                          onClick={(e) => handleOpenComplete(meeting, e)}
                          className="w-full px-3.5 py-2 text-left text-xs font-semibold text-emerald-700 hover:bg-emerald-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Mark as Completed</span>
                        </button>

                        {/* View Details */}
                        <button
                          onClick={() => {
                            setSelectedMeetingForDetails(meeting);
                            setActiveDropdownId(null);
                          }}
                          className="w-full px-3.5 py-2 text-left text-xs font-semibold text-[#1a241b] hover:bg-[#eff5f0] flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <Info className="w-3.5 h-3.5 text-[#528d5a]" />
                          <span>View Meeting Details</span>
                        </button>

                        {/* Copy Invite Text */}
                        <button
                          onClick={(e) => handleCopyInvitation(meeting, e)}
                          className="w-full px-3.5 py-2 text-left text-xs font-semibold text-[#1a241b] hover:bg-[#eff5f0] flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <Share2 className="w-3.5 h-3.5 text-[#528d5a]" />
                          <span>
                            {copiedId === `invite_${meeting.id}` ? 'Invitation Copied!' : 'Copy Full Invite'}
                          </span>
                        </button>

                        {/* Edit Title */}
                        <button
                          onClick={(e) => handleOpenEdit(meeting, e)}
                          className="w-full px-3.5 py-2 text-left text-xs font-semibold text-[#1a241b] hover:bg-[#eff5f0] flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-[#528d5a]" />
                          <span>Edit Meeting Title</span>
                        </button>

                        {/* Send / Set Reminder */}
                        <button
                          onClick={(e) => handleCreateReminder(meeting, e)}
                          className="w-full px-3.5 py-2 text-left text-xs font-semibold text-[#1a241b] hover:bg-[#eff5f0] flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <Bell className="w-3.5 h-3.5 text-amber-600" />
                          <span>
                            {copiedId === `remind_${meeting.id}` ? 'Reminder Created!' : 'Set Meeting Reminder'}
                          </span>
                        </button>

                        <div className="my-1 border-t border-[#e2ede4]" />

                        {/* Delete Meeting */}
                        <button
                          onClick={() => {
                            setMeetingToDelete(meeting);
                            setActiveDropdownId(null);
                          }}
                          className="w-full px-3.5 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>Delete Meeting</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Meeting Details Modal */}
      {selectedMeetingForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1a241b]/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-[#e2ede4] max-w-lg w-full p-6 sm:p-8 shadow-2xl relative animate-in zoom-in-95 duration-150 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#e2ede4]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#eff5f0] text-[#528d5a] flex items-center justify-center border border-[#cddfd0]">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1a241b] font-['Outfit']">
                    Meeting Details
                  </h3>
                  <span className="text-xs font-mono text-[#5a6b5c]">
                    {selectedMeetingForDetails.code}
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

            <div className="space-y-3.5 text-xs text-[#1a241b]">
              <div>
                <span className="text-[#8ca18f] font-bold uppercase tracking-wider text-[10px] block mb-1">
                  Conference Title
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

              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-[#f8f9f8] border border-[#e2ede4]">
                <div>
                  <span className="text-[#8ca18f] font-bold uppercase text-[10px] block">Status</span>
                  <span className="font-bold text-[#528d5a] uppercase text-xs">
                    {selectedMeetingForDetails.status}
                  </span>
                </div>
                <div>
                  <span className="text-[#8ca18f] font-bold uppercase text-[10px] block">Host</span>
                  <span className="font-bold text-[#1a241b] text-xs">
                    {selectedMeetingForDetails.hostName || 'Host'}
                  </span>
                </div>
                <div>
                  <span className="text-[#8ca18f] font-bold uppercase text-[10px] block">Scheduled For</span>
                  <span className="text-[#5a6b5c] text-xs">
                    {formatMeetingDate(selectedMeetingForDetails.scheduledFor || selectedMeetingForDetails.createdAt).full}
                  </span>
                </div>
                <div>
                  <span className="text-[#8ca18f] font-bold uppercase text-[10px] block">Capacity Limit</span>
                  <span className="text-[#5a6b5c] text-xs">
                    {selectedMeetingForDetails.participantLimit || 50} participants
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[#8ca18f] font-bold uppercase tracking-wider text-[10px] block mb-1">
                  Direct Room Link
                </span>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-[#f8f9f8] border border-[#e2ede4]">
                  <input
                    type="text"
                    readOnly
                    value={getMeetingUrl(selectedMeetingForDetails.id)}
                    className="w-full bg-transparent font-mono text-[11px] text-[#1a241b] outline-none select-all"
                  />
                  <button
                    onClick={() => handleCopyLink(selectedMeetingForDetails)}
                    className="px-3 py-1.5 bg-[#528d5a] text-white text-xs font-bold rounded-lg hover:bg-[#43754a] transition-colors shrink-0 cursor-pointer"
                  >
                    {copiedId === selectedMeetingForDetails.id ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#e2ede4] flex items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setMeetingToComplete(selectedMeetingForDetails);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Mark Completed</span>
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
                  to={`/meeting/${selectedMeetingForDetails.id}/prejoin`}
                  className="px-5 py-2 rounded-xl bg-[#528d5a] hover:bg-[#43754a] text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Join Room</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Edit Meeting Modal */}
      {meetingToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1a241b]/40 backdrop-blur-xs animate-in fade-in">
          <form
            onSubmit={handleSaveEdit}
            className="bg-white rounded-3xl border border-[#e2ede4] max-w-md w-full p-6 sm:p-8 shadow-2xl relative animate-in zoom-in-95 duration-150 space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#e2ede4]">
              <h3 className="text-base sm:text-lg font-bold text-[#1a241b] font-['Outfit']">
                Edit Meeting Info
              </h3>
              <button
                type="button"
                onClick={() => setMeetingToEdit(null)}
                className="p-1.5 rounded-xl hover:bg-[#eff5f0] text-[#5a6b5c]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#1a241b] uppercase tracking-wider mb-1">
                  Meeting Title
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-[#f8f9f8] border border-[#e2ede4] rounded-xl px-3.5 py-2 text-xs text-[#1a241b] focus:outline-none focus:ring-2 focus:ring-[#528d5a]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1a241b] uppercase tracking-wider mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Add notes or agenda..."
                  className="w-full bg-[#f8f9f8] border border-[#e2ede4] rounded-xl p-3 text-xs text-[#1a241b] focus:outline-none focus:ring-2 focus:ring-[#528d5a] resize-none"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[#e2ede4] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setMeetingToEdit(null)}
                className="px-4 py-2 rounded-xl bg-[#eff5f0] text-[#1a241b] text-xs font-bold hover:bg-[#e2ede4] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingEdit}
                className="px-5 py-2 rounded-xl bg-[#528d5a] hover:bg-[#43754a] text-white text-xs font-bold transition-all disabled:opacity-60 cursor-pointer"
              >
                {isSavingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 7. Delete Confirmation Modal */}
      {meetingToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1a241b]/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-[#e2ede4] max-w-sm w-full p-6 shadow-2xl relative animate-in zoom-in-95 duration-150 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-[#1a241b] font-['Outfit']">
                Delete this meeting?
              </h3>
              <p className="text-xs text-[#5a6b5c]">
                Are you sure you want to delete <strong className="text-[#1a241b]">"{meetingToDelete.title}"</strong>? This will invalidate the room link for all attendees.
              </p>
            </div>

            <div className="pt-2 flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setMeetingToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#eff5f0] text-[#1a241b] text-xs font-bold hover:bg-[#e2ede4] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteMeeting}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all disabled:opacity-60 cursor-pointer"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 8. Complete Confirmation Modal */}
      {meetingToComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1a241b]/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-[#e2ede4] max-w-sm w-full p-6 shadow-2xl relative animate-in zoom-in-95 duration-150 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-[#1a241b] font-['Outfit']">
                Complete this meeting?
              </h3>
              <p className="text-xs text-[#5a6b5c]">
                Are you sure you want to mark <strong className="text-[#1a241b]">"{meetingToComplete.title || 'Conference'}"</strong> as completed? It will be archived to your Meeting History.
              </p>
            </div>

            <div className="pt-2 flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setMeetingToComplete(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#eff5f0] text-[#1a241b] text-xs font-bold hover:bg-[#e2ede4] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmCompleteMeeting}
                disabled={isCompleting}
                className="flex-1 py-2.5 rounded-xl bg-[#528d5a] hover:bg-[#43754a] text-white text-xs font-bold transition-all disabled:opacity-60 cursor-pointer shadow-xs shadow-[#528d5a]/20 flex items-center justify-center gap-1.5"
              >
                {isCompleting ? (
                  <span>Completing...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Complete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
