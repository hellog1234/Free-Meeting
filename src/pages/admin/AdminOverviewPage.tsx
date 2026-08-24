import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Video, 
  Activity, 
  CheckCircle2, 
  Radio, 
  Clock, 
  ArrowRight, 
  Calendar, 
  ShieldCheck, 
  UserPlus, 
  ExternalLink,
  Sparkles,
  RefreshCw,
  AlertCircle,
  PlayCircle
} from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot, where, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { User, Meeting, ActivityLog, AdminStats } from '../../types';
import { Link, useRouter } from '../../context/RouterContext';

export const AdminOverviewPage: React.FC = () => {
  const { navigate } = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalMeetings: 0,
    activeMeetings: 0,
    completedMeetings: 0,
  });

  const [activeMeetings, setActiveMeetings] = useState<Meeting[]>([]);
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [recentMeetings, setRecentMeetings] = useState<Meeting[]>([]);
  const [recentActivities, setRecentActivities] = useState<ActivityLog[]>([]);

  // 1. Real-time Users Listener (for total & online count + recently registered)
  useEffect(() => {
    try {
      const usersColRef = collection(db, 'users');
      const usersQuery = query(usersColRef, orderBy('createdAt', 'desc'), limit(50));
      
      const unsub = onSnapshot(usersQuery, (snapshot) => {
        let total = snapshot.size;
        let onlineCount = 0;
        const usersList: User[] = [];

        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          const isOnline = Boolean(d.isOnline);
          if (isOnline) onlineCount++;

          usersList.push({
            id: docSnap.id,
            name: d.name || 'Anonymous User',
            email: d.email || '',
            avatar: d.avatar,
            isOnline,
            lastSeen: d.lastSeen,
            createdAt: d.createdAt,
          } as User);
        });

        setRecentUsers(usersList.slice(0, 6));
        setStats(prev => ({
          ...prev,
          totalUsers: total,
          activeUsers: onlineCount,
        }));
        setLoading(false);
      }, (err) => {
        console.warn('[Admin Overview] Users listener error:', err);
        setError('Could not establish real-time sync with user records.');
        setLoading(false);
      });

      return () => unsub();
    } catch (err: any) {
      console.warn('Users listener setup error:', err);
    }
  }, []);

  // 2. Real-time Meetings Listener (for stats, active meetings, and recent meetings)
  useEffect(() => {
    try {
      const meetingsColRef = collection(db, 'meetings');
      const meetingsQuery = query(meetingsColRef, orderBy('createdAt', 'desc'), limit(60));

      const unsub = onSnapshot(meetingsQuery, (snapshot) => {
        let total = snapshot.size;
        let activeCount = 0;
        let completedCount = 0;
        const activeList: Meeting[] = [];
        const allList: Meeting[] = [];

        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          const meeting: Meeting = {
            id: docSnap.id,
            hostId: d.hostId || '',
            hostName: d.hostName || 'Meeting Host',
            title: d.title || 'Untitled Meeting',
            code: d.code || docSnap.id,
            status: d.status || 'scheduled',
            durationMinutes: d.durationMinutes || 0,
            participantCount: d.participantCount || 0,
            createdAt: d.createdAt,
            startedAt: d.startedAt,
            endedAt: d.endedAt,
          };

          if (meeting.status === 'active') {
            activeCount++;
            activeList.push(meeting);
          } else if (meeting.status === 'completed' || meeting.status === 'ended') {
            completedCount++;
          }

          allList.push(meeting);
        });

        setActiveMeetings(activeList);
        setRecentMeetings(allList.slice(0, 6));
        setStats(prev => ({
          ...prev,
          totalMeetings: total,
          activeMeetings: activeCount,
          completedMeetings: completedCount,
        }));
      }, (err) => {
        console.warn('[Admin Overview] Meetings listener error:', err);
      });

      return () => unsub();
    } catch (err: any) {
      console.warn('Meetings listener setup error:', err);
    }
  }, []);

  // 3. Real-time Activity Logs Listener
  useEffect(() => {
    try {
      const activityColRef = collection(db, 'activity_logs');
      const activityQuery = query(activityColRef, orderBy('createdAt', 'desc'), limit(10));

      const unsub = onSnapshot(activityQuery, (snapshot) => {
        const list: ActivityLog[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          list.push({
            id: docSnap.id,
            type: d.type || 'system_broadcast',
            title: d.title || 'Platform Event',
            userId: d.userId,
            userName: d.userName,
            userEmail: d.userEmail,
            meetingId: d.meetingId,
            meetingCode: d.meetingCode,
            details: d.details,
            createdAt: d.createdAt,
          });
        });
        setRecentActivities(list);
      }, (err) => {
        console.warn('[Admin Overview] Activity logs listener warning:', err);
      });

      return () => unsub();
    } catch (err: any) {
      console.warn('Activity listener setup error:', err);
    }
  }, []);

  const formatTimestamp = (ts: any): string => {
    if (!ts) return 'Just now';
    try {
      let date: Date;
      if (ts.toDate && typeof ts.toDate === 'function') {
        date = ts.toDate();
      } else if (ts.seconds) {
        date = new Date(ts.seconds * 1000);
      } else {
        date = new Date(ts);
      }
      if (isNaN(date.getTime())) return 'Recently';

      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return 'Recently';
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_registered':
        return <UserPlus className="w-4 h-4 text-[#528d5a]" />;
      case 'meeting_created':
        return <Video className="w-4 h-4 text-emerald-600" />;
      case 'meeting_started':
        return <Radio className="w-4 h-4 text-rose-500 animate-pulse" />;
      case 'meeting_completed':
        return <CheckCircle2 className="w-4 h-4 text-blue-600" />;
      default:
        return <Activity className="w-4 h-4 text-[#528d5a]" />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#1a241b] via-[#233125] to-[#1a241b] rounded-3xl p-6 sm:p-8 text-white border border-[#2f4232] shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#528d5a]/40 text-[#85cb8e] border border-[#528d5a]/50">
                Live Administrative Control
              </span>
              <span className="text-xs text-[#8ca18f]">Real-time Database Listeners Active</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-['Outfit'] tracking-tight">
              Platform Real-Time Dashboard
            </h2>
            <p className="text-xs sm:text-sm text-[#a1b8a4] max-w-2xl leading-relaxed">
              Live monitoring of real Firebase users, video sessions, WebRTC rooms, and system-wide activity logs.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              to="/admin/active-meetings"
              className="px-4 py-2.5 rounded-xl bg-[#528d5a] hover:bg-[#437549] text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-sm shadow-[#528d5a]/30"
            >
              <Radio className="w-4 h-4" />
              <span>Watch Live Calls</span>
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 5 Real-Time Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Total Users */}
        <div className="bg-white rounded-2xl p-5 border border-[#e2ede4] shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5a6b5c] font-['Outfit']">Total Users</span>
            <div className="w-8 h-8 rounded-xl bg-[#eff5f0] text-[#528d5a] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-[#1a241b] font-['Outfit']">
              {loading ? '...' : stats.totalUsers}
            </div>
            <div className="text-[11px] text-[#8ca18f] mt-0.5">
              Registered in Firestore
            </div>
          </div>
        </div>

        {/* Active Users */}
        <div className="bg-white rounded-2xl p-5 border border-[#e2ede4] shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5a6b5c] font-['Outfit']">Active Users</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-emerald-700 font-['Outfit'] flex items-center gap-2">
              <span>{loading ? '...' : stats.activeUsers}</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="text-[11px] text-[#8ca18f] mt-0.5">
              Online presence active
            </div>
          </div>
        </div>

        {/* Total Meetings */}
        <div className="bg-white rounded-2xl p-5 border border-[#e2ede4] shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5a6b5c] font-['Outfit']">Total Meetings</span>
            <div className="w-8 h-8 rounded-xl bg-[#eff5f0] text-[#528d5a] flex items-center justify-center">
              <Video className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-[#1a241b] font-['Outfit']">
              {loading ? '...' : stats.totalMeetings}
            </div>
            <div className="text-[11px] text-[#8ca18f] mt-0.5">
              All hosted sessions
            </div>
          </div>
        </div>

        {/* Active Meetings */}
        <div className={`rounded-2xl p-5 border shadow-2xs space-y-3 transition-colors ${
          stats.activeMeetings > 0 
            ? 'bg-rose-50/70 border-rose-200' 
            : 'bg-white border-[#e2ede4]'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5a6b5c] font-['Outfit']">Active Meetings</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              stats.activeMeetings > 0 ? 'bg-rose-100 text-rose-600' : 'bg-gray-100 text-gray-500'
            }`}>
              <Radio className={`w-4 h-4 ${stats.activeMeetings > 0 ? 'animate-pulse' : ''}`} />
            </div>
          </div>
          <div>
            <div className={`text-2xl sm:text-3xl font-bold font-['Outfit'] flex items-center gap-2 ${
              stats.activeMeetings > 0 ? 'text-rose-600' : 'text-[#1a241b]'
            }`}>
              <span>{loading ? '...' : stats.activeMeetings}</span>
              {stats.activeMeetings > 0 && <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />}
            </div>
            <div className="text-[11px] text-[#8ca18f] mt-0.5">
              Ongoing live calls
            </div>
          </div>
        </div>

        {/* Completed Meetings */}
        <div className="bg-white rounded-2xl p-5 border border-[#e2ede4] shadow-2xs space-y-3 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5a6b5c] font-['Outfit']">Completed</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-[#1a241b] font-['Outfit']">
              {loading ? '...' : stats.completedMeetings}
            </div>
            <div className="text-[11px] text-[#8ca18f] mt-0.5">
              Ended successfully
            </div>
          </div>
        </div>
      </div>

      {/* 4 Live Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Currently Active Meetings */}
        <div className="bg-white rounded-3xl border border-[#e2ede4] p-5 sm:p-6 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-[#e2ede4]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <Radio className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1a241b] font-['Outfit']">
                  Currently Active Meetings
                </h3>
                <span className="text-[11px] text-[#8ca18f]">Real-time video sessions in progress</span>
              </div>
            </div>
            <Link
              to="/admin/active-meetings"
              className="text-xs font-semibold text-[#528d5a] hover:text-[#3d6e44] flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex-1 py-3">
            {activeMeetings.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-[#eff5f0] text-[#8ca18f] flex items-center justify-center mx-auto">
                  <PlayCircle className="w-6 h-6" />
                </div>
                <p className="text-xs font-semibold text-[#5a6b5c]">No active meetings right now</p>
                <p className="text-[11px] text-[#8ca18f]">When users start a video call, it will appear here in real time.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {activeMeetings.map((meeting) => (
                  <div
                    key={meeting.id}
                    className="p-3.5 rounded-2xl bg-rose-50/50 border border-rose-100 flex items-center justify-between hover:bg-rose-50 transition-colors"
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                        <h4 className="text-xs font-bold text-[#1a241b] truncate font-['Outfit']">
                          {meeting.title}
                        </h4>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-[#5a6b5c]">
                        <span className="font-mono text-[10px] bg-white px-1.5 py-0.5 rounded border border-rose-200">
                          {meeting.code}
                        </span>
                        <span>Host: <strong className="text-[#1a241b]">{meeting.hostName}</strong></span>
                      </div>
                    </div>
                    <Link
                      to={`/meeting/${meeting.id}`}
                      className="px-3 py-1.5 rounded-xl bg-white border border-rose-200 text-rose-700 text-xs font-semibold hover:bg-rose-50 transition-colors shrink-0"
                    >
                      Join Room
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Recently Registered Users */}
        <div className="bg-white rounded-3xl border border-[#e2ede4] p-5 sm:p-6 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-[#e2ede4]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#eff5f0] text-[#528d5a] flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1a241b] font-['Outfit']">
                  Recently Registered Users
                </h3>
                <span className="text-[11px] text-[#8ca18f]">Real members registered on Firebase</span>
              </div>
            </div>
            <Link
              to="/admin/users"
              className="text-xs font-semibold text-[#528d5a] hover:text-[#3d6e44] flex items-center gap-1"
            >
              <span>View All Users</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex-1 py-3">
            {recentUsers.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-[#eff5f0] text-[#8ca18f] flex items-center justify-center mx-auto">
                  <Users className="w-6 h-6" />
                </div>
                <p className="text-xs font-semibold text-[#5a6b5c]">No registered users yet</p>
                <p className="text-[11px] text-[#8ca18f]">When users sign up, their real profiles will populate here.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#eff5f0]">
                {recentUsers.map((u) => (
                  <div key={u.id} className="py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                      <div className="relative shrink-0">
                        <div className="w-9 h-9 rounded-xl bg-[#eff5f0] text-[#3d6e44] border border-[#cddfd0] flex items-center justify-center text-xs font-bold font-mono">
                          {getInitials(u.name)}
                        </div>
                        {u.isOnline && (
                          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-[#1a241b] truncate font-['Outfit']">
                          {u.name}
                        </div>
                        <div className="text-[11px] text-[#8ca18f] truncate font-mono">
                          {u.email}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        u.isOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {u.isOnline ? 'Online' : 'Offline'}
                      </span>
                      <div className="text-[10px] text-[#8ca18f] mt-0.5">
                        {formatTimestamp(u.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Recent Meetings */}
        <div className="bg-white rounded-3xl border border-[#e2ede4] p-5 sm:p-6 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-[#e2ede4]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#eff5f0] text-[#528d5a] flex items-center justify-center">
                <Video className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1a241b] font-['Outfit']">
                  Recent Meetings
                </h3>
                <span className="text-[11px] text-[#8ca18f]">Latest created & scheduled sessions</span>
              </div>
            </div>
            <Link
              to="/admin/meetings"
              className="text-xs font-semibold text-[#528d5a] hover:text-[#3d6e44] flex items-center gap-1"
            >
              <span>All Meetings</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex-1 py-3">
            {recentMeetings.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-[#eff5f0] text-[#8ca18f] flex items-center justify-center mx-auto">
                  <Video className="w-6 h-6" />
                </div>
                <p className="text-xs font-semibold text-[#5a6b5c]">No meetings recorded yet</p>
                <p className="text-[11px] text-[#8ca18f]">Meetings created across the workspace will appear here.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#eff5f0]">
                {recentMeetings.map((m) => (
                  <div key={m.id} className="py-2.5 flex items-center justify-between">
                    <div className="min-w-0 flex-1 pr-3">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-[#1a241b] truncate font-['Outfit']">
                          {m.title}
                        </h4>
                        <span className="font-mono text-[10px] bg-[#eff5f0] text-[#3d6e44] px-1.5 py-0.5 rounded">
                          {m.code}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#8ca18f] mt-0.5">
                        Host: {m.hostName} • {formatTimestamp(m.createdAt)}
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                      m.status === 'active' 
                        ? 'bg-rose-100 text-rose-700' 
                        : m.status === 'completed'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      {m.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Section 4: Recent Activity */}
        <div className="bg-white rounded-3xl border border-[#e2ede4] p-5 sm:p-6 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-[#e2ede4]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#eff5f0] text-[#528d5a] flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1a241b] font-['Outfit']">
                  Recent Platform Activity
                </h3>
                <span className="text-[11px] text-[#8ca18f]">Real-time system events stream</span>
              </div>
            </div>
            <Link
              to="/admin/reports"
              className="text-xs font-semibold text-[#528d5a] hover:text-[#3d6e44] flex items-center gap-1"
            >
              <span>Reports</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex-1 py-3">
            {recentActivities.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-[#eff5f0] text-[#8ca18f] flex items-center justify-center mx-auto">
                  <Activity className="w-6 h-6" />
                </div>
                <p className="text-xs font-semibold text-[#5a6b5c]">No activity logged yet</p>
                <p className="text-[11px] text-[#8ca18f]">User actions and meeting cycles will log automatically.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivities.map((act) => (
                  <div key={act.id} className="flex items-start gap-3 text-xs">
                    <div className="p-1.5 rounded-lg bg-[#eff5f0] shrink-0 mt-0.5">
                      {getActivityIcon(act.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-[#1a241b] truncate">
                        {act.title}
                      </div>
                      <div className="text-[10px] text-[#8ca18f] flex items-center gap-2 mt-0.5">
                        <span>{act.userName || act.userEmail || 'System'}</span>
                        <span>•</span>
                        <span>{formatTimestamp(act.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
