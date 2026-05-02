const { PrismaClient } = require('@prisma/client');
const { config } = require('dotenv');

config({ path: '.env.test' });

console.log('>>> Loaded DATABASE_URL =', process.env.DATABASE_URL);

const prisma = new PrismaClient();

beforeEach(async () => {
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
