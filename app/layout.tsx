import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ObraPlan",
  description: "Gestão de obras para empreiteiros",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-zinc-100 text-zinc-900 antialiased">
        {children}
      </body>
    </html>
  );
}
