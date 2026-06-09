# Scratchpad

## 2026-06-08 — Current Objective
**Task:** Install a spec-driven AI engineering workflow in the DoorStep CRM repo so future deploys become more efficient and higher quality.  
**Target spec:** `/specs/spec-driven-ai-engineering.spec.md`

## Micro-Steps
- [x] Read the attached framework text.
- [x] Create root agent operating files.
- [x] Create initial feature specs for current product direction.
- [x] Run verification.
- [ ] Commit and push if requested or appropriate.

## Assumptions
- `CLAUDE.md` should be the primary root operating file because the user mentioned Claude and Codex.
- `AGENTS.md` should point Codex-style agents to `CLAUDE.md` without duplicating instructions.
- Feature specs should start with the current MVP-critical areas, not every future feature.

## Gotchas Discovered This Session
- No dedicated long-term memory tool is available in this thread, so repo docs are the durable memory source.
- The generated README still had AI Studio starter copy, so a DoorStep-specific AI workflow pointer was added at the top.

---
*Wipe entries older than 30 days. This is working memory, not history.*

## 2026-06-08 — Current Objective
**Task:** Protect proprietary spec strategy files from Cloudflare deploy artifacts and lock the user's spec workflow decisions.  
**Target spec:** `/specs/spec-driven-ai-engineering.spec.md`

## Micro-Steps
- [x] Update specs with user decisions.
- [x] Add deploy artifact verification script.
- [x] Add npm verification scripts and PR checklist.
- [x] Align auth UI with real-email requirement.
- [x] Run build, lint, artifact verification, and inspect `dist`.
- [ ] Commit and push.

## Assumptions
- Cloudflare deployment should continue to upload only `dist`.
- Specs/docs are allowed in GitHub but must never be served by Cloudflare.
- Real email requirement should be reflected in both spec and auth UI.

## Gotchas Discovered This Session
- Vite copies everything in `public/` into `dist`, so proprietary docs must never be placed there.
- `dist` currently contains only `index.html`, one JS asset, one CSS asset, and `config`.

---
*Wipe entries older than 30 days. This is working memory, not history.*
