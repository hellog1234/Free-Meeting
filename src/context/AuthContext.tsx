import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { logActivity } from '../lib/activityLogger';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserData: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  firebaseUser: null,
  isAuthenticated: false,
  loading: true,
  login: async () => {},
  signup: async () => {},
  loginWithGoogle: async () => {},
  logout: async () => {},
  resetPassword: async () => {},
  updateUserData: () => {},
});

export const formatAuthError = (error: any): string => {
  if (!error) return 'An unknown error occurred.';
  const code = error.code || '';
  
  switch (code) {
    case 'auth/email-already-in-use':
      return 'This email address is already registered. Please login instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters.';
    case 'auth/user-not-found':
      return 'No account found with this email address.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please verify your credentials.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Access temporarily blocked for security. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network connection failed. Please check your internet connection.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in popup was closed before completing.';
    case 'auth/popup-blocked':
      return 'Google sign-in popup was blocked by your browser. Please allow popups for this site.';
    case 'auth/cancelled-popup-request':
      return 'Google sign-in request was cancelled. Please try again.';
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with this email using another login method.';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized for Google Sign-In in Firebase Console.';
    default:
      if (error.message) {
        return error.message.replace(/^Firebase:\s*/i, '').replace(/\s*\([^)]*\)$/, '');
      }
      return 'Authentication failed. Please try again.';
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    // Safety timeout to ensure loading never gets permanently stuck
    const safetyTimer = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
      }
    }, 1500);

    const unsubscribe = onAuthStateChanged(auth, async (currentFbUser) => {
      if (!isMounted) return;
      clearTimeout(safetyTimer);
      setFirebaseUser(currentFbUser);

      if (currentFbUser) {
        // Immediate fallback so UI unblocks instantly
        const fallbackName = currentFbUser.displayName || currentFbUser.email?.split('@')[0] || 'User';
        const initialUser: User = {
          id: currentFbUser.uid,
          name: fallbackName,
          email: currentFbUser.email || '',
          avatar: currentFbUser.photoURL || undefined,
          isOnline: true,
        };
        setUser(initialUser);
        setLoading(false);

        // Fetch detailed profile & update online presence in background
        try {
          const userDocRef = doc(db, 'users', currentFbUser.uid);
          const snapshot = await getDoc(userDocRef);
          if (snapshot.exists() && isMounted) {
            const data = snapshot.data();
            setUser({
              id: currentFbUser.uid,
              name: data.name || initialUser.name,
              email: data.email || initialUser.email,
              avatar: data.avatar || initialUser.avatar,
              timeZone: data.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
              settings: data.settings,
              isOnline: true,
              lastSeen: data.lastSeen,
            });
            // Update presence
            await setDoc(userDocRef, {
              uid: currentFbUser.uid,
              name: data.name || initialUser.name,
              email: data.email || initialUser.email,
              avatar: data.avatar || initialUser.avatar || null,
              isOnline: true,
              lastSeen: serverTimestamp(),
              updatedAt: serverTimestamp(),
            }, { merge: true });
          } else {
            // Create user document if not existing
            await setDoc(userDocRef, {
              uid: currentFbUser.uid,
              name: initialUser.name,
              email: initialUser.email,
              avatar: initialUser.avatar || null,
              isOnline: true,
              lastSeen: serverTimestamp(),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            }, { merge: true });
          }
        } catch (err) {
          console.warn('Firestore profile lookup error:', err);
        }
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    // Heartbeat for online status
    const heartbeatInterval = setInterval(() => {
      if (auth.currentUser) {
        setDoc(doc(db, 'users', auth.currentUser.uid), {
          isOnline: true,
          lastSeen: serverTimestamp(),
        }, { merge: true }).catch(() => {});
      }
    }, 90000); // 90 seconds

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      clearInterval(heartbeatInterval);
      unsubscribe();
    };
  }, []);

  const signup = async (name: string, email: string, password: string): Promise<void> => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    
    const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
    const fbUser = userCredential.user;

    // Update display name in Firebase Auth
    try {
      await updateProfile(fbUser, { displayName: trimmedName });
    } catch (e) {
      console.warn('Could not update Auth display name:', e);
    }

    // Persist profile to Firestore
    try {
      await setDoc(doc(db, 'users', fbUser.uid), {
        uid: fbUser.uid,
        name: trimmedName,
        email: trimmedEmail,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      // Log registration activity
      logActivity('user_registered', `New user registered: ${trimmedName}`, {
        userId: fbUser.uid,
        userName: trimmedName,
        userEmail: trimmedEmail,
      });
    } catch (e) {
      console.error('Failed to create Firestore profile document:', e);
    }

    setUser({
      id: fbUser.uid,
      name: trimmedName,
      email: trimmedEmail,
    });
    setFirebaseUser(fbUser);
  };

  const login = async (email: string, password: string): Promise<void> => {
    const trimmedEmail = email.trim();
    const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, password);
    const fbUser = userCredential.user;

    try {
      const userDocRef = doc(db, 'users', fbUser.uid);
      const snapshot = await getDoc(userDocRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        setUser({
          id: fbUser.uid,
          name: data.name || fbUser.displayName || 'User',
          email: data.email || fbUser.email || '',
          avatar: data.avatar || fbUser.photoURL || undefined,
        });
      } else {
        setUser({
          id: fbUser.uid,
          name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
          email: fbUser.email || '',
        });
      }
    } catch (e) {
      setUser({
        id: fbUser.uid,
        name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
        email: fbUser.email || '',
      });
    }
    setFirebaseUser(fbUser);
  };

  const loginWithGoogle = async (): Promise<void> => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const userCredential = await signInWithPopup(auth, provider);
    const fbUser = userCredential.user;

    const displayName = fbUser.displayName || fbUser.email?.split('@')[0] || 'User';
    const email = fbUser.email || '';
    const avatar = fbUser.photoURL || undefined;

    try {
      const userDocRef = doc(db, 'users', fbUser.uid);
      const snapshot = await getDoc(userDocRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        setUser({
          id: fbUser.uid,
          name: data.name || displayName,
          email: data.email || email,
          avatar: data.avatar || avatar,
          timeZone: data.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
          settings: data.settings,
          isOnline: true,
          lastSeen: data.lastSeen,
        });
        await setDoc(userDocRef, {
          isOnline: true,
          lastSeen: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } else {
        const newUserDoc = {
          uid: fbUser.uid,
          name: displayName,
          email: email,
          avatar: avatar || null,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
          isOnline: true,
          lastSeen: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await setDoc(userDocRef, newUserDoc, { merge: true });
        setUser({
          id: fbUser.uid,
          name: displayName,
          email: email,
          avatar: avatar,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
          isOnline: true,
        });
      }
    } catch (err) {
      console.warn('Google login Firestore profile sync warning:', err);
      setUser({
        id: fbUser.uid,
        name: displayName,
        email: email,
        avatar: avatar,
        isOnline: true,
      });
    }

    setFirebaseUser(fbUser);
  };

  const logout = async (): Promise<void> => {
    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'users', auth.currentUser.uid), {
          isOnline: false,
          lastSeen: serverTimestamp(),
        }, { merge: true });
      } catch (e) {}
    }
    await signOut(auth);
    setFirebaseUser(null);
    setUser(null);
  };

  const resetPassword = async (email: string): Promise<void> => {
    const trimmedEmail = email.trim();
    await sendPasswordResetEmail(auth, trimmedEmail);
  };

  const updateUserData = (updates: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : null));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        isAuthenticated: !!firebaseUser,
        loading,
        login,
        signup,
        loginWithGoogle,
        logout,
        resetPassword,
        updateUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
