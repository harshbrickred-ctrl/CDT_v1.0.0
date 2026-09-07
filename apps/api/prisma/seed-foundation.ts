import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const ID_PREFIXES = ['CD', 'LV', 'TSH', 'DEL', 'INV'] as const;

export async function upsertUser(
  prisma: PrismaClient,
  input: {
    email: string;
    fullName: string;
    role: Role;
    password: string;
  },
) {
  const passwordHash = await bcrypt.hash(input.password, 10);
  return prisma.user.upsert({
    where: { email: input.email },
    update: {
      fullName: input.fullName,
      role: input.role,
      passwordHash,
      isActive: true,
      deletedAt: null,
    },
    create: {
      email: input.email,
      fullName: input.fullName,
      role: input.role,
      passwordHash,
    },
  });
}

async function seedLookupType(
  prisma: PrismaClient,
  code: string,
  values: { code: string; label: string; sortOrder: number }[],
) {
  const type = await prisma.lookupType.upsert({
    where: { code },
    update: {},
    create: { code },
  });

  for (const v of values) {
    await prisma.lookupValue.upsert({
      where: { typeId_code: { typeId: type.id, code: v.code } },
      update: { label: v.label, sortOrder: v.sortOrder, isActive: true },
      create: {
        typeId: type.id,
        code: v.code,
        label: v.label,
        sortOrder: v.sortOrder,
      },
    });
  }
}

export async function seedLookups(prisma: PrismaClient) {
  await seedLookupType(prisma, 'EMPLOYMENT_STATUS', [
    { code: 'ACTIVE', label: 'Active', sortOrder: 1 },
    { code: 'ON_LEAVE', label: 'On Leave', sortOrder: 2 },
    { code: 'RELEASED', label: 'Released', sortOrder: 3 },
    { code: 'BACKUP_BENCH', label: 'Backup/Bench', sortOrder: 4 },
  ]);

  await seedLookupType(prisma, 'WORK_LOCATION', [
    { code: 'ONSITE', label: 'Onsite', sortOrder: 1 },
    { code: 'REMOTE', label: 'Remote', sortOrder: 2 },
    { code: 'HYBRID', label: 'Hybrid', sortOrder: 3 },
  ]);

  await seedLookupType(prisma, 'LEAVE_TYPE', [
    { code: 'CASUAL', label: 'Casual', sortOrder: 1 },
    { code: 'SICK', label: 'Sick', sortOrder: 2 },
    { code: 'EARNED', label: 'Earned', sortOrder: 3 },
    { code: 'UNPAID', label: 'Unpaid', sortOrder: 4 },
    { code: 'LOP', label: 'Loss of Pay', sortOrder: 5 },
    { code: 'MATERNITY', label: 'Maternity', sortOrder: 6 },
    { code: 'PATERNITY', label: 'Paternity', sortOrder: 7 },
  ]);

  await seedLookupType(prisma, 'LEAVE_STATUS', [
    { code: 'PENDING', label: 'Pending', sortOrder: 1 },
    { code: 'APPROVED', label: 'Approved', sortOrder: 2 },
    { code: 'REJECTED', label: 'Rejected', sortOrder: 3 },
  ]);

  await seedLookupType(prisma, 'TIMESHEET_APPROVAL_STATUS', [
    { code: 'PENDING', label: 'Pending', sortOrder: 1 },
    { code: 'APPROVED', label: 'Approved', sortOrder: 2 },
    { code: 'REJECTED', label: 'Rejected', sortOrder: 3 },
  ]);

  await seedLookupType(prisma, 'CLIENT_FEEDBACK', [
    { code: 'GOOD', label: 'Good', sortOrder: 1 },
    { code: 'AVERAGE', label: 'Average', sortOrder: 2 },
    { code: 'POOR', label: 'Poor', sortOrder: 3 },
  ]);

  await seedLookupType(prisma, 'ENGAGEMENT_HEALTH', [
    { code: 'ON_TRACK', label: 'On Track', sortOrder: 1 },
    { code: 'AT_RISK', label: 'At Risk', sortOrder: 2 },
    { code: 'ESCALATED', label: 'Escalated', sortOrder: 3 },
  ]);

  await seedLookupType(prisma, 'YES_NO', [
    { code: 'YES', label: 'Yes', sortOrder: 1 },
    { code: 'NO', label: 'No', sortOrder: 2 },
  ]);

  await seedLookupType(prisma, 'RELEASE_REASON', [
    { code: 'PROJECT_END', label: 'Project End', sortOrder: 1 },
    { code: 'CLIENT_REQUEST', label: 'Client Request', sortOrder: 2 },
    { code: 'OTHER', label: 'Other', sortOrder: 3 },
  ]);
}

export async function seedIdSequences(prisma: PrismaClient) {
  for (const prefix of ID_PREFIXES) {
    await prisma.idSequence.upsert({
      where: { prefix },
      update: {},
      create: { prefix, nextValue: 1 },
    });
  }
}

/** Force public-id counters back to 1 (for delivery clean). */
export async function resetIdSequences(prisma: PrismaClient) {
  for (const prefix of ID_PREFIXES) {
    await prisma.idSequence.upsert({
      where: { prefix },
      update: { nextValue: 1 },
      create: { prefix, nextValue: 1 },
    });
  }
}

export async function seedFoundationUsers(prisma: PrismaClient) {
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required');
  }

  const demoPassword = process.env.SEED_DEMO_PASSWORD || adminPassword;

  const admin = await upsertUser(prisma, {
    email: adminEmail,
    fullName: 'System Admin',
    role: Role.ADMIN,
    password: adminPassword,
  });

  const dm = await upsertUser(prisma, {
    email: 'dm@brickred.local',
    fullName: 'Demo Delivery Manager',
    role: Role.DELIVERY_MANAGER,
    password: demoPassword,
  });

  const am = await upsertUser(prisma, {
    email: 'am@brickred.local',
    fullName: 'Demo Account Manager',
    role: Role.ACCOUNT_MANAGER,
    password: demoPassword,
  });

  return {
    admin,
    dm,
    am,
    adminEmail,
    demoUsers: ['dm@brickred.local', 'am@brickred.local'] as const,
  };
}

export async function seedFoundation(prisma: PrismaClient) {
  const users = await seedFoundationUsers(prisma);
  await seedLookups(prisma);
  await seedIdSequences(prisma);
  return users;
}
