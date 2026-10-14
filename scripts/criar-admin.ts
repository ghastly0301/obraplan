import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Cria (ou atualiza) um administrador a partir das variáveis de ambiente.
// As credenciais ficam em .env.admin, que não vai para o git, para que o
// acesso de administrador não fique publicado junto com o código.
// Rode depois do seed: o seed apaga todos os usuários.
async function main() {
  const email = process.env.ADMIN_EMAIL?.trim();
  const senha = process.env.ADMIN_SENHA;
  const nome = process.env.ADMIN_NOME?.trim() || "Administrador";

  if (!email || !senha) {
    console.error("Defina ADMIN_EMAIL e ADMIN_SENHA (veja .env.admin.exemplo).");
    process.exit(1);
  }
  if (senha.length < 12) {
    console.error("ADMIN_SENHA precisa de pelo menos 12 caracteres.");
    process.exit(1);
  }

  const senhaHash = bcrypt.hashSync(senha, 10);
  const usuario = await prisma.usuario.upsert({
    where: { email },
    update: { nome, senhaHash, papel: "admin" },
    create: { nome, email, senhaHash, papel: "admin" },
  });

  // Derruba as sessões antigas desse usuário: a senha mudou.
  await prisma.sessao.deleteMany({ where: { usuarioId: usuario.id } });

  console.log(`Administrador pronto: ${usuario.email} (id ${usuario.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
