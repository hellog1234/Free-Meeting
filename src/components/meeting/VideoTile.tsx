import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, VideoOff, Pin, PinOff, WifiOff, Loader2 } from 'lucide-react';

interface VideoTileProps {
  stream: MediaStream | null;
  name: string;
  isLocal?: boolean;
  isMirrored?: boolean;
  audioEnabled?: boolean;
  videoEnabled?: boolean;
  connectionState?: RTCPeerConnectionState;
  iceConnectionState?: RTCIceConnectionState;
  isSpeaking?: boolean;
  isPinned?: boolean;
  isHandRaised?: boolean;
  isHost?: boolean;
  onTogglePin?: () => void;
}

export const VideoTile: React.FC<VideoTileProps> = ({
  stream,
  name,
  isLocal = false,
  isMirrored,
  audioEnabled = true,
  videoEnabled = true,
  connectionState,
  iceConnectionState,
  isSpeaking = false,
  isPinned = false,
  isHandRaised = false,
  isHost = false,
  onTogglePin,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [hasActiveVideoTrack, setHasActiveVideoTrack] = useState<boolean>(true);

  // Attach MediaStream to HTML5 Video Element
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (stream) {
      if (videoEl.srcObject !== stream) {
        videoEl.srcObject = stream;
      }
      videoEl.play().catch(err => {
        console.warn('[VideoTile] Autoplay non-fatal notice:', err);
      });

      const checkTracks = () => {
        const vTracks = stream.getVideoTracks();
        const hasTrack = vTracks.length > 0 && vTracks.some(t => t.enabled && t.readyState === 'live');
        setHasActiveVideoTrack(hasTrack);
      };

      checkTracks();

      stream.onaddtrack = checkTracks;
      stream.onremovetrack = checkTracks;
    } else {
      videoEl.srcObject = null;
      setHasActiveVideoTrack(false);
    }
  }, [stream, videoEnabled]);

  // Initials generator
  const getInitials = (str: string) => {
    if (!str) return isLocal ? 'YOU' : 'U';
    const parts = str.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return str.slice(0, 2).toUpperCase();
  };

  const isConnecting = !isLocal && (connectionState === 'connecting' || iceConnectionState === 'checking');
  const isDisconnectedOrFailed = !isLocal && (connectionState === 'failed' || connectionState === 'disconnected' || iceConnectionState === 'failed');
  const showVideo = videoEnabled && (isLocal ? (Boolean(stream && stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0].enabled)) : (hasActiveVideoTrack && !isDisconnectedOrFailed));

  return (
    <div 
      className={`relative w-full h-full min-h-0 bg-[#1a251c] rounded-3xl overflow-hidden border transition-all duration-200 flex items-center justify-center group shadow-md ${
        isSpeaking 
          ? 'border-[#528d5a] ring-2 ring-[#528d5a]/60 shadow-[#528d5a]/20' 
          : 'border-[#2b3d2d] hover:border-[#3d573f]'
      }`}
    >
      {/* Real HTML5 Video Element - Always kept in DOM without display:none so audio doesn't get suspended on mobile */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
          (isMirrored !== undefined ? isMirrored : isLocal) ? 'transform -scale-x-100' : ''
        } ${showVideo ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      />

      {/* Avatar Fallback when Camera is Off */}
      {!showVideo && (
        <div className="flex flex-col items-center justify-center p-3 sm:p-6 text-center space-y-2 sm:space-y-3 z-10 animate-in fade-in duration-200">
          <div className="relative">
            <div className="w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-[#273829] border-2 border-[#3d573f] flex items-center justify-center text-white text-lg sm:text-xl md:text-2xl font-bold font-['Outfit'] shadow-inner">
              {getInitials(name)}
            </div>
            {!videoEnabled && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-7 sm:h-7 rounded-full bg-rose-500 text-white flex items-center justify-center border-2 border-[#1a251c] shadow-xs">
                <VideoOff className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </div>
            )}
          </div>
          <div className="space-y-0.5">
            <p className="text-xs sm:text-sm font-bold text-white font-['Outfit'] truncate max-w-[160px] sm:max-w-[200px]">
              {name} {isLocal && '(You)'}
            </p>
            <span className="text-[10px] sm:text-xs text-[#8ca18f]">
              {isDisconnectedOrFailed ? 'Reconnecting...' : !videoEnabled ? 'Camera off' : 'Connecting...'}
            </span>
          </div>
        </div>
      )}

      {/* Top Left Badges: Hand Raised / Connection Alerts */}
      <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5 items-start">
        {isHandRaised && (
          <div className="bg-amber-500 text-black font-extrabold px-3 py-1 rounded-full text-xs flex items-center gap-1.5 shadow-lg border border-amber-300 animate-bounce">
            <span className="text-sm">✋</span>
            <span>Hand Raised</span>
          </div>
        )}

        {isConnecting && (
          <div className="bg-black/75 backdrop-blur-md px-3 py-1 rounded-full text-xs text-amber-300 flex items-center gap-1.5 border border-amber-500/30">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Connecting...</span>
          </div>
        )}

        {isDisconnectedOrFailed && (
          <div className="bg-rose-950/80 backdrop-blur-md px-3 py-1 rounded-full text-xs text-rose-300 flex items-center gap-1.5 border border-rose-500/40 animate-pulse">
            <WifiOff className="w-3.5 h-3.5" />
            <span>Reconnecting peer...</span>
          </div>
        )}
      </div>

      {/* Top Right Pin & Zoom Controls */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        {onTogglePin && (
          <button
            type="button"
            onClick={onTogglePin}
            title={isPinned ? 'Unpin' : 'Pin to focus'}
            className={`w-8 h-8 rounded-xl flex items-center justify-center text-white transition-colors cursor-pointer ${
              isPinned ? 'bg-[#528d5a]' : 'bg-black/60 hover:bg-black/80'
            }`}
          >
            {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Bottom Overlay Label & Status */}
      <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
        <div className="bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-white flex items-center gap-2 border border-white/10 max-w-[85%] shadow-sm">
          <span className="truncate">{name} {isLocal && '(You)'}</span>
          {isHost && (
            <span className="px-1.5 py-0.5 rounded bg-[#528d5a]/40 text-[#a3d9ab] text-[10px] font-bold border border-[#528d5a]/50">
              Host
            </span>
          )}
          {!audioEnabled ? (
            <MicOff className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          ) : (
            <Mic className={`w-3.5 h-3.5 shrink-0 ${isSpeaking ? 'text-[#528d5a] animate-pulse' : 'text-[#8ca18f]'}`} />
          )}
        </div>
      </div>
    </div>
  );
};
