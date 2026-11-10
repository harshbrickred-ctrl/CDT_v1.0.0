-- Expand support roles and rename bench RM feedback to Delivery Manager.

ALTER TABLE "candidates" DROP CONSTRAINT IF EXISTS "candidates_support_function_chk";

ALTER TABLE "candidates" ADD CONSTRAINT "candidates_support_function_chk" CHECK (
  (
    "team" = 'SUPPORT'
    AND "support_function" IN ('HR', 'TA', 'ACCOUNTS', 'ADMIN', 'FINANCE')
  )
  OR ("team" IS DISTINCT FROM 'SUPPORT' AND "support_function" IS NULL)
);

ALTER TYPE "BenchFeedbackKind" RENAME VALUE 'RM' TO 'DELIVERY_MANAGER';
