# Design System — CDT

## Purpose

Define design tokens, typography, health visual language, ShadCN usage, accessibility, and themes for CDT.

## Audience

Frontend engineers, UX.

## Scope

MVP web SPA. **Must be visually distinct from SST** (no teal primary clone).

## Definitions

| Term | Definition |
|------|------------|
| Token | CSS variable for color/spacing/type |
| Health language | On Track / At Risk / Escalated visual system |
| ShadCN | Component primitives on Radix + Tailwind |

---

## 1. Visual direction

- **Look:** Cool **slate** operational surfaces with a single **amber** accent for primary actions and focus. Atmosphere via subtle slate gradient and faint grid—not purple/indigo clichés, not cream/serif editorial broadsheet.  
- **Brand signal:** Wordmark **CDT** / “Client Delivery Tracker” uses display font at shell level so the first viewport is recognizably delivery-ops, not SST hiring.  
- **Typography:** **Fraunces** (display / wordmark / page titles) + **DM Sans** (UI body/controls) + **IBM Plex Mono** (public IDs). Avoid Inter/Roboto/Arial as primary.  
- **Density:** Compact tables; comfortable forms.  
- **Health:** First-class visual language—badges, chart segments, candidate banners—not a secondary afterthought.

## 2. Design tokens (CSS variables)

```css
:root {
  --background: 215 20% 97%;
  --foreground: 222 30% 12%;
  --card: 0 0% 100%;
  --primary: 38 92% 46%;           /* amber accent */
  --primary-foreground: 222 40% 10%;
  --muted: 215 16% 92%;
  --muted-foreground: 215 12% 40%;
  --border: 214 18% 84%;
  --ring: 38 92% 46%;
  --destructive: 0 72% 48%;
  --success: 152 45% 36%;          /* On Track support */
  --warning: 38 92% 46%;           /* At Risk aligns amber */
  --danger-health: 0 72% 48%;      /* Escalated */
  --slate-deep: 222 28% 16%;
  --radius: 0.375rem;
  --font-display: "Fraunces", ui-serif, Georgia, serif;
  --font-sans: "DM Sans", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, monospace;
}

.dark {
  --background: 222 28% 9%;
  --foreground: 210 20% 96%;
  --card: 222 24% 12%;
  --primary: 38 90% 52%;
  --primary-foreground: 222 40% 8%;
  --muted: 222 20% 16%;
  --border: 222 16% 22%;
  --ring: 38 90% 52%;
}
```

## 3. Engagement health tokens

| Health | Token | Text label | Usage |
|--------|-------|------------|-------|
| On Track | `--success` | On Track | Badge, chart slice, banner |
| At Risk | `--warning` | At Risk | Badge, chart slice, banner |
| Escalated | `--danger-health` | Escalated | Badge, chart slice, banner |

**Rules:**

- Always pair color with **text label**.  
- Latest health may appear as a full-width detail banner (not a floating sticker/chip on imagery).  
- Do not reuse SST “RAG = hiring SLA” copy; call this **Engagement Health**.

## 4. Typography scale

| Role | Font | Size / weight |
|------|------|---------------|
| App wordmark | Fraunces | ~1.25–1.5rem, semibold |
| Page title | Fraunces | ~1.5rem |
| Section title | DM Sans | 1.125rem medium |
| Body / table | DM Sans | 0.875–1rem |
| Public IDs | IBM Plex Mono | 0.8125rem |

## 5. ShadCN mapping

| Need | ShadCN |
|------|--------|
| Buttons, inputs, select | Button, Input, Select, Textarea |
| Dialogs | Dialog, AlertDialog |
| Tables | Table (+ TanStack Table) |
| Tabs, dropdown | Tabs, DropdownMenu |
| Toast | Sonner |
| Badge | Badge (health variants) |
| Form | Form + RHF + Zod |
| Charts | Recharts or similar with health colors |

Install via shadcn CLI into `apps/web` (or `packages/ui`).

## 6. Component patterns

| Pattern | Guidance |
|---------|----------|
| Primary CTA | Amber fill; used sparingly |
| Secondary | Slate outline/ghost |
| KPI tile | Flat muted panel, not heavy card stack; one metric each |
| Tables | Sticky header; mono IDs; health badge column |
| Approval actions | Approve (success outline) / Reject (destructive) |
| Missing state | Warning callout with CTA (e.g. Timesheet missing) |
| Filters | Inline toolbar above content; not pill-cluster chrome |

## 7. Motion

Ship 2–3 intentional motions:

1. Dashboard KPI value fade/settle on filter change.  
2. Health badge soft color transition on update.  
3. Approvals row completion slide-out.

Avoid noisy parallax or glow.

## 8. Accessibility

- WCAG AA contrast for text on slate/amber.  
- Do not convey health by color alone.  
- Focus rings use `--ring` amber.  
- Dialogs trap focus; Escape closes.  
- Tables keyboard sortable where interactive.

## 9. Anti-patterns (explicit)

- Teal/cyan primary (SST lookalike)  
- Purple-on-white / purple-indigo gradient themes  
- Cream + terracotta editorial default  
- Hero marketing cards on ops screens  
- Floating promo stickers on charts  

## Trade-offs

| Choice | Pros | Cons |
|--------|------|------|
| Amber = both primary & At Risk | Cohesive ops accent | Must rely on labels to separate CTA vs risk |
| Fraunces display | Distinct from SST Source Sans | Slightly more characterful for enterprise |

**Mitigation:** At Risk badges use amber **outline + label**; primary buttons use solid amber—document in Storybook/examples during build.

## References

- [WIREFRAMES.md](./WIREFRAMES.md)  
- [INFORMATION_ARCHITECTURE.md](./INFORMATION_ARCHITECTURE.md)  
- [../03-prd/PRD.md](../03-prd/PRD.md)  
- [../00-initiation/VISION.md](../00-initiation/VISION.md)  
