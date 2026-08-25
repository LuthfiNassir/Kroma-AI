import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  collection 
} from "firebase/firestore";
import { AnalysisSession } from "./types";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId
);

const app = isFirebaseConfigured
  ? getApps().length > 0 
    ? getApp() 
    : initializeApp(firebaseConfig)
  : null;

const db = app ? getFirestore(app) : null;

const LOCAL_STORAGE_KEY = "ai_data_analyst_sessions";

// Helper for local storage fallback
function getLocalSessions(): AnalysisSession[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setLocalSessions(sessions: AnalysisSession[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sessions));
  } catch (err) {
    console.error("Failed to write to localStorage:", err);
  }
}

export async function saveSession(session: AnalysisSession): Promise<void> {
  if (db) {
    try {
      const docRef = doc(db, "sessions", session.sessionId);
      await setDoc(docRef, session);
      return;
    } catch (err) {
      console.warn("Firestore save failed, falling back to local storage:", err);
    }
  }
  
  // Fallback
  const sessions = getLocalSessions();
  const index = sessions.findIndex((s) => s.sessionId === session.sessionId);
  if (index >= 0) {
    sessions[index] = session;
  } else {
    sessions.unshift(session);
  }
  setLocalSessions(sessions);
}

export async function fetchSessions(): Promise<AnalysisSession[]> {
  if (db) {
    try {
      const colRef = collection(db, "sessions");
      const snapshot = await getDocs(colRef);
      const sessions: AnalysisSession[] = [];
      snapshot.forEach((docSnap) => {
        sessions.push(docSnap.data() as AnalysisSession);
      });
      // Sort newest first
      return sessions.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (err) {
      console.warn("Firestore fetch failed, falling back to local storage:", err);
    }
  }

  return getLocalSessions().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function fetchSessionById(id: string): Promise<AnalysisSession | null> {
  if (db) {
    try {
      const docRef = doc(db, "sessions", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as AnalysisSession;
      }
    } catch (err) {
      console.warn("Firestore fetch by ID failed, falling back to local storage:", err);
    }
  }

  const sessions = getLocalSessions();
  return sessions.find((s) => s.sessionId === id) || null;
}

export async function deleteSession(id: string): Promise<void> {
  if (db) {
    try {
      const docRef = doc(db, "sessions", id);
      await deleteDoc(docRef);
      return;
    } catch (err) {
      console.warn("Firestore delete failed, falling back to local storage:", err);
    }
  }

  const sessions = getLocalSessions().filter((s) => s.sessionId !== id);
  setLocalSessions(sessions);
}
