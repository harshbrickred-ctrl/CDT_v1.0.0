import { PrismaClient } from '@prisma/client';
import { seedFoundation } from './seed-foundation';

/** Idempotent foundation seed for hosted deploys (users + lookups + sequences). */
const prisma = new PrismaClient();

seedFoundation(prisma)
  .then((users) => {
    console.log('Foundation seed complete:', {
      admin: users.adminEmail,
      demoUsers: users.demoUsers,
    });
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
