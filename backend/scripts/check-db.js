import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

try {
  // Comprobación de conexión con MongoDB vía Prisma
  const [labsCount, usersCount] = await Promise.all([
    prisma.laboratory.count(),
    prisma.user.count(),
  ]);
  console.log(`DB_OK mongodb=connected laboratories=${labsCount} users=${usersCount}`);
} catch (error) {
  console.error('DB_ERR', error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
