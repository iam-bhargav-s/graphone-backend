import { prisma } from "../src/lib/prisma";

async function main() {
  const count = await prisma.paper.count();

  console.log("Connected successfully!");
  console.log("Current papers:", count);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });