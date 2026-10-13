"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", rotulo: "Obras" },
  { href: "/clientes", rotulo: "Clientes" },
  { href: "/funcionarios", rotulo: "Funcionários" },
  { href: "/materiais", rotulo: "Materiais" },
  { href: "/chamados", rotulo: "Chamados" },
];

export default function NavPrincipal() {
  const pathname = usePathname();
  return (
    <nav className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-3 pb-2">
      {LINKS.map((l) => {
        const ativo =
          l.href === "/"
            ? pathname === "/" || pathname.startsWith("/obra")
            : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold ${
              ativo ? "bg-white text-blue-800" : "bg-blue-900/50 text-blue-100"
            }`}
          >
            {l.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
