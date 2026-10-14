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
- **Chamados (suporte do sistema)** — canal do empreiteiro para relatar
  bugs e dificuldades do ObraPlan ao administrador: título, descrição,
  tela onde ocorreu e prioridade. O administrador vê todos os chamados,
  responde, põe em análise, resolve e reabre; o empreiteiro vê apenas os
  seus e acompanha a resposta.

## Papéis de usuário

| Papel         | Pode                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------ |
| `admin`       | Tudo do empreiteiro + ver **todos** os chamados, responder, triar, resolver, reabrir e excluir   |
| `empreiteiro` | Todas as telas de obra (orçamento, medições, diário, fotos, recebimentos, funcionários, materiais) + abrir chamados e acompanhar os **seus** |

O empreiteiro pode editar o próprio chamado enquanto não está resolvido e
cancelá-lo enquanto está aberto. Tudo isso é verificado no servidor.

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

## Hospedagem na Vercel

O projeto roda na Vercel com Postgres e Vercel Blob. O disco da Vercel é
efêmero, então nada pode ser gravado em `public/uploads` em produção: as
fotos vão para o Blob (ver `lib/armazenamento.ts`).

Variáveis de ambiente do projeto na Vercel:

| Variável | Para quê |
| --- | --- |
| `DATABASE_URL` | string de conexão do Postgres |
| `BLOB_READ_WRITE_TOKEN` | token do Vercel Blob, onde ficam as fotos |

O build roda `npm run vercel-build`, que aplica as migrações antes de
compilar. Depois do primeiro deploy, rode o seed e crie o administrador
apontando `DATABASE_URL` para o banco de produção.

Sem `BLOB_READ_WRITE_TOKEN`, o armazenamento cai para `public/uploads`, que
é o modo de desenvolvimento local.

## Hospedagem em VPS (Hostinger, Hetzner, DigitalOcean)

Um VPS Ubuntu roda tudo numa máquina só: Next.js, Postgres e as fotos em
disco. Sem `BLOB_READ_WRITE_TOKEN`, `lib/armazenamento.ts` grava em
`public/uploads`, que no VPS persiste.

Como root, no servidor:

```bash
git clone https://github.com/ghastly0301/obraplan /opt/obraplan
DOMINIO=seu-dominio.com.br REPO=https://github.com/ghastly0301/obraplan \
  BRANCH=main bash /opt/obraplan/implantacao/instalar-vps.sh
```

O script instala Node 20, Postgres e nginx, cria o banco e o `.env`, aplica
as migrações, compila, sobe o serviço `systemd` e agenda o backup diário.
Rodar de novo atualiza o código e reinicia. Os arquivos ficam em
`implantacao/`.

Os dois últimos passos são seus, nesta ordem: `certbot --nginx` para o HTTPS
(depois do DNS apontar para o servidor) e `npm run criar-admin` para o seu
acesso de administrador.

## Testes

```bash
npm run testar
```

Sobe um banco `obraplan_test` e um servidor na porta 3100, roda a bateria de
ponta a ponta (`scripts/testes-e2e.ts`) e derruba tudo. Precisa de um
Postgres acessível; `DATABASE_URL_TESTE` aponta para outro banco se quiser.

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

## Logins de teste

| Papel           | E-mail                         | Senha             |
| --------------- | ------------------------------ | ----------------- |
| Administrador   | `derik@obraplan.com.br`        | `Obra@Plan2026`   |
| Empreiteiro     | `empreiteiro@obraplan.com.br`  | `Teste@Obra2026`  |

> ⚠️ **AVISO:** troque estes e-mails e senhas antes de colocar a aplicação
> no ar — eles estão publicados neste README. As senhas são gravadas com
> bcrypt (nunca em texto puro); para trocar, edite `prisma/seed.ts` e rode o
> seed novamente, ou atualize o hash direto no banco.

## Acesso de administrador privado

Os logins da tabela acima estão publicados aqui, então servem só para
demonstração. Para um administrador de verdade, use um acesso que não
passa pelo repositório:

```bash
cp .env.admin.exemplo .env.admin   # .env.admin está no .gitignore
# edite .env.admin e escolha e-mail e senha (mínimo de 12 caracteres)
npm run criar-admin
```

O comando cria o usuário com papel `admin` ou, se o e-mail já existir,
atualiza o nome e a senha dele. Em qualquer um dos casos as sessões
antigas desse usuário são derrubadas.

Rode sempre **depois** do seed: o seed apaga todos os usuários.

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
