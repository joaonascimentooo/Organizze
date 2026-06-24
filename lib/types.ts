export type Category = "Casa" | "Alimentação" | "Transporte" | "Lazer" | "Saúde" | "Outros";

export type Expense = {
  id: string;
  description: string;
  amount: number;
  category: Category;
  date: string;
  source?: "salary" | "meal";
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
};

export type MonthData = {
  salary: number;
  mealAllowance: number;
  expenses: Expense[];
  planned: PlannedPurchase[];
};

export const emptyMonth = (): MonthData => ({ salary: 0, mealAllowance: 0, expenses: [], planned: [] });

export const categories: Category[] = ["Casa", "Alimentação", "Transporte", "Lazer", "Saúde", "Outros"];
