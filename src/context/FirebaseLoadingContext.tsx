import React, { createContext, useContext, useState, useEffect, type FC, type ReactNode } from 'react';
import { registerConnectionTestListener } from '../firebase';

interface FirebaseLoadingContextType {
  isVerifyingPermissions: boolean;
  setIsVerifyingPermissions: (val: boolean) => void;
  activeFetchesCount: number;
  startFetch: () => void;
  endFetch: () => void;
  trackPromise: <T>(promise: Promise<T>) => Promise<T>;
  isLoading: boolean;
}

const FirebaseLoadingContext = createContext<FirebaseLoadingContextType | undefined>(undefined);

export const FirebaseLoadingProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [isVerifyingPermissions, setIsVerifyingPermissions] = useState(true);
  const [activeFetchesCount, setActiveFetchesCount] = useState(0);

  useEffect(() => {
    registerConnectionTestListener(() => {
      setIsVerifyingPermissions(false);
    });
  }, []);

  const startFetch = () => setActiveFetchesCount(prev => prev + 1);
  const endFetch = () => setActiveFetchesCount(prev => Math.max(0, prev - 1));

  const trackPromise = <T,>(promise: Promise<T>): Promise<T> => {
    startFetch();
    return promise.finally(() => {
      endFetch();
    });
  };

  const isLoading = isVerifyingPermissions || activeFetchesCount > 0;

  return (
    <FirebaseLoadingContext.Provider
      value={{
        isVerifyingPermissions,
        setIsVerifyingPermissions,
        activeFetchesCount,
        startFetch,
        endFetch,
        trackPromise,
        isLoading
      }}
    >
      {children}
    </FirebaseLoadingContext.Provider>
  );
};

export const useFirebaseLoading = () => {
  const context = useContext(FirebaseLoadingContext);
  if (!context) {
    throw new Error('useFirebaseLoading must be used within a FirebaseLoadingProvider');
  }
  return context;
};
