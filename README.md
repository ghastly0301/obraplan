# ObraPlan

SaaS web em português do Brasil para empreiteiros de pequeno e médio porte
gerenciarem obras: orçamento, medições (com folha de impressão), diário de
obra, fotos, recebimentos do cliente, funcionários (dias trabalhados e
valor a receber), materiais (compras, estoque e uso) e chamados.
Mobile-first — pensado para uso no canteiro, pelo celular.

## Módulos

- **Obras** — criar, editar (inclusive status), painel com contrato, medido,
  % físico e saldo a medir.
- **Clientes** — cadastro e edição.
- **Orçamento** — serviços com quantidade e preço unitário; total no rodapé.
- **Medições** — criar, editar período, lançar quantidades com saldo
  bloqueado no servidor, enviar → aprovar (aprovada trava), excluir
  (não aprovada) e folha de impressão com valor por extenso.
- **Diário de obra** — um por dia, com clima, efetivo, atividades e
  ocorrências; editar e excluir.
- **Fotos** — upload múltiplo, legenda e serviço; editar e excluir
  (o arquivo é removido do disco).
- **Recebimentos** — o que o cliente já pagou de cada obra vs. o medido
  aprovado (saldo a receber).
- **Funcionários** — quantidade, função, diária, lançamento de dias
  trabalhados e pagamentos; valor a receber de cada um.
- **Materiais** — compras (com preço e fornecedor), estoque atual e uso por
  obra; não deixa usar mais do que há em estoque.
- **Chamados** — abrir chamado com título e descrição (opcionalmente ligado
  a uma obra), marcar como resolvido, reabrir, editar e excluir.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Prisma + SQLite (arquivo local, zero configuração)
- Autenticação própria: bcrypt + cookie de sessão httpOnly
- Fotos salvas em `public/uploads` (disco local)
- Impressão da medição via CSS `@media print` (use "Imprimir / salvar como
  PDF" do navegador — sem biblioteca de PDF)

## Como instalar

Requisitos: Node.js 18.18+ (testado com Node 24).

```bash
npm install
npx prisma migrate deploy   # cria o banco SQLite (prisma/dev.db)
```

## Como rodar o seed (dados de teste)

```bash
npm run seed
```

Atenção: o seed **apaga todos os dados** e recria os dados de demonstração
(1 usuário, 2 clientes, 2 obras, 8 serviços, 2 medições e 3 diários).

## Como subir o servidor

```bash
npm run dev
```

A aplicação sobe em **http://localhost:3001**.

Para produção: `npm run build && npm start` (também na porta 3001).
Observação: rode em modo `dev` se for enviar fotos, pois em produção o
Next.js só garante a entrega de arquivos que já estavam em `public/` no
momento do build.

## Login de teste

| Campo  | Valor                   |
| ------ | ----------------------- |
| E-mail | `derik@obraplan.com.br` |
| Senha  | `Obra@Plan2026`         |

> ⚠️ **AVISO:** troque este e-mail e senha antes de colocar a aplicação no
> ar. A senha é gravada com bcrypt (nunca em texto puro); para trocar, edite
> `prisma/seed.ts` e rode o seed novamente, ou atualize o hash direto no
> banco.

## Regras de negócio implementadas (validadas no servidor)

1. Já medido + sendo medido nunca ultrapassa a quantidade orçada do serviço
   (bloqueado na API, com o saldo exibido na tela).
2. Valor da medição = Σ (quantidade executada × preço unitário).
3. % físico da obra = valor acumulado das medições **aprovadas** ÷ total do
   orçamento.
4. Medição aprovada fica travada: itens e status não mudam mais.
5. Um único diário por obra por data (índice único no banco).
6. Toda rota exige sessão válida, exceto `/login` (verificação no servidor).
7. Valores em dinheiro no formato `R$ 1.234,56`.
