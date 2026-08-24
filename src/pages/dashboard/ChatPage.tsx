import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  MessageSquare, 
  Send, 
  Search, 
  Video, 
  Users, 
  Check, 
  CheckCheck, 
  Clock, 
  Plus, 
  X, 
  PhoneCall, 
  ShieldCheck, 
  ArrowLeft, 
  Sparkles, 
  MoreVertical,
  ExternalLink,
  Copy,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from '../../context/RouterContext';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  setDoc, 
  doc, 
  getDoc, 
  getDocs,
  serverTimestamp, 
  updateDoc, 
  limit 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Conversation, DirectMessage, User as AppUser, Contact } from '../../types';
import { generateMeetingCode, getMeetingUrl } from '../../utils/meetingUtils';

export const ChatPage: React.FC = () => {
  const { user } = useAuth();
  const { navigate } = useRouter();

  // Conversations & Active Selection
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState<boolean>(true);
  const [selectedConvoId, setSelectedConvoId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);

  // Search & Filter
  const [searchConvo, setSearchConvo] = useState<string>('');

  // Presence Cache (Registered Firebase Users)
  const [registeredUsers, setRegisteredUsers] = useState<Record<string, AppUser>>({});

  // New Chat Modal / Contact Picker
  const [showNewChatModal, setShowNewChatModal] = useState<boolean>(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [searchUserModal, setSearchUserModal] = useState<string>('');
  const [creatingConvo, setCreatingConvo] = useState<boolean>(false);

  // Invite creation
  const [creatingMeetingInvite, setCreatingMeetingInvite] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Mobile layout helper
  const [mobileShowChat, setMobileShowChat] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll messages to bottom
  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  };

  // 1. Subscribe to Live Online Presence for Registered Users
  useEffect(() => {
    if (!user?.id) return;
    try {
      const q = query(collection(db, 'users'), limit(100));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const map: Record<string, AppUser> = {};
        const list: AppUser[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const u: AppUser = {
            id: docSnap.id,
            name: data.name || 'User',
            email: data.email || '',
            avatar: data.avatar || undefined,
            isOnline: data.isOnline,
            lastSeen: data.lastSeen,
          };
          map[docSnap.id] = u;
          if (docSnap.id !== user.id) {
            list.push(u);
          }
        });
        setRegisteredUsers(map);
        setAllUsers(list);
      }, (err) => {
        console.warn('Presence snapshot error:', err);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn(e);
    }
  }, [user?.id]);

  // 2. Fetch User's Contacts for Quick Start
  useEffect(() => {
    if (!user?.id) return;
    const q = query(collection(db, 'contacts'), where('userId', '==', user.id));
    const unsubscribe = onSnapshot(q, (snap) => {
      const list: Contact[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Contact));
      setContacts(list);
    }, () => {});
    return () => unsubscribe();
  }, [user?.id]);

  // 3. Subscribe to Real-Time 1:1 Conversations for Current User
  useEffect(() => {
    if (!user?.id) {
      setLoadingConversations(false);
      return;
    }

    setLoadingConversations(true);
    const q = query(
      collection(db, 'conversations'),
      where('participantIds', 'array-contains', user.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Conversation[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Conversation);
      });

      // Sort client-side by updatedAt descending
      list.sort((a, b) => {
        const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : (a.updatedAt ? new Date(a.updatedAt).getTime() : 0);
        const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : (b.updatedAt ? new Date(b.updatedAt).getTime() : 0);
        return timeB - timeA;
      });

      setConversations(list);
      setLoadingConversations(false);

      // Auto-select first conversation if none selected on desktop
      if (!selectedConvoId && list.length > 0 && window.innerWidth > 768) {
        setSelectedConvoId(list[0].id);
      }
    }, (err) => {
      console.warn('Conversations error:', err);
      setLoadingConversations(false);
    });

    return () => unsubscribe();
  }, [user?.id]);

  // 4. Handle URL Query Parameters (e.g. from Contacts page: ?recipientId=xyz)
  useEffect(() => {
    if (!user?.id) return;

    const urlParams = new URLSearchParams(window.location.search);
    const targetRecipientId = urlParams.get('recipientId');

    if (targetRecipientId && targetRecipientId !== user.id) {
      // Find or create conversation with this recipient
      startOrOpenConversationWithUser(targetRecipientId);
    }
  }, [user?.id]);

  // 5. Subscribe to Messages of Selected Conversation
  useEffect(() => {
    if (!selectedConvoId || !user?.id) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    const messagesRef = collection(db, 'conversations', selectedConvoId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'), limit(150));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const msgs: DirectMessage[] = [];
      let hasUnread = false;

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const msg = { id: docSnap.id, ...data } as DirectMessage;
        msgs.push(msg);

        // Check if there are unread messages sent to me
        if (msg.senderId !== user.id && !msg.read) {
          hasUnread = true;
          // Mark as read in subcollection
          updateDoc(doc(db, 'conversations', selectedConvoId, 'messages', msg.id), {
            read: true
          }).catch(() => {});
        }
      });

      setMessages(msgs);
      setLoadingMessages(false);
      setTimeout(() => scrollToBottom(false), 50);

      // Clear unread count for current user on the conversation document
      if (hasUnread) {
        try {
          await updateDoc(doc(db, 'conversations', selectedConvoId), {
            [`unreadCounts.${user.id}`]: 0,
          });
        } catch (e) {}
      }
    }, (err) => {
      console.warn('Messages subscription error:', err);
      setLoadingMessages(false);
    });

    return () => unsubscribe();
  }, [selectedConvoId, user?.id]);

  // Helper to get the other participant in a conversation
  const getOtherParticipant = (convo: Conversation) => {
    if (!convo || !user?.id) return { id: '', name: 'User', email: '', avatar: undefined };
    const otherId = convo.participantIds.find((id) => id !== user.id) || convo.participantIds[0];
    
    // Check live registered user profile first
    if (registeredUsers[otherId]) {
      const ru = registeredUsers[otherId];
      return {
        id: otherId,
        name: ru.name,
        email: ru.email,
        avatar: ru.avatar,
      };
    }

    // Fallback to conversation participant metadata
    const meta = convo.participants?.[otherId] || { name: 'User', email: '' };
    return {
      id: otherId,
      name: meta.name || 'User',
      email: meta.email || '',
      avatar: meta.avatar,
    };
  };

  // Helper to determine presence for a user ID
  const getUserPresence = (userId: string) => {
    const regUser = registeredUsers[userId];
    if (!regUser) {
      return { isOnline: false, statusText: 'Offline', labelClass: 'text-[#8ca18f]' };
    }

    if (regUser.isOnline) {
      return { isOnline: true, statusText: 'Online', labelClass: 'text-emerald-600 font-semibold' };
    }

    if (regUser.lastSeen) {
      try {
        const time = regUser.lastSeen.toDate ? regUser.lastSeen.toDate() : new Date(regUser.lastSeen);
        const diffMinutes = Math.floor((Date.now() - time.getTime()) / (1000 * 60));
        if (diffMinutes < 5) {
          return { isOnline: true, statusText: 'Active recently', labelClass: 'text-emerald-600 font-medium' };
        }
        if (diffMinutes < 60) {
          return { isOnline: false, statusText: `${diffMinutes}m ago`, labelClass: 'text-[#8ca18f]' };
        }
        const diffHours = Math.floor(diffMinutes / 60);
        if (diffHours < 24) {
          return { isOnline: false, statusText: `${diffHours}h ago`, labelClass: 'text-[#8ca18f]' };
        }
        return { isOnline: false, statusText: 'Offline', labelClass: 'text-[#8ca18f]' };
      } catch (e) {}
    }

    return { isOnline: false, statusText: 'Offline', labelClass: 'text-[#8ca18f]' };
  };

  // Find or create conversation with target user
  const startOrOpenConversationWithUser = async (targetUserId: string) => {
    if (!user?.id || targetUserId === user.id) return;

    setCreatingConvo(true);
    try {
      // 1. Check if conversation already exists in state
      const existing = conversations.find((c) => 
        c.participantIds.includes(user.id) && c.participantIds.includes(targetUserId)
      );

      if (existing) {
        setSelectedConvoId(existing.id);
        setMobileShowChat(true);
        setShowNewChatModal(false);
        setCreatingConvo(false);
        return;
      }

      // 2. Query Firestore to verify
      const q = query(
        collection(db, 'conversations'),
        where('participantIds', 'array-contains', user.id)
      );
      const snap = await getDocs(q);
      let foundConvoId: string | null = null;

      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.participantIds && data.participantIds.includes(targetUserId)) {
          foundConvoId = docSnap.id;
        }
      });

      if (foundConvoId) {
        setSelectedConvoId(foundConvoId);
        setMobileShowChat(true);
        setShowNewChatModal(false);
        setCreatingConvo(false);
        return;
      }

      // 3. Fetch target user profile
      let targetName = 'User';
      let targetEmail = '';
      let targetAvatar: string | undefined;

      if (registeredUsers[targetUserId]) {
        targetName = registeredUsers[targetUserId].name;
        targetEmail = registeredUsers[targetUserId].email;
        targetAvatar = registeredUsers[targetUserId].avatar;
      } else {
        const uSnap = await getDoc(doc(db, 'users', targetUserId));
        if (uSnap.exists()) {
          const uData = uSnap.data();
          targetName = uData.name || 'User';
          targetEmail = uData.email || '';
          targetAvatar = uData.avatar || undefined;
        }
      }

      // 4. Create deterministic conversation or new document
      // Sort participant IDs for deterministic naming
      const sortedIds = [user.id, targetUserId].sort();
      const customConvoId = `${sortedIds[0]}_${sortedIds[1]}`;

      const newConvoData = {
        participantIds: sortedIds,
        participants: {
          [user.id]: {
            name: user.name || 'User',
            email: user.email || '',
            avatar: user.avatar || null,
          },
          [targetUserId]: {
            name: targetName,
            email: targetEmail,
            avatar: targetAvatar || null,
          }
        },
        lastMessage: null,
        unreadCounts: {
          [user.id]: 0,
          [targetUserId]: 0,
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'conversations', customConvoId), newConvoData, { merge: true });

      setSelectedConvoId(customConvoId);
      setMobileShowChat(true);
      setShowNewChatModal(false);
    } catch (e) {
      console.error('Error initiating conversation:', e);
    } finally {
      setCreatingConvo(false);
    }
  };

  // Send a regular text message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedConvoId || !user?.id || sending) return;

    const textToSend = inputText.trim();
    setInputText('');
    setSending(true);

    const activeConvo = conversations.find((c) => c.id === selectedConvoId);
    const otherParticipant = activeConvo ? getOtherParticipant(activeConvo) : null;
    const otherId = otherParticipant?.id;

    try {
      // 1. Add to messages subcollection
      const messagesRef = collection(db, 'conversations', selectedConvoId, 'messages');
      await addDoc(messagesRef, {
        conversationId: selectedConvoId,
        senderId: user.id,
        senderName: user.name || 'User',
        senderEmail: user.email || '',
        text: textToSend,
        read: false,
        createdAt: serverTimestamp(),
      });

      // 2. Update parent conversation document
      const currentUnread = otherId && activeConvo?.unreadCounts?.[otherId] ? activeConvo.unreadCounts[otherId] : 0;
      await updateDoc(doc(db, 'conversations', selectedConvoId), {
        lastMessage: {
          text: textToSend,
          senderId: user.id,
          senderName: user.name || 'User',
          createdAt: serverTimestamp(),
          read: false,
        },
        updatedAt: serverTimestamp(),
        ...(otherId ? { [`unreadCounts.${otherId}`]: currentUnread + 1 } : {}),
      });

      scrollToBottom(true);
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  // Instant Meeting Invite directly into 1:1 chat
  const handleSendMeetingInvite = async () => {
    if (!selectedConvoId || !user?.id || creatingMeetingInvite) return;

    setCreatingMeetingInvite(true);
    const activeConvo = conversations.find((c) => c.id === selectedConvoId);
    const otherParticipant = activeConvo ? getOtherParticipant(activeConvo) : null;
    const otherId = otherParticipant?.id;

    try {
      const code = generateMeetingCode();
      const meetingTitle = `1:1 Call with ${user.name || 'Host'}`;
      
      // 1. Create Meeting in Firestore
      const meetingDoc = await addDoc(collection(db, 'meetings'), {
        hostId: user.id,
        hostName: user.name || 'Host',
        title: meetingTitle,
        code: code,
        status: 'active',
        participantCount: 1,
        createdAt: serverTimestamp(),
      });

      const invitePayload = {
        meetingId: meetingDoc.id,
        title: meetingTitle,
        code: code,
      };

      const inviteText = `📹 Started a live video meeting: ${meetingTitle} (Room Code: ${code})`;

      // 2. Add message with meeting invite
      const messagesRef = collection(db, 'conversations', selectedConvoId, 'messages');
      await addDoc(messagesRef, {
        conversationId: selectedConvoId,
        senderId: user.id,
        senderName: user.name || 'User',
        senderEmail: user.email || '',
        text: inviteText,
        meetingInvite: invitePayload,
        read: false,
        createdAt: serverTimestamp(),
      });

      // 3. Update conversation
      const currentUnread = otherId && activeConvo?.unreadCounts?.[otherId] ? activeConvo.unreadCounts[otherId] : 0;
      await updateDoc(doc(db, 'conversations', selectedConvoId), {
        lastMessage: {
          text: `📹 Meeting Invite: ${code}`,
          senderId: user.id,
          senderName: user.name || 'User',
          createdAt: serverTimestamp(),
          read: false,
          meetingInvite: invitePayload,
        },
        updatedAt: serverTimestamp(),
        ...(otherId ? { [`unreadCounts.${otherId}`]: currentUnread + 1 } : {}),
      });

      // 4. Send real meeting invite notification to recipient
      if (otherId) {
        await addDoc(collection(db, 'notifications'), {
          userId: otherId,
          type: 'invite',
          title: 'Meeting Invitation',
          message: `${user.name || user.email || 'A colleague'} invited you to join "${meetingTitle}".`,
          senderName: user.name || 'User',
          senderAvatar: user.avatar || null,
          actionUrl: `/meeting/${code}`,
          meetingCode: code,
          read: false,
          createdAt: serverTimestamp(),
        }).catch((e) => console.warn('Invite notification emit warning:', e));
      }

      scrollToBottom(true);
    } catch (err) {
      console.error('Error creating meeting invite:', err);
    } finally {
      setCreatingMeetingInvite(false);
    }
  };

  // Helper formatting for timestamps
  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const formatConvoDate = (timestamp: any) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      if (isToday) {
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      }
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const getInitials = (nameStr: string) => {
    if (!nameStr) return 'U';
    const parts = nameStr.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Active selected conversation
  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === selectedConvoId) || null;
  }, [conversations, selectedConvoId]);

  const activeOtherUser = useMemo(() => {
    if (!activeConversation) return null;
    return getOtherParticipant(activeConversation);
  }, [activeConversation, registeredUsers]);

  const activePresence = useMemo(() => {
    if (!activeOtherUser?.id) return { isOnline: false, statusText: 'Offline', labelClass: 'text-[#8ca18f]' };
    return getUserPresence(activeOtherUser.id);
  }, [activeOtherUser, registeredUsers]);

  // Filtered Conversations in Sidebar
  const filteredConversations = useMemo(() => {
    return conversations.filter((convo) => {
      if (!searchConvo.trim()) return true;
      const other = getOtherParticipant(convo);
      const q = searchConvo.toLowerCase();
      return other.name.toLowerCase().includes(q) || other.email.toLowerCase().includes(q);
    });
  }, [conversations, searchConvo, registeredUsers]);

  // Filtered Users in New Chat Modal
  const modalFilteredUsers = useMemo(() => {
    return allUsers.filter((u) => {
      if (!searchUserModal.trim()) return true;
      const q = searchUserModal.toLowerCase();
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    });
  }, [allUsers, searchUserModal]);

  return (
    <div className="h-[calc(100vh-125px)] sm:h-[calc(100vh-140px)] min-h-[500px] flex flex-col bg-white rounded-3xl border border-[#e2ede4] shadow-xs overflow-hidden animate-in fade-in duration-300 font-sans">
      <div className="flex-1 flex overflow-hidden">
        
        {/* ================= LEFT: CONVERSATIONS SIDEBAR ================= */}
        <div className={`w-full md:w-80 lg:w-96 border-r border-[#e2ede4] flex flex-col bg-[#f8f9f8]/40 shrink-0 ${
          mobileShowChat ? 'hidden md:flex' : 'flex'
        }`}>
          {/* Header */}
          <div className="p-4 border-b border-[#e2ede4] flex items-center justify-between bg-white">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#eff5f0] text-[#528d5a] flex items-center justify-center border border-[#cddfd0]">
                <MessageSquare className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-[#1a241b] font-['Outfit']">
                Direct Messages
              </h2>
            </div>

            <button
              onClick={() => setShowNewChatModal(true)}
              id="new-chat-modal-btn"
              className="p-2 rounded-xl bg-[#528d5a] hover:bg-[#43754a] text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shadow-[#528d5a]/20"
              title="Start New Chat"
            >
              <Plus className="w-4 h-4" />
              <span className="text-xs">New Chat</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="p-3 border-b border-[#e2ede4] bg-white">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#8ca18f] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchConvo}
                onChange={(e) => setSearchConvo(e.target.value)}
                placeholder="Search conversations..."
                className="w-full bg-[#f8f9f8] border border-[#e2ede4] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#1a241b] placeholder:text-[#8ca18f] focus:outline-none focus:ring-2 focus:ring-[#528d5a]"
              />
              {searchConvo && (
                <button
                  onClick={() => setSearchConvo('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8ca18f] hover:text-[#1a241b]"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#e2ede4]/60 bg-white">
            {loadingConversations ? (
              <div className="p-8 text-center space-y-2 text-xs text-[#8ca18f]">
                <div className="w-5 h-5 rounded-full border-2 border-[#528d5a] border-t-transparent animate-spin mx-auto" />
                <p>Loading messages...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-[#eff5f0] text-[#528d5a] flex items-center justify-center mx-auto">
                  <Users className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-[#1a241b]">No conversations yet</p>
                  <p className="text-[11px] text-[#5a6b5c] max-w-[200px] mx-auto">
                    Start a 1:1 conversation with any teammate or contact.
                  </p>
                </div>
                <button
                  onClick={() => setShowNewChatModal(true)}
                  className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-[#eff5f0] text-[#3d6e44] hover:bg-[#e2ede4] text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Start Chat</span>
                </button>
              </div>
            ) : (
              filteredConversations.map((convo) => {
                const isSelected = convo.id === selectedConvoId;
                const other = getOtherParticipant(convo);
                const presence = getUserPresence(other.id);
                const unread = user?.id && convo.unreadCounts?.[user.id] ? convo.unreadCounts[user.id] : 0;
                const lastMsg = convo.lastMessage;

                return (
                  <button
                    key={convo.id}
                    onClick={() => {
                      setSelectedConvoId(convo.id);
                      setMobileShowChat(true);
                    }}
                    className={`w-full p-3.5 text-left flex items-center gap-3 transition-colors cursor-pointer relative ${
                      isSelected
                        ? 'bg-[#eff5f0] border-l-4 border-[#528d5a]'
                        : 'hover:bg-[#f8f9f8]'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      {other.avatar ? (
                        <img
                          src={other.avatar}
                          alt={other.name}
                          className="w-10 h-10 rounded-xl object-cover border border-[#e2ede4]"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-[#eff5f0] text-[#3d6e44] font-bold text-xs font-['Outfit'] border border-[#cddfd0] flex items-center justify-center">
                          {getInitials(other.name)}
                        </div>
                      )}
                      {/* Presence badge */}
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                          presence.isOnline ? 'bg-emerald-500' : 'bg-stone-300'
                        }`}
                        title={presence.statusText}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h3 className="text-xs font-bold text-[#1a241b] truncate font-['Outfit']">
                          {other.name}
                        </h3>
                        <span className="text-[10px] text-[#8ca18f] font-mono shrink-0">
                          {formatConvoDate(convo.updatedAt)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-xs truncate ${
                          unread > 0 ? 'font-bold text-[#1a241b]' : 'text-[#5a6b5c]'
                        }`}>
                          {lastMsg ? (
                            lastMsg.senderId === user?.id ? `You: ${lastMsg.text}` : lastMsg.text
                          ) : (
                            <span className="italic text-[#8ca18f]">New conversation</span>
                          )}
                        </p>

                        {unread > 0 && (
                          <span className="w-4 h-4 rounded-full bg-[#528d5a] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                            {unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ================= RIGHT: ACTIVE CHAT THREAD ================= */}
        <div className={`flex-1 flex flex-col bg-white overflow-hidden ${
          !mobileShowChat ? 'hidden md:flex' : 'flex'
        }`}>
          {activeConversation && activeOtherUser ? (
            <>
              {/* Active Header */}
              <div className="px-4 py-3 border-b border-[#e2ede4] bg-[#f8f9f8]/80 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setMobileShowChat(false)}
                    className="p-1.5 rounded-xl hover:bg-[#eff5f0] text-[#1a241b] md:hidden cursor-pointer"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div className="relative shrink-0">
                    {activeOtherUser.avatar ? (
                      <img
                        src={activeOtherUser.avatar}
                        alt={activeOtherUser.name}
                        className="w-10 h-10 rounded-xl object-cover border border-[#e2ede4]"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-[#eff5f0] text-[#3d6e44] font-bold text-xs font-['Outfit'] border border-[#cddfd0] flex items-center justify-center">
                        {getInitials(activeOtherUser.name)}
                      </div>
                    )}
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                        activePresence.isOnline ? 'bg-emerald-500' : 'bg-stone-300'
                      }`}
                    />
                  </div>

                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-[#1a241b] font-['Outfit'] truncate">
                      {activeOtherUser.name}
                    </h2>
                    <p className="text-[11px] flex items-center gap-1.5 truncate">
                      <span className={activePresence.labelClass}>
                        {activePresence.statusText}
                      </span>
                      <span className="text-[#8ca18f]">•</span>
                      <span className="text-[#8ca18f] truncate">{activeOtherUser.email}</span>
                    </p>
                  </div>
                </div>

                {/* Instant Meeting Action */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleSendMeetingInvite}
                    disabled={creatingMeetingInvite}
                    id="chat-send-call-invite-btn"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#eff5f0] hover:bg-[#e2ede4] text-[#3d6e44] text-xs font-bold rounded-xl border border-[#cddfd0] transition-colors cursor-pointer disabled:opacity-60"
                    title="Send instant video meeting invitation"
                  >
                    <Video className="w-3.5 h-3.5 text-[#528d5a]" />
                    <span className="hidden sm:inline">
                      {creatingMeetingInvite ? 'Starting...' : 'Instant Call'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Messages Scroll Area */}
              <div 
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 bg-[#fbfdfb]/30"
              >
                {loadingMessages ? (
                  <div className="text-center py-12 text-xs text-[#8ca18f] space-y-2">
                    <div className="w-5 h-5 rounded-full border-2 border-[#528d5a] border-t-transparent animate-spin mx-auto" />
                    <p>Loading message history...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-16 px-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#eff5f0] text-[#528d5a] flex items-center justify-center mx-auto mb-3 border border-[#cddfd0]">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-bold text-[#1a241b] font-['Outfit']">
                      Start of conversation with {activeOtherUser.name}
                    </h3>
                    <p className="text-xs text-[#5a6b5c] mt-1 max-w-xs mx-auto">
                      Send a message or invite them to a video conference call.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.senderId === user?.id;

                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-2.5 max-w-md sm:max-w-lg ${
                          isMe ? 'ml-auto flex-row-reverse' : ''
                        }`}
                      >
                        {/* Avatar */}
                        {!isMe && (
                          <div className="w-7 h-7 rounded-lg bg-[#eff5f0] text-[#3d6e44] font-bold text-[11px] border border-[#cddfd0] flex items-center justify-center shrink-0 self-end mb-1">
                            {getInitials(msg.senderName)}
                          </div>
                        )}

                        <div className={`space-y-1 ${isMe ? 'items-end' : ''}`}>
                          {/* Chat Bubble */}
                          <div
                            className={`p-3 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-2xs ${
                              isMe
                                ? 'bg-[#528d5a] text-white rounded-br-xs'
                                : 'bg-white border border-[#e2ede4] text-[#1a241b] rounded-bl-xs'
                            }`}
                          >
                            {/* Meeting Invite Card if present */}
                            {msg.meetingInvite ? (
                              <div className="space-y-2.5">
                                <div className="flex items-center gap-2 pb-2 border-b border-white/20">
                                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                                    isMe ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700'
                                  }`}>
                                    <Video className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-xs">Video Meeting Invite</h4>
                                    <p className={`text-[10px] ${isMe ? 'text-white/80' : 'text-[#5a6b5c]'}`}>
                                      Code: <strong className="font-mono">{msg.meetingInvite.code}</strong>
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 pt-1">
                                  <a
                                    href={`/room/${msg.meetingInvite.code}`}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                                      isMe
                                        ? 'bg-white text-[#3d6e44] hover:bg-white/90'
                                        : 'bg-[#528d5a] text-white hover:bg-[#43754a]'
                                    }`}
                                  >
                                    <Video className="w-3.5 h-3.5" />
                                    <span>Join Call</span>
                                  </a>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(getMeetingUrl(msg.meetingInvite!.code));
                                      setCopiedCode(msg.meetingInvite!.code);
                                      setTimeout(() => setCopiedCode(null), 2000);
                                    }}
                                    className={`p-1.5 rounded-xl text-xs transition-colors cursor-pointer ${
                                      isMe ? 'hover:bg-white/20 text-white' : 'hover:bg-[#eff5f0] text-[#5a6b5c]'
                                    }`}
                                    title="Copy meeting link"
                                  >
                                    {copiedCode === msg.meetingInvite.code ? (
                                      <Check className="w-3.5 h-3.5" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                            )}
                          </div>

                          {/* Timestamp & Read state */}
                          <div className={`flex items-center gap-1 text-[10px] px-1 ${
                            isMe ? 'justify-end text-[#8ca18f]' : 'text-[#8ca18f]'
                          }`}>
                            <span className="font-mono">{formatTime(msg.createdAt)}</span>
                            {isMe && (
                              <span title={msg.read ? 'Read' : 'Delivered'}>
                                {msg.read ? (
                                  <CheckCheck className="w-3 h-3 text-[#528d5a]" />
                                ) : (
                                  <Check className="w-3 h-3 text-[#8ca18f]" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Box */}
              <form 
                onSubmit={handleSendMessage} 
                className="p-3 sm:p-4 border-t border-[#e2ede4] bg-white flex items-center gap-2 shrink-0"
              >
                <button
                  type="button"
                  onClick={handleSendMeetingInvite}
                  disabled={creatingMeetingInvite}
                  className="p-2.5 rounded-xl bg-[#eff5f0] hover:bg-[#e2ede4] text-[#3d6e44] transition-colors cursor-pointer shrink-0"
                  title="Send instant video meeting link"
                >
                  <Video className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Message ${activeOtherUser.name}...`}
                  className="flex-1 bg-[#f8f9f8] border border-[#e2ede4] rounded-xl px-4 py-2.5 text-xs text-[#1a241b] placeholder:text-[#8ca18f] focus:outline-none focus:ring-2 focus:ring-[#528d5a]"
                />

                <button
                  type="submit"
                  disabled={!inputText.trim() || sending}
                  className="p-2.5 rounded-xl bg-[#528d5a] hover:bg-[#43754a] text-white transition-all disabled:opacity-40 cursor-pointer shadow-xs shadow-[#528d5a]/20 shrink-0"
                  title="Send Message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-center">
              <div className="max-w-sm space-y-3">
                <div className="w-14 h-14 rounded-3xl bg-[#eff5f0] text-[#528d5a] flex items-center justify-center mx-auto border border-[#cddfd0]">
                  <MessageSquare className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-[#1a241b] font-['Outfit']">
                  Your Personal Direct Messages
                </h3>
                <p className="text-xs text-[#5a6b5c] leading-relaxed">
                  Select an existing conversation on the left, or start a new chat with a real registered user or contact.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => setShowNewChatModal(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#528d5a] hover:bg-[#43754a] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs shadow-[#528d5a]/20"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Start New Conversation</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================= NEW CHAT MODAL ================= */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1a241b]/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-[#e2ede4] max-w-md w-full p-6 shadow-2xl relative animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#e2ede4]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#eff5f0] text-[#528d5a] flex items-center justify-center border border-[#cddfd0]">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1a241b] font-['Outfit']">
                    Start Direct Chat
                  </h3>
                  <p className="text-[11px] text-[#5a6b5c]">
                    Choose a contact or registered Firebase user
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="p-1.5 rounded-xl hover:bg-[#eff5f0] text-[#5a6b5c] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#8ca18f] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                value={searchUserModal}
                onChange={(e) => setSearchUserModal(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full bg-[#f8f9f8] border border-[#e2ede4] rounded-xl pl-8 pr-3 py-2 text-xs text-[#1a241b] placeholder:text-[#8ca18f] focus:outline-none focus:ring-2 focus:ring-[#528d5a]"
              />
            </div>

            {/* Users / Contacts List */}
            <div className="max-h-64 overflow-y-auto space-y-1.5 divide-y divide-[#e2ede4]/40">
              {modalFilteredUsers.length === 0 ? (
                <div className="text-center py-8 text-xs text-[#8ca18f]">
                  No registered users found.
                </div>
              ) : (
                modalFilteredUsers.map((u) => {
                  const presence = getUserPresence(u.id);

                  return (
                    <button
                      key={u.id}
                      disabled={creatingConvo}
                      onClick={() => startOrOpenConversationWithUser(u.id)}
                      className="w-full p-2.5 rounded-xl hover:bg-[#eff5f0] transition-colors flex items-center justify-between gap-3 text-left cursor-pointer pt-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative shrink-0">
                          {u.avatar ? (
                            <img
                              src={u.avatar}
                              alt={u.name}
                              className="w-8 h-8 rounded-lg object-cover border border-[#e2ede4]"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-[#eff5f0] text-[#3d6e44] font-bold text-xs font-['Outfit'] border border-[#cddfd0] flex items-center justify-center">
                              {getInitials(u.name)}
                            </div>
                          )}
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white ${
                              presence.isOnline ? 'bg-emerald-500' : 'bg-stone-300'
                            }`}
                          />
                        </div>

                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-[#1a241b] truncate font-['Outfit']">
                            {u.name}
                          </h4>
                          <p className="text-[10px] text-[#5a6b5c] truncate">
                            {u.email}
                          </p>
                        </div>
                      </div>

                      <span className="text-[11px] text-[#528d5a] font-bold shrink-0">
                        Chat &rarr;
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            <div className="pt-2 border-t border-[#e2ede4] flex items-center justify-between text-xs">
              <span className="text-[11px] text-[#8ca18f] flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#528d5a]" />
                <span>Authorized Real-time Firestore Channel</span>
              </span>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="px-3.5 py-1.5 rounded-xl bg-[#eff5f0] text-[#1a241b] text-xs font-bold hover:bg-[#e2ede4]"
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
