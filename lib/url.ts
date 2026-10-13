/**
 * Monta uma URL absoluta a partir do caminho, respeitando o host externo.
 *
 * Atrás de um proxy (Codespaces, túneis, Nginx), `req.url` traz o host
 * interno, o que faria o redirect apontar para um endereço que o navegador
 * não alcança. Por isso damos preferência aos cabeçalhos x-forwarded-*.
 */
export function urlDe(req: Request, caminho: string) {
  const host =
    req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? null;
  if (!host) return new URL(caminho, req.url);
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  return new URL(caminho, `${proto}://${host}`);
}
