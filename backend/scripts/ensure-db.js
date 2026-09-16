import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL no configurada en .env');
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  await prisma.$connect();
  console.log('DB_READY Conexión exitosa a MongoDB');
} catch (error) {
  console.error('DB_CONNECT_ERR', error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
