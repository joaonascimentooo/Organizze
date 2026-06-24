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
import { arrayUnion, doc, onSnapshot, setDoc } from "firebase/firestore";
import { auth, db, hasFirebaseConfig } from "@/lib/firebase";
import { emptyMonth, FuturePlanningData, MonthData, PlannedPurchase } from "@/lib/types";

const localKey = (month: string) => `organizze:${month}`;
const localFutureKey = "organizze:planned:future";

function firestoreSafe(data: MonthData): MonthData {
  return JSON.parse(JSON.stringify(data)) as MonthData;
}

export function useFinances(month: string) {
  const [data, setData] = useState<MonthData>(emptyMonth());
  const [futurePlanned, setFuturePlanned] = useState<PlannedPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(() => auth?.currentUser ?? null);
  const [authReady, setAuthReady] = useState(() => !hasFirebaseConfig || Boolean(auth?.currentUser));
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasFirebaseConfig || !auth || !db) {
      const timer = window.setTimeout(() => {
        const saved = localStorage.getItem(localKey(month));
        const savedMonth = saved ? JSON.parse(saved) as MonthData : emptyMonth();
        const savedFuture = JSON.parse(localStorage.getItem(localFutureKey) || "[]") as PlannedPurchase[];
        const legacyFuture = savedMonth.planned.filter((item) => item.timing === "future");
        const nextFuture = [...savedFuture, ...legacyFuture]
          .filter((item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index)
          .map((item) => ({ ...item, timing: "future" as const, startsInMonth: item.startsInMonth || month }));
        const nextMonth = { ...savedMonth, planned: savedMonth.planned.filter((item) => item.timing !== "future") };
        if (legacyFuture.length > 0) {
          localStorage.setItem(localKey(month), JSON.stringify(nextMonth));
          localStorage.setItem(localFutureKey, JSON.stringify(nextFuture));
        }
        setData(nextMonth);
        setFuturePlanned(nextFuture);
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
    const currentDb = db;
    const reference = doc(currentDb, "users", user.uid, "months", month);
    return onSnapshot(reference, (snapshot) => {
      const savedMonth = snapshot.exists() ? (snapshot.data() as MonthData) : emptyMonth();
      const legacyFuture = savedMonth.planned.filter((item) => item.timing === "future");
      const nextMonth = { ...savedMonth, planned: savedMonth.planned.filter((item) => item.timing !== "future") };
      setData(nextMonth);
      if (legacyFuture.length > 0) {
        const planningReference = doc(currentDb, "users", user.uid, "preferences", "planning");
        void setDoc(planningReference, { planned: arrayUnion(...legacyFuture.map((item) => ({ ...item, timing: "future", startsInMonth: item.startsInMonth || month }))) }, { merge: true });
        void setDoc(reference, firestoreSafe(nextMonth));
      }
      setLoading(false);
    });
  }, [month, user]);

  useEffect(() => {
    if (!hasFirebaseConfig || !user || !db) return;
    const reference = doc(db, "users", user.uid, "preferences", "planning");
    return onSnapshot(reference, (snapshot) => {
      const saved = snapshot.exists() ? (snapshot.data() as FuturePlanningData).planned : [];
      setFuturePlanned((saved || []).map((item) => ({ ...item, timing: "future" })));
    });
  }, [user]);

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

  const updateFuturePlanned = useCallback((recipe: (current: PlannedPurchase[]) => PlannedPurchase[]) => {
    setFuturePlanned((current) => {
      const next = recipe(current).map((item) => ({ ...item, timing: "future" as const }));
      if (!hasFirebaseConfig) localStorage.setItem(localFutureKey, JSON.stringify(next));
      if (hasFirebaseConfig && user && db) {
        void setDoc(doc(db, "users", user.uid, "preferences", "planning"), { planned: next });
      }
      return next;
    });
  }, [user]);

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

  return { data, futurePlanned, update, updateFuturePlanned, loading, cloudEnabled: hasFirebaseConfig, user, authReady, authError, signInWithGoogle, signOut };
}
