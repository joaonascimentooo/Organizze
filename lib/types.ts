export type Category = "Casa" | "Alimentação" | "Transporte" | "Lazer" | "Saúde" | "Outros";

export type Expense = {
  id: string;
  description: string;
  amount: number;
  category: Category;
  date: string;
  source?: "salary" | "meal";
  purchaseId?: string;
  installmentNumber?: number;
  installmentCount?: number;
};

export type PlannedPurchase = {
  id: string;
  description: string;
  amount: number;
  category: Category;
  purchased: boolean;
  productUrl?: string;
  imageUrl?: string;
  imageId?: string;
  installments?: number;
  timing?: "current" | "future";
  startsInMonth?: string;
};

export type MonthData = {
  salary: number;
  mealAllowance: number;
  salaryOverride?: number;
  mealAllowanceOverride?: number;
  expenses: Expense[];
  planned: PlannedPurchase[];
};

export type FuturePlanningData = {
  planned: PlannedPurchase[];
};

export type IncomeChange = {
  effectiveFrom: string;
  value: number;
};

export type IncomePreferences = {
  salary: IncomeChange[];
  mealAllowance: IncomeChange[];
};

export const emptyMonth = (): MonthData => ({ salary: 0, mealAllowance: 0, expenses: [], planned: [] });

export const categories: Category[] = ["Casa", "Alimentação", "Transporte", "Lazer", "Saúde", "Outros"];
