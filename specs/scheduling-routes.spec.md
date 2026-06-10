# Feature: Scheduling And Routes

**Status:** Draft  
**Last updated:** 2026-06-08  
**Owner:** Mike Hilton

---

## Goal
Support sales and technician workflows where reps can create canvassing routes and schedule appointments only when technicians are available.

## Current Behavior
The app has local route and appointment concepts. Sales routes and technician routes are not yet persisted as first-class Supabase tables. Google Calendar integration is mocked/stubbed. Route creation is currently labeled "Rapid Mode" in parts of the UI and should be renamed to "Route Creation."

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
- Rename user-facing "Rapid Mode" route UX to "Route Creation."
- Sales reps can schedule appointments directly.
- Backend approval/validation happens after scheduling request.
- Appointment availability must account for technician schedule and connected calendars.
- MVP does not include assigned territory.
- Appointment actions include cancel and reschedule.
- Creating or rescheduling an appointment through Schedule CTA should set the address sub-status to Scheduled when valid for the current stage.
- In Route Creation, tapping homes adds address/prospect records to the active route but must not create contact records.
- Contacts are created only after an attempted contact is logged, such as a knock, call, conversation, or other human outreach event.
- Route Creation taps must create/confirm the address record and add it to the route together; partial success is an error state.
- Route addresses should use a square visual marker while unvisited/uncontacted.
- After a knock or other activity is logged on a route address, the marker changes to the normal colored teardrop/pin style based on the resulting stage/status.
- Route progress should be visible while route mode is active, such as visited/contacted count out of total route addresses.
- Saving an unnamed route must show an inline "Name this route" prompt instead of failing silently.
- Saving an existing named route updates that route rather than creating a duplicate.
- Save should be available throughout Route Creation.
- Standard/Satellite map toggle should use a non-Google tile provider for MVP and persist only for the current session.

## Edge Cases
- Empty states: No available technicians should show no times, not allow blind booking.
- Error states: Calendar provider failure should show a clear warning and avoid false availability.
- Permissions: Sales Rep can schedule; Scheduler can manage schedule; Technician can view assigned appointments/routes.
- Duplicate data: Prevent double-booking the same technician/time slot.
- Dependency failures: External calendar unavailable should degrade according to workspace policy.
- Route creation failures: do not add a visual route marker unless the address/prospect record and route membership are both confirmed.

## Non-Goals
- Territory assignment for MVP.
- Full two-way calendar sync in the first pass.
- AI route optimization beyond existing route sorting.
- Creating contact records from route taps alone.

## Acceptance Criteria
- Given a rep schedules an appointment, when technician availability is unavailable, then no time is shown.
- Given an appointment exists, when technician route is viewed, then it appears in the correct day route.
- Given an appointment is canceled or rescheduled, then route/availability reflects the change.
- Given a rep enters Route Creation, when they tap a home with no existing address record, then the app creates/confirms a Prospect address and adds it to the active route without creating a contact.
- Given a route address has no attempted contact logged, then it shows as a square route marker.
- Given a route address has a knock/call/activity logged, then it shows the normal colored teardrop/pin based on current stage/status.
- Given a rep saves a nameless route, then an inline name prompt appears and the route saves after naming.
- Given a rep toggles satellite view, then the selected non-Google satellite tile layer appears and the active layer state is visible for the session.

## Validation Plan
- Add first-class Supabase appointment/route tables before UI persistence.
- Stub external calendar checks behind a service boundary.
- Verify cancel/reschedule state transitions.
- Evaluate non-Google satellite tile provider options before implementing FR-47/FR-48.

## Open Questions
- [ ] Which calendar provider comes first: Google Calendar, Microsoft, or generic ICS?
- [ ] Should failed external calendar checks block scheduling or allow with warning for MVP?
- [ ] What duration defaults should appointments use by workspace/role?
- [ ] Which non-Google satellite tile provider should be used for MVP, and what API key/billing constraints apply?

## Decisions Made
- 2026-06-08: Sales routes are user-created; technician routes are appointment-derived.
- 2026-06-10: Rename "Rapid Mode" to "Route Creation."
- 2026-06-10: Route Creation creates address/prospect records and route membership only; contact records wait until attempted contact is logged.
- 2026-06-10: Unvisited route addresses use square markers; after activity is logged they return to colored teardrop/pin markers.
- 2026-06-10: Use a working non-Google satellite tile provider for MVP unless later approved to switch back to Google Maps.

## Iteration History
- 2026-06-08: Initial spec created.
