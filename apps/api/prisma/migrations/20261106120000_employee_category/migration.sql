-- Employee engagement category on the existing candidates table.

CREATE TYPE "EmployeeCategory" AS ENUM ('BILLABLE', 'NON_BILLABLE', 'BENCH');
CREATE TYPE "EmployeeTeam" AS ENUM ('SUPPORT', 'LEADERSHIP', 'DELIVERY');
CREATE TYPE "BenchFeedbackKind" AS ENUM ('RM', 'ACCOUNT_OWNER');

ALTER TABLE "candidates" ADD COLUMN "category" "EmployeeCategory" NOT NULL DEFAULT 'BILLABLE';
UPDATE "candidates" SET "category" = 'BILLABLE';

ALTER TABLE "candidates" ALTER COLUMN "client_id" DROP NOT NULL;

ALTER TABLE "candidates" ADD COLUMN "team" "EmployeeTeam";
ALTER TABLE "candidates" ADD COLUMN "support_function" TEXT;
ALTER TABLE "candidates" ADD COLUMN "sales_owner_user_id" UUID;
ALTER TABLE "candidates" ADD COLUMN "bench_start_date" DATE;
ALTER TABLE "candidates" ADD COLUMN "interviews_scheduled_count" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "candidates_organization_id_category_idx" ON "candidates"("organization_id", "category");
CREATE INDEX "candidates_sales_owner_user_id_idx" ON "candidates"("sales_owner_user_id");

ALTER TABLE "candidates" ADD CONSTRAINT "candidates_sales_owner_user_id_fkey" FOREIGN KEY ("sales_owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "candidates" ADD CONSTRAINT "candidates_category_client_chk" CHECK (
  ("category" = 'BILLABLE' AND "client_id" IS NOT NULL)
  OR ("category" IN ('NON_BILLABLE', 'BENCH') AND "client_id" IS NULL)
);

ALTER TABLE "candidates" ADD CONSTRAINT "candidates_bench_fields_chk" CHECK (
  ("category" = 'BENCH' AND "bench_start_date" IS NOT NULL)
  OR (
    "category" <> 'BENCH'
    AND "bench_start_date" IS NULL
    AND "interviews_scheduled_count" = 0
  )
);

ALTER TABLE "candidates" ADD CONSTRAINT "candidates_team_chk" CHECK (
  ("category" = 'NON_BILLABLE' AND "team" IS NOT NULL)
  OR ("category" = 'BENCH')
  OR ("category" = 'BILLABLE' AND "team" IS NULL AND "support_function" IS NULL)
);

ALTER TABLE "candidates" ADD CONSTRAINT "candidates_support_function_chk" CHECK (
  ("team" = 'SUPPORT' AND "support_function" IN ('HR', 'TA'))
  OR ("team" IS DISTINCT FROM 'SUPPORT' AND "support_function" IS NULL)
);

ALTER TABLE "candidates" ADD CONSTRAINT "candidates_interviews_chk" CHECK (
  "interviews_scheduled_count" >= 0
);

CREATE TABLE "candidate_bench_feedback" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "candidate_id" UUID NOT NULL,
    "kind" "BenchFeedbackKind" NOT NULL,
    "author_user_id" UUID NOT NULL,
    "feedback_date" DATE NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_bench_feedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "candidate_bench_feedback_organization_id_idx" ON "candidate_bench_feedback"("organization_id");
CREATE INDEX "candidate_bench_feedback_candidate_id_kind_feedback_date_idx" ON "candidate_bench_feedback"("candidate_id", "kind", "feedback_date");

ALTER TABLE "candidate_bench_feedback" ADD CONSTRAINT "candidate_bench_feedback_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "candidate_bench_feedback" ADD CONSTRAINT "candidate_bench_feedback_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "candidate_bench_feedback" ADD CONSTRAINT "candidate_bench_feedback_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
