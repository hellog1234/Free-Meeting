import React, { useEffect, useState, useRef } from 'react';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  PhoneOff, 
  Monitor, 
  MessageSquare, 
  Users, 
  ShieldCheck, 
  Copy, 
  Check, 
  Settings2, 
  Info,
  X,
  Send,
  Sliders,
  Volume2,
  Hand,
  Smile,
  Maximize,
  Minimize,
  Crown,
  VolumeX,
  UserX,
  Lock,
  AlertCircle,
  LogOut,
  Ban,
  MoreHorizontal,
  CheckCircle2,
  ExternalLink,
  HelpCircle,
  Globe,
  Sun,
  Tv,
  Bell,
  MonitorUp
} from 'lucide-react';
import { useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { 
  doc, 
  onSnapshot, 
  collection, 
  addDoc, 
  updateDoc, 
  serverTimestamp, 
  query, 
  orderBy, 
  limit,
  getDocs,
  getDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Meeting } from '../types';
import { getMeetingUrl } from '../utils/meetingUtils';
import { useWebRTC, RemotePeer } from '../hooks/useWebRTC';
import { usePermissions } from '../hooks/usePermissions';
import { ParticipantGrid } from '../components/meeting/ParticipantGrid';
import { PermissionsModal } from '../components/meeting/PermissionsModal';

interface MeetingRoomPageProps {
  meetingId: string;
}

interface ChatMessage {
  id: string;
  senderName: string;
  senderId: string;
  isHost?: boolean;
  text: string;
  timestamp: any;
}

interface FirestoreParticipant {
  id: string;
  name: string;
  isHost?: boolean;
  status?: 'joined' | 'left' | 'reconnecting';
  audioEnabled?: boolean;
  videoEnabled?: boolean;
  isHandRaised?: boolean;
  isScreenSharing?: boolean;
  isRemoved?: boolean;
  joinedAt?: any;
  leftAt?: any;
  lastSeen?: any;
  updatedAt?: any;
}

interface LiveReaction {
  id: string;
  emoji: string;
  senderName: string;
  senderId: string;
  leftOffset: number;
}

const EMOJI_OPTIONS = ['👏', '❤️', '👍', '🎉', '😂', '😮', '🔥', '✋'];

export const MeetingRoomPage: React.FC<MeetingRoomPageProps> = ({ meetingId }) => {
  const { user, isAuthenticated } = useAuth();
  const { navigate } = useRouter();

  // Load preferences from prejoin session
  const [pref] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem(`freemeet_pref_${meetingId}`);
        if (stored) return JSON.parse(stored);
      } catch (e) {}
    }
    return {
      displayName: user?.name || (user?.email ? user.email.split('@')[0] : 'Guest User'),
      participantId: user?.id || `user_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
      initialAudio: false,
      initialVideo: false,
      selectedVideoDeviceId: undefined,
      selectedAudioDeviceId: undefined,
    };
  });

  const [dismissedMediaError, setDismissedMediaError] = useState(false);

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [activeSidebar, setActiveSidebar] = useState<'chat' | 'participants' | 'info' | 'host' | null>(null);
  const [copied, setCopied] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showReactionsPopover, setShowReactionsPopover] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showMobileMoreSheet, setShowMobileMoreSheet] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const isRunningInIframe = typeof window !== 'undefined' && window.self !== window.top;

  const openInNewTab = () => {
    try {
      window.open(window.location.href, '_blank', 'noopener,noreferrer');
    } catch (e) {
      console.warn('Could not open in new tab:', e);
    }
  };

  // Hardware Device Lists
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState<string>(pref.selectedVideoDeviceId || '');
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState<string>(pref.selectedAudioDeviceId || '');

  // Firestore Participants & Chat & Reactions
  const [participantsList, setParticipantsList] = useState<FirestoreParticipant[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [liveReactions, setLiveReactions] = useState<LiveReaction[]>([]);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // REAL WebRTC Hook
  const {
    localStream,
    screenStream,
    remotePeers,
    isCameraOn,
    isMicOn,
    isScreenSharing,
    isHandRaised,
    wasRemovedByHost,
    forceMutedNotice,
    localAudioLevel,
    mediaError,
    audioAutoplayBlocked,
    setAudioAutoplayBlocked,
    toggleCamera,
    toggleMic,
    toggleScreenShare,
    toggleHandRaised,
    muteParticipant,
    muteAllParticipants,
    removeParticipant,
    leaveCall,
  } = useWebRTC({
    meetingId,
    myPeerId: pref.participantId,
    displayName: pref.displayName,
    initialAudio: pref.initialAudio ?? false,
    initialVideo: pref.initialVideo ?? false,
    selectedVideoDeviceId,
    selectedAudioDeviceId,
  });

  // Mobile Audio Unlock on User Interaction
  const handleUnlockAudio = React.useCallback(() => {
    console.log('[MOBILE MEDIA] Unlocking audio on user gesture');
    const audioEls = document.querySelectorAll('audio');
    audioEls.forEach(el => {
      el.play().catch(e => console.warn('Audio play error on gesture:', e));
    });
    const videoEls = document.querySelectorAll('video');
    videoEls.forEach(el => {
      el.play().catch(e => console.warn('Video play error on gesture:', e));
    });
    setAudioAutoplayBlocked(false);
  }, [setAudioAutoplayBlocked]);

  // Global listener to unlock audio on first touch/click when autoplay blocked
  useEffect(() => {
    if (!audioAutoplayBlocked) return;
    const onUserGesture = () => {
      handleUnlockAudio();
    };
    window.addEventListener('click', onUserGesture, { once: true });
    window.addEventListener('touchstart', onUserGesture, { once: true });
    return () => {
      window.removeEventListener('click', onUserGesture);
      window.removeEventListener('touchstart', onUserGesture);
    };
  }, [audioAutoplayBlocked, handleUnlockAudio]);

  // System & Browser Permissions Hook
  const {
    permissions,
    acquireWakeLock,
    releaseWakeLock,
    toggleWakeLock,
    sendNotification,
    requestPictureInPicture,
    openPopoutWindow,
  } = usePermissions();

  // Screen Wake Lock while inside the meeting room to prevent screen sleep
  useEffect(() => {
    acquireWakeLock();
    return () => {
      releaseWakeLock();
    };
  }, [acquireWakeLock, releaseWakeLock]);

  const isHost = Boolean(
    (meeting?.hostId && user?.id && meeting.hostId === user.id) ||
    (!meeting?.hostId && pref.participantId.startsWith('host_'))
  );

  const isScreenSharePermitted = meeting?.settings?.allowScreenSharing !== false || isHost;
  const isChatPermitted = meeting?.settings?.allowChat !== false || isHost;

  // 1. Listen to meeting details in real time
  useEffect(() => {
    const meetingDocRef = doc(db, 'meetings', meetingId);
    const unsubMeeting = onSnapshot(meetingDocRef, async (snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() } as Meeting;
        setMeeting(data);

        // If meeting is marked as ended or completed by host, disconnect and redirect immediately to meeting-ended page
        if (data.status === 'ended' || data.status === 'completed' || data.endedAt) {
          console.log('[MeetingRoom] Meeting ended by host. Disconnecting...');
          await leaveCall();
          navigate(`/meeting/${meetingId}/ended`);
        }
      }
    });

    return () => unsubMeeting();
  }, [meetingId, leaveCall, navigate]);

  // 2. Listen to real-time participant list from Firestore
  useEffect(() => {
    const partColRef = collection(db, 'meetings', meetingId, 'participants');
    const unsubParts = onSnapshot(partColRef, (snap) => {
      // Send background notification if a participant raises their hand while tab is hidden
      snap.docChanges().forEach((change) => {
        if (change.type === 'modified') {
          const d = change.doc.data();
          if (d.isHandRaised && d.id !== pref.participantId && document.hidden) {
            sendNotification('FreeMeet: Hand Raised', {
              body: `${d.name || d.displayName || 'A participant'} raised their hand.`,
            });
          }
        }
      });

      const list: FirestoreParticipant[] = snap.docs
        .map(d => ({
          id: d.id,
          ...(d.data() as Omit<FirestoreParticipant, 'id'>)
        }))
        .filter(p => !p.isRemoved && p.status !== 'left');
      
      // Sort: Host first, then raised hands, then alphabetical
      list.sort((a, b) => {
        if (a.isHost && !b.isHost) return -1;
        if (!a.isHost && b.isHost) return 1;
        if (a.isHandRaised && !b.isHandRaised) return -1;
        if (!a.isHandRaised && b.isHandRaised) return 1;
        return (a.name || '').localeCompare(b.name || '');
      });

      setParticipantsList(list);
    });

    return () => unsubParts();
  }, [meetingId, pref.participantId, sendNotification]);

  // 3. Listen to real-time chat messages
  useEffect(() => {
    const chatColRef = collection(db, 'meetings', meetingId, 'chat');
    const chatQuery = query(chatColRef, orderBy('timestamp', 'asc'));
    
    let isInitialLoad = true;
    const unsubChat = onSnapshot(chatQuery, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage));
      setMessages(msgs);

      if (!isInitialLoad) {
        // Send background notification if new chat arrives while tab is hidden
        snap.docChanges().forEach((c) => {
          if (c.type === 'added') {
            const d = c.doc.data();
            if (d.senderId !== pref.participantId && document.hidden) {
              sendNotification(`FreeMeet: ${d.senderName || 'Participant'}`, {
                body: d.text || 'Sent a new message',
              });
            }
          }
        });

        if (activeSidebar !== 'chat' && snap.docChanges().some(c => c.type === 'added')) {
          setUnreadChatCount(prev => prev + 1);
        }
      }
      isInitialLoad = false;
    });

    return () => unsubChat();
  }, [meetingId, activeSidebar, pref.participantId, sendNotification]);

  // Reset unread count when opening chat
  useEffect(() => {
    if (activeSidebar === 'chat') {
      setUnreadChatCount(0);
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  }, [activeSidebar, messages]);

  // 4. Listen to real-time reactions
  useEffect(() => {
    const reactionsColRef = collection(db, 'meetings', meetingId, 'reactions');
    const reactionsQuery = query(reactionsColRef, orderBy('createdAt', 'desc'), limit(15));
    
    const unsubReactions = onSnapshot(reactionsQuery, (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const reactionId = change.doc.id;
          
          // Generate a randomized horizontal offset (15% to 80%) for floating visual appeal
          const leftOffset = 15 + Math.floor(Math.random() * 65);
          const newReaction: LiveReaction = {
            id: reactionId,
            emoji: data.emoji || '👏',
            senderName: data.senderName || 'Participant',
            senderId: data.senderId || '',
            leftOffset,
          };

          setLiveReactions(prev => {
            if (prev.some(r => r.id === reactionId)) return prev;
            return [...prev, newReaction];
          });

          // Auto-remove reaction from floating state after 3.8s
          setTimeout(() => {
            setLiveReactions(prev => prev.filter(r => r.id !== reactionId));
          }, 3800);
        }
      });
    });

    return () => unsubReactions();
  }, [meetingId]);

  // Enumerate devices only when user explicitly opens in-call settings modal
  useEffect(() => {
    if (showSettingsModal && navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then(devices => {
        setVideoDevices(devices.filter(d => d.kind === 'videoinput'));
        setAudioDevices(devices.filter(d => d.kind === 'audioinput'));
      }).catch(() => {});
    }
  }, [showSettingsModal]);

  // Monitor browser fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Send In-Meeting Chat Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim()) return;
    if (!isChatPermitted) return;

    try {
      const chatColRef = collection(db, 'meetings', meetingId, 'chat');
      await addDoc(chatColRef, {
        senderName: pref.displayName || user?.name || 'Guest',
        senderId: pref.participantId,
        isHost: isHost,
        text: newMsg.trim(),
        timestamp: serverTimestamp(),
      });
      setNewMsg('');
    } catch (err) {
      console.warn('Error sending chat message:', err);
    }
  };

  // Broadcast Live Emoji Reaction
  const handleSendReaction = async (emoji: string) => {
    setShowReactionsPopover(false);
    try {
      const reactionsColRef = collection(db, 'meetings', meetingId, 'reactions');
      await addDoc(reactionsColRef, {
        emoji,
        senderName: pref.displayName || user?.name || 'Guest',
        senderId: pref.participantId,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Error broadcasting reaction:', err);
    }
  };

  // Toggle Fullscreen API
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn('Error attempting to enable fullscreen:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(err => {
          console.warn('Error attempting to exit fullscreen:', err);
        });
      }
    }
  };

  // Screen Share Toggle with Host Permission Validation
  const handleToggleScreenShare = () => {
    setDismissedMediaError(false);
    if (!isScreenSharing && !isScreenSharePermitted) {
      setDismissedMediaError(false);
      return;
    }
    toggleScreenShare();
  };

  // Host Action: Toggle Screen Share Permission for Meeting
  const handleToggleMeetingScreenSharePermission = async () => {
    if (!isHost || !meeting) return;
    try {
      const current = meeting.settings?.allowScreenSharing !== false;
      const meetingDocRef = doc(db, 'meetings', meetingId);
      await updateDoc(meetingDocRef, {
        'settings.allowScreenSharing': !current
      });
    } catch (e) {
      console.warn('Failed to update screen share settings:', e);
    }
  };

  // Host Action: Toggle Chat Permission for Meeting
  const handleToggleMeetingChatPermission = async () => {
    if (!isHost || !meeting) return;
    try {
      const current = meeting.settings?.allowChat !== false;
      const meetingDocRef = doc(db, 'meetings', meetingId);
      await updateDoc(meetingDocRef, {
        'settings.allowChat': !current
      });
    } catch (e) {
      console.warn('Failed to update chat settings:', e);
    }
  };

  // Host Action: End Meeting for Everyone
  const handleEndMeetingForEveryone = async () => {
    try {
      const meetingDocRef = doc(db, 'meetings', meetingId);
      
      // Calculate duration accurately
      const now = Date.now();
      const startTime = meeting?.startedAt?.toMillis 
        ? meeting.startedAt.toMillis() 
        : (meeting?.createdAt?.toMillis ? meeting.createdAt.toMillis() : now);
      
      const diffMinutes = Math.max(1, Math.round((now - startTime) / (1000 * 60)));
      let durationText = `${diffMinutes} mins`;
      if (diffMinutes >= 60) {
        const hrs = Math.floor(diffMinutes / 60);
        const mins = diffMinutes % 60;
        durationText = mins > 0 ? `${hrs}h ${mins}m` : `${hrs} hrs`;
      }

      await updateDoc(meetingDocRef, {
        status: 'completed',
        endedAt: serverTimestamp(),
        duration: durationText,
        durationMinutes: diffMinutes,
      });

      // Update all active participants in subcollection
      try {
        const partsSnap = await getDocs(collection(db, 'meetings', meetingId, 'participants'));
        const partUpdates: Promise<any>[] = [];
        partsSnap.forEach((pDoc) => {
          const pData = pDoc.data();
          if (pData.status !== 'left') {
            const pJoin = pData.joinedAt?.toMillis ? pData.joinedAt.toMillis() : startTime;
            const pDiff = Math.max(1, Math.round((now - pJoin) / (1000 * 60)));
            partUpdates.push(
              updateDoc(pDoc.ref, {
                status: 'left',
                leftAt: serverTimestamp(),
                duration: `${pDiff} mins`,
                durationMinutes: pDiff,
                audioEnabled: false,
                videoEnabled: false,
              })
            );
          }
        });
        await Promise.all(partUpdates);
      } catch (pErr) {
        console.warn('Participant cleanup on meeting end warning:', pErr);
      }

      await leaveCall();
      navigate(`/meeting/${meetingId}/ended`);
    } catch (e) {
      console.warn('Failed to end meeting for everyone:', e);
      await leaveCall();
      navigate(`/meeting/${meetingId}/ended`);
    }
  };

  // Leave Call and keep running
  const handleLeaveCall = async () => {
    await leaveCall();
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/');
    }
  };

  const copyInviteLink = () => {
    const url = getMeetingUrl(meetingId);
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalParticipantsCount = Math.max(1, participantsList.length, 1 + remotePeers.length);

  // If user was removed by host
  if (wasRemovedByHost) {
    return (
      <div className="h-screen w-screen bg-[#111812] text-white flex items-center justify-center p-4">
        <div className="bg-[#162017] rounded-3xl max-w-md w-full p-8 border border-rose-500/30 text-center space-y-5 shadow-2xl animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
            <Ban className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold font-['Outfit'] text-white">Removed from Meeting</h2>
            <p className="text-sm text-[#8ca18f]">
              You were removed by the meeting host. Your media connection has been closed.
            </p>
          </div>
          <button
            type="button"
            onClick={handleLeaveCall}
            className="w-full py-3 bg-[#528d5a] hover:bg-[#43754a] text-white font-bold text-sm rounded-xl transition-all cursor-pointer shadow-md"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // If meeting was ended by host
  if (meeting?.status === 'ended' || meeting?.status === 'completed') {
    return (
      <div className="h-screen w-screen bg-[#111812] text-white flex items-center justify-center p-4">
        <div className="bg-[#162017] rounded-3xl max-w-md w-full p-8 border border-white/10 text-center space-y-5 shadow-2xl animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-2xl bg-[#528d5a]/20 text-[#a3d9ab] flex items-center justify-center mx-auto border border-[#528d5a]/30">
            <LogOut className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold font-['Outfit'] text-white">Meeting Ended</h2>
            <p className="text-sm text-[#8ca18f]">
              The meeting host has ended this conference for all participants.
            </p>
          </div>
          <button
            type="button"
            onClick={handleLeaveCall}
            className="w-full py-3 bg-[#528d5a] hover:bg-[#43754a] text-white font-bold text-sm rounded-xl transition-all cursor-pointer shadow-md"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-[#111812] text-white flex flex-col justify-between overflow-hidden font-sans select-none relative">
      {/* Floating Live Reactions Layer */}
      <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
        {liveReactions.map(reaction => (
          <div
            key={reaction.id}
            style={{ left: `${reaction.leftOffset}%` }}
            className="absolute bottom-24 flex items-center gap-1.5 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 shadow-2xl animate-in fade-in slide-in-from-bottom duration-300 transform -translate-x-1/2 motion-safe:animate-bounce"
          >
            <span className="text-2xl">{reaction.emoji}</span>
            <span className="text-xs font-bold text-white max-w-[120px] truncate">
              {reaction.senderName}
            </span>
          </div>
        ))}
      </div>

      {/* Host Muted Notification Banner */}
      {forceMutedNotice && (
        <div className="absolute top-16 inset-x-4 z-40 max-w-md mx-auto bg-amber-950/90 backdrop-blur-md border border-amber-500/50 text-amber-200 px-4 py-2.5 rounded-2xl text-xs flex items-center gap-2 shadow-xl animate-in slide-in-from-top duration-200">
          <VolumeX className="w-4 h-4 text-amber-400 shrink-0" />
          <span>The meeting host muted your microphone.</span>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="h-14 px-4 sm:px-6 bg-[#162017]/90 backdrop-blur-md border-b border-white/10 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#528d5a] flex items-center justify-center text-white font-bold text-sm shadow-xs">
            <Video className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold font-['Outfit'] text-white truncate max-w-[180px] sm:max-w-md">
                {meeting?.title || 'FreeMeet Conference'}
              </h2>
              {isHost && (
                <span className="px-2 py-0.5 rounded-full bg-[#528d5a]/30 text-[#a3d9ab] text-[10px] font-bold border border-[#528d5a]/40 flex items-center gap-1">
                  <Crown className="w-2.5 h-2.5" />
                  Host
                </span>
              )}
            </div>
            <span className="text-[11px] font-mono text-[#8ca18f]">
              {meeting?.code || meetingId}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isRunningInIframe && (
            <button
              onClick={openInNewTab}
              id="room-open-new-tab-btn"
              title="Open meeting in standalone browser tab"
              className="px-3 py-1.5 rounded-lg bg-[#528d5a] hover:bg-[#43754a] text-xs font-bold text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Open in New Tab</span>
            </button>
          )}

          {permissions.wakeLockSupported && (
            <button
              onClick={() => toggleWakeLock()}
              id="room-wakelock-btn"
              title={permissions.wakeLock ? 'Screen Wake Lock is active (device will not sleep)' : 'Enable Screen Wake Lock'}
              className={`hidden md:flex px-2.5 py-1 rounded-md text-[11px] font-bold items-center gap-1.5 transition-colors cursor-pointer ${
                permissions.wakeLock 
                  ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300' 
                  : 'bg-white/10 text-[#8ca18f] hover:bg-white/15'
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span>{permissions.wakeLock ? 'Awake' : 'Wake Lock'}</span>
            </button>
          )}

          <button
            onClick={() => setShowPermissionsModal(true)}
            id="room-permissions-help-btn"
            title="Permission and system settings"
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-bold text-white flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#a3d9ab]" />
            <span className="hidden md:inline">Permissions</span>
          </button>

          <button
            onClick={copyInviteLink}
            id="room-copy-link-btn"
            title="Copy invitation link"
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-bold text-white flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#528d5a]" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Link Copied' : 'Copy Link'}</span>
          </button>

          <div className="hidden lg:flex px-2.5 py-1 rounded-md bg-[#528d5a]/20 border border-[#528d5a]/40 text-[#a3d9ab] text-[11px] font-bold items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#528d5a]" />
            <span>WebRTC Mesh</span>
          </div>
        </div>
      </header>

      {/* Center Stage & Dynamic Grid */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Hidden Remote Audio Sinks - ensures continuous audio reception on mobile */}
        <div className="hidden pointer-events-none" aria-hidden="true">
          {remotePeers.map((peer: RemotePeer) => (
            <audio
              key={`remote-audio-${peer.peerId}`}
              autoPlay
              playsInline
              ref={el => {
                if (el && peer.stream) {
                  if (el.srcObject !== peer.stream) {
                    el.srcObject = peer.stream;
                  }
                  el.play().catch(err => {
                    console.log('[WEBRTC] remote audio autoplay blocked:', err);
                    setAudioAutoplayBlocked(true);
                  });
                }
              }}
            />
          ))}
        </div>

        {/* Tap to Enable Meeting Audio Banner (Mobile Autoplay Policy Unlock) */}
        {audioAutoplayBlocked && (
          <div 
            onClick={handleUnlockAudio}
            className="absolute top-4 inset-x-4 z-50 max-w-md mx-auto bg-[#528d5a] text-white px-4 py-3 rounded-2xl text-xs font-bold flex items-center justify-between shadow-2xl border border-white/20 animate-bounce cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Volume2 className="w-5 h-5 animate-pulse text-white shrink-0" />
              <div>
                <p className="leading-snug">Tap to enable meeting audio</p>
                <p className="text-[10px] text-white/80 font-normal">Browser blocked automatic audio playback</p>
              </div>
            </div>
            <button
              type="button"
              className="px-3.5 py-1.5 bg-white text-[#162017] rounded-xl font-extrabold text-xs shadow-sm hover:bg-white/90 shrink-0 ml-2 cursor-pointer"
            >
              Enable Audio
            </button>
          </div>
        )}

        {/* Real Participant Video Grid */}
        <main className="flex-1 flex items-center justify-center overflow-hidden relative">
          {mediaError && !dismissedMediaError && (
            <div className="absolute top-4 inset-x-4 z-30 max-w-lg mx-auto bg-[#162017]/95 border border-amber-500/50 text-amber-100 p-3.5 rounded-2xl text-xs flex flex-col gap-2 shadow-2xl backdrop-blur-md animate-in fade-in">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-amber-100/90 leading-snug font-medium">{mediaError}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDismissedMediaError(true)}
                  className="p-1 text-amber-400 hover:text-amber-200 hover:bg-amber-800/40 rounded-lg transition-colors shrink-0 cursor-pointer"
                  title="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-2 pl-6 pt-1 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowPermissionsModal(true)}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <HelpCircle className="w-3 h-3" />
                  <span>How to Allow Access</span>
                </button>
                <button
                  type="button"
                  onClick={openInNewTab}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-white text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Open in Full Tab</span>
                </button>
              </div>
            </div>
          )}

          <ParticipantGrid
            meetingId={meetingId}
            meetingCode={meeting?.code}
            localStream={localStream}
            localName={pref.displayName}
            isCameraOn={isCameraOn}
            isMicOn={isMicOn}
            isHandRaised={isHandRaised}
            isHost={isHost}
            localAudioLevel={localAudioLevel}
            remotePeers={remotePeers}
            screenStream={screenStream}
            isScreenSharing={isScreenSharing}
            onStopScreenShare={handleToggleScreenShare}
          />

          {/* Real-time Floating Reactions Display */}
          {liveReactions.length > 0 && (
            <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
              {liveReactions.map((reaction) => (
                <div
                  key={reaction.id}
                  style={{ left: `${reaction.leftOffset}%` }}
                  className="absolute bottom-10 flex flex-col items-center gap-1 animate-float-reaction select-none"
                >
                  <span className="text-3xl sm:text-4xl filter drop-shadow-lg">{reaction.emoji}</span>
                  <span className="text-[10px] font-bold text-white bg-black/70 px-2 py-0.5 rounded-full backdrop-blur-xs border border-white/10 shadow-sm">
                    {reaction.senderName}
                  </span>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Dynamic Sidebar (Chat / Participants / Info / Host Settings) */}
        {activeSidebar && (
          <aside className="fixed inset-0 sm:static sm:inset-auto w-full sm:w-80 md:w-96 bg-[#162017] sm:border-l border-white/10 flex flex-col z-50 sm:z-30 animate-in slide-in-from-bottom sm:slide-in-from-right duration-200 shadow-2xl">
            <div className="h-14 px-4 sm:px-5 border-b border-white/10 flex items-center justify-between shrink-0 bg-[#162017]">
              <h3 className="text-sm font-bold text-white font-['Outfit'] flex items-center gap-2">
                {activeSidebar === 'chat' && (
                  <>
                    <MessageSquare className="w-4 h-4 text-[#528d5a]" />
                    <span>In-Call Chat</span>
                  </>
                )}
                {activeSidebar === 'participants' && (
                  <>
                    <Users className="w-4 h-4 text-[#528d5a]" />
                    <span>Participants ({totalParticipantsCount})</span>
                  </>
                )}
                {activeSidebar === 'info' && (
                  <>
                    <Info className="w-4 h-4 text-[#528d5a]" />
                    <span>Meeting Info</span>
                  </>
                )}
                {activeSidebar === 'host' && (
                  <>
                    <Crown className="w-4 h-4 text-amber-400" />
                    <span>Host Controls</span>
                  </>
                )}
              </h3>
              <button
                type="button"
                onClick={() => setActiveSidebar(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Close panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {/* CHAT VIEW */}
              {activeSidebar === 'chat' && (
                <div className="h-full flex flex-col justify-between">
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    {messages.length === 0 ? (
                      <div className="text-center py-12 space-y-2">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 text-[#8ca18f] flex items-center justify-center mx-auto">
                          <MessageSquare className="w-6 h-6" />
                        </div>
                        <p className="text-xs text-[#8ca18f]">
                          No messages yet. Send a real-time message to everyone in the room.
                        </p>
                      </div>
                    ) : (
                      messages.map((m) => {
                        const isMe = m.senderId === pref.participantId;
                        return (
                          <div 
                            key={m.id} 
                            className={`p-3 rounded-2xl border space-y-1 ${
                              isMe 
                                ? 'bg-[#528d5a]/20 border-[#528d5a]/30 ml-4' 
                                : 'bg-white/5 border-white/5 mr-4'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[11px] text-[#8ca18f]">
                              <span className="font-bold text-white flex items-center gap-1.5">
                                {m.senderName} {isMe && '(You)'}
                                {m.isHost && (
                                  <span className="text-[9px] px-1 py-0.2 bg-[#528d5a]/30 text-[#a3d9ab] rounded font-bold">
                                    Host
                                  </span>
                                )}
                              </span>
                            </div>
                            <p className="text-xs text-[#dbe8dc] break-words">{m.text}</p>
                          </div>
                        );
                      })
                    )}
                    <div ref={chatBottomRef} />
                  </div>

                  {/* Chat Input or Disabled Notice */}
                  {!isChatPermitted ? (
                    <div className="pt-3 border-t border-white/10 text-center p-3 bg-amber-950/30 rounded-xl border border-amber-500/20 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                      <p className="text-xs text-amber-300 flex items-center justify-center gap-1.5">
                        <Lock className="w-3.5 h-3.5" />
                        Chat has been disabled by the meeting host.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSendMessage} className="pt-3 border-t border-white/10 flex items-center gap-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                      <input
                        type="text"
                        value={newMsg}
                        onChange={(e) => setNewMsg(e.target.value)}
                        placeholder="Send a message to peers..."
                        className="flex-1 bg-white/10 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-[#8ca18f] focus:outline-none focus:ring-2 focus:ring-[#528d5a]"
                      />
                      <button
                        type="submit"
                        disabled={!newMsg.trim()}
                        className="p-2.5 bg-[#528d5a] hover:bg-[#43754a] disabled:opacity-50 text-white rounded-xl transition-all cursor-pointer shadow-xs"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* PARTICIPANTS VIEW */}
              {activeSidebar === 'participants' && (
                <div className="space-y-3">
                  {/* Host Quick Actions Bar */}
                  {isHost && (
                    <div className="p-3 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Host Actions</span>
                      <button
                        type="button"
                        onClick={muteAllParticipants}
                        className="px-3 py-1 bg-rose-600/80 hover:bg-rose-600 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <VolumeX className="w-3.5 h-3.5" />
                        <span>Mute All</span>
                      </button>
                    </div>
                  )}

                  {/* Local User Row */}
                  <div className="p-3 rounded-2xl bg-[#528d5a]/15 border border-[#528d5a]/30 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#528d5a] flex items-center justify-center text-xs font-bold text-white font-['Outfit'] shadow-xs">
                        {(pref.displayName || 'You')[0].toUpperCase()}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          {pref.displayName || 'You'} (You)
                          {isHost && (
                            <span className="px-1.5 py-0.2 rounded bg-[#528d5a]/40 text-[#a3d9ab] text-[10px] font-bold border border-[#528d5a]/50">
                              Host
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-[#8ca18f]">Local Stream</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {isHandRaised && <span className="text-sm">✋</span>}
                      {isMicOn ? <Mic className="w-3.5 h-3.5 text-[#528d5a]" /> : <MicOff className="w-3.5 h-3.5 text-rose-400" />}
                      {isCameraOn ? <Video className="w-3.5 h-3.5 text-[#528d5a]" /> : <VideoOff className="w-3.5 h-3.5 text-rose-400" />}
                    </div>
                  </div>

                  {/* Remote Participants from Firestore List */}
                  {participantsList
                    .filter(p => p.id !== pref.participantId && !p.isRemoved)
                    .map((p) => {
                      const matchingPeer = (remotePeers as RemotePeer[]).find(rp => rp.peerId === p.id);
                      const audioOn = matchingPeer ? matchingPeer.audioEnabled : p.audioEnabled ?? true;
                      const videoOn = matchingPeer ? matchingPeer.videoEnabled : p.videoEnabled ?? true;
                      const handUp = matchingPeer ? matchingPeer.isHandRaised : p.isHandRaised ?? false;

                      return (
                        <div key={p.id} className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between group">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#273829] flex items-center justify-center text-xs font-bold text-white border border-[#3d573f]">
                              {(p.name || 'P')[0].toUpperCase()}
                            </div>
                            <div>
                              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                                {p.name}
                                {p.isHost && (
                                  <span className="px-1.5 py-0.2 rounded bg-[#528d5a]/40 text-[#a3d9ab] text-[10px] font-bold">
                                    Host
                                  </span>
                                )}
                              </span>
                              <span className="text-[10px] text-[#8ca18f]">
                                {matchingPeer?.connectionState === 'connected' ? 'Connected' : 'Participant'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {handUp && <span className="text-sm">✋</span>}
                            {audioOn ? <Mic className="w-3.5 h-3.5 text-[#528d5a]" /> : <MicOff className="w-3.5 h-3.5 text-rose-400" />}
                            {videoOn ? <Video className="w-3.5 h-3.5 text-[#528d5a]" /> : <VideoOff className="w-3.5 h-3.5 text-rose-400" />}

                            {/* Host Moderation Buttons */}
                            {isHost && (
                              <div className="flex items-center gap-1 pl-2 border-l border-white/10">
                                {audioOn && (
                                  <button
                                    type="button"
                                    onClick={() => muteParticipant(p.id)}
                                    title="Mute participant"
                                    className="p-1 rounded-lg bg-white/10 hover:bg-rose-600/80 text-white transition-colors cursor-pointer"
                                  >
                                    <VolumeX className="w-3 h-3" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => removeParticipant(p.id)}
                                  title="Remove participant"
                                  className="p-1 rounded-lg bg-white/10 hover:bg-rose-600 text-rose-300 hover:text-white transition-colors cursor-pointer"
                                >
                                  <UserX className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                  {participantsList.filter(p => p.id !== pref.participantId && !p.isRemoved).length === 0 && (
                    <p className="text-xs text-[#8ca18f] text-center pt-4">
                      No other participants currently in the room.
                    </p>
                  )}
                </div>
              )}

              {/* HOST CONTROLS VIEW */}
              {activeSidebar === 'host' && isHost && (
                <div className="space-y-4">
                  <div className="p-3 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Room Permissions</h4>

                    {/* Screen Sharing Toggle */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-white">Participant Screen Sharing</p>
                        <p className="text-[11px] text-[#8ca18f]">Allow non-hosts to present screens</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleToggleMeetingScreenSharePermission}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          meeting?.settings?.allowScreenSharing !== false 
                            ? 'bg-[#528d5a] text-white' 
                            : 'bg-white/10 text-white/60'
                        }`}
                      >
                        {meeting?.settings?.allowScreenSharing !== false ? 'Enabled' : 'Disabled'}
                      </button>
                    </div>

                    {/* Chat Permission Toggle */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/10">
                      <div>
                        <p className="text-xs font-bold text-white">In-Call Chat</p>
                        <p className="text-[11px] text-[#8ca18f]">Allow participants to send messages</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleToggleMeetingChatPermission}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          meeting?.settings?.allowChat !== false 
                            ? 'bg-[#528d5a] text-white' 
                            : 'bg-white/10 text-white/60'
                        }`}
                      >
                        {meeting?.settings?.allowChat !== false ? 'Enabled' : 'Disabled'}
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-white/5 rounded-2xl border border-white/10 space-y-2.5">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Meeting Controls</h4>
                    <button
                      type="button"
                      onClick={muteAllParticipants}
                      className="w-full py-2.5 bg-white/10 hover:bg-white/15 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <VolumeX className="w-4 h-4 text-amber-400" />
                      <span>Mute All Remote Participants</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleEndMeetingForEveryone}
                      id="host-sidebar-complete-btn"
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                      <span>Complete &amp; Conclude Meeting</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleEndMeetingForEveryone}
                      className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md"
                    >
                      <PhoneOff className="w-4 h-4" />
                      <span>End Meeting for Everyone</span>
                    </button>
                  </div>
                </div>
              )}

              {/* MEETING INFO VIEW */}
              {activeSidebar === 'info' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-[#8ca18f]">Meeting Title</span>
                    <p className="text-sm font-bold text-white">{meeting?.title || 'Conference'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-[#8ca18f]">Meeting Code</span>
                    <p className="text-xs font-mono font-bold text-[#528d5a]">{meeting?.code || meetingId}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-[#8ca18f]">Host</span>
                    <p className="text-xs text-white">{meeting?.hostName || 'Organizer'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-[#8ca18f]">Active Participants</span>
                    <p className="text-xs text-[#a3d9ab]">{totalParticipantsCount} in Room</p>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={copyInviteLink}
                      className="w-full py-2.5 bg-white/10 hover:bg-white/15 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copied ? 'Copied Link' : 'Copy Joining Info'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Emoji Reactions Popover */}
      {showReactionsPopover && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-40 bg-[#162017] border border-white/15 rounded-2xl p-2 shadow-2xl flex items-center gap-1.5 animate-in zoom-in-95 duration-150">
          {EMOJI_OPTIONS.map(emoji => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleSendReaction(emoji)}
              className="w-10 h-10 rounded-xl hover:bg-white/10 flex items-center justify-center text-xl hover:scale-125 transition-transform cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Leave Call Confirmation Dialog */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#162017] rounded-3xl max-w-sm w-full p-6 border border-white/15 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 text-white text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
              <PhoneOff className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold font-['Outfit'] text-white">
                {isHost ? 'Host Leave Options' : 'Leave this meeting?'}
              </h3>
              <p className="text-xs text-[#8ca18f] mt-1">
                {isHost 
                  ? 'As host, you can end the conference for all attendees or leave while keeping the meeting active.' 
                  : 'You can rejoin anytime using the meeting link if the meeting is still active.'}
              </p>
            </div>
            <div className="space-y-2 pt-2">
              {isHost ? (
                <>
                  <button
                    type="button"
                    onClick={handleEndMeetingForEveryone}
                    id="host-complete-meeting-everyone-btn"
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                    <span>Complete &amp; End meeting for everyone</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleLeaveCall}
                    id="host-leave-keep-running-btn"
                    className="w-full py-2.5 bg-white/10 hover:bg-white/15 text-white font-bold text-xs rounded-xl border border-white/10 transition-all cursor-pointer"
                  >
                    Leave and keep meeting running
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleLeaveCall}
                  id="participant-leave-btn"
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  Leave meeting
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowLeaveModal(false)}
                id="leave-modal-cancel-btn"
                className="w-full py-2 bg-transparent hover:bg-white/5 text-[#8ca18f] hover:text-white font-semibold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Floating Control Bar */}
      <footer className="h-18 sm:h-20 bg-[#162017]/95 backdrop-blur-md border-t border-white/10 px-2 sm:px-6 flex items-center justify-between shrink-0 z-20 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {/* Desktop Left: Meeting Title & Code */}
        <div className="hidden lg:flex items-center gap-2 text-xs text-[#8ca18f] shrink-0">
          <span className="font-bold text-white truncate max-w-[180px]">{meeting?.title || 'Meeting'}</span>
          <span>•</span>
          <span className="font-mono">{meeting?.code || meetingId}</span>
        </div>

        {/* MOBILE CONTROLS BAR (< sm screens) */}
        <div className="flex sm:hidden items-center justify-around w-full max-w-md mx-auto gap-1">
          {/* Microphone */}
          <button
            onClick={toggleMic}
            id="mobile-room-mic-btn"
            title={isMicOn ? 'Mute microphone' : 'Unmute microphone'}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              isMicOn ? 'bg-white/15 text-white' : 'bg-rose-500 text-white shadow-sm'
            }`}
          >
            {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          {/* Camera */}
          <button
            onClick={toggleCamera}
            id="mobile-room-camera-btn"
            title={isCameraOn ? 'Turn off camera' : 'Turn on camera'}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              isCameraOn ? 'bg-white/15 text-white' : 'bg-rose-500 text-white shadow-sm'
            }`}
          >
            {isCameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          {/* Raise Hand */}
          <button
            onClick={toggleHandRaised}
            id="mobile-room-raise-hand-btn"
            title={isHandRaised ? 'Lower hand' : 'Raise hand'}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              isHandRaised 
                ? 'bg-amber-500 text-black font-bold shadow-lg' 
                : 'bg-white/15 text-white'
            }`}
          >
            <Hand className={`w-5 h-5 ${isHandRaised ? 'animate-bounce' : ''}`} />
          </button>

          {/* In-Call Chat */}
          <button
            onClick={() => setActiveSidebar(activeSidebar === 'chat' ? null : 'chat')}
            id="mobile-room-chat-btn"
            title="In-call chat"
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer relative ${
              activeSidebar === 'chat' ? 'bg-[#528d5a] text-white' : 'bg-white/15 text-white'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            {unreadChatCount > 0 && activeSidebar !== 'chat' && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                {unreadChatCount}
              </span>
            )}
          </button>

          {/* More Options Sheet Trigger */}
          <button
            onClick={() => setShowMobileMoreSheet(true)}
            id="mobile-room-more-btn"
            title="More actions"
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              showMobileMoreSheet ? 'bg-[#528d5a] text-white' : 'bg-white/15 text-white'
            }`}
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>

          {/* Leave Call */}
          <button
            onClick={() => setShowLeaveModal(true)}
            id="mobile-room-leave-call-btn"
            title="Leave call"
            className="w-11 h-11 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-sm transition-all cursor-pointer"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>

        {/* DESKTOP & TABLET CONTROLS BAR (>= sm screens) */}
        <div className="hidden sm:flex items-center gap-2 sm:gap-3 mx-auto">
          {/* Microphone */}
          <button
            onClick={toggleMic}
            id="room-mic-btn"
            title={isMicOn ? 'Mute microphone' : 'Unmute microphone'}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              isMicOn ? 'bg-white/15 text-white hover:bg-white/25' : 'bg-rose-500 text-white hover:bg-rose-600 shadow-sm'
            }`}
          >
            {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          {/* Camera */}
          <button
            onClick={toggleCamera}
            id="room-camera-btn"
            title={isCameraOn ? 'Turn off camera' : 'Turn on camera'}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              isCameraOn ? 'bg-white/15 text-white hover:bg-white/25' : 'bg-rose-500 text-white hover:bg-rose-600 shadow-sm'
            }`}
          >
            {isCameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          {/* Screen Share */}
          <button
            onClick={handleToggleScreenShare}
            id="room-screen-share-btn"
            title={
              !isScreenSharePermitted && !isScreenSharing
                ? 'Screen sharing is restricted by the host'
                : isScreenSharing
                ? 'Stop sharing screen'
                : 'Share screen'
            }
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              isScreenSharing
                ? 'bg-[#528d5a] text-white shadow-sm'
                : !isScreenSharePermitted
                ? 'bg-white/5 text-white/30 cursor-not-allowed'
                : 'bg-white/15 text-white hover:bg-white/25'
            }`}
          >
            <Monitor className="w-5 h-5" />
          </button>

          {/* Raise Hand */}
          <button
            onClick={toggleHandRaised}
            id="room-raise-hand-btn"
            title={isHandRaised ? 'Lower hand' : 'Raise hand'}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              isHandRaised 
                ? 'bg-amber-500 text-black shadow-lg font-bold' 
                : 'bg-white/15 text-white hover:bg-white/25'
            }`}
          >
            <Hand className={`w-5 h-5 ${isHandRaised ? 'animate-bounce' : ''}`} />
          </button>

          {/* Emoji Reactions */}
          <button
            onClick={() => setShowReactionsPopover(!showReactionsPopover)}
            id="room-reactions-btn"
            title="Send reaction"
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              showReactionsPopover ? 'bg-[#528d5a] text-white' : 'bg-white/15 text-white hover:bg-white/25'
            }`}
          >
            <Smile className="w-5 h-5" />
          </button>

          {/* Device Settings */}
          <button
            onClick={() => setShowSettingsModal(true)}
            id="room-settings-btn"
            title="Audio and video settings"
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <Settings2 className="w-5 h-5" />
          </button>

          {/* Leave / End Call */}
          <button
            onClick={() => setShowLeaveModal(true)}
            id="room-leave-call-btn"
            title="Leave call"
            className="px-4 sm:px-5 h-11 sm:h-12 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-2xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <PhoneOff className="w-5 h-5" />
            <span className="hidden md:inline">Leave</span>
          </button>
        </div>

        {/* Desktop & Tablet Right Aux Controls */}
        <div className="hidden sm:flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Host Controls Toggle (Host Only) */}
          {isHost && (
            <button
              onClick={() => setActiveSidebar(activeSidebar === 'host' ? null : 'host')}
              id="room-host-tools-btn"
              title="Host Controls"
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer relative ${
                activeSidebar === 'host' ? 'bg-amber-500 text-black font-bold' : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <Crown className="w-4 h-4" />
            </button>
          )}

          {/* Picture-in-Picture Float Video */}
          <button
            onClick={() => {
              const videoEl = document.querySelector('video') as HTMLVideoElement | null;
              requestPictureInPicture(videoEl);
            }}
            id="room-pip-btn"
            title="Picture-in-Picture floating video window"
            className="hidden md:flex w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white items-center justify-center transition-colors cursor-pointer"
          >
            <Tv className="w-4 h-4" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={handleToggleFullscreen}
            id="room-fullscreen-btn"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            className="hidden sm:flex w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white items-center justify-center transition-colors cursor-pointer"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>

          {/* Participants */}
          <button
            onClick={() => setActiveSidebar(activeSidebar === 'participants' ? null : 'participants')}
            id="room-participants-btn"
            title="Show participants"
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer relative ${
              activeSidebar === 'participants' ? 'bg-[#528d5a] text-white' : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            {totalParticipantsCount > 1 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#528d5a] text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                {totalParticipantsCount}
              </span>
            )}
          </button>

          {/* Chat */}
          <button
            onClick={() => setActiveSidebar(activeSidebar === 'chat' ? null : 'chat')}
            id="room-chat-btn"
            title="In-call chat"
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer relative ${
              activeSidebar === 'chat' ? 'bg-[#528d5a] text-white' : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            {unreadChatCount > 0 && activeSidebar !== 'chat' && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                {unreadChatCount}
              </span>
            )}
          </button>

          {/* Info */}
          <button
            onClick={() => setActiveSidebar(activeSidebar === 'info' ? null : 'info')}
            id="room-info-btn"
            title="Meeting details"
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
              activeSidebar === 'info' ? 'bg-[#528d5a] text-white' : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </footer>

      {/* Mobile "More Options" Bottom Sheet */}
      {showMobileMoreSheet && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end justify-center animate-in fade-in duration-200">
          <div 
            className="w-full bg-[#162017] rounded-t-3xl border-t border-white/15 p-5 space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
          >
            {/* Header Handle */}
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold font-['Outfit'] text-white">More Options</span>
                <span className="text-xs text-[#8ca18f]">({meeting?.code || meetingId})</span>
              </div>
              <button
                type="button"
                onClick={() => setShowMobileMoreSheet(false)}
                className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Reactions Bar */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-[#8ca18f] uppercase tracking-wider">Send Reaction</span>
              <div className="flex items-center justify-between bg-white/5 rounded-2xl p-2 border border-white/10">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      handleSendReaction(emoji);
                      setShowMobileMoreSheet(false);
                    }}
                    className="w-10 h-10 rounded-xl hover:bg-white/10 flex items-center justify-center text-2xl transition-transform active:scale-125"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Grid */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {/* Screen Sharing */}
              <button
                type="button"
                onClick={() => {
                  setShowMobileMoreSheet(false);
                  handleToggleScreenShare();
                }}
                disabled={!isScreenSharePermitted && !isScreenSharing}
                className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-colors cursor-pointer ${
                  isScreenSharing
                    ? 'bg-[#528d5a]/30 border-[#528d5a] text-white'
                    : !isScreenSharePermitted
                    ? 'bg-white/5 border-white/5 opacity-50 cursor-not-allowed text-white/50'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0">
                  <Monitor className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">
                    {isScreenSharing ? 'Stop Screen' : 'Share Screen'}
                  </p>
                  <p className="text-[10px] text-[#8ca18f] truncate">
                    {isScreenSharing ? 'Active' : isScreenSharePermitted ? 'Present stream' : 'Host disabled'}
                  </p>
                </div>
              </button>

              {/* Participants */}
              <button
                type="button"
                onClick={() => {
                  setShowMobileMoreSheet(false);
                  setActiveSidebar('participants');
                }}
                className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-left flex items-center gap-3 transition-colors cursor-pointer text-white"
              >
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0 relative">
                  <Users className="w-4 h-4" />
                  {totalParticipantsCount > 1 && (
                    <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 px-0.5 rounded-full bg-[#528d5a] text-white text-[9px] font-bold flex items-center justify-center">
                      {totalParticipantsCount}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">Participants</p>
                  <p className="text-[10px] text-[#8ca18f] truncate">{totalParticipantsCount} in room</p>
                </div>
              </button>

              {/* Audio/Video Settings */}
              <button
                type="button"
                onClick={() => {
                  setShowMobileMoreSheet(false);
                  setShowSettingsModal(true);
                }}
                className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-left flex items-center gap-3 transition-colors cursor-pointer text-white"
              >
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0">
                  <Settings2 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">Settings</p>
                  <p className="text-[10px] text-[#8ca18f] truncate">Devices & audio</p>
                </div>
              </button>

              {/* Meeting Info */}
              <button
                type="button"
                onClick={() => {
                  setShowMobileMoreSheet(false);
                  setActiveSidebar('info');
                }}
                className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-left flex items-center gap-3 transition-colors cursor-pointer text-white"
              >
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0">
                  <Info className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">Room Details</p>
                  <p className="text-[10px] text-[#8ca18f] truncate">Copy link & info</p>
                </div>
              </button>

              {/* System & Browser Permissions */}
              <button
                type="button"
                onClick={() => {
                  setShowMobileMoreSheet(false);
                  setShowPermissionsModal(true);
                }}
                className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-left flex items-center gap-3 transition-colors cursor-pointer text-white"
              >
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0">
                  <ShieldCheck className="w-4 h-4 text-[#a3d9ab]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">Permissions</p>
                  <p className="text-[10px] text-[#8ca18f] truncate">System & device access</p>
                </div>
              </button>

              {/* Picture-in-Picture Float */}
              <button
                type="button"
                onClick={() => {
                  setShowMobileMoreSheet(false);
                  const videoEl = document.querySelector('video') as HTMLVideoElement | null;
                  requestPictureInPicture(videoEl);
                }}
                className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-left flex items-center gap-3 transition-colors cursor-pointer text-white"
              >
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0">
                  <Tv className="w-4 h-4 text-[#a3d9ab]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">Floating Video</p>
                  <p className="text-[10px] text-[#8ca18f] truncate">Picture-in-Picture</p>
                </div>
              </button>

              {/* Keep Screen Awake Toggle */}
              {permissions.wakeLockSupported && (
                <button
                  type="button"
                  onClick={() => {
                    toggleWakeLock();
                  }}
                  className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-colors cursor-pointer col-span-2 ${
                    permissions.wakeLock
                      ? 'bg-amber-500/15 border-amber-500/30 text-amber-200'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-300 shrink-0">
                    <Sun className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold truncate">Keep Screen Awake (Wake Lock)</p>
                    <p className="text-[10px] text-[#8ca18f] truncate">
                      {permissions.wakeLock ? 'Active — display will not sleep' : 'Inactive — tap to prevent sleep'}
                    </p>
                  </div>
                </button>
              )}

              {/* Host Controls (If Host) */}
              {isHost && (
                <button
                  type="button"
                  onClick={() => {
                    setShowMobileMoreSheet(false);
                    setActiveSidebar('host');
                  }}
                  className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 text-left flex items-center gap-3 transition-colors cursor-pointer text-amber-200 col-span-2"
                >
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-300 shrink-0">
                    <Crown className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">Host Controls & Moderation</p>
                    <p className="text-[10px] text-amber-300/80 truncate">Mute all, lock chat, end call</p>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Device Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#162017] rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-white/15 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#528d5a]/20 text-[#a3d9ab] flex items-center justify-center">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-['Outfit']">
                    Audio &amp; Video Devices
                  </h3>
                  <p className="text-xs text-[#8ca18f]">
                    Switch inputs during your live call
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Camera Select */}
              <div>
                <label className="block text-xs font-bold text-[#8ca18f] uppercase tracking-wider mb-1.5">
                  Camera Input
                </label>
                <div className="relative">
                  <Video className="w-4 h-4 text-[#8ca18f] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <select
                    value={selectedVideoDeviceId}
                    onChange={(e) => setSelectedVideoDeviceId(e.target.value)}
                    className="w-full bg-white/10 border border-white/15 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#528d5a]"
                  >
                    {videoDevices.length > 0 ? (
                      videoDevices.map((dev, idx) => (
                        <option key={dev.deviceId || idx} value={dev.deviceId} className="bg-[#162017] text-white">
                          {dev.label || `Camera ${idx + 1}`}
                        </option>
                      ))
                    ) : (
                      <option value="" className="bg-[#162017] text-white">Default Video Device</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Microphone Select */}
              <div>
                <label className="block text-xs font-bold text-[#8ca18f] uppercase tracking-wider mb-1.5">
                  Microphone Input
                </label>
                <div className="relative">
                  <Mic className="w-4 h-4 text-[#8ca18f] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <select
                    value={selectedAudioDeviceId}
                    onChange={(e) => setSelectedAudioDeviceId(e.target.value)}
                    className="w-full bg-white/10 border border-white/15 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#528d5a]"
                  >
                    {audioDevices.length > 0 ? (
                      audioDevices.map((dev, idx) => (
                        <option key={dev.deviceId || idx} value={dev.deviceId} className="bg-[#162017] text-white">
                          {dev.label || `Microphone ${idx + 1}`}
                        </option>
                      ))
                    ) : (
                      <option value="" className="bg-[#162017] text-white">Default Audio Device</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Mic Level Indicator */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span className="flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-[#528d5a]" />
                    Microphone Audio Level
                  </span>
                  <span className="font-mono text-[#a3d9ab]">{localAudioLevel}%</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#528d5a] transition-all duration-75"
                    style={{ width: `${localAudioLevel}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="px-6 py-2.5 bg-[#528d5a] hover:bg-[#43754a] text-white font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer"
              >
                Close Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive Permissions, Screen Sharing, WakeLock & Window Center Modal */}
      <PermissionsModal
        isOpen={showPermissionsModal}
        onClose={() => setShowPermissionsModal(false)}
        activeVideoElement={document.querySelector('video') as HTMLVideoElement | null}
      />
    </div>
  );
};
