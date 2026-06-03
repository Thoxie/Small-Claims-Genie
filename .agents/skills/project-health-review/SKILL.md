---
name: project-health-review
description: Full project health and architecture review for Small Claims Genie. Run at the start of every planning session, or when the user asks for a big-picture check, roadmap review, or what to work on next. Update this skill whenever a better pattern is discovered or the project changes direction.
---

# Project Health Review

Run this at the start of every planning session. This is a living document — update it
whenever a better approach is found, the project changes direction, or a new subsystem
is added. Do not treat it as static.

## How to Run

Deliver each section below concisely. Flag blockers first. No fluff.
Adapt the sections to what's actually relevant at the time — skip sections that don't
apply, add new ones if the project has grown into new territory.

---

### 1. Security Audit
- Any new routes missing ownership checks (IDOR risk)?
- Any endpoints bypassing `requireAuth` unexpectedly?
- Any new secrets that should be env vars but aren't?
- Anything that must be fixed before the next production deploy?

### 2. Contract Discipline
- Any routes or fields added without going through the OpenAPI spec + codegen cycle?
- What needs to be backfilled into `openapi.yaml` and re-run through codegen?

### 3. Form / Feature Coverage
- List every major feature area (forms, AI flows, auth paths, payment gates)
- Which have e2e test coverage? Which don't?
- Flag the highest-risk uncovered surface

### 4. Fragility & Regression Risk
- Top 3 things most likely to break silently as the codebase grows
- One mitigation or detection strategy for each

### 5. Prioritized Build Backlog
- Next 3 tasks in priority order
- One sentence each: what, why, and what "done" looks like

---

## Standing Collaboration Rules

These are defaults — override them if the situation calls for it.

- **One change at a time** produces cleaner diffs and easier verification
- **Screenshot or URL** when reporting a visual bug removes guesswork
- **Flag fragile areas before touching them** — say so before writing code
- **Verify production after significant features ship** before moving on
- **Never push to GitHub automatically** — only on explicit instruction
- **Always name the environment** (staging vs. production) and whether a republish is needed

## When to Update This Skill

- A new subsystem is added (new form, new AI flow, new auth path, new payment gate)
- A better review or collaboration pattern is found through experience
- The project changes direction and old sections no longer apply
- The user asks to add, remove, or change a standing rule
