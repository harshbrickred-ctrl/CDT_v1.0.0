-- Store employee team as a string so Settings → Lookups (EMPLOYEE_TEAM) can add values.
-- Drop enum-typed CHECK first; Postgres cannot rewrite text = "EmployeeTeam".
ALTER TABLE "candidates" DROP CONSTRAINT IF EXISTS "candidates_support_function_chk";

ALTER TABLE "candidates" ALTER COLUMN "team" TYPE TEXT USING ("team"::text);

DROP TYPE IF EXISTS "EmployeeTeam";

ALTER TABLE "candidates" ADD CONSTRAINT "candidates_support_function_chk" CHECK (
  (
    (support_function IS NULL)
    AND (team IS DISTINCT FROM 'SUPPORT')
  )
  OR (
    (support_function = ANY (ARRAY['HR'::text, 'TA'::text, 'ACCOUNTS'::text, 'ADMIN'::text, 'FINANCE'::text]))
    AND (team = ANY (ARRAY['SUPPORT'::text, 'LEADERSHIP'::text, 'DELIVERY'::text]))
  )
);
