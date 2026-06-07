# DoorStep CRM - App.tsx Architecture Breakdown

> File: `src/App.tsx` - approximately 5,937 lines
>
> Purpose: Map the current monolithic frontend, identify extraction targets, and define the next architecture direction for DoorStep CRM as a multi-user, object-oriented CRM platform.

---

## Strategic Direction

DoorStep CRM should not be modeled as a lead-first app. The long-term product goal is an object-oriented CRM where different business objects can become the primary operating unit.

For this build, the primary object is the address.

An address can represent a house, business location, account location, service location, canvassing stop, or future business object anchor. Contacts belong to, relate to, or communicate on behalf of an address, but the address remains the stable CRM record. In future versions, the same platform should be able to support other primary objects such as vehicles, deals, accounts, assets, or any custom object type.

Current language should gradually move from:

| Current term | Platform direction |
|---|---|
| Property | Address record |
| Lead | Record / address in pipeline |
| Prospect | Address filtered by stage, status, or route eligibility |
| Customer | Address with customer stage, sale, subscription, or active relationship |
| Tags | Labels scoped to object types |

The refactor should therefore be more than a file split. It should move the app from UI-shaped state to domain-shaped state.

---

## Current Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite 6 |
| Styling | Tailwind CSS v4 |
| Animation | Motion / Framer Motion |
| Maps primary | Leaflet / react-lelet |
| Maps fallback or optional provider | Google Maps via `@vis.gl/react-google-maps` |
| Geocoding | Nominatim / OSM plus Google Places API |
| Icons | lucide-react |
| AI | `@google/genai` in package, not yet wired into `App.tsx` |
| State | `useState` / `useEffect`, no external state manager |
| Persistence | `localStorage` |
| IDs | `uuid` v4 |

---

## Current App Chunk Map

### Chunk 1 - Utility Functions And Constants

Lines: approximately 1-170

Extract to:

- `src/lib/utils.ts`
- `src/lib/geo.ts`
- `src/domain/stages.ts`

Contains:

- `normalizeAddress(addr)`
- `STAGE_ORDER`
- `STAGE_COLORS`

Notes:

- `normalizeAddress` is already core business logic because deduplication depends on it.
- `PropertyStatus` and `PropertyStage` need to remain separate concepts. Status is a visit/outreach state. Stage is a pipeline/customer lifecycle state.
- Naming should be cleaned up before more code depends on the current color maps.

### Chunk 2 - Google Map Helper Components

Lines: approximately 175-285

Extract to:

- `src/components/map/google/GoogleMapHelpers.tsx`

Contains:

- `MapController`
- `MapEvents`
- `LocationMarker`
- `OptimizedRoute`

Notes:

- `OptimizedRoute` depends on the Google Maps routes library and the `APIProvider` context.
- These components only run when a valid Google Maps API key is present.
- Decide whether Google Maps is a true provider option or only used for specific capabilities such as Directions.

### Chunk 3 - Leaflet Map Helper Components

Lines: approximately 286-344

Extract to:

- `src/components/map/leaflet/LeafletHelpers.tsx`

Contains:

- `LeafletMapController`
- `LeafletMapEvents`
- `createLeafletMarkerIcon()`

Notes:

- `createLeafletMarkerIcon()` is a pure function and can be tested.
- Leaflet appears to be the current real workhorse because it works without a paid API key.

### Chunk 4 - Shared UI Primitives

Lines: approximately 345-665

Extract to:

- `src/components/ui/StatusBadge.tsx`
- `src/components/ui/PromptModal.tsx`
- later: dedicated modal/form components

Contains:

- `StatusBadge`
- `PromptModal`

Notes:

- `PromptModal` is overloaded. It handles confirmation, text input, select flows, chained setup flows, and address autocomplete.
- Address autocomplete should move into an `AddAddressModal` or `AddressLookupField`.
- Chained prompt flows should become proper forms or small wizards.

### Chunk 5 - Main App State And Initialization

Lines: approximately 669-940

Extract to:

- `src/state/useAppState.ts`
- `src/hooks/useMapInit.ts`
- later: API-backed stores or query hooks

Contains:

- All major `useState` declarations
- localStorage persistence effects
- map initialization priority chain

Notes:

- The app has 28+ top-level state variables.
- localStorage rewrites whole arrays on state changes. This is acceptable for a prototype but not for multi-user CRM data.
- Settings migration should be moved into an explicit migration function.
- This layer should eventually be replaced by API-backed persistence, server-side authorization, and event logging.

Current localStorage keys:

- `doorstep_crm_data`
- `doorstep_crm_catalog`
- `doorstep_crm_settings`
- `doorstep_crm_team`
- `doorstep_crm_goals`
- `doorstep_crm_routes`
- `doorstep_crm_map_state`
- `doorstep_crm_google_tokens`

### Chunk 6 - Address Search

Lines: approximately 940-1030

Extract to:

- `src/hooks/useAddressSearch.ts`
- `src/services/geocoding.ts`

Contains:

- Debounced search
- Google Places or Nominatim provider selection
- search suggestions and loading state

Notes:

- Geocoding appears in at least three places: search bar, prompt modal, and map click handling.
- A single geocoding service should own provider selection, rate limiting, normalization, result scoring, and error handling.

### Chunk 7 - Core Address Handlers And Business Logic

Lines: approximately 1100-1620

Extract to:

- `src/domain/addressActions.ts`
- `src/domain/routing.ts`
- `src/domain/pricing.ts`
- `src/domain/appointments.ts`

Contains:

- `handleDeleteProperty`
- `handleSuggestionSelect`
- `updateProperty`
- quote helpers
- `handleMapClick`
- stats memo
- dedupe memo
- `scheduleAppointment`
- `connectGoogle`
- `smartSortPropertyIds`

Notes:

- `handleMapClick` mixes selection mode, proximity lookup, reverse geocoding, record creation, and stage promotion.
- `smartSortPropertyIds` is valuable domain logic. Keep it pure and pass `userLocation` explicitly.
- Quote totals should be calculated by a single canonical pricing function.
- Google Calendar is currently stubbed or mocked.
- Stripe payments, SMS sending, and email sending are not yet built.

### Chunk 8 - Map View JSX

Lines: approximately 1621-2274

Extract to:

- `src/components/map/MapView.tsx`
- `src/components/map/PropertyMarker.tsx`
- `src/components/map/MapControls.tsx`
- `src/components/map/MapLegend.tsx`

Contains:

- Google/Leaflet conditional map render
- stats or active route header
- search UI
- markers
- route polylines
- locate/satellite/route controls
- route save button
- legend
- rapid mode indicator

Notes:

- Inline marker handlers should become named event handlers.
- Google and Leaflet duplicate marker behavior. A provider abstraction would help if both providers stay.

### Chunk 9 - Bottom Navigation Bar

Lines: approximately 2275-2533

Extract to:

- `src/components/layout/BottomNav.tsx`
- `src/components/layout/MoreMenu.tsx`

Contains:

- Dashboard, Map, Prospects, Records/Leads, More
- Team, Overdue Invoices, Admin Console submenu

Notes:

- Active state is inferred from many booleans.
- A single `currentView` or `activeOverlay` state should drive navigation before the component tree gets deeper.

### Chunk 10 - Overlay Orchestration

Lines: approximately 2534-2732

Extract to:

- `src/components/layout/OverlayManager.tsx`
- or replace with a router

Contains:

- Conditional rendering for all overlays and modal surfaces.

Notes:

- This section behaves like a manual router.
- Several overlays receive many props, including raw setters.
- Move toward event callbacks first, then route or store backed navigation.

### Chunk 11 - Add New Lead Helper

Lines: approximately 2736-2787

Extract to:

- `src/domain/addressActions.ts`
- or `src/features/addresses/useAddressActions.ts`

Contains:

- A standalone function that configures `PromptModal` for adding a lead/address.

Notes:

- This should become an address creation action.
- It should eventually create an address record through the API and emit an activity event.

### Chunk 12 - Property Drawer

Lines: approximately 2789-3326

Extract to:

- `src/components/address/AddressDrawer.tsx`
- `src/components/address/AddressHeader.tsx`
- `src/components/address/StageSelector.tsx`
- `src/components/contacts/ContactSection.tsx`
- `src/components/activity/ActivityFeed.tsx`

Contains:

- Selected address panel
- residential/commercial toggle
- stage and status selectors
- address-level tags
- primary contact fields
- additional contacts
- business name
- notes
- scheduling, quote, and sale actions
- interaction history
- appointments

Notes:

- This is the CRM core surface.
- Contact editing should not live forever as fields embedded inside the address record.
- Contacts should be their own domain records with address relationships, primary-contact flags, and contact-level labels.

### Chunk 13 - Route Detail Overlay

Lines: approximately 3328-3458

Extract to:

- `src/components/routes/RouteDetailOverlay.tsx`

Contains:

- route property list
- route progress stats
- start/finish/completed actions
- add more houses
- remove route stops

Notes:

- Clean and suitable for early extraction.

### Chunk 14 - Prospects Overlay

Lines: approximately 3460-3720

Extract to:

- `src/components/routes/ProspectsOverlay.tsx`

Contains:

- Prospects and Routes tabs
- route planning
- smart sort
- route assignment

Notes:

- Receives approximately 18 props.
- Should emit higher-level events such as `onStartRouteBuild`, `onFocusAddress`, and `onAssignRoute`.
- Do not keep passing raw setters through this component.

### Chunk 15 - Leads Overlay

Lines: approximately 3720-4078

Extract to:

- `src/components/records/RecordsOverlay.tsx`
- or `src/components/addresses/AddressRecordsOverlay.tsx`

Contains:

- record search
- stage filters
- address list
- delete confirmation
- focus-on-map action

Notes:

- The distinction between Leads and Prospects should be made explicit.
- In the platform model, this is a filtered record list for the `address` object type.

### Chunk 16 - Confirm Delete Modal

Lines: approximately 4080-4117

Extract to:

- `src/components/ui/ConfirmDeleteModal.tsx`

Notes:

- Good early extraction candidate.

### Chunk 17 - Catalog Overlay

Lines: approximately 4119-4600

Extract to:

- `src/components/catalog/CatalogOverlay.tsx`
- `src/domain/pricing.ts`

Contains:

- products CRUD
- bundles CRUD
- bundle price calculation

Notes:

- Bundle pricing should move to pure domain logic.
- Catalog data belongs to the workspace in the multi-user model.

### Chunk 18 - Settings Overlay

Lines: approximately 4600-5090

Extract to:

- `src/components/settings/SettingsOverlay.tsx`
- `src/components/settings/BusinessSettings.tsx`
- `src/components/settings/LabelsSettings.tsx`
- `src/components/settings/ContactFieldsSettings.tsx`
- `src/components/settings/PlatformApiSettings.tsx`

Contains:

- business settings
- tags
- goals
- contact fields
- discounts
- label renaming
- team management

Notes:

- Settings will split into workspace settings and platform/admin settings.
- Custom field and discount creation should become real forms.
- Platform API exposure controls belong here, but probably in an admin-only platform section.

### Chunk 19 - Quote Overlay

Lines: approximately 5090-5795

Extract to:

- `src/components/quotes/QuoteOverlay.tsx`
- `src/domain/pricing.ts`

Contains:

- product/bundle selector
- line items
- include/exclude toggles
- discounts
- notes
- save and send draft action

Notes:

- "Send" is not currently implemented.
- Sending should create a message draft or delivery job, not directly call SMS/email from the UI.
- Quotes should relate to address records and optionally contacts.

### Chunk 20 - Sale Overlay

Lines: within approximately 5090-5795

Extract to:

- `src/components/sales/SaleOverlay.tsx`

Contains:

- record sale form
- amount/product/quote link
- marks address as customer

Notes:

- Stripe payment collection is not currently built.
- A future payment flow should create a server-side payment intent and record payment state through webhooks.

### Chunk 21 - Team Overlay

Lines: within approximately 5090-5795

Extract to:

- `src/components/team/TeamOverlay.tsx`

Contains:

- team list
- goals
- performance summary

Notes:

- Multi-user support requires workspace membership, roles, permissions, assignment, audit attribution, and team-level visibility.

### Chunk 22 - Calendar Overlay

Lines: approximately 5797-5936

Extract to:

- `src/components/calendar/CalendarOverlay.tsx`

Contains:

- schedule visit
- assign to team member
- date/time/duration fields
- appointment creation

Notes:

- Google Calendar integration is stubbed or mocked.
- Random team assignment is not true round-robin.
- Appointments should be domain records tied to addresses, contacts, users, and activity events.

---

## Proposed Frontend File Structure

```txt
src/
  App.tsx
  types.ts
  domain/
    addresses.ts
    contacts.ts
    stages.ts
    labels.ts
    routing.ts
    pricing.ts
    automation.ts
    apiRegistry.ts
  services/
    geocoding.ts
    integrations.ts
    messaging.ts
    payments.ts
  hooks/
    useAppState.ts
    useMapInit.ts
    useAddressSearch.ts
    useAddressActions.ts
  components/
    ui/
      StatusBadge.tsx
      ConfirmDeleteModal.tsx
      PromptModal.tsx
    layout/
      BottomNav.tsx
      MoreMenu.tsx
      OverlayManager.tsx
    map/
      MapView.tsx
      PropertyMarker.tsx
      MapControls.tsx
      MapLegend.tsx
      google/
        GoogleMapHelpers.tsx
      leaflet/
        LeafletHelpers.tsx
    addresses/
      AddressDrawer.tsx
      AddressHeader.tsx
      AddressRecordsOverlay.tsx
      StageSelector.tsx
    contacts/
      ContactSection.tsx
      ContactLabels.tsx
    activity/
      ActivityFeed.tsx
    routes/
      ProspectsOverlay.tsx
      RouteDetailOverlay.tsx
    catalog/
      CatalogOverlay.tsx
    quotes/
      QuoteOverlay.tsx
    sales/
      SaleOverlay.tsx
    calendar/
      CalendarOverlay.tsx
    team/
      TeamOverlay.tsx
    settings/
      SettingsOverlay.tsx
      BusinessSettings.tsx
      ContactFieldsSettings.tsx
      LabelsSettings.tsx
      PlatformApiSettings.tsx
      AutomationSettings.tsx
      IntegrationSettings.tsx
```

---

## Platform Domain Model

The future backend should be multi-user and workspace-first.

Core concepts:

- Organization / workspace
- Users
- Teams
- Roles and permissions
- Object types
- Records
- Relationships
- Labels
- Activities
- Automations
- Integrations
- API registry
- Audit log

Suggested starting model:

```txt
workspaces
users
workspace_members
teams
team_members

object_types
records
addresses
contacts
record_contacts

labels
record_labels

activities
appointments
routes
route_stops

products
bundles
quotes
quote_line_items
sales
payments

messages
message_recipients

custom_fields
custom_field_values

automation_rules
automation_runs
automation_run_logs

integrations
api_endpoints
api_keys
webhook_subscriptions
audit_events
```

### Address As The First Primary Object

The concrete first-class record for this product is the address.

An address record should own:

- normalized address identity
- display address
- lat/lng
- residential/commercial classification
- stage
- status
- owner/assignee
- team assignment
- labels
- route membership
- related contacts
- related activities
- related quotes, sales, appointments, messages, and payments

### Contacts As Related Records

Contacts should not remain embedded fields forever.

A contact should support:

- first name
- last name
- phone
- email
- role/title
- decision-maker flag
- preferred communication channel
- do-not-contact flags
- labels
- relationships to one or more records
- primary contact flag per relationship

This allows one contact to relate to multiple addresses or future objects.

---

## Labels And Tags

Labels should be generic platform records, scoped by workspace and object type.

Examples:

- Address labels: `no soliciting`, `gate code`, `hoa`, `corner lot`, `high priority`
- Contact labels: `decision maker`, `prefers text`, `spanish speaking`, `do not contact`
- Quote labels: `needs approval`, `discounted`, `financing`

Suggested model:

```txt
labels
  id
  workspace_id
  object_type
  name
  color
  description
  created_by
  created_at

record_labels
  id
  workspace_id
  label_id
  record_type
  record_id
  created_by
  created_at
```

Labels should support contacts independently from addresses.

---

## Automation Platform

Automation should be a first-class backend capability, not component-level logic.

Automation shape:

```txt
Trigger -> Conditions -> Actions
```

Examples:

- When an address stage changes to `interested`, create a follow-up task in 2 days.
- When a contact has `prefers text`, default outreach to SMS.
- When a quote is sent and no response occurs after 3 days, queue a follow-up.
- When a payment succeeds, mark the sale paid and append an activity event.
- When a route is assigned, notify the assigned rep.
- When a contact has `do not contact`, block SMS and email sending.

Suggested model:

```txt
automation_rules
  id
  workspace_id
  name
  enabled
  trigger_type
  conditions_json
  actions_json
  created_by

automation_runs
  id
  rule_id
  workspace_id
  status
  triggered_by_event_id
  started_at
  completed_at

automation_run_logs
  id
  run_id
  level
  message
  metadata_json
  created_at
```

Automation should run server-side so it can enforce permissions, integrate with third-party services, retry failures, and create audit logs.

---

## Integrations Roadmap

### Present But Stubbed

- Google Calendar / OAuth

### Not Yet Built

- Stripe payments
- SMS sending
- Email sending

These should be implemented as provider-backed services, not direct UI calls.

Recommended domain records:

```txt
messages
  id
  workspace_id
  channel
  direction
  status
  subject
  body
  related_record_type
  related_record_id
  contact_id
  sent_by_user_id
  provider
  provider_message_id

payments
  id
  workspace_id
  provider
  status
  amount
  currency
  quote_id
  sale_id
  related_record_type
  related_record_id
  provider_payment_intent_id
```

UI should request actions such as `createMessageDraft`, `sendMessage`, or `createPaymentIntent`. The server should handle provider credentials, webhooks, retries, and final state.

---

## API Governance Standard

All created APIs should be registered and exposed through a platform API settings page.

Every endpoint or endpoint group should be classified as:

- internal
- public
- partner
- disabled

Public should not mean unauthenticated. Public means externally documented and accessible with proper auth, scopes, rate limits, and audit logging.

Suggested model:

```txt
api_endpoints
  id
  name
  method
  path
  group_name
  visibility
  enabled
  auth_required
  required_scopes
  allowed_roles
  rate_limit_policy
  created_by
  created_at
  updated_at

api_keys
  id
  workspace_id
  name
  hashed_key
  scopes
  allowed_origins
  expires_at
  created_by
  last_used_at

webhook_subscriptions
  id
  workspace_id
  target_url
  event_types
  signing_secret_hash
  enabled
```

Platform API settings should support:

- enabling and disabling endpoints
- setting internal/public/partner visibility
- assigning auth scopes
- assigning allowed roles
- managing API keys
- managing webhook subscriptions
- viewing usage, failures, and audit events

---

## Refactor Execution Plan

### Phase 1 - Extract Pure Logic

Goal: Reduce risk without changing UI behavior.

Move and test:

- address normalization
- stage and status constants
- route sorting
- quote totals
- bundle pricing
- settings defaults and migrations

Acceptance:

- App behavior unchanged.
- Pure functions have focused tests.
- `App.tsx` loses business logic before losing UI chunks.

### Phase 2 - Unify Geocoding

Goal: One provider-neutral geocoding service.

Create:

- `src/services/geocoding.ts`
- `useAddressSearch`
- reusable address lookup field

Acceptance:

- Map search, add-address modal, and map-click reverse geocoding use one service.
- Provider selection is isolated.

### Phase 3 - Normalize Navigation State

Goal: Replace many overlay booleans with a single navigation model.

Create:

- `currentView`
- `activeOverlay`
- optional route-style state

Acceptance:

- Bottom nav active state is simple.
- Overlay manager no longer derives state from many booleans.

### Phase 4 - Split PromptModal

Goal: Replace chained prompts with real forms.

Create:

- `AddAddressModal`
- `ConfirmModal`
- `SelectModal`
- `CustomFieldForm`
- `DiscountForm`

Acceptance:

- No multi-step setup requires four sequential prompt modals.
- Address autocomplete is not inside the generic prompt component.

### Phase 5 - Extract Visual Components

Goal: Break the monolith after the domain and state model are cleaner.

Extract early:

- `ConfirmDeleteModal`
- `StatusBadge`
- `RouteDetailOverlay`
- `SaleOverlay`
- `CalendarOverlay`

Extract next:

- `AddressDrawer`
- `RecordsOverlay`
- `ProspectsOverlay`
- `SettingsOverlay`
- `MapView`

Acceptance:

- Components receive domain events instead of raw parent setters wherever practical.

### Phase 6 - Backend And Multi-User API

Goal: Move from local-first prototype to workspace-backed CRM.

Build:

- workspace membership
- auth and roles
- API-backed address records
- contact records and relationships
- labels
- activities
- audit events
- API registry

Acceptance:

- Every mutation is attributed to a user.
- Address/contact changes create activity or audit events where appropriate.
- localStorage is no longer the source of truth.

### Phase 7 - Automations And Integrations

Goal: Add provider-backed platform features.

Build:

- automation rules
- automation run logs
- integration registry
- Stripe payment intent flow
- SMS provider integration
- email provider integration
- Google Calendar OAuth

Acceptance:

- Third-party secrets live server-side.
- Provider webhooks update domain records.
- automation and integration events are auditable.

---

## Key Decisions To Make

1. Choose the map provider strategy: Leaflet-only, Google-only, or provider abstraction.
2. Confirm the primary domain language: address record, contact, record, route, quote, sale.
3. Decide when to introduce backend/API work relative to frontend cleanup.
4. Choose a state/query approach for API-backed data.
5. Define the first permission model: owner, admin, manager, rep.
6. Define contact label behavior and do-not-contact enforcement.
7. Define the API governance page as a platform/admin feature.

---

## Immediate Recommendation

Start with Phase 1 and Phase 2.

Do not begin by splitting every JSX block into files. First extract the pure business logic and geocoding layer. Then simplify navigation and modal flows. After that, component extraction will be much cleaner and will align with the future multi-user, object-oriented CRM architecture.
