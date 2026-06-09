# Feature: Scheduling And Routes

**Status:** Draft  
**Last updated:** 2026-06-08  
**Owner:** Mike Hilton

---

## Goal
Support sales and technician workflows where reps can create canvassing routes and schedule appointments only when technicians are available.

## Current Behavior
The app has local route and appointment concepts. Sales routes and technician routes are not yet persisted as first-class Supabase tables. Google Calendar integration is mocked/stubbed.

## Desired Behavior
Sales reps create routes they plan to knock. Technician routes are generated from scheduled appointments for the day. Appointment time options must check technician availability and external calendar conflicts before they are shown to reps.

## User Flow
1. Rep builds a route from eligible address records.
2. Rep knocks/updates statuses along the route.
3. Rep schedules an appointment from an address.
4. App checks technician availability and connected calendars.
5. Rep chooses an available time.
6. Technician views route based on appointments for the day.
7. Appointment can be canceled or rescheduled.

## Business Rules
- Sales routes and technician routes are different concepts.
- Sales reps can schedule appointments directly.
- Backend approval/validation happens after scheduling request.
- Appointment availability must account for technician schedule and connected calendars.
- MVP does not include assigned territory.
- Appointment actions include cancel and reschedule.

## Edge Cases
- Empty states: No available technicians should show no times, not allow blind booking.
- Error states: Calendar provider failure should show a clear warning and avoid false availability.
- Permissions: Sales Rep can schedule; Scheduler can manage schedule; Technician can view assigned appointments/routes.
- Duplicate data: Prevent double-booking the same technician/time slot.
- Dependency failures: External calendar unavailable should degrade according to workspace policy.

## Non-Goals
- Territory assignment for MVP.
- Full two-way calendar sync in the first pass.
- AI route optimization beyond existing route sorting.

## Acceptance Criteria
- Given a rep schedules an appointment, when technician availability is unavailable, then no time is shown.
- Given an appointment exists, when technician route is viewed, then it appears in the correct day route.
- Given an appointment is canceled or rescheduled, then route/availability reflects the change.

## Validation Plan
- Add first-class Supabase appointment/route tables before UI persistence.
- Stub external calendar checks behind a service boundary.
- Verify cancel/reschedule state transitions.

## Open Questions
- [ ] Which calendar provider comes first: Google Calendar, Microsoft, or generic ICS?
- [ ] Should failed external calendar checks block scheduling or allow with warning for MVP?
- [ ] What duration defaults should appointments use by workspace/role?

## Decisions Made
- 2026-06-08: Sales routes are user-created; technician routes are appointment-derived.

## Iteration History
- 2026-06-08: Initial spec created.
