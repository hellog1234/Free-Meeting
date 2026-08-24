import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  Video, 
  ShieldCheck, 
  Info, 
  Clock,
  UserPlus,
  UserCheck,
  UserX,
  Calendar,
  ExternalLink,
  Copy,
  Check,
  Filter,
  CheckCircle2,
  CalendarPlus,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from '../../context/RouterContext';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  updateDoc, 
  doc, 
  deleteDoc, 
  writeBatch, 
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { NotificationItem } from '../../types';
import { getMeetingUrl } from '../../utils/meetingUtils';

type NotificationFilter = 'all' | 'unread' | 'meetings' | 'contacts' | 'system';

export const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const { navigate } = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Real-time listener for user notifications
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', user.id)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const items: NotificationItem[] = [];
        snapshot.forEach((docSnap) => {
          items.push({ id: docSnap.id, ...docSnap.data() } as NotificationItem);
        });
        
        // Sort descending by creation date
        items.sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
          return timeB - timeA;
        });

        setNotifications(items);
        setLoading(false);
      }, (error) => {
        console.warn('Error fetching real-time notifications:', error);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (e) {
      console.warn('Notifications query error:', e);
      setLoading(false);
    }
  }, [user?.id]);

  // Mark all unread as read
  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;
    const unreadItems = notifications.filter((n) => !n.read);
    if (unreadItems.length === 0) return;

    try {
      const batch = writeBatch(db);
      unreadItems.forEach((item) => {
        batch.update(doc(db, 'notifications', item.id), { read: true });
      });
      await batch.commit();
    } catch (e) {
      console.error('Error marking all as read:', e);
    }
  };

  // Clear all read notifications
  const handleClearAllRead = async () => {
    if (!user?.id) return;
    const readItems = notifications.filter((n) => n.read);
    if (readItems.length === 0) return;

    if (!window.confirm('Delete all read notifications? This action cannot be undone.')) {
      return;
    }

    try {
      const batch = writeBatch(db);
      readItems.forEach((item) => {
        batch.delete(doc(db, 'notifications', item.id));
      });
      await batch.commit();
    } catch (e) {
      console.error('Error clearing read notifications:', e);
    }
  };

  // Toggle read status of single notification
  const handleToggleRead = async (item: NotificationItem) => {
    try {
      setProcessingId(item.id);
      await updateDoc(doc(db, 'notifications', item.id), {
        read: !item.read,
      });
    } catch (e) {
      console.error('Error toggling notification read state:', e);
    } finally {
      setProcessingId(null);
    }
  };

  // Delete single notification
  const handleDeleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (e) {
      console.error('Error deleting notification:', e);
    }
  };

  // Copy meeting link helper
  const handleCopyMeetingLink = (code: string) => {
    const fullUrl = getMeetingUrl(code);
    navigator.clipboard.writeText(fullUrl);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  // Format timestamp helper
  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;

      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return 'Recent';
    }
  };

  // Icon and theme resolution for notification types
  const getNotificationDetails = (item: NotificationItem) => {
    switch (item.type) {
      case 'invite':
        return {
          icon: Video,
          badgeBg: 'bg-[#eff5f0] text-[#528d5a] border-[#cddfd0]',
          label: 'Meeting Invite',
        };
      case 'reminder':
        return {
          icon: Clock,
          badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
          label: 'Meeting Reminder',
        };
      case 'join':
        return {
          icon: UserCheck,
          badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          label: 'Participant Joined',
        };
      case 'removed':
        return {
          icon: UserX,
          badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
          label: 'Meeting Status',
        };
      case 'ended':
        return {
          icon: CheckCircle2,
          badgeBg: 'bg-[#f0f4f1] text-[#5a6b5c] border-[#e2ede4]',
          label: 'Meeting Concluded',
        };
      case 'contact':
        return {
          icon: UserPlus,
          badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          label: 'Contact Alert',
        };
      case 'system':
      default:
        return {
          icon: ShieldCheck,
          badgeBg: 'bg-[#eff5f0] text-[#528d5a] border-[#cddfd0]',
          label: 'Workspace Alert',
        };
    }
  };

  // Filtered list calculation
  const filteredNotifications = notifications.filter((item) => {
    if (activeFilter === 'unread') return !item.read;
    if (activeFilter === 'meetings') return ['meeting', 'invite', 'reminder', 'join', 'removed', 'ended'].includes(item.type);
    if (activeFilter === 'contacts') return item.type === 'contact';
    if (activeFilter === 'system') return item.type === 'system';
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;
  const meetingCount = notifications.filter((n) => ['meeting', 'invite', 'reminder', 'join', 'removed', 'ended'].includes(n.type)).length;
  const contactCount = notifications.filter((n) => n.type === 'contact').length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-bold text-[#1a241b] font-['Outfit']">
              Notifications
            </h2>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-[#528d5a] text-white text-xs font-bold font-mono shadow-2xs">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-[#5a6b5c] mt-0.5">
            Real-time updates for meeting invitations, attendee arrivals, reminders, and workspace contacts.
          </p>
        </div>

        {/* Global Batch Actions */}
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              id="notif-mark-all-read-btn"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#eff5f0] hover:bg-[#e2ede4] text-[#1a241b] rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <CheckCheck className="w-4 h-4 text-[#528d5a]" />
              <span>Mark all read</span>
            </button>
          )}

          {notifications.some((n) => n.read) && (
            <button
              onClick={handleClearAllRead}
              id="notif-clear-read-btn"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#e2ede4] hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-[#5a6b5c] rounded-xl text-xs font-medium transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear read</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-[#eff5f0]/70 rounded-2xl border border-[#e2ede4] overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveFilter('all')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeFilter === 'all'
              ? 'bg-white text-[#1a241b] shadow-2xs'
              : 'text-[#5a6b5c] hover:text-[#1a241b] hover:bg-white/50'
          }`}
        >
          <span>All</span>
          <span className="px-1.5 py-0.2 rounded-md bg-[#eff5f0] text-[10px] font-mono text-[#5a6b5c]">
            {notifications.length}
          </span>
        </button>

        <button
          onClick={() => setActiveFilter('unread')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeFilter === 'unread'
              ? 'bg-white text-[#1a241b] shadow-2xs'
              : 'text-[#5a6b5c] hover:text-[#1a241b] hover:bg-white/50'
          }`}
        >
          <span>Unread</span>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-md bg-[#528d5a] text-white text-[10px] font-mono font-bold">
              {unreadCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveFilter('meetings')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeFilter === 'meetings'
              ? 'bg-white text-[#1a241b] shadow-2xs'
              : 'text-[#5a6b5c] hover:text-[#1a241b] hover:bg-white/50'
          }`}
        >
          <Video className="w-3.5 h-3.5 text-[#528d5a]" />
          <span>Meetings</span>
          <span className="px-1.5 py-0.2 rounded-md bg-[#eff5f0] text-[10px] font-mono text-[#5a6b5c]">
            {meetingCount}
          </span>
        </button>

        <button
          onClick={() => setActiveFilter('contacts')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeFilter === 'contacts'
              ? 'bg-white text-[#1a241b] shadow-2xs'
              : 'text-[#5a6b5c] hover:text-[#1a241b] hover:bg-white/50'
          }`}
        >
          <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
          <span>Contacts</span>
          <span className="px-1.5 py-0.2 rounded-md bg-[#eff5f0] text-[10px] font-mono text-[#5a6b5c]">
            {contactCount}
          </span>
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-3xl border border-[#e2ede4] p-12 text-center text-xs text-[#8ca18f]">
            <div className="w-8 h-8 rounded-full border-2 border-[#528d5a] border-t-transparent animate-spin mx-auto mb-3" />
            <span>Connecting to real-time notification stream...</span>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#e2ede4] p-12 text-center shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-[#eff5f0] text-[#528d5a] flex items-center justify-center mx-auto mb-3">
              <Bell className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#1a241b] font-['Outfit']">
              {activeFilter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </h3>
            <p className="text-xs text-[#5a6b5c] mt-1 max-w-sm mx-auto">
              {activeFilter === 'unread'
                ? 'You are all caught up! Check back when attendees join or send meeting invites.'
                : 'Your real-time notifications for meetings, reminders, and workspace contacts will appear here automatically.'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const { icon: NotifIcon, badgeBg, label } = getNotificationDetails(notif);
            const meetingCodeToUse = notif.meetingCode || (notif.actionUrl?.startsWith('/meeting/') ? notif.actionUrl.replace('/meeting/', '') : undefined);

            return (
              <div
                key={notif.id}
                id={`notification-card-${notif.id}`}
                className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-4 ${
                  notif.read
                    ? 'bg-white border-[#e2ede4] shadow-2xs hover:border-[#cddfd0]'
                    : 'bg-[#eff5f0]/45 border-[#cddfd0] shadow-xs'
                }`}
              >
                {/* Left details */}
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  {/* Icon or Avatar */}
                  <div className="relative shrink-0">
                    {notif.senderAvatar ? (
                      <img
                        src={notif.senderAvatar}
                        alt={notif.senderName || 'Avatar'}
                        className="w-10 h-10 rounded-xl object-cover border border-[#e2ede4]"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${badgeBg}`}>
                        <NotifIcon className="w-5 h-5" />
                      </div>
                    )}
                    {!notif.read && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#528d5a] ring-2 ring-white" />
                    )}
                  </div>

                  {/* Body */}
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#eff5f0] text-[#528d5a]">
                        {label}
                      </span>
                      <span className="text-[11px] text-[#8ca18f] font-mono">
                        {formatTimestamp(notif.createdAt)}
                      </span>
                    </div>

                    <h4 className={`text-sm font-['Outfit'] ${notif.read ? 'font-semibold text-[#1a241b]' : 'font-bold text-[#1a241b]'}`}>
                      {notif.title}
                    </h4>

                    <p className="text-xs text-[#5a6b5c] leading-relaxed break-words">
                      {notif.message}
                    </p>

                    {/* Actionable buttons if meeting code or URL exists */}
                    {(meetingCodeToUse || notif.actionUrl) && (
                      <div className="pt-2 flex flex-wrap items-center gap-2">
                        {meetingCodeToUse && (
                          <button
                            onClick={() => navigate(`/meeting/${meetingCodeToUse}`)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#528d5a] hover:bg-[#43754a] text-white text-xs font-bold rounded-lg shadow-2xs transition-all cursor-pointer"
                          >
                            <Video className="w-3.5 h-3.5" />
                            <span>Join Meeting</span>
                          </button>
                        )}

                        {meetingCodeToUse && (
                          <button
                            onClick={() => handleCopyMeetingLink(meetingCodeToUse)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#cddfd0] hover:bg-[#eff5f0] text-[#1a241b] text-xs font-medium rounded-lg transition-colors cursor-pointer"
                          >
                            {copiedCode === meetingCodeToUse ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-[#528d5a]" />
                                <span className="text-[#528d5a] font-bold">Link Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-[#8ca18f]" />
                                <span>Copy Link</span>
                              </>
                            )}
                          </button>
                        )}

                        {notif.type === 'contact' && (
                          <button
                            onClick={() => navigate('/dashboard/contacts')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>View in Contacts</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-[#e2ede4] w-full sm:w-auto justify-end">
                  <button
                    onClick={() => handleToggleRead(notif)}
                    disabled={processingId === notif.id}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      notif.read
                        ? 'text-[#8ca18f] hover:text-[#1a241b] hover:bg-[#eff5f0]'
                        : 'text-[#528d5a] hover:bg-[#eff5f0] font-bold'
                    }`}
                    title={notif.read ? 'Mark unread' : 'Mark as read'}
                  >
                    {notif.read ? 'Mark unread' : 'Mark read'}
                  </button>

                  <button
                    onClick={() => handleDeleteNotification(notif.id)}
                    className="p-1.5 text-[#8ca18f] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Delete Notification"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
