# Feature: Quotes, Invoices, And Payments

**Status:** Draft  
**Last updated:** 2026-06-09  
**Owner:** Mike Hilton

---

## Goal
Let reps create, edit, send, and track quotes from the doorstep, then convert accepted quotes into invoices with payment status and future Stripe support.

## Current Behavior
The UI has legacy nested quote/sale/invoice-like structures. Supabase foundation includes permissions and object types but not full quote/invoice/payment tables yet. Stripe is not integrated.

## Desired Behavior
Sales reps can create/read/update/soft-delete quotes until accepted. Quotes live in dedicated Supabase tables, not activity payloads. A quote has a hosted privacy-safe URL that can be copied and manually sent. Accepted quotes become invoices ready to send after work completion, with JSON-backed line/adjustment detail for MVP. Stripe is stubbed and not customer-visible for MVP while invoice payment state can be manually marked paid/unpaid/outstanding.

## User Flow
1. Rep opens an address.
2. Rep creates or edits a quote.
3. Rep copies hosted quote URL and sends it manually.
4. Customer accepts quote.
5. System locks quote editing for reps.
6. System creates invoice draft/ready state.
7. Admin/authorized user marks invoice paid, unpaid, or outstanding.

## Business Rules
- Reps can CRUD draft/sent quotes.
- Reps cannot edit accepted quotes.
- Accepted quote auto-converts into invoice.
- Hosted quote URLs must be unguessable.
- Stripe is stubbed for MVP; no real payment processing until explicitly implemented.
- Stripe payment affordances must not be customer-visible until explicitly enabled.
- Additional charges/discounts can be added during/after visit before invoice finalization.
- Record Transaction remains a first-class action label.
- Quote/invoice/transaction actions should create related `doorstep.activities` feed entries.

## Edge Cases
- Empty states: Address can have no quotes.
- Error states: Quote acceptance failure must not create duplicate invoices.
- Permissions: Sales Rep can edit/send quotes; invoice/payment management may require Admin/Owner or configured entitlement.
- Duplicate data: A quote should create at most one invoice.
- Dependency failures: Stripe outage should not block manual paid/unpaid status tracking in MVP.

## Non-Goals
- Full Stripe checkout/payment collection in first pass.
- Tax automation.
- E-signature.
- Complex quote versioning beyond accepted lock.

## Acceptance Criteria
- Given a draft quote, when a rep edits it, then the quote updates.
- Given an accepted quote, when a rep attempts to edit it, then editing is blocked.
- Given a quote is accepted, when conversion runs, then one invoice is created.
- Given Stripe is not configured, when invoice status changes, then manual status works.
- Given quote, invoice, or transaction records exist, when the unified address record opens, then history can query dedicated tables instead of parsing generic activity JSON.

## Validation Plan
- Add Supabase quote/invoice migrations before wiring UI.
- Verify accepted quote lock with role permissions.
- Verify hosted URL slug/hash is not sequential or human-readable.

## Open Questions
- [ ] What quote fields are required for MVP besides line items, discounts, notes, subtotal, total, hosted slug, and status?
- [ ] Who can mark invoices paid: Owner/Admin only, or Scheduler too?
- [ ] Should hosted quote pages require customer verification or be bearer-link only for MVP?

## Decisions Made
- 2026-06-08: Stripe should be stubbed first; manual paid/unpaid/outstanding status is MVP.
- 2026-06-09: Use dedicated quotes table, dedicated invoices table, and transactions table.
- 2026-06-09: Invoice line/adjustment detail can be JSON for MVP.
- 2026-06-09: Keep Record Transaction as the action label.

## Iteration History
- 2026-06-08: Initial spec created.
- 2026-06-09: Updated data-model direction from Unified Address Record PRD.
