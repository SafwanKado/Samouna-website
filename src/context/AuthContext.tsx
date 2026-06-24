import React, { createContext, useContext, useState, useEffect, type FC, type ReactNode } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, type User, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { useToast } from './ToastContext';
import { useNavigate } from 'react-router-dom';

interface UserProfile {
  uid: string;
  email: string;
  name: string;
  phone: string;
  role: 'customer' | 'owner' | 'driver' | 'admin';
  bakeryId?: string | null;
  favorites?: string[];
  active: boolean;
  createdAt: string;
  photoUrl?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = React.useState<User | null>(null);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const { showToast } = useToast();
  const navigate = useNavigate();

  React.useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }

      if (firebaseUser) {
        const docRef = doc(db, 'users', firebaseUser.uid);
        
        unsubscribeProfile = onSnapshot(docRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            if (data.active === false) {
              await firebaseSignOut(auth);
              setUser(null);
              setProfile(null);
              showToast('Your account has been suspended. Contact support.', 'error');
              navigate('/auth');
              return;
            }
            setProfile(data);
          } else {
            setProfile(null);
          }
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const signOut = () => auth.signOut();

  const refreshProfile = async () => {
    if (user) {
      const docSnap = await getDoc(doc(db, 'users', user.uid));
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        if (data.active === false) {
          await firebaseSignOut(auth);
          setProfile(null);
          showToast('Your account has been suspended. Contact support.', 'error');
          navigate('/auth');
          return;
        }
        setProfile(data);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
