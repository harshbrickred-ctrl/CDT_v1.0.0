# Git & Pull Request Standards — CDT

## Purpose

Define branching, commit, and PR expectations for CDT so reviews stay fast and history stays usable.

## Audience

All engineers; reviewers; CI maintainers.

## Scope

MVP monorepo workflow on GitHub (or compatible). Does not mandate a specific Git hosting UI beyond Actions.

## Definitions

| Term | Definition |
|------|------------|
| Trunk | `main` (protected) |
| Feature branch | Short-lived branch for one story/epic slice |

---

## 1. Branching model

```text
main
  └── feature/E3-S1-create-candidate
  └── fix/attendance-rounding
  └── chore/ci-cache
```

| Branch | Use |
|--------|-----|
| `main` | Always deployable; protected |
| `feature/*` | Stories from [EPICS_AND_STORIES.md](../12-planning/EPICS_AND_STORIES.md) |
| `fix/*` | Bug fixes |
| `chore/*` | Tooling, docs-only, deps |
| `release/*` | Optional freeze line for V1 cut |

**Rules**

- Branch from latest `main`.
- Prefer small PRs (< ~400 lines net when practical).
- Do not commit secrets, `.env`, or production dumps.

---

## 2. Commit messages

Conventional style:

```text
feat(candidates): add Active candidate create with CD public id
fix(timesheets): exclude Pending leave from Leave Days
docs(testing): add July attendance UAT case
chore(ci): cache pnpm store
```

| Prefix | Meaning |
|--------|---------|
| `feat` | New capability |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `test` | Tests only |
| `refactor` | No behavior change |
| `chore` | Build/tooling |

Reference story IDs when useful: `feat(leave): approve flow (E4-S3)`.

---

## 3. Pull request requirements

### Title

Same convention as commits; summarize *why*.

### Body template

```markdown
## Summary
- …

## Story / FR
- E?-S? / FR-?

## Test plan
- [ ] Unit / shared-utils where calc changed
- [ ] API or manual catalog case IDs
- [ ] UI path checked for affected role(s)

## Risk
- Low / Med / High — …
```

### Checks before merge

- CI green: lint, typecheck, test, build
- Reviewer approval (1 for MVP; 2 for auth/calc/security)
- No unresolved S1 comments
- Docs updated if contracts/rules changed

---

## 4. Review focus by change type

| Change | Reviewer checks |
|--------|-----------------|
| Leave / Timesheet / DR calc | shared-utils tests + BR citations |
| Auth / RBAC | matrix + negative 403 cases |
| Prisma schema | migration safety; uniqueness indexes |
| Import | dry-run behavior; partial commit policy |
| Dashboard aggregates | filter semantics (esp. On Leave Today) |

---

## 5. Protected branch rules (recommended)

- Require PR to `main`
- Require status checks
- Disallow force-push to `main`
- Optional: require linear history / squash merge

---

## 6. Hotfix

1. Branch `fix/…` from `main`
2. Minimal change + regression test/catalog case
3. Expedited review
4. Tag patch release per [RELEASE_AND_ROLLBACK.md](../16-cicd/RELEASE_AND_ROLLBACK.md)

---

## 7. Docs-only PRs

Allowed and encouraged during Phase A (docs-first). Still use `docs:` prefix and link related folders.

---

## References

- [CODING_STANDARDS.md](./CODING_STANDARDS.md)
- [../16-cicd/GITHUB_ACTIONS.md](../16-cicd/GITHUB_ACTIONS.md)
- [../12-planning/EPICS_AND_STORIES.md](../12-planning/EPICS_AND_STORIES.md)
