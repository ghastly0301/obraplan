import Link from "next/link";
import { ehAdmin, exigirSessao } from "@/lib/auth";
import NavPrincipal from "@/components/NavPrincipal";

export default async function LayoutPrivado({ children }: { children: React.ReactNode }) {
  const usuario = await exigirSessao();
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 bg-blue-800 text-white print:hidden">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link href="/" className="text-lg font-bold">
            🏗️ ObraPlan
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden sm:inline">
              {usuario.nome}
              <span className="ml-1 text-blue-200">
                ({ehAdmin(usuario) ? "admin" : "empreiteiro"})
              </span>
            </span>
            <form method="post" action="/api/logout">
              <button className="rounded-md bg-blue-900/70 px-3 py-2 font-medium">
                Sair
              </button>
            </form>
          </div>
        </div>
        <NavPrincipal />
      </header>
      <main className="mx-auto max-w-3xl px-4 py-4 print:max-w-none print:p-0">
        {children}
      </main>
    </div>
  );
}
