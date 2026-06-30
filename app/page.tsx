"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { useFinances } from "@/hooks/use-finances";
import { categories, Category, emptyMonth, Expense, PlannedPurchase } from "@/lib/types";
import { deleteProductImage, loadProductImages, optimizeProductImage, saveProductImage, validateProductImage } from "@/lib/product-images";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
const shortDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" });
const selectedMonthKey = "organizze:selected-month";

function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function initialSelectedMonth() {
  if (typeof window === "undefined") return monthKey();
  const savedMonth = window.localStorage.getItem(selectedMonthKey);
  return savedMonth && /^\d{4}-\d{2}$/.test(savedMonth) ? savedMonth : monthKey();
}

function shiftMonth(key: string, amount: number) {
  const [year, month] = key.split("-").map(Number);
  const next = new Date(year, month - 1 + amount, 1);
  return monthKey(next);
}

function labelMonth(key: string) {
  const [year, month] = key.split("-").map(Number);
  const value = monthFormatter.format(new Date(Date.UTC(year, month - 1, 1)));
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function installmentDate(key: string, preferredDay: number) {
  const [year, month] = key.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return `${key}-${String(Math.min(preferredDay, lastDay)).padStart(2, "0")}`;
}

function installmentAmounts(total: number, count: number) {
  const totalInCents = Math.round(total * 100);
  const base = Math.floor(totalInCents / count);
  const remainder = totalInCents % count;
  return Array.from({ length: count }, (_, index) => (base + (index < remainder ? 1 : 0)) / 100);
}

function storeName(value?: string) {
  if (!value) return "Produto planejado";
  try {
    const host = new URL(value).hostname.replace(/^www\./, "");
    if (host.includes("shopee")) return "Shopee";
    if (host.includes("shein")) return "Shein";
    if (host.includes("amazon")) return "Amazon";
    if (host.includes("mercadolivre")) return "Mercado Livre";
    if (host.includes("magazineluiza")) return "Magalu";
    if (host.includes("kabum")) return "KaBuM!";
    if (host.includes("aliexpress")) return "AliExpress";
    return host;
  } catch {
    return "Loja online";
  }
}

function safeImageUrl(value?: string) {
  if (!value) return "";
  if (/^data:image\/(?:webp|png|jpeg);base64,/i.test(value)) return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function safeProductUrl(value?: string) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch {
    return "";
  }
}

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
    wallet: <><path d="M20 7V6a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v10H5a3 3 0 0 1-3-3V7"/><path d="M16 14h2"/></>,
    meal: <><path d="M4 11h16a8 8 0 0 1-16 0Z"/><path d="M7 19h10M8 7c0-1 1-1.5 1-2.5M12 7c0-1 1-1.5 1-2.5M16 7c0-1 1-1.5 1-2.5"/></>,
    target: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.08A1.7 1.7 0 0 0 9 19.37a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.63 15 1.7 1.7 0 0 0 3.08 14H3v-4h.08A1.7 1.7 0 0 0 4.63 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.63h.01A1.7 1.7 0 0 0 10 3.08V3h4v.08A1.7 1.7 0 0 0 15 4.63a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.37 9v.01A1.7 1.7 0 0 0 20.92 10H21v4h-.08A1.7 1.7 0 0 0 19.4 15Z"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    chevronLeft: <path d="m15 18-6-6 6-6"/>,
    chevronRight: <path d="m9 18 6-6-6-6"/>,
    arrowUp: <><path d="m18 15-6-6-6 6"/><path d="M12 9v10"/></>,
    cart: <><circle cx="9" cy="20" r="1"/><circle cx="19" cy="20" r="1"/><path d="M3 4h2l2.4 10.4a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.7L21 7H6"/></>,
    pencil: <><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></>,
    trash: <><path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    cloud: <><path d="M17.5 19H7a5 5 0 1 1 1.3-9.8A7 7 0 0 1 21 13a4 4 0 0 1-3.5 6Z"/><path d="m9 14 2 2 4-4"/></>,
    logout: <><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{paths[name]}</svg>;
}

function Modal({ title, subtitle, children, onClose }: { title: string; subtitle: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <button className="modal-close" onClick={onClose} aria-label="Fechar">×</button>
        <span className="eyebrow">ORGANIZZE</span>
        <h2>{title}</h2>
        <p>{subtitle}</p>
        {children}
      </section>
    </div>
  );
}

function CategorySelect({ defaultValue = "Outros" }: { defaultValue?: Category }) {
  return (
    <label>Categoria
      <select name="category" defaultValue={defaultValue}>
        {categories.map((category) => <option key={category}>{category}</option>)}
      </select>
    </label>
  );
}

export type OrganizzeView = "overview" | "expenses" | "planning" | "settings";

export function OrganizzeApp({ view = "overview" }: { view?: OrganizzeView }) {
  const reduceMotion = useReducedMotion();
  const [month, setMonth] = useState(initialSelectedMonth);
  const [modal, setModal] = useState<"salary" | "meal" | "expense" | "planned" | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingPlanned, setEditingPlanned] = useState<PlannedPurchase | null>(null);
  const [expenseSort, setExpenseSort] = useState<"recent" | "highest" | "lowest">("recent");
  const [expenseCategory, setExpenseCategory] = useState<Category | "Todas">("Todas");
  const [productLink, setProductLink] = useState("");
  const [productName, setProductName] = useState("");
  const [productAmount, setProductAmount] = useState("");
  const [productInstallments, setProductInstallments] = useState(1);
  const [productTiming, setProductTiming] = useState<"current" | "future">("current");
  const [productCategory, setProductCategory] = useState<Category>("Outros");
  const [productImage, setProductImage] = useState<File | null>(null);
  const [manualImagePreview, setManualImagePreview] = useState("");
  const [removePlannedImage, setRemovePlannedImage] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [planError, setPlanError] = useState("");
  const [storedProductImages, setStoredProductImages] = useState<Record<string, string>>({});
  const [productPreview, setProductPreview] = useState<{ imageUrl: string; loading: boolean; message: string }>({ imageUrl: "", loading: false, message: "" });
  const { data, futurePlanned, recurringSalary, recurringMealAllowance, update, updateFuturePlanned, updateRecurringIncome, addExpensesToMonths, loading, cloudEnabled, user, authReady, authError, signInWithGoogle, signOut } = useFinances(month);

  useEffect(() => {
    window.localStorage.setItem(selectedMonthKey, month);
  }, [month]);
  const plannedPurchases = useMemo(() => {
    const currentIds = new Set(data.planned.map((item) => item.id));
    return [
      ...futurePlanned.filter((item) => (!item.startsInMonth || item.startsInMonth <= month) && !currentIds.has(item.id)),
      ...data.planned,
    ];
  }, [data.planned, futurePlanned, month]);

  const salary = data.salaryOverride ?? (data.salary > 0 ? data.salary : recurringSalary);
  const mealAllowance = data.mealAllowanceOverride ?? (data.mealAllowance > 0 ? data.mealAllowance : recurringMealAllowance);
  const spent = useMemo(() => data.expenses.reduce((total, item) => total + item.amount, 0), [data.expenses]);
  const salarySpent = useMemo(() => data.expenses.filter((item) => item.source !== "meal").reduce((total, item) => total + item.amount, 0), [data.expenses]);
  const mealSpent = useMemo(() => data.expenses.filter((item) => item.source === "meal").reduce((total, item) => total + item.amount, 0), [data.expenses]);
  const planned = useMemo(() => plannedPurchases.reduce((total, item) => total + item.amount, 0), [plannedPurchases]);
  const plannedThisMonth = useMemo(() => plannedPurchases
    .filter((item) => item.timing !== "future")
    .reduce((total, item) => total + (item.amount / Math.max(item.installments || 1, 1)), 0), [plannedPurchases]);
  const plannedForFuture = useMemo(() => plannedPurchases
    .filter((item) => item.timing === "future")
    .reduce((total, item) => total + item.amount, 0), [plannedPurchases]);
  const mealAvailable = mealAllowance - mealSpent;
  const available = salary - salarySpent - plannedThisMonth;
  const committedPercent = salary > 0 ? Math.min(((salarySpent + plannedThisMonth) / salary) * 100, 100) : 0;
  const spentPercent = salary > 0 ? Math.min((salarySpent / salary) * 100, 100) : 0;
  const expensesByCategory = useMemo(() => categories
    .map((category) => ({
      category,
      total: data.expenses.filter((item) => item.category === category).reduce((sum, item) => sum + item.amount, 0),
    }))
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total), [data.expenses]);
  const visibleExpenses = useMemo(() => {
    const filtered = expenseCategory === "Todas"
      ? [...data.expenses]
      : data.expenses.filter((item) => item.category === expenseCategory);

    return filtered.sort((a, b) => {
      if (expenseSort === "highest") return b.amount - a.amount;
      if (expenseSort === "lowest") return a.amount - b.amount;
      return b.date.localeCompare(a.date);
    });
  }, [data.expenses, expenseCategory, expenseSort]);

  useEffect(() => {
    const imageIds = plannedPurchases.flatMap((item) => item.imageId ? [item.imageId] : []);
    let cancelled = false;
    void loadProductImages(user?.uid ?? null, imageIds).then((images) => {
      if (!cancelled) setStoredProductImages(images);
    });
    return () => { cancelled = true; };
  }, [plannedPurchases, user?.uid]);

  useEffect(() => {
    if (!modal) return;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [modal]);
  const pageHeading = {
    overview: { eyebrow: "PAINEL FINANCEIRO", title: "Olá, vamos organizar?", description: "Seu dinheiro fica mais leve quando cada real tem um lugar." },
    expenses: { eyebrow: "MEUS GASTOS", title: "Tudo o que saiu, em um só lugar", description: "Acompanhe cada gasto do mês e mantenha seu saldo sob controle." },
    planning: { eyebrow: "PLANEJAMENTO", title: "Planeje antes de comprar", description: "Reserve o valor das próximas compras e veja o impacto no seu salário." },
    settings: { eyebrow: "CONFIGURAÇÕES", title: "Seu Organizze, do seu jeito", description: "Ajuste os valores mensais, confira sua conta e gerencie seus dados." },
  }[view];

  function saveSalary(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = Number(form.get("salary")) || 0;
    if (form.get("scope") === "month") {
      update((current) => ({ ...current, salaryOverride: value }));
    } else {
      updateRecurringIncome("salary", value, month);
      update((current) => {
        const next = { ...current, salary: 0 };
        delete next.salaryOverride;
        return next;
      });
    }
    setModal(null);
  }

  function saveMealAllowance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = Number(form.get("mealAllowance")) || 0;
    if (form.get("scope") === "month") {
      update((current) => ({ ...current, mealAllowanceOverride: value }));
    } else {
      updateRecurringIncome("mealAllowance", value, month);
      update((current) => {
        const next = { ...current, mealAllowance: 0 };
        delete next.mealAllowanceOverride;
        return next;
      });
    }
    setModal(null);
  }

  function saveMonthlySettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextSalary = Number(form.get("salary")) || 0;
    const nextMealAllowance = Number(form.get("mealAllowance")) || 0;
    if (form.get("scope") === "month") {
      update((current) => ({ ...current, salaryOverride: nextSalary, mealAllowanceOverride: nextMealAllowance }));
      return;
    }
    updateRecurringIncome("salary", nextSalary, month);
    updateRecurringIncome("mealAllowance", nextMealAllowance, month);
    update((current) => {
      const next = { ...current, salary: 0, mealAllowance: 0 };
      delete next.salaryOverride;
      delete next.mealAllowanceOverride;
      return next;
    });
  }

  function clearCurrentMonth() {
    const confirmed = window.confirm(`Apagar gastos, planejamentos e ajustes exclusivos de ${labelMonth(month)}? A renda recorrente continuará ativa.`);
    if (!confirmed) return;
    for (const item of data.planned) void deleteProductImage(user?.uid ?? null, item.imageId);
    update(() => emptyMonth());
  }

  function saveExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const expense: Expense = {
      id: editingExpense?.id ?? crypto.randomUUID(),
      description: String(form.get("description")),
      amount: Number(form.get("amount")),
      category: form.get("category") as Category,
      date: String(form.get("date")),
      source: form.get("source") === "meal" ? "meal" : "salary",
      purchaseId: editingExpense?.purchaseId,
      installmentNumber: editingExpense?.installmentNumber,
      installmentCount: editingExpense?.installmentCount,
    };
    update((current) => {
      if (!editingExpense) return { ...current, expenses: [expense, ...current.expenses] };
      return { ...current, expenses: current.expenses.map((entry) => entry.id === editingExpense.id ? expense : entry) };
    });
    closeExpenseModal();
  }

  function openExpenseModal() {
    setEditingExpense(null);
    setModal("expense");
  }

  function openEditExpenseModal(expense: Expense) {
    setEditingExpense(expense);
    setModal("expense");
  }

  function closeExpenseModal() {
    setModal(null);
    setEditingExpense(null);
  }

  async function savePlanned(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const isEditing = Boolean(editingPlanned);
    const productId = editingPlanned?.id ?? crypto.randomUUID();
    setSavingPlan(true);
    setPlanError("");
    let imageUrl = removePlannedImage ? undefined : editingPlanned?.imageUrl || productPreview.imageUrl || undefined;
    let imageId: string | undefined = removePlannedImage ? undefined : editingPlanned?.imageId;
    const previousImageId = editingPlanned?.imageId;

    try {
      if (productImage) {
        const optimizedImage = await optimizeProductImage(productImage);
        const savedImage = await saveProductImage(user?.uid ?? null, productId, optimizedImage);
        imageId = savedImage.imageId;
        imageUrl = undefined;
        setStoredProductImages((current) => ({ ...current, [savedImage.imageId]: savedImage.dataUrl }));
      }
    const item: PlannedPurchase = {
      id: productId,
      description: String(form.get("description")),
      amount: Number(form.get("amount")),
      category: productCategory,
      purchased: editingPlanned?.purchased ?? false,
      installments: Number(form.get("installments")) || 1,
      timing: productTiming,
    };
    if (item.timing === "future") item.startsInMonth = editingPlanned?.startsInMonth || month;
    const productUrl = safeProductUrl(String(form.get("productUrl") || ""));
    if (productUrl) item.productUrl = productUrl;
    if (imageUrl) item.imageUrl = imageUrl;
    if (imageId) item.imageId = imageId;
    if (isEditing) {
      update((current) => {
        const existingIndex = current.planned.findIndex((entry) => entry.id === item.id);
        const planned = current.planned.filter((entry) => entry.id !== item.id);
        if (item.timing !== "future") planned.splice(existingIndex >= 0 ? existingIndex : 0, 0, item);
        return { ...current, planned };
      });
      updateFuturePlanned((current) => {
        const existingIndex = current.findIndex((entry) => entry.id === item.id);
        const planned = current.filter((entry) => entry.id !== item.id);
        if (item.timing === "future") planned.splice(existingIndex >= 0 ? existingIndex : 0, 0, item);
        return planned;
      });
      if ((removePlannedImage || productImage) && previousImageId && previousImageId !== imageId) {
        void deleteProductImage(user?.uid ?? null, previousImageId);
        setStoredProductImages((current) => {
          const next = { ...current };
          delete next[previousImageId];
          return next;
        });
      }
    } else if (item.timing === "future") {
      updateFuturePlanned((current) => [item, ...current]);
    } else {
      update((current) => ({ ...current, planned: [item, ...current.planned] }));
    }
    closePlannedModal();
    } catch (error) {
      setPlanError(error instanceof Error ? error.message : "Não foi possível salvar a imagem.");
    } finally {
      setSavingPlan(false);
    }
  }

  function openPlannedModal() {
    setEditingPlanned(null);
    setProductLink("");
    setProductName("");
    setProductAmount("");
    setProductInstallments(1);
    setProductTiming("current");
    setProductCategory("Outros");
    setProductImage(null);
    setManualImagePreview("");
    setRemovePlannedImage(false);
    setPlanError("");
    setProductPreview({ imageUrl: "", loading: false, message: "" });
    setModal("planned");
  }

  function openEditPlannedModal(item: PlannedPurchase) {
    const image = safeImageUrl((item.imageId && storedProductImages[item.imageId]) || item.imageUrl);
    setEditingPlanned(item);
    setProductLink(item.productUrl || "");
    setProductName(item.description);
    setProductAmount(String(item.amount));
    setProductInstallments(Math.max(item.installments || 1, 1));
    setProductTiming(item.timing === "future" ? "future" : "current");
    setProductCategory(item.category);
    setProductImage(null);
    setManualImagePreview("");
    setRemovePlannedImage(false);
    setPlanError("");
    setProductPreview({ imageUrl: image, loading: false, message: image ? "Imagem atual do produto." : "" });
    setModal("planned");
  }

  function closePlannedModal() {
    setModal(null);
    setEditingPlanned(null);
    setProductImage(null);
    setManualImagePreview("");
    setRemovePlannedImage(false);
    setPlanError("");
  }

  async function loadProductPreview() {
    const link = productLink.trim();
    if (!link) {
      setProductPreview({ imageUrl: "", loading: false, message: "Cole o link do produto primeiro." });
      return;
    }
    setProductPreview((current) => ({ ...current, loading: true, message: "" }));
    try {
      const response = await fetch(`/api/product-preview?url=${encodeURIComponent(link)}`);
      const result = await response.json() as { title?: string; imageUrl?: string; productUrl?: string; error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível carregar a prévia.");
      if (result.productUrl) setProductLink(result.productUrl);
      if (result.title && !productName) setProductName(result.title.slice(0, 120));
      setProductPreview({ imageUrl: result.imageUrl || "", loading: false, message: result.imageUrl ? "Imagem encontrada automaticamente." : "Produto encontrado sem imagem." });
    } catch (error) {
      setProductPreview({ imageUrl: "", loading: false, message: error instanceof Error ? error.message : "Não foi possível carregar a prévia." });
    }
  }

  function chooseProductImage(file?: File) {
    if (!file) return;
    try {
      validateProductImage(file);
      setPlanError("");
      setProductImage(file);
      setRemovePlannedImage(false);
      const reader = new FileReader();
      reader.onload = () => setManualImagePreview(String(reader.result));
      reader.onerror = () => setPlanError("Não foi possível visualizar a imagem.");
      reader.readAsDataURL(file);
    } catch (error) {
      setProductImage(null);
      setManualImagePreview("");
      setPlanError(error instanceof Error ? error.message : "Imagem inválida.");
    }
  }

  function makePurchase(item: PlannedPurchase) {
    const installments = Math.max(item.installments || 1, 1);
    const preferredDay = new Date().getDate();
    const expenses = installmentAmounts(item.amount, installments).map((amount, index) => {
      const installmentMonth = shiftMonth(month, index);
      return {
        month: installmentMonth,
        expense: {
          id: `${item.id}:installment:${index + 1}`,
          description: installments > 1 ? `${item.description} · parcela ${index + 1}/${installments}` : item.description,
          amount,
          category: item.category,
          date: installmentDate(installmentMonth, preferredDay),
          source: "salary" as const,
          purchaseId: item.id,
          installmentNumber: index + 1,
          installmentCount: installments,
        },
      };
    });
    const firstExpense = expenses[0].expense;
    update((current) => ({
      ...current,
      planned: current.planned.filter((entry) => entry.id !== item.id),
      expenses: current.expenses.some((expense) => expense.id === firstExpense.id)
        ? current.expenses
        : [firstExpense, ...current.expenses],
    }));
    addExpensesToMonths(expenses.slice(1));
    void deleteProductImage(user?.uid ?? null, item.imageId);
  }

  function removePlanned(item: PlannedPurchase) {
    if (item.timing === "future") {
      updateFuturePlanned((current) => current.filter((entry) => entry.id !== item.id));
    } else {
      update((current) => ({ ...current, planned: current.planned.filter((entry) => entry.id !== item.id) }));
    }
    void deleteProductImage(user?.uid ?? null, item.imageId);
  }

  function togglePlanningTiming(item: PlannedPurchase) {
    if (item.timing === "future") {
      updateFuturePlanned((current) => current.filter((entry) => entry.id !== item.id));
      update((current) => ({ ...current, planned: [{ ...item, timing: "current" }, ...current.planned] }));
    } else {
      update((current) => ({ ...current, planned: current.planned.filter((entry) => entry.id !== item.id) }));
      updateFuturePlanned((current) => [{ ...item, timing: "future", startsInMonth: month }, ...current]);
    }
  }

  const userName = user?.displayName?.split(" ")[0] || "Você";
  const initials = user?.displayName
    ? user.displayName.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase()
    : "VO";

  if (cloudEnabled && (!authReady || !user || user.isAnonymous)) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <div className="auth-visual"><div className="brand auth-brand"><span className="brand-mark"><i/><i/><i/></span><span>organizze</span></div><div className="auth-orbit"><span>{money.format(2450)}</span><small>seu saldo, no seu ritmo</small></div></div>
          <div className="auth-content">
            <span className="eyebrow">BEM-VINDO AO ORGANIZZE</span>
            <h1>Suas finanças.<br/>Mais simples, mais suas.</h1>
            <p>Entre para manter salário, gastos e planos protegidos e sincronizados.</p>
            {!authReady ? <div className="auth-loading">Preparando seu espaço...</div> : <button className="google-button" onClick={signInWithGoogle}><GoogleMark/>Continuar com Google</button>}
            {authError && <p className="auth-error">{authError}</p>}
            <small className="auth-privacy">O Organizze acessa apenas seu nome, e-mail e foto de perfil para identificar sua conta.</small>
          </div>
        </section>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark"><i/><i/><i/></span><span>organizze</span></div>
        <nav>
          <Link className={view === "overview" ? "active" : ""} href="/"><Icon name="grid"/>Visão geral</Link>
          <Link className={view === "expenses" ? "active" : ""} href="/gastos"><Icon name="wallet"/>Meus gastos</Link>
          <Link className={view === "planning" ? "active" : ""} href="/planejamento"><Icon name="target"/>Planejamento</Link>
        </nav>
        <div className="sidebar-bottom">
          <div className="small-note"><span><Icon name="cloud" size={17}/>{cloudEnabled && user ? "Sincronizado" : "Salvo neste navegador"}</span><small>{cloudEnabled && user ? `Conta de ${userName}` : "Conecte o Firebase quando quiser"}</small></div>
          <Link className={view === "settings" ? "active" : ""} href="/configuracoes"><Icon name="settings"/>Configurações</Link>
          <div className="profile"><span>{initials}</span><div><strong>{userName}</strong><small>{user?.email || "Modo local"}</small></div>{user && <button onClick={signOut} aria-label="Sair da conta" title="Sair"><Icon name="logout" size={17}/></button>}</div>
        </div>
      </aside>

      <motion.main
        initial={{ y: reduceMotion ? 0 : 7 }}
        animate={{ y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
      >
        <header>
          <div><span className="eyebrow">{pageHeading.eyebrow}</span><h1>{pageHeading.title}</h1><p>{pageHeading.description}</p></div>
          <div className="month-picker"><button onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Mês anterior"><Icon name="chevronLeft"/></button><span>{labelMonth(month)}</span><button onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Próximo mês"><Icon name="chevronRight"/></button></div>
        </header>

        {!cloudEnabled && <div className="local-banner"><span>Modo local</span> Seus dados já estão sendo salvos neste dispositivo. Adicione as credenciais do Firebase para sincronizá-los na nuvem.</div>}

        {view !== "settings" && <section className={`summary-grid ${view === "overview" ? "overview-summary" : view === "expenses" ? "expense-summary" : "planning-summary"} ${loading ? "is-loading" : ""}`} id="inicio">
          {view !== "expenses" && <>
          <article className="summary-card salary-card">
            <div className="card-heading"><span className="card-icon lime"><Icon name="wallet"/></span><span>Salário do mês</span><button onClick={() => setModal("salary")} aria-label="Editar salário"><Icon name="pencil" size={17}/></button></div>
            <strong>{money.format(salary)}</strong><small>{data.salaryOverride !== undefined ? "Ajuste exclusivo deste mês" : "Valor recorrente registrado"}</small>
          </article>
          {view === "overview" && <article className={`summary-card benefit-card ${mealAvailable < 0 ? "benefit-negative" : ""}`}>
            <div className="card-heading"><span className="card-icon meal"><Icon name="meal"/></span><span>Vale-alimentação</span><button onClick={() => setModal("meal")} aria-label="Editar vale-alimentação"><Icon name="pencil" size={17}/></button></div>
            <strong>{money.format(mealAvailable)}</strong><small>{mealSpent > 0 ? `${money.format(mealSpent)} utilizados` : "Saldo disponível no benefício"}</small>
          </article>}
          {view === "overview" && <article className="summary-card">
            <div className="card-heading"><span className="card-icon coral"><Icon name="arrowUp"/></span><span>Gastos realizados</span></div>
            <strong>{money.format(spent)}</strong><small>{data.expenses.length} {data.expenses.length === 1 ? "lançamento" : "lançamentos"}</small>
          </article>}
          <article className="summary-card">
            <div className="card-heading"><span className="card-icon purple"><Icon name="cart"/></span><span>Compras planejadas</span></div>
            <strong>{money.format(plannedThisMonth)}</strong><small>{planned > 0 ? `${money.format(planned)} em compras no total` : "Nenhum valor reservado neste mês"}</small>
          </article>
          </>}
          {view === "expenses" && <article className="summary-card expense-total-card">
            <div className="card-heading"><span className="card-icon coral"><Icon name="arrowUp"/></span><span>Gastos realizados</span><span className="summary-percentage">{Math.round(spentPercent)}% do salário</span></div>
            <strong>{money.format(spent)}</strong><small>{data.expenses.length} {data.expenses.length === 1 ? "lançamento no mês" : "lançamentos no mês"}</small>
          </article>}
          <article className={`summary-card available-card ${available < 0 ? "negative" : ""}`}>
            <div className="card-heading"><span>Saldo livre</span><span className="live-dot">AGORA</span></div>
            <strong>{money.format(available)}</strong><small>Depois dos gastos do salário e planos</small>
          </article>
        </section>}

        <section className={`content-grid ${view === "expenses" ? "expense-content" : view !== "overview" ? "focused-content" : ""}`}>
          {view === "overview" && <>
          <article className="panel overview-panel">
            <div className="panel-heading"><div><span className="eyebrow">RESUMO</span><h2>Visão do mês</h2></div><span className="status-pill">{committedPercent <= 70 ? "No caminho certo" : committedPercent <= 90 ? "Atenção ao limite" : "Orçamento apertado"}</span></div>
            <div className="overview-body">
              <div className="donut" style={{ "--progress": `${committedPercent * 3.6}deg` } as React.CSSProperties}><div><strong>{Math.round(committedPercent)}%</strong><span>comprometido</span></div></div>
              <div className="breakdown">
                <div><span><i className="dot spent"/>Gastos do salário</span><strong>{money.format(salarySpent)}</strong></div>
                {mealAllowance > 0 && <div><span><i className="dot meal"/>Usado do vale</span><strong>{money.format(mealSpent)}</strong></div>}
                <div><span><i className="dot planned"/>Reservado neste mês</span><strong>{money.format(plannedThisMonth)}</strong></div>
                {plannedForFuture > 0 && <div><span><i className="dot future"/>Compras futuras</span><strong>{money.format(plannedForFuture)}</strong></div>}
                <div><span><i className="dot free"/>Saldo livre</span><strong>{money.format(Math.max(available, 0))}</strong></div>
              </div>
            </div>
            <div className="budget-track"><span style={{ width: `${spentPercent}%` }}/><i style={{ left: `${committedPercent}%` }}/></div>
            <p className="helper-text">{salary === 0 ? "Comece registrando seu salário para visualizar a distribuição do mês." : available >= 0 ? `Você ainda tem ${money.format(available)} livres para este mês.` : `Seu planejamento ultrapassou o salário em ${money.format(Math.abs(available))}.`}</p>
          </article>

          <article className="panel quick-panel">
            <span className="eyebrow">ATALHOS</span><h2>O que vamos anotar?</h2>
            <button className="quick-action" onClick={openExpenseModal}><span className="card-icon coral"><Icon name="plus"/></span><span><strong>Novo gasto</strong><small>Registre o que já saiu</small></span><Icon name="chevronRight"/></button>
            <button className="quick-action" onClick={openPlannedModal}><span className="card-icon purple"><Icon name="cart"/></span><span><strong>Planejar compra</strong><small>Reserve antes de gastar</small></span><Icon name="chevronRight"/></button>
          </article>
          </>}

          {view === "expenses" && <>
          <article className="panel spending-panel">
            <div className="panel-heading"><div><span className="eyebrow">DISTRIBUIÇÃO</span><h2>Onde seu dinheiro foi</h2></div></div>
            <div className="spending-impact">
              <div className="donut expense-donut" style={{ "--progress": `${spentPercent * 3.6}deg` } as React.CSSProperties}><div><strong>{Math.round(spentPercent)}%</strong><span>do salário</span></div></div>
              <div><span>Você gastou</span><strong>{money.format(spent)}</strong><small>{salary > 0 ? `${money.format(salarySpent)} do salário${mealSpent > 0 ? ` + ${money.format(mealSpent)} do vale` : ""}` : "Cadastre seu salário para comparar"}</small></div>
            </div>
            {expensesByCategory.length === 0 ? <div className="chart-empty">As categorias aparecerão aqui quando você registrar um gasto.</div> : <div className="category-breakdown">
              {expensesByCategory.map((item) => {
                const categoryIndex = categories.indexOf(item.category);
                const percentage = spent > 0 ? (item.total / spent) * 100 : 0;
                return <div className="category-row" key={item.category}>
                  <div><span><i className={`category-dot category-color-${categoryIndex}`}/>{item.category}</span><strong>{money.format(item.total)}</strong></div>
                  <div className="category-track"><span className={`category-color-${categoryIndex}`} style={{ width: `${percentage}%` }}/></div>
                  <small>{Math.round(percentage)}% dos gastos</small>
                </div>;
              })}
            </div>}
            {expensesByCategory[0] && <div className="top-category"><span>Categoria com maior gasto</span><strong>{expensesByCategory[0].category}</strong><small>{money.format(expensesByCategory[0].total)}</small></div>}
          </article>

          <article className="panel list-panel focused-list expense-list-panel" id="gastos">
            <div className="panel-heading"><div><span className="eyebrow">MOVIMENTAÇÕES</span><h2>Todos os gastos</h2></div><button className="text-button" onClick={openExpenseModal}><Icon name="plus" size={17}/>Adicionar</button></div>
            {data.expenses.length > 0 && <div className="expense-filters">
              <label><span>Categoria</span><select value={expenseCategory} onChange={(event) => setExpenseCategory(event.target.value as Category | "Todas")}><option value="Todas">Todas as categorias</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
              <label><span>Ordenar por</span><select value={expenseSort} onChange={(event) => setExpenseSort(event.target.value as "recent" | "highest" | "lowest")}><option value="recent">Mais recentes</option><option value="highest">Maior valor</option><option value="lowest">Menor valor</option></select></label>
              <small>{visibleExpenses.length} {visibleExpenses.length === 1 ? "resultado" : "resultados"}</small>
            </div>}
            {data.expenses.length === 0 ? <Empty icon="wallet" title="Nenhum gasto por aqui" text="Quando você registrar uma saída, ela aparece nesta lista." action="Registrar primeiro gasto" onClick={openExpenseModal}/> :
              visibleExpenses.length === 0 ? <div className="filter-empty"><strong>Nenhum gasto nesta categoria</strong><span>Escolha outra categoria para visualizar os lançamentos.</span></div> :
              <div className="item-list">{visibleExpenses.map((item) => <div className="list-item" key={item.id}><span className={`category-icon cat-${categories.indexOf(item.category)}`}><Icon name={item.source === "meal" ? "meal" : "wallet"} size={18}/></span><div><strong>{item.description}</strong><small>{item.category} · {item.source === "meal" ? "Vale-alimentação" : "Salário"} · {shortDate.format(new Date(`${item.date}T00:00:00Z`))}</small></div><b>- {money.format(item.amount)}</b><button className="icon-button" aria-label="Editar gasto" onClick={() => openEditExpenseModal(item)}><Icon name="pencil" size={17}/></button><button className="icon-button" aria-label="Excluir gasto" onClick={() => update((current) => ({ ...current, expenses: current.expenses.filter((entry) => entry.id !== item.id) }))}><Icon name="trash" size={17}/></button></div>)}</div>}
          </article>
          </>}

          {view === "planning" && <article className="panel planning-panel" id="planejados">
            <div className="panel-heading"><div><span className="eyebrow">LISTA DE DESEJOS</span><h2>O que você quer comprar</h2></div><button className="text-button add-plan-button" onClick={openPlannedModal}><Icon name="plus" size={18}/>Adicionar produto</button></div>
            <p className="planning-intro">Compare o impacto no orçamento antes de decidir. O valor parcelado é calculado automaticamente.</p>
            {plannedPurchases.length === 0 ? <Empty icon="target" title="Sua lista está esperando uma ideia" text="Cole o link de um produto para visualizar preço, imagem e parcelamento em um só lugar." action="Adicionar primeiro produto" onClick={openPlannedModal}/> :
              <div className="product-grid">{plannedPurchases.map((item) => {
                const installments = Math.max(item.installments || 1, 1);
                const image = safeImageUrl((item.imageId && storedProductImages[item.imageId]) || item.imageUrl);
                const productUrl = safeProductUrl(item.productUrl);
                return <article className="product-card" key={item.id}>
                  <div className={`product-media ${image ? "has-image" : ""}`} style={image ? { backgroundImage: `url(${JSON.stringify(image)})` } : undefined}>
                    {!image && <span><Icon name="cart" size={30}/><small>Prévia indisponível</small></span>}
                    <b>{storeName(productUrl)}</b>
                    <span className={`product-timing-badge ${item.timing === "future" ? "future" : "current"}`}>{item.timing === "future" ? "Compra futura" : "Neste mês"}</span>
                  </div>
                  <div className="product-details">
                    <span className="product-category">{item.category}</span>
                    <h3>{item.description}</h3>
                    <strong className="product-price">{money.format(item.amount)}</strong>
                    <div className="installment-box"><span>{installments}x</span><div><strong>{money.format(item.amount / installments)}</strong><small>{installments === 1 ? "pagamento à vista" : `por ${installments} meses · até ${labelMonth(shiftMonth(month, installments - 1))}`}</small></div></div>
                    <button className={`timing-toggle ${item.timing === "future" ? "is-future" : ""}`} onClick={() => togglePlanningTiming(item)}><Icon name={item.timing === "future" ? "target" : "wallet"} size={17}/><span><strong>{item.timing === "future" ? "Não desconta do saldo" : `${money.format(item.amount / installments)} neste mês`}</strong><small>{item.timing === "future" ? "Clique para trazer para este mês" : "Somente a parcela atual fica reservada"}</small></span></button>
                    <div className="product-actions">
                      {productUrl && <a href={productUrl} target="_blank" rel="noopener noreferrer">Ver na loja</a>}
                      {item.timing !== "future" && <button className="buy-button" title="Marcar como comprado" onClick={() => makePurchase(item)}><Icon name="check" size={16}/><span>Comprei</span></button>}
                      <button className="icon-button" aria-label="Editar planejamento" onClick={() => openEditPlannedModal(item)}><Icon name="pencil" size={17}/></button>
                      <button className="icon-button" aria-label="Excluir planejamento" onClick={() => removePlanned(item)}><Icon name="trash" size={17}/></button>
                    </div>
                  </div>
                </article>;
              })}</div>}
          </article>
          }

          {view === "settings" && <div className="settings-grid">
            <article className="panel settings-panel settings-finance-panel">
              <div className="settings-heading"><span className="settings-icon"><Icon name="wallet"/></span><div><span className="eyebrow">RENDA RECORRENTE</span><h2>Base de {labelMonth(month)}</h2><p>Por padrão, os valores continuam automaticamente nos próximos meses.</p></div></div>
              <form className="settings-form" key={month} onSubmit={saveMonthlySettings}>
                <div className="settings-fields">
                  <label>Salário líquido<input name="salary" type="number" min="0" step="0.01" defaultValue={salary || ""} placeholder="R$ 0,00"/></label>
                  <label>Vale-alimentação<input name="mealAllowance" type="number" min="0" step="0.01" defaultValue={mealAllowance || ""} placeholder="R$ 0,00"/></label>
                </div>
                <label className="settings-scope">Aplicar alteração<select name="scope" defaultValue="forward"><option value="forward">Deste mês em diante</option><option value="month">Somente neste mês</option></select></label>
                <button className="primary-button" type="submit">Salvar valores</button>
              </form>
            </article>

            <article className="panel settings-panel">
              <div className="settings-heading"><span className="settings-icon"><Icon name="cloud"/></span><div><span className="eyebrow">CONTA E SINCRONIZAÇÃO</span><h2>{cloudEnabled ? "Dados protegidos na nuvem" : "Dados neste dispositivo"}</h2><p>{cloudEnabled ? "Suas alterações são sincronizadas automaticamente." : "O modo local mantém tudo salvo apenas neste navegador."}</p></div></div>
              <div className="account-details"><div><span>Perfil</span><strong>{user?.displayName || "Modo local"}</strong></div><div><span>E-mail</span><strong>{user?.email || "Não conectado"}</strong></div><div><span>Status</span><strong className="sync-status"><i/>{cloudEnabled ? "Sincronizado" : "Armazenamento local"}</strong></div></div>
              {user && <button className="secondary-button" onClick={signOut}><Icon name="logout" size={17}/>Sair da conta</button>}
            </article>

            <article className="panel settings-panel settings-data-panel">
              <div className="settings-heading"><span className="settings-icon danger"><Icon name="trash"/></span><div><span className="eyebrow">DADOS DO MÊS</span><h2>Gerenciar {labelMonth(month)}</h2><p>A renda recorrente e as compras futuras globais não serão removidas.</p></div></div>
              <div className="month-data-summary"><div><strong>{data.expenses.length}</strong><span>gastos</span></div><div><strong>{data.planned.length}</strong><span>planos deste mês</span></div><div><strong>{futurePlanned.length}</strong><span>compras futuras</span></div></div>
              <button className="danger-button" type="button" onClick={clearCurrentMonth} disabled={data.salary === 0 && data.mealAllowance === 0 && data.salaryOverride === undefined && data.mealAllowanceOverride === undefined && data.expenses.length === 0 && data.planned.length === 0}><Icon name="trash" size={17}/>Limpar dados deste mês</button>
            </article>
          </div>}
        </section>
      </motion.main>

      <nav className="mobile-nav"><Link className={view === "overview" ? "active" : ""} href="/"><Icon name="grid"/><small>Resumo</small></Link><Link className={view === "expenses" ? "active" : ""} href="/gastos"><Icon name="wallet"/><small>Gastos</small></Link><button onClick={() => view === "planning" ? openPlannedModal() : openExpenseModal()}><Icon name="plus"/></button><Link className={view === "planning" ? "active" : ""} href="/planejamento"><Icon name="target"/><small>Planejar</small></Link><Link className={view === "settings" ? "active" : ""} href="/configuracoes"><Icon name="settings"/><small>Ajustes</small></Link></nav>

      {modal === "salary" && <Modal title="Qual é o seu salário?" subtitle="O valor pode continuar nos próximos meses ou valer apenas para o mês selecionado." onClose={() => setModal(null)}><form onSubmit={saveSalary}><label>Salário líquido<input name="salary" type="number" min="0" step="0.01" defaultValue={salary || ""} placeholder="R$ 0,00" autoFocus required/></label><label>Aplicar alteração<select name="scope" defaultValue="forward"><option value="forward">Deste mês em diante</option><option value="month">Somente neste mês</option></select></label><button className="primary-button" type="submit">Salvar salário</button></form></Modal>}
      {modal === "meal" && <Modal title="Vale-alimentação" subtitle="O valor pode continuar nos próximos meses ou valer apenas para o mês selecionado." onClose={() => setModal(null)}><form onSubmit={saveMealAllowance}><label>Valor recebido<input name="mealAllowance" type="number" min="0" step="0.01" defaultValue={mealAllowance || ""} placeholder="R$ 0,00" autoFocus required/></label><label>Aplicar alteração<select name="scope" defaultValue="forward"><option value="forward">Deste mês em diante</option><option value="month">Somente neste mês</option></select></label><button className="primary-button" type="submit">Salvar vale-alimentação</button></form></Modal>}
      {modal === "expense" && <Modal title={editingExpense ? "Editar gasto" : "Registrar novo gasto"} subtitle="Anote agora para não precisar lembrar depois." onClose={closeExpenseModal}><form onSubmit={saveExpense}><label>Descrição<input name="description" placeholder="Ex.: Mercado da semana" defaultValue={editingExpense?.description || ""} autoFocus required/></label><div className="form-row"><label>Valor<input name="amount" type="number" min="0.01" step="0.01" defaultValue={editingExpense?.amount || ""} placeholder="R$ 0,00" required/></label><label>Data<input name="date" type="date" defaultValue={editingExpense?.date || new Date().toISOString().slice(0, 10)} required/></label></div><label>Pago com<select name="source" defaultValue={editingExpense?.source || "salary"}><option value="salary">Salário</option><option value="meal">Vale-alimentação</option></select></label><CategorySelect defaultValue={editingExpense?.category || "Outros"}/><button className="primary-button" type="submit">{editingExpense ? "Salvar alterações" : "Adicionar gasto"}</button></form></Modal>}
      {modal === "planned" && <Modal title={editingPlanned ? "Editar produto" : "Adicionar produto"} subtitle="Cole o link da loja e simule como essa compra cabe no seu orçamento." onClose={closePlannedModal}><form onSubmit={savePlanned}>
        <div className="product-link-field"><label>Link do produto<input name="productUrl" type="url" value={productLink} onChange={(event) => { setProductLink(event.target.value); setProductPreview({ imageUrl: "", loading: false, message: "" }); }} onBlur={() => productLink && void loadProductPreview()} placeholder="https://shopee.com.br/..." autoFocus/></label><button type="button" onClick={() => void loadProductPreview()} disabled={productPreview.loading}>{productPreview.loading ? "Buscando..." : "Buscar prévia"}</button></div>
        <div className="product-image-options">
          <label className="image-upload-button"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseProductImage(event.target.files?.[0])}/><span><Icon name="plus" size={17}/><strong>Escolher uma imagem</strong><small>JPG, PNG ou WebP · até 10 MB</small></span></label>
          {editingPlanned && (editingPlanned.imageId || editingPlanned.imageUrl) && !removePlannedImage && <button className="secondary-button" type="button" onClick={() => { setRemovePlannedImage(true); setProductImage(null); setManualImagePreview(""); }}>Remover imagem</button>}
          <small>A imagem escolhida por você substitui a prévia automática.</small>
        </div>
        {!removePlannedImage && (manualImagePreview || productPreview.imageUrl || productPreview.message) && <div className={`product-form-preview ${manualImagePreview || productPreview.imageUrl ? "with-image" : ""}`}><span style={manualImagePreview || productPreview.imageUrl ? { backgroundImage: `url(${JSON.stringify(manualImagePreview || productPreview.imageUrl)})` } : undefined}>{!manualImagePreview && !productPreview.imageUrl && <Icon name="cart"/>}</span><div><strong>{manualImagePreview ? "Sua imagem está pronta" : productPreview.imageUrl ? "Prévia encontrada" : "Sem imagem automática"}</strong><small>{manualImagePreview ? productImage?.name : productPreview.message}</small></div></div>}
        <label>Nome do produto<input name="description" value={productName} onChange={(event) => setProductName(event.target.value)} placeholder="Ex.: Fone de ouvido" required/></label>
        <div className="form-row"><label>Valor total<input name="amount" type="number" min="0.01" step="0.01" value={productAmount} onChange={(event) => setProductAmount(event.target.value)} placeholder="R$ 0,00" required/></label><label>Parcelamento<select name="installments" value={productInstallments} onChange={(event) => setProductInstallments(Number(event.target.value))}>{Array.from({ length: 24 }, (_, index) => index + 1).map((number) => <option value={number} key={number}>{number === 1 ? "À vista" : `${number} parcelas`}</option>)}</select></label></div>
        {Number(productAmount) > 0 && <div className="installment-simulation"><span>{productInstallments === 1 ? "Pagamento à vista" : `${productInstallments} parcelas de`}</span><strong>{money.format(Number(productAmount) / productInstallments)}</strong><small>{productInstallments === 1 ? "valor debitado deste mês" : `ao clicar em Comprei, as parcelas serão lançadas até ${labelMonth(shiftMonth(month, productInstallments - 1))} · total de ${money.format(Number(productAmount))}`}</small></div>}
        <label>Quando você pretende comprar?<select name="timing" value={productTiming} onChange={(event) => setProductTiming(event.target.value === "future" ? "future" : "current")}><option value="current">Neste mês — descontar do saldo</option><option value="future">No futuro — não descontar agora</option></select></label>
        {planError && <div className="form-error">{planError}</div>}
        <label>Categoria<select name="category" value={productCategory} onChange={(event) => setProductCategory(event.target.value as Category)}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><button className="primary-button" type="submit" disabled={savingPlan}>{savingPlan ? "Salvando imagem..." : editingPlanned ? "Salvar alterações" : "Adicionar ao planejamento"}</button>
      </form></Modal>}
    </div>
  );
}

export default function Home() {
  return <OrganizzeApp view="overview"/>;
}

function Empty({ icon, title, text, action, onClick }: { icon: string; title: string; text: string; action: string; onClick: () => void }) {
  return <div className="empty-state"><span><Icon name={icon} size={25}/></span><strong>{title}</strong><p>{text}</p><button onClick={onClick}>{action}</button></div>;
}

function GoogleMark() {
  return <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.5-.2-2.2H12v4.3h5.4a4.7 4.7 0 0 1-2 3v2.8h3.3c1.9-1.8 2.9-4.4 2.9-7.9Z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.8c-.9.6-2.1 1-3.4 1a5.9 5.9 0 0 1-5.6-4.1H3v2.9A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 13.7A6 6 0 0 1 6.1 12c0-.6.1-1.2.3-1.7v-3H3A10 10 0 0 0 2 12c0 1.7.4 3.2 1 4.6l3.4-2.9Z"/><path fill="#EA4335" d="M12 6.2c1.5 0 2.8.5 3.9 1.5l2.9-2.9A9.7 9.7 0 0 0 12 2a10 10 0 0 0-9 5.4l3.4 2.9A5.9 5.9 0 0 1 12 6.2Z"/></svg>;
}
