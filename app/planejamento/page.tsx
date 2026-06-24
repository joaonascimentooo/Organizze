import type { Metadata } from "next";
import { OrganizzeApp } from "@/app/page";

export const metadata: Metadata = {
  title: "Planejamento — Organizze",
  description: "Planeje suas próximas compras e proteja seu orçamento.",
};

export default function PlanningPage() {
  return <OrganizzeApp view="planning"/>;
}
