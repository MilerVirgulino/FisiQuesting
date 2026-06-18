import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase-init";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const userRef = doc(db, "users", user.uid);
      const snapshot = await getDoc(userRef);
      setProfile(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
      setLoading(false);
    });
  }, []);

  async function refreshProfile() {
    if (!auth.currentUser) return;
    const userRef = doc(db, "users", auth.currentUser.uid);
    const snapshot = await getDoc(userRef);
    setProfile(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
  }

  const value = useMemo(
    () => ({
      firebaseUser,
      profile,
      loading,
      isAdmin: profile?.role === "admin",
      isApproved: profile?.status === "approved",
      refreshProfile,
      register,
      login,
      logout: () => signOut(auth)
    }),
    [firebaseUser, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth precisa estar dentro de AuthProvider.");
  }
  return context;
}

async function register({ name, email, password }) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName: name });

  await setDoc(doc(db, "users", credential.user.uid), {
    name,
    email,
    role: "student",
    status: "pending",
    totalXp: 0,
    coins: 0,
    ownedAvatarItems: [],
    completedMissionIds: [],
    streak: 0,
    bestStreak: 0,
    solvedCount: 0,
    correctCount: 0,
    grade: "",
    className: "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return credential.user;
}

function login({ email, password }) {
  return signInWithEmailAndPassword(auth, email, password);
}
