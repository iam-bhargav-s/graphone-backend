import { prisma } from "../src/lib/prisma";

async function main() {
  const result = await prisma.paperAuthor.deleteMany();
  console.log(`Deleted ${result.count} relations.`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });