import { redirect } from "next/navigation";
import { usuarioDaSessao } from "@/lib/auth";

export default async function PaginaLogin({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  if (await usuarioDaSessao()) redirect("/");
  const { erro } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-blue-900 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center text-white">
          <div className="text-5xl">🏗️</div>
          <h1 className="mt-2 text-3xl font-bold">ObraPlan</h1>
          <p className="mt-1 text-blue-200">Gestão de obras para empreiteiros</p>
        </div>
        <form method="post" action="/api/login" className="cartao space-y-4 p-5">
          {erro && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              E-mail ou senha inválidos.
            </p>
          )}
          <div>
            <label htmlFor="email" className="rotulo">
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="campo"
            />
          </div>
          <div>
            <label htmlFor="senha" className="rotulo">
              Senha
            </label>
            <input
              id="senha"
              name="senha"
              type="password"
              required
              autoComplete="current-password"
              className="campo"
            />
          </div>
          <button className="botao w-full">Entrar</button>
        </form>
      </div>
    </main>
  );
}
