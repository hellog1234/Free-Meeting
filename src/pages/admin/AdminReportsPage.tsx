import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Video, 
  Radio, 
  CheckCircle2, 
  Download, 
  Calendar,
  PieChart,
  ShieldCheck,
  Activity
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Meeting, User } from '../../types';

export const AdminReportsPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
        const uList: User[] = [];
        snapshot.forEach(docSnap => {
          const d = docSnap.data();
          uList.push({ id: docSnap.id, ...d } as User);
        });
        setUsers(uList);
      });

      const unsubMeetings = onSnapshot(collection(db, 'meetings'), (snapshot) => {
        const mList: Meeting[] = [];
        snapshot.forEach(docSnap => {
          const d = docSnap.data();
          mList.push({ id: docSnap.id, ...d } as Meeting);
        });
        setMeetings(mList);
        setLoading(false);
      });

      return () => {
        unsubUsers();
        unsubMeetings();
      };
    } catch (e) {
      console.warn('Reports listeners error:', e);
      setLoading(false);
    }
  }, []);

  const totalUsers = users.length;
  const onlineUsers = users.filter(u => u.isOnline).length;
  const offlineUsers = totalUsers - onlineUsers;
  const userOnlinePct = totalUsers > 0 ? Math.round((onlineUsers / totalUsers) * 100) : 0;

  const totalMeetings = meetings.length;
  const activeMeetings = meetings.filter(m => m.status === 'active').length;
  const completedMeetings = meetings.filter(m => m.status === 'completed' || m.status === 'ended').length;
  const scheduledMeetings = meetings.filter(m => m.status === 'scheduled').length;

  const exportReportJSON = () => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      reportTitle: 'FreeMeet Platform Live Administrative Report',
      summary: {
        totalUsers,
        onlineUsers,
        offlineUsers,
        userOnlinePct: `${userOnlinePct}%`,
        totalMeetings,
        activeMeetings,
        completedMeetings,
        scheduledMeetings,
      },
      usersSample: users.map(u => ({ id: u.id, name: u.name, email: u.email, isOnline: u.isOnline })),
      meetingsSample: meetings.map(m => ({ id: m.id, title: m.title, code: m.code, status: m.status, hostName: m.hostName })),
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(reportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `freemeet_analytics_report_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-[#e2ede4] p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-[#1a241b] font-['Outfit']">
              Platform Analytics & Reports
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#eff5f0] text-[#3d6e44] border border-[#cddfd0]">
              Real-time Metrics
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#5a6b5c] mt-1">
            Aggregated system metrics computed directly from Firebase Firestore records.
          </p>
        </div>
        <button
          type="button"
          onClick={exportReportJSON}
          className="px-4 py-2.5 rounded-xl bg-[#528d5a] hover:bg-[#437549] text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-2xs"
        >
          <Download className="w-4 h-4" />
          <span>Export Analytics (JSON)</span>
        </button>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Presence & Engagement Breakdown */}
        <div className="bg-white rounded-3xl border border-[#e2ede4] p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#e2ede4]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-[#1a241b] font-['Outfit']">
                User Presence Distribution
              </h3>
            </div>
            <span className="text-xs font-bold text-emerald-700">{userOnlinePct}% Active</span>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-[#5a6b5c]">Online Users ({onlineUsers})</span>
                <span className="text-emerald-700">{userOnlinePct}%</span>
              </div>
              <div className="h-3 w-full bg-[#eff5f0] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${userOnlinePct}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-[#f8f9f8] border border-[#e2ede4]">
                <div className="text-[10px] text-[#8ca18f] uppercase font-bold tracking-wider">Online Now</div>
                <div className="text-xl font-bold text-emerald-700 font-['Outfit'] mt-1">{onlineUsers}</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#f8f9f8] border border-[#e2ede4]">
                <div className="text-[10px] text-[#8ca18f] uppercase font-bold tracking-wider">Offline Accounts</div>
                <div className="text-xl font-bold text-[#5a6b5c] font-['Outfit'] mt-1">{offlineUsers}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Meeting Status Distribution */}
        <div className="bg-white rounded-3xl border border-[#e2ede4] p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#e2ede4]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#eff5f0] text-[#528d5a] flex items-center justify-center">
                <Video className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-[#1a241b] font-['Outfit']">
                Meeting Status Breakdown
              </h3>
            </div>
            <span className="text-xs font-bold text-[#3d6e44]">{totalMeetings} Total</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-100 text-center">
              <div className="text-[10px] text-rose-600 uppercase font-bold tracking-wider">Active</div>
              <div className="text-xl font-bold text-rose-700 font-['Outfit'] mt-1">{activeMeetings}</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-100 text-center">
              <div className="text-[10px] text-blue-600 uppercase font-bold tracking-wider">Completed</div>
              <div className="text-xl font-bold text-blue-700 font-['Outfit'] mt-1">{completedMeetings}</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-center">
              <div className="text-[10px] text-emerald-600 uppercase font-bold tracking-wider">Scheduled</div>
              <div className="text-xl font-bold text-emerald-700 font-['Outfit'] mt-1">{scheduledMeetings}</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#eff5f0] border border-[#cddfd0] text-xs text-[#3d6e44]">
            <strong>Real-time Note:</strong> All statistics update on the fly whenever hosts create, start, or conclude video meetings across the platform.
          </div>
        </div>
      </div>
    </div>
  );
};
