require('dotenv').config({ path: '.env.test' });

console.log(">>> DATABASE_URL =", process.env.DATABASE_URL);

const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  await prisma.$connect();
  console.log(">>> Prisma connected OK");
  await prisma.$disconnect();
}

main().catch(e => console.error(e));
