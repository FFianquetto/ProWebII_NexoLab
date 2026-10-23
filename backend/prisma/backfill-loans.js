import 'dotenv/config';
import dns from 'node:dns';
import { PrismaClient } from '@prisma/client';

/**
 * Relleno único: los préstamos (reservation_equipment) creados antes de que
 * tuvieran usuario y horario propios toman esos datos de su reserva.
 * Es idempotente: solo toca documentos a los que les falte `user_id`,
 * `starts_at` o `ends_at`. Ejecutar: `npm run db:backfill-loans`.
 */

dns.setDefaultResultOrder('ipv4first');
const prisma = new PrismaClient();

async function main() {
  // Se usan comandos crudos porque Prisma no puede leer documentos
  // a los que les faltan campos requeridos del schema actual.
  const found = await prisma.$runCommandRaw({
    find: 'reservation_equipment',
    filter: {
      $or: [
        { user_id: { $exists: false } },
        { starts_at: { $exists: false } },
        { ends_at: { $exists: false } },
      ],
    },
    projection: { _id: 1, reservation_id: 1 },
  });

  const docs = found?.cursor?.firstBatch || [];
  console.log(`Préstamos por rellenar: ${docs.length}`);

  let updated = 0;
  let removed = 0;

  for (const doc of docs) {
    const loanId = doc._id?.$oid || doc._id;
    const reservationId = doc.reservation_id?.$oid || doc.reservation_id;

    const res = reservationId
      ? await prisma.$runCommandRaw({
          find: 'reservations',
          filter: { _id: { $oid: String(reservationId) } },
          projection: { user_id: 1, starts_at: 1, ends_at: 1 },
          limit: 1,
        })
      : null;
    const reservation = res?.cursor?.firstBatch?.[0];

    if (!reservation) {
      // Préstamo huérfano (su reserva ya no existe): no tiene a quién pertenecer.
      await prisma.$runCommandRaw({
        delete: 'reservation_equipment',
        deletes: [{ q: { _id: { $oid: String(loanId) } }, limit: 1 }],
      });
      removed += 1;
      continue;
    }

    await prisma.$runCommandRaw({
      update: 'reservation_equipment',
      updates: [
        {
          q: { _id: { $oid: String(loanId) } },
          u: {
            $set: {
              user_id: reservation.user_id,
              starts_at: reservation.starts_at,
              ends_at: reservation.ends_at,
            },
          },
        },
      ],
    });
    updated += 1;
  }

  console.log(`Actualizados: ${updated} · Huérfanos eliminados: ${removed}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
