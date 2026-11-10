-- Allow role (support_function) for Leadership and Delivery teams; optional except Support.

ALTER TABLE "candidates" DROP CONSTRAINT IF EXISTS "candidates_support_function_chk";

ALTER TABLE "candidates" ADD CONSTRAINT "candidates_support_function_chk" CHECK (
  (
    "support_function" IS NULL
    AND ("team" IS DISTINCT FROM 'SUPPORT')
  )
  OR (
    "support_function" IN ('HR', 'TA', 'ACCOUNTS', 'ADMIN', 'FINANCE')
    AND "team" IN ('SUPPORT', 'LEADERSHIP', 'DELIVERY')
  )
);
