-- Create organizations and scope tenant data by organization_id

CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

INSERT INTO "organizations" ("id", "slug", "name", "created_at", "updated_at") VALUES
  ('11111111-1111-1111-1111-111111111111', 'brickred', 'BrickRed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('22222222-2222-2222-2222-222222222222', 'agyom', 'Agyom', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Users
ALTER TABLE "users" ADD COLUMN "organization_id" UUID;
UPDATE "users" SET "organization_id" = '11111111-1111-1111-1111-111111111111';
ALTER TABLE "users" ALTER COLUMN "organization_id" SET NOT NULL;
DROP INDEX IF EXISTS "users_email_key";
CREATE UNIQUE INDEX "users_organization_id_email_key" ON "users"("organization_id", "email");
CREATE INDEX "users_organization_id_idx" ON "users"("organization_id");
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Clients
ALTER TABLE "clients" ADD COLUMN "organization_id" UUID;
UPDATE "clients" SET "organization_id" = '11111111-1111-1111-1111-111111111111';
ALTER TABLE "clients" ALTER COLUMN "organization_id" SET NOT NULL;
DROP INDEX IF EXISTS "clients_name_normalized_key";
DROP INDEX IF EXISTS "clients_code_key";
CREATE UNIQUE INDEX "clients_organization_id_name_normalized_key" ON "clients"("organization_id", "name_normalized");
CREATE UNIQUE INDEX "clients_organization_id_code_key" ON "clients"("organization_id", "code");
CREATE INDEX "clients_organization_id_idx" ON "clients"("organization_id");
ALTER TABLE "clients" ADD CONSTRAINT "clients_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Candidates
ALTER TABLE "candidates" ADD COLUMN "organization_id" UUID;
UPDATE "candidates" SET "organization_id" = '11111111-1111-1111-1111-111111111111';
ALTER TABLE "candidates" ALTER COLUMN "organization_id" SET NOT NULL;
DROP INDEX IF EXISTS "candidates_public_id_key";
CREATE UNIQUE INDEX "candidates_organization_id_public_id_key" ON "candidates"("organization_id", "public_id");
CREATE INDEX "candidates_organization_id_idx" ON "candidates"("organization_id");
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Leaves
ALTER TABLE "leaves" ADD COLUMN "organization_id" UUID;
UPDATE "leaves" SET "organization_id" = '11111111-1111-1111-1111-111111111111';
ALTER TABLE "leaves" ALTER COLUMN "organization_id" SET NOT NULL;
DROP INDEX IF EXISTS "leaves_public_id_key";
CREATE UNIQUE INDEX "leaves_organization_id_public_id_key" ON "leaves"("organization_id", "public_id");
CREATE INDEX "leaves_organization_id_idx" ON "leaves"("organization_id");
ALTER TABLE "leaves" ADD CONSTRAINT "leaves_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Timesheets
ALTER TABLE "timesheets" ADD COLUMN "organization_id" UUID;
UPDATE "timesheets" SET "organization_id" = '11111111-1111-1111-1111-111111111111';
ALTER TABLE "timesheets" ALTER COLUMN "organization_id" SET NOT NULL;
DROP INDEX IF EXISTS "timesheets_public_id_key";
CREATE UNIQUE INDEX "timesheets_organization_id_public_id_key" ON "timesheets"("organization_id", "public_id");
CREATE INDEX "timesheets_organization_id_idx" ON "timesheets"("organization_id");
ALTER TABLE "timesheets" ADD CONSTRAINT "timesheets_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Invoices
ALTER TABLE "invoices" ADD COLUMN "organization_id" UUID;
UPDATE "invoices" SET "organization_id" = '11111111-1111-1111-1111-111111111111';
ALTER TABLE "invoices" ALTER COLUMN "organization_id" SET NOT NULL;
DROP INDEX IF EXISTS "invoices_public_id_key";
CREATE UNIQUE INDEX "invoices_organization_id_public_id_key" ON "invoices"("organization_id", "public_id");
CREATE INDEX "invoices_organization_id_idx" ON "invoices"("organization_id");
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Delivery reviews
ALTER TABLE "delivery_reviews" ADD COLUMN "organization_id" UUID;
UPDATE "delivery_reviews" SET "organization_id" = '11111111-1111-1111-1111-111111111111';
ALTER TABLE "delivery_reviews" ALTER COLUMN "organization_id" SET NOT NULL;
DROP INDEX IF EXISTS "delivery_reviews_public_id_key";
CREATE UNIQUE INDEX "delivery_reviews_organization_id_public_id_key" ON "delivery_reviews"("organization_id", "public_id");
CREATE INDEX "delivery_reviews_organization_id_idx" ON "delivery_reviews"("organization_id");
ALTER TABLE "delivery_reviews" ADD CONSTRAINT "delivery_reviews_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Audit logs
ALTER TABLE "audit_logs" ADD COLUMN "organization_id" UUID;
UPDATE "audit_logs" SET "organization_id" = '11111111-1111-1111-1111-111111111111';
ALTER TABLE "audit_logs" ALTER COLUMN "organization_id" SET NOT NULL;
CREATE INDEX "audit_logs_organization_id_idx" ON "audit_logs"("organization_id");
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Id sequences: rebuild with composite PK per organization
CREATE TABLE "id_sequences_new" (
    "organization_id" UUID NOT NULL,
    "prefix" TEXT NOT NULL,
    "next_value" INTEGER NOT NULL,
    CONSTRAINT "id_sequences_new_pkey" PRIMARY KEY ("organization_id", "prefix")
);

INSERT INTO "id_sequences_new" ("organization_id", "prefix", "next_value")
SELECT '11111111-1111-1111-1111-111111111111', "prefix", "next_value" FROM "id_sequences";

INSERT INTO "id_sequences_new" ("organization_id", "prefix", "next_value")
SELECT '22222222-2222-2222-2222-222222222222', p.prefix, 1
FROM (VALUES ('CD'), ('LV'), ('TSH'), ('DEL'), ('INV')) AS p(prefix);

DROP TABLE "id_sequences";
ALTER TABLE "id_sequences_new" RENAME TO "id_sequences";
ALTER TABLE "id_sequences" RENAME CONSTRAINT "id_sequences_new_pkey" TO "id_sequences_pkey";
ALTER TABLE "id_sequences" ADD CONSTRAINT "id_sequences_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
