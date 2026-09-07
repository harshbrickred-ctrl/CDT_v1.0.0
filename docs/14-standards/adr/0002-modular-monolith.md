# ADR 0002 — Modular Monolith

## Status

Accepted

## Context

Small team delivering CDT; need clear module boundaries without microservice ops cost.

## Decision

Ship a Turborepo modular monolith: NestJS API + React SPA + shared packages + PostgreSQL.

## Consequences

- Simple local Docker deploy  
- Modules can split later if needed  
- Must enforce module boundaries in code review  

## Alternatives considered

- Microservices per tracker — rejected for MVP  
- Separate repos — rejected (shared types friction)  

## References

- [../../13-monorepo/MONOREPO_STRUCTURE.md](../../13-monorepo/MONOREPO_STRUCTURE.md)  
