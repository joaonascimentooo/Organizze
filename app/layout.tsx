import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Organizze — Suas finanças, no seu ritmo",
  description: "Um jeito simples e bonito de cuidar do seu dinheiro.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var theme=localStorage.getItem("organizze:theme")||"dark";document.documentElement.dataset.theme=theme;}catch{document.documentElement.dataset.theme="dark";}`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
