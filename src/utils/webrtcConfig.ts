/**
 * WebRTC ICE and Media Configuration
 * Uses public Google STUN servers with support for environment-configured TURN credentials.
 * Never uses fake credentials.
 */

export const getIceServers = (): RTCIceServer[] => {
  const servers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ];

  // Optional real TURN configuration if provided in environment
  const metaEnv = (import.meta as any)?.env || {};
  const turnUrl = metaEnv.VITE_TURN_URL;
  const turnUsername = metaEnv.VITE_TURN_USERNAME;
  const turnPassword = metaEnv.VITE_TURN_PASSWORD;

  if (turnUrl && turnUsername) {
    servers.push({
      urls: turnUrl,
      username: turnUsername,
      credential: turnPassword || '',
    });
  }

  return servers;
};

export const RTC_CONFIGURATION: RTCConfiguration = {
  iceServers: getIceServers(),
  iceCandidatePoolSize: 10,
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
};
