import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebase';
import { ActivityLog } from '../types';

export const logActivity = async (
  type: ActivityLog['type'],
  title: string,
  extra: {
    meetingId?: string;
    meetingCode?: string;
    userName?: string;
    userEmail?: string;
    userId?: string;
    details?: Record<string, any>;
  } = {}
) => {
  try {
    const currentUser = auth.currentUser;
    const userId = extra.userId || currentUser?.uid || 'anonymous';
    const userEmail = extra.userEmail || currentUser?.email || 'guest@freemeet.app';
    const userName = extra.userName || currentUser?.displayName || userEmail.split('@')[0] || 'User';

    await addDoc(collection(db, 'activity_logs'), {
      type,
      title,
      userId,
      userEmail,
      userName,
      meetingId: extra.meetingId || null,
      meetingCode: extra.meetingCode || null,
      details: extra.details || {},
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    // Non-blocking for client experience
    console.warn('[ActivityLogger] Error recording activity:', error);
  }
};
