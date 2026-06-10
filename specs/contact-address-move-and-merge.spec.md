# Feature: Contact Address Move And Merge

**Status:** Draft  
**Last updated:** 2026-06-10  
**Owner:** Mike Hilton

---

## Goal
Let a workspace user move all contacts from one address record to a new address record without losing customer history, corrupting destination data, or hiding displaced contacts from admin recovery workflows.

## Current Behavior
Contacts still ride partly through address-level UI state and `doorstep.addresses.custom_data`. There is no safe move flow for when every contact at an address moves to a different address. Dedicated quote, invoice, transaction, activity, and notes tables exist as a foundation, but contact move/merge is not yet implemented as an atomic backend operation.

## Desired Behavior
From the Unified Address Record, a user with contact edit access can start "Move to New Address" from Contact Info edit mode. The move applies to all contacts at the source address. If the destination is empty, contacts move there, invoices follow the contacts, quotes stay with the original address, and the original address resets to Prospect without contact data. If the destination already has contact data, the existing destination contacts are displaced into an admin-only "Contacts Without Address" queue before the incoming contacts populate the destination.

## User Flow
1. User opens an address record.
2. User enters Contact Info edit mode.
3. User chooses "Move to New Address."
4. User enters a destination address.
5. App geocodes and checks for an existing workspace address match.
6. App shows a confirmation dialog for an empty destination, or a merge warning with destination contact preview for a populated destination.
7. User explicitly confirms.
8. Backend executes the full move/merge in one transaction.
9. UI refreshes both source and destination address records and shows an activity/audit event.

## Business Rules
- Address remains the primary CRM object; contacts are related records under addresses.
- The move action moves all contacts at the source address, not only the primary contact.
- Gate-side/address notes stay with the original address because they describe the physical address, not the person.
- Invoices, including paid and unpaid invoice history, follow the moved contacts to the destination address.
- Quotes stay with the original address.
- Original address is reset to Active Stage `prospect`, contact fields are cleared, and contact cards are removed.
- Existing destination contacts are never hard-deleted; they are displaced into a backend queue and hidden from normal rep views.
- "Contacts Without Address" is admin/owner accessible for MVP and hidden from normal sales rep flows.
- The move/merge operation must be implemented as a single Supabase RPC/database transaction. All steps succeed together or no changes commit.
- The move/merge operation must write a full audit trail with actor, timestamp, source address, destination address, displaced contact IDs, moved contact IDs, and affected invoice IDs.
- Contact normalization to `doorstep.contacts` is required before or as part of this feature; do not implement move/merge against fragile nested contact JSON only.

## Edge Cases
- Destination geocoding fails: user can correct the address or cancel; no partial move occurs.
- Destination address exists with no contact data: use empty-destination flow.
- Destination address exists with contact data: use merge warning flow.
- RPC failure or network interruption: UI shows failure and preserves pre-move state after reload.
- Duplicate confirmation submits: backend must be idempotent or protected by a move operation key.
- Source has no contacts: move action is disabled or explains that there are no contacts to move.

## Non-Goals
- Bulk move across multiple source addresses.
- Automatic discovery of displaced contacts' new addresses.
- Full notification system for displaced contacts queue in the first pass.
- Hard-delete of displaced contacts.

## Acceptance Criteria
- Given a source address has contacts and invoices, when a user confirms an empty-destination move, then all contacts and invoices are associated to the destination, quotes remain at the source, and source contact data is cleared.
- Given the destination has existing contact data, when a user confirms the merge, then destination contacts are hidden from normal views and retained in the admin-only displaced contacts queue.
- Given any step of move/merge fails, then no source, destination, invoice, quote, contact, or displaced queue state is partially committed.
- Given a move/merge completes, then admins can inspect an audit trail with actor, timestamp, source, destination, moved contacts, displaced contacts, and invoice reassociations.
- Given a normal rep opens Contacts, then displaced contacts are not shown in normal contact/address lists.
- Given an Owner/Admin opens the admin contacts area, then unresolved displaced contacts are visible for follow-up and reassociation.

## Validation Plan
- Add a new Supabase migration for normalized contacts, displaced contacts, idempotency/move operation tracking if needed, and move/merge RPC.
- Add transaction tests or SQL verification cases for empty destination, populated destination, RPC failure rollback, and duplicate submission.
- Verify RLS keeps displaced contacts admin/owner visible and rep hidden.
- Run `npm run verify`.
- Smoke test in production-like Supabase using test addresses before any real customer data.

## Open Questions
- [ ] Should Scheduler have access to the Contacts Without Address queue, or Owner/Admin only for first launch?
- [ ] Should displaced contacts queue show a passive count badge in the hamburger/admin menu?
- [ ] Should move operation require an additional typed confirmation for populated-destination merges?

## Decisions Made
- 2026-06-10: The address remains the primary object; "Contact Record" PRD language maps to contact sections inside the Unified Address Record.
- 2026-06-10: Move to New Address moves all contacts at the source address.
- 2026-06-10: Gate-side notes stay with the original address.
- 2026-06-10: Contacts Without Address queue is admin/owner accessible for MVP.
- 2026-06-10: Backend idempotency and atomic RPC transaction are required for move/merge.
- 2026-06-10: Contacts should be normalized into `doorstep.contacts` before or as part of move/merge.

## Iteration History
- 2026-06-10: Spec created from PRD and user alignment decisions.
