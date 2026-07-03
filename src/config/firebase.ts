import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  initializeAuth, 
  signInWithEmailAndPassword as fbSignIn,
  createUserWithEmailAndPassword as fbCreateUser,
  signOut as fbSignOut,
  onAuthStateChanged as fbOnAuthStateChanged
} from 'firebase/auth';
// @ts-ignore: getReactNativePersistence has no typing in the web entrypoint but resolves correctly in Metro
import { getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ==========================================
// CONFIGURATION - REPLACE WITH YOUR FIREBASE KEYS FOR LIVE DEPLOYMENT
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyC9oSIlkzBOyjhqyQero_6wvcDRRVluLXI",
  authDomain: "lariyukguys.firebaseapp.com",
  projectId: "lariyukguys",
  storageBucket: "lariyukguys.firebasestorage.app",
  messagingSenderId: "391978218183",
  appId: "1:391978218183:web:c5106e46aa84675888c4e2"
};

// Check if Firebase configuration is still the default placeholders
const isPlaceholderConfig = 
  firebaseConfig.apiKey === "YOUR_API_KEY_HERE" || 
  firebaseConfig.projectId === "YOUR_PROJECT_ID";

export let auth: any;
export let db: any;
export let isMock = false;

if (isPlaceholderConfig) {
  console.log("⚠️ Lari Yuk Running in [MOCK MODE] - Local simulation active.");
  isMock = true;
  
  // Custom mock implementations for zero-setup instant running
  const mockListeners: ((user: any) => void)[] = [];
  let currentUser: any = null;

  // Initialize from async storage if exists
  AsyncStorage.getItem('@lariyuk_mock_user').then(userStr => {
    if (userStr) {
      currentUser = JSON.parse(userStr);
      mockListeners.forEach(cb => cb(currentUser));
    }
  });

  auth = {
    currentUser: null,
    signInWithEmailAndPassword: async (email: string, _: string) => {
      const name = email.split('@')[0];
      const mockUser = {
        uid: 'mock-user-123',
        email,
        displayName: name.charAt(0).toUpperCase() + name.slice(1),
        createdAt: new Date().toISOString()
      };
      currentUser = mockUser;
      auth.currentUser = mockUser;
      await AsyncStorage.setItem('@lariyuk_mock_user', JSON.stringify(mockUser));
      mockListeners.forEach(cb => cb(mockUser));
      return { user: mockUser };
    },
    createUserWithEmailAndPassword: async (email: string, _: string) => {
      const name = email.split('@')[0];
      const mockUser = {
        uid: 'mock-user-123',
        email,
        displayName: name.charAt(0).toUpperCase() + name.slice(1),
        createdAt: new Date().toISOString()
      };
      currentUser = mockUser;
      auth.currentUser = mockUser;
      await AsyncStorage.setItem('@lariyuk_mock_user', JSON.stringify(mockUser));
      mockListeners.forEach(cb => cb(mockUser));
      return { user: mockUser };
    },
    signOut: async () => {
      currentUser = null;
      auth.currentUser = null;
      await AsyncStorage.removeItem('@lariyuk_mock_user');
      mockListeners.forEach(cb => cb(null));
    },
    onAuthStateChanged: (callback: (user: any) => void) => {
      mockListeners.push(callback);
      // Immediately invoke with current state
      setTimeout(() => callback(currentUser), 10);
      return () => {
        const index = mockListeners.indexOf(callback);
        if (index > -1) mockListeners.splice(index, 1);
      };
    }
  };

  db = {
    isMockDb: true
  };
} else {
  // Initialize Real Firebase
  let app;
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }

  // Persistent React Native Auth initialization
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });

  db = getFirestore(app);
}

// Wrapper Helper Functions that automatically switch between Mock and Firebase
export const loginUser = async (email: string, pass: string) => {
  if (isMock) {
    return await auth.signInWithEmailAndPassword(email, pass);
  } else {
    return await fbSignIn(auth, email, pass);
  }
};

export const registerUser = async (email: string, pass: string) => {
  if (isMock) {
    return await auth.createUserWithEmailAndPassword(email, pass);
  } else {
    return await fbCreateUser(auth, email, pass);
  }
};

export const logoutUser = async () => {
  if (isMock) {
    return await auth.signOut();
  } else {
    return await fbSignOut(auth);
  }
};

export const subscribeToAuth = (callback: (user: any) => void) => {
  if (isMock) {
    return auth.onAuthStateChanged(callback);
  } else {
    return fbOnAuthStateChanged(auth, callback);
  }
};
