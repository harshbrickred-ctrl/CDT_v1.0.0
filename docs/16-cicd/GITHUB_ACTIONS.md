# GitHub Actions — CDT

## Purpose

Define CI pipelines that protect `main` and produce releasable artifacts for `@cdt/api` and `@cdt/web`.

## Audience

Developers, platform engineers.

## Scope

MVP CI on GitHub Actions. CD deploy to cloud is Future (`19-cloud`).

## Definitions

| Term | Definition |
|------|------------|
| Workflow | `.github/workflows/*.yml` |
| Gate | Required check on PR |

---

## 1. Planned workflows

| File | Trigger | Jobs |
|------|---------|------|
| `ci.yml` | PR + push `main` | install, lint, typecheck, test, build |
| `e2e.yml` | `main` / nightly / manual | Playwright (when present) |
| `release.yml` | tag `v*` | build images / attach artifacts |

---

## 2. `ci.yml` sketch

```yaml
name: ci
on:
  pull_request:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: cdt
          POSTGRES_PASSWORD: cdt
          POSTGRES_DB: cdt
        ports: ["5432:5432"]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @cdt/shared-types build
      - run: pnpm --filter @cdt/shared-utils build
      - run: pnpm --filter @cdt/api prisma:generate
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
        env:
          DATABASE_URL: postgresql://cdt:cdt@localhost:5432/cdt?schema=public
```

Tune service readiness and migrate steps when API exists.

---

## 3. Required checks

- `lint`
- `typecheck`
- `test` (unit at minimum)
- `build` (`@cdt/api`, `@cdt/web`)

Optional later: `integration`, `e2e`.

---

## 4. Caching & performance

- Cache pnpm store
- Turbo remote cache optional
- Build shared packages once per job

---

## 5. Secrets

| Secret | Use |
|--------|-----|
| none for basic CI | public unit tests |
| `DATABASE_URL` | only if external CI DB |
| Registry creds | release workflow |

Never echo secrets in logs.

---

## 6. Branch protections

Align with [../14-standards/GIT_AND_PR.md](../14-standards/GIT_AND_PR.md): require CI on `main`.

---

## References

- [RELEASE_AND_ROLLBACK.md](./RELEASE_AND_ROLLBACK.md)
- [../13-monorepo/ENV_AND_VERSIONING.md](../13-monorepo/ENV_AND_VERSIONING.md)
- [../15-testing/TESTING_STRATEGY.md](../15-testing/TESTING_STRATEGY.md)
