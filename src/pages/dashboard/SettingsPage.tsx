import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings, 
  User as UserIcon, 
  Mail, 
  Lock, 
  ShieldCheck, 
  Globe, 
  Check, 
  AlertCircle,
  LogOut,
  Camera,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Volume2,
  Bell,
  Sliders,
  Copy,
  Sparkles,
  RefreshCw,
  Eye,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  Layers
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from '../../context/RouterContext';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db, auth } from '../../lib/firebase';
import { UserSettings } from '../../types';

// Curated avatar presets with high visual aesthetics
const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
];

export const SettingsPage: React.FC = () => {
  const { user, logout, resetPassword, updateUserData } = useAuth();
  const { navigate } = useRouter();

  // Profile States
  const [name, setName] = useState(user?.name || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [timeZone, setTimeZone] = useState(user?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  // Meeting & Hardware Preferences
  const [defaultAudioDeviceId, setDefaultAudioDeviceId] = useState(user?.settings?.meeting?.defaultAudioDeviceId || '');
  const [defaultVideoDeviceId, setDefaultVideoDeviceId] = useState(user?.settings?.meeting?.defaultVideoDeviceId || '');
  const [muteMicOnJoin, setMuteMicOnJoin] = useState(user?.settings?.meeting?.muteMicOnJoin ?? false);
  const [turnOffCameraOnJoin, setTurnOffCameraOnJoin] = useState(user?.settings?.meeting?.turnOffCameraOnJoin ?? false);
  const [autoCopyLink, setAutoCopyLink] = useState(user?.settings?.meeting?.autoCopyLink ?? true);
  const [mirrorVideo, setMirrorVideo] = useState(user?.settings?.meeting?.mirrorVideo ?? true);
  const [playJoinSound, setPlayJoinSound] = useState(user?.settings?.meeting?.playJoinSound ?? true);

  // Notifications Preferences
  const [notifMeetingInvites, setNotifMeetingInvites] = useState(user?.settings?.notifications?.meetingInvitations ?? true);
  const [notifMeetingReminders, setNotifMeetingReminders] = useState(user?.settings?.notifications?.meetingReminders ?? true);
  const [notifParticipantJoined, setNotifParticipantJoined] = useState(user?.settings?.notifications?.participantJoined ?? true);
  const [notifContactAlerts, setNotifContactAlerts] = useState(user?.settings?.notifications?.contactAlerts ?? true);
  const [notifChatMessages, setNotifChatMessages] = useState(user?.settings?.notifications?.chatMessages ?? true);
  const [notifSoundEnabled, setNotifSoundEnabled] = useState(user?.settings?.notifications?.soundEnabled ?? true);

  // Device Testing States (Zero permission requests on mount)
  const [devicePermissionsGranted, setDevicePermissionsGranted] = useState(false);
  const [isTestingDevices, setIsTestingDevices] = useState(false);
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoInputDevices, setVideoInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [testStream, setTestStream] = useState<MediaStream | null>(null);
  const [micVolumeLevel, setMicVolumeLevel] = useState<number>(0);
  const [deviceError, setDeviceError] = useState<string | null>(null);

  const testVideoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Feedback states
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [preferencesSuccess, setPreferencesSuccess] = useState(false);
  const [passwordSent, setPasswordSent] = useState(false);
  const [error, setError] = useState('');

  // Sync state if user context updates
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setAvatar(user.avatar || '');
      setTimeZone(user.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
      if (user.settings?.meeting) {
        setDefaultAudioDeviceId(user.settings.meeting.defaultAudioDeviceId || '');
        setDefaultVideoDeviceId(user.settings.meeting.defaultVideoDeviceId || '');
        setMuteMicOnJoin(user.settings.meeting.muteMicOnJoin ?? false);
        setTurnOffCameraOnJoin(user.settings.meeting.turnOffCameraOnJoin ?? false);
        setAutoCopyLink(user.settings.meeting.autoCopyLink ?? true);
        setMirrorVideo(user.settings.meeting.mirrorVideo ?? true);
        setPlayJoinSound(user.settings.meeting.playJoinSound ?? true);
      }
      if (user.settings?.notifications) {
        setNotifMeetingInvites(user.settings.notifications.meetingInvitations ?? true);
        setNotifMeetingReminders(user.settings.notifications.meetingReminders ?? true);
        setNotifParticipantJoined(user.settings.notifications.participantJoined ?? true);
        setNotifContactAlerts(user.settings.notifications.contactAlerts ?? true);
        setNotifChatMessages(user.settings.notifications.chatMessages ?? true);
        setNotifSoundEnabled(user.settings.notifications.soundEnabled ?? true);
      }
    }
  }, [user]);

  // Clean up media test streams on unmount
  useEffect(() => {
    return () => {
      if (testStream) {
        testStream.getTracks().forEach((track) => track.stop());
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [testStream]);

  // Explicit User Action: Request media permission and enumerate devices ONLY when testing
  const handleStartDeviceTest = async () => {
    setDeviceError(null);
    setIsTestingDevices(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Media devices are not supported on this browser.');
      }

      // Explicitly request user media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: defaultVideoDeviceId ? { deviceId: { exact: defaultVideoDeviceId } } : true,
        audio: defaultAudioDeviceId ? { deviceId: { exact: defaultAudioDeviceId } } : true,
      });

      setTestStream(stream);
      setDevicePermissionsGranted(true);

      // Attach video to test element
      if (testVideoRef.current) {
        testVideoRef.current.srcObject = stream;
      }

      // Enumerate all connected audio/video devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter((d) => d.kind === 'audioinput');
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');

      setAudioInputDevices(audioInputs);
      setVideoInputDevices(videoInputs);

      // Set defaults if not already set
      if (!defaultAudioDeviceId && audioInputs.length > 0) {
        setDefaultAudioDeviceId(audioInputs[0].deviceId);
      }
      if (!defaultVideoDeviceId && videoInputs.length > 0) {
        setDefaultVideoDeviceId(videoInputs[0].deviceId);
      }

      // Initialize audio analyzer for microphone volume meter
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          const audioCtx = new AudioContextClass();
          audioContextRef.current = audioCtx;
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          analyserRef.current = analyser;

          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateMeter = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const average = sum / dataArray.length;
            const volume = Math.min(100, Math.round((average / 128) * 100));
            setMicVolumeLevel(volume);
            animFrameRef.current = requestAnimationFrame(updateMeter);
          };
          updateMeter();
        } catch (audioErr) {
          console.warn('Audio meter initialization warning:', audioErr);
        }
      }
    } catch (err: any) {
      console.warn('Device permission request failed or was declined:', err);
      const isDenied = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
      if (isDenied) {
        setDeviceError('Camera or microphone access was blocked by your browser settings. To test your devices, click the lock or camera icon in your browser address bar and set permissions to "Allow".');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setDeviceError('No camera or microphone hardware was detected on your system.');
      } else {
        setDeviceError(err.message || 'Permission was denied or no media devices were found.');
      }
      setIsTestingDevices(false);
    }
  };

  // Stop device test and release camera/mic
  const handleStopDeviceTest = () => {
    if (testStream) {
      testStream.getTracks().forEach((track) => track.stop());
      setTestStream(null);
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setMicVolumeLevel(0);
    setIsTestingDevices(false);
  };

  // Switch camera during active test
  const handleChangeTestVideoDevice = async (deviceId: string) => {
    setDefaultVideoDeviceId(deviceId);
    if (!isTestingDevices) return;

    try {
      if (testStream) {
        testStream.getVideoTracks().forEach((t) => t.stop());
      }
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
        audio: defaultAudioDeviceId ? { deviceId: { exact: defaultAudioDeviceId } } : true,
      });
      setTestStream(newStream);
      if (testVideoRef.current) {
        testVideoRef.current.srcObject = newStream;
      }
    } catch (e) {
      console.warn('Failed to switch video test device:', e);
    }
  };

  // Switch mic during active test
  const handleChangeTestAudioDevice = async (deviceId: string) => {
    setDefaultAudioDeviceId(deviceId);
    if (!isTestingDevices) return;

    try {
      if (testStream) {
        testStream.getAudioTracks().forEach((t) => t.stop());
      }
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: defaultVideoDeviceId ? { deviceId: { exact: defaultVideoDeviceId } } : true,
        audio: { deviceId: { exact: deviceId } },
      });
      setTestStream(newStream);
    } catch (e) {
      console.warn('Failed to switch audio test device:', e);
    }
  };

  // Profile Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setSavingProfile(true);
    setError('');
    setProfileSuccess(false);

    const trimmedName = name.trim() || 'User';
    const trimmedAvatar = avatar.trim() || null;

    try {
      // 1. Update Firestore user document
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        name: trimmedName,
        avatar: trimmedAvatar,
        timeZone,
        updatedAt: serverTimestamp(),
      });

      // 2. Update Firebase Auth user profile
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: trimmedName,
          photoURL: trimmedAvatar,
        });
      }

      // 3. Update local auth state
      updateUserData({
        name: trimmedName,
        avatar: trimmedAvatar || undefined,
        timeZone,
      });

      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3500);
    } catch (err: any) {
      console.error('Error saving profile:', err);
      setError(err.message || 'Failed to update profile settings.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Meeting & Notification Preferences Save
  const handleSavePreferences = async () => {
    if (!user?.id) return;

    setSavingPreferences(true);
    setError('');
    setPreferencesSuccess(false);

    const updatedSettings: UserSettings = {
      meeting: {
        defaultAudioDeviceId: defaultAudioDeviceId || undefined,
        defaultVideoDeviceId: defaultVideoDeviceId || undefined,
        muteMicOnJoin,
        turnOffCameraOnJoin,
        autoCopyLink,
        mirrorVideo,
        playJoinSound,
      },
      notifications: {
        meetingInvitations: notifMeetingInvites,
        meetingReminders: notifMeetingReminders,
        participantJoined: notifParticipantJoined,
        contactAlerts: notifContactAlerts,
        chatMessages: notifChatMessages,
        soundEnabled: notifSoundEnabled,
      },
    };

    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        settings: updatedSettings,
        updatedAt: serverTimestamp(),
      });

      // Update local auth context
      updateUserData({
        settings: updatedSettings,
      });

      // Also persist to localStorage for client-side pre-join defaults
      if (typeof window !== 'undefined') {
        localStorage.setItem('freemeet_settings', JSON.stringify(updatedSettings));
      }

      setPreferencesSuccess(true);
      setTimeout(() => setPreferencesSuccess(false), 3500);
    } catch (err: any) {
      console.error('Error saving preferences:', err);
      setError(err.message || 'Failed to save meeting & notification preferences.');
    } finally {
      setSavingPreferences(false);
    }
  };

  // Password reset request
  const handleSendPasswordReset = async () => {
    if (!user?.email) return;
    try {
      await resetPassword(user.email);
      setPasswordSent(true);
      setTimeout(() => setPasswordSent(false), 5000);
    } catch (e: any) {
      console.error('Password reset error:', e);
      setError(e.message || 'Failed to send password reset email.');
    }
  };

  // Sign out
  const handleLogout = async () => {
    try {
      handleStopDeviceTest();
      await logout();
      navigate('/login');
    } catch (e) {
      console.error('Logout error:', e);
      navigate('/login');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300 pb-16">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-[#1a241b] font-['Outfit']">
          Workspace Settings
        </h2>
        <p className="text-xs sm:text-sm text-[#5a6b5c] mt-0.5">
          Customize your personal identity, device preferences, notification alerts, and security credentials.
        </p>
      </div>

      {/* Alert Notices */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {profileSuccess && (
        <div className="p-4 rounded-2xl bg-[#eff5f0] border border-[#cddfd0] text-[#3d6e44] text-xs flex items-center gap-3">
          <Check className="w-5 h-5 shrink-0 text-[#528d5a]" />
          <span className="font-medium">Profile information updated successfully!</span>
        </div>
      )}

      {preferencesSuccess && (
        <div className="p-4 rounded-2xl bg-[#eff5f0] border border-[#cddfd0] text-[#3d6e44] text-xs flex items-center gap-3">
          <Check className="w-5 h-5 shrink-0 text-[#528d5a]" />
          <span className="font-medium">Meeting and notification preferences saved successfully!</span>
        </div>
      )}

      {/* SECTION 1: PROFILE */}
      <section className="bg-white rounded-3xl border border-[#e2ede4] p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-[#e2ede4]">
          <div className="w-10 h-10 rounded-xl bg-[#eff5f0] text-[#528d5a] flex items-center justify-center">
            <UserIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#1a241b] font-['Outfit']">
              Personal Profile
            </h3>
            <p className="text-xs text-[#5a6b5c]">
              Manage your display name, contact email, and conference avatar.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-6">
          {/* Profile Photo / Avatar Picker */}
          <div>
            <label className="block text-xs font-bold text-[#1a241b] uppercase tracking-wider mb-2">
              Profile Photo &amp; Avatar
            </label>
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="relative shrink-0">
                {avatar ? (
                  <img
                    src={avatar}
                    alt="Profile Avatar"
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-[#528d5a]/30 shadow-xs"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-[#eff5f0] border border-[#cddfd0] text-[#528d5a] flex items-center justify-center font-bold text-xl font-['Outfit'] shadow-xs">
                    {name ? name.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
              </div>

              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                    className="px-3.5 py-1.5 bg-[#eff5f0] hover:bg-[#e2ede4] text-[#1a241b] rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    {showAvatarPicker ? 'Hide Avatar Presets' : 'Choose Preset Avatar'}
                  </button>
                  {avatar && (
                    <button
                      type="button"
                      onClick={() => setAvatar('')}
                      className="px-3 py-1.5 text-xs text-[#8ca18f] hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    >
                      Remove Photo
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-[#8ca18f]">
                  Select an avatar preset or provide a custom image URL below.
                </p>
              </div>
            </div>

            {/* Collapsible Avatar Presets */}
            {showAvatarPicker && (
              <div className="mt-4 p-4 rounded-2xl bg-[#f8f9f8] border border-[#e2ede4] space-y-3">
                <span className="text-xs font-bold text-[#1a241b] block">
                  Select a Photo:
                </span>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                  {PRESET_AVATARS.map((url, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => {
                        setAvatar(url);
                        setShowAvatarPicker(false);
                      }}
                      className={`relative rounded-xl overflow-hidden aspect-square border-2 transition-all cursor-pointer ${
                        avatar === url
                          ? 'border-[#528d5a] ring-2 ring-[#528d5a]/20 scale-105'
                          : 'border-transparent hover:border-[#cddfd0]'
                      }`}
                    >
                      <img
                        src={url}
                        alt={`Preset ${idx + 1}`}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </button>
                  ))}
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <input
                    type="url"
                    placeholder="Or paste custom image URL (https://...)"
                    value={customAvatarUrl}
                    onChange={(e) => setCustomAvatarUrl(e.target.value)}
                    className="flex-1 bg-white border border-[#e2ede4] rounded-xl px-3.5 py-2 text-xs text-[#1a241b] focus:outline-none focus:ring-2 focus:ring-[#528d5a]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customAvatarUrl.trim()) {
                        setAvatar(customAvatarUrl.trim());
                        setCustomAvatarUrl('');
                        setShowAvatarPicker(false);
                      }
                    }}
                    className="px-3.5 py-2 bg-[#528d5a] text-white text-xs font-bold rounded-xl hover:bg-[#43754a] transition-colors cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#1a241b] uppercase tracking-wider mb-1.5">
                Full Display Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Morgan"
                className="w-full bg-white border border-[#e2ede4] rounded-xl px-4 py-2.5 text-sm text-[#1a241b] focus:outline-none focus:ring-2 focus:ring-[#528d5a]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1a241b] uppercase tracking-wider mb-1.5">
                Email Address (Account ID)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#8ca18f] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  readOnly
                  value={user?.email || ''}
                  className="w-full bg-[#f8f9f8] border border-[#e2ede4] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#8ca18f] font-mono cursor-not-allowed outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1a241b] uppercase tracking-wider mb-1.5">
              Preferred Timezone
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 text-[#8ca18f] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={timeZone}
                onChange={(e) => setTimeZone(e.target.value)}
                className="w-full bg-white border border-[#e2ede4] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#1a241b] focus:outline-none focus:ring-2 focus:ring-[#528d5a]"
              />
            </div>
            <span className="block text-[11px] text-[#8ca18f] mt-1">
              Used to format meeting invitation schedules and timestamps accurately.
            </span>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={savingProfile}
              id="save-profile-btn"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#528d5a] hover:bg-[#43754a] text-white text-xs font-bold rounded-xl shadow-xs shadow-[#528d5a]/20 transition-all cursor-pointer disabled:opacity-60"
            >
              {savingProfile ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving Profile...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      {/* SECTION 2: MEETING PREFERENCES & HARDWARE */}
      <section className="bg-white rounded-3xl border border-[#e2ede4] p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#e2ede4]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#eff5f0] text-[#528d5a] flex items-center justify-center">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1a241b] font-['Outfit']">
                Meeting &amp; Hardware Preferences
              </h3>
              <p className="text-xs text-[#5a6b5c]">
                Configure default audio/video devices and entry behaviors.
              </p>
            </div>
          </div>

          {/* Test Devices Trigger Button */}
          {!isTestingDevices ? (
            <button
              type="button"
              onClick={handleStartDeviceTest}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#eff5f0] hover:bg-[#e2ede4] text-[#1a241b] rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
            >
              <Sliders className="w-3.5 h-3.5 text-[#528d5a]" />
              <span>Test &amp; Select Devices</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStopDeviceTest}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
            >
              <span>Stop Testing</span>
            </button>
          )}
        </div>

        {/* Live Device Hardware Tester Box (Only mounted when explicitly tested) */}
        {isTestingDevices && (
          <div className="p-5 rounded-2xl bg-[#f8f9f8] border border-[#cddfd0] space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#1a241b]">
                  Hardware Diagnostics Active
                </h4>
              </div>
              <span className="text-[11px] text-[#5a6b5c]">
                Camera &amp; Microphone permission granted
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Video Camera Preview */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#1a241b] uppercase tracking-wider">
                  Default Camera
                </label>
                <select
                  value={defaultVideoDeviceId}
                  onChange={(e) => handleChangeTestVideoDevice(e.target.value)}
                  className="w-full bg-white border border-[#e2ede4] rounded-xl px-3.5 py-2 text-xs text-[#1a241b] focus:outline-none focus:ring-2 focus:ring-[#528d5a]"
                >
                  {videoInputDevices.length > 0 ? (
                    videoInputDevices.map((device, idx) => (
                      <option key={device.deviceId || idx} value={device.deviceId}>
                        {device.label || `Camera ${idx + 1}`}
                      </option>
                    ))
                  ) : (
                    <option value="">Default System Camera</option>
                  )}
                </select>

                {/* Video Monitor */}
                <div className="relative aspect-video rounded-xl bg-black/90 overflow-hidden border border-[#e2ede4] flex items-center justify-center">
                  <video
                    ref={testVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${mirrorVideo ? '-scale-x-100' : ''}`}
                  />
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-[10px] text-white font-mono flex items-center gap-1">
                    <Camera className="w-3 h-3 text-emerald-400" />
                    <span>Live Camera Test</span>
                  </div>
                </div>
              </div>

              {/* Microphone Level Preview */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#1a241b] uppercase tracking-wider">
                  Default Microphone
                </label>
                <select
                  value={defaultAudioDeviceId}
                  onChange={(e) => handleChangeTestAudioDevice(e.target.value)}
                  className="w-full bg-white border border-[#e2ede4] rounded-xl px-3.5 py-2 text-xs text-[#1a241b] focus:outline-none focus:ring-2 focus:ring-[#528d5a]"
                >
                  {audioInputDevices.length > 0 ? (
                    audioInputDevices.map((device, idx) => (
                      <option key={device.deviceId || idx} value={device.deviceId}>
                        {device.label || `Microphone ${idx + 1}`}
                      </option>
                    ))
                  ) : (
                    <option value="">Default System Microphone</option>
                  )}
                </select>

                <div className="p-4 rounded-xl bg-white border border-[#e2ede4] space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#5a6b5c] font-medium flex items-center gap-1.5">
                      <Mic className="w-3.5 h-3.5 text-[#528d5a]" />
                      <span>Input Level Meter:</span>
                    </span>
                    <span className="font-mono text-[11px] font-bold text-[#1a241b]">
                      {micVolumeLevel}%
                    </span>
                  </div>

                  {/* Visual Volume Bar */}
                  <div className="w-full h-3 bg-[#eff5f0] rounded-full overflow-hidden p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-75 ${
                        micVolumeLevel > 75 ? 'bg-amber-500' : 'bg-[#528d5a]'
                      }`}
                      style={{ width: `${Math.max(4, micVolumeLevel)}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-[#8ca18f] leading-relaxed">
                    Speak into your microphone to verify audio pickup levels.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {deviceError && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{deviceError}</span>
          </div>
        )}

        {/* Join Defaults Toggles */}
        <div className="space-y-4 pt-2">
          <h4 className="text-xs font-bold text-[#1a241b] uppercase tracking-wider">
            Join &amp; Experience Preferences
          </h4>

          <div className="space-y-3">
            {/* Mute Mic on Join */}
            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-[#f8f9f8] hover:bg-[#eff5f0]/60 border border-[#e2ede4] transition-colors cursor-pointer">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-[#1a241b] block">
                  Join with microphone muted
                </span>
                <span className="text-[11px] text-[#5a6b5c] block">
                  Keep your microphone silenced whenever you enter a meeting room.
                </span>
              </div>
              <input
                type="checkbox"
                checked={muteMicOnJoin}
                onChange={(e) => setMuteMicOnJoin(e.target.checked)}
                className="w-4 h-4 accent-[#528d5a] rounded-sm cursor-pointer"
              />
            </label>

            {/* Turn off Camera on Join */}
            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-[#f8f9f8] hover:bg-[#eff5f0]/60 border border-[#e2ede4] transition-colors cursor-pointer">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-[#1a241b] block">
                  Join with camera turned off
                </span>
                <span className="text-[11px] text-[#5a6b5c] block">
                  Start meetings with video disabled until you choose to turn it on.
                </span>
              </div>
              <input
                type="checkbox"
                checked={turnOffCameraOnJoin}
                onChange={(e) => setTurnOffCameraOnJoin(e.target.checked)}
                className="w-4 h-4 accent-[#528d5a] rounded-sm cursor-pointer"
              />
            </label>

            {/* Auto-copy Link */}
            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-[#f8f9f8] hover:bg-[#eff5f0]/60 border border-[#e2ede4] transition-colors cursor-pointer">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-[#1a241b] block">
                  Auto-copy meeting URL on creation
                </span>
                <span className="text-[11px] text-[#5a6b5c] block">
                  Automatically copy the invite link to your clipboard when launching a new room.
                </span>
              </div>
              <input
                type="checkbox"
                checked={autoCopyLink}
                onChange={(e) => setAutoCopyLink(e.target.checked)}
                className="w-4 h-4 accent-[#528d5a] rounded-sm cursor-pointer"
              />
            </label>

            {/* Mirror Video */}
            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-[#f8f9f8] hover:bg-[#eff5f0]/60 border border-[#e2ede4] transition-colors cursor-pointer">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-[#1a241b] block">
                  Mirror self-view camera
                </span>
                <span className="text-[11px] text-[#5a6b5c] block">
                  Flips your local video preview horizontally so it behaves like a physical mirror.
                </span>
              </div>
              <input
                type="checkbox"
                checked={mirrorVideo}
                onChange={(e) => setMirrorVideo(e.target.checked)}
                className="w-4 h-4 accent-[#528d5a] rounded-sm cursor-pointer"
              />
            </label>

            {/* Audio Chime on Join */}
            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-[#f8f9f8] hover:bg-[#eff5f0]/60 border border-[#e2ede4] transition-colors cursor-pointer">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-[#1a241b] block">
                  Play participant chime sound
                </span>
                <span className="text-[11px] text-[#5a6b5c] block">
                  Play a subtle tone when attendees enter or exit the active call.
                </span>
              </div>
              <input
                type="checkbox"
                checked={playJoinSound}
                onChange={(e) => setPlayJoinSound(e.target.checked)}
                className="w-4 h-4 accent-[#528d5a] rounded-sm cursor-pointer"
              />
            </label>
          </div>
        </div>
      </section>

      {/* SECTION 3: NOTIFICATIONS PREFERENCES */}
      <section className="bg-white rounded-3xl border border-[#e2ede4] p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-[#e2ede4]">
          <div className="w-10 h-10 rounded-xl bg-[#eff5f0] text-[#528d5a] flex items-center justify-center">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#1a241b] font-['Outfit']">
              Notification Preferences
            </h3>
            <p className="text-xs text-[#5a6b5c]">
              Choose which real-time events trigger notifications and sound alerts.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {/* Meeting Invitations */}
          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-[#f8f9f8] hover:bg-[#eff5f0]/60 border border-[#e2ede4] transition-colors cursor-pointer">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-[#1a241b] block">
                Meeting invitations
              </span>
              <span className="text-[11px] text-[#5a6b5c] block">
                Receive notifications when colleagues or contacts invite you to video sessions.
              </span>
            </div>
            <input
              type="checkbox"
              checked={notifMeetingInvites}
              onChange={(e) => setNotifMeetingInvites(e.target.checked)}
              className="w-4 h-4 accent-[#528d5a] rounded-sm cursor-pointer"
            />
          </label>

          {/* Meeting Reminders */}
          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-[#f8f9f8] hover:bg-[#eff5f0]/60 border border-[#e2ede4] transition-colors cursor-pointer">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-[#1a241b] block">
                Meeting reminders
              </span>
              <span className="text-[11px] text-[#5a6b5c] block">
                Alerts for upcoming scheduled conferences and start times.
              </span>
            </div>
            <input
              type="checkbox"
              checked={notifMeetingReminders}
              onChange={(e) => setNotifMeetingReminders(e.target.checked)}
              className="w-4 h-4 accent-[#528d5a] rounded-sm cursor-pointer"
            />
          </label>

          {/* Participant Arrival */}
          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-[#f8f9f8] hover:bg-[#eff5f0]/60 border border-[#e2ede4] transition-colors cursor-pointer">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-[#1a241b] block">
                Participant joined alerts
              </span>
              <span className="text-[11px] text-[#5a6b5c] block">
                Notify you as a host when attendees enter your hosted meetings.
              </span>
            </div>
            <input
              type="checkbox"
              checked={notifParticipantJoined}
              onChange={(e) => setNotifParticipantJoined(e.target.checked)}
              className="w-4 h-4 accent-[#528d5a] rounded-sm cursor-pointer"
            />
          </label>

          {/* Contact Requests */}
          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-[#f8f9f8] hover:bg-[#eff5f0]/60 border border-[#e2ede4] transition-colors cursor-pointer">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-[#1a241b] block">
                Contact requests &amp; updates
              </span>
              <span className="text-[11px] text-[#5a6b5c] block">
                Get notified when workspace users add you to their contacts list.
              </span>
            </div>
            <input
              type="checkbox"
              checked={notifContactAlerts}
              onChange={(e) => setNotifContactAlerts(e.target.checked)}
              className="w-4 h-4 accent-[#528d5a] rounded-sm cursor-pointer"
            />
          </label>

          {/* Chat Notifications */}
          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-[#f8f9f8] hover:bg-[#eff5f0]/60 border border-[#e2ede4] transition-colors cursor-pointer">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-[#1a241b] block">
                Direct chat notifications
              </span>
              <span className="text-[11px] text-[#5a6b5c] block">
                Notify on new incoming direct messages and meeting links.
              </span>
            </div>
            <input
              type="checkbox"
              checked={notifChatMessages}
              onChange={(e) => setNotifChatMessages(e.target.checked)}
              className="w-4 h-4 accent-[#528d5a] rounded-sm cursor-pointer"
            />
          </label>

          {/* Notification Sounds */}
          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-[#f8f9f8] hover:bg-[#eff5f0]/60 border border-[#e2ede4] transition-colors cursor-pointer">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-[#1a241b] block">
                In-app notification sounds
              </span>
              <span className="text-[11px] text-[#5a6b5c] block">
                Play subtle audio alert chimes when incoming notifications arrive.
              </span>
            </div>
            <input
              type="checkbox"
              checked={notifSoundEnabled}
              onChange={(e) => setNotifSoundEnabled(e.target.checked)}
              className="w-4 h-4 accent-[#528d5a] rounded-sm cursor-pointer"
            />
          </label>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={handleSavePreferences}
            disabled={savingPreferences}
            id="save-preferences-btn"
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#528d5a] hover:bg-[#43754a] text-white text-xs font-bold rounded-xl shadow-xs shadow-[#528d5a]/20 transition-all cursor-pointer disabled:opacity-60"
          >
            {savingPreferences ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving Preferences...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Save Meeting &amp; Notification Preferences</span>
              </>
            )}
          </button>
        </div>
      </section>

      {/* SECTION 4: SECURITY & CREDENTIALS */}
      <section className="bg-white rounded-3xl border border-[#e2ede4] p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-[#e2ede4]">
          <div className="w-10 h-10 rounded-xl bg-[#eff5f0] text-[#528d5a] flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#1a241b] font-['Outfit']">
              Security &amp; Account
            </h3>
            <p className="text-xs text-[#5a6b5c]">
              Manage authentication credentials, password reset requests, and session sign-out.
            </p>
          </div>
        </div>

        {/* Password Reset */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#f8f9f8] border border-[#e2ede4]">
          <div>
            <h4 className="text-sm font-bold text-[#1a241b] font-['Outfit']">
              Change Account Password
            </h4>
            <p className="text-xs text-[#5a6b5c] mt-0.5">
              Send a secure password reset link to your verified email: <span className="font-mono text-[#1a241b]">{user?.email}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={handleSendPasswordReset}
            disabled={passwordSent}
            id="password-reset-btn"
            className="px-4 py-2 bg-white border border-[#cddfd0] hover:bg-[#eff5f0] text-[#1a241b] text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0 disabled:opacity-75"
          >
            {passwordSent ? 'Reset Email Sent!' : 'Send Reset Link'}
          </button>
        </div>

        {/* Security Encryption Notice */}
        <div className="p-4 rounded-2xl bg-[#eff5f0] border border-[#cddfd0] flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-[#528d5a] shrink-0 mt-0.5" />
          <div className="text-xs text-[#3d6e44] leading-relaxed">
            <span className="font-bold block mb-0.5">Zero-Knowledge Peer-to-Peer Encryption</span>
            FreeMeet enforces DTLS-SRTP encryption on all live media streams. Room configurations, participant rosters, and user profile data are authenticated through Firebase Firestore security rules.
          </div>
        </div>

        {/* Logout Zone */}
        <div className="pt-4 border-t border-[#e2ede4] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-[#1a241b] font-['Outfit']">
              Sign Out of Session
            </h4>
            <p className="text-xs text-[#5a6b5c]">
              Securely disconnect your current session and clear authentication credentials.
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            id="settings-signout-btn"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 transition-colors cursor-pointer shrink-0"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </section>
    </div>
  );
};
