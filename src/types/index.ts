export interface NavLinkItem {
  name: string;
  href: string;
}

export interface FaqItem {
  question: string;
  answer: string;
  category?: string;
}

export interface FeatureItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  badge?: string;
  details?: string[];
}

export interface UserSettings {
  meeting?: {
    defaultAudioDeviceId?: string;
    defaultVideoDeviceId?: string;
    muteMicOnJoin?: boolean;
    turnOffCameraOnJoin?: boolean;
    autoCopyLink?: boolean;
    mirrorVideo?: boolean;
    playJoinSound?: boolean;
  };
  notifications?: {
    meetingInvitations?: boolean;
    meetingReminders?: boolean;
    participantJoined?: boolean;
    contactAlerts?: boolean;
    chatMessages?: boolean;
    soundEnabled?: boolean;
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  timeZone?: string;
  isOnline?: boolean;
  lastSeen?: any;
  settings?: UserSettings;
}

export interface MeetingSettings {
  allowParticipantsBeforeHost: boolean;
  muteParticipantsOnJoin: boolean;
  allowScreenSharing: boolean;
  allowChat: boolean;
}

export interface Meeting {
  id: string;
  hostId: string;
  hostName: string;
  title: string;
  code: string;
  meetingUrl?: string;
  scheduledFor?: any; // Firestore Timestamp or Date or string
  startedAt?: any;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled' | 'ended';
  duration?: string;
  durationMinutes?: number;
  participantCount?: number;
  participantLimit?: number;
  participantIds?: string[];
  settings?: MeetingSettings;
  createdAt: any;
  endedAt?: any;
  password?: string;
  description?: string;
}

export interface MeetingParticipant {
  id: string;
  userId?: string | null;
  name: string;
  email?: string | null;
  avatar?: string | null;
  isHost?: boolean;
  status?: 'joined' | 'left' | 'reconnecting';
  audioEnabled?: boolean;
  videoEnabled?: boolean;
  isScreenSharing?: boolean;
  isHandRaised?: boolean;
  isRemoved?: boolean;
  joinedAt?: any;
  leftAt?: any;
  lastSeen?: any;
  duration?: string;
  durationMinutes?: number;
}

export interface Contact {
  id: string;
  userId: string;
  contactUserId?: string;
  name: string;
  email: string;
  avatar?: string;
  note?: string;
  isOnline?: boolean;
  lastSeen?: any;
  createdAt: any;
}

export interface ConversationParticipantMeta {
  name: string;
  email: string;
  avatar?: string;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  participants: {
    [userId: string]: ConversationParticipantMeta;
  };
  lastMessage?: {
    text: string;
    senderId: string;
    senderName: string;
    createdAt: any;
    read: boolean;
    meetingInvite?: {
      meetingId: string;
      title: string;
      code: string;
    };
  } | null;
  unreadCounts?: {
    [userId: string]: number;
  };
  updatedAt: any;
  createdAt?: any;
}

export interface DirectMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderEmail?: string;
  text: string;
  read: boolean;
  meetingInvite?: {
    meetingId: string;
    title: string;
    code: string;
  };
  createdAt: any;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'meeting' | 'reminder' | 'join' | 'removed' | 'ended' | 'contact' | 'invite' | 'system';
  read: boolean;
  createdAt: any;
  link?: string;
  actionUrl?: string;
  meetingCode?: string;
  senderName?: string;
  senderAvatar?: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  channelId: string;
  senderName: string;
  senderEmail: string;
  text: string;
  createdAt: any;
}

export interface ActivityLog {
  id: string;
  type: 'user_registered' | 'meeting_created' | 'meeting_started' | 'participant_joined' | 'participant_left' | 'meeting_completed' | 'system_broadcast' | 'user_login';
  title: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  meetingId?: string;
  meetingCode?: string;
  details?: Record<string, any>;
  createdAt: any;
}

export interface SystemSetting {
  id?: string;
  maintenanceMode: boolean;
  allowPublicRegistrations?: boolean;
  maxMeetingDuration?: number;
  maxParticipants?: number;
  announcementBanner?: string;
  updatedAt?: any;
  updatedBy?: string;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalMeetings: number;
  activeMeetings: number;
  completedMeetings: number;
}

