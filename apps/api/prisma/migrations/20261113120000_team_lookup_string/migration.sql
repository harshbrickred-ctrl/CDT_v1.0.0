-- Store employee team as a string so Settings → Lookups (EMPLOYEE_TEAM) can add values.
ALTER TABLE "candidates" ALTER COLUMN "team" TYPE TEXT USING "team"::text;

DROP TYPE IF EXISTS "EmployeeTeam";
