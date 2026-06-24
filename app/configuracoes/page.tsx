import type { Metadata } from "next";
import { OrganizzeApp } from "@/app/page";

export const metadata: Metadata = {
  title: "Configurações — Organizze",
  description: "Configure seus valores mensais, conta e dados do Organizze.",
};

export default function SettingsPage() {
  return <OrganizzeApp view="settings"/>;
}
