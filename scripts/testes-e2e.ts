/**
 * Bateria de testes de ponta a ponta das rotas de API e das telas.
 * Sobe contra um servidor já rodando em BASE, com um banco separado.
 * Use `scripts/testar.sh`, que cuida do banco e do servidor.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const BASE = process.env.BASE ?? "http://127.0.0.1:3100";
const prisma = new PrismaClient();

let passaram = 0;
const falhas: string[] = [];

function check(nome: string, cond: boolean, detalhe = "") {
  if (cond) {
    passaram++;
  } else {
    falhas.push(`${nome}${detalhe ? ` — ${detalhe}` : ""}`);
    console.log(`FALHA  ${nome}${detalhe ? ` — ${detalhe}` : ""}`);
  }
}

type Resp = { status: number; loc: string; cookie: string | null };

async function postFD(caminho: string, fd: FormData, cookie?: string): Promise<Resp> {
  const r = await fetch(BASE + caminho, {
    method: "POST",
    body: fd,
    redirect: "manual",
    headers: cookie ? { cookie } : {},
  });
  return {
    status: r.status,
    loc: (r.headers.get("location") ?? "").replace(BASE, ""),
    cookie: r.headers.get("set-cookie"),
  };
}

function monta(campos: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(campos)) fd.append(k, v);
  return fd;
}

const post = (caminho: string, campos: Record<string, string>, cookie?: string) =>
  postFD(caminho, monta(campos), cookie);

async function get(caminho: string, cookie?: string) {
  const r = await fetch(BASE + caminho, {
    redirect: "manual",
    headers: cookie ? { cookie } : {},
  });
  return {
    status: r.status,
    loc: (r.headers.get("location") ?? "").replace(BASE, ""),
    corpo: r.status === 200 ? await r.text() : "",
  };
}

function cookieDe(r: Resp) {
  const m = /obraplan_sessao=([^;]*)/.exec(r.cookie ?? "");
  return m ? `obraplan_sessao=${m[1]}` : "";
}

async function entrar(email: string, senha: string) {
  const r = await post("/api/login", { email, senha });
  return { r, cookie: cookieDe(r) };
}

async function main() {
  // ---------- Dados de partida ----------
  // Zera o banco de teste para a bateria começar sempre igual.
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "MedicaoItem", "Medicao", "Diario", "Foto", "Servico",
      "MovimentoMaterial", "Material", "MovimentoFuncionario",
      "Funcionario", "Recebimento", "Chamado", "Obra", "Cliente",
      "Sessao", "Usuario"
    RESTART IDENTITY CASCADE
  `);
  await prisma.usuario.create({
    data: { nome: "Admin", email: "admin@t.com", senhaHash: bcrypt.hashSync("Senha@Admin1", 10), papel: "admin" },
  });
  await prisma.usuario.create({
    data: { nome: "Emp", email: "emp@t.com", senhaHash: bcrypt.hashSync("Senha@Emp1", 10), papel: "empreiteiro" },
  });
  await prisma.usuario.create({
    data: { nome: "Emp2", email: "emp2@t.com", senhaHash: bcrypt.hashSync("Senha@Emp2", 10), papel: "empreiteiro" },
  });

  // ---------- Autenticação ----------
  const semSessao = await get("/");
  check("GET / sem sessão manda para /login", semSessao.status === 307 && semSessao.loc.endsWith("/login"), `${semSessao.status} ${semSessao.loc}`);

  const errada = await entrar("admin@t.com", "errada");
  check("Login com senha errada recusa", errada.r.loc.includes("/login?erro=1"), errada.r.loc);
  check("Login com senha errada não cria cookie de sessão", !cookieDe(errada.r), String(errada.r.cookie));

  const inexistente = await entrar("ninguem@t.com", "qualquer");
  check("Login com e-mail inexistente recusa com a mesma mensagem", inexistente.r.loc.includes("/login?erro=1"), inexistente.r.loc);

  const vazio = await entrar("", "");
  check("Login com campos vazios recusa", vazio.r.loc.includes("/login?erro=1"), vazio.r.loc);

  const maiuscula = await entrar("ADMIN@T.COM", "Senha@Admin1");
  check("Login aceita e-mail em maiúsculas", maiuscula.r.loc === "/" && !!maiuscula.cookie, maiuscula.r.loc);

  const { r: rAdmin, cookie: admin } = await entrar("admin@t.com", "Senha@Admin1");
  check("Login do admin devolve 303 para /", rAdmin.status === 303 && rAdmin.loc === "/", `${rAdmin.status} ${rAdmin.loc}`);
  check("Cookie de sessão é httpOnly", /httponly/i.test(rAdmin.cookie ?? ""), String(rAdmin.cookie));
  const { cookie: emp } = await entrar("emp@t.com", "Senha@Emp1");
  const { cookie: emp2 } = await entrar("emp2@t.com", "Senha@Emp2");
  check("Login do empreiteiro cria sessão", !!emp && !!emp2);

  const comSessao = await get("/", admin);
  check("GET / com sessão responde 200", comSessao.status === 200, String(comSessao.status));

  const semCookieApi = await post("/api/clientes", { nome: "X" });
  check("API sem sessão manda para /login", semCookieApi.loc.endsWith("/login"), semCookieApi.loc);

  const cookieInvalido = await post("/api/clientes", { nome: "X" }, "obraplan_sessao=naoexiste");
  check("API com token inválido manda para /login", cookieInvalido.loc.endsWith("/login"), cookieInvalido.loc);

  // Sessão expirada
  const { cookie: expirado } = await entrar("emp@t.com", "Senha@Emp1");
  await prisma.sessao.update({
    where: { token: expirado.split("=")[1] },
    data: { expiraEm: new Date(Date.now() - 1000) },
  });
  const usoExpirado = await post("/api/clientes", { nome: "X" }, expirado);
  check("Sessão expirada é recusada", usoExpirado.loc.endsWith("/login"), usoExpirado.loc);

  // Logout
  const { cookie: paraSair } = await entrar("emp@t.com", "Senha@Emp1");
  const saida = await post("/api/logout", {}, paraSair);
  check("Logout manda para /login", saida.loc.endsWith("/login"), saida.loc);
  check("Logout apaga a sessão do banco", (await prisma.sessao.count({ where: { token: paraSair.split("=")[1] } })) === 0);
  const depoisDoLogout = await post("/api/clientes", { nome: "X" }, paraSair);
  check("Cookie antigo não funciona depois do logout", depoisDoLogout.loc.endsWith("/login"), depoisDoLogout.loc);

  // ---------- Clientes ----------
  const cliSemNome = await post("/api/clientes", { nome: "  " }, admin);
  check("Cliente sem nome é recusado", cliSemNome.loc === "/clientes?erro=campos", cliSemNome.loc);

  const cliOk = await post("/api/clientes", { nome: "Cliente Um", documento: "123", telefone: "31", email: "c@c.com" }, admin);
  check("Cliente é criado", cliOk.loc === "/clientes?ok=1", cliOk.loc);
  const cliente = await prisma.cliente.findFirst({ where: { nome: "Cliente Um" } });
  check("Cliente gravado com os campos certos", cliente?.documento === "123" && cliente?.email === "c@c.com");

  const cliRedir = await post("/api/clientes", { nome: "Cliente Dois", voltar: "https://evil.example" }, admin);
  check("Redirect externo no campo voltar é bloqueado", cliRedir.loc === "/clientes?ok=1", cliRedir.loc);
  const cliRedir2 = await post("/api/clientes", { nome: "Cliente Três", voltar: "//evil.example" }, admin);
  check("Redirect protocolo-relativo é bloqueado", cliRedir2.loc === "/clientes?ok=1", cliRedir2.loc);

  const cliEdita = await post(`/api/clientes/${cliente!.id}`, { nome: "Cliente Um Editado" }, admin);
  check("Cliente é editado", cliEdita.loc === "/clientes?ok=1", cliEdita.loc);
  check("Edição gravou o nome novo", (await prisma.cliente.findUnique({ where: { id: cliente!.id } }))?.nome === "Cliente Um Editado");

  const cliFantasma = await post("/api/clientes/999999", { nome: "N" }, admin);
  check("Editar cliente inexistente não quebra", cliFantasma.loc === "/clientes", cliFantasma.loc);

  // ---------- Obras ----------
  const obraCampos = await post("/api/obras", { nome: "", endereco: "", clienteId: "0", dataInicio: "", prazoDias: "", valorContrato: "", status: "planejada" }, admin);
  check("Obra sem campos é recusada", obraCampos.loc === "/obras/nova?erro=campos", obraCampos.loc);

  const obraStatus = await post("/api/obras", { nome: "O", endereco: "E", clienteId: String(cliente!.id), dataInicio: "2026-01-01", prazoDias: "10", valorContrato: "1000", status: "inventado" }, admin);
  check("Obra com status inválido é recusada", obraStatus.loc === "/obras/nova?erro=campos", obraStatus.loc);

  const obraPrazo = await post("/api/obras", { nome: "O", endereco: "E", clienteId: String(cliente!.id), dataInicio: "2026-01-01", prazoDias: "0", valorContrato: "1000", status: "planejada" }, admin);
  check("Obra com prazo zero é recusada", obraPrazo.loc === "/obras/nova?erro=campos", obraPrazo.loc);

  const obraData = await post("/api/obras", { nome: "O", endereco: "E", clienteId: String(cliente!.id), dataInicio: "01/01/2026", prazoDias: "10", valorContrato: "1000", status: "planejada" }, admin);
  check("Obra com data fora do formato ISO é recusada", obraData.loc === "/obras/nova?erro=campos", obraData.loc);

  const obraCli = await post("/api/obras", { nome: "O", endereco: "E", clienteId: "999999", dataInicio: "2026-01-01", prazoDias: "10", valorContrato: "1000", status: "planejada" }, admin);
  check("Obra com cliente inexistente é recusada", obraCli.loc === "/obras/nova?erro=campos", obraCli.loc);

  const obraOk = await post("/api/obras", { nome: "Obra Teste", endereco: "Rua A", clienteId: String(cliente!.id), dataInicio: "2026-02-01", prazoDias: "180", valorContrato: "1.234,56", status: "em_andamento" }, admin);
  const obraId = Number(/\/obra\/(\d+)/.exec(obraOk.loc)?.[1]);
  check("Obra é criada e redireciona para o painel", Number.isInteger(obraId) && obraId > 0, obraOk.loc);
  const obra = await prisma.obra.findUnique({ where: { id: obraId } });
  check('Valor "1.234,56" é gravado como 1234.56', obra?.valorContrato === 1234.56, String(obra?.valorContrato));
  check("Data de início é gravada em UTC", obra?.dataInicio.toISOString() === "2026-02-01T00:00:00.000Z", String(obra?.dataInicio.toISOString()));

  const obraEdit = await post(`/api/obras/${obraId}`, { nome: "Obra Teste 2", endereco: "Rua B", clienteId: String(cliente!.id), dataInicio: "2026-02-01", prazoDias: "200", valorContrato: "2000", status: "paralisada" }, admin);
  check("Obra é editada", obraEdit.loc === `/obra/${obraId}`, obraEdit.loc);
  check("Edição da obra gravou status e prazo", (await prisma.obra.findUnique({ where: { id: obraId } }))?.status === "paralisada");

  const obraFantasma = await post("/api/obras/999999", { nome: "N" }, admin);
  check("Editar obra inexistente não quebra", obraFantasma.loc === "/", obraFantasma.loc);
  const obra404 = await get("/obra/999999", admin);
  check("Painel de obra inexistente devolve 404", obra404.status === 404, String(obra404.status));

  // ---------- Serviços ----------
  const srvUnid = await post("/api/servicos", { obraId: String(obraId), codigo: "S1", descricao: "D", unidade: "xx", quantidade: "10", precoUnitario: "100" }, admin);
  check("Serviço com unidade inválida é recusado", srvUnid.loc === `/obra/${obraId}/orcamento?erro=campos`, srvUnid.loc);
  const srvQtd = await post("/api/servicos", { obraId: String(obraId), codigo: "S1", descricao: "D", unidade: "m2", quantidade: "0", precoUnitario: "100" }, admin);
  check("Serviço com quantidade zero é recusado", srvQtd.loc === `/obra/${obraId}/orcamento?erro=campos`, srvQtd.loc);
  const srvNeg = await post("/api/servicos", { obraId: String(obraId), codigo: "S1", descricao: "D", unidade: "m2", quantidade: "10", precoUnitario: "-1" }, admin);
  check("Serviço com preço negativo é recusado", srvNeg.loc === `/obra/${obraId}/orcamento?erro=campos`, srvNeg.loc);

  const srv1 = await post("/api/servicos", { obraId: String(obraId), codigo: "S1", descricao: "Fundação", unidade: "m3", quantidade: "100", precoUnitario: "50" }, admin);
  check("Serviço é criado", srv1.loc === `/obra/${obraId}/orcamento?ok=1`, srv1.loc);
  await post("/api/servicos", { obraId: String(obraId), codigo: "S2", descricao: "Alvenaria", unidade: "m2", quantidade: "200", precoUnitario: "10" }, admin);
  const servicos = await prisma.servico.findMany({ where: { obraId }, orderBy: { id: "asc" } });
  check("Dois serviços no orçamento da obra", servicos.length === 2, String(servicos.length));
  const s1 = servicos[0], s2 = servicos[1];

  const srvObraFantasma = await post("/api/servicos", { obraId: "999999", codigo: "S", descricao: "D", unidade: "m2", quantidade: "1", precoUnitario: "1" }, admin);
  check("Serviço em obra inexistente é recusado", srvObraFantasma.loc === "/", srvObraFantasma.loc);

  // ---------- Medições ----------
  const medPeriodo = await post("/api/medicoes", { obraId: String(obraId), periodoInicio: "2026-03-31", periodoFim: "2026-03-01" }, admin);
  check("Medição com fim antes do início é recusada", medPeriodo.loc === `/obra/${obraId}/medicoes?erro=periodo`, medPeriodo.loc);

  const med1r = await post("/api/medicoes", { obraId: String(obraId), periodoInicio: "2026-03-01", periodoFim: "2026-03-31" }, admin);
  const med1 = Number(/medicao\/(\d+)/.exec(med1r.loc)?.[1]);
  check("Medição 1 é criada", Number.isInteger(med1), med1r.loc);
  check("Medição nasce como rascunho número 1", (await prisma.medicao.findUnique({ where: { id: med1 } }))?.numero === 1);

  const med2r = await post("/api/medicoes", { obraId: String(obraId), periodoInicio: "2026-04-01", periodoFim: "2026-04-30" }, admin);
  const med2 = Number(/medicao\/(\d+)/.exec(med2r.loc)?.[1]);
  check("Numeração da medição incrementa", (await prisma.medicao.findUnique({ where: { id: med2 } }))?.numero === 2);

  const itSaldo = await post(`/api/medicoes/${med1}/itens`, { [`qtd_${s1.id}`]: "150" }, admin);
  check("Item acima do saldo orçado é recusado", itSaldo.loc === `/obra/${obraId}/medicao/${med1}?erro=saldo&s=S1`, itSaldo.loc);

  const itNeg = await post(`/api/medicoes/${med1}/itens`, { [`qtd_${s1.id}`]: "-5" }, admin);
  check("Item com quantidade negativa é recusado", itNeg.loc === `/obra/${obraId}/medicao/${med1}?erro=valor&s=S1`, itNeg.loc);

  const itTexto = await post(`/api/medicoes/${med1}/itens`, { [`qtd_${s1.id}`]: "abc" }, admin);
  check("Item com texto no lugar do número é recusado", itTexto.loc === `/obra/${obraId}/medicao/${med1}?erro=valor&s=S1`, itTexto.loc);

  const itOk = await post(`/api/medicoes/${med1}/itens`, { [`qtd_${s1.id}`]: "60", [`qtd_${s2.id}`]: "100", observacoes: "Primeira etapa" }, admin);
  check("Itens da medição são gravados", itOk.loc === `/obra/${obraId}/medicao/${med1}?ok=1`, itOk.loc);
  check("Observações da medição são gravadas", (await prisma.medicao.findUnique({ where: { id: med1 } }))?.observacoes === "Primeira etapa");
  check("Quantidade executada gravada", (await prisma.medicaoItem.findFirst({ where: { medicaoId: med1, servicoId: s1.id } }))?.quantidadeExecutada === 60);

  const itZero = await post(`/api/medicoes/${med1}/itens`, { [`qtd_${s2.id}`]: "0" }, admin);
  check("Quantidade zero remove o item", itZero.loc.endsWith("ok=1") && (await prisma.medicaoItem.count({ where: { medicaoId: med1, servicoId: s2.id } })) === 0, itZero.loc);

  const itVazio = await post(`/api/medicoes/${med1}/itens`, { [`qtd_${s1.id}`]: "" }, admin);
  check("Campo vazio também remove o item", itVazio.loc.endsWith("ok=1") && (await prisma.medicaoItem.count({ where: { medicaoId: med1, servicoId: s1.id } })) === 0, itVazio.loc);

  await post(`/api/medicoes/${med1}/itens`, { [`qtd_${s1.id}`]: "60" }, admin);

  // Saldo entre medições: 100 orçado, 60 na medição 1, resta 40
  const itSaldo2 = await post(`/api/medicoes/${med2}/itens`, { [`qtd_${s1.id}`]: "41" }, admin);
  check("Saldo considera o que outra medição já mediu", itSaldo2.loc === `/obra/${obraId}/medicao/${med2}?erro=saldo&s=S1`, itSaldo2.loc);
  const itSaldo3 = await post(`/api/medicoes/${med2}/itens`, { [`qtd_${s1.id}`]: "40" }, admin);
  check("Medir exatamente o saldo é aceito", itSaldo3.loc === `/obra/${obraId}/medicao/${med2}?ok=1`, itSaldo3.loc);

  // Transições
  const trErrada = await post(`/api/medicoes/${med1}/status`, { acao: "aprovar" }, admin);
  check("Aprovar rascunho direto é recusado", trErrada.loc === `/obra/${obraId}/medicao/${med1}?erro=transicao`, trErrada.loc);
  const trInventada = await post(`/api/medicoes/${med1}/status`, { acao: "destruir" }, admin);
  check("Ação de status inexistente é recusada", trInventada.loc.endsWith("erro=transicao"), trInventada.loc);
  check("Enviar medição funciona", (await post(`/api/medicoes/${med1}/status`, { acao: "enviar" }, admin)).loc.endsWith("ok=1"));
  check("Reabrir medição enviada funciona", (await post(`/api/medicoes/${med1}/status`, { acao: "reabrir" }, admin)).loc.endsWith("ok=1"));
  await post(`/api/medicoes/${med1}/status`, { acao: "enviar" }, admin);
  check("Aprovar medição enviada funciona", (await post(`/api/medicoes/${med1}/status`, { acao: "aprovar" }, admin)).loc.endsWith("ok=1"));
  check("Medição ficou aprovada", (await prisma.medicao.findUnique({ where: { id: med1 } }))?.status === "aprovada");

  const trDeAprovada = await post(`/api/medicoes/${med1}/status`, { acao: "reabrir" }, admin);
  check("Medição aprovada não reabre", trDeAprovada.loc.endsWith("erro=transicao"), trDeAprovada.loc);
  const itTravada = await post(`/api/medicoes/${med1}/itens`, { [`qtd_${s1.id}`]: "10" }, admin);
  check("Medição aprovada não aceita novos itens", itTravada.loc.endsWith("erro=travada"), itTravada.loc);
  const periodoTravado = await post(`/api/medicoes/${med1}`, { periodoInicio: "2026-03-02", periodoFim: "2026-03-30" }, admin);
  check("Medição aprovada não aceita troca de período", periodoTravado.loc.endsWith("erro=travada"), periodoTravado.loc);
  const excluirTravada = await post(`/api/medicoes/${med1}/excluir`, {}, admin);
  check("Medição aprovada não é excluída", excluirTravada.loc.endsWith("erro=travada"), excluirTravada.loc);

  const periodoOk = await post(`/api/medicoes/${med2}`, { periodoInicio: "2026-04-02", periodoFim: "2026-04-29" }, admin);
  check("Período de medição em rascunho é editável", periodoOk.loc === `/obra/${obraId}/medicao/${med2}?ok=1`, periodoOk.loc);
  const periodoRuim = await post(`/api/medicoes/${med2}`, { periodoInicio: "2026-04-30", periodoFim: "2026-04-01" }, admin);
  check("Período invertido na edição é recusado", periodoRuim.loc.endsWith("erro=periodo"), periodoRuim.loc);

  // Serviço já medido
  const srvReduz = await post(`/api/servicos/${s1.id}`, { codigo: "S1", descricao: "Fundação", unidade: "m3", quantidade: "50", precoUnitario: "50" }, admin);
  check("Reduzir o orçado abaixo do medido é recusado", srvReduz.loc === `/obra/${obraId}/orcamento?erro=qtd_medida&s=S1`, srvReduz.loc);
  const srvExclui = await post(`/api/servicos/${s1.id}/excluir`, {}, admin);
  check("Excluir serviço já medido é recusado", srvExclui.loc === `/obra/${obraId}/orcamento?erro=excluir_medido&s=S1`, srvExclui.loc);
  const srvSobe = await post(`/api/servicos/${s1.id}`, { codigo: "S1", descricao: "Fundação", unidade: "m3", quantidade: "120", precoUnitario: "60" }, admin);
  check("Aumentar o orçado é aceito", srvSobe.loc === `/obra/${obraId}/orcamento?ok=1`, srvSobe.loc);

  const s3r = await post("/api/servicos", { obraId: String(obraId), codigo: "S3", descricao: "Pintura", unidade: "m2", quantidade: "10", precoUnitario: "5" }, admin);
  const s3 = await prisma.servico.findFirst({ where: { obraId, codigo: "S3" } });
  check("Serviço sem medição pode ser excluído", (await post(`/api/servicos/${s3!.id}/excluir`, {}, admin)).loc === `/obra/${obraId}/orcamento?ok=1`, s3r.loc);

  // Valor medido aprovado: 60 x 60 (preço novo) = 3600
  const itensAprovados = await prisma.medicaoItem.findMany({ where: { medicao: { obraId, status: "aprovada" } }, include: { servico: true } });
  const valorAprovado = itensAprovados.reduce((a, i) => a + i.quantidadeExecutada * i.servico.precoUnitario, 0);
  check("Valor medido soma só as medições aprovadas", valorAprovado === 3600, String(valorAprovado));

  const excluirRascunho = await post(`/api/medicoes/${med2}/excluir`, {}, admin);
  check("Medição em rascunho é excluída", excluirRascunho.loc === `/obra/${obraId}/medicoes?ok=excluida`, excluirRascunho.loc);
  check("Itens da medição excluída saem junto", (await prisma.medicaoItem.count({ where: { medicaoId: med2 } })) === 0);

  // ---------- Diário ----------
  const diClima = await post("/api/diarios", { obraId: String(obraId), data: "2026-05-01", climaManha: "Sol", climaTarde: "Furacao", efetivo: "5", atividades: "A" }, admin);
  check("Diário com clima inválido é recusado", diClima.loc === `/obra/${obraId}/diario?erro=campos`, diClima.loc);
  const diSemAtiv = await post("/api/diarios", { obraId: String(obraId), data: "2026-05-01", climaManha: "Sol", climaTarde: "Sol", efetivo: "5", atividades: " " }, admin);
  check("Diário sem atividades é recusado", diSemAtiv.loc.endsWith("erro=campos"), diSemAtiv.loc);
  const diEfNeg = await post("/api/diarios", { obraId: String(obraId), data: "2026-05-01", climaManha: "Sol", climaTarde: "Sol", efetivo: "-1", atividades: "A" }, admin);
  check("Diário com efetivo negativo é recusado", diEfNeg.loc.endsWith("erro=campos"), diEfNeg.loc);
  const diEfTexto = await post("/api/diarios", { obraId: String(obraId), data: "2026-05-01", climaManha: "Sol", climaTarde: "Sol", efetivo: "muitos", atividades: "A" }, admin);
  check("Diário com efetivo não numérico é recusado", diEfTexto.loc.endsWith("erro=campos"), diEfTexto.loc);

  const diOk = await post("/api/diarios", { obraId: String(obraId), data: "2026-05-01", climaManha: "Sol", climaTarde: "Chuva", efetivo: "12", atividades: "Concretagem", ocorrencias: "Chuva à tarde" }, admin);
  check("Diário é criado", diOk.loc === `/obra/${obraId}/diario?ok=1`, diOk.loc);
  const diDup = await post("/api/diarios", { obraId: String(obraId), data: "2026-05-01", climaManha: "Sol", climaTarde: "Sol", efetivo: "10", atividades: "Outra" }, admin);
  check("Dois diários na mesma data são bloqueados", diDup.loc === `/obra/${obraId}/diario?erro=duplicado`, diDup.loc);

  const diario = await prisma.diario.findFirst({ where: { obraId } });
  const diEdit = await post(`/api/diarios/${diario!.id}`, { data: "2026-05-02", climaManha: "Nublado", climaTarde: "Sol", efetivo: "9", atividades: "Alvenaria" }, admin);
  check("Diário é editado", diEdit.loc === `/obra/${obraId}/diario?ok=1`, diEdit.loc);
  check("Edição do diário gravou o efetivo novo", (await prisma.diario.findUnique({ where: { id: diario!.id } }))?.efetivo === 9);
  await post("/api/diarios", { obraId: String(obraId), data: "2026-05-05", climaManha: "Sol", climaTarde: "Sol", efetivo: "3", atividades: "X" }, admin);
  const outro = await prisma.diario.findFirst({ where: { obraId, data: new Date("2026-05-05T00:00:00.000Z") } });
  const diEditDup = await post(`/api/diarios/${outro!.id}`, { data: "2026-05-02", climaManha: "Sol", climaTarde: "Sol", efetivo: "3", atividades: "X" }, admin);
  check("Editar diário para data já usada é bloqueado", diEditDup.loc.endsWith("erro=duplicado"), diEditDup.loc);
  check("Diário é excluído", (await post(`/api/diarios/${outro!.id}/excluir`, {}, admin)).loc === `/obra/${obraId}/diario?ok=1`);

  // ---------- Recebimentos ----------
  const recZero = await post("/api/recebimentos", { obraId: String(obraId), data: "2026-05-01", valor: "0" }, admin);
  check("Recebimento com valor zero é recusado", recZero.loc === `/obra/${obraId}/recebimentos?erro=campos`, recZero.loc);
  const recSemData = await post("/api/recebimentos", { obraId: String(obraId), data: "", valor: "100" }, admin);
  check("Recebimento sem data é recusado", recSemData.loc.endsWith("erro=campos"), recSemData.loc);
  const recOk = await post("/api/recebimentos", { obraId: String(obraId), data: "2026-05-10", valor: "1.500,50", descricao: "Parcela" }, admin);
  check("Recebimento é criado", recOk.loc === `/obra/${obraId}/recebimentos?ok=1`, recOk.loc);
  const rec = await prisma.recebimento.findFirst({ where: { obraId } });
  check("Valor do recebimento gravado em pt-BR", rec?.valor === 1500.5, String(rec?.valor));
  check("Recebimento é excluído", (await post(`/api/recebimentos/${rec!.id}/excluir`, {}, admin)).loc === `/obra/${obraId}/recebimentos?ok=1`);

  // ---------- Funcionários ----------
  const funDiaria = await post("/api/funcionarios", { nome: "F", funcao: "Pedreiro", diaria: "0" }, admin);
  check("Funcionário com diária zero é recusado", funDiaria.loc === "/funcionarios?erro=campos", funDiaria.loc);
  const funSemFuncao = await post("/api/funcionarios", { nome: "F", funcao: "", diaria: "100" }, admin);
  check("Funcionário sem função é recusado", funSemFuncao.loc.endsWith("erro=campos"), funSemFuncao.loc);
  const funOk = await post("/api/funcionarios", { nome: "João", funcao: "Pedreiro", diaria: "180" }, admin);
  check("Funcionário é criado", funOk.loc === "/funcionarios?ok=1", funOk.loc);
  const func = await prisma.funcionario.findFirst({ where: { nome: "João" } });

  const movTipo = await post(`/api/funcionarios/${func!.id}/movimentos`, { tipo: "inventado", data: "2026-05-01", dias: "5" }, admin);
  check("Movimento com tipo inválido é recusado", movTipo.loc === "/funcionarios?erro=campos", movTipo.loc);
  const movDias = await post(`/api/funcionarios/${func!.id}/movimentos`, { tipo: "trabalho", data: "2026-05-01", dias: "0" }, admin);
  check("Movimento de trabalho com zero dias é recusado", movDias.loc.endsWith("erro=campos"), movDias.loc);
  const movTrab = await post(`/api/funcionarios/${func!.id}/movimentos`, { tipo: "trabalho", data: "2026-05-01", dias: "6", descricao: "Semana" }, admin);
  check("Movimento de trabalho é lançado", movTrab.loc === "/funcionarios?ok=1", movTrab.loc);
  const mTrab = await prisma.movimentoFuncionario.findFirst({ where: { funcionarioId: func!.id, tipo: "trabalho" } });
  check("Valor do trabalho é dias x diária", mTrab?.valor === 1080, String(mTrab?.valor));
  const movPagNeg = await post(`/api/funcionarios/${func!.id}/movimentos`, { tipo: "pagamento", data: "2026-05-02", valor: "-10" }, admin);
  check("Pagamento negativo é recusado", movPagNeg.loc.endsWith("erro=campos"), movPagNeg.loc);
  await post(`/api/funcionarios/${func!.id}/movimentos`, { tipo: "pagamento", data: "2026-05-02", valor: "500" }, admin);
  const movs = await prisma.movimentoFuncionario.findMany({ where: { funcionarioId: func!.id } });
  const saldo = movs.reduce((a, m) => a + (m.tipo === "trabalho" ? m.valor : -m.valor), 0);
  check("Saldo do funcionário é trabalho menos pagamento", saldo === 580, String(saldo));
  const funEdit = await post(`/api/funcionarios/${func!.id}`, { nome: "João P", funcao: "Pedreiro", diaria: "200" }, admin);
  check("Funcionário é editado", funEdit.loc === "/funcionarios?ok=1", funEdit.loc);
  const mPag = movs.find((m) => m.tipo === "pagamento")!;
  check("Movimento do funcionário é excluído", (await post(`/api/movimentos-funcionario/${mPag.id}/excluir`, {}, admin)).loc === "/funcionarios?ok=1");

  // ---------- Materiais ----------
  const matUnid = await post("/api/materiais", { nome: "Cimento", unidade: "xx" }, admin);
  check("Material com unidade inválida é recusado", matUnid.loc === "/materiais?erro=campos", matUnid.loc);
  const matOk = await post("/api/materiais", { nome: "Cimento", unidade: "sc" }, admin);
  check("Material é criado", matOk.loc === "/materiais?ok=1", matOk.loc);
  const mat = await prisma.material.findFirst({ where: { nome: "Cimento" } });

  const movUsoSemEstoque = await post(`/api/materiais/${mat!.id}/movimentos`, { tipo: "uso", data: "2026-05-01", quantidade: "1" }, admin);
  check("Uso sem estoque é bloqueado", movUsoSemEstoque.loc === `/materiais?erro=estoque&m=Cimento`, movUsoSemEstoque.loc);
  const movCompraSemPreco = await post(`/api/materiais/${mat!.id}/movimentos`, { tipo: "compra", data: "2026-05-01", quantidade: "10", precoUnitario: "" }, admin);
  check("Compra sem preço é recusada", movCompraSemPreco.loc === "/materiais?erro=campos", movCompraSemPreco.loc);
  const movQtdZero = await post(`/api/materiais/${mat!.id}/movimentos`, { tipo: "compra", data: "2026-05-01", quantidade: "0", precoUnitario: "10" }, admin);
  check("Movimento de material com quantidade zero é recusado", movQtdZero.loc.endsWith("erro=campos"), movQtdZero.loc);
  const movCompra = await post(`/api/materiais/${mat!.id}/movimentos`, { tipo: "compra", data: "2026-05-01", quantidade: "100", precoUnitario: "38,90" }, admin);
  check("Compra de material é lançada", movCompra.loc === "/materiais?ok=1", movCompra.loc);
  const movUsoDemais = await post(`/api/materiais/${mat!.id}/movimentos`, { tipo: "uso", data: "2026-05-02", quantidade: "101" }, admin);
  check("Uso acima do estoque é bloqueado", movUsoDemais.loc === `/materiais?erro=estoque&m=Cimento`, movUsoDemais.loc);
  const movUsoObraRuim = await post(`/api/materiais/${mat!.id}/movimentos`, { tipo: "uso", data: "2026-05-02", quantidade: "10", obraId: "999999" }, admin);
  check("Uso com obra inexistente é recusado", movUsoObraRuim.loc === "/materiais?erro=campos", movUsoObraRuim.loc);
  const movUso = await post(`/api/materiais/${mat!.id}/movimentos`, { tipo: "uso", data: "2026-05-02", quantidade: "60", obraId: String(obraId) }, admin);
  check("Uso dentro do estoque é aceito", movUso.loc === "/materiais?ok=1", movUso.loc);
  const movimentos = await prisma.movimentoMaterial.findMany({ where: { materialId: mat!.id } });
  const estoque = movimentos.reduce((a, m) => a + (m.tipo === "compra" ? m.quantidade : -m.quantidade), 0);
  check("Estoque é compras menos usos", estoque === 40, String(estoque));
  const compra = movimentos.find((m) => m.tipo === "compra")!;
  const excluirCompra = await post(`/api/movimentos-material/${compra.id}/excluir`, {}, admin);
  check("Excluir compra que deixaria estoque negativo é bloqueado", excluirCompra.loc === `/materiais?erro=estoque_excluir&m=Cimento`, excluirCompra.loc);
  const uso = movimentos.find((m) => m.tipo === "uso")!;
  check("Movimento de uso é excluído", (await post(`/api/movimentos-material/${uso.id}/excluir`, {}, admin)).loc === "/materiais?ok=1");
  check("Depois de remover o uso, a compra pode sair", (await post(`/api/movimentos-material/${compra.id}/excluir`, {}, admin)).loc === "/materiais?ok=1");
  const matEdit = await post(`/api/materiais/${mat!.id}`, { nome: "Cimento CP-II", unidade: "kg" }, admin);
  check("Material é editado", matEdit.loc === "/materiais?ok=1", matEdit.loc);

  // ---------- Fotos ----------
  const png = Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6300010000050001", "hex");
  const fdFoto = new FormData();
  fdFoto.append("obraId", String(obraId));
  fdFoto.append("data", "2026-05-20");
  fdFoto.append("legenda", "Fachada");
  fdFoto.append("arquivos", new Blob([png], { type: "image/png" }), "teste.png");
  const fotoOk = await postFD("/api/fotos", fdFoto, admin);
  check("Foto é enviada", fotoOk.loc === `/obra/${obraId}/fotos?ok=1`, fotoOk.loc);
  const foto = await prisma.foto.findFirst({ where: { obraId } });
  check("Foto gravada com caminho em /uploads", !!foto && foto.caminhoArquivo.startsWith("/uploads/"), String(foto?.caminhoArquivo));
  const arquivoServido = await fetch(BASE + foto!.caminhoArquivo);
  check("Arquivo da foto é servido pela aplicação", arquivoServido.status === 200, String(arquivoServido.status));

  const fdSemArquivo = new FormData();
  fdSemArquivo.append("obraId", String(obraId));
  fdSemArquivo.append("data", "2026-05-20");
  const semArquivo = await postFD("/api/fotos", fdSemArquivo, admin);
  check("Envio sem arquivo é recusado", semArquivo.loc === `/obra/${obraId}/fotos?erro=sem_arquivo`, semArquivo.loc);

  const fdNaoImagem = new FormData();
  fdNaoImagem.append("obraId", String(obraId));
  fdNaoImagem.append("data", "2026-05-20");
  fdNaoImagem.append("arquivos", new Blob([Buffer.from("texto")], { type: "text/plain" }), "a.txt");
  const naoImagem = await postFD("/api/fotos", fdNaoImagem, admin);
  check("Arquivo que não é imagem é recusado", naoImagem.loc === `/obra/${obraId}/fotos?erro=sem_imagem`, naoImagem.loc);

  const fdSemData = new FormData();
  fdSemData.append("obraId", String(obraId));
  fdSemData.append("data", "");
  fdSemData.append("arquivos", new Blob([png], { type: "image/png" }), "b.png");
  const fotoSemData = await postFD("/api/fotos", fdSemData, admin);
  check("Foto sem data é recusada", fotoSemData.loc === `/obra/${obraId}/fotos?erro=campos`, fotoSemData.loc);

  // Serviço de outra obra não pode ser vinculado à foto
  const outraObraR = await post("/api/obras", { nome: "Outra", endereco: "R", clienteId: String(cliente!.id), dataInicio: "2026-01-01", prazoDias: "30", valorContrato: "100", status: "planejada" }, admin);
  const outraObraId = Number(/\/obra\/(\d+)/.exec(outraObraR.loc)?.[1]);
  await post("/api/servicos", { obraId: String(outraObraId), codigo: "X1", descricao: "D", unidade: "m2", quantidade: "1", precoUnitario: "1" }, admin);
  const srvOutra = await prisma.servico.findFirst({ where: { obraId: outraObraId } });
  const fdServicoErrado = new FormData();
  fdServicoErrado.append("obraId", String(obraId));
  fdServicoErrado.append("data", "2026-05-20");
  fdServicoErrado.append("servicoId", String(srvOutra!.id));
  fdServicoErrado.append("arquivos", new Blob([png], { type: "image/png" }), "c.png");
  const servicoErrado = await postFD("/api/fotos", fdServicoErrado, admin);
  check("Foto não aceita serviço de outra obra", servicoErrado.loc === `/obra/${obraId}/fotos?erro=campos`, servicoErrado.loc);

  const fotoEdit = await post(`/api/fotos/${foto!.id}`, { data: "2026-05-21", legenda: "Fachada lateral", servicoId: String(s1.id) }, admin);
  check("Foto é editada", fotoEdit.loc === `/obra/${obraId}/fotos?ok=salvo`, fotoEdit.loc);
  const fotoEditErrada = await post(`/api/fotos/${foto!.id}`, { data: "2026-05-21", servicoId: String(srvOutra!.id) }, admin);
  check("Edição da foto rejeita serviço de outra obra", fotoEditErrada.loc === `/obra/${obraId}/fotos?erro=campos`, fotoEditErrada.loc);
  const caminho = foto!.caminhoArquivo;
  const fotoExclui = await post(`/api/fotos/${foto!.id}/excluir`, {}, admin);
  check("Foto é excluída", fotoExclui.loc === `/obra/${obraId}/fotos?ok=salvo`, fotoExclui.loc);
  check("Registro da foto sai do banco", (await prisma.foto.count({ where: { id: foto!.id } })) === 0);
  const fs = await import("fs/promises");
  const aindaExiste = await fs
    .stat(`${process.cwd()}/public/uploads/${caminho.split("/").pop()}`)
    .then(() => true)
    .catch(() => false);
  check("Arquivo da foto sai do disco", !aindaExiste);

  // ---------- Chamados ----------
  const chCampos = await post("/api/chamados", { titulo: "", descricao: "" }, emp);
  check("Chamado sem título é recusado", chCampos.loc === "/chamados?erro=campos", chCampos.loc);
  const chPrio = await post("/api/chamados", { titulo: "T", descricao: "D", prioridade: "urgentissima" }, emp);
  check("Chamado com prioridade inválida é recusado", chPrio.loc.endsWith("erro=campos"), chPrio.loc);
  const chOk = await post("/api/chamados", { titulo: "Bug na medição", descricao: "Detalhe", prioridade: "alta", tela: "Medições" }, emp);
  check("Empreiteiro abre chamado", chOk.loc === "/chamados?ok=aberto", chOk.loc);
  const chamado = await prisma.chamado.findFirst({ where: { titulo: "Bug na medição" } });
  check("Chamado nasce aberto e com a tela informada", chamado?.status === "aberto" && chamado?.tela === "Medições");
  const chTelaRuim = await post("/api/chamados", { titulo: "T2", descricao: "D", prioridade: "baixa", tela: "Tela Inventada" }, emp);
  check("Tela fora da lista é gravada como nula", chTelaRuim.loc.endsWith("ok=aberto") && (await prisma.chamado.findFirst({ where: { titulo: "T2" } }))?.tela === null);

  const chStatusEmp = await post(`/api/chamados/${chamado!.id}/status`, { acao: "analisar" }, emp);
  check("Empreiteiro não muda status de chamado", chStatusEmp.loc === "/chamados?erro=permissao", chStatusEmp.loc);
  const chEditaOutro = await post(`/api/chamados/${chamado!.id}`, { titulo: "Invadido", descricao: "D", prioridade: "baixa" }, emp2);
  check("Empreiteiro não edita chamado de outro", chEditaOutro.loc === "/chamados?erro=permissao", chEditaOutro.loc);
  const chExcluiOutro = await post(`/api/chamados/${chamado!.id}/excluir`, {}, emp2);
  check("Empreiteiro não exclui chamado de outro", chExcluiOutro.loc === "/chamados?erro=permissao", chExcluiOutro.loc);
  const chEditaProprio = await post(`/api/chamados/${chamado!.id}`, { titulo: "Bug na medição (corrigido)", descricao: "Mais detalhe", prioridade: "media", tela: "Medições" }, emp);
  check("Autor edita o próprio chamado aberto", chEditaProprio.loc === "/chamados?ok=1", chEditaProprio.loc);

  const chTrRuim = await post(`/api/chamados/${chamado!.id}/status`, { acao: "reabrir" }, admin);
  check("Reabrir chamado já aberto é recusado", chTrRuim.loc === "/chamados?erro=transicao", chTrRuim.loc);
  const chAnalisar = await post(`/api/chamados/${chamado!.id}/status`, { acao: "analisar", resposta: "Estou vendo" }, admin);
  check("Admin põe chamado em análise", chAnalisar.loc === "/chamados?ok=1", chAnalisar.loc);
  check("Resposta do admin é gravada", (await prisma.chamado.findUnique({ where: { id: chamado!.id } }))?.resposta === "Estou vendo");
  const chExcluiEmAnalise = await post(`/api/chamados/${chamado!.id}/excluir`, {}, emp);
  check("Autor não exclui chamado que saiu de aberto", chExcluiEmAnalise.loc === "/chamados?erro=permissao", chExcluiEmAnalise.loc);
  const chResolver = await post(`/api/chamados/${chamado!.id}/status`, { acao: "resolver", resposta: "Corrigido" }, admin);
  check("Admin resolve o chamado", chResolver.loc === "/chamados?ok=1", chResolver.loc);
  const resolvido = await prisma.chamado.findUnique({ where: { id: chamado!.id } });
  check("Chamado resolvido grava a data de resolução", resolvido?.status === "resolvido" && !!resolvido?.resolvidoEm);
  const chEditaResolvido = await post(`/api/chamados/${chamado!.id}`, { titulo: "T", descricao: "D", prioridade: "baixa" }, emp);
  check("Autor não edita chamado resolvido", chEditaResolvido.loc === "/chamados?erro=permissao", chEditaResolvido.loc);
  const chReabre = await post(`/api/chamados/${chamado!.id}/status`, { acao: "reabrir" }, admin);
  check("Admin reabre chamado resolvido", chReabre.loc === "/chamados?ok=1", chReabre.loc);
  check("Reabrir limpa a data de resolução", (await prisma.chamado.findUnique({ where: { id: chamado!.id } }))?.resolvidoEm === null);
  const chAdminEdita = await post(`/api/chamados/${chamado!.id}`, { titulo: "Ajustado pelo admin", descricao: "D", prioridade: "alta" }, admin);
  check("Admin edita qualquer chamado", chAdminEdita.loc === "/chamados?ok=1", chAdminEdita.loc);
  const t2 = await prisma.chamado.findFirst({ where: { titulo: "T2" } });
  check("Autor cancela o próprio chamado aberto", (await post(`/api/chamados/${t2!.id}/excluir`, {}, emp)).loc === "/chamados?ok=1");
  check("Admin exclui qualquer chamado", (await post(`/api/chamados/${chamado!.id}/excluir`, {}, admin)).loc === "/chamados?ok=1");

  // ---------- Telas ----------
  const med = await prisma.medicao.findFirst({ where: { obraId } });
  const jaLogado = await get("/login", admin);
  check("Quem já tem sessão não fica na tela de login", jaLogado.status === 307 && jaLogado.loc.endsWith("/"), `${jaLogado.status} ${jaLogado.loc}`);
  const loginAberto = await get("/login");
  check("Tela /login abre sem sessão", loginAberto.status === 200, String(loginAberto.status));

  const telas = [
    "/",
    "/clientes",
    "/funcionarios",
    "/materiais",
    "/chamados",
    "/obras/nova",
    `/obra/${obraId}`,
    `/obra/${obraId}/editar`,
    `/obra/${obraId}/orcamento`,
    `/obra/${obraId}/medicoes`,
    `/obra/${obraId}/diario`,
    `/obra/${obraId}/fotos`,
    `/obra/${obraId}/recebimentos`,
    `/obra/${obraId}/medicao/${med!.id}`,
    `/obra/${obraId}/medicao/${med!.id}/imprimir`,
  ];
  for (const tela of telas) {
    const r = await get(tela, admin);
    const erro = /Application error|Internal Server Error/i.test(r.corpo);
    check(`Tela ${tela} abre para o admin`, r.status === 200 && !erro, `${r.status}${erro ? " com erro de runtime" : ""}`);
  }
  for (const tela of telas) {
    const r = await get(tela, emp);
    check(`Tela ${tela} abre para o empreiteiro`, r.status === 200, String(r.status));
  }
  for (const tela of telas) {
    const r = await get(tela);
    check(`Tela ${tela} exige sessão`, r.status === 307 && r.loc.endsWith("/login"), `${r.status} ${r.loc}`);
  }

  // ---------- Resultado ----------
  console.log(`\n${passaram} passaram, ${falhas.length} falharam`);
  if (falhas.length) {
    console.log("\nFalhas:");
    for (const f of falhas) console.log(` - ${f}`);
    process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
