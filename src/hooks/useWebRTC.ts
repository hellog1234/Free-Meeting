import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
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
      console.log(`[WebRTC] Closing stale RTCPeerConnection for peer: ${remotePeerId}`);
      try { existingPc.close(); } catch (e) {}
      peerConnections.current.delete(remotePeerId);
      pendingIceCandidates.current.delete(remotePeerId);
    }

    console.log(`[WebRTC] Creating fresh RTCPeerConnection for peer: ${remotePeerId}`);
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

    // 1. Add current local audio track (microphone)
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        try {
          pc.addTrack(track, localStreamRef.current!);
        } catch (e) {
          console.warn('[WebRTC] Audio track already added:', e);
        }
      });
    }

    // 2. Add current video track (Screen share track if active, otherwise camera track)
    if (screenStreamRef.current && screenStreamRef.current.getVideoTracks().length > 0) {
      screenStreamRef.current.getVideoTracks().forEach(track => {
        try {
          pc.addTrack(track, screenStreamRef.current!);
        } catch (e) {
          console.warn('[WebRTC] Screen video track already added:', e);
        }
      });
      screenStreamRef.current.getAudioTracks().forEach(track => {
        try {
          pc.addTrack(track, screenStreamRef.current!);
        } catch (e) {}
      });
    } else if (localStreamRef.current && localStreamRef.current.getVideoTracks().length > 0) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        try {
          pc.addTrack(track, localStreamRef.current!);
        } catch (e) {
          console.warn('[WebRTC] Camera video track already added:', e);
        }
      });
    }

    // 2. Handle incoming remote media tracks
    pc.ontrack = (event) => {
      console.log(`[WebRTC] Received remote track (${event.track.kind}) from: ${remotePeerId}`);
      const stream = remoteMediaStreams.current.get(remotePeerId) || new MediaStream();
      
      // Add track if not already present
      if (!stream.getTracks().some(t => t.id === event.track.id)) {
        stream.addTrack(event.track);
      }
      remoteMediaStreams.current.set(remotePeerId, stream);

      // Listen to track state changes
      event.track.onmute = () => {
        if (event.track.kind === 'video') updateRemotePeer(remotePeerId, { videoEnabled: false });
        if (event.track.kind === 'audio') updateRemotePeer(remotePeerId, { audioEnabled: false });
      };
      event.track.onunmute = () => {
        if (event.track.kind === 'video') updateRemotePeer(remotePeerId, { videoEnabled: true });
        if (event.track.kind === 'audio') updateRemotePeer(remotePeerId, { audioEnabled: true });
      };

      updateRemotePeer(remotePeerId, { stream });
    };

    // 3. Handle local ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal(remotePeerId, 'candidate', event.candidate.toJSON());
      }
    };

    // 4. Handle ICE Connection State Changes & Reconnection
    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      console.log(`[WebRTC] ICE Connection state for ${remotePeerId}: ${state}`);
      updateRemotePeer(remotePeerId, { iceConnectionState: state });

      if (state === 'failed' || state === 'disconnected') {
        console.warn(`[WebRTC] ICE state degraded (${state}) with ${remotePeerId}. Attempting ICE restart...`);
        // Attempt ICE restart if initiator
        if (myPeerId < remotePeerId) {
          pc.createOffer({ iceRestart: true })
            .then(offer => pc.setLocalDescription(offer))
            .then(() => {
              if (pc.localDescription) {
                sendSignal(remotePeerId, 'offer', { sdp: pc.localDescription.sdp });
              }
            })
            .catch(err => console.warn('[WebRTC] ICE restart failed:', err));
        }
      }
    };

    // 5. Handle Peer Connection State Changes
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log(`[WebRTC] Connection state for ${remotePeerId}: ${state}`);
      updateRemotePeer(remotePeerId, { connectionState: state });

      if (state === 'failed') {
        console.warn(`[WebRTC] Peer connection failed with ${remotePeerId}.`);
      }
    };

    return pc;
  }, [myPeerId, sendSignal, updateRemotePeer]);

  // Flush queued ICE candidates after remote description is set
  const flushPendingCandidates = useCallback(async (peerId: string, pc: RTCPeerConnection) => {
    const queue = pendingIceCandidates.current.get(peerId);
    if (queue && queue.length > 0) {
      console.log(`[WebRTC] Flushing ${queue.length} buffered ICE candidates for ${peerId}`);
      for (const candidate of queue) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn('[WebRTC] Error adding buffered candidate:', err);
        }
      }
      pendingIceCandidates.current.delete(peerId);
    }
  }, []);

  // 1. Initialize Real Media Stream (Camera & Mic)
  useEffect(() => {
    let active = true;

    const startLocalMedia = async () => {
      // If BOTH initialVideo and initialAudio are false, NEVER request media devices automatically
      if (!initialVideo && !initialAudio) {
        setIsCameraOn(false);
        setIsMicOn(false);
        setLocalStream(null);
        return;
      }

      try {
        setMediaError(null);
        const constraints: MediaStreamConstraints = {
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

        let stream: MediaStream | null = null;
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (initialErr) {
          console.warn('[WebRTC] Exact constraints failed, trying basic constraints:', initialErr);
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: initialVideo ? { facingMode: { ideal: cameraFacingMode } } : false,
              audio: initialAudio,
            });
          } catch (basicErr: any) {
            console.warn('[WebRTC] Combined media failed, attempting separate fallbacks:', basicErr);
            // If both were requested, try audio-only first, or video-only
            if (initialVideo && initialAudio) {
              try {
                // Try audio only
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

        // Apply initial enabled states
        stream.getVideoTracks().forEach(t => { t.enabled = initialVideo; });
        stream.getAudioTracks().forEach(t => { t.enabled = initialAudio; });

        localStreamRef.current = stream;
        setLocalStream(stream);
        setIsCameraOn(initialVideo && stream.getVideoTracks().length > 0);
        setIsMicOn(initialAudio && stream.getAudioTracks().length > 0);

        // Attach or replace tracks on all existing peer connections
        const audioTrack = stream.getAudioTracks()[0];
        const videoTrack = stream.getVideoTracks()[0];
        for (const [, pc] of peerConnections.current) {
          try {
            const senders = pc.getSenders();
            if (audioTrack) {
              const audioSender = senders.find(s => s.track?.kind === 'audio' || (s.track === null));
              if (audioSender && audioSender.track !== undefined) {
                audioSender.replaceTrack(audioTrack).catch(() => {});
              } else {
                try { pc.addTrack(audioTrack, stream); } catch (e) {}
              }
            }
            if (videoTrack) {
              const videoSender = senders.find(s => s.track?.kind === 'video' || (s.track === null));
              if (videoSender && videoSender.track !== undefined) {
                videoSender.replaceTrack(videoTrack).catch(() => {});
              } else {
                try { pc.addTrack(videoTrack, stream); } catch (e) {}
              }
            }
          } catch (pcErr) {
            console.warn('[WebRTC] Error syncing tracks to peer connection:', pcErr);
          }
        }

        // Audio level analyser for local microphone
        if (stream.getAudioTracks().length > 0) {
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
            console.warn('[WebRTC] Local audio analyser setup warning:', e);
          }
        }
      } catch (err: any) {
        console.warn('[WebRTC] Media stream acquisition error:', err);
        if (active) {
          const isDenied = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
          if (isDenied) {
            setMediaError('Camera or microphone access is required for the selected meeting settings. Please allow access in your browser settings.');
          } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            setMediaError('No camera or microphone hardware detected on your device.');
          } else {
            setMediaError('Camera or microphone access is required for the selected meeting settings. Please allow access in your browser settings.');
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
  }, [initialAudio, initialVideo, selectedVideoDeviceId, selectedAudioDeviceId]);

  // 2. Register / Reconnect local participant in Firestore (prevents duplicates)
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

    // Keep lastSeen fresh every 15 seconds
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

  // 2b. Listen to local participant doc changes (for remote mute or remove from host)
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
        // Clean up peer connections and media
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
        console.log('[WebRTC] Local user was muted remotely by host.');
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

  // 3. Listen to all participants in the meeting to initiate WebRTC offers (Deterministic Initiator)
  useEffect(() => {
    if (!meetingId || !myPeerId) return;

    const participantsColRef = collection(db, 'meetings', meetingId, 'participants');
    const unsubParticipants = onSnapshot(participantsColRef, async (snapshot) => {
      const activeIds = new Set<string>();

      for (const docSnap of snapshot.docs) {
        const p = docSnap.data();
        const remotePeerId = p.id;
        if (!remotePeerId || remotePeerId === myPeerId) continue;
        // Ignore left or removed participants
        if (p.isRemoved || p.status === 'left') continue;

        activeIds.add(remotePeerId);

        // Update participant metadata (name, audio/video status, screen sharing, hand raise, host)
        updateRemotePeer(remotePeerId, {
          name: p.name || 'Participant',
          audioEnabled: Boolean(p.audioEnabled),
          videoEnabled: Boolean(p.videoEnabled),
          isScreenSharing: Boolean(p.isScreenSharing),
          isHandRaised: Boolean(p.isHandRaised),
          isHost: Boolean(p.isHost),
        });

        // Deterministic Initiator Rule: The peer with lexicographically smaller ID initiates the offer
        if (myPeerId < remotePeerId && !peerConnections.current.has(remotePeerId)) {
          console.log(`[WebRTC] Initiating offer to remote peer: ${remotePeerId}`);
          const pc = createPeerConnection(remotePeerId, p.name);

          try {
            const offer = await pc.createOffer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: true,
            });
            await pc.setLocalDescription(offer);
            await sendSignal(remotePeerId, 'offer', { sdp: offer.sdp });
          } catch (err) {
            console.error(`[WebRTC] Failed to create or send offer to ${remotePeerId}:`, err);
          }
        }
      }

      // Cleanup disconnected peers that left Firestore participants collection or changed status to 'left'
      peerConnections.current.forEach((pc, pId) => {
        if (!activeIds.has(pId)) {
          console.log(`[WebRTC] Peer left room: ${pId}. Cleaning up connection.`);
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

  // 4. Listen to incoming WebRTC signals (Offers, Answers, ICE candidates)
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

        // Automatically delete processed signal document to keep Firestore collection light
        deleteDoc(signalDoc.ref).catch(() => {});

        if (!senderId || senderId === myPeerId) continue;

        try {
          if (type === 'offer') {
            console.log(`[WebRTC] Received offer from ${senderId}`);
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
            console.log(`[WebRTC] Received answer from ${senderId}`);
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
                // Buffer candidate until setRemoteDescription finishes
                const list = pendingIceCandidates.current.get(senderId) || [];
                list.push(payload);
                pendingIceCandidates.current.set(senderId, list);
              }
            }
          }
        } catch (signalErr) {
          console.warn(`[WebRTC] Error handling signal (${type}) from ${senderId}:`, signalErr);
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
      if (nextState) {
        setMediaError(null);
      }

      // Update Firestore participant status
      const participantRef = doc(db, 'meetings', meetingId, 'participants', myPeerId);
      updateDoc(participantRef, { videoEnabled: nextState }).catch(() => {});
    } else if (!isCameraOn) {
      // Re-request camera stream if previously empty
      try {
        setMediaError(null);
        let newStream: MediaStream;
        try {
          newStream = await navigator.mediaDevices.getUserMedia({
            video: selectedVideoDeviceId ? { deviceId: { exact: selectedVideoDeviceId } } : true,
          });
        } catch (devErr) {
          console.warn('[WebRTC] Specific camera device failed, trying default camera:', devErr);
          newStream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
        const newVideoTrack = newStream.getVideoTracks()[0];

        if (stream) {
          stream.addTrack(newVideoTrack);
        } else {
          localStreamRef.current = newStream;
          setLocalStream(newStream);
        }

        // Replace or add track to all active peer connections
        for (const [, pc] of peerConnections.current) {
          try {
            const senders = pc.getSenders();
            const videoSender = senders.find(s => s.track?.kind === 'video' || s.track === null);
            if (videoSender) {
              videoSender.replaceTrack(newVideoTrack).catch(err => {
                console.warn('[WebRTC] replaceTrack warning on camera toggle:', err);
              });
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
        console.warn('[WebRTC] Could not re-acquire video track:', err);
        const isDenied = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
        if (isDenied) {
          setMediaError('Camera permission was blocked in your browser. Click the lock/settings icon in the address bar to Allow, or click Open in New Tab.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setMediaError('No camera device found on your system.');
        } else {
          setMediaError('Unable to start camera.');
        }
        setIsCameraOn(false);
      }
    }
  }, [isCameraOn, meetingId, myPeerId, selectedVideoDeviceId]);

  // Flip Camera (Front <-> Back / Environment <-> User)
  const flipCamera = useCallback(async (targetMode?: 'user' | 'environment') => {
    const nextMode = targetMode || (cameraFacingMode === 'user' ? 'environment' : 'user');
    setCameraFacingMode(nextMode);

    if (!isCameraOn) {
      return;
    }

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
        // Stop old video tracks
        currentLocal.getVideoTracks().forEach(t => {
          try {
            t.stop();
            currentLocal.removeTrack(t);
          } catch (e) {}
        });
        currentLocal.addTrack(newVideoTrack);
        setLocalStream(new MediaStream(currentLocal.getTracks()));
      } else {
        localStreamRef.current = newStream;
        setLocalStream(newStream);
      }

      // Replace track on all active peer connections
      peerConnections.current.forEach(pc => {
        try {
          const senders = pc.getSenders();
          const videoSender = senders.find(s => s.track && s.track.kind === 'video');
          if (videoSender) {
            videoSender.replaceTrack(newVideoTrack).catch(err => {
              console.warn('[WebRTC] replaceTrack warning on camera flip:', err);
            });
          } else {
            pc.addTrack(newVideoTrack, localStreamRef.current!);
          }
        } catch (e) {
          console.warn('[WebRTC] Error updating sender during camera flip:', e);
        }
      });

      setIsCameraOn(true);
      setMediaError(null);
    } catch (err: any) {
      console.warn('[WebRTC] Camera flip error, attempting fallback:', err);
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const fallbackTrack = fallbackStream.getVideoTracks()[0];
        if (fallbackTrack && localStreamRef.current) {
          localStreamRef.current.getVideoTracks().forEach(t => {
            try { t.stop(); localStreamRef.current?.removeTrack(t); } catch (e) {}
          });
          localStreamRef.current.addTrack(fallbackTrack);
          setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
        }
      } catch (fallbackErr) {
        setMediaError('Could not flip camera on this device.');
      }
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
      setIsMicOn(nextState);
      if (nextState) {
        setMediaError(null);
      }

      // Update Firestore participant status
      const participantRef = doc(db, 'meetings', meetingId, 'participants', myPeerId);
      updateDoc(participantRef, { audioEnabled: nextState }).catch(() => {});
    } else if (!isMicOn) {
      // Re-request mic stream if previously empty
      try {
        setMediaError(null);
        let newStream: MediaStream;
        try {
          newStream = await navigator.mediaDevices.getUserMedia({
            audio: selectedAudioDeviceId ? { deviceId: { exact: selectedAudioDeviceId } } : true,
          });
        } catch (devErr) {
          console.warn('[WebRTC] Specific microphone device failed, trying default microphone:', devErr);
          newStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
        const newAudioTrack = newStream.getAudioTracks()[0];

        if (stream) {
          stream.addTrack(newAudioTrack);
        } else {
          localStreamRef.current = newStream;
          setLocalStream(newStream);
        }

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
          console.warn('[WebRTC] Audio analyser setup warning:', e);
        }

        // Replace or add audio track to all active peer connections
        for (const [, pc] of peerConnections.current) {
          try {
            const senders = pc.getSenders();
            const audioSender = senders.find(s => s.track?.kind === 'audio' || s.track === null);
            if (audioSender) {
              audioSender.replaceTrack(newAudioTrack).catch(err => {
                console.warn('[WebRTC] replaceTrack warning on mic toggle:', err);
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
        console.warn('[WebRTC] Could not re-acquire audio track:', err);
        const isDenied = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
        if (isDenied) {
          setMediaError('Microphone permission was blocked in your browser. Click the lock/settings icon in the address bar to Allow, or click Open in New Tab.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setMediaError('No microphone device found on your system.');
        } else {
          setMediaError('Unable to start microphone.');
        }
        setIsMicOn(false);
      }
    }
  }, [isMicOn, meetingId, myPeerId, selectedAudioDeviceId]);

  // Stop Screen Share helper
  const stopScreenShare = useCallback(async () => {
    console.log('[ScreenShare] Stopping screen sharing...');
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => {
        try {
          t.stop();
        } catch (e) {}
      });
      screenStreamRef.current = null;
    }
    setScreenStream(null);
    setIsScreenSharing(false);

    // Update Firestore participant status and meeting document
    if (meetingId && myPeerId) {
      const participantRef = doc(db, 'meetings', meetingId, 'participants', myPeerId);
      updateDoc(participantRef, { isScreenSharing: false }).catch(() => {});
      const meetingRef = doc(db, 'meetings', meetingId);
      updateDoc(meetingRef, { isScreenSharing: false, screenSharerId: null }).catch(() => {});
    }

    // Revert video track on all active peer connections to camera track (or null if camera off)
    const cameraTrack = (isCameraOn && localStreamRef.current) ? (localStreamRef.current.getVideoTracks()[0] || null) : null;
    for (const [, pc] of peerConnections.current) {
      try {
        const senders = pc.getSenders();
        const videoSender = senders.find(s => s.track?.kind === 'video' || s.track === null);
        if (videoSender) {
          await videoSender.replaceTrack(cameraTrack).catch(err => {
            console.warn('[ScreenShare] Error restoring camera track on peer connection:', err);
          });
        }
      } catch (e) {
        console.warn('[ScreenShare] Error during camera track restore:', e);
      }
    }
  }, [meetingId, myPeerId, isCameraOn]);

  // Toggle Screen Share using standard getDisplayMedia (User Click Initiated Only)
  const toggleScreenShare = useCallback(async () => {
    console.log('[ScreenShare] button clicked');
    console.log('[ScreenShare] secure context:', typeof window !== 'undefined' ? window.isSecureContext : 'unknown');

    if (isScreenSharing) {
      await stopScreenShare();
      return;
    }

    setMediaError(null);

    // 1. Secure context verification
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      console.error('[ScreenShare] Insecure context detected (not HTTPS).');
      setMediaError('Screen sharing requires HTTPS.');
      return;
    }

    // 2. Real capability check - do not block based on User Agent
    const canScreenShare = !!(navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function');
    console.log('[ScreenShare] getDisplayMedia available:', canScreenShare);

    if (!canScreenShare) {
      console.warn('[ScreenShare] getDisplayMedia is not available in this browser/environment.');
      setMediaError('Screen sharing is not supported by your current browser.');
      return;
    }

    try {
      console.log('[ScreenShare] requesting capture');
      let displayStream: MediaStream;

      try {
        // Direct native browser screen/window/tab picker
        displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
      } catch (audioErr: any) {
        // Fallback without audio constraint if audio parameter is not supported by browser
        const errName = audioErr?.name || '';
        const errMsg = String(audioErr?.message || '').toLowerCase();
        if (errName === 'TypeError' || errName === 'NotSupportedError' || errMsg.includes('audio')) {
          console.log('[ScreenShare] audio constraint failed, retrying video only...');
          displayStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
          });
        } else {
          throw audioErr;
        }
      }

      console.log('[ScreenShare] capture granted');
      const screenVideoTrack = displayStream.getVideoTracks()[0];
      console.log('[ScreenShare] video track:', screenVideoTrack);

      if (!screenVideoTrack || screenVideoTrack.readyState !== 'live') {
        throw new Error('Screen capture track is not active or live.');
      }

      screenStreamRef.current = displayStream;
      setScreenStream(displayStream);
      setIsScreenSharing(true);

      // Save only screen-sharing boolean state in Firebase (No media data in DB)
      if (meetingId && myPeerId) {
        const participantRef = doc(db, 'meetings', meetingId, 'participants', myPeerId);
        updateDoc(participantRef, { isScreenSharing: true }).catch(() => {});
        const meetingRef = doc(db, 'meetings', meetingId);
        updateDoc(meetingRef, { isScreenSharing: true, screenSharerId: myPeerId }).catch(() => {});
      }

      console.log('[ScreenShare] peer connections:', peerConnections.current.size);
      console.log('[ScreenShare] replacing video tracks');

      // Replace video track on EVERY active RTCPeerConnection
      for (const [, pc] of peerConnections.current) {
        try {
          const senders = pc.getSenders();
          const videoSender = senders.find(s => s.track?.kind === 'video' || s.track === null);
          if (videoSender) {
            await videoSender.replaceTrack(screenVideoTrack).catch(err => {
              console.warn('[ScreenShare] Error replacing track on peer connection:', err);
            });
          } else {
            try {
              pc.addTrack(screenVideoTrack, displayStream);
            } catch (e) {
              console.warn('[ScreenShare] Could not add track to PC:', e);
            }
          }
        } catch (pcErr) {
          console.warn('[ScreenShare] Error updating PC senders:', pcErr);
        }
      }

      // Handle when user stops sharing via browser native floating bar ("Stop sharing")
      screenVideoTrack.onended = () => {
        console.log('[ScreenShare] Screen share ended via browser controls.');
        stopScreenShare();
      };
    } catch (err: any) {
      console.error('[ScreenShare] error:', err?.name, err?.message, err);
      const name = err?.name || '';
      const msg = String(err?.message || '').toLowerCase();

      if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || msg.includes('permission denied') || msg.includes('cancelled')) {
        setMediaError('Screen sharing permission was denied or cancelled.');
      } else if (name === 'AbortError') {
        setMediaError('Screen sharing was cancelled.');
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setMediaError('No screen capture source was selected.');
      } else if (name === 'NotReadableError' || name === 'TrackStartError') {
        setMediaError('The selected screen could not be captured.');
      } else if (name === 'InvalidStateError') {
        setMediaError('Please click Share Screen again.');
      } else if (name === 'TypeError' || name === 'NotSupportedError') {
        setMediaError('Screen sharing options are not supported by this browser.');
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
      // Mark as removed first so the remote peer detects it and leaves
      await updateDoc(participantRef, { isRemoved: true });
      // Also close peer connection locally
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

    // 1. Unsubscribe and remove all realtime listeners immediately
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

    // 2. Stop all media tracks
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

    // 3. Close all RTCPeerConnections
    peerConnections.current.forEach(pc => {
      try {
        pc.close();
      } catch (e) {}
    });
    peerConnections.current.clear();
    remoteMediaStreams.current.clear();
    pendingIceCandidates.current.clear();
    setRemotePeers({});

    // 4. Update participant status to 'left' and set leftAt in Firestore
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

    // 5. Decrement meeting participantCount safely
    try {
      if (meetingId) {
        const meetingRef = doc(db, 'meetings', meetingId);
        await updateDoc(meetingRef, {
          participantCount: increment(-1),
        });
      }
    } catch (e) {}
  }, [meetingId, myPeerId]);

  // Cleanup on component unmount
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
