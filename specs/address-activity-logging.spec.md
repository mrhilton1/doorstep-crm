# Feature: Address Activity Logging

**Status:** Implemented  
**Last updated:** 2026-06-09  
**Owner:** Mike Hilton

---

## Goal
Replace status-first door logging with a Supabase-backed Live Event Logger that lets field reps quickly record what happened at an address, including knock outcomes, calls, completed service, referrals, quote requests, and generic record events. Activity history must be separate from the address-level visit status because a status such as Knocked can only describe the current/latest state.

## Current Behavior
The address editor currently includes Visit Status pills and a simple Knock/Conversation logging panel. Activity entries still use the legacy `interactions` shape in the UI. The Supabase foundation already includes `doorstep.activities`, but the editor is not yet writing door events there.

## Desired Behavior
The address editor replaces the Visit Status area with a Live Event Logger. Users choose an event path, see only the fields required for that path, and log the event to `doorstep.activities`. The activity feed updates immediately, shows who/what/when, and keeps Active Stage as a separate field while allowing event-based auto movement with manual override.

## User Flow
1. User opens an address/contact editor.
2. User chooses event type: Knock, Call, Completed Cleaning, or Record Event.
3. If Knock, user chooses No Answer or Answer; if Answer, user chooses an outcome.
4. App reveals required fields only for the selected event path.
5. User clicks Log Event.
6. App inserts the event into `doorstep.activities`, updates the local feed, and applies stage/status derivation rules where appropriate.
7. Activity appears in the editor history and the contact summary Activity Logs tab.

## Business Rules
- Event logging is the primary door workflow; Visit Status is demoted to a derived/latest outcome.
- A single address can have many events per day.
- Activity entries must include event type, timestamp, actor, address ID, and note/body when supplied.
- Required notes: Follow-Up Needed and Completed Cleaning.
- Referral Given requires referral type and referring rep name.
- Record Event requires a description.
- Active Stage remains manually editable, but events can auto-move stage: Conversation/answered knock to Lead, Estimate/Quote Requested to Opportunity, Completed Cleaning or payment/job completion to Customer.
- Email, SMS, quote, invoice, appointment, and future actions should all use the same activity feed pattern.
- Notes use `doorstep.notes` as source of truth and `doorstep.activities` as the timeline entry.
- MVP detailed event taxonomy can be stored in `doorstep.activities.metadata`; the high-level `type` enum remains stable.

## Edge Cases
- Empty history shows a friendly empty state.
- Long notes wrap without breaking the drawer layout.
- Repeated knocks should append new history entries rather than overwrite prior knocks.
- Event write failures show inline retry/error UI and do not fake success.
- Users can still manually change Active Stage after auto movement.

## Non-Goals
- Activity deletion/editing/archive UI.
- Full referral-created lead automation if it requires new lead form plumbing beyond metadata capture.
- Full custom event type administration.
- Automatic call/SMS/email provider integration.

## Acceptance Criteria
- Given an address editor is open, when the user logs Knock -> No Answer, then a new Supabase activity is created and the feed increments.
- Given the user logs Knock -> Answer -> Follow-Up Needed without a note, then inline validation requires a note.
- Given the user logs Knock -> Answer -> Estimate / Quote Requested, then the event is saved, the address is promoted to Opportunity, and the existing Quote Builder opens.
- Given the user logs Knock -> Answer -> Referral Given, then referral type and referring rep name are required and saved in activity metadata.
- Given the user logs an Outbound or Inbound Call, then a call event is saved with optional note.
- Given the user logs Completed Cleaning, then a note is required and the address is promoted to Customer.
- Given multiple events are logged for one address, then all events remain visible in reverse chronological order.
- Given a second workspace member opens the address, then the Supabase-backed event history is visible.

## Validation Plan
- Run `npm run build`.
- Run `npm run lint`.
- Run `npm run verify:deploy-artifact`.
- Manually smoke test logging Knock and Conversation on an address record in production or local configured Supabase.

## Open Questions
- [ ] What are the exact referral type options?
- [ ] Should Quote Builder return explicit Accepted / Not Accepted follow-on events in this pass or the quote workflow pass?
- [ ] Which roles can archive activity events when supervisor archive is implemented?

## Decisions Made
- 2026-06-09: Keep Visit Status separate from repeatable Activity Logs.
- 2026-06-09: Use the existing `interactions` bridge for MVP persistence.
- 2026-06-09: User approved replacing the Visit Status area with a Live Event Logger and wiring events to Supabase.
- 2026-06-09: Event outcomes can auto-move stage while preserving manual stage edits.
- 2026-06-09: Notes should be queryable from a dedicated notes table and reflected in activities.

## Iteration History
- 2026-06-09: Spec created.
- 2026-06-09: Added Log Activity composer and editor history for Knock and Conversation entries.
- 2026-06-09: Replaced Visit Status controls with Live Event Logger, wired event inserts to `doorstep.activities`, and added event-based stage/status derivation.
