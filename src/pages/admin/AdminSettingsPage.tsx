import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  ShieldCheck, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Database, 
  Lock, 
  RefreshCw,
  Sliders,
  Server
} from 'lucide-react';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { SystemSetting } from '../../types';
import { ADMIN_EMAIL } from '../../components/admin/AdminGuard';
import { logActivity } from '../../lib/activityLogger';

export const AdminSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<SystemSetting>({
    maintenanceMode: false,
    allowPublicRegistrations: true,
    maxMeetingDuration: 120,
    maxParticipants: 50,
    announcementBanner: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pingStatus, setPingStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [pingLatency, setPingLatency] = useState<number | null>(null);

  // Listen to live system settings in Firestore
  useEffect(() => {
    try {
      const settingDocRef = doc(db, 'system_settings', 'config');
      const unsub = onSnapshot(settingDocRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setSettings({
            maintenanceMode: Boolean(data.maintenanceMode),
            allowPublicRegistrations: data.allowPublicRegistrations !== false,
            maxMeetingDuration: Number(data.maxMeetingDuration) || 120,
            maxParticipants: Number(data.maxParticipants) || 50,
            announcementBanner: data.announcementBanner || '',
            updatedAt: data.updatedAt,
            updatedBy: data.updatedBy,
          });
        }
        setLoading(false);
      }, (err) => {
        console.warn('System settings listener error:', err);
        setLoading(false);
      });

      return () => unsub();
    } catch (e) {
      console.warn('Error setting up settings listener:', e);
      setLoading(false);
    }
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const settingDocRef = doc(db, 'system_settings', 'config');
      await setDoc(settingDocRef, {
        maintenanceMode: Boolean(settings.maintenanceMode),
        allowPublicRegistrations: Boolean(settings.allowPublicRegistrations),
        maxMeetingDuration: Number(settings.maxMeetingDuration) || 120,
        maxParticipants: Number(settings.maxParticipants) || 50,
        announcementBanner: settings.announcementBanner?.trim() || '',
        updatedAt: serverTimestamp(),
        updatedBy: ADMIN_EMAIL,
      }, { merge: true });

      logActivity('system_broadcast', 'System configuration updated by administrator', {
        details: { ...settings }
      });

      setSuccess('Platform settings have been successfully updated and synced across all clients.');
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      console.error('Error updating settings:', err);
      setError(err?.message || 'Failed to update system settings.');
    } finally {
      setSaving(false);
    }
  };

  const testFirestorePing = async () => {
    setPingStatus('testing');
    const start = performance.now();
    try {
      const pingDocRef = doc(db, 'system_settings', 'config');
      await getDoc(pingDocRef);
      const end = performance.now();
      setPingLatency(Math.round(end - start));
      setPingStatus('success');
    } catch (err) {
      console.error('Ping test error:', err);
      setPingStatus('error');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-[#e2ede4] p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-[#1a241b] font-['Outfit']">
              Platform Configuration & Settings
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#eff5f0] text-[#3d6e44] border border-[#cddfd0]">
              Global Controls
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#5a6b5c] mt-1">
            Global operational controls, security policies, and real-time parameters for FreeMeet.
          </p>
        </div>
      </div>

      {success && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Settings Form */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-[#e2ede4] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-[#e2ede4]">
            <div className="w-8 h-8 rounded-xl bg-[#eff5f0] text-[#528d5a] flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-[#1a241b] font-['Outfit']">
              Operational Parameters
            </h3>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-5 text-xs">
            {/* Maintenance Mode Toggle */}
            <div className="p-4 rounded-2xl bg-[#f8f9f8] border border-[#e2ede4] flex items-center justify-between">
              <div>
                <span className="font-bold text-[#1a241b] block">Maintenance Mode</span>
                <span className="text-[11px] text-[#5a6b5c]">
                  Temporarily pause new meeting creation while system maintenance is performed.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.maintenanceMode}
                  onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
              </label>
            </div>

            {/* Allow Public Registrations */}
            <div className="p-4 rounded-2xl bg-[#f8f9f8] border border-[#e2ede4] flex items-center justify-between">
              <div>
                <span className="font-bold text-[#1a241b] block">Allow New User Signups</span>
                <span className="text-[11px] text-[#5a6b5c]">
                  Allow new users to create accounts via email/password or Google Sign-In.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.allowPublicRegistrations}
                  onChange={(e) => setSettings({ ...settings, allowPublicRegistrations: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#528d5a]"></div>
              </label>
            </div>

            {/* Numeric Limits */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-[#1a241b] mb-1.5">
                  Max Meeting Duration (Minutes)
                </label>
                <input
                  type="number"
                  min="15"
                  max="1440"
                  value={settings.maxMeetingDuration || 120}
                  onChange={(e) => setSettings({ ...settings, maxMeetingDuration: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#f8f9f8] border border-[#e2ede4] text-[#1a241b] focus:outline-none focus:border-[#528d5a]"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#1a241b] mb-1.5">
                  Max Participants Per Room
                </label>
                <input
                  type="number"
                  min="2"
                  max="500"
                  value={settings.maxParticipants || 50}
                  onChange={(e) => setSettings({ ...settings, maxParticipants: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#f8f9f8] border border-[#e2ede4] text-[#1a241b] focus:outline-none focus:border-[#528d5a]"
                />
              </div>
            </div>

            {/* Global Announcement Banner */}
            <div>
              <label className="block font-semibold text-[#1a241b] mb-1.5">
                Global Platform Announcement Banner (Optional)
              </label>
              <input
                type="text"
                value={settings.announcementBanner || ''}
                onChange={(e) => setSettings({ ...settings, announcementBanner: e.target.value })}
                placeholder="e.g. System upgrade completed. All services operational."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#f8f9f8] border border-[#e2ede4] text-[#1a241b] focus:outline-none focus:border-[#528d5a]"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="py-3 px-6 rounded-xl bg-[#528d5a] hover:bg-[#437549] text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving Changes...' : 'Save Configuration'}</span>
            </button>
          </form>
        </div>

        {/* Security & Health Card */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl border border-[#e2ede4] p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#e2ede4]">
              <div className="w-8 h-8 rounded-xl bg-[#eff5f0] text-[#528d5a] flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-[#1a241b] font-['Outfit']">
                Admin Security
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-[#f8f9f8] border border-[#e2ede4] space-y-1">
                <span className="text-[10px] text-[#8ca18f] uppercase font-bold tracking-wider">Authorized Super Admin</span>
                <p className="font-mono text-emerald-800 font-bold">{ADMIN_EMAIL}</p>
              </div>

              <div className="p-3 rounded-2xl bg-[#f8f9f8] border border-[#e2ede4] space-y-1">
                <span className="text-[10px] text-[#8ca18f] uppercase font-bold tracking-wider">Firestore Security Rules</span>
                <p className="text-emerald-700 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Enforcing Token Verification</span>
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-[#f8f9f8] border border-[#e2ede4] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#8ca18f] uppercase font-bold tracking-wider">Database Connectivity</span>
                  {pingStatus === 'success' && (
                    <span className="text-[10px] text-emerald-700 font-mono font-bold">
                      {pingLatency}ms
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={testFirestorePing}
                  disabled={pingStatus === 'testing'}
                  className="w-full py-2 rounded-xl bg-[#eff5f0] hover:bg-[#e2ede4] text-[#3d6e44] font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${pingStatus === 'testing' ? 'animate-spin' : ''}`} />
                  <span>{pingStatus === 'testing' ? 'Testing Ping...' : 'Run Connectivity Ping'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
