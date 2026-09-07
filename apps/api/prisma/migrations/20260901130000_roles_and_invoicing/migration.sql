-- Migrate HR and INTERNAL_MANAGER to ACCOUNT_MANAGER
CREATE TYPE "Role_new" AS ENUM ('ADMIN', 'DELIVERY_MANAGER', 'ACCOUNT_MANAGER');

ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role_new" USING (
  CASE
    WHEN "role"::text IN ('HR', 'INTERNAL_MANAGER') THEN 'ACCOUNT_MANAGER'::"Role_new"
    ELSE "role"::text::"Role_new"
  END
);

DROP TYPE "Role";
ALTER TYPE "Role_new" RENAME TO "Role";

-- Rename internal manager to account manager on candidates
ALTER TABLE "candidates" RENAME COLUMN "internal_manager_user_id" TO "account_manager_user_id";

-- Candidate billing fields
ALTER TABLE "candidates" ADD COLUMN "hourly_rate" DECIMAL(12,2);
ALTER TABLE "candidates" ADD COLUMN "hours_per_day" DECIMAL(4,2) NOT NULL DEFAULT 8;
ALTER TABLE "candidates" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'INR';

-- Invoice status enum and table
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED');

CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "public_id" TEXT NOT NULL,
    "candidate_id" UUID NOT NULL,
    "timesheet_id" UUID NOT NULL,
    "year_month" TEXT NOT NULL,
    "hourly_rate" DECIMAL(12,2) NOT NULL,
    "hours_per_day" DECIMAL(4,2) NOT NULL,
    "days_worked" DECIMAL(5,2) NOT NULL,
    "working_days" DECIMAL(5,2) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "generated_by_id" UUID NOT NULL,
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "invoices_public_id_key" ON "invoices"("public_id");
CREATE UNIQUE INDEX "invoices_timesheet_id_key" ON "invoices"("timesheet_id");
CREATE INDEX "invoices_year_month_idx" ON "invoices"("year_month");
CREATE INDEX "invoices_status_idx" ON "invoices"("status");
CREATE INDEX "invoices_candidate_id_idx" ON "invoices"("candidate_id");

ALTER TABLE "invoices" ADD CONSTRAINT "invoices_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_timesheet_id_fkey" FOREIGN KEY ("timesheet_id") REFERENCES "timesheets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_generated_by_id_fkey" FOREIGN KEY ("generated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
