const bcrypt = require("bcryptjs");

async function main() {
  const senhas = [
    "admin123",
    "sindico123",
    "morador123",
    "maria123",
    "prestador123",
    "ana123",
    "pedro123",
    "roberto123",
    "admin456",
    "prestador456",
  ];

  for (const senha of senhas) {
    const hash = await bcrypt.hash(senha, 12);
    console.log(`${senha}:${hash}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});