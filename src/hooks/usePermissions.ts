import { useState, useEffect, useCallback, useRef } from 'react';

export type PermissionStatusType = 'granted' | 'denied' | 'prompt' | 'default' | 'unsupported';

export interface PermissionsState {
  camera: PermissionStatusType;
  microphone: PermissionStatusType;
  notifications: PermissionStatusType;
  screenShare: 'supported' | 'unsupported';
  wakeLock: boolean;
  wakeLockSupported: boolean;
  pictureInPictureSupported: boolean;
  isDocumentPipSupported: boolean;
  isTabInBackground: boolean;
  isIframe: boolean;
}

export function usePermissions() {
  const [permissions, setPermissions] = useState<PermissionsState>({
    camera: 'prompt',
    microphone: 'prompt',
    notifications: typeof Notification !== 'undefined' ? (Notification.permission as PermissionStatusType) : 'unsupported',
    screenShare: typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getDisplayMedia ? 'supported' : 'unsupported',
    wakeLock: false,
    wakeLockSupported: typeof navigator !== 'undefined' && 'wakeLock' in navigator,
    pictureInPictureSupported: typeof document !== 'undefined' && 'pictureInPictureEnabled' in document && document.pictureInPictureEnabled,
    isDocumentPipSupported: typeof window !== 'undefined' && 'documentPictureInPicture' in window,
    isTabInBackground: typeof document !== 'undefined' ? document.hidden : false,
    isIframe: typeof window !== 'undefined' && window.self !== window.top,
  });

  const wakeLockSentinelRef = useRef<any>(null);

  // Check Permissions via navigator.permissions API where available
  const checkAllPermissions = useCallback(async () => {
    if (typeof navigator === 'undefined') return;

    let camStatus: PermissionStatusType = 'prompt';
    let micStatus: PermissionStatusType = 'prompt';
    let notifStatus: PermissionStatusType = typeof Notification !== 'undefined' ? (Notification.permission as PermissionStatusType) : 'unsupported';

    if (navigator.permissions && navigator.permissions.query) {
      try {
        const camQuery = await navigator.permissions.query({ name: 'camera' as PermissionName });
        camStatus = camQuery.state;
        camQuery.onchange = () => {
          setPermissions(prev => ({ ...prev, camera: camQuery.state }));
        };
      } catch (e) {
        // Query not supported for camera in some browsers
      }

      try {
        const micQuery = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        micStatus = micQuery.state;
        micQuery.onchange = () => {
          setPermissions(prev => ({ ...prev, microphone: micQuery.state }));
        };
      } catch (e) {
        // Query not supported for microphone in some browsers
      }

      try {
        const notifQuery = await navigator.permissions.query({ name: 'notifications' as PermissionName });
        notifStatus = notifQuery.state;
        notifQuery.onchange = () => {
          setPermissions(prev => ({ ...prev, notifications: notifQuery.state }));
        };
      } catch (e) {
        if (typeof Notification !== 'undefined') {
          notifStatus = Notification.permission as PermissionStatusType;
        }
      }
    }

    setPermissions(prev => ({
      ...prev,
      camera: camStatus,
      microphone: micStatus,
      notifications: notifStatus,
      screenShare: !!navigator.mediaDevices?.getDisplayMedia ? 'supported' : 'unsupported',
      wakeLockSupported: 'wakeLock' in navigator,
      pictureInPictureSupported: 'pictureInPictureEnabled' in document && document.pictureInPictureEnabled,
      isDocumentPipSupported: 'documentPictureInPicture' in window,
      isTabInBackground: document.hidden,
      isIframe: window.self !== window.top,
    }));
  }, []);

  // Monitor visibility change
  useEffect(() => {
    const handleVisibility = () => {
      setPermissions(prev => ({
        ...prev,
        isTabInBackground: document.hidden,
      }));

      // Re-acquire WakeLock if tab becomes visible again and was active
      if (!document.hidden && wakeLockSentinelRef.current === null && permissions.wakeLock) {
        acquireWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    checkAllPermissions();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [checkAllPermissions]);

  // Request Camera
  const requestCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(t => t.stop());
      setPermissions(prev => ({ ...prev, camera: 'granted' }));
      return { success: true };
    } catch (err: any) {
      const isDenied = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError';
      setPermissions(prev => ({ ...prev, camera: isDenied ? 'denied' : 'prompt' }));
      return { success: false, error: err?.message || 'Camera request failed' };
    }
  }, []);

  // Request Microphone
  const requestMicrophone = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      setPermissions(prev => ({ ...prev, microphone: 'granted' }));
      return { success: true };
    } catch (err: any) {
      const isDenied = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError';
      setPermissions(prev => ({ ...prev, microphone: isDenied ? 'denied' : 'prompt' }));
      return { success: false, error: err?.message || 'Microphone request failed' };
    }
  }, []);

  // Request Desktop Notifications for background alerts
  const requestNotifications = useCallback(async () => {
    if (typeof Notification === 'undefined') {
      return { success: false, error: 'Notifications not supported in this browser' };
    }

    try {
      const result = await Notification.requestPermission();
      setPermissions(prev => ({ ...prev, notifications: result as PermissionStatusType }));
      return { success: result === 'granted', status: result };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Notification request failed' };
    }
  }, []);

  // Send Notification helper
  const sendNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
      return;
    }

    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });

      notification.onclick = () => {
        if (typeof window !== 'undefined') {
          window.focus();
        }
        notification.close();
      };
    } catch (e) {
      console.warn('Could not trigger notification:', e);
    }
  }, []);

  // Screen Wake Lock API (Keep device awake during presentations / meetings)
  const acquireWakeLock = useCallback(async () => {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return false;
    }

    try {
      const sentinel = await (navigator as any).wakeLock.request('screen');
      wakeLockSentinelRef.current = sentinel;
      sentinel.addEventListener('release', () => {
        wakeLockSentinelRef.current = null;
        setPermissions(prev => ({ ...prev, wakeLock: false }));
      });
      setPermissions(prev => ({ ...prev, wakeLock: true }));
      return true;
    } catch (err) {
      console.warn('Wake Lock request failed:', err);
      wakeLockSentinelRef.current = null;
      setPermissions(prev => ({ ...prev, wakeLock: false }));
      return false;
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockSentinelRef.current) {
      try {
        await wakeLockSentinelRef.current.release();
      } catch (e) {}
      wakeLockSentinelRef.current = null;
    }
    setPermissions(prev => ({ ...prev, wakeLock: false }));
  }, []);

  const toggleWakeLock = useCallback(async () => {
    if (permissions.wakeLock) {
      await releaseWakeLock();
      return false;
    } else {
      return await acquireWakeLock();
    }
  }, [permissions.wakeLock, acquireWakeLock, releaseWakeLock]);

  // Request Picture-in-Picture on a video element
  const requestPictureInPicture = useCallback(async (videoElement: HTMLVideoElement | null) => {
    if (!videoElement) {
      return { success: false, error: 'Video element not available' };
    }

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        return { success: true, mode: 'exited' };
      } else if (document.pictureInPictureEnabled) {
        await videoElement.requestPictureInPicture();
        return { success: true, mode: 'entered' };
      } else {
        return { success: false, error: 'Picture-in-Picture not supported' };
      }
    } catch (err: any) {
      console.warn('Picture-in-Picture error:', err);
      return { success: false, error: err?.message || 'Could not enter Picture-in-Picture' };
    }
  }, []);

  // Screen Share test / permission trigger
  const requestScreenShareTest = useCallback(async (options?: DisplayMediaStreamOptions) => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      return { success: false, error: 'Screen sharing is not supported in this browser' };
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia(options || {
        video: true,
        audio: true,
      });

      // Stop test stream immediately
      setTimeout(() => {
        stream.getTracks().forEach(t => t.stop());
      }, 500);

      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err?.name === 'NotAllowedError' ? 'Screen share permission was cancelled or denied' : err?.message || 'Screen capture error',
      };
    }
  }, []);

  // Open Popout / Standalone Window
  const openPopoutWindow = useCallback((url?: string, title = 'FreeMeet Meeting', width = 1100, height = 750) => {
    const targetUrl = url || window.location.href;
    const left = window.screenLeft + (window.outerWidth - width) / 2;
    const top = window.screenTop + (window.outerHeight - height) / 2;

    const popup = window.open(
      targetUrl,
      title,
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`
    );

    if (popup) {
      popup.focus();
      return { success: true, popup };
    } else {
      return {
        success: false,
        error: 'Pop-up window was blocked by your browser. Please allow popups for this site in your address bar.',
      };
    }
  }, []);

  return {
    permissions,
    checkAllPermissions,
    requestCamera,
    requestMicrophone,
    requestNotifications,
    sendNotification,
    acquireWakeLock,
    releaseWakeLock,
    toggleWakeLock,
    requestPictureInPicture,
    requestScreenShareTest,
    openPopoutWindow,
  };
}
