# Google sign-in

## Goal
Allow DoorStep users to sign in with their existing Google email using Supabase Auth.

## Acceptance criteria
- Continue with Google available in sign-in and sign-up screens, not password reset.
- Uses Google provider, select_account prompt and explicit configured app URL.
- Google secret remains in Supabase provider settings; no new application secret or frontend client secret.
- Error/cancel returns visible feedback; pending submission prevents duplicate login starts.
- Existing password/recovery and workspace membership checks remain in place.
- Google account email must match existing CRM email to reuse that identity; no manual account merging.

## Configuration
Cloud project doorstepcrm-510401; External audience. Web origin https://app.clearview.win; callback https://vupriscnyrqmibmfowdx.supabase.co/auth/v1/callback. Google provider enabled in shared Supabase project; email settings unchanged. Test accounts mikehilton.work@gmail.com and mike@smartgrowth.consulting.

## Validation
Production build/typechecks/artifact guard; verify production button leads to Google account selection. Completed user sign-in is a separate manual acceptance step.

## Observed validation
2026-10-01: production Google login completed into existing DoorStep Workspace for mikehilton.work@gmail.com. Build/typechecks/artifact checks passed. External Testing audience currently limited to the two test accounts.
