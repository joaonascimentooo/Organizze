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
import { emptyMonth, Expense, FuturePlanningData, IncomeChange, IncomePreferences, MonthData, PlannedPurchase } from "@/lib/types";

const localKey = (month: string) => `organizze:${month}`;
const localFutureKey = "organizze:planned:future";
const localIncomeKey = "organizze:preferences:income";
const emptyIncomePreferences = (): IncomePreferences => ({ salary: [], mealAllowance: [] });

function firestoreSafe(data: MonthData): MonthData {
  return JSON.parse(JSON.stringify(data)) as MonthData;
}

function normalizeMonthData(data?: Partial<MonthData>): MonthData {
  return {
    salary: data?.salary ?? 0,
    mealAllowance: data?.mealAllowance ?? 0,
    salaryOverride: data?.salaryOverride,
    mealAllowanceOverride: data?.mealAllowanceOverride,
    expenses: data?.expenses ?? [],
    planned: data?.planned ?? [],
  };
}

function normalizeIncomePreferences(data?: Partial<IncomePreferences>): IncomePreferences {
  return {
    salary: Array.isArray(data?.salary) ? data.salary : [],
    mealAllowance: Array.isArray(data?.mealAllowance) ? data.mealAllowance : [],
  };
}

function upsertIncomeChange(history: IncomeChange[], change: IncomeChange) {
  return [...history.filter((item) => item.effectiveFrom !== change.effectiveFrom), change]
    .sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
}

function effectiveIncome(history: IncomeChange[], month: string) {
  return history.reduce((value, item) => item.effectiveFrom <= month ? item.value : value, 0);
}

export function useFinances(month: string) {
  const [data, setData] = useState<MonthData>(emptyMonth());
  const [futurePlanned, setFuturePlanned] = useState<PlannedPurchase[]>([]);
  const [incomePreferences, setIncomePreferences] = useState<IncomePreferences>(emptyIncomePreferences());
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(() => auth?.currentUser ?? null);
  const [authReady, setAuthReady] = useState(() => !hasFirebaseConfig || Boolean(auth?.currentUser));
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasFirebaseConfig || !auth || !db) {
      const timer = window.setTimeout(() => {
        const saved = localStorage.getItem(localKey(month));
        const savedMonth = saved ? normalizeMonthData(JSON.parse(saved) as Partial<MonthData>) : emptyMonth();
        const savedFuture = JSON.parse(localStorage.getItem(localFutureKey) || "[]") as PlannedPurchase[];
        const savedIncome = normalizeIncomePreferences(JSON.parse(localStorage.getItem(localIncomeKey) || "{}") as Partial<IncomePreferences>);
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
        const nextIncome = {
          salary: savedIncome.salary.length === 0 && savedMonth.salary > 0
            ? [{ effectiveFrom: month, value: savedMonth.salary }]
            : savedIncome.salary,
          mealAllowance: savedIncome.mealAllowance.length === 0 && savedMonth.mealAllowance > 0
            ? [{ effectiveFrom: month, value: savedMonth.mealAllowance }]
            : savedIncome.mealAllowance,
        };
        if (JSON.stringify(nextIncome) !== JSON.stringify(savedIncome)) localStorage.setItem(localIncomeKey, JSON.stringify(nextIncome));
        setIncomePreferences(nextIncome);
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
      const savedMonth = snapshot.exists() ? normalizeMonthData(snapshot.data() as Partial<MonthData>) : emptyMonth();
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

  useEffect(() => {
    if (!hasFirebaseConfig || !user || !db) return;
    const reference = doc(db, "users", user.uid, "preferences", "income");
    return onSnapshot(reference, (snapshot) => {
      const saved = snapshot.exists() ? normalizeIncomePreferences(snapshot.data() as Partial<IncomePreferences>) : emptyIncomePreferences();
      setIncomePreferences(saved);
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

  const updateRecurringIncome = useCallback((field: keyof IncomePreferences, value: number, effectiveFrom: string) => {
    setIncomePreferences((current) => {
      const next = { ...current, [field]: upsertIncomeChange(current[field], { effectiveFrom, value }) };
      if (!hasFirebaseConfig) localStorage.setItem(localIncomeKey, JSON.stringify(next));
      if (hasFirebaseConfig && user && db) {
        void setDoc(doc(db, "users", user.uid, "preferences", "income"), next);
      }
      return next;
    });
  }, [user]);

  useEffect(() => {
    if (!hasFirebaseConfig || !user || !db) return;
    const initialValues: Record<string, unknown> = {};
    if (incomePreferences.salary.length === 0 && data.salary > 0) {
      initialValues.salary = arrayUnion({ effectiveFrom: month, value: data.salary });
    }
    if (incomePreferences.mealAllowance.length === 0 && data.mealAllowance > 0) {
      initialValues.mealAllowance = arrayUnion({ effectiveFrom: month, value: data.mealAllowance });
    }
    if (Object.keys(initialValues).length > 0) {
      void setDoc(doc(db, "users", user.uid, "preferences", "income"), initialValues, { merge: true });
    }
  }, [data.mealAllowance, data.salary, incomePreferences, month, user]);

  const addExpensesToMonths = useCallback((entries: Array<{ month: string; expense: Expense }>) => {
    if (!hasFirebaseConfig) {
      for (const entry of entries) {
        const key = localKey(entry.month);
        const saved = localStorage.getItem(key);
        const current = saved ? normalizeMonthData(JSON.parse(saved) as Partial<MonthData>) : emptyMonth();
        if (current.expenses.some((expense) => expense.id === entry.expense.id)) continue;
        localStorage.setItem(key, JSON.stringify({ ...current, expenses: [entry.expense, ...current.expenses] }));
      }
      return;
    }

    if (user && db) {
      for (const entry of entries) {
        void setDoc(
          doc(db, "users", user.uid, "months", entry.month),
          { expenses: arrayUnion(entry.expense) },
          { merge: true },
        );
      }
    }
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

  const recurringSalary = effectiveIncome(incomePreferences.salary, month);
  const recurringMealAllowance = effectiveIncome(incomePreferences.mealAllowance, month);

  return { data, futurePlanned, recurringSalary, recurringMealAllowance, update, updateFuturePlanned, updateRecurringIncome, addExpensesToMonths, loading, cloudEnabled: hasFirebaseConfig, user, authReady, authError, signInWithGoogle, signOut };
}
