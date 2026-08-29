import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const baseUrl = process.env.DATABASE_URL?.replace(/\/nexolab(\?.*)?$/, '/mysql$1');
if (!baseUrl) {
  console.error('DATABASE_URL no configurada');
  process.exit(1);
}

process.env.DATABASE_URL = baseUrl;
const prisma = new PrismaClient();

try {
  await prisma.$executeRawUnsafe(
    'CREATE DATABASE IF NOT EXISTS `nexolab` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
  );
  console.log('DB_CREATED_OR_EXISTS nexolab');
} catch (error) {
  console.error('DB_CREATE_ERR', error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
