import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Barber Shop | Agende na melhor barbearia",
  description: "Encontre barbearias verificadas, veja fotos reais dos trabalhos e agende seu horário online.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-zinc-950 text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  );
}
