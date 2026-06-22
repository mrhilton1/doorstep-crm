# Feature: Address Activity Logging

**Status:** Implemented
**Last updated:** 2026-06-10
**Owner:** Mike Hilton

---

## Goal
Replace status-first door logging with a Supabase-backed Live Event Logger that lets field reps quickly record what happened at an address, including knock outcomes, calls, completed service, referrals, quote requests, and generic record events. Activity history must be separate from the address-level visit status because a status such as Knocked can only describe the current/latest state.

## Current Behavior
The address editor currently includes Visit Status pills and a simple Knock/Conversation logging panel. Activity entries still use the legacy `interactions` shape in the UI. The Supabase foundation already includes `doorstep.activities`, but the editor is not yet writing door events there.

## Desired Behavior
The address editor replaces the Visit Status area with a modal Live Event Logger launched from record action buttons and shortcuts. The modal behaves like a lightweight PWA flow: users move forward through one decision at a time, can go back to the previous branch without losing the whole interaction, see only the fields required for the current path, and log the event to `doorstep.activities`. The activity feed stays visible on the record and updates immediately after save, showing who/what/when. Active Stage remains a separate field while allowing event-based auto movement with manual override. For untracked houses tapped from the map, the logger opens on a draft address and persists the address only after an activity is logged.

## User Flow
1. User opens an address/contact editor.
2. User chooses event type: Knock, Call, Completed Cleaning, or Record Event.
3. If Knock, user chooses No Answer or Answer; if Answer, user chooses an outcome.
4. App reveals required fields only for the selected event path.
5. User clicks Log Event.
6. App inserts the event into `doorstep.activities`, updates the local feed, and applies stage/status derivation rules where appropriate.
7. Activity appears in the editor history and the contact summary Activity Logs tab.
8. If the address was a draft from a normal map tap, the address is created as a Prospect only after the activity save succeeds.

## Business Rules
- Event logging is the primary door workflow; Visit Status is demoted to a derived/latest outcome.
- The activity modal should be path-driven with forward/back navigation, not a flat form that exposes every possible child option at once.
- A single address can have many events per day.
- Activity entries must include event type, timestamp, actor, address ID, and note/body when supplied.
- Required notes: Follow-Up Needed and Completed Cleaning.
- Referral Given requires referral type and referring rep name.
- Record Event requires a description.
- Active Stage remains manually editable, but events can auto-move stage: Conversation/answered knock to Lead, Estimate/Quote Requested to Opportunity, Completed Cleaning or payment/job completion to Customer.
- Knock -> Answer -> Not Interested must set the address sub-status to `not_interested` and must not auto-promote the address just because the knock was answered.
- Email, SMS, quote, invoice, appointment, and future actions should all use the same activity feed pattern.
- Notes use `doorstep.notes` as source of truth and `doorstep.activities` as the timeline entry.
- MVP detailed event taxonomy can be stored in `doorstep.activities.metadata`; the high-level `type` enum remains stable.
- "Notes Only" filters in address/contact activity feeds should include only human-entered notes/messages and exclude system-generated logs such as automatic stage changes or audit events.
- A route-created address should not gain contact records until an attempted contact is logged through Knock, Call, Conversation, or another human outreach event.
- Logging an attempted contact against a route address confirms the Prospect route address and may advance stage according to the central stage rules.
- Normal map taps on untracked houses should start a draft activity session. Draft addresses do not persist unless the rep logs an activity.
- Contact fields may be filled while the draft activity session is open, but the address/contact bridge is not persisted until the activity creates the address.

## Edge Cases
- Empty history shows a friendly empty state.
- Long notes wrap without breaking the drawer layout.
- Repeated knocks should append new history entries rather than overwrite prior knocks.
- Event write failures show inline retry/error UI and do not fake success.
- Users can still manually change Active Stage after auto movement.
- Route-created addresses may have no contacts; activity logging should handle address-only records gracefully.

## Non-Goals
- Activity deletion/editing/archive UI.
- Full referral-created lead automation if it requires new lead form plumbing beyond metadata capture.
- Full custom event type administration.
- Automatic call/SMS/email provider integration.

## Acceptance Criteria
- Given an address editor is open, when the user logs Knock -> No Answer, then a new Supabase activity is created and the feed increments.
- Given the user logs Knock -> Answer -> Follow-Up Needed without a note, then inline validation requires a note.
- Given the user logs Knock -> Answer -> Estimate / Quote Requested, then the event is saved, the address is promoted to Opportunity, and the existing Quote Builder opens.
- Given the user logs Knock -> Answer -> Not Interested, then the event is saved, the address shows Not Interested as the current sub-status, and the activity feed remains visible.
- Given the user is midway through a modal event path, when they tap Back, then the modal returns to the previous decision layer and preserves broader context.
- Given the user logs Knock -> Answer -> Referral Given, then referral type and referring rep name are required and saved in activity metadata.
- Given the user logs an Outbound or Inbound Call, then a call event is saved with optional note.
- Given the user logs Completed Cleaning, then a note is required and the address is promoted to Customer.
- Given multiple events are logged for one address, then all events remain visible in reverse chronological order.
- Given a second workspace member opens the address, then the Supabase-backed event history is visible.
- Given a route-created address has no contact records, when a rep logs a knock/call/activity, then the event is saved against the address and contact creation is handled by the contact flow only when actual contact data is captured.
- Given a rep taps an untracked house in normal map mode, when the activity drawer opens and the rep closes it without logging, then no address or activity is created.
- Given a rep taps an untracked house and logs Knock/Call/Record Event, then the address is created as a Prospect and the activity is saved to that address.

## Validation Plan
- Run `npm run build`.
- Run `npm run lint`.
- Run `npm run verify:deploy-artifact`.
- Manually smoke test logging Knock and Conversation on an address record in production or local configured Supabase.

## Open Questions
- [ ] What are the exact referral type options?
- [ ] Should Quote Builder return explicit Accepted / Not Accepted follow-on events in this pass or the quote workflow pass?
- [ ] Which roles can archive activity events when supervisor archive is implemented?
- [x] Should Notes Only include system-generated notes? Decision: no; human-entered notes/messages only.

## Decisions Made
- 2026-06-09: Keep Visit Status separate from repeatable Activity Logs.
- 2026-06-09: Use the existing `interactions` bridge for MVP persistence.
- 2026-06-09: User approved replacing the Visit Status area with a Live Event Logger and wiring events to Supabase.
- 2026-06-09: Event outcomes can auto-move stage while preserving manual stage edits.
- 2026-06-09: Notes should be queryable from a dedicated notes table and reflected in activities.
- 2026-06-10: Notes Only means human-entered notes/messages only.
- 2026-06-10: Route Creation addresses do not create contact records until an attempted contact is logged and contact data is captured.
- 2026-06-10: Normal untracked house taps open a draft activity session and persist the address only after the first logged activity.
- 2026-06-19: Event composer opens as a modal from record actions; the record keeps Activity Timeline visible. Not Interested is stored as a sub-status and does not trigger answer-based stage promotion.
- 2026-06-22: Activity logging modal should behave like a stepwise PWA flow with forward/back branch navigation.

## Iteration History
- 2026-06-09: Spec created.
- 2026-06-09: Added Log Activity composer and editor history for Knock and Conversation entries.
- 2026-06-09: Replaced Visit Status controls with Live Event Logger, wired event inserts to `doorstep.activities`, and added event-based stage/status derivation.
- 2026-06-10: Changed default untracked map taps to activity-first draft addresses instead of the Add Lead prompt.
