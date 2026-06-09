# Feature: Labels And Contact Tagging

**Status:** Draft  
**Last updated:** 2026-06-08  
**Owner:** Mike Hilton

---

## Goal
Allow workspace users to label/tag contacts and address records so teams can segment, prioritize, search, and automate CRM workflows.

## Current Behavior
The app has local settings tags and address/property tags in the UI. Supabase has `doorstep.labels` and `doorstep.record_labels`, but the frontend has not been fully wired to them. Contacts are partly represented as nested UI data and partly scaffolded in normalized tables.

## Desired Behavior
Labels are workspace-wide, object-type scoped, and assignable to contacts and addresses. Labels support name, color, description, and future automation triggers.

## User Flow
1. Admin creates or edits labels in workspace settings.
2. User opens an address or contact.
3. User assigns or removes labels.
4. Label changes persist to Supabase and appear in list/map/search filters.
5. Future automation can trigger from label changes.

## Business Rules
- Labels are workspace-wide.
- Labels are scoped by object type: address, contact, quote, invoice, appointment.
- Users need `labels.manage` to create/update labels.
- Users need `labels.assign` to assign labels to records.
- Label deletion should be soft delete or prevented if in use until a clear cleanup rule exists.

## Edge Cases
- Empty states: Workspace starts with default labels from current `DEFAULT_TAGS` or no labels, based on owner setup.
- Error states: Failed label assignment should roll back UI state or show a clear error.
- Permissions: Technicians may view labels; label management is Admin/Owner by default.
- Duplicate data: Label name must be unique per workspace/object type.
- Dependency failures: If labels cannot load, address records should still load.

## Non-Goals
- Full automation builder in the first labels pass.
- Global platform labels shared across all workspaces.
- Complex nested label taxonomies.

## Acceptance Criteria
- Given a workspace has labels, when a user opens settings, then labels load from Supabase.
- Given a user with permission assigns a label to a contact, when the operation succeeds, then `doorstep.record_labels` stores the assignment.
- Given a duplicate label name is submitted for the same object type, then the user receives a clear error.

## Validation Plan
- Add label create/update/assign tests around Supabase calls.
- Verify RLS permission behavior for manage vs assign.
- Verify labels appear in address/contact filters.

## Open Questions
- [ ] Should MVP seed default labels automatically per workspace?
- [ ] Should Sales Rep be able to create labels, or only assign existing labels?
- [ ] Should labels be visible on map markers or only in detail/list views?

## Decisions Made
- 2026-06-08: Labels should replace the looser "tags" concept over time and be object-type scoped.

## Iteration History
- 2026-06-08: Initial spec created.
