import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Calendar, 
  Mail, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  Video, 
  Clock, 
  ExternalLink,
  Eye,
  X,
  Radio
} from 'lucide-react';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { User, Meeting } from '../../types';

export const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // 1. Real-time Users Listener
  useEffect(() => {
    try {
      const usersColRef = collection(db, 'users');
      const usersQuery = query(usersColRef, orderBy('createdAt', 'desc'));

      const unsub = onSnapshot(usersQuery, (snapshot) => {
        const list: User[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          list.push({
            id: docSnap.id,
            name: d.name || 'Anonymous User',
            email: d.email || '',
            avatar: d.avatar,
            isOnline: Boolean(d.isOnline),
            lastSeen: d.lastSeen,
            createdAt: d.createdAt,
            timeZone: d.timeZone,
          } as User);
        });
        setUsers(list);
        setLoading(false);
      }, (err) => {
        console.warn('[Admin Users] Users listener error:', err);
        setLoading(false);
      });

      return () => unsub();
    } catch (e) {
      console.warn('Error setting up users listener:', e);
      setLoading(false);
    }
  }, []);

  // 2. Real-time Meetings Listener to cross-reference user meeting count
  useEffect(() => {
    try {
      const meetingsColRef = collection(db, 'meetings');
      const unsub = onSnapshot(meetingsColRef, (snapshot) => {
        const list: Meeting[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          list.push({
            id: docSnap.id,
            hostId: d.hostId || '',
            hostName: d.hostName || '',
            title: d.title || '',
            code: d.code || '',
            status: d.status || 'scheduled',
            createdAt: d.createdAt,
          } as Meeting);
        });
        setMeetings(list);
      });
      return () => unsub();
    } catch (e) {
      console.warn('Meetings lookup listener error:', e);
    }
  }, []);

  const getUserMeetingCount = (userId: string) => {
    return meetings.filter(m => m.hostId === userId).length;
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
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return 'N/A';
    }
  };

  const formatLastSeen = (ts: any, isOnline?: boolean): string => {
    if (isOnline) return 'Active now';
    if (!ts) return 'Recently';
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

  // Filtered list
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    if (statusFilter === 'online') return user.isOnline;
    if (statusFilter === 'offline') return !user.isOnline;
    return true;
  });

  const onlineCount = users.filter(u => u.isOnline).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Info */}
      <div className="bg-white rounded-3xl border border-[#e2ede4] p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-[#1a241b] font-['Outfit']">
              Registered Users
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#eff5f0] text-[#3d6e44] border border-[#cddfd0]">
              {users.length} Total
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#5a6b5c] mt-1">
            Real registered user accounts stored in Firebase Authentication & Firestore.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{onlineCount} Online Now</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#8ca18f] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or user ID..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-[#e2ede4] text-xs sm:text-sm text-[#1a241b] placeholder-[#8ca18f] focus:outline-none focus:border-[#528d5a] transition-all shadow-2xs"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex-1 sm:flex-initial cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-[#528d5a] text-white shadow-2xs'
                : 'bg-white border border-[#e2ede4] text-[#5a6b5c] hover:bg-[#eff5f0]'
            }`}
          >
            All ({users.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('online')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex-1 sm:flex-initial cursor-pointer ${
              statusFilter === 'online'
                ? 'bg-[#528d5a] text-white shadow-2xs'
                : 'bg-white border border-[#e2ede4] text-[#5a6b5c] hover:bg-[#eff5f0]'
            }`}
          >
            Online ({onlineCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('offline')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex-1 sm:flex-initial cursor-pointer ${
              statusFilter === 'offline'
                ? 'bg-[#528d5a] text-white shadow-2xs'
                : 'bg-white border border-[#e2ede4] text-[#5a6b5c] hover:bg-[#eff5f0]'
            }`}
          >
            Offline ({users.length - onlineCount})
          </button>
        </div>
      </div>

      {/* Real Users Table */}
      <div className="bg-white rounded-3xl border border-[#e2ede4] overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-[#eff5f0] text-[#528d5a] flex items-center justify-center mx-auto animate-pulse">
              <Users className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-[#5a6b5c]">Loading registered users from Firebase...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-[#eff5f0] text-[#8ca18f] flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <p className="text-xs font-semibold text-[#1a241b]">No users found</p>
            <p className="text-[11px] text-[#8ca18f]">Try adjusting your search query or filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#eff5f0]/60 border-b border-[#e2ede4] text-[#5a6b5c] font-['Outfit'] font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">User / Name</th>
                  <th className="py-3.5 px-4">Email Address</th>
                  <th className="py-3.5 px-4">Created Date</th>
                  <th className="py-3.5 px-4">Presence / Status</th>
                  <th className="py-3.5 px-4 text-center">Meetings</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eff5f0]">
                {filteredUsers.map((u) => {
                  const meetingCount = getUserMeetingCount(u.id);
                  return (
                    <tr key={u.id} className="hover:bg-[#f8f9f8] transition-colors">
                      <td className="py-3 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <div className="w-9 h-9 rounded-xl bg-[#eff5f0] text-[#3d6e44] border border-[#cddfd0] flex items-center justify-center text-xs font-bold font-mono">
                              {getInitials(u.name)}
                            </div>
                            {u.isOnline && (
                              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-[#1a241b] truncate font-['Outfit']">
                              {u.name}
                            </div>
                            <div className="text-[10px] text-[#8ca18f] font-mono truncate max-w-[140px]">
                              UID: {u.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#5a6b5c] font-mono">
                        {u.email}
                      </td>
                      <td className="py-3 px-4 text-[#5a6b5c]">
                        {formatTimestamp(u.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 ${
                            u.isOnline 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${u.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                            {u.isOnline ? 'Online' : 'Offline'}
                          </span>
                          <span className="text-[10px] text-[#8ca18f] hidden lg:inline">
                            ({formatLastSeen(u.lastSeen, u.isOnline)})
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-lg bg-[#eff5f0] text-[#3d6e44] font-bold text-xs">
                          {meetingCount}
                        </span>
                      </td>
                      <td className="py-3 px-4 sm:px-6 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedUser(u)}
                          className="px-3 py-1.5 rounded-xl bg-[#eff5f0] hover:bg-[#e2ede4] text-[#3d6e44] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Details</span>
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

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-[#e2ede4] max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#e2ede4]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#eff5f0] text-[#3d6e44] border border-[#cddfd0] flex items-center justify-center text-sm font-bold font-mono">
                  {getInitials(selectedUser.name)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1a241b] font-['Outfit']">
                    {selectedUser.name}
                  </h3>
                  <p className="text-xs text-[#8ca18f] font-mono">{selectedUser.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="p-1.5 rounded-lg text-[#8ca18f] hover:text-[#1a241b] hover:bg-[#eff5f0]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-[#f8f9f8] border border-[#e2ede4] space-y-1">
                <span className="text-[10px] text-[#8ca18f] uppercase font-bold tracking-wider">Account UID</span>
                <p className="font-mono text-[#1a241b] truncate" title={selectedUser.id}>{selectedUser.id}</p>
              </div>
              <div className="p-3 rounded-2xl bg-[#f8f9f8] border border-[#e2ede4] space-y-1">
                <span className="text-[10px] text-[#8ca18f] uppercase font-bold tracking-wider">Presence</span>
                <p className="font-bold text-emerald-700">{selectedUser.isOnline ? 'Active Online' : 'Offline'}</p>
              </div>
              <div className="p-3 rounded-2xl bg-[#f8f9f8] border border-[#e2ede4] space-y-1">
                <span className="text-[10px] text-[#8ca18f] uppercase font-bold tracking-wider">Created At</span>
                <p className="text-[#1a241b]">{formatTimestamp(selectedUser.createdAt)}</p>
              </div>
              <div className="p-3 rounded-2xl bg-[#f8f9f8] border border-[#e2ede4] space-y-1">
                <span className="text-[10px] text-[#8ca18f] uppercase font-bold tracking-wider">Hosted Meetings</span>
                <p className="font-bold text-[#3d6e44]">{getUserMeetingCount(selectedUser.id)} sessions</p>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="w-full py-2.5 rounded-xl bg-[#528d5a] text-white text-xs font-semibold hover:bg-[#437549] transition-colors cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
