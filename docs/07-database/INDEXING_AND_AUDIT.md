# Indexing and Audit — CDT Database

## Purpose

Define indexes and audit persistence for CDT MVP.

## Audience

Backend, DBAs, security.

## Scope

MVP PostgreSQL indexes and `audit_logs` design.

## Definitions

| Term | Definition |
|------|------------|
| `year_month` | Text `YYYY-MM` (same concept as domain MonthKey) |

---

## Indexes

| Table | Index | Rationale |
|-------|-------|-----------|
| clients | unique(name_normalized) | BR-27 |
| candidates | unique(public_id) | BR-02 / BR-29 |
| candidates | (client_id, status) | Dashboard/filters |
| candidates | (status) | Active headcount BR-25 |
| leaves | unique(public_id) | BR-29 |
| leaves | (candidate_id, status, start_date, end_date) | Overlap sums BR-05 |
| leaves | (status) | Approvals queue |
| timesheets | unique(public_id) | BR-29 |
| timesheets | unique(candidate_id, year_month) WHERE deleted_at IS NULL | BR-14 |
| timesheets | (approval_status) | Approvals |
| delivery_reviews | unique(public_id) | BR-29 |
| delivery_reviews | unique(candidate_id, year_month) WHERE deleted_at IS NULL | BR-15 |
| delivery_reviews | (engagement_health) / (health) | Risk filters |
| users | unique(email) | Auth |
| audit_logs | (entity_type, entity_id, created_at) | History |
| audit_logs | (actor_user_id, created_at) | Actor trail |
| lookup_values | unique(lookup_type_id, value_normalized) | BR-12 |

## Audit log schema

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| actor_user_id | UUID | FK users |
| action | string | e.g. leave.approved |
| entity_type | string | Candidate, Leave, … |
| entity_id | UUID | |
| before_json | jsonb | nullable |
| after_json | jsonb | nullable |
| ip | string? | optional |
| created_at | timestamptz | |

### Mandatory audited actions (MVP)

- leave.approved / leave.rejected  
- timesheet.approved / timesheet.rejected  
- delivery_review.created / delivery_review.updated (esp. health)  
- candidate.released  
- user.created / role.changed  

Per BR-30.

## Trade-offs

Full row JSON before/after is heavier than field diffs; acceptable for MVP volume.

## References

- [ER_AND_SCHEMA.md](./ER_AND_SCHEMA.md)  
- [../01-business-analysis/BUSINESS_RULES.md](../01-business-analysis/BUSINESS_RULES.md)  
- [../11-security/AUDIT_LOGGING.md](../11-security/AUDIT_LOGGING.md)  
