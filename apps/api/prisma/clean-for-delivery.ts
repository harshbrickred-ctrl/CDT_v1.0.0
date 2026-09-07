import { PrismaClient } from '@prisma/client';
import { resetIdSequences, seedFoundation } from './seed-foundation';

const prisma = new PrismaClient();

function assertLocalDeliveryDatabase(databaseUrl: string | undefined) {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  let url: URL;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL is not a valid URL');
  }

  const host = url.hostname;
  const port = url.port || '5432';
  const allowedHosts = new Set(['localhost', '127.0.0.1']);

  if (!allowedHosts.has(host) || port !== '5434') {
    throw new Error(
      `Refusing to clean: DATABASE_URL must point to localhost:5434 (got ${host}:${port})`,
    );
  }
}

async function wipeBusinessData() {
  // FK-safe order: children before parents
  const invoices = await prisma.invoice.deleteMany();
  const reviews = await prisma.deliveryReview.deleteMany();
  const timesheets = await prisma.timesheet.deleteMany();
  const leaves = await prisma.leave.deleteMany();
  const candidates = await prisma.candidate.deleteMany();
  const clients = await prisma.client.deleteMany();
  const auditLogs = await prisma.auditLog.deleteMany();
  const refreshTokens = await prisma.refreshToken.deleteMany();

  return {
    invoices: invoices.count,
    deliveryReviews: reviews.count,
    timesheets: timesheets.count,
    leaves: leaves.count,
    candidates: candidates.count,
    clients: clients.count,
    auditLogs: auditLogs.count,
    refreshTokens: refreshTokens.count,
  };
}

async function main() {
  assertLocalDeliveryDatabase(process.env.DATABASE_URL);

  console.log('Cleaning business data from local Docker Postgres (5434)...');
  const deleted = await wipeBusinessData();
  await resetIdSequences(prisma);

  const users = await seedFoundation(prisma);

  console.log('Clean for delivery complete:', {
    deleted,
    admin: users.adminEmail,
    demoUsers: users.demoUsers,
    note: 'Lookups and login users retained; ID sequences reset to 1',
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
