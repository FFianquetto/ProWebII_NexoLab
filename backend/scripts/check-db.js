import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

try {
  await prisma.$queryRaw`SELECT 1 AS ok`;
  const tables = await prisma.$queryRaw`SHOW TABLES`;
  console.log(`DB_OK tables=${tables.length}`);
} catch (error) {
  console.error('DB_ERR', error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
