# Feature: Spec-Driven AI Engineering

**Status:** Shipped v1  
**Last updated:** 2026-06-08  
**Owner:** Mike Hilton

---

## Goal
Create a lightweight operating system for AI-assisted DoorStep CRM development so each deploy improves speed, quality, and shared context.

## Current Behavior
Before this spec, context lived mostly in chat history, scattered docs, and code. Agents could inspect the repo, but there was no required pre-coding ritual or durable source of product/deploy decisions.

## Desired Behavior
Agents start with `CLAUDE.md`, use `SCRATCHPAD.md` before code changes, update relevant specs during delivery, and append meaningful decisions to `decisions.md`.

## User Flow
1. User asks for a change.
2. Agent reads `CLAUDE.md`, `SCRATCHPAD.md`, and the relevant feature spec.
3. Agent records objective, assumptions, and micro-steps in `SCRATCHPAD.md`.
4. Agent implements the smallest testable change.
5. Agent runs verification.
6. Agent updates the spec and decision log when product reality changed.

## Business Rules
- `CLAUDE.md` must stay short enough to be read every session.
- Specs are source of truth for intent; code is source of truth for current implementation.
- `decisions.md` is append-only.
- Sensitive values must never be written to docs or commits.
- Stale specs should be updated or deleted, not ignored.

## Edge Cases
- Empty states: If no feature spec exists, create a minimal spec before implementation.
- Error states: If implementation reveals the spec is wrong, update the spec and explain the drift.
- Permissions: Any agent may update docs; destructive code/data changes still require user approval.
- Duplicate data: Avoid duplicate operating instructions; `AGENTS.md` points to `CLAUDE.md`.
- Dependency failures: If verification cannot run, record why in final response and, when useful, `SCRATCHPAD.md`.

## Non-Goals
- Creating a large process handbook.
- Blocking urgent fixes on perfect specs.
- Creating specs for every tiny UI tweak.

## Acceptance Criteria
- Given a new AI agent starts work, when it opens the repo, then it can find standing instructions in `CLAUDE.md`.
- Given a feature is being changed, when no spec exists, then a minimal `/specs/*.spec.md` is created or the omission is explained.
- Given a meaningful architecture decision is made, when the work ships, then `decisions.md` has a dated entry.

## Validation Plan
- Confirm expected files exist.
- Confirm `CLAUDE.md` is concise.
- Confirm initial MVP specs exist.
- Run `npm run build` and `npm run lint` to ensure docs did not disturb app build.

## Open Questions
- [ ] Should GitHub issues be created from these specs, or should specs remain repo-only for now?
- [ ] Should every pull request include a "Spec updated?" checklist item?

## Decisions Made
- 2026-06-08: Use `CLAUDE.md` as primary operating file and `AGENTS.md` as a pointer to avoid drift.

## Iteration History
- 2026-06-08: Initial spec-driven workflow added.
