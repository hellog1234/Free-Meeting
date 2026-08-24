import React, { useState, useEffect } from 'react';
import { 
  Video, 
  PlusCircle, 
  LogIn, 
  Calendar, 
  Clock, 
  Users, 
  ArrowRight, 
  Copy, 
  Check, 
  Sparkles, 
  Share2, 
  History as HistoryIcon,
  ShieldCheck,
  CalendarCheck2,
  CheckCircle2,
  ExternalLink,
  Zap,
  Radio
} from 'lucide-react';
import { Link, useRouter } from '../../context/RouterContext';
import { useAuth } from '../../context/AuthContext';
import { collection, query, where, getDocs, orderBy, limit, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Meeting } from '../../types';
import { getMeetingUrl, getMeetingCodeUrl } from '../../utils/meetingUtils';
import dashboardHeroImg from '../../assets/images/dashboard_workspace_hero_1787393221775.jpg';

export const DashboardHomePage: React.FC = () => {
  const { user } = useAuth();
  const { navigate } = useRouter();

  // Statistics State (Real Firebase Data, 0 if empty)
  const [stats, setStats] = useState({
    totalMeetings: 0,
    upcomingMeetings: 0,
    completedMeetings: 0,
    totalContacts: 0,
  });

  const [upcomingMeetings, setUpcomingMeetings] = useState<Meeting[]>([]);
  const [recentMeetings, setRecentMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Invite Modal / Popover State
  const [showInviteModal, setShowInviteModal] = useState<boolean>(false);
  const [instantRoomCode] = useState<string>(() => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const segment = (len: number) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `${segment(3)}-${segment(4)}-${segment(3)}`;
  });
  const [copiedInvite, setCopiedInvite] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    let isMounted = true;

    const hostedMap = new Map<string, Meeting>();
    const attendedMap = new Map<string, Meeting>();

    const updateAllMeetings = () => {
      if (!isMounted) return;
      const combinedMap = new Map<string, Meeting>();
      hostedMap.forEach((m, id) => combinedMap.set(id, m));
      attendedMap.forEach((m, id) => combinedMap.set(id, m));
      const allMeetings = Array.from(combinedMap.values());

      const upcoming = allMeetings.filter(m => m.status === 'scheduled');
      const completed = allMeetings.filter(m => m.status === 'completed' || m.status === 'ended');

      // Sort upcoming by scheduled date
      upcoming.sort((a, b) => {
        const timeA = a.scheduledFor?.toMillis ? a.scheduledFor.toMillis() : new Date(a.scheduledFor || a.createdAt).getTime();
        const timeB = b.scheduledFor?.toMillis ? b.scheduledFor.toMillis() : new Date(b.scheduledFor || b.createdAt).getTime();
        return timeA - timeB;
      });

      // Sort completed/recent by createdAt descending
      const recent = [...allMeetings].sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime();
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime();
        return timeB - timeA;
      });

      setUpcomingMeetings(upcoming.slice(0, 3));
      setRecentMeetings(recent.slice(0, 4));

      setStats(prev => ({
        ...prev,
        totalMeetings: allMeetings.length,
        upcomingMeetings: upcoming.length,
        completedMeetings: completed.length,
      }));
      setLoading(false);
    };

    // Real-time listener for user's hosted meetings
    const meetingsHostQuery = query(
      collection(db, 'meetings'),
      where('hostId', '==', user.id)
    );

    // Real-time listener for meetings where user participated
    const meetingsPartQuery = query(
      collection(db, 'meetings'),
      where('participantIds', 'array-contains', user.id)
    );

    // Real-time listener for user's contacts
    const contactsQuery = query(
      collection(db, 'contacts'),
      where('userId', '==', user.id)
    );

    const unsubHost = onSnapshot(meetingsHostQuery, (snapshot) => {
      hostedMap.clear();
      snapshot.forEach((docSnap) => {
        hostedMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as Meeting);
      });
      updateAllMeetings();
    }, (error) => {
      console.warn('Meetings query warning:', error);
      setLoading(false);
    });

    const unsubPart = onSnapshot(meetingsPartQuery, (snapshot) => {
      attendedMap.clear();
      snapshot.forEach((docSnap) => {
        attendedMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as Meeting);
      });
      updateAllMeetings();
    }, (error) => {
      console.warn('Attended meetings query warning:', error);
    });

    const unsubContacts = onSnapshot(contactsQuery, (snapshot) => {
      if (!isMounted) return;
      setStats(prev => ({
        ...prev,
        totalContacts: snapshot.size,
      }));
    }, (error) => {
      console.warn('Contacts query warning:', error);
    });

    return () => {
      isMounted = false;
      unsubHost();
      unsubPart();
      unsubContacts();
    };
  }, [user?.id]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const copyInviteLink = () => {
    const inviteUrl = getMeetingCodeUrl(instantRoomCode);
    navigator.clipboard.writeText(
      `Join my secure FreeMeet call: ${inviteUrl} (Room Code: ${instantRoomCode})`
    );
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2500);
  };

  const formatMeetingDate = (timestamp: any) => {
    if (!timestamp) return 'Instant Meeting';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Scheduled';
    }
  };

  const handleCompleteMeeting = async (meeting: Meeting) => {
    try {
      const now = Date.now();
      const startTime = meeting.startedAt?.toMillis 
        ? meeting.startedAt.toMillis() 
        : (meeting.createdAt?.toMillis ? meeting.createdAt.toMillis() : now);
      const diffMinutes = Math.max(1, Math.round((now - startTime) / (1000 * 60)));
      let durationText = `${diffMinutes} mins`;
      if (diffMinutes >= 60) {
        const hrs = Math.floor(diffMinutes / 60);
        const mins = diffMinutes % 60;
        durationText = mins > 0 ? `${hrs}h ${mins}m` : `${hrs} hrs`;
      }

      await updateDoc(doc(db, 'meetings', meeting.id), {
        status: 'completed',
        endedAt: serverTimestamp(),
        duration: durationText,
        durationMinutes: diffMinutes,
      });
    } catch (err) {
      console.error('Error completing meeting from dashboard home:', err);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Welcome Hero Section with Modern Dashboard Image Visual Design */}
      <section className="bg-white rounded-3xl border border-[#e2ede4] p-6 sm:p-8 lg:p-8 shadow-xs relative overflow-hidden">
        {/* Subtle Ambient Background Accents */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#eff5f0]/80 via-[#f4f8f5]/40 to-transparent rounded-full -mr-20 -mt-20 pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center relative z-10">
          {/* Left Column: Greeting & Main CTAs */}
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#eff5f0] border border-[#cddfd0] text-[#3d6e44] text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-[#528d5a]" />
              <span>Free Unlimited HD Workspace</span>
            </div>

            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#1a241b] tracking-tight font-['Outfit']">
                Welcome back, {user?.name || 'there'}!
              </h1>
              <p className="text-sm sm:text-base text-[#5a6b5c] leading-relaxed max-w-xl">
                Ready to host or join crystal-clear peer-to-peer video calls with zero time limits and end-to-end privacy.
              </p>
            </div>

            {/* Quick Feature Badges */}
            <div className="flex flex-wrap gap-2.5 pt-1 text-xs text-[#43754a]">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#f8fbf9] border border-[#e2ede4] font-medium">
                <Radio className="w-3 h-3 text-[#528d5a] animate-pulse" />
                Live WebRTC Engine
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#f8fbf9] border border-[#e2ede4] font-medium">
                <ShieldCheck className="w-3 h-3 text-[#528d5a]" />
                Zero Recording Storage
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#f8fbf9] border border-[#e2ede4] font-medium">
                <Zap className="w-3 h-3 text-[#528d5a]" />
                No App Download
              </span>
            </div>

            {/* Main Actions Bar */}
            <div className="pt-4 flex flex-wrap gap-3 sm:gap-4 items-center">
              <Link
                to="/dashboard/new-meeting"
                id="dashboard-main-new-meeting-btn"
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-[#528d5a] hover:bg-[#43754a] text-white font-bold text-sm rounded-xl shadow-xs shadow-[#528d5a]/20 transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>New Meeting</span>
              </Link>
              <Link
                to="/dashboard/join-meeting"
                id="dashboard-main-join-meeting-btn"
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-[#eff5f0] hover:bg-[#e2ede4] text-[#1a241b] font-bold text-sm rounded-xl border border-[#cddfd0] transition-all cursor-pointer"
              >
                <LogIn className="w-4 h-4 text-[#528d5a]" />
                <span>Join Meeting</span>
              </Link>
            </div>
          </div>

          {/* Right Column: Dashboard Image Card Design */}
          <div className="lg:col-span-5">
            <div className="relative rounded-2xl overflow-hidden border border-[#d6e5d8] bg-gradient-to-br from-[#1b2b1e] to-[#121c13] p-1.5 shadow-md group">
              {/* Main Image Frame */}
              <div className="relative rounded-xl overflow-hidden aspect-video bg-[#0f1710]">
                <img
                  src={dashboardHeroImg}
                  alt="FreeMeet Video Workspace Dashboard"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500 ease-out"
                />
                
                {/* Floating Status Badges on Image */}
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-[11px] font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="w-2 h-2 rounded-full bg-emerald-400 -ml-3.5" />
                  <span>Ultra HD 1080p</span>
                </div>

                <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/65 backdrop-blur-md border border-white/20 text-emerald-300 text-[11px] font-mono font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>P2P Encrypted</span>
                </div>
              </div>

              {/* Instant Room Quick Share Strip */}
              <div className="px-3 py-2.5 flex items-center justify-between text-xs bg-[#162218]/90 text-[#b5ceb8] rounded-b-lg mt-1 border-t border-white/5">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-[11px] uppercase tracking-wider text-[#8ca18f] font-semibold">Instant Code:</span>
                  <span className="font-mono text-white font-bold">{instantRoomCode}</span>
                </div>
                <button
                  onClick={copyInviteLink}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer ml-2 shrink-0"
                >
                  {copiedInvite ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedInvite ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Statistics Grid (Real Firebase data, 0 if empty) */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white rounded-2xl border border-[#e2ede4] p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8ca18f]">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5a6b5c]">Total Meetings</span>
            <div className="w-8 h-8 rounded-xl bg-[#eff5f0] text-[#528d5a] flex items-center justify-center">
              <Video className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#1a241b] font-['Outfit']">
              {stats.totalMeetings}
            </span>
            <p className="text-[11px] text-[#8ca18f] mt-1">Hosted sessions</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#e2ede4] p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8ca18f]">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5a6b5c]">Upcoming</span>
            <div className="w-8 h-8 rounded-xl bg-[#eff5f0] text-[#528d5a] flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#1a241b] font-['Outfit']">
              {stats.upcomingMeetings}
            </span>
            <p className="text-[11px] text-[#8ca18f] mt-1">Scheduled calls</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#e2ede4] p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8ca18f]">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5a6b5c]">Completed</span>
            <div className="w-8 h-8 rounded-xl bg-[#eff5f0] text-[#528d5a] flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#1a241b] font-['Outfit']">
              {stats.completedMeetings}
            </span>
            <p className="text-[11px] text-[#8ca18f] mt-1">Concluded calls</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#e2ede4] p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8ca18f]">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5a6b5c]">Contacts</span>
            <div className="w-8 h-8 rounded-xl bg-[#eff5f0] text-[#528d5a] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#1a241b] font-['Outfit']">
              {stats.totalContacts}
            </span>
            <p className="text-[11px] text-[#8ca18f] mt-1">Saved teammates</p>
          </div>
        </div>
      </section>

      {/* 3. Main Content: Upcoming Meetings & Recent Meetings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upcoming Meetings */}
        <div className="bg-white rounded-2xl border border-[#e2ede4] p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#e2ede4]">
              <div className="flex items-center gap-2">
                <CalendarCheck2 className="w-5 h-5 text-[#528d5a]" />
                <h2 className="text-lg font-bold text-[#1a241b] font-['Outfit']">
                  Upcoming Meetings
                </h2>
              </div>
              <Link
                to="/dashboard/meetings"
                className="text-xs font-semibold text-[#528d5a] hover:text-[#43754a] hover:underline"
              >
                View all &rarr;
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {upcomingMeetings.length === 0 ? (
                <div className="text-center py-8 px-4 rounded-xl bg-[#f8f9f8] border border-[#e2ede4]/80">
                  <div className="w-10 h-10 rounded-full bg-[#eff5f0] text-[#8ca18f] flex items-center justify-center mx-auto mb-2.5">
                    <Calendar className="w-5 h-5 text-[#528d5a]" />
                  </div>
                  <h3 className="text-sm font-bold text-[#1a241b] font-['Outfit']">No upcoming meetings</h3>
                  <p className="text-xs text-[#5a6b5c] mt-1 max-w-xs mx-auto">
                    You have no scheduled calls. Create a new meeting link or schedule one in advance.
                  </p>
                  <Link
                    to="/dashboard/new-meeting"
                    className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#528d5a] text-white text-xs font-bold hover:bg-[#43754a] transition-colors"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Schedule Meeting</span>
                  </Link>
                </div>
              ) : (
                upcomingMeetings.map((meeting) => (
                  <div
                    key={meeting.id}
                    className="p-3.5 rounded-xl bg-[#f8f9f8] border border-[#e2ede4] flex items-center justify-between gap-3 hover:border-[#cddfd0] transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-[#1a241b] font-['Outfit'] truncate">
                        {meeting.title || 'FreeMeet Session'}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 text-xs text-[#5a6b5c]">
                        <span className="font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-[#e2ede4]">
                          {meeting.code}
                        </span>
                        <span>•</span>
                        <span>{formatMeetingDate(meeting.scheduledFor)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleCompleteMeeting(meeting)}
                        id={`dashboard-complete-btn-${meeting.id}`}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                        title="Mark meeting as completed"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="hidden sm:inline">Complete</span>
                      </button>
                      <button
                        onClick={() => copyToClipboard(getMeetingUrl(meeting.id), meeting.id)}
                        className="p-2 rounded-lg bg-white border border-[#e2ede4] hover:bg-[#eff5f0] text-[#5a6b5c] transition-colors cursor-pointer"
                        title="Copy meeting link"
                      >
                        {copiedCode === meeting.id ? (
                          <Check className="w-4 h-4 text-[#528d5a]" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                      <Link
                        to={`/dashboard/join-meeting?code=${meeting.code}`}
                        className="px-3 py-1.5 bg-[#528d5a] text-white text-xs font-bold rounded-lg hover:bg-[#43754a] transition-colors cursor-pointer"
                      >
                        Start
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#e2ede4] flex items-center justify-between text-xs text-[#8ca18f]">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#528d5a]" />
              <span>Direct Peer-to-Peer Encryption</span>
            </span>
          </div>
        </div>

        {/* Recent Meetings History */}
        <div className="bg-white rounded-2xl border border-[#e2ede4] p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#e2ede4]">
              <div className="flex items-center gap-2">
                <HistoryIcon className="w-5 h-5 text-[#528d5a]" />
                <h2 className="text-lg font-bold text-[#1a241b] font-['Outfit']">
                  Recent Meetings
                </h2>
              </div>
              <Link
                to="/dashboard/history"
                className="text-xs font-semibold text-[#528d5a] hover:text-[#43754a] hover:underline"
              >
                Full history &rarr;
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {recentMeetings.length === 0 ? (
                <div className="text-center py-8 px-4 rounded-xl bg-[#f8f9f8] border border-[#e2ede4]/80">
                  <div className="w-10 h-10 rounded-full bg-[#eff5f0] text-[#8ca18f] flex items-center justify-center mx-auto mb-2.5">
                    <HistoryIcon className="w-5 h-5 text-[#528d5a]" />
                  </div>
                  <h3 className="text-sm font-bold text-[#1a241b] font-['Outfit']">No past meetings</h3>
                  <p className="text-xs text-[#5a6b5c] mt-1 max-w-xs mx-auto">
                    Your completed meetings and call records will automatically appear here.
                  </p>
                </div>
              ) : (
                recentMeetings.map((meeting) => (
                  <div
                    key={meeting.id}
                    className="p-3.5 rounded-xl bg-[#f8f9f8] border border-[#e2ede4] flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-[#1a241b] font-['Outfit'] truncate">
                          {meeting.title || 'FreeMeet Session'}
                        </h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          meeting.status === 'completed'
                            ? 'bg-[#eff5f0] text-[#3d6e44] border border-[#cddfd0]'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {meeting.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-[#5a6b5c]">
                        <span className="font-mono text-[11px] text-[#1a241b]">{meeting.code}</span>
                        <span>•</span>
                        <span>{formatMeetingDate(meeting.createdAt)}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-mono text-[#5a6b5c] block">
                        {meeting.durationMinutes ? `${meeting.durationMinutes} mins` : 'Live Room'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#e2ede4] text-xs text-[#8ca18f]">
            <span>Zero server recording • Full data privacy</span>
          </div>
        </div>
      </div>

      {/* 4. Quick Actions Section */}
      <section className="bg-white rounded-2xl border border-[#e2ede4] p-6 shadow-xs">
        <h3 className="text-base font-bold text-[#1a241b] font-['Outfit'] mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/dashboard/new-meeting"
            id="quick-action-new-meeting"
            className="p-4 rounded-xl bg-[#f8f9f8] border border-[#e2ede4] hover:bg-[#eff5f0] hover:border-[#cddfd0] transition-all group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-[#528d5a] text-white flex items-center justify-center mb-3 shadow-2xs group-hover:scale-105 transition-transform">
              <PlusCircle className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-[#1a241b] font-['Outfit']">New Meeting</h4>
            <p className="text-xs text-[#5a6b5c] mt-1">Generate a fresh room code immediately</p>
          </Link>

          <Link
            to="/dashboard/join-meeting"
            id="quick-action-join-meeting"
            className="p-4 rounded-xl bg-[#f8f9f8] border border-[#e2ede4] hover:bg-[#eff5f0] hover:border-[#cddfd0] transition-all group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-[#283829] text-white flex items-center justify-center mb-3 shadow-2xs group-hover:scale-105 transition-transform">
              <LogIn className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-[#1a241b] font-['Outfit']">Join Meeting</h4>
            <p className="text-xs text-[#5a6b5c] mt-1">Enter a shared meeting code or URL</p>
          </Link>

          <Link
            to="/dashboard/history"
            id="quick-action-meeting-history"
            className="p-4 rounded-xl bg-[#f8f9f8] border border-[#e2ede4] hover:bg-[#eff5f0] hover:border-[#cddfd0] transition-all group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-[#eff5f0] text-[#528d5a] border border-[#cddfd0] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <HistoryIcon className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-[#1a241b] font-['Outfit']">Meeting History</h4>
            <p className="text-xs text-[#5a6b5c] mt-1">View past call records and durations</p>
          </Link>

          <button
            onClick={() => setShowInviteModal(true)}
            id="quick-action-invite-people"
            className="p-4 rounded-xl bg-[#f8f9f8] border border-[#e2ede4] hover:bg-[#eff5f0] hover:border-[#cddfd0] transition-all group text-left cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-[#eff5f0] text-[#528d5a] border border-[#cddfd0] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Share2 className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-[#1a241b] font-['Outfit']">Invite People</h4>
            <p className="text-xs text-[#5a6b5c] mt-1">Copy instant meeting link to share</p>
          </button>
        </div>
      </section>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1a241b]/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-[#e2ede4] max-w-md w-full p-6 sm:p-8 shadow-xl relative animate-in zoom-in-95 duration-150">
            <h3 className="text-xl font-bold text-[#1a241b] font-['Outfit'] mb-2">
              Invite Attendees
            </h3>
            <p className="text-xs sm:text-sm text-[#5a6b5c] leading-relaxed">
              Anyone with this link can join your secure FreeMeet room in any modern browser without installing software.
            </p>

            <div className="mt-5 p-3.5 rounded-xl bg-[#f8f9f8] border border-[#e2ede4] space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#8ca18f]">
                Instant Room Link
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={getMeetingCodeUrl(instantRoomCode)}
                  className="w-full text-xs font-mono bg-white border border-[#e2ede4] px-3 py-2 rounded-lg text-[#1a241b] select-all outline-none"
                />
                <button
                  onClick={copyInviteLink}
                  className="px-3.5 py-2 bg-[#528d5a] hover:bg-[#43754a] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                >
                  {copiedInvite ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedInvite ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-5 py-2.5 rounded-xl bg-[#eff5f0] hover:bg-[#e2ede4] text-[#1a241b] text-xs font-bold transition-colors cursor-pointer"
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
