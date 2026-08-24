import React, { useState } from 'react';
import { VideoTile } from './VideoTile';
import { RemotePeer } from '../../hooks/useWebRTC';
import { Copy, Check, Users, Monitor } from 'lucide-react';
import { getMeetingUrl } from '../../utils/meetingUtils';

interface ParticipantGridProps {
  meetingId: string;
  meetingCode?: string;
  localStream: MediaStream | null;
  localName: string;
  isCameraOn: boolean;
  isMicOn: boolean;
  isHandRaised?: boolean;
  isHost?: boolean;
  isMirrored?: boolean;
  localAudioLevel: number;
  remotePeers: RemotePeer[];
  screenStream: MediaStream | null;
  isScreenSharing: boolean;
  onStopScreenShare?: () => void;
}

export const ParticipantGrid: React.FC<ParticipantGridProps> = ({
  meetingId,
  meetingCode,
  localStream,
  localName,
  isCameraOn,
  isMicOn,
  isHandRaised = false,
  isHost = false,
  isMirrored,
  localAudioLevel,
  remotePeers,
  screenStream,
  isScreenSharing,
  onStopScreenShare,
}) => {
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const totalParticipants = 1 + remotePeers.length;

  const copyInviteLink = () => {
    const url = getMeetingUrl(meetingId);
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const presentingRemotePeer = remotePeers.find(p => p.isScreenSharing);

  // 1. Local Screen Sharing Layout
  if (isScreenSharing && screenStream) {
    return (
      <div className="w-full h-full flex flex-col lg:flex-row gap-2 sm:gap-4 p-2 sm:p-4 lg:p-6 overflow-hidden">
        {/* Large Main Screen Presentation */}
        <div className="flex-1 h-full min-h-[220px] sm:min-h-[300px] bg-black rounded-2xl sm:rounded-3xl overflow-hidden border border-white/15 relative flex items-center justify-center shadow-lg">
          <video
            autoPlay
            playsInline
            muted
            id="local-presentation-video"
            ref={el => {
              if (el && screenStream) {
                if (el.srcObject !== screenStream) {
                  el.srcObject = screenStream;
                }
                el.play().catch(err => {
                  console.warn('[ScreenShare] Presentation local playback warning:', err);
                });
              }
            }}
            className="w-full h-full object-contain"
          />
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
            <div className="bg-black/80 backdrop-blur-md px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold text-white flex items-center gap-1.5 sm:gap-2 border border-white/10 shadow-sm pointer-events-auto">
              <Monitor className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#528d5a]" />
              <span className="truncate max-w-[150px] sm:max-w-none">You are presenting screen</span>
            </div>
            {onStopScreenShare && (
              <button
                type="button"
                onClick={onStopScreenShare}
                className="pointer-events-auto px-3 py-1 sm:px-4 sm:py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] sm:text-xs rounded-full shadow-lg transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>Stop</span>
              </button>
            )}
          </div>
        </div>

        {/* Thumbnail Filmstrip on the Right / Bottom on Mobile */}
        <div className="w-full lg:w-72 flex lg:flex-col gap-2 sm:gap-3 overflow-x-auto lg:overflow-y-auto shrink-0 max-h-full pb-1 lg:pb-0">
          {/* Local Tile */}
          <div className="w-36 sm:w-60 lg:w-full h-24 sm:h-36 shrink-0">
            <VideoTile
              stream={localStream}
              name={localName}
              isLocal={true}
              isMirrored={isMirrored}
              audioEnabled={isMicOn}
              videoEnabled={isCameraOn}
              isHandRaised={isHandRaised}
              isHost={isHost}
              isSpeaking={localAudioLevel > 15}
            />
          </div>

          {/* Remote Peers */}
          {remotePeers.map(peer => (
            <div key={peer.peerId} className="w-36 sm:w-60 lg:w-full h-24 sm:h-36 shrink-0">
              <VideoTile
                stream={peer.stream}
                name={peer.name}
                isLocal={false}
                audioEnabled={peer.audioEnabled}
                videoEnabled={peer.videoEnabled}
                isHandRaised={peer.isHandRaised}
                isHost={peer.isHost}
                connectionState={peer.connectionState}
                iceConnectionState={peer.iceConnectionState}
                isSpeaking={peer.isSpeaking}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 2. Remote Participant Screen Sharing Layout
  if (presentingRemotePeer) {
    return (
      <div className="w-full h-full flex flex-col lg:flex-row gap-2 sm:gap-4 p-2 sm:p-4 lg:p-6 overflow-hidden">
        {/* Large Main Remote Screen Presentation */}
        <div className="flex-1 h-full min-h-[220px] sm:min-h-[300px] bg-black rounded-2xl sm:rounded-3xl overflow-hidden border border-white/15 relative flex items-center justify-center shadow-lg">
          <video
            autoPlay
            playsInline
            id="remote-presentation-video"
            ref={el => {
              if (el && presentingRemotePeer.stream) {
                if (el.srcObject !== presentingRemotePeer.stream) {
                  el.srcObject = presentingRemotePeer.stream;
                }
                el.play().catch(err => {
                  console.warn('[ScreenShare] Remote presentation playback warning:', err);
                });
              }
            }}
            className="w-full h-full object-contain"
          />
          <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold text-white flex items-center gap-1.5 sm:gap-2 border border-white/10 shadow-sm">
            <Monitor className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#528d5a]" />
            <span className="truncate max-w-[180px] sm:max-w-none">{presentingRemotePeer.name} is presenting</span>
          </div>
        </div>

        {/* Thumbnail Filmstrip on the Right / Bottom on Mobile */}
        <div className="w-full lg:w-72 flex lg:flex-col gap-2 sm:gap-3 overflow-x-auto lg:overflow-y-auto shrink-0 max-h-full pb-1 lg:pb-0">
          {/* Local User Tile */}
          <div className="w-36 sm:w-60 lg:w-full h-24 sm:h-36 shrink-0">
            <VideoTile
              stream={localStream}
              name={localName}
              isLocal={true}
              isMirrored={isMirrored}
              audioEnabled={isMicOn}
              videoEnabled={isCameraOn}
              isHandRaised={isHandRaised}
              isHost={isHost}
              isSpeaking={localAudioLevel > 15}
            />
          </div>

          {/* Other Remote Peers */}
          {remotePeers
            .filter(p => p.peerId !== presentingRemotePeer.peerId)
            .map(peer => (
              <div key={peer.peerId} className="w-36 sm:w-60 lg:w-full h-24 sm:h-36 shrink-0">
                <VideoTile
                  stream={peer.stream}
                  name={peer.name}
                  isLocal={false}
                  audioEnabled={peer.audioEnabled}
                  videoEnabled={peer.videoEnabled}
                  isHandRaised={peer.isHandRaised}
                  isHost={peer.isHost}
                  connectionState={peer.connectionState}
                  iceConnectionState={peer.iceConnectionState}
                  isSpeaking={peer.isSpeaking}
                />
              </div>
            ))}
        </div>
      </div>
    );
  }

  // 2. Pinned Participant Spotlight Layout
  if (pinnedId) {
    const isLocalPinned = pinnedId === 'local';
    const pinnedRemotePeer = remotePeers.find(p => p.peerId === pinnedId);

    return (
      <div className="w-full h-full flex flex-col lg:flex-row gap-2 sm:gap-4 p-2 sm:p-4 lg:p-6 overflow-hidden">
        <div className="flex-1 h-full min-h-[220px] sm:min-h-[300px]">
          {isLocalPinned ? (
            <VideoTile
              stream={localStream}
              name={localName}
              isLocal={true}
              isMirrored={isMirrored}
              audioEnabled={isMicOn}
              videoEnabled={isCameraOn}
              isHandRaised={isHandRaised}
              isHost={isHost}
              isSpeaking={localAudioLevel > 15}
              isPinned={true}
              onTogglePin={() => setPinnedId(null)}
            />
          ) : pinnedRemotePeer ? (
            <VideoTile
              stream={pinnedRemotePeer.stream}
              name={pinnedRemotePeer.name}
              isLocal={false}
              audioEnabled={pinnedRemotePeer.audioEnabled}
              videoEnabled={pinnedRemotePeer.videoEnabled}
              isHandRaised={pinnedRemotePeer.isHandRaised}
              isHost={pinnedRemotePeer.isHost}
              connectionState={pinnedRemotePeer.connectionState}
              iceConnectionState={pinnedRemotePeer.iceConnectionState}
              isSpeaking={pinnedRemotePeer.isSpeaking}
              isPinned={true}
              onTogglePin={() => setPinnedId(null)}
            />
          ) : null}
        </div>

        {/* Side Gallery */}
        <div className="w-full lg:w-72 flex lg:flex-col gap-2 sm:gap-3 overflow-x-auto lg:overflow-y-auto shrink-0 max-h-full pb-1 lg:pb-0">
          {!isLocalPinned && (
            <div className="w-36 sm:w-60 lg:w-full h-24 sm:h-36 shrink-0">
              <VideoTile
                stream={localStream}
                name={localName}
                isLocal={true}
                isMirrored={isMirrored}
                audioEnabled={isMicOn}
                videoEnabled={isCameraOn}
                isHandRaised={isHandRaised}
                isHost={isHost}
                isSpeaking={localAudioLevel > 15}
                onTogglePin={() => setPinnedId('local')}
              />
            </div>
          )}

          {remotePeers
            .filter(p => p.peerId !== pinnedId)
            .map(peer => (
              <div key={peer.peerId} className="w-36 sm:w-60 lg:w-full h-24 sm:h-36 shrink-0">
                <VideoTile
                  stream={peer.stream}
                  name={peer.name}
                  isLocal={false}
                  audioEnabled={peer.audioEnabled}
                  videoEnabled={peer.videoEnabled}
                  isHandRaised={peer.isHandRaised}
                  isHost={peer.isHost}
                  connectionState={peer.connectionState}
                  iceConnectionState={peer.iceConnectionState}
                  isSpeaking={peer.isSpeaking}
                  onTogglePin={() => setPinnedId(peer.peerId)}
                />
              </div>
            ))}
        </div>
      </div>
    );
  }

  // 3. Single User (Alone in Room)
  if (totalParticipants === 1) {
    return (
      <div className="w-full h-full p-3 sm:p-6 flex flex-col items-center justify-center max-w-5xl mx-auto gap-3 sm:gap-4 overflow-y-auto">
        {/* Local Video Stream Tile */}
        <div className="w-full max-w-3xl aspect-video max-h-[55vh] sm:max-h-[60vh] rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl">
          <VideoTile
            stream={localStream}
            name={localName}
            isLocal={true}
            isMirrored={isMirrored}
            audioEnabled={isMicOn}
            videoEnabled={isCameraOn}
            isHandRaised={isHandRaised}
            isHost={isHost}
            isSpeaking={localAudioLevel > 15}
            onTogglePin={() => setPinnedId('local')}
          />
        </div>

        {/* Invite Bar */}
        <div className="bg-[#162017] border border-white/10 px-4 sm:px-5 py-3 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 max-w-xl w-full shadow-md text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#528d5a]/20 text-[#a3d9ab] flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">You are the only person here</p>
              <p className="text-[11px] text-[#8ca18f]">Share this room link to invite participants</p>
            </div>
          </div>
          <button
            type="button"
            onClick={copyInviteLink}
            className="w-full sm:w-auto px-3.5 py-1.5 bg-[#528d5a] hover:bg-[#43754a] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Invite Link'}</span>
          </button>
        </div>
      </div>
    );
  }

  // 4. Two Participants (1-on-1 Call: Side-by-Side on desktop, Stacked on mobile)
  if (totalParticipants === 2) {
    const peer = remotePeers[0];
    return (
      <div className="w-full h-full p-2 sm:p-4 lg:p-6 flex items-center justify-center max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4 w-full h-full max-h-[85vh]">
          {/* Local User */}
          <VideoTile
            stream={localStream}
            name={localName}
            isLocal={true}
            isMirrored={isMirrored}
            audioEnabled={isMicOn}
            videoEnabled={isCameraOn}
            isHandRaised={isHandRaised}
            isHost={isHost}
            isSpeaking={localAudioLevel > 15}
            onTogglePin={() => setPinnedId('local')}
          />

          {/* Remote User */}
          {peer && (
            <VideoTile
              stream={peer.stream}
              name={peer.name}
              isLocal={false}
              audioEnabled={peer.audioEnabled}
              videoEnabled={peer.videoEnabled}
              isHandRaised={peer.isHandRaised}
              isHost={peer.isHost}
              connectionState={peer.connectionState}
              iceConnectionState={peer.iceConnectionState}
              isSpeaking={peer.isSpeaking}
              onTogglePin={() => setPinnedId(peer.peerId)}
            />
          )}
        </div>
      </div>
    );
  }

  // 5. Multi-User Grid (3, 4, 5, 6+ participants)
  const gridClass =
    totalParticipants <= 4
      ? 'grid-cols-2 max-h-[85vh]'
      : totalParticipants <= 6
      ? 'grid-cols-2 sm:grid-cols-3 max-h-[88vh]'
      : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 max-h-[90vh]';

  return (
    <div className="w-full h-full p-2 sm:p-4 lg:p-6 flex items-center justify-center max-w-7xl mx-auto overflow-y-auto">
      <div className={`grid ${gridClass} gap-2 sm:gap-4 w-full h-full items-center`}>
        {/* Local Stream */}
        <VideoTile
          stream={localStream}
          name={localName}
          isLocal={true}
          isMirrored={isMirrored}
          audioEnabled={isMicOn}
          videoEnabled={isCameraOn}
          isHandRaised={isHandRaised}
          isHost={isHost}
          isSpeaking={localAudioLevel > 15}
          onTogglePin={() => setPinnedId('local')}
        />

        {/* Remote Peers */}
        {remotePeers.map(peer => (
          <VideoTile
            key={peer.peerId}
            stream={peer.stream}
            name={peer.name}
            isLocal={false}
            audioEnabled={peer.audioEnabled}
            videoEnabled={peer.videoEnabled}
            isHandRaised={peer.isHandRaised}
            isHost={peer.isHost}
            connectionState={peer.connectionState}
            iceConnectionState={peer.iceConnectionState}
            isSpeaking={peer.isSpeaking}
            onTogglePin={() => setPinnedId(peer.peerId)}
          />
        ))}
      </div>
    </div>
  );
};
