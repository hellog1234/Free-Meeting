import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Send, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ShieldCheck, 
  Radio,
  MessageSquare
} from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { NotificationItem, User } from '../../types';
import { logActivity } from '../../lib/activityLogger';

export const AdminNotificationsPage: React.FC = () => {
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState<'all' | 'specific'>('all');
  const [specificUserId, setSpecificUserId] = useState('');
  const [type, setType] = useState<'system' | 'reminder' | 'meeting' | 'invite'>('system');
  const [actionUrl, setActionUrl] = useState('');
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Listen to recent notification broadcasts
  useEffect(() => {
    try {
      const q = query(
        collection(db, 'notifications'),
        orderBy('createdAt', 'desc'),
        limit(25)
      );

      const unsub = onSnapshot(q, (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        setBroadcasts(list);
        setLoading(false);
      }, (err) => {
        console.warn('Notifications listener warning:', err);
        setLoading(false);
      });

      return () => unsub();
    } catch (e) {
      console.warn('Error setting up notifications listener:', e);
      setLoading(false);
    }
  }, []);

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setError('Please provide both a notification title and message.');
      return;
    }

    setSending(true);
    setError(null);

    try {
      if (target === 'all') {
        // Fetch all user UIDs to broadcast real notifications
        const usersSnap = await getDocs(collection(db, 'users'));
        const promises: Promise<any>[] = [];

        usersSnap.forEach((userDoc) => {
          promises.push(
            addDoc(collection(db, 'notifications'), {
              userId: userDoc.id,
              title: title.trim(),
              message: message.trim(),
              type,
              actionUrl: actionUrl.trim() || null,
              read: false,
              senderName: 'FreeMeet Administration',
              createdAt: serverTimestamp(),
            })
          );
        });

        await Promise.all(promises);

        logActivity('system_broadcast', `Broadcast notification sent to all users: ${title.trim()}`, {
          details: { title, message, target: 'all', userCount: usersSnap.size }
        });

        setSuccess(`System broadcast successfully delivered to all ${usersSnap.size} registered users.`);
      } else {
        if (!specificUserId.trim()) {
          setError('Please provide a target User ID.');
          setSending(false);
          return;
        }

        await addDoc(collection(db, 'notifications'), {
          userId: specificUserId.trim(),
          title: title.trim(),
          message: message.trim(),
          type,
          actionUrl: actionUrl.trim() || null,
          read: false,
          senderName: 'FreeMeet Administration',
          createdAt: serverTimestamp(),
        });

        logActivity('system_broadcast', `Targeted notification sent to user (${specificUserId.trim()}): ${title.trim()}`, {
          details: { title, message, target: specificUserId.trim() }
        });

        setSuccess(`Targeted notification successfully delivered to user ID: ${specificUserId.trim()}`);
      }

      setTitle('');
      setMessage('');
      setActionUrl('');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      console.error('Error sending broadcast:', err);
      setError(err?.message || 'Failed to dispatch notification.');
    } finally {
      setSending(false);
    }
  };

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
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return 'Recently';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-[#e2ede4] p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-[#1a241b] font-['Outfit']">
              Notifications & Broadcasts
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#eff5f0] text-[#3d6e44] border border-[#cddfd0]">
              Real-time In-App Dispatch
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#5a6b5c] mt-1">
            Dispatch announcements, system alerts, and notifications directly to registered users in real time.
          </p>
        </div>
      </div>

      {success && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Send Broadcast Form */}
        <div className="lg:col-span-6 bg-white rounded-3xl border border-[#e2ede4] p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#e2ede4]">
            <div className="w-8 h-8 rounded-xl bg-[#eff5f0] text-[#528d5a] flex items-center justify-center">
              <Send className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-[#1a241b] font-['Outfit']">
              Compose System Broadcast
            </h3>
          </div>

          <form onSubmit={handleSendBroadcast} className="space-y-4 text-xs">
            <div>
              <label className="block text-xs font-semibold text-[#1a241b] mb-1.5">
                Target Audience
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTarget('all')}
                  className={`py-2 px-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    target === 'all'
                      ? 'bg-[#528d5a] text-white shadow-2xs'
                      : 'bg-[#eff5f0] text-[#5a6b5c] hover:bg-[#e2ede4]'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>All Users</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTarget('specific')}
                  className={`py-2 px-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    target === 'specific'
                      ? 'bg-[#528d5a] text-white shadow-2xs'
                      : 'bg-[#eff5f0] text-[#5a6b5c] hover:bg-[#e2ede4]'
                  }`}
                >
                  <span>Specific User UID</span>
                </button>
              </div>
            </div>

            {target === 'specific' && (
              <div>
                <label className="block text-xs font-semibold text-[#1a241b] mb-1">
                  Recipient User UID
                </label>
                <input
                  type="text"
                  value={specificUserId}
                  onChange={(e) => setSpecificUserId(e.target.value)}
                  placeholder="e.g. 7kF9aXy2mQ..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#f8f9f8] border border-[#e2ede4] text-[#1a241b] focus:outline-none focus:border-[#528d5a]"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#1a241b] mb-1">
                Notification Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Scheduled System Maintenance or Product Update"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#f8f9f8] border border-[#e2ede4] text-[#1a241b] focus:outline-none focus:border-[#528d5a]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1a241b] mb-1">
                Message Content
              </label>
              <textarea
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write the full announcement message here..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#f8f9f8] border border-[#e2ede4] text-[#1a241b] focus:outline-none focus:border-[#528d5a]"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#1a241b] mb-1">
                  Type
                </label>
                <select
                  value={type}
                  onChange={(e: any) => setType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#f8f9f8] border border-[#e2ede4] text-[#1a241b] focus:outline-none focus:border-[#528d5a]"
                >
                  <option value="system">System Alert</option>
                  <option value="reminder">Reminder</option>
                  <option value="meeting">Meeting Alert</option>
                  <option value="invite">Invitation</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1a241b] mb-1">
                  Optional Action Link
                </label>
                <input
                  type="text"
                  value={actionUrl}
                  onChange={(e) => setActionUrl(e.target.value)}
                  placeholder="/dashboard or /settings"
                  className="w-full px-3 py-2 rounded-xl bg-[#f8f9f8] border border-[#e2ede4] text-[#1a241b] focus:outline-none focus:border-[#528d5a]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={sending}
              className="w-full py-3 rounded-xl bg-[#528d5a] hover:bg-[#437549] text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{sending ? 'Dispatching Broadcast...' : 'Send Broadcast to Users'}</span>
            </button>
          </form>
        </div>

        {/* Real-time Broadcast History */}
        <div className="lg:col-span-6 bg-white rounded-3xl border border-[#e2ede4] p-6 shadow-xs space-y-4 flex flex-col">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#e2ede4]">
            <div className="w-8 h-8 rounded-xl bg-[#eff5f0] text-[#528d5a] flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-[#1a241b] font-['Outfit']">
              Recent Dispatches
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[420px] space-y-2.5 pr-1">
            {loading ? (
              <div className="py-12 text-center text-xs text-[#8ca18f]">
                Loading broadcast logs...
              </div>
            ) : broadcasts.length === 0 ? (
              <div className="py-12 text-center space-y-2 text-[#8ca18f]">
                <Bell className="w-8 h-8 mx-auto" />
                <p className="text-xs font-semibold text-[#5a6b5c]">No broadcasts dispatched yet</p>
              </div>
            ) : (
              broadcasts.map((b) => (
                <div
                  key={b.id}
                  className="p-3.5 rounded-2xl bg-[#f8f9f8] border border-[#e2ede4] text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#1a241b] font-['Outfit']">{b.title}</span>
                    <span className="text-[10px] text-[#8ca18f]">{formatTimestamp(b.createdAt)}</span>
                  </div>
                  <p className="text-[#5a6b5c] text-[11px] leading-relaxed">{b.message}</p>
                  <div className="flex items-center gap-2 text-[10px] text-[#8ca18f] pt-1">
                    <span className="bg-[#eff5f0] px-2 py-0.5 rounded text-[#3d6e44] font-semibold">
                      {b.type || 'system'}
                    </span>
                    <span>To: {b.userId ? `User (${b.userId.substring(0, 8)}...)` : 'Broadcast'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
