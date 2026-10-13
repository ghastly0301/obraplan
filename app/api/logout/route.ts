import { NextResponse } from "next/server";
import { COOKIE_SESSAO, encerrarSessao } from "@/lib/auth";

export async function POST(req: Request) {
  await encerrarSessao();
  const res = NextResponse.redirect(new URL("/login", req.url), 303);
  res.cookies.set(COOKIE_SESSAO, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
