# Feature: Address Activity Logging

**Status:** Implemented  
**Last updated:** 2026-06-09  
**Owner:** Mike Hilton

---

## Goal
Allow users to log repeated address-level activity events, starting with Knock and Conversation, with an optional note. Activity history must be separate from the address-level visit status because a status such as Knocked can only describe the current/latest state.

## Current Behavior
The address editor lets the user set a single Visit Status such as Not Visited, Knocked, No Answer, Interested, or Follow-Up Needed. The contact summary drawer displays `interactions`, and other workflows can add message/invoice/appointment interactions, but the address editor does not expose a direct Log Activity action for Knock or Conversation.

## Desired Behavior
The address editor includes a Log Activity section. The user can choose Knock or Conversation, add a note, and save the activity. Saved activities appear in a chronological activity history and persist with the address record through Supabase.

## User Flow
1. User opens an address/contact editor.
2. User chooses activity type Knock or Conversation.
3. User optionally enters a note.
4. User clicks Log Activity.
5. App appends the activity to the address history.
6. Activity appears in the editor history and the contact summary Activity Logs tab.

## Business Rules
- Visit Status is a current-state field, not the activity log.
- A single address can have many Knock and Conversation activity entries.
- Activity entries must include type, timestamp, author, and note/content.
- Empty notes are allowed only if the activity type itself is meaningful.
- The first MVP implementation can store interactions in `doorstep.addresses.custom_data.interactions`.

## Edge Cases
- Empty history shows a friendly empty state.
- Long notes wrap without breaking the drawer layout.
- Repeated knocks should append new history entries rather than overwrite prior knocks.
- Logging a Knock should not automatically force the Visit Status unless explicitly designed later.

## Non-Goals
- Full normalized `doorstep.activities` UI wiring.
- Activity deletion/editing.
- Custom activity types.
- Automatic call/SMS/email provider integration.

## Acceptance Criteria
- Given an address editor is open, when the user selects Knock and clicks Log Activity, then a new Knock entry is added to the activity history.
- Given an address editor is open, when the user selects Conversation, enters a note, and clicks Log Activity, then a new Conversation entry with that note is added to the activity history.
- Given multiple knocks are logged for one address, then all knocks remain visible in reverse chronological order.
- Given activity is logged, then the data persists through the existing Supabase address sync.
- Given the contact summary drawer shows Activity Logs, then Knock and Conversation entries appear there.

## Validation Plan
- Run `npm run build`.
- Run `npm run lint`.
- Run `npm run verify:deploy-artifact`.
- Manually smoke test logging Knock and Conversation on an address record in production or local configured Supabase.

## Open Questions
- [ ] Should logging a Knock optionally update Visit Status to Knocked?
- [ ] Should activity logs move to normalized `doorstep.activities` in the next Supabase data-model pass?

## Decisions Made
- 2026-06-09: Keep Visit Status separate from repeatable Activity Logs.
- 2026-06-09: Use the existing `interactions` bridge for MVP persistence.

## Iteration History
- 2026-06-09: Spec created.
- 2026-06-09: Added Log Activity composer and editor history for Knock and Conversation entries.
