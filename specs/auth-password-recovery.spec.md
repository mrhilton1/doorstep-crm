# Feature: Auth Password Recovery

**Status:** Shipped v1  
**Last updated:** 2026-06-08  
**Owner:** Mike Hilton

---

## Goal
Allow an existing Supabase user who does not know or does not have a password, including a user originally created through OAuth or dashboard/admin flow, to set a password and sign into DoorStep CRM with real email/password auth.

## Current Behavior
DoorStep production has a sign-in screen with real email/password fields, a "Forgot password?" path, and a set-new-password screen that appears when Supabase emits a `PASSWORD_RECOVERY` auth event. The parent auth/workspace behavior is tracked in `/specs/supabase-workspace-auth.spec.md`.

## Desired Behavior
A user can request a password recovery email from the DoorStep sign-in screen. The recovery link redirects back to DoorStep, the app prompts for a new password and confirmation, and Supabase stores the new password through the authenticated recovery session.

## User Flow
1. User opens `https://app.clearview.win`.
2. User clicks "Forgot password?"
3. User enters their real email address.
4. Supabase sends the recovery email.
5. User opens the recovery link.
6. DoorStep shows "Set New Password."
7. User enters matching passwords and saves.
8. User signs in with email/password.

## Business Rules
- Password recovery uses Supabase Auth APIs; do not manually edit `auth.users`.
- Password recovery requires a real email address.
- Recovery redirect target should use `VITE_APP_URL`/runtime `appUrl`.
- Password update only happens from a valid Supabase recovery session.
- Existing workspace membership and profile data must not be modified by password reset.

## Edge Cases
- Empty states: If no email is entered, browser email validation blocks submit.
- Error states: Supabase reset/update errors are shown in the auth card.
- Permissions: A recovery link only grants password update for that authenticated recovery session.
- Duplicate data: Password reset must not create duplicate users.
- Dependency failures: If email delivery fails, the app displays Supabase's error.

## Non-Goals
- Google OAuth sign-in button.
- Admin-only password setting from a platform console.
- Custom transactional email templates.
- Password strength policy beyond Supabase/project settings.

## Acceptance Criteria
- Given a signed-out user clicks "Forgot password?", when they submit a real email, then Supabase sends a recovery email or returns a visible error.
- Given a user opens a valid recovery link, when the auth event is `PASSWORD_RECOVERY`, then DoorStep shows the set-new-password screen.
- Given passwords do not match, when the user submits, then no Supabase update is attempted and a local error appears.
- Given passwords match, when Supabase accepts the update, then the user exits recovery mode and can continue into the workspace flow.

## Validation Plan
- Run `npm run verify`.
- Verify production renders the auth screen and `/config` responds.
- Manually test recovery with `mikehilton.work@gmail.com` or another existing Supabase user.
- Confirm Supabase Auth URL Configuration includes `https://app.clearview.win`.

## Open Questions
- [ ] Should a future version add Google sign-in as a first-class button instead of requiring password setup?
- [ ] Should the app show a success state after password save before loading the workspace?

## Decisions Made
- 2026-06-08: Use Supabase password recovery instead of attempting to set passwords directly in Supabase dashboard/database.
- 2026-06-08: Keep email/password as the current app login path; OAuth UI can be specified separately later.

## Iteration History
- 2026-06-08: Password recovery and set-new-password flow shipped.
