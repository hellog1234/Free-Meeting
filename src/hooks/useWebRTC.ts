import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  addDoc, 
  onSnapshot, 
  query, 
  where, 
  serverTimestamp, 
  updateDoc, 
  increment 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { RTC_CONFIGURATION } from '../utils/webrtcConfig';

export interface RemotePeer {
  peerId: string;
  name: string;
  stream: MediaStream;
  audioEnabled: boolean;
  videoEnabled: boolean;
  isScreenSharing?: boolean;
  isHandRaised?: boolean;
  isHost?: boolean;
  connectionState: RTCPeerConnectionState;
  iceConnectionState: RTCIceConnectionState;
  isSpeaking: boolean;
}

interface UseWebRTCProps {
  meetingId: string;
  myPeerId: string;
  displayName: string;
  isHost?: boolean;
  initialAudio?: boolean;
  initialVideo?: boolean;
  initialFacingMode?: 'user' | 'environment';
  selectedVideoDeviceId?: string;
  selectedAudioDeviceId?: string;
}

export function useWebRTC({
  meetingId,
  myPeerId,
  displayName,
  isHost = false,
  initialAudio = true,
  initialVideo = true,
  initialFacingMode = 'user',
  selectedVideoDeviceId,
  selectedAudioDeviceId,
}: UseWebRTCProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isCameraOn, setIsCameraOn] = useState<boolean>(initialVideo);
  const [isMicOn, setIsMicOn] = useState<boolean>(initialAudio);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>(initialFacingMode);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [isHandRaised, setIsHandRaised] = useState<boolean>(false);
  const [wasRemovedByHost, setWasRemovedByHost] = useState<boolean>(false);
  const [forceMutedNotice, setForceMutedNotice] = useState<boolean>(false);
  const [localAudioLevel, setLocalAudioLevel] = useState<number>(0);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [audioAutoplayBlocked, setAudioAutoplayBlocked] = useState<boolean>(false);

  // Map of remote peers: peerId -> RemotePeer
  const [remotePeers, setRemotePeers] = useState<Record<string, RemotePeer>>({});

  // Internal WebRTC and Audio references
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteMediaStreams = useRef<Map<string, MediaStream>>(new Map());
  const pendingIceCandidates = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const localAudioContextRef = useRef<AudioContext | null>(null);
  const localAnalyserRef = useRef<AnalyserNode | null>(null);
  const audioAnimationRef = useRef<number | null>(null);
  const isCleaningUp = useRef<boolean>(false);

  // Active Realtime Listener References
  const unsubLocalRef = useRef<(() => void) | null>(null);
  const unsubParticipantsRef = useRef<(() => void) | null>(null);
  const unsubSignalsRef = useRef<(() => void) | null>(null);
  const heartbeatIntervalRef = useRef<any>(null);

  // Helper to update remote peer state safely
  const updateRemotePeer = useCallback((peerId: string, updates: Partial<RemotePeer>) => {
    setRemotePeers(prev => {
      const existing = prev[peerId];
      if (!existing) return prev;
      return {
        ...prev,
        [peerId]: {
          ...existing,
          ...updates,
        },
      };
    });
  }, []);

  // Helper to send WebRTC signal to Firestore
  const sendSignal = useCallback(async (
    receiverId: string, 
    type: 'offer' | 'answer' | 'candidate', 
    payload: any
  ) => {
    if (!meetingId || !myPeerId || isCleaningUp.current) return;
    try {
      const signalsColRef = collection(db, 'meetings', meetingId, 'signals');
      await addDoc(signalsColRef, {
        sender: myPeerId,
        senderName: displayName,
        receiver: receiverId,
        type,
        payload,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn(`[WebRTC] Failed to send ${type} signal to ${receiverId}:`, err);
    }
  }, [meetingId, myPeerId, displayName]);

  // Create and configure RTCPeerConnection for a remote peer
  const createPeerConnection = useCallback((remotePeerId: string, remotePeerName: string, forceRecreate = false) => {
    const existingPc = peerConnections.current.get(remotePeerId);
    if (existingPc && !forceRecreate && existingPc.connectionState !== 'closed' && existingPc.connectionState !== 'failed') {
      return existingPc;
    }

    if (existingPc) {
      console.log(`[WEBRTC] Closing stale RTCPeerConnection for peer: ${remotePeerId}`);
      try { existingPc.close(); } catch (e) {}
      peerConnections.current.delete(remotePeerId);
      pendingIceCandidates.current.delete(remotePeerId);
    }

    console.log(`[WEBRTC] Creating fresh RTCPeerConnection for peer: ${remotePeerId}`);
    const pc = new RTCPeerConnection(RTC_CONFIGURATION);
    peerConnections.current.set(remotePeerId, pc);

    // Initialize or get remote MediaStream
    let remoteStream = remoteMediaStreams.current.get(remotePeerId);
    if (!remoteStream) {
      remoteStream = new MediaStream();
      remoteMediaStreams.current.set(remotePeerId, remoteStream);
    }

    // Set initial remote peer state
    setRemotePeers(prev => ({
      ...prev,
      [remotePeerId]: {
        peerId: remotePeerId,
        name: remotePeerName || 'Participant',
        stream: remoteStream!,
        audioEnabled: true,
        videoEnabled: true,
        connectionState: 'connecting',
        iceConnectionState: 'new',
        isSpeaking: false,
      },
    }));

    // Ensure audio & video transceivers exist with sendrecv direction to guarantee bidirectional SDP negotiation
    let audioTransceiver = pc.getTransceivers().find(t => t.receiver.track.kind === 'audio');
    if (!audioTransceiver) {
      try {
        audioTransceiver = pc.addTransceiver('audio', { direction: 'sendrecv' });
      } catch (e) {
        console.warn('[WEBRTC] addTransceiver audio warning:', e);
      }
    }

    let videoTransceiver = pc.getTransceivers().find(t => t.receiver.track.kind === 'video');
    if (!videoTransceiver) {
      try {
        videoTransceiver = pc.addTransceiver('video', { direction: 'sendrecv' });
      } catch (e) {
        console.warn('[WEBRTC] addTransceiver video warning:', e);
      }
    }

    // 1. Attach Local Audio Track (Microphone)
    if (localStreamRef.current && localStreamRef.current.getAudioTracks().length > 0) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        console.log(`[WEBRTC] adding/replacing audio track to peer connection for ${remotePeerId}:`, audioTrack.id, audioTrack.readyState);
        if (audioTransceiver && audioTransceiver.sender) {
          audioTransceiver.sender.replaceTrack(audioTrack).catch(err => {
            console.warn('[WEBRTC] replaceTrack audio warning:', err);
          });
        } else {
          try {
            pc.addTrack(audioTrack, localStreamRef.current);
          } catch (e) {
            console.warn('[WEBRTC] addTrack audio warning:', e);
          }
        }
      }
    }

    // 2. Attach Local Video Track (Screen share track if active, otherwise camera track)
    if (screenStreamRef.current && screenStreamRef.current.getVideoTracks().length > 0) {
      const screenTrack = screenStreamRef.current.getVideoTracks()[0];
      console.log(`[WEBRTC] adding/replacing screen video track to peer connection for ${remotePeerId}`);
      if (videoTransceiver && videoTransceiver.sender) {
        videoTransceiver.sender.replaceTrack(screenTrack).catch(() => {});
      } else {
        try {
          pc.addTrack(screenTrack, screenStreamRef.current);
        } catch (e) {}
      }
    } else if (localStreamRef.current && localStreamRef.current.getVideoTracks().length > 0) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      console.log(`[WEBRTC] adding/replacing camera video track to peer connection for ${remotePeerId}`);
      if (videoTransceiver && videoTransceiver.sender) {
        videoTransceiver.sender.replaceTrack(videoTrack).catch(() => {});
      } else {
        try {
          pc.addTrack(videoTrack, localStreamRef.current);
        } catch (e) {}
      }
    }

    // 3. Handle incoming remote media tracks
    pc.ontrack = (event) => {
      console.log(`[WEBRTC] ontrack received: kind=${event.track.kind} id=${event.track.id} from=${remotePeerId}`);
      const stream = remoteMediaStreams.current.get(remotePeerId) || new MediaStream();
      
      // Add track if not already present
      if (!stream.getTracks().some(t => t.id === event.track.id)) {
        stream.addTrack(event.track);
      }
      remoteMediaStreams.current.set(remotePeerId, stream);

      // Listen to track mute/unmute events
      event.track.onmute = () => {
        console.log(`[WEBRTC] remote track muted: ${event.track.kind} from ${remotePeerId}`);
        if (event.track.kind === 'video') updateRemotePeer(remotePeerId, { videoEnabled: false });
        if (event.track.kind === 'audio') updateRemotePeer(remotePeerId, { audioEnabled: false });
      };
      event.track.onunmute = () => {
        console.log(`[WEBRTC] remote track unmuted: ${event.track.kind} from ${remotePeerId}`);
        if (event.track.kind === 'video') updateRemotePeer(remotePeerId, { videoEnabled: true });
        if (event.track.kind === 'audio') updateRemotePeer(remotePeerId, { audioEnabled: true });
      };

      updateRemotePeer(remotePeerId, { stream });
    };

    // 4. Handle local ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal(remotePeerId, 'candidate', event.candidate.toJSON());
      }
    };

    // 5. Handle ICE Connection State Changes & Automatic Reconnection
    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      console.log(`[WEBRTC] ICE Connection state for ${remotePeerId}: ${state}`);
      updateRemotePeer(remotePeerId, { iceConnectionState: state });

      if (state === 'failed' || state === 'disconnected') {
        console.warn(`[WEBRTC] ICE state degraded (${state}) with ${remotePeerId}. Attempting ICE restart...`);
        if (myPeerId < remotePeerId) {
          pc.createOffer({ iceRestart: true })
            .then(offer => pc.setLocalDescription(offer))
            .then(() => {
              if (pc.localDescription) {
                sendSignal(remotePeerId, 'offer', { sdp: pc.localDescription.sdp });
              }
            })
            .catch(err => console.warn('[WEBRTC] ICE restart failed:', err));
        }
      }
    };

    // 6. Handle Peer Connection State Changes
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log(`[WEBRTC] Connection state for ${remotePeerId}: ${state}`);
      updateRemotePeer(remotePeerId, { connectionState: state });

      if (state === 'failed') {
        console.warn(`[WEBRTC] Peer connection failed with ${remotePeerId}.`);
      }
    };

    return pc;
  }, [myPeerId, sendSignal, updateRemotePeer]);

  // Flush queued ICE candidates after remote description is set
  const flushPendingCandidates = useCallback(async (peerId: string, pc: RTCPeerConnection) => {
    const queue = pendingIceCandidates.current.get(peerId);
    if (queue && queue.length > 0) {
      console.log(`[WEBRTC] Flushing ${queue.length} buffered ICE candidates for ${peerId}`);
      for (const candidate of queue) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn('[WEBRTC] Error adding buffered candidate:', err);
        }
      }
      pendingIceCandidates.current.delete(peerId);
    }
  }, []);

  // 1. Initialize Real Media Stream (Camera & Mic)
  useEffect(() => {
    let active = true;

    const startLocalMedia = async () => {
      if (!initialVideo && !initialAudio) {
        console.log('[MOBILE MEDIA] Joined with camera and mic disabled');
        setIsCameraOn(false);
        setIsMicOn(false);
        setLocalStream(null);
        return;
      }

      try {
        setMediaError(null);
        console.log(`[MOBILE MEDIA] Requesting getUserMedia (audio: ${initialAudio}, video: ${initialVideo})`);

        let stream: MediaStream | null = null;

        // Primary Attempt: Request single MediaStream containing requested audio and video tracks
        const primaryConstraints: MediaStreamConstraints = {
          video: initialVideo ? (
            selectedVideoDeviceId 
              ? { deviceId: { exact: selectedVideoDeviceId } } 
              : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: { ideal: cameraFacingMode } }
          ) : false,
          audio: initialAudio ? (
            selectedAudioDeviceId 
              ? { deviceId: { exact: selectedAudioDeviceId } } 
              : { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
          ) : false,
        };

        try {
          stream = await navigator.mediaDevices.getUserMedia(primaryConstraints);
        } catch (primaryErr) {
          console.warn('[MOBILE MEDIA] Primary constraints failed, attempting relaxed standard constraints:', primaryErr);
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: initialVideo ? { facingMode: { ideal: cameraFacingMode } } : false,
              audio: initialAudio ? true : false,
            });
          } catch (basicErr: any) {
            console.warn('[MOBILE MEDIA] Combined media failed, attempting separate track fallbacks:', basicErr);
            if (initialVideo && initialAudio) {
              try {
                // Try audio first
                stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
                setIsCameraOn(false);
              } catch (audioErr) {
                try {
                  // Try video only
                  stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                  setIsMicOn(false);
                } catch (videoErr) {
                  throw basicErr;
                }
              }
            } else {
              throw basicErr;
            }
          }
        }

        if (!active || !stream) {
          if (stream) stream.getTracks().forEach(t => t.stop());
          return;
        }

        const audioTracks = stream.getAudioTracks();
        const videoTracks = stream.getVideoTracks();

        console.log(`[MOBILE MEDIA] stream acquired: audio=${audioTracks.length} video=${videoTracks.length}`);

        if (audioTracks.length > 0) {
          const audioTrack = audioTracks[0];
          audioTrack.enabled = initialAudio;
          console.log(`[MIC] track live: ${audioTrack.readyState === 'live'} enabled: ${audioTrack.enabled} id: ${audioTrack.id}`);
        }

        if (videoTracks.length > 0) {
          videoTracks[0].enabled = initialVideo;
        }

        localStreamRef.current = stream;
        setLocalStream(stream);
        setIsCameraOn(initialVideo && videoTracks.length > 0);
        setIsMicOn(initialAudio && audioTracks.length > 0);

        // Sync tracks to all active RTCPeerConnections
        const currentAudio = audioTracks[0];
        const currentVideo = videoTracks[0];

        for (const [pId, pc] of peerConnections.current) {
          try {
            let audioTransceiver = pc.getTransceivers().find(t => t.receiver.track.kind === 'audio');
            if (currentAudio) {
              if (audioTransceiver && audioTransceiver.sender) {
                audioTransceiver.direction = 'sendrecv';
                audioTransceiver.sender.replaceTrack(currentAudio).catch(err => {
                  console.warn(`[WEBRTC] replaceTrack audio error for ${pId}:`, err);
                });
              } else {
                pc.addTrack(currentAudio, stream);
              }
            }

            let videoTransceiver = pc.getTransceivers().find(t => t.receiver.track.kind === 'video');
            if (currentVideo && !screenStreamRef.current) {
              if (videoTransceiver && videoTransceiver.sender) {
                videoTransceiver.direction = 'sendrecv';
                videoTransceiver.sender.replaceTrack(currentVideo).catch(err => {
                  console.warn(`[WEBRTC] replaceTrack video error for ${pId}:`, err);
                });
              } else {
                pc.addTrack(currentVideo, stream);
              }
            }
          } catch (pcErr) {
            console.warn(`[WEBRTC] Error syncing local media tracks to peer connection ${pId}:`, pcErr);
          }
        }

        // Local Microphone Audio Analyser for volume level feedback
        if (audioTracks.length > 0) {
          try {
            const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtxClass) {
              const audioCtx = new AudioCtxClass();
              const analyser = audioCtx.createAnalyser();
              analyser.fftSize = 256;
              const source = audioCtx.createMediaStreamSource(stream);
              source.connect(analyser);

              localAudioContextRef.current = audioCtx;
              localAnalyserRef.current = analyser;

              const dataArr = new Uint8Array(analyser.frequencyBinCount);
              const measureAudio = () => {
                if (!localAnalyserRef.current) return;
                localAnalyserRef.current.getByteFrequencyData(dataArr);
                let sum = 0;
                for (let i = 0; i < dataArr.length; i++) sum += dataArr[i];
                const avg = sum / dataArr.length;
                setLocalAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
                audioAnimationRef.current = requestAnimationFrame(measureAudio);
              };
              measureAudio();
            }
          } catch (e) {
            console.warn('[MIC] Local audio analyser setup warning:', e);
          }
        }
      } catch (err: any) {
        console.warn('[MOBILE MEDIA] Media acquisition error:', err);
        if (active) {
          const isDenied = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
          if (isDenied) {
            setMediaError('Microphone or camera permission was denied in your browser settings.');
          } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            setMediaError('No microphone or camera hardware found on this device.');
          } else {
            setMediaError('Unable to access media devices. Please check browser permissions.');
          }
          setIsCameraOn(false);
          setIsMicOn(false);
        }
      }
    };

    startLocalMedia();

    return () => {
      active = false;
      if (audioAnimationRef.current) {
        cancelAnimationFrame(audioAnimationRef.current);
      }
      if (localAudioContextRef.current && localAudioContextRef.current.state !== 'closed') {
        localAudioContextRef.current.close().catch(() => {});
      }
    };
  }, [initialAudio, initialVideo, selectedVideoDeviceId, selectedAudioDeviceId, cameraFacingMode]);

  // 2. Register / Reconnect local participant in Firestore
  useEffect(() => {
    if (!meetingId || !myPeerId) return;

    const participantRef = doc(db, 'meetings', meetingId, 'participants', myPeerId);
    setDoc(participantRef, {
      id: myPeerId,
      name: displayName || 'Participant',
      isHost: Boolean(isHost),
      status: 'joined',
      leftAt: null,
      audioEnabled: isMicOn,
      videoEnabled: isCameraOn,
      isScreenSharing: false,
      isHandRaised: false,
      isRemoved: false,
      joinedAt: serverTimestamp(),
      lastSeen: serverTimestamp(),
    }, { merge: true }).catch(err => {
      console.warn('[WebRTC] Failed to register participant in Firestore:', err);
    });

    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    heartbeatIntervalRef.current = setInterval(() => {
      if (!isCleaningUp.current) {
        updateDoc(participantRef, { lastSeen: serverTimestamp() }).catch(() => {});
      }
    }, 15000);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [meetingId, myPeerId, displayName, isHost, isMicOn, isCameraOn]);

  // 2b. Listen to local participant doc changes (for host moderation events)
  useEffect(() => {
    if (!meetingId || !myPeerId) return;

    const participantRef = doc(db, 'meetings', meetingId, 'participants', myPeerId);
    const unsubLocal = onSnapshot(participantRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();

      // Check if removed by host
      if (data.isRemoved) {
        console.warn('[WebRTC] Local user was removed by the host.');
        setWasRemovedByHost(true);
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(t => t.stop());
        }
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach(t => t.stop());
        }
        peerConnections.current.forEach(pc => {
          try { pc.close(); } catch (e) {}
        });
        peerConnections.current.clear();
        return;
      }

      // Check if host muted local user
      if (data.audioEnabled === false && isMicOn) {
        console.log('[MIC] Local user was muted remotely by host.');
        const stream = localStreamRef.current;
        if (stream) {
          stream.getAudioTracks().forEach(t => {
            t.enabled = false;
          });
        }
        setIsMicOn(false);
        setForceMutedNotice(true);
        setTimeout(() => setForceMutedNotice(false), 4000);
      }

      // Sync hand raised state
      if (typeof data.isHandRaised === 'boolean') {
        setIsHandRaised(data.isHandRaised);
      }
    });

    unsubLocalRef.current = unsubLocal;

    return () => {
      unsubLocal();
      unsubLocalRef.current = null;
    };
  }, [meetingId, myPeerId, isMicOn]);

  // 3. Listen to all participants to initiate WebRTC offers (Deterministic Initiator)
  useEffect(() => {
    if (!meetingId || !myPeerId) return;

    const participantsColRef = collection(db, 'meetings', meetingId, 'participants');
    const unsubParticipants = onSnapshot(participantsColRef, async (snapshot) => {
      const activeIds = new Set<string>();

      for (const docSnap of snapshot.docs) {
        const p = docSnap.data();
        const remotePeerId = p.id;
        if (!remotePeerId || remotePeerId === myPeerId) continue;
        if (p.isRemoved || p.status === 'left') continue;

        activeIds.add(remotePeerId);

        updateRemotePeer(remotePeerId, {
          name: p.name || 'Participant',
          audioEnabled: Boolean(p.audioEnabled),
          videoEnabled: Boolean(p.videoEnabled),
          isScreenSharing: Boolean(p.isScreenSharing),
          isHandRaised: Boolean(p.isHandRaised),
          isHost: Boolean(p.isHost),
        });

        // Deterministic Initiator: Peer with smaller ID initiates offer
        if (myPeerId < remotePeerId && !peerConnections.current.has(remotePeerId)) {
          console.log(`[WEBRTC] Initiating offer to remote peer: ${remotePeerId}`);
          const pc = createPeerConnection(remotePeerId, p.name);

          try {
            const offer = await pc.createOffer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: true,
            });
            await pc.setLocalDescription(offer);
            await sendSignal(remotePeerId, 'offer', { sdp: offer.sdp });
          } catch (err) {
            console.error(`[WEBRTC] Failed to create or send offer to ${remotePeerId}:`, err);
          }
        }
      }

      // Cleanup disconnected peers
      peerConnections.current.forEach((pc, pId) => {
        if (!activeIds.has(pId)) {
          console.log(`[WEBRTC] Peer left room: ${pId}. Cleaning up connection.`);
          pc.close();
          peerConnections.current.delete(pId);
          remoteMediaStreams.current.delete(pId);
          pendingIceCandidates.current.delete(pId);
          setRemotePeers(prev => {
            const next = { ...prev };
            delete next[pId];
            return next;
          });
        }
      });
    });

    unsubParticipantsRef.current = unsubParticipants;

    return () => {
      unsubParticipants();
      unsubParticipantsRef.current = null;
    };
  }, [meetingId, myPeerId, createPeerConnection, sendSignal, updateRemotePeer]);

  // 4. Listen to incoming WebRTC signals
  useEffect(() => {
    if (!meetingId || !myPeerId) return;

    const signalsColRef = collection(db, 'meetings', meetingId, 'signals');
    const signalsQuery = query(signalsColRef, where('receiver', '==', myPeerId));

    const unsubSignals = onSnapshot(signalsQuery, async (snapshot) => {
      for (const docChange of snapshot.docChanges()) {
        if (docChange.type !== 'added') continue;

        const signalDoc = docChange.doc;
        const signalData = signalDoc.data();
        const senderId = signalData.sender;
        const type = signalData.type;
        const payload = signalData.payload;

        deleteDoc(signalDoc.ref).catch(() => {});

        if (!senderId || senderId === myPeerId) continue;

        try {
          if (type === 'offer') {
            console.log(`[WEBRTC] Received offer from ${senderId}`);
            let pc = peerConnections.current.get(senderId);
            if (!pc || pc.signalingState !== 'stable' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
              pc = createPeerConnection(senderId, signalData.senderName || 'Participant', true);
            }

            const offerDesc = new RTCSessionDescription({ type: 'offer', sdp: payload.sdp });
            await pc.setRemoteDescription(offerDesc);
            await flushPendingCandidates(senderId, pc);

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            await sendSignal(senderId, 'answer', { sdp: answer.sdp });
          } else if (type === 'answer') {
            console.log(`[WEBRTC] Received answer from ${senderId}`);
            const pc = peerConnections.current.get(senderId);
            if (pc && pc.signalingState !== 'stable') {
              const answerDesc = new RTCSessionDescription({ type: 'answer', sdp: payload.sdp });
              await pc.setRemoteDescription(answerDesc);
              await flushPendingCandidates(senderId, pc);
            }
          } else if (type === 'candidate') {
            const pc = peerConnections.current.get(senderId);
            if (payload) {
              if (pc && pc.remoteDescription && pc.remoteDescription.type) {
                await pc.addIceCandidate(new RTCIceCandidate(payload));
              } else {
                const list = pendingIceCandidates.current.get(senderId) || [];
                list.push(payload);
                pendingIceCandidates.current.set(senderId, list);
              }
            }
          }
        } catch (signalErr) {
          console.warn(`[WEBRTC] Error handling signal (${type}) from ${senderId}:`, signalErr);
        }
      }
    });

    unsubSignalsRef.current = unsubSignals;

    return () => {
      unsubSignals();
      unsubSignalsRef.current = null;
    };
  }, [meetingId, myPeerId, createPeerConnection, flushPendingCandidates, sendSignal]);

  // Toggle Camera
  const toggleCamera = useCallback(async () => {
    const stream = localStreamRef.current;
    if (stream && stream.getVideoTracks().length > 0) {
      const nextState = !isCameraOn;
      stream.getVideoTracks().forEach(track => {
        track.enabled = nextState;
      });
      setIsCameraOn(nextState);
      if (nextState) setMediaError(null);

      const participantRef = doc(db, 'meetings', meetingId, 'participants', myPeerId);
      updateDoc(participantRef, { videoEnabled: nextState }).catch(() => {});
    } else if (!isCameraOn) {
      try {
        setMediaError(null);
        let newStream: MediaStream;
        try {
          newStream = await navigator.mediaDevices.getUserMedia({
            video: selectedVideoDeviceId ? { deviceId: { exact: selectedVideoDeviceId } } : { facingMode: { ideal: cameraFacingMode } },
          });
        } catch (devErr) {
          console.warn('[WebRTC] Camera device failed, trying default camera:', devErr);
          newStream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
        const newVideoTrack = newStream.getVideoTracks()[0];

        if (stream) {
          stream.addTrack(newVideoTrack);
        } else {
          localStreamRef.current = newStream;
          setLocalStream(newStream);
        }

        for (const [, pc] of peerConnections.current) {
          try {
            const videoTransceiver = pc.getTransceivers().find(t => t.receiver.track.kind === 'video');
            if (videoTransceiver && videoTransceiver.sender) {
              videoTransceiver.sender.replaceTrack(newVideoTrack).catch(() => {});
            } else {
              pc.addTrack(newVideoTrack, stream || newStream);
            }
          } catch (e) {}
        }

        setIsCameraOn(true);
        setMediaError(null);
        const participantRef = doc(db, 'meetings', meetingId, 'participants', myPeerId);
        updateDoc(participantRef, { videoEnabled: true }).catch(() => {});
      } catch (err: any) {
        console.warn('[WebRTC] Camera start error:', err);
        setMediaError('Unable to start camera.');
        setIsCameraOn(false);
      }
    }
  }, [isCameraOn, meetingId, myPeerId, selectedVideoDeviceId, cameraFacingMode]);

  // Flip Camera (Front <-> Back)
  const flipCamera = useCallback(async (targetMode?: 'user' | 'environment') => {
    const nextMode = targetMode || (cameraFacingMode === 'user' ? 'environment' : 'user');
    setCameraFacingMode(nextMode);

    if (!isCameraOn) return;

    try {
      setMediaError(null);
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: nextMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      const newVideoTrack = newStream.getVideoTracks()[0];
      if (!newVideoTrack) return;

      const currentLocal = localStreamRef.current;
      if (currentLocal) {
        currentLocal.getVideoTracks().forEach(t => {
          try { t.stop(); currentLocal.removeTrack(t); } catch (e) {}
        });
        currentLocal.addTrack(newVideoTrack);
        setLocalStream(new MediaStream(currentLocal.getTracks()));
      } else {
        localStreamRef.current = newStream;
        setLocalStream(newStream);
      }

      peerConnections.current.forEach(pc => {
        try {
          const videoTransceiver = pc.getTransceivers().find(t => t.receiver.track.kind === 'video');
          if (videoTransceiver && videoTransceiver.sender) {
            videoTransceiver.sender.replaceTrack(newVideoTrack).catch(() => {});
          } else {
            pc.addTrack(newVideoTrack, localStreamRef.current!);
          }
        } catch (e) {}
      });

      setIsCameraOn(true);
      setMediaError(null);
    } catch (err: any) {
      console.warn('[WebRTC] Camera flip error:', err);
    }
  }, [cameraFacingMode, isCameraOn]);

  // Toggle Microphone
  const toggleMic = useCallback(async () => {
    const stream = localStreamRef.current;
    if (stream && stream.getAudioTracks().length > 0) {
      const nextState = !isMicOn;
      stream.getAudioTracks().forEach(track => {
        track.enabled = nextState;
      });
      console.log(`[MIC] toggleMic nextState=${nextState} track id: ${stream.getAudioTracks()[0].id}`);
      setIsMicOn(nextState);
      if (nextState) setMediaError(null);

      const participantRef = doc(db, 'meetings', meetingId, 'participants', myPeerId);
      updateDoc(participantRef, { audioEnabled: nextState }).catch(() => {});
    } else if (!isMicOn) {
      try {
        setMediaError(null);
        console.log('[MIC] Re-requesting microphone access');
        let newStream: MediaStream;
        try {
          newStream = await navigator.mediaDevices.getUserMedia({
            audio: selectedAudioDeviceId ? { deviceId: { exact: selectedAudioDeviceId } } : { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          });
        } catch (devErr) {
          console.warn('[MIC] Specific microphone failed, trying default microphone:', devErr);
          newStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
        const newAudioTrack = newStream.getAudioTracks()[0];

        if (stream) {
          stream.addTrack(newAudioTrack);
        } else {
          localStreamRef.current = newStream;
          setLocalStream(newStream);
        }

        console.log(`[MIC] track live: ${newAudioTrack.readyState === 'live'} enabled: ${newAudioTrack.enabled}`);

        // Setup audio level analyser if not active
        try {
          if (!localAnalyserRef.current) {
            const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtxClass) {
              const audioCtx = new AudioCtxClass();
              const analyser = audioCtx.createAnalyser();
              analyser.fftSize = 256;
              const source = audioCtx.createMediaStreamSource(stream || newStream);
              source.connect(analyser);

              localAudioContextRef.current = audioCtx;
              localAnalyserRef.current = analyser;

              const dataArr = new Uint8Array(analyser.frequencyBinCount);
              const measureAudio = () => {
                if (!localAnalyserRef.current) return;
                localAnalyserRef.current.getByteFrequencyData(dataArr);
                let sum = 0;
                for (let i = 0; i < dataArr.length; i++) sum += dataArr[i];
                const avg = sum / dataArr.length;
                setLocalAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
                audioAnimationRef.current = requestAnimationFrame(measureAudio);
              };
              measureAudio();
            }
          }
        } catch (e) {
          console.warn('[MIC] Audio analyser setup warning:', e);
        }

        // Replace or add audio track on all active peer connections
        for (const [pId, pc] of peerConnections.current) {
          try {
            console.log(`[WEBRTC] adding audio track to peer connection for ${pId}`);
            const audioTransceiver = pc.getTransceivers().find(t => t.receiver.track.kind === 'audio');
            if (audioTransceiver && audioTransceiver.sender) {
              audioTransceiver.sender.replaceTrack(newAudioTrack).catch(err => {
                console.warn('[WEBRTC] replaceTrack mic error:', err);
              });
            } else {
              pc.addTrack(newAudioTrack, stream || newStream);
            }
          } catch (e) {}
        }

        setIsMicOn(true);
        setMediaError(null);
        const participantRef = doc(db, 'meetings', meetingId, 'participants', myPeerId);
        updateDoc(participantRef, { audioEnabled: true }).catch(() => {});
      } catch (err: any) {
        console.warn('[MIC] Could not start microphone:', err);
        setMediaError('Unable to start microphone.');
        setIsMicOn(false);
      }
    }
  }, [isMicOn, meetingId, myPeerId, selectedAudioDeviceId]);

  // Stop Screen Share helper
  const stopScreenShare = useCallback(async () => {
    console.log('[SCREEN] stopping screen sharing...');
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => {
        try { t.stop(); } catch (e) {}
      });
      screenStreamRef.current = null;
    }
    setScreenStream(null);
    setIsScreenSharing(false);

    if (meetingId && myPeerId) {
      const participantRef = doc(db, 'meetings', meetingId, 'participants', myPeerId);
      updateDoc(participantRef, { isScreenSharing: false }).catch(() => {});
      const meetingRef = doc(db, 'meetings', meetingId);
      updateDoc(meetingRef, { isScreenSharing: false, screenSharerId: null }).catch(() => {});
    }

    // Revert video sender to camera video track (or null if camera off) WITHOUT touching audio sender
    const cameraTrack = (isCameraOn && localStreamRef.current) ? (localStreamRef.current.getVideoTracks()[0] || null) : null;
    console.log('[SCREEN] restoring camera video track:', cameraTrack ? cameraTrack.id : 'null');
    for (const [pId, pc] of peerConnections.current) {
      try {
        const videoTransceiver = pc.getTransceivers().find(t => t.receiver.track.kind === 'video');
        if (videoTransceiver && videoTransceiver.sender) {
          await videoTransceiver.sender.replaceTrack(cameraTrack).catch(err => {
            console.warn(`[SCREEN] Error restoring camera track on PC ${pId}:`, err);
          });
        }
      } catch (e) {
        console.warn('[SCREEN] Error during camera track restore:', e);
      }
    }
  }, [meetingId, myPeerId, isCameraOn]);

  // Toggle Screen Share using standard getDisplayMedia (Native user gesture)
  const toggleScreenShare = useCallback(async () => {
    console.log('[SCREEN] toggleScreenShare button clicked');
    console.log('[SCREEN] secure context:', typeof window !== 'undefined' ? window.isSecureContext : 'unknown');

    if (isScreenSharing) {
      await stopScreenShare();
      return;
    }

    setMediaError(null);

    // 1. Secure Context Check
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      console.error('[SCREEN] Insecure context detected (not HTTPS).');
      setMediaError('Screen sharing requires HTTPS or secure context.');
      return;
    }

    // 2. Real capability check without User-Agent blocking
    const canScreenShare = !!(navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function');
    console.log('[SCREEN] getDisplayMedia available:', canScreenShare);

    if (!canScreenShare) {
      console.warn('[SCREEN] getDisplayMedia is not available in this mobile browser.');
      setMediaError('Screen sharing is not supported by this mobile browser.');
      return;
    }

    try {
      console.log('[SCREEN] requesting getDisplayMedia capture');
      let displayStream: MediaStream;

      try {
        // Direct call to getDisplayMedia
        displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });
      } catch (audioErr: any) {
        console.log('[SCREEN] standard options error, retrying minimal options:', audioErr);
        displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
      }

      console.log('[SCREEN] capture granted');
      const screenVideoTrack = displayStream.getVideoTracks()[0];
      console.log(`[SCREEN] screen video track: ${screenVideoTrack?.label} live=${screenVideoTrack?.readyState === 'live'}`);

      if (!screenVideoTrack || screenVideoTrack.readyState !== 'live') {
        throw new Error('Screen capture track is not active.');
      }

      screenStreamRef.current = displayStream;
      setScreenStream(displayStream);
      setIsScreenSharing(true);

      if (meetingId && myPeerId) {
        const participantRef = doc(db, 'meetings', meetingId, 'participants', myPeerId);
        updateDoc(participantRef, { isScreenSharing: true }).catch(() => {});
        const meetingRef = doc(db, 'meetings', meetingId);
        updateDoc(meetingRef, { isScreenSharing: true, screenSharerId: myPeerId }).catch(() => {});
      }

      console.log(`[SCREEN] replacing video track across ${peerConnections.current.size} peer connections`);

      // Replace ONLY video sender on every RTCPeerConnection — microphone remains untouched
      for (const [pId, pc] of peerConnections.current) {
        try {
          const videoTransceiver = pc.getTransceivers().find(t => t.receiver.track.kind === 'video');
          if (videoTransceiver && videoTransceiver.sender) {
            await videoTransceiver.sender.replaceTrack(screenVideoTrack).catch(err => {
              console.warn(`[SCREEN] Error replacing video track for ${pId}:`, err);
            });
          } else {
            pc.addTrack(screenVideoTrack, displayStream);
          }
        } catch (pcErr) {
          console.warn(`[SCREEN] Error updating PC ${pId} sender:`, pcErr);
        }
      }

      // Handle when user stops sharing via native browser bar
      screenVideoTrack.onended = () => {
        console.log('[SCREEN] Screen share ended via browser controls.');
        stopScreenShare();
      };
    } catch (err: any) {
      console.error('[SCREEN] error:', err?.name, err?.message);
      const name = err?.name || '';
      const msg = String(err?.message || '').toLowerCase();

      if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || msg.includes('permission denied') || msg.includes('cancelled')) {
        setMediaError('Screen sharing permission was cancelled or denied.');
      } else if (name === 'AbortError') {
        setMediaError('Screen sharing was cancelled.');
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setMediaError('No screen capture source was selected.');
      } else if (name === 'NotSupportedError' || name === 'TypeError') {
        setMediaError('Screen sharing is not supported by this mobile browser.');
      } else {
        setMediaError(err?.message || 'Screen sharing cancelled.');
      }
    }
  }, [isScreenSharing, stopScreenShare, meetingId, myPeerId]);

  // Toggle Raised Hand
  const toggleHandRaised = useCallback(async () => {
    const nextHand = !isHandRaised;
    setIsHandRaised(nextHand);
    if (meetingId && myPeerId) {
      try {
        const participantRef = doc(db, 'meetings', meetingId, 'participants', myPeerId);
        await updateDoc(participantRef, { isHandRaised: nextHand });
      } catch (e) {
        console.warn('[WebRTC] Failed to toggle hand raised:', e);
      }
    }
  }, [isHandRaised, meetingId, myPeerId]);

  // Host Action: Mute a specific participant remotely
  const muteParticipant = useCallback(async (targetPeerId: string) => {
    if (!meetingId || !targetPeerId) return;
    try {
      const participantRef = doc(db, 'meetings', meetingId, 'participants', targetPeerId);
      await updateDoc(participantRef, { audioEnabled: false });
    } catch (e) {
      console.warn('[WebRTC] Error muting participant:', e);
    }
  }, [meetingId]);

  // Host Action: Mute all remote participants
  const muteAllParticipants = useCallback(async () => {
    if (!meetingId) return;
    const peerIds = Object.keys(remotePeers);
    for (const peerId of peerIds) {
      try {
        const participantRef = doc(db, 'meetings', meetingId, 'participants', peerId);
        await updateDoc(participantRef, { audioEnabled: false });
      } catch (e) {}
    }
  }, [meetingId, remotePeers]);

  // Host Action: Remove a participant from the meeting
  const removeParticipant = useCallback(async (targetPeerId: string) => {
    if (!meetingId || !targetPeerId) return;
    try {
      const participantRef = doc(db, 'meetings', meetingId, 'participants', targetPeerId);
      await updateDoc(participantRef, { isRemoved: true });
      const pc = peerConnections.current.get(targetPeerId);
      if (pc) {
        pc.close();
        peerConnections.current.delete(targetPeerId);
        remoteMediaStreams.current.delete(targetPeerId);
        pendingIceCandidates.current.delete(targetPeerId);
        setRemotePeers(prev => {
          const next = { ...prev };
          delete next[targetPeerId];
          return next;
        });
      }
    } catch (e) {
      console.warn('[WebRTC] Error removing participant:', e);
    }
  }, [meetingId]);

  // Leave Call and Comprehensive Cleanup
  const leaveCall = useCallback(async () => {
    isCleaningUp.current = true;

    if (unsubLocalRef.current) {
      try { unsubLocalRef.current(); } catch (e) {}
      unsubLocalRef.current = null;
    }
    if (unsubParticipantsRef.current) {
      try { unsubParticipantsRef.current(); } catch (e) {}
      unsubParticipantsRef.current = null;
    }
    if (unsubSignalsRef.current) {
      try { unsubSignalsRef.current(); } catch (e) {}
      unsubSignalsRef.current = null;
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (audioAnimationRef.current) {
      cancelAnimationFrame(audioAnimationRef.current);
      audioAnimationRef.current = null;
    }
    if (localAudioContextRef.current && localAudioContextRef.current.state !== 'closed') {
      try { localAudioContextRef.current.close(); } catch (e) {}
      localAudioContextRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => {
        try { t.stop(); } catch (e) {}
      });
      localStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => {
        try { t.stop(); } catch (e) {}
      });
      screenStreamRef.current = null;
    }
    setLocalStream(null);
    setScreenStream(null);

    peerConnections.current.forEach(pc => {
      try {
        pc.close();
      } catch (e) {}
    });
    peerConnections.current.clear();
    remoteMediaStreams.current.clear();
    pendingIceCandidates.current.clear();
    setRemotePeers({});

    try {
      if (meetingId && myPeerId) {
        const participantRef = doc(db, 'meetings', meetingId, 'participants', myPeerId);
        await updateDoc(participantRef, {
          status: 'left',
          leftAt: serverTimestamp(),
          audioEnabled: false,
          videoEnabled: false,
          isScreenSharing: false,
          isHandRaised: false,
        });
      }
    } catch (err) {
      console.warn('[WebRTC] Error updating participant status on leave:', err);
    }

    try {
      if (meetingId) {
        const meetingRef = doc(db, 'meetings', meetingId);
        await updateDoc(meetingRef, {
          participantCount: increment(-1),
        });
      }
    } catch (e) {}
  }, [meetingId, myPeerId]);

  useEffect(() => {
    return () => {
      leaveCall();
    };
  }, [leaveCall]);

  return {
    localStream,
    screenStream,
    remotePeers: Object.values(remotePeers),
    remotePeersMap: remotePeers,
    isCameraOn,
    isMicOn,
    cameraFacingMode,
    setCameraFacingMode,
    flipCamera,
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
  };
}
