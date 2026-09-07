# ADR 0001 — MVP Delivery Control First

## Status

Accepted

## Context

The organization needs to replace the Excel Client Delivery Tracker. Companion systems already cover hiring (SST) and billing. Expanding into those domains would delay delivery.

## Decision

MVP implements post-placement delivery control only: Clients, Candidates, Leave, Timesheets, Delivery Reviews, Dashboard, Auth/RBAC/Audit, import seam.

## Consequences

- Clear scope and Excel parity path  
- Live SST sync and billing deferred  
- Extension seams documented in Future modules  

## Alternatives considered

- Build unified HR suite — rejected (too broad)  
- Only dashboard on Excel — rejected (no multi-user SoR)  

## References

- [../../00-initiation/VISION.md](../../00-initiation/VISION.md)  
