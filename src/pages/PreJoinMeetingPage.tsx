import React, { useEffect, useState, useRef, useCallback } from 'react';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Settings2, 
  ShieldCheck, 
  ArrowRight, 
  Lock, 
  Users, 
  Copy, 
  Check, 
  Sparkles,
  AlertCircle,
  Volume2,
  X,
  LogOut,
  User,
  Sliders,
  Radio,
  CheckCircle2,
  Maximize2,
  SwitchCamera,
  KeyRound,
  Hash,
  RefreshCw,
  Edit3,
  ExternalLink,
  HelpCircle,
  Globe
} from 'lucide-react';
import { useRouter, Link } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc, updateDoc, increment, setDoc, addDoc, collection, serverTimestamp, arrayUnion, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Meeting } from '../types';
import { getMeetingUrl, normalizeMeetingCode } from '../utils/meetingUtils';
import { PermissionsModal } from '../components/meeting/PermissionsModal';

interface PreJoinMeetingPageProps {
  meetingId: string;
}

export const PreJoinMeetingPage: React.FC<PreJoinMeetingPageProps> = ({ meetingId }) => {
  const { user, isAuthenticated } = useAuth();
  const { navigate } = useRouter();

  // Firestore Meeting State
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [canonicalMeetingId, setCanonicalMeetingId] = useState<string>(meetingId);
  const [loadingMeeting, setLoadingMeeting] = useState(true);
  const [meetingError, setMeetingError] = useState<string | null>(null);

  // Form Fields
  const [displayName, setDisplayName] = useState(
    user?.name || (user?.email ? user.email.split('@')[0] : '') || ''
  );
  const [enteredPassword, setEnteredPassword] = useState('');
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState<boolean>(false);
  const [isCompletingMeeting, setIsCompletingMeeting] = useState<boolean>(false);

  // Meeting Code Switch Modal State
  const [showCodeModal, setShowCodeModal] = useState<boolean>(false);
  const [newMeetingCodeInput, setNewMeetingCodeInput] = useState<string>('');
  const [codeSwitchError, setCodeSwitchError] = useState<string | null>(null);

  // Hardware Media State - Defaults to ON for meeting preference
  const [isCameraOn, setIsCameraOn] = useState<boolean>(true);
  const [isMicOn, setIsMicOn] = useState<boolean>(true);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('user');
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState<boolean>(false);

  const isRunningInIframe = typeof window !== 'undefined' && window.self !== window.top;

  const openInNewTab = () => {
    try {
      window.open(window.location.href, '_blank', 'noopener,noreferrer');
    } catch (e) {
      console.warn('Could not open new tab:', e);
    }
  };

  // Devices & Audio Level
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState<string>('');
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState<number>(0);

  // Stream Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // 1. Fetch meeting from Firestore
  useEffect(() => {
    let isMounted = true;

    const fetchMeeting = async () => {
      try {
        setLoadingMeeting(true);
        let targetId = meetingId;
        let docRef = doc(db, 'meetings', targetId);
        let docSnap = await getDoc(docRef);

        // If not found by direct ID, search by room code
        if (!docSnap.exists()) {
          const q = query(collection(db, 'meetings'), where('code', '==', targetId));
          const snap = await getDocs(q);
          if (!snap.empty) {
            docSnap = snap.docs[0];
            targetId = docSnap.id;
          }
        }

        if (!isMounted) return;

        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as Meeting;
          setMeeting(data);
          setCanonicalMeetingId(targetId);

          // Verify if meeting has ended
          if (data.status === 'ended' || data.status === 'completed' || data.status === 'cancelled' || data.endedAt) {
            setMeetingError('This meeting has ended and cannot be joined.');
          }
        } else {
          setMeetingError('Meeting not found. Please check the link or code.');
        }
      } catch (err: any) {
        console.error('Error fetching meeting info:', err);
        if (isMounted) {
          setMeetingError('Unable to load meeting details. Please check your connection.');
        }
      } finally {
        if (isMounted) {
          setLoadingMeeting(false);
        }
      }
    };

    fetchMeeting();

    return () => {
      isMounted = false;
    };
  }, [meetingId]);

  // Sync display name if user loads later
  useEffect(() => {
    if (!displayName && user?.name) {
      setDisplayName(user.name);
    }
  }, [user, displayName]);

  // 2. Camera & Mic preview stream management ONLY on this page
  const stopMediaStream = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setAudioLevel(0);
  }, []);

  // Initialize or update stream based on toggles
  const updateMediaStream = useCallback(async (
    enableVideo: boolean, 
    enableAudio: boolean, 
    videoId?: string, 
    audioId?: string,
    facing: 'user' | 'environment' = cameraFacingMode
  ) => {
    setPermissionError(null);

    // If both off, stop stream
    if (!enableVideo && !enableAudio) {
      stopMediaStream();
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: enableVideo ? (
          videoId 
            ? { deviceId: { exact: videoId } } 
            : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: { ideal: facing } }
        ) : false,
        audio: enableAudio ? (
          audioId 
            ? { deviceId: { exact: audioId } } 
            : { echoCancellation: true, noiseSuppression: true }
        ) : false,
      };

      let newStream: MediaStream;
      try {
        newStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (firstErr: any) {
        console.warn('Initial constraints failed, trying simplest fallback:', firstErr);
        try {
          if (enableVideo && enableAudio) {
            newStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          } else if (enableVideo) {
            newStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          } else {
            newStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
          }
        } catch (secondErr: any) {
          // If video failed, attempt audio-only as last resort
          if (enableVideo && enableAudio) {
            newStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
            setIsCameraOn(false);
            setPermissionError('Camera was unavailable or blocked. Microphone enabled.');
          } else {
            throw secondErr;
          }
        }
      }

      // Clean up previous tracks
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      mediaStreamRef.current = newStream;

      // Attach video
      if (videoRef.current && enableVideo && newStream.getVideoTracks().length > 0) {
        videoRef.current.srcObject = newStream;
        videoRef.current.play().catch(() => {});
      }

      // Audio level analyser
      if (enableAudio && newStream.getAudioTracks().length > 0) {
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            const audioCtx = new AudioContextClass();
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            const source = audioCtx.createMediaStreamSource(newStream);
            source.connect(analyser);

            audioContextRef.current = audioCtx;
            analyserRef.current = analyser;

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const checkVolume = () => {
              if (!analyserRef.current) return;
              analyserRef.current.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
              }
              const average = sum / dataArray.length;
              setAudioLevel(Math.min(100, Math.round((average / 128) * 100)));
              animationFrameRef.current = requestAnimationFrame(checkVolume);
            };
            checkVolume();
          }
        } catch (audioErr) {
          console.warn('Audio analyser unavailable:', audioErr);
        }
      }

      // Enumerate available hardware devices
      if (navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setVideoDevices(devices.filter((d) => d.kind === 'videoinput'));
        setAudioDevices(devices.filter((d) => d.kind === 'audioinput'));
      }
    } catch (err: any) {
      console.warn('Media access error / permission denied:', err);
      const isDenied = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
      if (isDenied) {
        setPermissionError(
          isRunningInIframe
            ? 'Browser permission was not granted. In preview mode, click "Open in New Tab" below or allow Camera & Microphone in your browser address bar.'
            : 'Camera or microphone permission was blocked in your browser. Click the lock/settings icon in your address bar to Allow access, or click Open in New Tab.'
        );
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setPermissionError('No camera or microphone hardware was detected on your device. You can still join the meeting.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setPermissionError('Camera or microphone is currently in use by another application.');
      } else {
        setPermissionError('Could not access camera or microphone. You can retry, check permissions, or join muted.');
      }

      // Fallback toggles to prevent invalid state
      if (enableVideo) setIsCameraOn(false);
      if (enableAudio) setIsMicOn(false);
      stopMediaStream();
    }
  }, [cameraFacingMode, stopMediaStream]);

  // Clean up media streams on page unmount ONLY (no automatic request on mount)
  useEffect(() => {
    return () => {
      stopMediaStream();
    };
  }, [stopMediaStream]);

  // Toggle Camera - Explicit user action
  const toggleCamera = () => {
    const nextState = !isCameraOn;
    setIsCameraOn(nextState);
    if (nextState) {
      updateMediaStream(true, isMicOn, selectedVideoDeviceId, selectedAudioDeviceId, cameraFacingMode);
    } else {
      updateMediaStream(false, isMicOn, selectedVideoDeviceId, selectedAudioDeviceId, cameraFacingMode);
    }
  };

  // Flip Camera (Front <-> Back / User <-> Environment)
  const flipCamera = (targetMode?: 'user' | 'environment') => {
    const nextMode = targetMode || (cameraFacingMode === 'user' ? 'environment' : 'user');
    setCameraFacingMode(nextMode);
    if (isCameraOn) {
      updateMediaStream(true, isMicOn, selectedVideoDeviceId, selectedAudioDeviceId, nextMode);
    }
  };

  // Toggle Microphone - Explicit user action
  const toggleMicrophone = () => {
    const nextState = !isMicOn;
    setIsMicOn(nextState);
    if (nextState) {
      updateMediaStream(isCameraOn, true, selectedVideoDeviceId, selectedAudioDeviceId, cameraFacingMode);
    } else {
      updateMediaStream(isCameraOn, false, selectedVideoDeviceId, selectedAudioDeviceId, cameraFacingMode);
    }
  };

  // Switch Video Device
  const handleSelectVideoDevice = (deviceId: string) => {
    setSelectedVideoDeviceId(deviceId);
    if (isCameraOn && mediaStreamRef.current) {
      updateMediaStream(true, isMicOn, deviceId, selectedAudioDeviceId, cameraFacingMode);
    }
  };

  // Switch Audio Device
  const handleSelectAudioDevice = (deviceId: string) => {
    setSelectedAudioDeviceId(deviceId);
    if (isMicOn && mediaStreamRef.current) {
      updateMediaStream(isCameraOn, true, selectedVideoDeviceId, deviceId, cameraFacingMode);
    }
  };

  // Copy link
  const copyInviteLink = () => {
    const url = getMeetingUrl(meetingId);
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Copy meeting code
  const copyMeetingCode = () => {
    const code = meeting?.code || canonicalMeetingId || meetingId;
    navigator.clipboard.writeText(code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  // Switch Meeting Code Action
  const handleSwitchMeetingCode = (e: React.FormEvent) => {
    e.preventDefault();
    setCodeSwitchError(null);
    const clean = normalizeMeetingCode(newMeetingCodeInput.trim());
    if (!clean) {
      setCodeSwitchError('Please enter a valid meeting code.');
      return;
    }
    stopMediaStream();
    setShowCodeModal(false);
    navigate(`/meeting/prejoin/${clean}`);
  };

  // 3. Join Now action
  const handleJoinNow = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);

    const nameToUse = displayName.trim() || user?.name || (user?.email ? user.email.split('@')[0] : 'Guest User');
    if (!nameToUse) {
      setActionError('Please enter your name to join.');
      return;
    }

    // Password Check
    if (meeting?.password && enteredPassword.trim() !== meeting.password.trim()) {
      setActionError('Incorrect meeting password. Please verify and try again.');
      return;
    }

    const finalAudio = isMicOn;
    const finalVideo = isCameraOn;

    setIsJoining(true);

    try {
      // 1. Verify meeting in Firestore again
      const targetDocId = canonicalMeetingId || meeting?.id || meetingId;
      const meetingRef = doc(db, 'meetings', targetDocId);
      const meetingSnap = await getDoc(meetingRef);

      if (!meetingSnap.exists()) {
        setActionError('Meeting not found.');
        setIsJoining(false);
        return;
      }

      const currentMeeting = { id: meetingSnap.id, ...meetingSnap.data() } as Meeting;
      if (currentMeeting.status === 'ended' || currentMeeting.status === 'completed' || currentMeeting.status === 'cancelled' || currentMeeting.endedAt) {
        setActionError('This meeting has ended and cannot be joined.');
        setIsJoining(false);
        return;
      }

      // Check Participant limit (rejoining participant should not be blocked)
      const currentCount = Number(currentMeeting.participantCount) || 0;
      const limit = Number(currentMeeting.participantLimit) || 0;

      // 2. Reuse stable participant ID from session storage if present, or create a stable ID
      let existingPrefId: string | null = null;
      try {
        const stored = sessionStorage.getItem(`freemeet_pref_${targetDocId}`) || sessionStorage.getItem(`freemeet_pref_${meetingId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.participantId) {
            existingPrefId = parsed.participantId;
          }
        }
      } catch (e) {}

      const participantId = user?.id || existingPrefId || `guest_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;

      // Check if user was already in meeting before rejecting capacity
      const participantDocRef = doc(db, 'meetings', targetDocId, 'participants', participantId);
      const existingPartSnap = await getDoc(participantDocRef);
      const isRejoining = existingPartSnap.exists();

      if (limit > 0 && currentCount >= limit && !isRejoining) {
        setActionError('Meeting is full. Maximum participant capacity reached.');
        setIsJoining(false);
        return;
      }

      // 3. Add or restore participant record in Firestore (prevent duplicates with merge: true)
      await setDoc(participantDocRef, {
        id: participantId,
        userId: user?.id || null,
        name: nameToUse,
        email: user?.email || null,
        avatar: user?.avatar || null,
        isHost: user?.id ? user.id === currentMeeting.hostId : (participantId.startsWith('host_')),
        status: 'joined',
        leftAt: null,
        isRemoved: false,
        audioEnabled: finalAudio,
        videoEnabled: finalVideo,
        joinedAt: isRejoining && existingPartSnap.data()?.joinedAt ? existingPartSnap.data().joinedAt : serverTimestamp(),
        lastSeen: serverTimestamp(),
      }, { merge: true });

      // Update meeting: active status, participantIds array, startedAt, and participant count
      try {
        const meetingUpdates: any = {
          status: currentMeeting.status === 'scheduled' ? 'active' : currentMeeting.status,
        };
        if (!isRejoining || existingPartSnap.data()?.status === 'left') {
          meetingUpdates.participantCount = increment(1);
        }
        if (user?.id) {
          meetingUpdates.participantIds = arrayUnion(user.id);
        }
        if (!currentMeeting.startedAt) {
          meetingUpdates.startedAt = serverTimestamp();
        }

        await updateDoc(meetingRef, meetingUpdates);

        // Notify host if participant is not the host themselves and not just rejoining
        if (!isRejoining && currentMeeting.hostId && (!user?.id || user.id !== currentMeeting.hostId)) {
          addDoc(collection(db, 'notifications'), {
            userId: currentMeeting.hostId,
            type: 'join',
            title: 'Someone Joined Your Meeting',
            message: `${nameToUse} joined "${currentMeeting.title || 'Video Call'}".`,
            senderName: nameToUse,
            senderAvatar: user?.avatar || null,
            actionUrl: `/meeting/${currentMeeting.code}`,
            meetingCode: currentMeeting.code,
            read: false,
            createdAt: serverTimestamp(),
          }).catch((err) => console.warn('Join notification emit warning:', err));
        }
      } catch (countErr) {
        console.warn('Non-fatal meeting doc update warning:', countErr);
      }

      // 4. Save media preferences to sessionStorage for the meeting room
      if (typeof window !== 'undefined') {
        const prefData = JSON.stringify({
          displayName: nameToUse,
          participantId,
          initialAudio: finalAudio,
          initialVideo: finalVideo,
          initialFacingMode: cameraFacingMode,
          selectedVideoDeviceId,
          selectedAudioDeviceId,
        });
        sessionStorage.setItem(`freemeet_pref_${targetDocId}`, prefData);
        if (targetDocId !== meetingId) {
          sessionStorage.setItem(`freemeet_pref_${meetingId}`, prefData);
        }
      }

      // Stop local preview tracks so meeting room can acquire fresh tracks cleanly
      stopMediaStream();

      // 5. Enter meeting room /meeting/{targetDocId}/room
      navigate(`/meeting/${targetDocId}/room`);
    } catch (err: any) {
      console.error('Error joining meeting:', err);
      setActionError(err?.message || 'Failed to enter meeting room. Please try again.');
      setIsJoining(false);
    }
  };

  // Leave action
  const handleLeave = () => {
    stopMediaStream();
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/');
    }
  };

  // Complete Meeting Action
  const isHost = Boolean(user && meeting && user.id === meeting.hostId);

  const handleCompleteMeeting = async () => {
    if (!meeting) return;
    setIsCompletingMeeting(true);
    try {
      const targetDocId = canonicalMeetingId || meeting.id || meetingId;
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

      await updateDoc(doc(db, 'meetings', targetDocId), {
        status: 'completed',
        endedAt: serverTimestamp(),
        duration: durationText,
        durationMinutes: diffMinutes,
      });

      stopMediaStream();
      navigate(`/meeting-ended?id=${targetDocId}&code=${meeting.code || ''}&completed=true`);
    } catch (err) {
      console.error('Error completing meeting from prejoin:', err);
      setActionError('Failed to complete meeting. Please try again.');
      setIsCompletingMeeting(false);
      setShowCompleteModal(false);
    }
  };

  // User initials for camera off placeholder
  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-[#f8f9f8] text-[#1a241b] flex flex-col justify-between p-4 sm:p-6 lg:p-10 font-sans animate-in fade-in duration-300">
      {/* Top Header */}
      <header className="max-w-7xl w-full mx-auto flex items-center justify-between py-2 mb-4 sm:mb-6">
        <Link to="/" className="inline-flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-[#528d5a] flex items-center justify-center text-white shadow-xs shadow-[#528d5a]/20">
            <Video className="w-5 h-5" />
          </div>
          <span className="text-xl sm:text-2xl font-bold font-['Outfit'] tracking-tight text-[#1a241b]">
            Free<span className="text-[#528d5a]">Meet</span>
          </span>
        </Link>

        {/* Actions in top bar */}
        <div className="flex items-center gap-2">
          {isRunningInIframe && (
            <button
              type="button"
              onClick={openInNewTab}
              id="prejoin-open-new-tab-btn"
              title="Open meeting in a standalone browser tab for optimal hardware access"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#528d5a] hover:bg-[#43754a] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in New Tab</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowPermissionsModal(true)}
            id="prejoin-help-btn"
            title="Permission instructions for camera and microphone"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#eff5f0] hover:bg-[#e2ede4] border border-[#cddfd0] text-xs font-semibold text-[#3d6e44] transition-colors cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#528d5a]" />
            <span className="hidden sm:inline">Permission Help</span>
          </button>

          {/* Security indicator badge */}
          <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#eff5f0] border border-[#cddfd0] text-xs font-semibold text-[#3d6e44]">
            <ShieldCheck className="w-4 h-4 text-[#528d5a]" />
            <span>Encrypted WebRTC</span>
          </div>
        </div>
      </header>

      {/* Main Grid Container: Desktop Large Camera Preview Left, Controls Right */}
      <main className="max-w-7xl w-full mx-auto my-auto py-2 sm:py-6">
        {meetingError ? (
          <div className="max-w-md mx-auto bg-white rounded-3xl border border-rose-200 p-8 shadow-xs text-center space-y-4 animate-in fade-in">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-[#1a241b] font-['Outfit']">
              Unable to Join Meeting
            </h2>
            <p className="text-sm text-[#5a6b5c]">
              {meetingError}
            </p>
            <div className="pt-2">
              <button
                onClick={handleLeave}
                className="w-full py-3 bg-[#528d5a] hover:bg-[#43754a] text-white font-bold text-sm rounded-xl transition-all cursor-pointer"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-start">
            {/* LEFT COLUMN: Camera Preview & Media Controls */}
            <div className="lg:col-span-7 xl:col-span-8 flex flex-col space-y-4">
              <div className="relative w-full min-h-[300px] sm:min-h-[360px] md:aspect-video bg-[#141b15] rounded-3xl overflow-hidden shadow-md border border-[#2a382b] flex flex-col items-center justify-center p-4 sm:p-6 group">
                {/* Real Live Video Element */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover transition-opacity duration-300 absolute inset-0 ${
                    cameraFacingMode === 'user' ? 'transform -scale-x-100' : 'transform scale-x-100'
                  } ${
                    isCameraOn && mediaStreamRef.current?.getVideoTracks().length ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}
                />

                {/* Camera OFF or Standby Placeholder with Elegant Avatar */}
                {(!isCameraOn || !mediaStreamRef.current?.getVideoTracks().length) && (
                  <div className="flex flex-col items-center justify-center text-center space-y-2.5 sm:space-y-3 z-10 animate-in fade-in duration-200 my-auto pb-14 sm:pb-16">
                    <div className="relative">
                      <div className="w-16 h-16 sm:w-22 sm:h-22 rounded-full bg-[#233125] border-2 border-[#3d4f3f] flex items-center justify-center text-white text-xl sm:text-2xl font-bold font-['Outfit'] shadow-inner">
                        {getInitials(displayName || user?.name || 'User')}
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center border-2 border-[#141b15] shadow-xs ${
                        isCameraOn ? 'bg-[#528d5a] text-white' : 'bg-rose-500 text-white'
                      }`}>
                        {isCameraOn ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                    <div className="space-y-0.5 max-w-xs px-2">
                      <p className="text-xs sm:text-sm font-bold text-white font-['Outfit']">
                        {isCameraOn ? 'Camera ready for meeting' : 'Camera is turned off'}
                      </p>
                      <p className="text-[11px] sm:text-xs text-[#8ca18f]">
                        {isCameraOn 
                          ? 'Will activate when you join, or test preview below' 
                          : 'Click below to test camera before entering'}
                      </p>
                    </div>
                    {isCameraOn ? (
                      <button
                        type="button"
                        onClick={() => updateMediaStream(true, isMicOn, selectedVideoDeviceId, selectedAudioDeviceId, cameraFacingMode)}
                        id="prejoin-preview-camera-btn"
                        className="px-3.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs border border-white/10"
                      >
                        <Video className="w-3.5 h-3.5 text-[#528d5a]" />
                        <span>Test Camera Preview</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={toggleCamera}
                        id="prejoin-preview-camera-btn"
                        className="px-3.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs border border-white/10"
                      >
                        <Video className="w-3.5 h-3.5 text-[#528d5a]" />
                        <span>Turn On Camera</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Top Corner Overlay: Mic Level Visualizer */}
                <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20 flex items-center gap-2 bg-[#141b15]/80 backdrop-blur-md px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full border border-white/10 text-white text-xs">
                  {isMicOn ? (
                    <>
                      <Mic className="w-3.5 h-3.5 text-[#528d5a] animate-pulse" />
                      <div className="w-12 sm:w-16 h-1.5 bg-white/20 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#528d5a] transition-all duration-75 rounded-full"
                          style={{ width: `${audioLevel}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-[#8ca18f] font-mono">{audioLevel > 5 ? 'Active' : 'Muted'}</span>
                    </>
                  ) : (
                    <>
                      <MicOff className="w-3.5 h-3.5 text-rose-400" />
                      <span className="text-[10px] text-rose-200">Microphone Off</span>
                    </>
                  )}
                </div>

                {/* Top Right Overlay: Camera Front / Back Switch Badge */}
                <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => flipCamera()}
                    id="prejoin-flip-camera-badge-btn"
                    title={cameraFacingMode === 'user' ? 'Switch to Back Camera (Environment)' : 'Switch to Front Camera (Selfie)'}
                    className="flex items-center gap-1.5 bg-[#141b15]/80 hover:bg-[#141b15] backdrop-blur-md px-3 py-1.5 rounded-full border border-white/15 text-white text-xs font-semibold transition-all cursor-pointer shadow-xs hover:border-[#528d5a]/60 group"
                  >
                    <SwitchCamera className="w-3.5 h-3.5 text-[#528d5a] group-hover:rotate-180 transition-transform duration-300" />
                    <span className="hidden xs:inline sm:inline">
                      {cameraFacingMode === 'user' ? 'Front (Selfie)' : 'Back (Env)'}
                    </span>
                  </button>
                </div>

                {/* Bottom Floating Control Bar */}
                <div className="absolute bottom-3 sm:bottom-4 inset-x-0 flex items-center justify-center gap-2 sm:gap-3.5 z-20 px-3">
                  <div className="flex items-center gap-2 sm:gap-3 bg-[#141b15]/90 backdrop-blur-md px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl border border-white/15 shadow-lg">
                    {/* Microphone Toggle */}
                    <button
                      type="button"
                      onClick={toggleMicrophone}
                      id="prejoin-mic-toggle-btn"
                      title={isMicOn ? 'Turn off microphone' : 'Turn on microphone'}
                      className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                        isMicOn
                          ? 'bg-white/15 text-white hover:bg-white/25'
                          : 'bg-rose-500 text-white hover:bg-rose-600 shadow-xs'
                      }`}
                    >
                      {isMicOn ? <Mic className="w-4 h-4 sm:w-5 sm:h-5" /> : <MicOff className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </button>

                    {/* Camera Toggle */}
                    <button
                      type="button"
                      onClick={toggleCamera}
                      id="prejoin-camera-toggle-btn"
                      title={isCameraOn ? 'Turn off camera' : 'Turn on camera'}
                      className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                        isCameraOn
                          ? 'bg-white/15 text-white hover:bg-white/25'
                          : 'bg-rose-500 text-white hover:bg-rose-600 shadow-xs'
                      }`}
                    >
                      {isCameraOn ? <Video className="w-4 h-4 sm:w-5 sm:h-5" /> : <VideoOff className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </button>

                    {/* Camera Flip (Front/Back) Toggle */}
                    <button
                      type="button"
                      onClick={() => flipCamera()}
                      id="prejoin-flip-camera-btn"
                      title={cameraFacingMode === 'user' ? 'Switch to Back Camera (Environment)' : 'Switch to Front Camera (User)'}
                      className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/15 text-white hover:bg-white/25 flex items-center justify-center transition-all cursor-pointer group"
                    >
                      <SwitchCamera className="w-4 h-4 sm:w-5 sm:h-5 text-white group-hover:rotate-180 transition-transform duration-300" />
                    </button>

                    {/* Hardware Device Settings Modal Trigger */}
                    <button
                      type="button"
                      onClick={() => setShowSettingsModal(true)}
                      id="prejoin-device-settings-btn"
                      title="Audio and video device settings"
                      className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/15 text-white hover:bg-white/25 flex items-center justify-center transition-all cursor-pointer"
                    >
                      <Settings2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Permission Warning Notice with Interactive Actions */}
              {permissionError && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-3 shadow-xs animate-in fade-in">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                      <div className="space-y-1">
                        <span className="font-bold block text-amber-950">Camera / Microphone Status</span>
                        <p className="text-xs leading-relaxed text-amber-800">{permissionError}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPermissionError(null)}
                      className="p-1 text-amber-600 hover:text-amber-900 rounded-lg hover:bg-amber-100/60 transition-colors shrink-0 cursor-pointer"
                      title="Dismiss"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-amber-200/60">
                    <button
                      type="button"
                      onClick={() => updateMediaStream(true, true, selectedVideoDeviceId, selectedAudioDeviceId, cameraFacingMode)}
                      className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Allow / Retry Permission</span>
                    </button>
                    <button
                      type="button"
                      onClick={openInNewTab}
                      className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 hover:bg-amber-100 text-amber-950 font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-amber-700" />
                      <span>Open in New Tab</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPermissionsModal(true)}
                      className="px-3 py-1.5 rounded-lg bg-transparent hover:bg-amber-100 text-amber-800 font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>How to Allow</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: Meeting Info + Controls */}
            <div className="lg:col-span-5 xl:col-span-4 flex flex-col">
              <div className="bg-white rounded-3xl border border-[#e2ede4] p-6 sm:p-8 shadow-xs space-y-5">
                {/* Meeting Header Details */}
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#eff5f0] text-[#3d6e44] text-[11px] font-bold uppercase tracking-wider">
                    <Radio className="w-3 h-3 text-[#528d5a] animate-pulse" />
                    <span>FreeMeet Room</span>
                  </div>

                  <h1 className="text-xl sm:text-2xl font-bold font-['Outfit'] text-[#1a241b] tracking-tight line-clamp-2">
                    {loadingMeeting ? 'Loading Conference...' : (meeting?.title || 'Video Conference')}
                  </h1>

                  <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-[#5a6b5c] pt-1">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#528d5a]" />
                      <span>Host: <strong className="text-[#1a241b]">{meeting?.hostName || 'Organizer'}</strong></span>
                    </div>

                    <div className="flex items-center gap-1.5 font-mono">
                      <span className="text-[#8ca18f]">ID:</span>
                      <strong className="text-[#1a241b]">{meeting?.code || meetingId}</strong>
                    </div>
                  </div>
                </div>

                {/* Prominent Meeting Code Action Box Before Join */}
                <div className="p-3.5 rounded-2xl bg-[#eff5f0] border border-[#cddfd0] flex items-center justify-between gap-3 shadow-2xs">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#3d6e44]">
                      <Hash className="w-3.5 h-3.5 text-[#528d5a]" />
                      <span>Meeting Code</span>
                    </div>
                    <div className="text-sm sm:text-base font-mono font-bold text-[#1a241b] tracking-wider mt-0.5 truncate select-all">
                      {meeting?.code || canonicalMeetingId || meetingId}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={copyMeetingCode}
                      id="prejoin-copy-code-btn"
                      title="Copy meeting code"
                      className="px-3 py-2 rounded-xl bg-white border border-[#cddfd0] hover:bg-[#e2ede4] text-xs font-bold text-[#1a241b] flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {codeCopied ? <Check className="w-3.5 h-3.5 text-[#528d5a]" /> : <Copy className="w-3.5 h-3.5 text-[#528d5a]" />}
                      <span>{codeCopied ? 'Copied' : 'Copy'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewMeetingCodeInput('');
                        setCodeSwitchError(null);
                        setShowCodeModal(true);
                      }}
                      id="prejoin-switch-code-btn"
                      title="Join a different meeting code"
                      className="p-2 rounded-xl bg-white border border-[#cddfd0] hover:bg-[#e2ede4] text-[#3d6e44] transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Quick Share Link Box */}
                <div className="p-3 rounded-2xl bg-[#f8f9f8] border border-[#e2ede4] flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8ca18f] block">
                      Meeting Link
                    </span>
                    <p className="text-xs font-mono text-[#1a241b] truncate mt-0.5">
                      {getMeetingUrl(meetingId)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={copyInviteLink}
                    id="prejoin-copy-link-btn"
                    className="px-2.5 py-1.5 rounded-xl bg-white border border-[#e2ede4] hover:bg-[#eff5f0] text-xs font-bold text-[#1a241b] flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-[#528d5a]" /> : <Copy className="w-3.5 h-3.5 text-[#528d5a]" />}
                    <span>{copied ? 'Copied' : 'Copy Link'}</span>
                  </button>
                </div>

                {/* Action Error Message */}
                {actionError && (
                  <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{actionError}</span>
                  </div>
                )}

                {/* Join Form */}
                <form onSubmit={handleJoinNow} className="space-y-4">
                  {/* Display Name Input */}
                  <div>
                    <label 
                      htmlFor="prejoin-display-name"
                      className="block text-xs font-bold text-[#1a241b] uppercase tracking-wider mb-1.5"
                    >
                      Your Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="prejoin-display-name"
                      required
                      value={displayName}
                      onChange={(e) => {
                        setDisplayName(e.target.value);
                        if (actionError) setActionError(null);
                      }}
                      placeholder="What should others call you?"
                      className="w-full bg-white border border-[#e2ede4] rounded-xl px-4 py-2.5 text-sm text-[#1a241b] placeholder:text-[#8ca18f] focus:outline-none focus:ring-2 focus:ring-[#528d5a]"
                    />
                  </div>

                  {/* Password Input if meeting requires password */}
                  {meeting?.password && (
                    <div className="space-y-1.5 animate-in fade-in">
                      <label 
                        htmlFor="prejoin-meeting-password"
                        className="block text-xs font-bold text-[#1a241b] uppercase tracking-wider"
                      >
                        Room Password
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-[#8ca18f] absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="password"
                          id="prejoin-meeting-password"
                          required
                          value={enteredPassword}
                          onChange={(e) => {
                            setEnteredPassword(e.target.value);
                            if (actionError) setActionError(null);
                          }}
                          placeholder="Enter password set by host"
                          className="w-full bg-white border border-[#e2ede4] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#1a241b] placeholder:text-[#8ca18f] focus:outline-none focus:ring-2 focus:ring-[#528d5a]"
                        />
                      </div>
                    </div>
                  )}

                  {/* Primary Action Buttons */}
                  <div className="space-y-2.5 pt-2">
                    {/* Join Now Button */}
                    <button
                      type="submit"
                      id="prejoin-join-now-btn"
                      disabled={isJoining || loadingMeeting}
                      className="w-full py-3.5 px-6 bg-[#528d5a] hover:bg-[#43754a] text-white font-bold text-sm rounded-xl shadow-xs shadow-[#528d5a]/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <span>{isJoining ? 'Connecting to Room...' : 'Join Now'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    {/* Complete Meeting Button (For Host/Organizer) */}
                    {isHost && (
                      <button
                        type="button"
                        onClick={() => setShowCompleteModal(true)}
                        id="prejoin-complete-btn"
                        className="w-full py-3 px-6 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Mark as Completed</span>
                      </button>
                    )}

                    {/* Leave Button */}
                    <button
                      type="button"
                      onClick={handleLeave}
                      id="prejoin-leave-btn"
                      className="w-full py-3 px-6 bg-white hover:bg-[#f8f9f8] border border-[#e2ede4] text-[#5a6b5c] hover:text-[#1a241b] font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-[#8ca18f]" />
                      <span>Leave</span>
                    </button>
                  </div>
                </form>

                {/* Footer security tag */}
                <div className="pt-3 border-t border-[#e2ede4] flex items-center justify-between text-[11px] text-[#8ca18f]">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#528d5a]" />
                    Direct Peer Mesh
                  </span>
                  <span>No plugins required</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Device Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-[#e2ede4] shadow-xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#eff5f0] text-[#528d5a] flex items-center justify-center">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1a241b] font-['Outfit']">
                    Audio &amp; Video Devices
                  </h3>
                  <p className="text-xs text-[#5a6b5c]">
                    Configure your hardware inputs for this call
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="w-8 h-8 rounded-full bg-[#f8f9f8] hover:bg-[#eff5f0] text-[#5a6b5c] flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Camera Select */}
              <div>
                <label className="block text-xs font-bold text-[#1a241b] uppercase tracking-wider mb-1.5">
                  Camera Input
                </label>
                <div className="relative">
                  <Video className="w-4 h-4 text-[#8ca18f] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <select
                    value={selectedVideoDeviceId}
                    onChange={(e) => handleSelectVideoDevice(e.target.value)}
                    className="w-full bg-white border border-[#e2ede4] rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-[#1a241b] focus:outline-none focus:ring-2 focus:ring-[#528d5a]"
                  >
                    {videoDevices.length > 0 ? (
                      videoDevices.map((dev, idx) => (
                        <option key={dev.deviceId || idx} value={dev.deviceId}>
                          {dev.label || `Camera ${idx + 1}`}
                        </option>
                      ))
                    ) : (
                      <option value="">Default Web Camera</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Camera Facing Mode (Front / Selfie vs Back / Environment) */}
              <div>
                <label className="block text-xs font-bold text-[#1a241b] uppercase tracking-wider mb-1.5">
                  Camera Orientation (Front / Back)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => flipCamera('user')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      cameraFacingMode === 'user'
                        ? 'bg-[#eff5f0] border-[#528d5a] text-[#3d6e44] shadow-xs'
                        : 'bg-white border-[#e2ede4] text-[#5a6b5c] hover:bg-[#f8f9f8]'
                    }`}
                  >
                    <SwitchCamera className="w-3.5 h-3.5 text-[#528d5a]" />
                    <span>Front (Selfie)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => flipCamera('environment')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      cameraFacingMode === 'environment'
                        ? 'bg-[#eff5f0] border-[#528d5a] text-[#3d6e44] shadow-xs'
                        : 'bg-white border-[#e2ede4] text-[#5a6b5c] hover:bg-[#f8f9f8]'
                    }`}
                  >
                    <SwitchCamera className="w-3.5 h-3.5 text-[#528d5a]" />
                    <span>Back (Environment)</span>
                  </button>
                </div>
              </div>

              {/* Microphone Select */}
              <div>
                <label className="block text-xs font-bold text-[#1a241b] uppercase tracking-wider mb-1.5">
                  Microphone Input
                </label>
                <div className="relative">
                  <Mic className="w-4 h-4 text-[#8ca18f] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <select
                    value={selectedAudioDeviceId}
                    onChange={(e) => handleSelectAudioDevice(e.target.value)}
                    className="w-full bg-white border border-[#e2ede4] rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-[#1a241b] focus:outline-none focus:ring-2 focus:ring-[#528d5a]"
                  >
                    {audioDevices.length > 0 ? (
                      audioDevices.map((dev, idx) => (
                        <option key={dev.deviceId || idx} value={dev.deviceId}>
                          {dev.label || `Microphone ${idx + 1}`}
                        </option>
                      ))
                    ) : (
                      <option value="">Default Audio Input</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Live Mic Test Meter */}
              <div className="p-3.5 rounded-2xl bg-[#eff5f0] border border-[#cddfd0] space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-[#1a241b]">
                  <span className="flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-[#528d5a]" />
                    Microphone Test Meter
                  </span>
                  <span className="font-mono text-[#3d6e44]">{audioLevel}%</span>
                </div>
                <div className="w-full h-2 bg-white rounded-full overflow-hidden border border-[#cddfd0]">
                  <div
                    className="h-full bg-[#528d5a] transition-all duration-75"
                    style={{ width: `${audioLevel}%` }}
                  />
                </div>
                <p className="text-[11px] text-[#5a6b5c]">
                  Speak into your microphone to verify the audio input level.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="px-6 py-2.5 bg-[#528d5a] hover:bg-[#43754a] text-white font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer"
              >
                Save &amp; Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Switch Meeting Code Modal */}
      {showCodeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 border border-[#e2ede4] shadow-xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#eff5f0] text-[#528d5a] flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1a241b] font-['Outfit']">
                    Join with Meeting Code
                  </h3>
                  <p className="text-xs text-[#5a6b5c]">
                    Enter a different meeting code to join
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCodeModal(false)}
                className="w-8 h-8 rounded-full bg-[#f8f9f8] hover:bg-[#eff5f0] text-[#5a6b5c] flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSwitchMeetingCode} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1a241b] uppercase tracking-wider mb-1.5">
                  Meeting Code or Link
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-[#8ca18f] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    autoFocus
                    value={newMeetingCodeInput}
                    onChange={(e) => {
                      setNewMeetingCodeInput(e.target.value);
                      if (codeSwitchError) setCodeSwitchError(null);
                    }}
                    placeholder="e.g. abc-defg-hij or 68f2..."
                    className="w-full bg-white border border-[#e2ede4] rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono text-[#1a241b] placeholder:text-[#8ca18f] focus:outline-none focus:ring-2 focus:ring-[#528d5a]"
                  />
                </div>
                {codeSwitchError && (
                  <p className="text-xs text-rose-600 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{codeSwitchError}</span>
                  </p>
                )}
              </div>

              <div className="pt-2 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCodeModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#eff5f0] text-[#1a241b] text-xs font-bold hover:bg-[#e2ede4] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#528d5a] hover:bg-[#43754a] text-white text-xs font-bold transition-all cursor-pointer shadow-xs shadow-[#528d5a]/20 flex items-center justify-center gap-1.5"
                >
                  <span>Go to Meeting</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Meeting Confirmation Modal */}
      {showCompleteModal && (
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
                Are you sure you want to mark <strong className="text-[#1a241b]">"{meeting?.title || 'Conference'}"</strong> as completed? It will conclude the session and archive it to your Meeting History.
              </p>
            </div>

            <div className="pt-2 flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowCompleteModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#eff5f0] text-[#1a241b] text-xs font-bold hover:bg-[#e2ede4] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCompleteMeeting}
                disabled={isCompletingMeeting}
                className="flex-1 py-2.5 rounded-xl bg-[#528d5a] hover:bg-[#43754a] text-white text-xs font-bold transition-all disabled:opacity-60 cursor-pointer shadow-xs shadow-[#528d5a]/20 flex items-center justify-center gap-1.5"
              >
                {isCompletingMeeting ? (
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

      {/* System & Permissions Center Modal */}
      <PermissionsModal
        isOpen={showPermissionsModal}
        onClose={() => setShowPermissionsModal(false)}
        onRefreshMedia={() => updateMediaStream(isCameraOn, isMicOn, selectedVideoDeviceId, selectedAudioDeviceId, cameraFacingMode)}
        activeVideoElement={videoRef.current}
      />
    </div>
  );
};
