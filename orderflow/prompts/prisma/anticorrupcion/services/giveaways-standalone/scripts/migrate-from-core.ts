/**
 * migrate-from-core.ts
 *
 * Migra datos de Giveaways desde el schema `public` del monolito
 * hacia el schema `giveaways` del standalone.
 *
 * Uso:
 *   CORE_DATABASE_URL=postgresql://.../orderflow_db?schema=public \
 *   GIVEAWAYS_DATABASE_URL=postgresql://.../orderflow_db?schema=giveaways \
 *   npx ts-node scripts/migrate-from-core.ts
 *
 * Requisitos previos:
 *   1. CREATE SCHEMA IF NOT EXISTS giveaways;
 *   2. prisma migrate deploy (en el standalone) para crear las tablas
 *   3. Backup de la base de datos
 *
 * Estrategia de IDs:
 *   - Giveaway: se conservan los mismos UUIDs
 *   - Participant: se usa el UUID del Contact original como id
 *     y externalContactId = contact.id (idempotente)
 *   - Registration / Winner: se conservan los mismos UUIDs
 */

import { PrismaClient as CorePrisma } from '@prisma/client';
// Ajustar el import al client generado del standalone cuando exista:
// import { PrismaClient as GiveawaysPrisma } from '../node_modules/.prisma/giveaways-client';
import { PrismaClient as GiveawaysPrisma } from '@prisma/client';

const DRY_RUN = process.env.DRY_RUN === 'true';
const BATCH_SIZE = Number(process.env.BATCH_SIZE || 200);

const core = new CorePrisma({
  datasources: {
    db: { url: process.env.CORE_DATABASE_URL || process.env.DATABASE_URL },
  },
});

const giveaways = new GiveawaysPrisma({
  datasources: {
    db: { url: process.env.GIVEAWAYS_DATABASE_URL },
  },
});

type Stats = {
  giveaways: number;
  participants: number;
  registrations: number;
  winners: number;
  skippedRegistrations: number;
  skippedWinners: number;
};

async function main() {
  console.log('=== Giveaways migration: public → giveaways ===');
  console.log(`DRY_RUN=${DRY_RUN}  BATCH_SIZE=${BATCH_SIZE}`);

  if (!process.env.GIVEAWAYS_DATABASE_URL) {
    throw new Error('GIVEAWAYS_DATABASE_URL is required');
  }

  const stats: Stats = {
    giveaways: 0,
    participants: 0,
    registrations: 0,
    winners: 0,
    skippedRegistrations: 0,
    skippedWinners: 0,
  };

  // ─── 1. Giveaways ───────────────────────────────────────────────
  console.log('\n[1/4] Migrating giveaways...');
  const coreGiveaways = await (core as any).giveaway.findMany();
  console.log(`  Found ${coreGiveaways.length} giveaways in core`);

  for (const g of coreGiveaways) {
    if (DRY_RUN) {
      stats.giveaways++;
      continue;
    }
    await (giveaways as any).giveaway.upsert({
      where: { id: g.id },
      create: {
        id: g.id,
        tenantId: g.tenantId,
        name: g.name,
        description: g.description ?? null,
        prizes: g.prizes,
        background: g.background ?? null,
        status: g.status,
        startDate: g.startDate,
        endDate: g.endDate,
        drawDate: g.drawDate ?? null,
        createdAt: g.createdAt,
        updatedAt: g.updatedAt,
      },
      update: {
        name: g.name,
        description: g.description ?? null,
        prizes: g.prizes,
        background: g.background ?? null,
        status: g.status,
        startDate: g.startDate,
        endDate: g.endDate,
        drawDate: g.drawDate ?? null,
        updatedAt: g.updatedAt,
      },
    });
    stats.giveaways++;
  }
  console.log(`  → ${stats.giveaways} giveaways upserted`);

  // ─── 2. Participants (from Contacts referenced by regs/winners) ─
  console.log('\n[2/4] Building participants from contacts...');
  const regContactIds: string[] = (
    await (core as any).giveawayRegistration.findMany({
      select: { contactId: true },
      distinct: ['contactId'],
    })
  ).map((r: { contactId: string }) => r.contactId);

  const winContactIds: string[] = (
    await (core as any).giveawayWinner.findMany({
      select: { contactId: true },
      distinct: ['contactId'],
    })
  ).map((w: { contactId: string }) => w.contactId);

  const allContactIds = Array.from(new Set([...regContactIds, ...winContactIds]));
  console.log(`  Unique contacts referenced: ${allContactIds.length}`);

  // Cargar contacts en batches
  for (let i = 0; i < allContactIds.length; i += BATCH_SIZE) {
    const batch = allContactIds.slice(i, i + BATCH_SIZE);
    const contacts = await (core as any).contact.findMany({
      where: { id: { in: batch } },
      select: {
        id: true,
        tenantId: true,
        name: true,
        email: true,
        phone: true,
        mobile: true,
      },
    });

    for (const c of contacts) {
      if (DRY_RUN) {
        stats.participants++;
        continue;
      }
      await (giveaways as any).participant.upsert({
        where: { id: c.id },
        create: {
          id: c.id, // mismo UUID que Contact → mapeo trivial
          tenantId: c.tenantId,
          externalContactId: c.id,
          name: c.name,
          email: c.email ?? null,
          phone: c.phone ?? c.mobile ?? null,
          authProvider: null,
          metadata: null,
        },
        update: {
          name: c.name,
          email: c.email ?? null,
          phone: c.phone ?? c.mobile ?? null,
          externalContactId: c.id,
        },
      });
      stats.participants++;
    }
  }
  console.log(`  → ${stats.participants} participants upserted`);

  // ─── 3. Registrations ───────────────────────────────────────────
  console.log('\n[3/4] Migrating registrations...');
  const coreRegs = await (core as any).giveawayRegistration.findMany();
  console.log(`  Found ${coreRegs.length} registrations in core`);

  for (const r of coreRegs) {
    // Verificar que el participant existe (por si el contact fue borrado)
    const participantExists = DRY_RUN
      ? true
      : await (giveaways as any).participant.findUnique({ where: { id: r.contactId } });

    if (!participantExists) {
      console.warn(`  ⚠ Skipping registration ${r.id}: participant/contact ${r.contactId} not found`);
      stats.skippedRegistrations++;
      continue;
    }

    if (DRY_RUN) {
      stats.registrations++;
      continue;
    }

    await (giveaways as any).giveawayRegistration.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        giveawayId: r.giveawayId,
        participantId: r.contactId, // mismo UUID
        utmSource: r.utmSource,
        authProvider: r.authProvider ?? null,
        createdAt: r.createdAt,
      },
      update: {
        utmSource: r.utmSource,
        authProvider: r.authProvider ?? null,
      },
    });
    stats.registrations++;
  }
  console.log(`  → ${stats.registrations} registrations upserted (${stats.skippedRegistrations} skipped)`);

  // ─── 4. Winners ─────────────────────────────────────────────────
  console.log('\n[4/4] Migrating winners...');
  const coreWinners = await (core as any).giveawayWinner.findMany();
  console.log(`  Found ${coreWinners.length} winners in core`);

  for (const w of coreWinners) {
    const participantExists = DRY_RUN
      ? true
      : await (giveaways as any).participant.findUnique({ where: { id: w.contactId } });

    if (!participantExists) {
      console.warn(`  ⚠ Skipping winner ${w.id}: participant/contact ${w.contactId} not found`);
      stats.skippedWinners++;
      continue;
    }

    if (DRY_RUN) {
      stats.winners++;
      continue;
    }

    await (giveaways as any).giveawayWinner.upsert({
      where: { id: w.id },
      create: {
        id: w.id,
        giveawayId: w.giveawayId,
        participantId: w.contactId,
        prizeName: w.prizeName,
        drawOrder: w.drawOrder,
        drawnAt: w.drawnAt,
      },
      update: {
        prizeName: w.prizeName,
        drawOrder: w.drawOrder,
        drawnAt: w.drawnAt,
      },
    });
    stats.winners++;
  }
  console.log(`  → ${stats.winners} winners upserted (${stats.skippedWinners} skipped)`);

  // ─── Verification ───────────────────────────────────────────────
  console.log('\n=== Verification counts ===');
  if (!DRY_RUN) {
    const [g, p, r, w] = await Promise.all([
      (giveaways as any).giveaway.count(),
      (giveaways as any).participant.count(),
      (giveaways as any).giveawayRegistration.count(),
      (giveaways as any).giveawayWinner.count(),
    ]);
    console.log(`  giveaways.giveaways:              ${g}`);
    console.log(`  giveaways.participants:           ${p}`);
    console.log(`  giveaways.giveaway_registrations: ${r}`);
    console.log(`  giveaways.giveaway_winners:       ${w}`);
  }

  console.log('\n=== Stats ===');
  console.table(stats);
  console.log(DRY_RUN ? '\n(DRY RUN — no data written)' : '\nMigration completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await core.$disconnect();
    await giveaways.$disconnect();
  });
