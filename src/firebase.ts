import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth, browserLocalPersistence, browserSessionPersistence, inMemoryPersistence } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import firebaseConfig from '../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Use standard getFirestore if initializeFirestore fails or just use it directly
// In some AI Studio environments, experimentalForceLongPolling can actually cause issues
// depending on the project's internal network configuration.
const dbId = !firebaseConfig.firestoreDatabaseId || firebaseConfig.firestoreDatabaseId === '(default)'
  ? undefined
  : firebaseConfig.firestoreDatabaseId;

let dbInstance;
try {
  // Use long-polling first inside the preview sandbox to avoid WebSocket/gRPC blocks
  dbInstance = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    useFetchStreams: false,
  } as any, dbId);
} catch (e) {
  try {
    dbInstance = dbId ? getFirestore(app, dbId) : getFirestore(app);
  } catch (e2) {
    dbInstance = initializeFirestore(app, {}, dbId);
  }
}
export const db = dbInstance;

let authInstance;
try {
  authInstance = initializeAuth(app, {
    persistence: [browserLocalPersistence, browserSessionPersistence, inMemoryPersistence]
  });
} catch (e) {
  authInstance = getAuth(app);
}
export const auth = authInstance;

export const messaging = (() => {
  try {
    return getMessaging(app);
  } catch (e) {
    console.warn("Firebase Messaging is not supported or failed to initialize", e);
    return null;
  }
})();

export const requestForToken = async () => {
  if (!messaging) return null;
  try {
    const currentToken = await getToken(messaging, { 
      vapidKey: (import.meta as any).env.VITE_FIREBASE_VAPID_KEY 
    });
    if (currentToken) {
      return currentToken;
    } else {
      console.log('No registration token available. Request permission to generate one.');
      return null;
    }
  } catch (err) {
    console.log('An error occurred while retrieving token. ', err);
    return null;
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    if (!messaging) return;
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });

let storageInstance: any = null;
export const getStorageInstance = () => {
  if (!storageInstance) {
    try {
      storageInstance = getStorage(app);
    } catch (error) {
      console.error("Firebase Storage is not available. Please ensure it is enabled in your Firebase Console.", error);
      return null;
    }
  }
  return storageInstance;
};

let connectionTestCompleted = false;
const onConnectionTestCompleteCallbacks: (() => void)[] = [];

export function registerConnectionTestListener(callback: () => void) {
  if (connectionTestCompleted) {
    callback();
  } else {
    onConnectionTestCompleteCallbacks.push(callback);
  }
}

// Connection test as per guidelines
async function testConnection() {
  try {
    const testDoc = doc(db, 'test', 'connection');
    await getDocFromServer(testDoc);
    console.log("Firebase connection successful.");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firestore reported offline. Retrying with experimentalForceLongPolling...");
      try {
        console.error("Please check your Firebase configuration. Details: " + error.message);
      } catch (retryError) {
        console.error("Retry failed: ", retryError);
      }
    } else {
      console.error("Firebase connection test failed: ", error);
      // Automatically wrap permission error using the skill's handler
      const errStr = error instanceof Error ? error.message : String(error);
      if (errStr.includes("permission") || errStr.includes("Permission") || errStr.includes("forbidden")) {
        try {
          handleFirestoreError(error, OperationType.GET, 'test/connection');
        } catch (wrappedError) {
          // Re-throw or ignore if we want to avoid crashing at startup, 
          // but actually let's throw it to trigger ErrorBoundary diagnostic info
          throw wrappedError;
        }
      }
    }
  } finally {
    connectionTestCompleted = true;
    onConnectionTestCompleteCallbacks.forEach(cb => {
      try {
        cb();
      } catch (e) {
        console.error("Error running connection test callback:", e);
      }
    });
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
