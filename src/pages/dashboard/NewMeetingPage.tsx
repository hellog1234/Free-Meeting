import React, { useState } from 'react';
import { 
  Video, 
  Lock, 
  Users, 
  ShieldCheck, 
  MicOff, 
  Monitor, 
  MessageSquare, 
  Clock, 
  Sparkles,
  AlertCircle,
  KeyRound,
  Sliders,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { useRouter } from '../../context/RouterContext';
import { useAuth } from '../../context/AuthContext';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { logActivity } from '../../lib/activityLogger';
import { MeetingSettings } from '../../types';
import { getMeetingUrl } from '../../utils/meetingUtils';

export const NewMeetingPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { navigate } = useRouter();

  // Form Fields
  const [meetingName, setMeetingName] = useState('');
  const [password, setPassword] = useState('');
  const [participantLimit, setParticipantLimit] = useState<number>(50);

  // Settings
  const [settings, setSettings] = useState<MeetingSettings>({
    allowParticipantsBeforeHost: false,
    muteParticipantsOnJoin: true,
    allowScreenSharing: true,
    allowChat: true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate random human-readable room code like abc-defg-hij
  const generateHumanReadableCode = (): string => {
    const chars = 'abcdefghijkmnpqrstuvwxyz23456789'; // exclude confusing chars like l, 1, o, 0
    const pick = (len: number) => {
      let res = '';
      for (let i = 0; i < len; i++) {
        res += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return res;
    };
    return `${pick(3)}-${pick(4)}-${pick(3)}`;
  };

  // Generate unique meeting ID
  const generateMeetingId = (): string => {
    const timestamp = Date.now().toString(36);
    const randomBytes = Math.random().toString(36).substring(2, 8);
    return `mtg_${timestamp}_${randomBytes}`;
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 1. Verify Firebase authentication
    if (!isAuthenticated || !user?.id) {
      setError('You must be signed in to create a meeting. Please log in.');
      return;
    }

    const trimmedName = meetingName.trim();
    if (!trimmedName) {
      setError('Please provide a meeting name.');
      return;
    }

    setLoading(true);

    try {
      // 2. Generate unique meetingId and human-readable code
      const meetingId = generateMeetingId();
      const code = generateHumanReadableCode();

      // 3. Save meeting to Firestore storing meetingId & meetingCode (no hardcoded domain)
      const meetingDocRef = doc(db, 'meetings', meetingId);
      await setDoc(meetingDocRef, {
        id: meetingId,
        hostId: user.id,
        hostName: user.name || user.email?.split('@')[0] || 'Meeting Host',
        title: trimmedName,
        code,
        password: password.trim() ? password.trim() : null,
        participantLimit: Number(participantLimit) || 50,
        settings: {
          allowParticipantsBeforeHost: Boolean(settings.allowParticipantsBeforeHost),
          muteParticipantsOnJoin: Boolean(settings.muteParticipantsOnJoin),
          allowScreenSharing: Boolean(settings.allowScreenSharing),
          allowChat: Boolean(settings.allowChat),
        },
        status: 'scheduled',
        participantCount: 0,
        participantIds: [user.id],
        createdAt: serverTimestamp(),
      });

      // Log meeting creation activity
      logActivity('meeting_created', `Meeting created: ${trimmedName}`, {
        meetingId,
        meetingCode: code,
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        details: { title: trimmedName, code },
      });

      // 4. Redirect to /meeting/{meetingId}/prejoin (no camera/mic permissions requested here)
      navigate(`/meeting/${meetingId}/prejoin`);
    } catch (err: any) {
      console.error('Error creating meeting in Firestore:', err);
      setError(err?.message || 'Failed to create meeting room. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header section matching exact design */}
      <div className="bg-white rounded-3xl border border-[#e2ede4] p-6 sm:p-8 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-[#eff5f0] text-[#528d5a] flex items-center justify-center mb-4">
          <Video className="w-6 h-6" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-[#1a241b] font-['Outfit']">
          Create a Meeting
        </h2>
        <p className="text-xs sm:text-sm text-[#5a6b5c] mt-1 leading-relaxed">
          Set up your meeting and invite people.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Creation Form */}
      <form onSubmit={handleCreateMeeting} className="bg-white rounded-3xl border border-[#e2ede4] p-6 sm:p-8 shadow-xs space-y-6">
        {/* Fields Section */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-[#1a241b] uppercase tracking-wider text-[#528d5a]">
            Meeting Details
          </h3>

          {/* Meeting Name */}
          <div>
            <label className="block text-xs font-bold text-[#1a241b] uppercase tracking-wider mb-1.5">
              Meeting Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              id="meeting-name-input"
              value={meetingName}
              onChange={(e) => setMeetingName(e.target.value)}
              placeholder="e.g., Weekly Product Sync or Design Critique"
              className="w-full bg-white border border-[#e2ede4] rounded-xl px-4 py-2.5 text-sm text-[#1a241b] placeholder:text-[#8ca18f] focus:outline-none focus:ring-2 focus:ring-[#528d5a]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Optional Password */}
            <div>
              <label className="block text-xs font-bold text-[#1a241b] uppercase tracking-wider mb-1.5">
                Optional Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-[#8ca18f] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  id="meeting-password-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Leave empty for open access"
                  className="w-full bg-white border border-[#e2ede4] rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono text-[#1a241b] placeholder:text-[#8ca18f] placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-[#528d5a]"
                />
              </div>
              <span className="block text-[11px] text-[#8ca18f] mt-1">
                Attendees will be prompted before entering if set.
              </span>
            </div>

            {/* Participant Limit */}
            <div>
              <label className="block text-xs font-bold text-[#1a241b] uppercase tracking-wider mb-1.5">
                Participant Limit
              </label>
              <div className="relative">
                <Users className="w-4 h-4 text-[#8ca18f] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <select
                  id="participant-limit-select"
                  value={participantLimit}
                  onChange={(e) => setParticipantLimit(Number(e.target.value))}
                  className="w-full bg-white border border-[#e2ede4] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#1a241b] focus:outline-none focus:ring-2 focus:ring-[#528d5a] appearance-none cursor-pointer"
                >
                  <option value={10}>10 Participants</option>
                  <option value={25}>25 Participants</option>
                  <option value={50}>50 Participants (Recommended)</option>
                  <option value={100}>100 Participants</option>
                  <option value={250}>250 Participants (Max)</option>
                </select>
              </div>
              <span className="block text-[11px] text-[#8ca18f] mt-1">
                Room capacity limit for this session.
              </span>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-[#e2ede4]" />

        {/* Settings Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#528d5a]" />
            <h3 className="text-xs font-bold text-[#1a241b] uppercase tracking-wider">
              Meeting Controls &amp; Settings
            </h3>
          </div>

          <div className="space-y-3">
            {/* Allow participants before host */}
            <label className="flex items-start justify-between gap-4 p-3.5 rounded-2xl bg-[#f8f9f8] border border-[#e2ede4] hover:border-[#cddfd0] cursor-pointer transition-colors">
              <div className="space-y-0.5">
                <span className="text-xs sm:text-sm font-bold text-[#1a241b] block font-['Outfit']">
                  Allow participants before host
                </span>
                <span className="text-[11px] sm:text-xs text-[#5a6b5c] block">
                  Attendees can enter the room and chat before the host joins.
                </span>
              </div>
              <input
                type="checkbox"
                id="setting-allow-before-host"
                checked={settings.allowParticipantsBeforeHost}
                onChange={(e) => setSettings({ ...settings, allowParticipantsBeforeHost: e.target.checked })}
                className="w-5 h-5 rounded-md text-[#528d5a] focus:ring-[#528d5a] accent-[#528d5a] shrink-0 mt-0.5 cursor-pointer"
              />
            </label>

            {/* Mute participants on join */}
            <label className="flex items-start justify-between gap-4 p-3.5 rounded-2xl bg-[#f8f9f8] border border-[#e2ede4] hover:border-[#cddfd0] cursor-pointer transition-colors">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <MicOff className="w-3.5 h-3.5 text-[#528d5a]" />
                  <span className="text-xs sm:text-sm font-bold text-[#1a241b] block font-['Outfit']">
                    Mute participants on join
                  </span>
                </div>
                <span className="text-[11px] sm:text-xs text-[#5a6b5c] block">
                  Automatically silence microphones when attendees enter to prevent echo.
                </span>
              </div>
              <input
                type="checkbox"
                id="setting-mute-on-join"
                checked={settings.muteParticipantsOnJoin}
                onChange={(e) => setSettings({ ...settings, muteParticipantsOnJoin: e.target.checked })}
                className="w-5 h-5 rounded-md text-[#528d5a] focus:ring-[#528d5a] accent-[#528d5a] shrink-0 mt-0.5 cursor-pointer"
              />
            </label>

            {/* Allow screen sharing */}
            <label className="flex items-start justify-between gap-4 p-3.5 rounded-2xl bg-[#f8f9f8] border border-[#e2ede4] hover:border-[#cddfd0] cursor-pointer transition-colors">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <Monitor className="w-3.5 h-3.5 text-[#528d5a]" />
                  <span className="text-xs sm:text-sm font-bold text-[#1a241b] block font-['Outfit']">
                    Allow screen sharing
                  </span>
                </div>
                <span className="text-[11px] sm:text-xs text-[#5a6b5c] block">
                  Enable participants to present slides, windows, and entire screens.
                </span>
              </div>
              <input
                type="checkbox"
                id="setting-allow-screen-share"
                checked={settings.allowScreenSharing}
                onChange={(e) => setSettings({ ...settings, allowScreenSharing: e.target.checked })}
                className="w-5 h-5 rounded-md text-[#528d5a] focus:ring-[#528d5a] accent-[#528d5a] shrink-0 mt-0.5 cursor-pointer"
              />
            </label>

            {/* Allow chat */}
            <label className="flex items-start justify-between gap-4 p-3.5 rounded-2xl bg-[#f8f9f8] border border-[#e2ede4] hover:border-[#cddfd0] cursor-pointer transition-colors">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-[#528d5a]" />
                  <span className="text-xs sm:text-sm font-bold text-[#1a241b] block font-['Outfit']">
                    Allow chat
                  </span>
                </div>
                <span className="text-[11px] sm:text-xs text-[#5a6b5c] block">
                  Permit real-time in-call text messaging, questions, and link sharing.
                </span>
              </div>
              <input
                type="checkbox"
                id="setting-allow-chat"
                checked={settings.allowChat}
                onChange={(e) => setSettings({ ...settings, allowChat: e.target.checked })}
                className="w-5 h-5 rounded-md text-[#528d5a] focus:ring-[#528d5a] accent-[#528d5a] shrink-0 mt-0.5 cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Submit button */}
        <div className="pt-4 border-t border-[#e2ede4] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-[#5a6b5c]">
            <ShieldCheck className="w-4 h-4 text-[#528d5a] shrink-0" />
            <span>Encrypted WebRTC ready on join</span>
          </div>

          <button
            type="submit"
            id="create-meeting-submit-btn"
            disabled={loading}
            className="w-full sm:w-auto px-8 py-3 bg-[#528d5a] hover:bg-[#43754a] text-white font-bold text-sm rounded-xl shadow-xs shadow-[#528d5a]/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <span>{loading ? 'Creating Meeting...' : 'Create Meeting'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
