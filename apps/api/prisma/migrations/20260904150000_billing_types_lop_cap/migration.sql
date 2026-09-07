-- BillingType enum
CREATE TYPE "BillingType" AS ENUM ('HOURLY', 'FIXED');

-- Candidate billing fields
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "billing_type" "BillingType" NOT NULL DEFAULT 'HOURLY';
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "monthly_fixed_amount" DECIMAL(14, 2);
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "max_billable_hours" DECIMAL(7, 2);

-- Timesheet LOP days
ALTER TABLE "timesheets" ADD COLUMN IF NOT EXISTS "lop_days" DECIMAL(5, 2) NOT NULL DEFAULT 0;

-- Invoice billing snapshot fields
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "billing_type" "BillingType" NOT NULL DEFAULT 'HOURLY';
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "monthly_fixed_amount" DECIMAL(14, 2);
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "max_billable_hours" DECIMAL(7, 2);
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "lop_days" DECIMAL(5, 2) NOT NULL DEFAULT 0;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "billable_days" DECIMAL(5, 2) NOT NULL DEFAULT 0;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "raw_hours" DECIMAL(8, 2) NOT NULL DEFAULT 0;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "billable_hours" DECIMAL(8, 2) NOT NULL DEFAULT 0;
