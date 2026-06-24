import type { Metadata } from "next";
import { OrganizzeApp } from "@/app/page";

export const metadata: Metadata = {
  title: "Meus gastos — Organizze",
  description: "Acompanhe todos os seus gastos mensais.",
};

export default function ExpensesPage() {
  return <OrganizzeApp view="expenses"/>;
}
