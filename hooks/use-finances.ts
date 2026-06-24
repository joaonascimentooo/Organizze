"use client";

import { useCallback, useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  linkWithPopup,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { auth, db, hasFirebaseConfig } from "@/lib/firebase";
import { emptyMonth, MonthData } from "@/lib/types";

const localKey = (month: string) => `organizze:${month}`;

function firestoreSafe(data: MonthData): MonthData {
  return JSON.parse(JSON.stringify(data)) as MonthData;
}

export function useFinances(month: string) {
  const [data, setData] = useState<MonthData>(emptyMonth());
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(() => auth?.currentUser ?? null);
  const [authReady, setAuthReady] = useState(() => !hasFirebaseConfig || Boolean(auth?.currentUser));
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasFirebaseConfig || !auth || !db) {
      const timer = window.setTimeout(() => {
        const saved = localStorage.getItem(localKey(month));
        setData(saved ? JSON.parse(saved) : emptyMonth());
        setLoading(false);
      }, 0);
      return () => window.clearTimeout(timer);
    }

    const currentAuth = auth;
    const unsubscribeAuth = onAuthStateChanged(currentAuth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
      if (!currentUser) {
        setData(emptyMonth());
        setLoading(false);
      }
    });

    return unsubscribeAuth;
  }, [month]);

  useEffect(() => {
    if (!hasFirebaseConfig || !user || !db) return;
    const reference = doc(db, "users", user.uid, "months", month);
    return onSnapshot(reference, (snapshot) => {
      setData(snapshot.exists() ? (snapshot.data() as MonthData) : emptyMonth());
      setLoading(false);
    });
  }, [month, user]);

  const update = useCallback((recipe: (current: MonthData) => MonthData) => {
    setData((current) => {
      const next = recipe(current);
      if (!hasFirebaseConfig) localStorage.setItem(localKey(month), JSON.stringify(next));
      if (hasFirebaseConfig && user && db) {
        void setDoc(doc(db, "users", user.uid, "months", month), firestoreSafe(next));
      }
      return next;
    });
  }, [month, user]);

  const signInWithGoogle = useCallback(async () => {
    if (!auth) {
      setAuthError("Configure o Firebase para habilitar o login com Google.");
      return;
    }
    setAuthError(null);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    try {
      if (auth.currentUser?.isAnonymous) {
        await linkWithPopup(auth.currentUser, provider);
      } else {
        await signInWithPopup(auth, provider);
      }
    } catch (error) {
      const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
      if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") {
        setAuthError(code === "auth/account-exists-with-different-credential"
          ? "Este e-mail já usa outra forma de login."
          : "Não foi possível entrar com o Google. Tente novamente.");
      }
    }
  }, []);

  const signOut = useCallback(async () => {
    if (auth) await firebaseSignOut(auth);
  }, []);

  return { data, update, loading, cloudEnabled: hasFirebaseConfig, user, authReady, authError, signInWithGoogle, signOut };
}
