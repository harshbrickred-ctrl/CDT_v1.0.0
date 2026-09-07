# Prisma Design — CDT

## Purpose

Map the PostgreSQL schema to Prisma models, enums, relations, and generator conventions for `apps/api`.

## Audience

Backend engineers implementing NestJS + Prisma.

## Scope

MVP Prisma schema. Workforce/billing models deferred.

## Definitions

| Term | Definition |
|------|------------|
| Prisma Client | Generated typed DB client |
| `@@unique` | Compound natural key |
| Soft delete middleware | Optional filter on `deletedAt` |

---

## 1. Schema location & generators

```text
apps/api/prisma/schema.prisma
apps/api/prisma/migrations/
apps/api/prisma/seed.ts
```

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

## 2. Enums

```prisma
enum Role {
  ADMIN
  DELIVERY_MANAGER
  HR
  INTERNAL_MANAGER
}

enum CandidateStatus {
  ACTIVE
  RELEASED
}

enum LeaveStatus {
  PENDING
  APPROVED
  REJECTED
}

enum ApprovalStatus {
  PENDING
  APPROVED
  REJECTED
}

enum ClientFeedback {
  GOOD
  AVERAGE
  POOR
}

enum EngagementHealth {
  ON_TRACK
  AT_RISK
  ESCALATED
}
```

## 3. Core models (illustrative)

```prisma
model User {
  id           String    @id @default(uuid()) @db.Uuid
  email        String    @unique
  passwordHash String    @map("password_hash")
  fullName     String    @map("full_name")
  role         Role
  isActive     Boolean   @default(true) @map("is_active")
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")
  deletedAt    DateTime? @map("deleted_at")

  refreshTokens     RefreshToken[]
  auditLogs         AuditLog[]      @relation("AuditActor")
  leavesRequested   Leave[]         @relation("LeaveRequester")
  leavesApproved    Leave[]         @relation("LeaveApprover")
  timesheetsApproved Timesheet[]    @relation("TimesheetApprover")
  candidatesReleased Candidate[]    @relation("CandidateReleaser")
  reviewsWritten    DeliveryReview[] @relation("Reviewer")

  @@map("users")
}

model Client {
  id              String    @id @default(uuid()) @db.Uuid
  name            String
  nameNormalized  String    @unique @map("name_normalized")
  code            String?   @unique
  isActive        Boolean   @default(true) @map("is_active")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  deletedAt       DateTime? @map("deleted_at")

  candidates Candidate[]

  @@map("clients")
}

model Candidate {
  id            String          @id @default(uuid()) @db.Uuid
  publicId      String          @unique @map("public_id")
  clientId      String          @map("client_id") @db.Uuid
  fullName      String          @map("full_name")
  email         String?
  mobile        String?
  roleTitle     String?         @map("role_title")
  sstReference  String?         @map("sst_reference")
  joinedOn      DateTime?       @map("joined_on") @db.Date
  status        CandidateStatus @default(ACTIVE)
  releasedAt    DateTime?       @map("released_at")
  releasedById  String?         @map("released_by_id") @db.Uuid
  releaseReason String?         @map("release_reason")
  createdAt     DateTime        @default(now()) @map("created_at")
  updatedAt     DateTime        @updatedAt @map("updated_at")
  deletedAt     DateTime?       @map("deleted_at")

  client     Client           @relation(fields: [clientId], references: [id])
  releasedBy User?            @relation("CandidateReleaser", fields: [releasedById], references: [id])
  leaves     Leave[]
  timesheets Timesheet[]
  reviews    DeliveryReview[]

  @@index([clientId])
  @@index([status])
  @@map("candidates")
}

model Leave {
  id               String      @id @default(uuid()) @db.Uuid
  publicId         String      @unique @map("public_id")
  candidateId      String      @map("candidate_id") @db.Uuid
  leaveTypeCode    String      @map("leave_type_code")
  startDate        DateTime    @map("start_date") @db.Date
  endDate          DateTime    @map("end_date") @db.Date
  days             Decimal     @db.Decimal(5, 2)
  status           LeaveStatus @default(PENDING)
  reason           String?
  requestedById    String      @map("requested_by_id") @db.Uuid
  approverId       String?     @map("approver_id") @db.Uuid
  approvedAt       DateTime?   @map("approved_at")
  rejectedAt       DateTime?   @map("rejected_at")
  rejectionReason  String?     @map("rejection_reason")
  createdAt        DateTime    @default(now()) @map("created_at")
  updatedAt        DateTime    @updatedAt @map("updated_at")
  deletedAt        DateTime?   @map("deleted_at")

  candidate   Candidate @relation(fields: [candidateId], references: [id])
  requestedBy User      @relation("LeaveRequester", fields: [requestedById], references: [id])
  approver    User?     @relation("LeaveApprover", fields: [approverId], references: [id])

  @@index([candidateId, status])
  @@index([startDate, endDate])
  @@map("leaves")
}

model Timesheet {
  id                 String         @id @default(uuid()) @db.Uuid
  publicId           String         @unique @map("public_id")
  candidateId        String         @map("candidate_id") @db.Uuid
  yearMonth          String         @map("year_month")
  periodStart        DateTime       @map("period_start") @db.Date
  periodEnd          DateTime       @map("period_end") @db.Date
  workingDays        Decimal        @map("working_days") @db.Decimal(5, 2)
  leaveDays          Decimal        @map("leave_days") @db.Decimal(5, 2)
  daysWorked         Decimal        @map("days_worked") @db.Decimal(5, 2)
  attendancePct      Decimal?       @map("attendance_pct") @db.Decimal(5, 2)
  approvalStatus     ApprovalStatus @default(PENDING) @map("approval_status")
  approvedById       String?        @map("approved_by_id") @db.Uuid
  remarks            String?
  createdAt          DateTime       @default(now()) @map("created_at")
  updatedAt          DateTime       @updatedAt @map("updated_at")
  deletedAt          DateTime?      @map("deleted_at")

  candidate  Candidate @relation(fields: [candidateId], references: [id])
  approvedBy User?     @relation("TimesheetApprover", fields: [approvedById], references: [id])

  @@unique([candidateId, yearMonth])
  @@index([yearMonth])
  @@index([approvalStatus])
  @@map("timesheets")
}

model DeliveryReview {
  id                     String            @id @default(uuid()) @db.Uuid
  publicId               String            @unique @map("public_id")
  candidateId            String            @map("candidate_id") @db.Uuid
  yearMonth              String            @map("year_month")
  reviewDate             DateTime          @map("review_date") @db.Date
  utilizationPct         Decimal?          @map("utilization_pct") @db.Decimal(5, 2)
  timesheetMissing       Boolean           @default(false) @map("timesheet_missing")
  clientFeedback         ClientFeedback    @map("client_feedback")
  engagementHealth       EngagementHealth  @map("engagement_health")
  escalationNotes        String?           @map("escalation_notes")
  reviewerId             String            @map("reviewer_id") @db.Uuid
  createdAt              DateTime          @default(now()) @map("created_at")
  updatedAt              DateTime          @updatedAt @map("updated_at")
  deletedAt              DateTime?         @map("deleted_at")

  candidate Candidate @relation(fields: [candidateId], references: [id])
  reviewer  User      @relation("Reviewer", fields: [reviewerId], references: [id])

  @@unique([candidateId, yearMonth])
  @@index([yearMonth, engagementHealth])
  @@map("delivery_reviews")
}

model AuditLog {
  id             String   @id @default(uuid()) @db.Uuid
  entityType     String   @map("entity_type")
  entityId       String   @map("entity_id") @db.Uuid
  entityPublicId String?  @map("entity_public_id")
  action         String
  actorUserId    String?  @map("actor_user_id") @db.Uuid
  beforeJson     Json?    @map("before_json")
  afterJson      Json?    @map("after_json")
  ip             String?
  userAgent      String?  @map("user_agent")
  createdAt      DateTime @default(now()) @map("created_at")

  actor User? @relation("AuditActor", fields: [actorUserId], references: [id])

  @@index([entityType, entityId])
  @@index([createdAt])
  @@map("audit_logs")
}

model IdSequence {
  prefix    String @id
  nextValue Int    @map("next_value")

  @@map("id_sequences")
}

model LookupType {
  id     String @id @default(uuid()) @db.Uuid
  code   String @unique
  values LookupValue[]
  @@map("lookup_types")
}

model LookupValue {
  id        String  @id @default(uuid()) @db.Uuid
  typeId    String  @map("type_id") @db.Uuid
  code      String
  label     String
  sortOrder Int     @default(0) @map("sort_order")
  isActive  Boolean @default(true) @map("is_active")
  type      LookupType @relation(fields: [typeId], references: [id])

  @@unique([typeId, code])
  @@map("lookup_values")
}

model RefreshToken {
  id        String    @id @default(uuid()) @db.Uuid
  userId    String    @map("user_id") @db.Uuid
  tokenHash String    @unique @map("token_hash")
  expiresAt DateTime  @map("expires_at")
  revokedAt DateTime? @map("revoked_at")
  createdAt DateTime  @default(now()) @map("created_at")
  user      User      @relation(fields: [userId], references: [id])

  @@index([userId])
  @@map("refresh_tokens")
}
```

## 4. Nest integration

| Concern | Pattern |
|---------|---------|
| Module | `PrismaModule` global; `PrismaService extends PrismaClient` |
| Transactions | `prisma.$transaction` for publicId allocate + insert + audit |
| Decimal | Map to `string`/`number` in DTO mappers carefully |
| Soft delete | Default `where: { deletedAt: null }` in repositories |

## 5. Public ID allocation

```text
BEGIN
  UPDATE id_sequences SET next_value = next_value + 1 WHERE prefix = 'CD' RETURNING next_value
  format public_id = 'CD-' || lpad(next_value::text, 5, '0')
  INSERT candidate ...
  INSERT audit ...
COMMIT
```

Use `SELECT … FOR UPDATE` semantics via Prisma interactive transaction.

## 6. MVP vs Future

| Item | MVP | Future |
|------|-----|--------|
| Single schema file | Yes | Split multi-file Prisma if needed |
| Soft-delete middleware | Optional | Recommended package-wide |
| Multi-schema Postgres | No | Only if isolating audit |

## Trade-offs

| Decision | Why |
|----------|-----|
| `@map` snake_case columns | SQL familiarity + Nest DTO camelCase |
| Compound `@@unique` without partial | Prisma MVP simplicity; enforce deleted via app soft-delete discipline |
| Json audit payloads | Flexible diffs without wide columns |

## Recommendations

- Reject client-provided `publicId` on create; server allocates.
- On unique violations for TS/DR, translate to `409 UNIQUE_PERIOD`.
- Keep seed creating ADMIN user + lookup seeds + id_sequences rows.

## References

- [ER_AND_SCHEMA.md](./ER_AND_SCHEMA.md)
- [MIGRATION_AND_BACKUP.md](./MIGRATION_AND_BACKUP.md)
- [../08-backend/NESTJS_ARCHITECTURE.md](../08-backend/NESTJS_ARCHITECTURE.md)
