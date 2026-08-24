import React, { useState } from 'react';
import {
  ShieldCheck,
  X,
  Camera,
  Mic,
  Monitor,
  Bell,
  Sun,
  Layers,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Laptop,
  Globe,
  Settings,
  Sparkles,
  Volume2,
  Tv
} from 'lucide-react';
import { usePermissions, PermissionStatusType } from '../../hooks/usePermissions';

interface PermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshMedia?: () => void;
  activeVideoElement?: HTMLVideoElement | null;
}

export const PermissionsModal: React.FC<PermissionsModalProps> = ({
  isOpen,
  onClose,
  onRefreshMedia,
  activeVideoElement,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'screen' | 'background' | 'guides'>('overview');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const {
    permissions,
    requestCamera,
    requestMicrophone,
    requestNotifications,
    sendNotification,
    acquireWakeLock,
    releaseWakeLock,
    toggleWakeLock,
    requestScreenShareTest,
    requestPictureInPicture,
    openPopoutWindow,
    checkAllPermissions,
  } = usePermissions();

  if (!isOpen) return null;

  const getStatusBadge = (status: PermissionStatusType | string) => {
    switch (status) {
      case 'granted':
      case 'supported':
      case 'true':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Allowed</span>
          </span>
        );
      case 'denied':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Blocked</span>
          </span>
        );
      case 'prompt':
      case 'default':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Ask Each Time</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-500/15 border border-stone-500/30 text-stone-500 text-xs font-bold">
            <span>Unavailable</span>
          </span>
        );
    }
  };

  const handleTestScreen = async () => {
    setIsTesting(true);
    setTestResult('Opening system screen & window picker...');
    const res = await requestScreenShareTest();
    setIsTesting(false);
    if (res.success) {
      setTestResult('Screen capture test succeeded! Display and window permissions are functioning properly.');
    } else {
      setTestResult(`Screen share test: ${res.error}`);
    }
  };

  const handleTestNotification = async () => {
    setIsTesting(true);
    const res = await requestNotifications();
    setIsTesting(false);
    if (res.success) {
      sendNotification('FreeMeet Background Alert', {
        body: 'Background notifications are enabled! You will be alerted when someone raises a hand or sends a message.',
      });
      setTestResult('Notification sent! Check your system notification center or desktop corner.');
    } else {
      setTestResult(`Notification permission not granted: ${res.error || 'Please allow in your address bar.'}`);
    }
  };

  const handleTestPip = async () => {
    if (activeVideoElement) {
      const res = await requestPictureInPicture(activeVideoElement);
      if (res.success) {
        setTestResult('Picture-in-Picture floating window activated.');
      } else {
        setTestResult(`Picture-in-Picture error: ${res.error}`);
      }
    } else {
      setTestResult('Picture-in-Picture requires an active video feed. Join the room to float participant videos.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#162017] rounded-3xl border border-[#e2ede4] dark:border-white/15 max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#528d5a]/15 text-[#528d5a] dark:text-[#a3d9ab] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[#1a241b] dark:text-white font-['Outfit']">
                System &amp; Permissions Center
              </h2>
              <p className="text-xs text-[#5a6b5c] dark:text-[#8ca18f]">
                Manage Camera, Mic, Screen Sharing, Background, and Window Permissions
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            id="permissions-modal-close-btn"
            className="w-8 h-8 rounded-full bg-stone-100 dark:bg-white/10 hover:bg-stone-200 dark:hover:bg-white/20 text-[#5a6b5c] dark:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 pt-4 pb-2 border-b border-stone-100 dark:border-white/10 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-[#528d5a] text-white shadow-xs'
                : 'bg-stone-100 dark:bg-white/5 text-[#5a6b5c] dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-white/10'
            }`}
          >
            Permissions Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('screen')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'screen'
                ? 'bg-[#528d5a] text-white shadow-xs'
                : 'bg-stone-100 dark:bg-white/5 text-[#5a6b5c] dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-white/10'
            }`}
          >
            Screen &amp; Window Sharing
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('background')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'background'
                ? 'bg-[#528d5a] text-white shadow-xs'
                : 'bg-stone-100 dark:bg-white/5 text-[#5a6b5c] dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-white/10'
            }`}
          >
            Background &amp; Wake Lock
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('guides')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'guides'
                ? 'bg-[#528d5a] text-white shadow-xs'
                : 'bg-stone-100 dark:bg-white/5 text-[#5a6b5c] dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-white/10'
            }`}
          >
            Browser &amp; OS Guides
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="py-4 space-y-4 overflow-y-auto flex-1 text-[#1a241b] dark:text-white">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-3">
              {permissions.isIframe && (
                <div className="p-3.5 rounded-2xl bg-[#eff5f0] dark:bg-[#528d5a]/15 border border-[#cddfd0] dark:border-[#528d5a]/30 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Globe className="w-4 h-4 text-[#528d5a] dark:text-[#a3d9ab] shrink-0" />
                    <p className="text-xs text-[#2d5232] dark:text-[#dbe8dc] leading-relaxed">
                      For unrestricted access to screen sharing, camera, and floating windows, open the meeting in a full browser tab.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openPopoutWindow()}
                    className="px-3 py-1.5 rounded-xl bg-[#528d5a] hover:bg-[#43754a] text-white text-xs font-bold shrink-0 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in Tab</span>
                  </button>
                </div>
              )}

              {/* Permission Item: Camera */}
              <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-white/5 border border-stone-200/60 dark:border-white/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#eff5f0] dark:bg-white/10 text-[#528d5a] dark:text-[#a3d9ab] flex items-center justify-center">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#1a241b] dark:text-white">Camera Permission</h4>
                    <p className="text-[11px] text-[#5a6b5c] dark:text-[#8ca18f]">Video streaming and virtual effects</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(permissions.camera)}
                  <button
                    type="button"
                    onClick={async () => {
                      await requestCamera();
                      if (onRefreshMedia) onRefreshMedia();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-stone-200 dark:bg-white/10 hover:bg-stone-300 dark:hover:bg-white/20 text-xs font-semibold text-stone-800 dark:text-white transition-colors cursor-pointer"
                  >
                    Request
                  </button>
                </div>
              </div>

              {/* Permission Item: Microphone */}
              <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-white/5 border border-stone-200/60 dark:border-white/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#eff5f0] dark:bg-white/10 text-[#528d5a] dark:text-[#a3d9ab] flex items-center justify-center">
                    <Mic className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#1a241b] dark:text-white">Microphone Permission</h4>
                    <p className="text-[11px] text-[#5a6b5c] dark:text-[#8ca18f]">Voice communication and noise suppression</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(permissions.microphone)}
                  <button
                    type="button"
                    onClick={async () => {
                      await requestMicrophone();
                      if (onRefreshMedia) onRefreshMedia();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-stone-200 dark:bg-white/10 hover:bg-stone-300 dark:hover:bg-white/20 text-xs font-semibold text-stone-800 dark:text-white transition-colors cursor-pointer"
                  >
                    Request
                  </button>
                </div>
              </div>

              {/* Permission Item: Screen Share */}
              <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-white/5 border border-stone-200/60 dark:border-white/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#eff5f0] dark:bg-white/10 text-[#528d5a] dark:text-[#a3d9ab] flex items-center justify-center">
                    <Monitor className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#1a241b] dark:text-white">Screen &amp; Window Sharing</h4>
                    <p className="text-[11px] text-[#5a6b5c] dark:text-[#8ca18f]">Full screen, application window, or browser tab</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(permissions.screenShare)}
                  <button
                    type="button"
                    onClick={handleTestScreen}
                    className="px-2.5 py-1 rounded-lg bg-[#528d5a] hover:bg-[#43754a] text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Test Share
                  </button>
                </div>
              </div>

              {/* Permission Item: Desktop Notifications */}
              <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-white/5 border border-stone-200/60 dark:border-white/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#eff5f0] dark:bg-white/10 text-[#528d5a] dark:text-[#a3d9ab] flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#1a241b] dark:text-white">Background Notifications</h4>
                    <p className="text-[11px] text-[#5a6b5c] dark:text-[#8ca18f]">Hand raises, chat alerts when tab is hidden</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(permissions.notifications)}
                  <button
                    type="button"
                    onClick={handleTestNotification}
                    className="px-2.5 py-1 rounded-lg bg-stone-200 dark:bg-white/10 hover:bg-stone-300 dark:hover:bg-white/20 text-xs font-semibold text-stone-800 dark:text-white transition-colors cursor-pointer"
                  >
                    Enable
                  </button>
                </div>
              </div>

              {/* Permission Item: Screen Wake Lock */}
              <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-white/5 border border-stone-200/60 dark:border-white/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#eff5f0] dark:bg-white/10 text-[#528d5a] dark:text-[#a3d9ab] flex items-center justify-center">
                    <Sun className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#1a241b] dark:text-white">Screen Wake Lock</h4>
                    <p className="text-[11px] text-[#5a6b5c] dark:text-[#8ca18f]">Prevents monitor or device from sleeping during calls</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                    permissions.wakeLock
                      ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                      : 'bg-stone-200/60 dark:bg-white/10 text-[#5a6b5c] dark:text-[#8ca18f]'
                  }`}>
                    {permissions.wakeLock ? 'Active (Awake)' : 'Inactive'}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleWakeLock()}
                    className="px-2.5 py-1 rounded-lg bg-stone-200 dark:bg-white/10 hover:bg-stone-300 dark:hover:bg-white/20 text-xs font-semibold text-stone-800 dark:text-white transition-colors cursor-pointer"
                  >
                    {permissions.wakeLock ? 'Turn Off' : 'Turn On'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SCREEN & WINDOW SHARING */}
          {activeTab === 'screen' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-stone-50 dark:bg-white/5 border border-stone-200/60 dark:border-white/10 space-y-3">
                <h4 className="font-bold text-sm text-[#1a241b] dark:text-white flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-[#528d5a]" />
                  <span>Display Capture Modes</span>
                </h4>
                <p className="text-xs text-[#5a6b5c] dark:text-[#8ca18f] leading-relaxed">
                  When you click <strong>Share Screen</strong>, the browser provides three capture choices:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <div className="p-3 rounded-xl bg-white dark:bg-white/5 border border-stone-200/80 dark:border-white/10 space-y-1">
                    <span className="font-bold text-xs block text-[#1a241b] dark:text-white">🖥️ Entire Screen</span>
                    <p className="text-[11px] text-[#5a6b5c] dark:text-[#8ca18f]">Shares your whole desktop across all apps.</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-white/5 border border-stone-200/80 dark:border-white/10 space-y-1">
                    <span className="font-bold text-xs block text-[#1a241b] dark:text-white">🪟 Specific Window</span>
                    <p className="text-[11px] text-[#5a6b5c] dark:text-[#8ca18f]">Shares only one specific application or document.</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-white/5 border border-stone-200/80 dark:border-white/10 space-y-1">
                    <span className="font-bold text-xs block text-[#1a241b] dark:text-white">🌐 Browser Tab</span>
                    <p className="text-[11px] text-[#5a6b5c] dark:text-[#8ca18f]">Shares a single tab with optional tab audio.</p>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestScreen}
                    disabled={isTesting}
                    className="px-4 py-2 rounded-xl bg-[#528d5a] hover:bg-[#43754a] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>Launch Screen Share Test</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openPopoutWindow()}
                    className="px-3.5 py-2 rounded-xl bg-stone-100 dark:bg-white/10 hover:bg-stone-200 dark:hover:bg-white/20 text-[#1a241b] dark:text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Standalone Presenter Window</span>
                  </button>
                </div>
              </div>

              {/* Mac Screen Share Specific Instructions */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                <span className="font-bold text-xs text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                  <Laptop className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Important for macOS Users (Screen Recording Permission)</span>
                </span>
                <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                  If the browser shows an empty screen or permission error when sharing on a Mac:
                </p>
                <ol className="list-decimal list-inside text-xs text-amber-900/90 dark:text-amber-200/90 space-y-1">
                  <li>Open <strong>Apple menu ()</strong> &rarr; <strong>System Settings</strong>.</li>
                  <li>Click <strong>Privacy &amp; Security</strong> &rarr; <strong>Screen Recording</strong>.</li>
                  <li>Ensure your browser (e.g. Google Chrome, Brave, Arc, Edge) is toggled <strong>ON</strong>.</li>
                  <li>Restart or reload your browser to apply.</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 3: BACKGROUND & WAKE LOCK */}
          {activeTab === 'background' && (
            <div className="space-y-4">
              {/* Keep Awake */}
              <div className="p-4 rounded-2xl bg-stone-50 dark:bg-white/5 border border-stone-200/60 dark:border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Sun className="w-5 h-5 text-amber-500" />
                    <div>
                      <h4 className="font-bold text-xs text-[#1a241b] dark:text-white">Screen Wake Lock (No Sleep Mode)</h4>
                      <p className="text-[11px] text-[#5a6b5c] dark:text-[#8ca18f]">Prevents screens from dimming during calls</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleWakeLock()}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      permissions.wakeLock
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-[#528d5a] hover:bg-[#43754a] text-white'
                    }`}
                  >
                    {permissions.wakeLock ? 'Enabled (Awake)' : 'Enable Wake Lock'}
                  </button>
                </div>
                <p className="text-xs text-[#5a6b5c] dark:text-[#8ca18f] leading-relaxed">
                  Screen Wake Lock prevents your laptop, desktop, or mobile device from automatically going into energy sleep mode while you are presenting, speaking, or watching meetings.
                </p>
              </div>

              {/* Background Audio & Visibility */}
              <div className="p-4 rounded-2xl bg-stone-50 dark:bg-white/5 border border-stone-200/60 dark:border-white/10 space-y-3">
                <div className="flex items-center gap-2.5">
                  <Volume2 className="w-5 h-5 text-[#528d5a]" />
                  <div>
                    <h4 className="font-bold text-xs text-[#1a241b] dark:text-white">Background Audio &amp; Tab Optimization</h4>
                    <p className="text-[11px] text-[#5a6b5c] dark:text-[#8ca18f]">
                      Status: {permissions.isTabInBackground ? 'Tab is in background' : 'Tab is active and focused'}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-[#5a6b5c] dark:text-[#8ca18f] leading-relaxed">
                  WebRTC audio and microphone processing continues smoothly even when you switch to other desktop applications, documents, or browser tabs.
                </p>
              </div>

              {/* Floating Picture-in-Picture */}
              <div className="p-4 rounded-2xl bg-stone-50 dark:bg-white/5 border border-stone-200/60 dark:border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Tv className="w-5 h-5 text-indigo-500" />
                    <div>
                      <h4 className="font-bold text-xs text-[#1a241b] dark:text-white">Picture-in-Picture Floating Window</h4>
                      <p className="text-[11px] text-[#5a6b5c] dark:text-[#8ca18f]">Keep watching video while working in other tabs</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleTestPip}
                    className="px-3.5 py-1.5 rounded-xl bg-stone-100 dark:bg-white/10 hover:bg-stone-200 dark:hover:bg-white/20 text-xs font-bold text-[#1a241b] dark:text-white transition-colors cursor-pointer"
                  >
                    Test PiP Window
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: BROWSER & OS GUIDES */}
          {activeTab === 'guides' && (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-stone-50 dark:bg-white/5 border border-stone-200/60 dark:border-white/10 space-y-2">
                <span className="font-bold text-xs text-[#1a241b] dark:text-white block">
                  Google Chrome / Brave / Microsoft Edge / Opera
                </span>
                <ol className="list-decimal list-inside text-xs text-[#5a6b5c] dark:text-[#8ca18f] space-y-1">
                  <li>Click the <strong>🔒 Lock / Tune Settings</strong> icon at the left of the URL address bar.</li>
                  <li>Ensure <strong>Camera</strong>, <strong>Microphone</strong>, and <strong>Notifications</strong> are set to <strong>Allow</strong>.</li>
                  <li>Click <em>Reload page</em> or click Refresh in the modal footer.</li>
                </ol>
              </div>

              <div className="p-4 rounded-2xl bg-stone-50 dark:bg-white/5 border border-stone-200/60 dark:border-white/10 space-y-2">
                <span className="font-bold text-xs text-[#1a241b] dark:text-white block">
                  Apple Safari (macOS &amp; iOS)
                </span>
                <ol className="list-decimal list-inside text-xs text-[#5a6b5c] dark:text-[#8ca18f] space-y-1">
                  <li>On Mac: In top menu bar, click <strong>Safari</strong> &rarr; <strong>Settings for This Website</strong>.</li>
                  <li>Set <strong>Camera</strong>, <strong>Microphone</strong>, and <strong>Pop-up Windows</strong> to <strong>Allow</strong>.</li>
                  <li>On iOS / iPadOS: Tap <strong>aA</strong> in the URL bar &rarr; <strong>Website Settings</strong> &rarr; Allow.</li>
                </ol>
              </div>

              <div className="p-4 rounded-2xl bg-stone-50 dark:bg-white/5 border border-stone-200/60 dark:border-white/10 space-y-2">
                <span className="font-bold text-xs text-[#1a241b] dark:text-white block">
                  Windows 10 / Windows 11 System Privacy
                </span>
                <ol className="list-decimal list-inside text-xs text-[#5a6b5c] dark:text-[#8ca18f] space-y-1">
                  <li>Open <strong>Start</strong> &rarr; <strong>Settings</strong> &rarr; <strong>Privacy &amp; Security</strong>.</li>
                  <li>Under <em>App permissions</em>, select <strong>Camera</strong> and <strong>Microphone</strong>.</li>
                  <li>Make sure <em>"Let desktop apps access your camera/microphone"</em> is turned <strong>ON</strong>.</li>
                </ol>
              </div>
            </div>
          )}

          {/* Test Feedback Notice */}
          {testResult && (
            <div className="p-3.5 rounded-2xl bg-stone-100 dark:bg-white/10 text-xs text-[#1a241b] dark:text-white flex items-center justify-between gap-3 animate-in fade-in">
              <span className="leading-snug">{testResult}</span>
              <button
                type="button"
                onClick={() => setTestResult(null)}
                className="text-xs font-bold text-stone-500 hover:text-stone-800 dark:hover:text-white cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-stone-100 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={async () => {
              await checkAllPermissions();
              if (onRefreshMedia) onRefreshMedia();
            }}
            className="px-3.5 py-2 rounded-xl bg-stone-100 dark:bg-white/10 hover:bg-stone-200 dark:hover:bg-white/20 text-[#1a241b] dark:text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Re-check All Permissions</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-[#528d5a] hover:bg-[#43754a] text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
