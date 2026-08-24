import React, { useState, useEffect } from 'react';
import { 
  LogIn, 
  Keyboard, 
  ShieldCheck, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Lock, 
  Users, 
  Clock, 
  Sparkles,
  Link as LinkIcon
} from 'lucide-react';
import { useRouter } from '../../context/RouterContext';
import { useAuth } from '../../context/AuthContext';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Meeting } from '../../types';

export const JoinMeetingPage: React.FC = () => {
  const { user } = useAuth();
  const { navigate } = useRouter();

  const [inputCodeOrUrl, setInputCodeOrUrl] = useState('');
  const [password, setPassword] = useState('');
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [foundMeeting, setFoundMeeting] = useState<Meeting | null>(null);

  // Extract code from query params if passed directly (e.g., /dashboard/join-meeting?code=abc-defg-hij)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const codeParam = params.get('code');
      if (codeParam) {
        setInputCodeOrUrl(codeParam.trim());
      }
    }
  }, []);

  /**
   * Helper function to extract and normalize meeting identifier or code from
   * raw text, code with hyphens, spaces, or full URLs.
   */
  const extractIdentifiers = (rawInput: string) => {
    let clean = rawInput.trim();

    // Check if user pasted a full URL
    if (clean.startsWith('http://') || clean.startsWith('https://') || clean.includes('/')) {
      try {
        // Attempt parsing as URL or URL path
        const urlObj = new URL(clean.startsWith('http') ? clean : `https://${clean}`);
        
        // 1. Check query parameter ?code=...
        const codeInQuery = urlObj.searchParams.get('code');
        if (codeInQuery) {
          clean = codeInQuery;
        } else {
          // 2. Check path like /meeting/mtg_123/prejoin or /meeting/abc-defg-hij
          const pathSegments = urlObj.pathname.split('/').filter(Boolean);
          const meetingIdx = pathSegments.indexOf('meeting');
          if (meetingIdx !== -1 && pathSegments[meetingIdx + 1]) {
            clean = pathSegments[meetingIdx + 1];
          } else if (pathSegments.length > 0) {
            clean = pathSegments[pathSegments.length - 1];
          }
        }
      } catch {
        // Fallback split by slash
        const parts = clean.split('/');
        clean = parts[parts.length - 1] || clean;
      }
    }

    // Normalize: remove spaces, lowercase
    const normalized = clean.toLowerCase().replace(/\s+/g, '');
    
    // Also build hyphenated code if 10 alphanumeric characters (e.g. abcdefghij -> abc-defg-hij)
    const alphanumericOnly = normalized.replace(/[^a-z0-9]/g, '');
    let formattedCode = normalized;
    if (alphanumericOnly.length === 10 && !normalized.includes('-')) {
      formattedCode = `${alphanumericOnly.slice(0, 3)}-${alphanumericOnly.slice(3, 7)}-${alphanumericOnly.slice(7, 10)}`;
    }

    return {
      raw: normalized,
      cleanId: normalized,
      formattedCode,
      alphanumericOnly,
    };
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const { raw, cleanId, formattedCode, alphanumericOnly } = extractIdentifiers(inputCodeOrUrl);

    if (!raw) {
      setError('Enter a code or link');
      return;
    }

    setLoading(true);

    try {
      let meetingData: Meeting | null = null;
      let meetingDocId: string | null = null;

      // Step 1: Search Firestore for the real meeting
      // 1a. Try finding directly by Document ID
      const directDocRef = doc(db, 'meetings', cleanId);
      const directDocSnap = await getDoc(directDocRef);

      if (directDocSnap.exists()) {
        meetingData = { id: directDocSnap.id, ...directDocSnap.data() } as Meeting;
        meetingDocId = directDocSnap.id;
      } else {
        // 1b. Query Firestore collection by code (trying formatted, raw, or exact match)
        const possibleCodes = Array.from(new Set([formattedCode, raw, alphanumericOnly])).filter(Boolean);
        
        for (const testCode of possibleCodes) {
          const q = query(collection(db, 'meetings'), where('code', '==', testCode));
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            const docFound = snapshot.docs[0];
            meetingData = { id: docFound.id, ...docFound.data() } as Meeting;
            meetingDocId = docFound.id;
            break;
          }
        }
      }

      // Step 2: Verify it exists (Never open a fake meeting)
      if (!meetingData || !meetingDocId) {
        setError('Meeting not found');
        setLoading(false);
        return;
      }

      setFoundMeeting(meetingData);

      // Step 3: Verify it has not ended
      if (
        meetingData.status === 'completed' || 
        meetingData.status === 'cancelled' || 
        meetingData.endedAt
      ) {
        setError('Meeting ended');
        setLoading(false);
        return;
      }

      // Step 4: Check participant limit
      const currentCount = Number(meetingData.participantCount) || 0;
      const limit = Number(meetingData.participantLimit) || 0;
      if (limit > 0 && currentCount >= limit) {
        setError('Meeting full');
        setLoading(false);
        return;
      }

      // Step 5: Check join-before-host setting
      const isHost = user?.id && meetingData.hostId === user.id;
      const allowBeforeHost = meetingData.settings?.allowParticipantsBeforeHost ?? true;

      if (!isHost && !allowBeforeHost && meetingData.status === 'scheduled') {
        setError('Waiting for host');
        setLoading(false);
        return;
      }

      // Step 6: Check password if enabled
      const meetingPassword = meetingData.password ? meetingData.password.trim() : '';
      if (meetingPassword.length > 0 && !isHost) {
        const enteredPwd = password.trim();
        if (!enteredPwd) {
          setRequiresPassword(true);
          setError('Password required');
          setLoading(false);
          return;
        }

        if (enteredPwd !== meetingPassword) {
          setError('Invalid password');
          setLoading(false);
          return;
        }
      }

      // Step 7: Valid → /meeting/{meetingId}/prejoin
      navigate(`/meeting/${meetingDocId}/prejoin`);
    } catch (err: any) {
      console.error('Error verifying meeting in Firestore:', err);
      setError(err?.message || 'Failed to verify meeting. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header section matching exact design */}
      <div className="bg-white rounded-3xl border border-[#e2ede4] p-6 sm:p-8 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-[#eff5f0] text-[#528d5a] flex items-center justify-center mb-4">
          <LogIn className="w-6 h-6" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-[#1a241b] font-['Outfit']">
          Join a Meeting
        </h2>
        <p className="text-xs sm:text-sm text-[#5a6b5c] mt-1 leading-relaxed">
          Enter a code or link to join an existing FreeMeet conference call.
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div 
          id="join-meeting-error-banner"
          className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5 animate-in fade-in duration-200"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Main Form - Google Meet Style */}
      <div className="bg-white rounded-3xl border border-[#e2ede4] p-6 sm:p-8 shadow-xs space-y-6">
        <form onSubmit={handleJoin} className="space-y-5">
          <div>
            <label 
              htmlFor="meeting-code-input"
              className="block text-xs font-bold text-[#1a241b] uppercase tracking-wider mb-2"
            >
              Enter a code or link
            </label>
            
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8ca18f]">
                {inputCodeOrUrl.includes('http') || inputCodeOrUrl.includes('/') ? (
                  <LinkIcon className="w-4 h-4" />
                ) : (
                  <Keyboard className="w-4 h-4" />
                )}
              </div>
              <input
                type="text"
                id="meeting-code-input"
                required
                value={inputCodeOrUrl}
                onChange={(e) => {
                  setInputCodeOrUrl(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="abc-defg-hij"
                autoComplete="off"
                spellCheck="false"
                className="w-full bg-white border border-[#e2ede4] rounded-xl pl-10 pr-4 py-3 text-sm font-mono text-[#1a241b] placeholder:text-[#8ca18f] placeholder:font-mono focus:outline-none focus:ring-2 focus:ring-[#528d5a]"
              />
            </div>
            <span className="block text-[11px] text-[#8ca18f] mt-1.5">
              Enter a 10-letter code like <span className="font-mono text-[#5a6b5c]">abc-defg-hij</span> or paste the full URL.
            </span>
          </div>

          {/* Password Prompt when meeting is password-protected */}
          {requiresPassword && (
            <div className="p-4 rounded-2xl bg-[#eff5f0] border border-[#cddfd0] space-y-2 animate-in fade-in">
              <label 
                htmlFor="meeting-join-password"
                className="flex items-center gap-1.5 text-xs font-bold text-[#1a241b] uppercase tracking-wider"
              >
                <Lock className="w-3.5 h-3.5 text-[#528d5a]" />
                <span>Meeting Password Required</span>
              </label>
              <input
                type="password"
                id="meeting-join-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Enter password set by host"
                className="w-full bg-white border border-[#cddfd0] rounded-xl px-4 py-2.5 text-sm text-[#1a241b] focus:outline-none focus:ring-2 focus:ring-[#528d5a]"
              />
              <span className="block text-[11px] text-[#3d6e44]">
                This room is protected. Please enter the access code provided by the organizer.
              </span>
            </div>
          )}

          {/* Action Row */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-[#8ca18f]">
              <ShieldCheck className="w-4 h-4 text-[#528d5a] shrink-0" />
              <span>Encrypted peer handshake on connect</span>
            </div>

            <button
              type="submit"
              id="join-meeting-submit-btn"
              disabled={loading || !inputCodeOrUrl.trim()}
              className="px-8 py-3 bg-[#528d5a] hover:bg-[#43754a] disabled:bg-[#528d5a]/40 text-white font-bold text-sm rounded-xl shadow-xs shadow-[#528d5a]/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              <span>{loading ? 'Verifying Room...' : 'Join'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Informational Guidance Box */}
        <div className="pt-5 border-t border-[#e2ede4] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#5a6b5c]">
          <div className="p-3 rounded-2xl bg-[#f8f9f8] border border-[#e2ede4] space-y-1">
            <span className="font-bold text-[#1a241b] block font-['Outfit']">No Account Required</span>
            <p className="text-[11px] text-[#5a6b5c] leading-relaxed">
              Invited guests can join rooms directly with the meeting link or room code.
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-[#f8f9f8] border border-[#e2ede4] space-y-1">
            <span className="font-bold text-[#1a241b] block font-['Outfit']">Zero-Access Privacy</span>
            <p className="text-[11px] text-[#5a6b5c] leading-relaxed">
              Media streams travel peer-to-peer with DTLS-SRTP encryption without recording.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
