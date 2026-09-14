import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const ID_PREFIXES = ['CD', 'LV', 'TSH', 'DEL', 'INV'] as const;

export const ORG_DEFS = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    slug: 'brickred' as const,
    name: 'BrickRed',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    slug: 'agyom' as const,
    name: 'Agyom',
  },
];

export async function ensureOrganizations(prisma: PrismaClient) {
  for (const org of ORG_DEFS) {
    await prisma.organization.upsert({
      where: { slug: org.slug },
      update: { name: org.name },
      create: { id: org.id, slug: org.slug, name: org.name },
    });
  }
  return prisma.organization.findMany({ orderBy: { slug: 'asc' } });
}

export async function upsertUser(
  prisma: PrismaClient,
  input: {
    organizationId: string;
    email: string;
    fullName: string;
    role: Role;
    password: string;
  },
) {
  const passwordHash = await bcrypt.hash(input.password, 10);
  const email = input.email.toLowerCase();
  return prisma.user.upsert({
    where: {
      organizationId_email: {
        organizationId: input.organizationId,
        email,
      },
    },
    update: {
      fullName: input.fullName,
      role: input.role,
      passwordHash,
      isActive: true,
      deletedAt: null,
    },
    create: {
      organizationId: input.organizationId,
      email,
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

export async function seedIdSequences(
  prisma: PrismaClient,
  organizationId: string,
) {
  for (const prefix of ID_PREFIXES) {
    await prisma.idSequence.upsert({
      where: {
        organizationId_prefix: { organizationId, prefix },
      },
      update: {},
      create: { organizationId, prefix, nextValue: 1 },
    });
  }
}

/** Force public-id counters back to 1 (for delivery clean). */
export async function resetIdSequences(
  prisma: PrismaClient,
  organizationId?: string,
) {
  const orgs = organizationId
    ? [{ id: organizationId }]
    : await prisma.organization.findMany({ select: { id: true } });

  for (const org of orgs) {
    for (const prefix of ID_PREFIXES) {
      await prisma.idSequence.upsert({
        where: {
          organizationId_prefix: {
            organizationId: org.id,
            prefix,
          },
        },
        update: { nextValue: 1 },
        create: { organizationId: org.id, prefix, nextValue: 1 },
      });
    }
  }
}

export async function seedFoundationUsersForOrg(
  prisma: PrismaClient,
  organizationId: string,
) {
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required');
  }

  const demoPassword = process.env.SEED_DEMO_PASSWORD || adminPassword;

  const admin = await upsertUser(prisma, {
    organizationId,
    email: adminEmail,
    fullName: 'System Admin',
    role: Role.ADMIN,
    password: adminPassword,
  });

  const dm = await upsertUser(prisma, {
    organizationId,
    email: 'dm@brickred.local',
    fullName: 'Demo Delivery Owner',
    role: Role.DELIVERY_OWNER,
    password: demoPassword,
  });

  const am = await upsertUser(prisma, {
    organizationId,
    email: 'am@brickred.local',
    fullName: 'Demo Account Owner',
    role: Role.ACCOUNT_OWNER,
    password: demoPassword,
  });

  return { admin, dm, am, adminEmail };
}

export async function seedFoundation(prisma: PrismaClient) {
  const orgs = await ensureOrganizations(prisma);
  await seedLookups(prisma);

  const bySlug: Record<
    string,
    Awaited<ReturnType<typeof seedFoundationUsersForOrg>>
  > = {};

  for (const org of orgs) {
    await seedIdSequences(prisma, org.id);
    bySlug[org.slug] = await seedFoundationUsersForOrg(prisma, org.id);
  }

  const brickred = bySlug.brickred;
  return {
    admin: brickred.admin,
    dm: brickred.dm,
    am: brickred.am,
    adminEmail: brickred.adminEmail,
    demoUsers: ['dm@brickred.local', 'am@brickred.local'] as const,
    organizations: orgs.map((o) => o.slug),
  };
}
