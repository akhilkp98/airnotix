# Airnotix prototype to React migration

This document maps the HTML prototype onto the existing React application so operational features can be added without replacing the shell.

It records behavior that already exists in code. It does not add aviation regulations, sample records, or calculations. Rules below are the prototype’s demonstration rules. The PRD still requires domain-expert validation before any of them are treated as academy policy.

Status labels used here:

- **Implemented** — present and wired in `apps/web`.
- **Prototype only** — present in the HTML prototype, not in the React app.
- **Proposed** — a later implementation step. Not started.

No application source was changed while the map in sections 1–10 was written. Sections 11–18 record Stages 1–8. Section 19 records the dropdown standardization. Section 20 records the layout refinement. A backend is still later work.

## 1. What exists today

### React application (`apps/web`)

Implemented and to be kept:

- Vite, React, TypeScript, MUI theme, Lucide icons.
- Staff shell and cadet portal shell, sidebar, top bar, academy context, account menu.
- React Router table, `RequireAuth`, `RequirePermission`.
- Nine roles and `ROLE_PERMISSIONS` in `src/domain/permissions.ts`.
- Demo sign-in, role switcher, sign-out confirmation, snackbar.
- `WorkspaceRepository` with `getAcademy()` and `listDemoUsers()`, TanStack Query keys `academy` and `demo-users`.
- Academy Settings and Users & Roles. Stage 7 records the supported edits.
- Shared `PageHeader`, `KpiCard`, `StatusChip`, `EmptyState`, `RecordGrid`, and `AppSelect`.

Not implemented in React. These routes render `ModulePlaceholder` or `ReservedRecord` in `src/app/router.tsx`:

- Dashboard figures (the academy name loads; the four KPI values are the literal `—`).
- Cadets, training, flights, fleet, maintenance, fuel, finance, staff profiles, documents, approvals, reports, audit, and the five portal pages.

That list is the map as first written. Sections 11–18 record the screens that have since been connected. The cadet portal is recorded in section 18.

React persistence is only:

- `localStorage` key `airnotix-web-session-v1` — signed-in user id.
- `localStorage` key `airnotix-web-email` — remembered email.
- `sessionStorage` key `airnotix-web-sidebar` — collapsed sidebar.

React demo users do not include `staffId` or `cadetId`. The React academy profile does not include `branchId` or `tagline`.

### HTML prototype (reference only)

Do not modify or delete these files. They are the behavior source for the first slices.

| Area | Files |
| --- | --- |
| Seed and permissions | `src/js/data/seed.js` |
| Mutations, audit, notifications | `src/js/data/store.js` |
| Calculations and schedule checks | `src/js/data/derive.js` |
| Cadets and training UI | `src/js/modules/screen-people.js` |
| Flights UI | `src/js/modules/screen-flights.js` |
| Dashboard, fleet, maintenance, fuel, finance, staff, documents, approvals, reports, settings, users, audit, portal | `src/js/modules/screen-ops.js` |
| Page routing | `src/js/modules/screens.js`, `scripts/render-pages.js`, `src/pages/*.html` |

Prototype persistence is one blob: `localStorage` key `airnotix-demo-v1`, `seedVersion` 1. Password `demonstration` is not stored. Reset restores the seed and keeps the signed-in user when that user still exists.

The two storage keys are different. Connecting React to academy records must not read or write `airnotix-demo-v1`, or the HTML prototype’s saved session will change.

Demo day used by the prototype calculations is `2026-09-29` (`DEMO_TODAY`). Time zone on the academy record is `Asia/Kolkata`. Currency is INR.

## 2. Mismatches

| Topic | Prototype | React app |
| --- | --- | --- |
| Operational records | Full Northstar seed | Academy profile and nine login users only |
| User links | `staffId` on staff logins, `cadetId` on Aarav | Omitted from `DemoUser` |
| Dashboard numbers | Derived from records | Hardcoded `—` and “Not connected” |
| Settings | Name, currency, and time zone can be saved | Read-only |
| Users | List plus add-user | Read-only list of the nine accounts |
| Cadet and flight URLs | Query parameters on one HTML page | Separate routes already reserved |
| Training sub-views | Courses, syllabus, progress, ground, assessments on one page | Three routes. No ground or assessments route |
| Instructor scope | UI filters cadets and completion to `staffId` | No `staffId`, so this filter cannot run yet |
| Cadet portal scope | Only that cadet’s approved and completed flights | Placeholder. No cadet link on the user |
| Permissions | Same map, copied into React | Route guards exist. Most permissions have no action behind them |
| Search | Searches cadets, flights, and aircraft when permitted | Snackbar only |
| Notifications | Stored records, role or user audience | One static sentence |

## 3. Feature map

### 3.1 Demo sign-in and roles

**Status: Implemented** in React. Prototype sign-in remains a separate copy.

| | |
| --- | --- |
| Prototype | `store.signIn`, `setActiveUser`, `signOut`, `resetDemo`. Pages `sign-in.html`. |
| React | `src/features/auth/AuthProvider.tsx`, `LoginPage.tsx`, `RequireAuth.tsx`, `RequirePermission.tsx`, `AccessDenied.tsx`. |
| Data | Nine users. Password constant `demonstration`. |
| React model already | `RoleId`, `Permission`, `DemoUser`. |
| Proposed model change | Add optional `staffId` and `cadetId` onto the existing user type when fixtures are ported. Do not replace the role map. |
| Repository today | `listDemoUsers()`. Sign-in does not go through the repository. It reads `DEMO_USERS` directly. |
| Proposed | Keep sign-in as it is. Fixtures must use the same ids and emails. |
| Permissions | Already enforced for navigation. |
| Missing actions | Prototype reset-demo. Not required for the first slice. |
| Assumption | Frontend checks remain a prototype convenience. They are not access control. |

### 3.2 Academy profile

**Status: Implemented. Stage 7 saves name, currency, and time zone.** See section 17. Branch, country, and mode stay as stored.

| | |
| --- | --- |
| Prototype | `academy` on the seed. `saveAcademySettings` updates name, currency, and time zone. |
| React | `SettingsPage.tsx` via `getAcademy()`. Route `/settings`, permission `settings.manage`. |
| Fields in React | `name`, `branchName`, `country`, `currency`, `timeZone`, `mode`. |
| Fields only in the prototype | `branchId`, `tagline`. |
| Proposed | Extend the existing `AcademyProfile` when settings editing is in scope. Do not replace the current page in the first slice. |

### 3.3 Dashboard

**Status: Four cards are connected. See sections 14 and 15.** Outstanding fees and the monthly hours chart are not on this page.

| | |
| --- | --- |
| Prototype | `renderDashboard` in `screen-ops.js`. KPIs call `activeCadets`, `flightsOnDate`, `recorded` completed hours for the month, available aircraft, `pendingApprovals`, and fee outstanding. Chart uses planned versus completed flights. |
| React | `/dashboard`, `DashboardPage.tsx`, permission `dashboard.view`. Active cadets, flights today, aircraft available, and pending approvals come from `dashboardSummary` when that summary is operational. |
| Proposed repository reads | `dashboardSummary()` returning counts derived with the prototype functions, not new formulas. |
| Permissions | `dashboard.view`. Super Admin has this permission and does not have cadet or flight view. When `dashboardSummary.operational` is false, cadet, flight, and approval cards stay blank. A role with `fleet.view` still sees the Available aircraft count. See section 15. |
| Dependencies | Cadets, flights, aircraft, fee plans, payments. |
| Assumption | “Flights today” uses `DEMO_TODAY`, not the computer clock. Confirm before switching the dashboard to the real date. |

### 3.4 Cadets

**Status: Implemented in React. See section 12. The notes below describe the prototype rules that section follows.**

| | |
| --- | --- |
| Prototype files | `seed.js` cadets. `store.saveCadet`, `setCadetStatus`. `screen-people.js` `renderCadets`. |
| React routes | `/cadets` (`cadets.view`), `/cadets/new` (`cadets.create`), `/cadets/:cadetId` (`cadets.view`). Components are listed in section 12. |
| Record fields | `id`, `code`, `firstName`, `lastName`, `email`, `phone`, `dob`, `courseId`, `syllabusId`, `batch`, `joiningDate`, `status`, `openingHours`, `completedRequired`, `instructorId`, `feeDueDate`, `completedItemIds`. |
| Status values in the seed | `Active`, `On Hold`, `Completed`. |
| Rules already in `saveCadet` | First name, last name, course, and joining date are required. Email may be blank. If present it must contain `@` and a dot. New code is `NFA-2026-` plus the next three-digit number. New status is `Active`. `openingHours` and `completedRequired` start at 0. `syllabusId` is copied from the course’s current `syllabusId`. Default instructor is `staff-arun` if none is chosen. New `feeDueDate` is the literal `2026-11-15` inside `saveCadet`. |
| Status change | `setCadetStatus` requires a non-empty reason and writes an audit event. |
| Instructor scope | `visibleCadets` shows only cadets whose `instructorId` equals the signed-in user’s `staffId`. Opening another cadet’s profile shows a denial in the prototype UI. This is not a separate permission. |
| Profile tabs in the prototype | Overview, training, flights, documents, fees if `finance.view`, activity. |
| Proposed models | `Cadet`, `CadetInput`, `CadetStatus`. |
| Proposed repository methods | `listCadets`, `getCadet`, `saveCadet`, `setCadetStatus`. List method accepts the current user so the instructor filter can live in one place. |
| Permissions | View, create, update. Status change uses update in the prototype UI. |
| Missing UI | List, filters, create and edit forms, profile tabs, status dialog. |
| Dependencies | Courses for enrolment. Staff list for the instructor field. Fees and documents are later slices. The profile can show flights once flights exist. |
| Unverified | Whether a new cadet’s fee due date should stay `2026-11-15` or be left empty. The prototype hardcodes that date. Do not invent another rule. |

Seed cadets to preserve exactly: NFA-2026-001 through NFA-2026-008, with the `openingHours`, `completedRequired`, `instructorId`, and `feeDueDate` values in `createSeed()`.

### 3.5 Training courses, syllabus, and progress

**Status: Implemented in React. See section 13. The notes below describe the prototype rules that section follows.**

| | |
| --- | --- |
| Prototype files | `seed.js` courses, syllabi, phases. `store.addSyllabusPhase`, `addSyllabusItem`, `moveSyllabusItem`, `publishSyllabus`, `saveAssessment`. `derive.progressPercent`, `itemName`. `screen-people.js` `renderTraining`. |
| React routes | `/training/courses`, `/training/syllabus`, `/training/progress`, all `training.view`. Assessments stay on `/training/progress`. No separate ground route. |
| Course fields | `id`, `code`, `name`, `type`, `status`, `requiredCount`, `syllabusId`. Seed courses: `CPL-ILL` and `PPL-ILL`, each `requiredCount` 100. Codes are marked illustrative in the seed. |
| Syllabus fields | `id`, `courseId`, `label`, `status` (`Draft`, `Published`, and `Archived` after a later publish), `phases[]`. Phase: `id`, `name`, `items[]`. Item: `id`, `name`, `type`, `required`. |
| Seed syllabi | `syl-cpl-1` published, `syl-cpl-draft` empty draft, `syl-ppl-1` published. Phase names for CPL: Ground Knowledge, Basic Flight Training, Navigation Exercises, Advanced Exercises, Progress Checks. PPL: Ground Knowledge, Basic Flight Training, Progress Checks. |
| Progress rule | `progressPercent` is `round(completedRequired / course.requiredCount * 100)`. It does not count named syllabus items. The seed stores `completedRequired` so the displayed percent matches the prototype table. `completedItemIds` starts empty even when `completedRequired` is already 36, 52, and so on. |
| Assessment rule | Outcome, cadet, and item are required. Outcomes used by the form: Satisfactory, Further Training Required, Not Assessed. The first Satisfactory for an item appends that item id and adds 1 to `completedRequired`, capped at `requiredCount`. The prototype copy says this does not certify competence. |
| Publish rule | Only a non-empty draft can be published. Other published syllabi for that course become `Archived`. `course.syllabusId` points at the new version. Existing cadet `syllabusId` values are not rewritten. |
| Draft edit rule | Phases, items, and reordering are refused when status is `Published`. |
| Proposed models | `Course`, `Syllabus`, `SyllabusPhase`, `SyllabusItem`, `Assessment`. |
| Proposed repository methods | `listCourses`, `listSyllabi`, `addSyllabusPhase`, `addSyllabusItem`, `moveSyllabusItem`, `publishSyllabus`, `saveAssessment`. |
| Permissions | `training.view` to read. `training.configure` to edit and publish. `training.assess` to record an assessment. |
| Missing UI | None of the three React routes are still placeholders. Ground lessons have no separate route; they are listed on the syllabus page. |
| Dependencies | Cadets hold `courseId`, `syllabusId`, `completedRequired`, and `completedItemIds`. Flight completion can also increment progress. |
| Unverified | `requiredCount` of 100 is a demo weight. It is not a count of the named items in the seed. Do not recompute the seed percents from the item list. |

### 3.6 Flights: schedule, approval, conflicts, completion

**Status: Implemented in React. See section 14. The notes below describe the prototype rules that section follows.**

| | |
| --- | --- |
| Prototype files | `seed.js` flights. `derive.schedulingIssues`, `blockers`, `rangesOverlap`, `weekDates`. `store.saveFlight`, `decideFlight`, `cancelFlight`, `completeFlight`, `correctFlight`. `screen-flights.js`. Approvals page buttons call `decide-flight`. |
| React routes | `/flight-operations` (`flights.view`), `/flight-operations/new` (`flights.create`), `/flight-operations/:flightId` (`flights.view`). |
| Flight fields | `id`, `reference`, `date`, `start`, `end`, `cadetId`, `itemId`, `instructorId`, `aircraftId`, `flightType`, `status`, `notes`, `submittedBy`, `approval`, `actual`. |
| Status values in the seed and store | `Draft`, `Awaiting approval`, `Approved`, `Rejected`, `Completed`, `Cancelled`. |
| Seed flights | FLT-2409 completed 1.4 h. FLT-2401, 2402, 2404, 2406 approved. FLT-2403 awaiting approval. FLT-2405 draft overlapping FLT-2404. FLT-2407 draft on Farhan’s leave and restricted NFA-DA42-01. FLT-2410 cancelled. |
| Schedule check | Required: date, start, end, cadet, instructor, aircraft. Start must be before end. Overlap of cadet, instructor, or aircraft with another flight the same day is a blocker, excluding `Cancelled` and `Rejected`. An availability block that overlaps is a blocker. Aircraft status other than `Available` is a blocker. An `Available` aircraft whose restriction covers the date is also a blocker. A qualification `expires` before the flight date is a warning only. |
| Draft versus submit | `saveFlight` allows a draft to be stored while blockers exist. `submit` is refused while any blocker remains. Nothing assigns a different aircraft or instructor. |
| Edit | Only `Draft` or `Rejected` can be edited. Completed flights use `correctFlight`. |
| Decision | Only `Awaiting approval`. Comment required. Approve is refused while blockers remain. Reject does not require the blockers to be clear. Approval notifies the cadet user linked by `cadetId`, and operations. |
| Cancel | Refused for `Completed` and `Cancelled`. Reason required. |
| Complete | Only `Approved`. Instructor role may complete only when `user.staffId === flight.instructorId`. Actual start, end, hours greater than 0, and outcome are required. First Satisfactory on `itemId` increments `completedRequired` the same way as an assessment. |
| Correction | Completed flights only. New hours greater than 0 and a reason. This changes `actual.hours` only. It does not reverse progress. |
| Week | `weekDates` uses local calendar dates. Monday is the first day. The week contains `DEMO_TODAY`. |
| Proposed models | `Flight`, `FlightInput`, `FlightActual`, `ScheduleIssue`. |
| Proposed repository methods | `listFlights`, `getFlight`, `schedulingIssues`, `saveFlightDraft`, `submitFlight`, `decideFlight`, `cancelFlight`, `completeFlight`, `correctFlight`. |
| Permissions | View, create, update, submit, approve, complete. The prototype gates buttons with these permissions. The instructor assignment check is additional and is not a permission string. |
| Missing UI | Approve and reject stay on the flight detail and use `decideFlight`. The approvals queue in section 16 calls the same method. Fleet and maintenance are in section 15. |
| Dependencies | Cadets, staff, aircraft status and restrictions, availability, syllabus item ids. |
| Unverified | Flight reference generation uses `2400 + random` in `flightFrom`. Port the seed references exactly. Do not invent a new numbering scheme in the first slice. New ids can stay unique without claiming an operational sequence. |

### 3.7 Aircraft and maintenance

**Status: Implemented in section 15.** Flight checks already read aircraft status. Fleet and maintenance screens now use the same repository.

| | |
| --- | --- |
| Prototype | `setAircraftStatus`, `addDefect`, `updateWorkOrder`, `recordRelease`. `screen-ops.js` `renderFleet`, `renderMaintenance`. |
| React | `/fleet`, `/fleet/:aircraftId` (`fleet.view`). `/maintenance` (`maintenance.view`). |
| Aircraft fields | `id`, `code`, `type`, `base`, `status`, `openingHours`, `nextMaintenanceHours`, `restriction`. Status values in the seed: `Available`, `Maintenance`, `Restricted`. |
| Defect | Opens a work order in the same mutation. |
| Release | Sets work order status to `Release recorded` and stores a note. Audit text says this is not a serviceability decision. It does not set aircraft status back to `Available`. |
| Hours | `recordedAircraftHours` is `openingHours` plus completed flight `actual.hours`. |
| Permissions | `fleet.view`, `fleet.manage`, `maintenance.view`, `maintenance.record`, `maintenance.release_record`. Academy Administrator does not have `maintenance.release_record`. |
| Proposed methods, later | `listAircraft`, `getAircraft`, `setAircraftStatus`, `listDefects`, `addDefect`, `updateWorkOrder`, `recordRelease`. |
| First-slice need | Read-only aircraft list inside the flight repository so conflict checks can see status and restrictions. Full maintenance screens stay later. |

### 3.8 Staff and availability

**Status: Implemented in section 15.** Flight checks already read availability and qualifications. Staff screens now write availability through the same repository.

| | |
| --- | --- |
| Prototype | `addAvailability`. Staff seed includes nine people. Leela Krishnan and Farhan Iqbal are staff without their own login. Farhan’s qualification expires `2026-09-20`. Leave block `avl-1` is 2026-10-01 13:00–18:00. |
| React | `/hr`, `/hr/:staffId` (`staff.view`). |
| Permissions | `staff.view`, `staff.manage`. |
| Proposed methods, later | `listStaff`, `getStaff`, `addAvailability`. |
| First-slice need | Read staff and availability for the flight form and `schedulingIssues`. |

### 3.9 Fuel

**Status: Implemented in section 15.** `addFuelTransaction` and `fuelBalance` were already in the Stage 1 store. The fuel screen now calls them.

| | |
| --- | --- |
| Prototype | `fuelBalance`, `addFuelTransaction`. Tanks Avgas and Jet A-1. |
| React | `/fuel` (`fuel.view`). |
| Rule | Receipt adds. Issue subtracts. Any other type, including Adjustment, adds the signed quantity. An issue greater than the calculated balance is refused. An adjustment requires a reason. Quantity for receipt and issue must be greater than zero. |
| Seed balances | Avgas 6000 − 900 − 400 = 4700, threshold 2000. Jet A-1 3000 − 1200 = 1800, threshold 2500. |
| Permissions | `fuel.view`, `fuel.manage`. |
| Proposed methods | `listTanks`, `listFuelTransactions`, `fuelBalance`, `addFuelTransaction`. |

### 3.10 Finance

**Status: Implemented in Stage 6.** See section 16. The formulas below were not changed. Cadet profiles show the fee tab when `finance.view` is present, and record a payment there when `finance.manage` is present.

| | |
| --- | --- |
| Prototype | `feeAccount`, `addPayment`, `addExpense`. |
| React | `/finance` (`finance.view`). |
| Rule | Outstanding is the course fee-plan total minus that cadet’s payments. Overdue when outstanding is greater than 0 and `feeDueDate` is before `DEMO_TODAY`. There is no tax, discount, or credit-note rule in the prototype. |
| Seed plans | CPL 1,850,000. PPL 650,000. Both named illustrative. |
| Permissions | `finance.view`, `finance.manage`, `finance.adjust`. `finance.adjust` has no separate mutation in `store.js`. |
| Proposed methods | `listFeePlans`, `feeAccount`, `addPayment`, `listExpenses`, `addExpense`. |
| Unverified | `finance.adjust` is in the permission map and unused by the store. Do not invent an adjustment action. |

### 3.11 Documents, approvals, reports, audit, portal

**Status: Documents and the approvals queue are in Stage 6. Reports and audit are in Stage 7. The cadet portal is in Stage 8.** See sections 16–18.

| Module | Prototype behavior to preserve later | React route | Permission |
| --- | --- | --- | --- |
| Documents | Review sets `review` to the given value. No file upload or file bytes. | `/documents` | `documents.view`, `documents.manage`, `documents.review` |
| Approvals | Queue of flights `Awaiting approval`. Uses `decideFlight`. | `/approvals` | `approvals.view` |
| Reports | Tables from the same derived figures. CSV download if `reports.export`. | `/reports` | `reports.view`, `reports.export` |
| Audit | Append-only events from `remember`. | `/audit` | `audit.view` |
| Portal home | Linked cadet only. Progress, hours, next approved flight on or after `DEMO_TODAY`. | `/portal` | `portal.view` |
| Portal schedule | That cadet’s `Approved` and `Completed` flights. Drafts and other cadets are excluded. | `/portal/schedule` | `portal.view` |
| Portal training | That cadet’s syllabus. Item marked recorded only if `completedItemIds` contains it. | `/portal/training` | `portal.view` |
| Portal notifications | Notifications whose `userId` is the cadet user. | `/portal/notifications` | `portal.view` |
| Portal profile | Name, email, phone, batch, joining date. | `/portal/profile` | `portal.view` |

Notifications are role-audience or user-specific. Mark-read exists in the store. The React header reads them through `listNotifications`. `/portal/notifications` is still a placeholder.

## 4. Proposed typed models

Add these beside the existing domain files. Do not replace `permissions.ts` or the current `DemoUser` fields that sign-in already uses. Extend `DemoUser` with optional `staffId` and `cadetId`.

```ts
type CadetStatus = "Active" | "On Hold" | "Completed";
type FlightStatus = "Draft" | "Awaiting approval" | "Approved" | "Rejected" | "Completed" | "Cancelled";
type SyllabusStatus = "Draft" | "Published" | "Archived";
type IssueLevel = "blocker" | "warning";

type ScheduleIssue = {
  level: IssueLevel;
  resource: string;
  message: string;
  conflictId?: string;
};
```

`WorkspaceState` is the port of `createSeed()` minus the React session flag. React sign-in stays in `AuthProvider`. The workspace repository does not own `signedIn`.

Keep `DEMO_TODAY` as `2026-09-29` on the fixture module so calculations match the prototype.

## 5. Proposed repository shape

Extend `WorkspaceRepository`. Do not create a second client or a second query cache.

Reads for the first slices:

- `listCadets(user)`
- `getCadet(id, user)`
- `listCourses()`
- `listSyllabi()`
- `listFlights()`
- `getFlight(id)`
- `listAircraft()`
- `listStaff()`
- `schedulingIssues(flight, ignoreId)`
- `dashboardSummary(user)`

Writes for the first slices, each returning `{ ok: true, id }` or `{ ok: false, error, issues? }` as the prototype `commit` already does:

- `saveCadet`, `setCadetStatus`
- `addSyllabusPhase`, `addSyllabusItem`, `moveSyllabusItem`, `publishSyllabus`, `saveAssessment`
- `saveFlightDraft`, `submitFlight`, `decideFlight`, `cancelFlight`, `completeFlight`, `correctFlight`

Implementation stores the workspace in a new `localStorage` key, for example `airnotix-web-workspace-v1`. It must not use `airnotix-demo-v1`. Seed version mismatch reloads the fixture, same as the prototype. Mutations clone before write. Audit and notification appends stay inside the repository, not in components.

`dashboardSummary` for a user without `cadets.view` and without `flights.view` returns an empty operational summary. The dashboard then shows the platform-only state the prototype already uses for Super Admin.

## 6. Role requirements for the first slices

Use the existing permission map. Do not add permissions.

| Action | Permission | Extra rule already in the prototype |
| --- | --- | --- |
| Open cadet list and profile | `cadets.view` | Instructor sees assigned cadets only |
| Enrol or edit a cadet | `cadets.create`, `cadets.update` | |
| Change cadet status | `cadets.update` | Reason required |
| View courses, syllabus, progress | `training.view` | |
| Edit or publish a draft | `training.configure` | Published versions stay fixed |
| Record an assessment | `training.assess` | |
| Open the calendar and a flight | `flights.view` | |
| Create or edit a draft | `flights.create`, `flights.update` | |
| Submit | `flights.submit` | Blocked while blockers remain |
| Approve or reject | `flights.approve` | Comment required. Approve blocked while blockers remain |
| Complete | `flights.complete` | Approved only. Instructor limited to assigned flights |
| See dashboard figures | `dashboard.view` | Hide operational figures when the user lacks cadet and flight view |

Operations has `flights.create` and `flights.submit` and does not have `flights.approve`. Chief Flying Instructor has `flights.approve` and does not have `flights.create`. Those differences stay.

## 7. First implementation slices

Each stage leaves the shell, theme, routes, auth, and permission map in place. Placeholders stay until that stage’s screen replaces them.

### Stage 1 — Typed fixtures and repositories

Port `createSeed`, the pure functions in `derive.js`, and the workspace mutations that the later stages call. No screen replacement except any type errors in the existing academy and user queries.

Likely files:

- Create `apps/web/src/domain/workspace.ts` for the record types.
- Create `apps/web/src/domain/fixtures.ts` by transcribing `createSeed()`.
- Create `apps/web/src/domain/calculations.ts` by porting `derive.js` without behavior changes.
- Create `apps/web/src/services/repositories/workspaceStore.ts` for load, save, and commit on `airnotix-web-workspace-v1`.
- Extend `workspaceRepository.ts` and `mockWorkspaceRepository.ts`.
- Extend `DemoUser` with optional `staffId` and `cadetId`. Keep every existing email and id.
- Add `apps/web/src/domain/calculations.test.ts` if a test runner is already available. The app has no test script today. Adding Vitest is a dependency decision for this stage, not a feature. If a runner is not approved, ship the pure functions with a small `node` assertion script that is not wired into application runtime.

Dependencies: none on new UI.

Acceptance:

- Fixture cadet count is 8. Flight count is 9. Course `requiredCount` is 100.
- `progressPercent` for Aarav is 36. Diya 52. Rohan 24. Meera Thomas 68. Ishan 41. Ananya 17. Neil 100. Sara 29.
- Recorded hours for Aarav are 29.8 (28.4 opening plus 1.4 completed).
- `schedulingIssues` for FLT-2405 includes a blocker against FLT-2404.
- `schedulingIssues` for FLT-2407 includes the leave block and the aircraft restriction.
- FLT-2403 produces a qualification warning and no blocker from that expiry.
- Submit of a flight with a blocker returns `ok: false` and does not change status.
- A draft with that blocker can still be saved.
- Approve of FLT-2405 is refused. Reject does not require the overlap to be cleared.
- Fuel balances 4700 and 1800. An issue above balance is refused.
- Fee outstanding uses plan total minus payments. Ishan and Ananya are overdue against `2026-09-29`.
- Existing sign-in still accepts `meera.krishnan@northstar.example` / `demonstration`.
- `airnotix-demo-v1` is never read or written.

Tests: the acceptance cases above, as unit tests of `calculations.ts` and the store. No browser test required for this stage.

### Stage 2 — Cadet list, profile, and enrolment

Replace the three cadet placeholders. Keep `/cadets/new` behind `cadets.create`.

Likely files:

- Create `apps/web/src/features/cadets/CadetListPage.tsx`, `CadetProfilePage.tsx`, `CadetFormPage.tsx`.
- Modify `src/app/router.tsx` only to point the existing cadet paths at those pages.
- Use `PageHeader`, `RecordGrid`, `StatusChip`, `EmptyState`, and the confirm dialog for status changes.

Dependencies: Stage 1. Course and staff names come from the fixture even though their own screens are still placeholders.

Acceptance:

- Academy Administrator sees eight cadets and the seed codes.
- Instructor Arun sees Aarav and Ishan only, and a direct URL to Diya shows the access-limited state.
- Create requires first name, last name, course, and joining date. A saved cadet appears on the list as Active with the next `NFA-2026-` code.
- Status change requires a reason and is visible after refresh.
- Super Admin opening `/cadets` still sees Access limited.
- Cadet Aarav opening `/cadets` still sees Access limited.

Tests: repository tests for instructor filtering and required fields. One browser pass of list, create, and the Arun denial.

### Stage 3 — Courses, syllabus, and progress

Replace the three training routes. Assessment can live on `/training/progress` so a new route is not required. Ground lessons stay inside the syllabus item list. The prototype has no separate ground record type.

Likely files:

- Create `apps/web/src/features/training/CoursesPage.tsx`, `SyllabusPage.tsx`, `ProgressPage.tsx`.
- Wire them in `router.tsx`.

Dependencies: Stage 1. Cadet names from Stage 2 data, which is the same store.

Acceptance:

- Published CPL and PPL syllabi render with the seed phase and item names.
- The empty CPL draft accepts a phase and an item. The published syllabus does not.
- Publish archives the previous published syllabus for that course, points the course at the new syllabus, and leaves existing cadet `syllabusId` values unchanged.
- Progress percents match Stage 1.
- A first Satisfactory assessment increases `completedRequired` by 1 and does not increase it again for the same item.
- A user without `training.configure` does not see edit or publish controls. A user without `training.assess` does not see the assessment form.

Tests: publish and assessment unit tests. Browser pass as Nisha (configure and assess) and as Kabir (view only).

### Stage 4 — Flight scheduling, approval, conflicts, and completion

Replace the flight routes. Include enough of the approvals action to approve and reject. The approvals page itself can stay a placeholder until a later slice if flight detail already exposes the decision for `flights.approve`.

Likely files:

- Create `apps/web/src/features/flights/FlightCalendarPage.tsx`, `FlightFormPage.tsx`, `FlightDetailPage.tsx`.
- Wire them in `router.tsx`.
- Read aircraft, staff, and availability. Do not build the fleet or HR screens yet.

Dependencies: Stages 1–3, because completion and assessments share `completedRequired`.

Acceptance:

- Week of 29 Sep 2026 shows the seed flights. Section 14 records that the prototype week board includes cancelled FLT-2410; the status filter can hide it.
- FLT-2405 can be saved as a draft and shows the overlap with FLT-2404. Submit and approve stay refused. No other aircraft or instructor is selected automatically.
- FLT-2407 shows the leave blocker and the aircraft restriction blocker.
- FLT-2403 shows the qualification warning and can be approved because that warning is not a blocker.
- Completing an approved flight adds `actual.hours` to cadet and aircraft recorded hours.
- The first Satisfactory completion of an item increments progress once.
- Arun can complete only a flight assigned to `staff-arun`.
- A rejected or draft flight can be edited. An approved flight cannot, except through completion. A completed flight can be corrected only with a reason.

Tests: conflict, submit, approve, complete, and instructor-limit unit tests. Browser pass of the FLT-2405 draft and one completion.

### Stage 5 — Dashboard KPIs from the repository

Replace the four literals in `DashboardPage.tsx`. Do not redesign the page.

Likely files:

- Modify `DashboardPage.tsx`.
- Add `dashboardSummary` on the repository from Stage 1 if it was not already returned for tests.

Dependencies: Stages 1–4, so completions and new cadets change the cards.

Acceptance:

- With the untouched fixture, active cadets are 6, flights on 29 Sep 2026 are 3, completed hours in September are 1.4, available aircraft are 2, and pending approvals are 1.
- Outstanding fees, if shown, equal billed plans minus payments: 12,400,000 billed and 3,350,000 paid, outstanding 9,050,000. The prototype formats this as Indian rupees. Show this figure only if the user has `finance.view`. Stage 6 adds that card on the existing dashboard. See section 16.
- Super Admin does not see cadet, flight, aircraft, or approval counts.
- After Stage 4 completion of a flight on or before 29 Sep 2026, the September completed-hours figure includes that flight’s actual hours.

Tests: summary unit test for the fixture and for a Super Admin caller. Browser check as Meera and as Anil.

## 8. Later slices, not part of the first plan

Finance, documents, the approvals queue, and the header notification list are recorded in section 16. Fleet, maintenance, staff availability, and fuel are recorded in section 15. Reports, audit, settings edits, and demo users are recorded in section 17. The cadet portal is recorded in section 18. Search stays a placeholder. Do not start a backend until that work is approved.

Settings editing and add-user stay as they are until a later slice. The current read-only pages are implemented and should not be replaced by placeholders.

## 9. Unclear points to confirm before coding

1. Whether React workspace data may use its own `localStorage` key. This document assumes yes, and assumes `airnotix-demo-v1` stays untouched.
2. Whether `DEMO_TODAY` remains 29 Sep 2026 for the first slices. The calculations and the seed flights depend on it.
3. Whether a test runner may be added in Stage 1. The app currently has lint and `tsc` only.
4. The hardcoded fee due date on newly enrolled cadets.
5. Unused permission `finance.adjust`.
6. Random flight and work-order numbers in the prototype. The first slice should not depend on those numbers for tests.
7. Progress is a counter against `requiredCount` 100, not a count of named syllabus items. Port it as the prototype does.

## 10. Recommended first coding task

Stages 1–8 are recorded in sections 11–18. Stage 5 in this document was originally only the remaining dashboard cards. The approved Stage 5 request covered Fleet, Maintenance, Staff Availability, and Fuel, and it also connected those two cards. Stage 6 covers Finance, Documents, Approvals, and Notifications. Stage 7 covers Reports, Audit, Settings, and User Management. Stage 8 covers the Cadet Portal. Do not start a backend until that work is approved.

## 11. Stage 1 implementation record

Stage 1 is in the React app. Placeholder screens, routes, theme, layouts, the permission map, and demo sign-in were left in place. The HTML prototype was not modified.

### Files

Created:

- `apps/web/src/domain/workspace.ts`
- `apps/web/src/domain/fixtures.ts`
- `apps/web/src/domain/calculations.ts`
- `apps/web/src/domain/calculations.test.ts`
- `apps/web/src/services/repositories/workspaceStore.ts`
- `apps/web/src/services/repositories/workspaceStore.test.ts`
- `apps/web/vitest.config.ts`

Modified:

- `apps/web/src/domain/demoData.ts` — optional `staffId` and `cadetId` on the existing nine users
- `apps/web/src/services/repositories/workspaceRepository.ts`
- `apps/web/src/services/repositories/mockWorkspaceRepository.ts`
- `apps/web/package.json` and `apps/web/package-lock.json` — Vitest 5.0.2 as a dev dependency, script `npm test`

Not modified: router, dashboard, cadet, training, and flight screens, `AuthProvider`, session keys `airnotix-web-session-v1` and `airnotix-web-email`, and every file under the HTML prototype.

### Repository methods

Reads: `getAcademy`, `listDemoUsers`, `listCadets`, `getCadet`, `listCourses`, `listSyllabi`, `listFlights`, `getFlight`, `listAircraft`, `listStaff`, `listAvailability`, `schedulingIssues`, `dashboardSummary`, `listTanks`, `listFuelTransactions`, `fuelBalance`, `listFeePlans`, `feeAccount`.

Writes: `saveCadet`, `setCadetStatus`, `addSyllabusPhase`, `addSyllabusItem`, `moveSyllabusItem`, `publishSyllabus`, `saveAssessment`, `saveFlightDraft`, `submitFlight`, `decideFlight`, `cancelFlight`, `completeFlight`, `correctFlight`, `addFuelTransaction`.

`dashboardSummary` is available for tests. `DashboardPage` still shows the literal `—`.

Successful mutations persist on `airnotix-web-workspace-v1`. A seed version other than 1, or unreadable JSON, reloads the fixture. Reads do not write storage. The store does not read or write `airnotix-demo-v1`.

### Checks

`npm test`: 2 files, 26 tests, all passed.

`npm run lint`: exit 0. The same nine pre-existing `react/only-export-components` warnings remain, in `AuthProvider`, `WorkspaceRepositoryProvider`, `router.tsx`, `confirm.tsx`, and `snackbar.tsx`. Stage 1 added no lint warnings.

`npm run build`: `tsc -b` and the Vite production build succeeded. The existing chunk-size warning remains. The main bundle is now about 1,197 kB minified because the fixture is imported by the repository the shell already loads.

### Deviations from a line-by-line copy

- React sign-in stays in `AuthProvider`. Workspace state has no `signedIn` or `activeUserId`. Write methods take an optional acting user. If that argument is omitted, audit text uses the prototype’s missing-user fallback.
- `overdue` is a boolean. The prototype’s `&&` expression is falsy for a blank due date; the port uses the same condition.
- Assessment and flight completion share one helper for the first Satisfactory increment. The cap and the “only the first time” rule are the store’s rule.
- `moveSyllabusItem` returns the existing “published order is fixed” error when the syllabus id is missing, instead of throwing. A missing spliced item also returns the existing “cannot move further” error, and that failed commit is not saved.
- `getCadet` returns null for an instructor opening another instructor’s cadet. Section 12 adds `lookupCadet` so the profile can show the denial sentence.
- `listDemoUsers` reads the workspace copy of the nine accounts. Sign-in still reads the `DEMO_USERS` constant. This stage has no add-user mutation, so the two lists start as the same people.
- New flight references still use the prototype’s `2400 + random` expression. Tests do not assert those numbers.

### Still unresolved

- A newly enrolled cadet still receives the hardcoded fee due date `2026-11-15` from `saveCadet`. No new rule was chosen.
- `finance.adjust` is still a permission with no mutation. `addPayment` and `addExpense` were not ported; outstanding fees are calculated from the fixture payments.
- Aircraft status changes, defects, work orders, release records, availability edits, document review, settings edits, and add-user remain prototype-only. Their seed rows are in the fixture so flight checks can read them.
- Maintenance and HR receive an empty `dashboardSummary` because `renderDashboard` does that for every user who lacks both `cadets.view` and `flights.view`. That includes Super Admin. The dashboard screen does not use this result yet.
- The seed leaves `completedItemIds` empty even though FLT-2409 is already a Satisfactory completion of `item-circuits`. A later Satisfactory record for that item still increments `completedRequired` once. This was ported, not corrected.
- `DEMO_TODAY` remains 29 Sep 2026. Progress remains `completedRequired / 100`.

## 12. Stage 2 implementation record

Cadet list, profile, and enrolment now use the Stage 1 workspace. The HTML prototype was not modified. Training and flight routes are still placeholders. Sign-in, the dashboard shell, navigation, Academy Settings, and Users & Roles were not redesigned.

### Routes and components

Existing routes, still behind the same permissions:

- `/cadets` — `CadetListPage.tsx`, `cadets.view`
- `/cadets/new` — `CadetFormPage.tsx` and `CadetForm.tsx`, `cadets.create`
- `/cadets/:cadetId` — `CadetProfilePage.tsx`, `cadets.view`
- `/cadets/:cadetId?edit=1` — the same profile route renders `CadetForm` when the user has `cadets.update`. No new route was added.

Supporting files: `cadetRules.ts`, `cadetQueries.ts`. The list uses `PageHeader`, `RecordGrid`, `StatusChip`, and `EmptyState`. Search, course, and status filters follow the prototype list: code, full name, and batch; course id; status `Active`, `On Hold`, `Completed`, or `Archived`.

### Repository methods

Reads: `listCadets`, `lookupCadet`, `listCourses`, `listStaff`, `listSyllabi`, `listFlights`, `listAircraft`, `listDocuments`, `listPayments`, `listAudit`, `feeAccount`, `getAcademy`.

Writes: `saveCadet`, `setCadetStatus`. The acting user is passed in. Session storage is unchanged. Successful saves and status changes invalidate the cadet query cache. The workspace is still `airnotix-web-workspace-v1`.

`lookupCadet` distinguishes a missing id from an instructor opening someone else's cadet. `getCadet` still returns null for both. `listDocuments`, `listPayments`, and `listAudit` only return records already in the fixture. The profile then keeps the cadet's own rows.

### Validation carried from the prototype

- First name, last name, course, and joining date are required. The combined message is the store's message, and each missing field has its own message.
- Email may be blank. Otherwise it must match the store's pattern.
- A new code is the next `NFA-2026-` number. Status starts as `Active`. Opening hours and completed required items start at 0. Syllabus id is copied from the course.
- A blank instructor becomes `staff-arun`. A blank batch becomes the course type plus `-2026-A`.
- Fee due date on create remains the literal `2026-11-15`. The form states that date. It was not changed.
- Status change still requires a reason. The shared confirm dialog cannot collect one, so the profile uses its own reason dialog and then `setCadetStatus`.

### Permissions applied

The permission map was not expanded. Route guards still block users without `cadets.view` or, for enrolment, `cadets.create`. Super Admin and the cadet role see Access limited, including on a direct URL.

`cadets.update` controls Edit and status buttons. Operations can open the register and a profile, and cannot add, edit, or change status. An instructor still sees only cadets whose `instructorId` matches `staffId`. Arun sees Aarav and Ishan. Diya's direct URL shows "Outside your assigned cadets" and does not show her record. These checks are demonstration UI only.

The Fees tab is shown only with `finance.view`. It uses `feeAccount` and the existing payment rows. Recording a payment is not on this screen because `addPayment` is not in the repository.

### Checks

`npm test`: 4 files, 36 tests, all passed. New coverage is in `cadetRules.test.ts` and `cadetPages.test.tsx`: fixture list, search and status filter, profile, unknown id, required fields, invalid email, successful create, reload from the same store, role denial, instructor scope, fee visibility, status reason, and loading, empty, and error states.

`npm run lint`: exit 0. The same nine pre-existing fast-refresh warnings remain. Stage 2 added none.

`npm run build`: succeeded. The existing chunk-size warning remains. The main bundle is about 1,224 kB minified.

Test rendering uses Vitest with `happy-dom` and `@testing-library/react`, added as dev dependencies. The interactive flows were exercised in that renderer.

### Limits still in force

- Progress remains `completedRequired / 100` and is labelled illustrative. It is not a count of named syllabus items.
- The next approved flight is the first matching row in stored order on or after 29 Sep 2026, as in the prototype.
- Flight references on the profile are text. They do not open the flight screen, which is still a placeholder.
- Document rows say files are not stored. There is no upload.
- `finance.adjust` and `addPayment` are still unused.
- A newly enrolled cadet's fee due date is still the hardcoded `2026-11-15`.

## 13. Stage 3 implementation record

Course, syllabus, and progress routes now read and mutate the Stage 1 workspace. The HTML prototype was not modified. Flight Operations routes are still placeholders. Cadet list, profile, enrolment, sign-in, navigation, Academy Settings, and Users & Roles were left in place.

### Routes and components

- `/training/courses` — `CoursesPage.tsx`, `training.view`. The prototype course table has no search and no create or edit action, so this screen does not add those.
- `/training/syllabus` — `SyllabusPage.tsx`, `training.view`. Draft editing and publish require `training.configure`.
- `/training/progress` — `ProgressPage.tsx`, `training.view`. The assessment form and the assessment table live here because the React app has no assessments route. Recording an assessment requires `training.assess`.
- Cadet profile training tab — existing `CadetProfilePage.tsx`. It still uses the cadet's own `syllabusId`, `completedRequired`, and `completedItemIds`, and now lists that cadet's assessment rows.

Supporting files: `trainingRules.ts`, `trainingQueries.ts`.

The prototype ground-school view has no React route and no separate record type. Published knowledge items and ground lessons are listed at the bottom of the syllabus page. The sentence is the prototype's: files are not attached.

### Repository methods

Reused: `listCourses`, `listSyllabi`, `listCadets`, `addSyllabusPhase`, `addSyllabusItem`, `moveSyllabusItem`, `publishSyllabus`, `saveAssessment`.

Added: `listAssessments`, a read of the existing `assessments` array. No assessment fields were added.

Successful syllabus and assessment writes invalidate the training queries and the cadet list and profile queries. Workspace persistence remains `airnotix-web-workspace-v1`. Sign-in state is unchanged.

### Rules carried from the prototype

- Illustrative progress remains `round(completedRequired / course.requiredCount * 100)`. The seed `requiredCount` is 100. The screen says this is not a count of named items and not regulatory eligibility.
- A first Satisfactory assessment for an item appends that item id and adds 1 to `completedRequired`, capped at the course count. A second Satisfactory for the same item does not add again. Further Training Required and Not Assessed do not add. The form says this does not certify competence.
- Outcomes are Satisfactory, Further Training Required, and Not Assessed. Cadet, item, and outcome are required. The combined message is the store's message.
- The assessment date defaults to `DEMO_TODAY` (`2026-09-29`). Comments are optional. The assessor name is the signed-in user.
- Only a draft can be published, and it needs at least one phase. Other published syllabi for that course become Archived. `course.syllabusId` points at the new version. Existing cadet `syllabusId` values are not rewritten. Publish is not regulatory approval.
- Phases, items, and reordering are offered only on a draft, and only with `training.configure`. Item types are Knowledge item, Ground lesson, Flight exercise, Assessment, and Progress check.
- The course enrolment count uses `listCadets` for the signed-in user. An instructor therefore sees assigned cadets only. The HTML prototype counts every cadet. Academy Administrator, Operations, and the Chief Flying Instructor see the full count because their cadet list is unfiltered.
- Progress search filters the visible register by cadet id code and name. The prototype progress table has no search box. Course and syllabus screens do not add filters the prototype does not have.

### Permissions applied

The permission map was not expanded. `training.view` guards all three routes. Super Admin, Finance, Maintenance, HR, and the cadet role see Access limited on a direct URL.

`training.configure` shows draft editing and publish. Operations can read syllabi and cannot edit or publish. `training.assess` shows the assessment form. Operations can read recorded assessments and cannot save one. An instructor's cadet list and assessment choices stay on assigned cadets. These checks are demonstration UI only.

### Checks

`npm test`: 6 files, 46 tests, all passed. New coverage is in `trainingRules.test.ts` and `trainingPages.test.tsx`: fixture courses, syllabus names, draft phase and item validation, empty publish, successful publish without rewriting a cadet syllabus, known progress percents, progress search, assessment validation, first Satisfactory persistence, a second Satisfactory that does not increment, Further Training Required, profile training tab, role denial, instructor scope, and loading, empty, and error states. Stage 1 store tests still cover the cap at `requiredCount` 100.

`npm run lint`: exit 0. The same nine pre-existing fast-refresh warnings remain. Stage 3 added none.

`npm run build`: succeeded. The existing chunk-size warning remains. The main bundle is about 1,241 kB minified.

Screen behaviour was exercised with Vitest, happy-dom, and React Testing Library.

### Limits still in force

- The percentage stays illustrative. Named-item completed and not-yet-recorded counts are shown beside it and are not used as the percentage.
- Seed `completedItemIds` is still empty, including for FLT-2409. Those items stay Not Assessed until a Satisfactory assessment or flight completion records them.
- There is still no course create or edit mutation.
- An assessment row for a cadet outside the signed-in instructor's assignment shows "Unknown cadet", because the screen will not read that cadet through `listCadets`.
- Publishing does not update cadet profiles. A cadet keeps the syllabus version stored on the cadet record.
- `addPayment` and `finance.adjust` remain unimplemented. Flight screens are recorded in section 14.

## 14. Stage 4 implementation record

Flight scheduling, draft editing, submission, approval, rejection, cancellation, completion, and hour correction now use the Stage 1 repository. The HTML prototype was not modified. No backend or tenant database was added.

### Routes and components

- `/flight-operations` — `FlightSchedulePage.tsx`, `flights.view`. Week, day, and agenda. Date, status, and aircraft filters. Cancelled flights stay on the board, matching the prototype renderer. The earlier stage note that FLT-2410 is hidden was not how the HTML week view works. The dashboard “flights today” count still excludes cancelled flights.
- `/flight-operations/new` — `FlightFormPage.tsx` and `FlightForm.tsx`, `flights.create`.
- `/flight-operations/:flightId` — `FlightDetailPage.tsx`, `flights.view`. Edit is `?edit=1` when the flight is Draft or Rejected and the user has `flights.update`. Completion is `?complete=1`.

Supporting files: `flightRules.ts`, `flightQueries.ts`, `FlightIssues.tsx`. Domain checks stay in `calculations.ts` and `workspaceStore.ts`. The pages call those functions through the repository.

Cadet profile flight references link to the flight when the user has `flights.view`. At the end of Stage 4, aircraft codes stayed text because fleet was still a placeholder. Stage 5 links the code when the user has `fleet.view`. See section 15.

### Repository and query contracts

Reused: `listFlights`, `getFlight`, `schedulingIssues`, `saveFlightDraft`, `submitFlight`, `decideFlight`, `cancelFlight`, `completeFlight`, `correctFlight`, `listStaff`, `listAircraft`, `listCadets`, `listSyllabi`, `listAudit`, `dashboardSummary`.

Added: `listCadetLabels`, id and name only, so the schedule can show the prototype’s cadet names. Opening a profile still uses `lookupCadet`. An instructor who is not assigned still sees Access limited on that profile.

UI components depend on `WorkspaceRepository`, not on `localStorage`. A future .NET adapter can implement the same methods. Transport DTOs belong in that adapter. The feature does not send a client-chosen tenant id. A later API should take the tenant from the authenticated session.

`MutationResult` already returns `ok`, `error`, and `issues`. The store has no row version. A later API can add a concurrency token without changing the page structure. The UI disables the action button while a mutation is in flight.

Successful flight writes invalidate flight, cadet, training, and dashboard queries. Persistence remains `airnotix-web-workspace-v1`.

### Rules carried from the prototype

- Required draft fields: date, start, end, cadet, instructor, aircraft. A draft may be saved while blockers exist. Submit is refused while any blocker remains. Nothing assigns a different aircraft or instructor.
- Blockers: start not before end; same-day overlap of cadet, instructor, or aircraft with a flight that is not Cancelled or Rejected; an availability block that overlaps; aircraft status other than Available; an Available aircraft whose restriction covers the date.
- A qualification `expires` before the flight date is a warning. It does not block submit or approval. Equal dates do not warn.
- Only Draft or Rejected can be edited. Approve and reject require Awaiting approval and a comment. Approve is refused while blockers remain. Reject is allowed while an overlap remains.
- Cancel is refused for Completed and Cancelled and requires a reason. The button is shown for `flights.update` or `flights.approve`.
- Completion is only for Approved. An instructor may complete only when `staffId` matches `instructorId`. Actual start, end, hours greater than 0, and an outcome are required. Hours are the entered value, not a calculation from the clock times. The first Satisfactory outcome for that item increments `completedRequired` once, through the same helper as assessments. A second completion is refused, so hours are not added again.
- Correction changes `actual.hours` only and requires a reason. It does not reverse progress.
- New references still use the prototype’s `2400 + random` expression. Tests do not assert those numbers.
- Flight types in the form are Training and Progress check. Default times are 09:00–10:30. There is no configurable workflow engine.

### Permissions

The permission map was not expanded.

| Action | Permission | Extra rule |
| --- | --- | --- |
| Schedule and detail | `flights.view` | |
| New flight | `flights.create` | |
| Edit draft | `flights.update` | Draft or Rejected only |
| Submit | `flights.submit` | Draft only, from the detail button |
| Approve or reject | `flights.approve` | Awaiting approval, comment required |
| Cancel | `flights.update` or `flights.approve` | Not Completed or Cancelled |
| Complete or correct | `flights.complete` | Instructor assignment check is in the store |

Operations can schedule and submit, and cannot approve or complete. The Chief Flying Instructor can approve and cannot schedule. An instructor can complete an assigned flight and cannot schedule. Super Admin, the cadet role, and Maintenance see Access limited on the flight routes. These checks are demonstration UI only.

### Dashboard

Flights today and pending approvals now use `dashboardSummary`. The demo day is 29 Sep 2026. Roles without both cadet and flight view, including Maintenance and Super Admin, still see an empty operational summary, so those two cards stay blank for them. Active cadets and aircraft available stayed “Not connected” at the end of Stage 4. Stage 5 connects them. See section 15.

### Checks

`npm test`: 8 files, 57 tests, all passed. New coverage is in `flightRules.test.ts` and `flightPages.test.tsx`: week, day, and cancelled filter; loading, empty, error, and unknown id; FLT-2405 draft save and blocked submit; FLT-2407 leave and restriction; FLT-2403 qualification warning, approval, and rejection while a later overlap exists; new-draft validation and persistence; completion, hour totals, correction, and a refused second completion; instructor assignment; route and action permissions; cadet profile link; dashboard figures. Stage 1 calculation tests still cover the overlap, leave, restriction, and qualification cases.

`npm run lint`: exit 0. The same nine pre-existing fast-refresh warnings remain. Stage 4 added none.

`npm run build`: succeeded. The existing chunk-size warning remains. The main bundle is about 1,267 kB minified.

Screen behaviour was exercised with Vitest, happy-dom, and React Testing Library.

### Domain questions still open

- Whether `requiredCount` 100, the hardcoded new-cadet fee date, and random flight references should remain.
- Whether a qualification expiry should ever block a flight. The prototype keeps it informational.
- Whether aircraft status and restrictions are planning notes only. The screens say they are not a release or an airworthiness decision.
- Whether completion hours should be derived from actual start and end. The prototype stores the entered hours.
- Whether the instructor calendar should hide other cadets’ names. This stage shows the names, as the prototype board does, and still denies the profile.
- The approvals queue page is not in this stage. Active cadet and available-aircraft dashboard cards, and the fleet screens, were connected in Stage 5. See section 15.

## 15. Stage 5 implementation record

Fleet, maintenance, staff availability, and fuel now use the Stage 1 workspace. The HTML prototype was not modified. No backend, database, or generic workflow engine was added. Screens call `WorkspaceRepository`. They do not read `localStorage` or the fixture module. A future .NET adapter can implement the same methods. It should take the tenant from the authenticated session. A client-supplied tenant id is not a security boundary, and these role checks are not one either.

The earlier plan in this document called Stage 5 “dashboard KPIs only”. The approved request replaced that with operational resources and also asked for the two remaining dashboard cards. Outstanding fees and September completed hours stay off the card row. Those figures exist in `dashboardSummary`, and finance is still a later stage.

### Routes and components

- `/fleet` — `FleetListPage.tsx`, `fleet.view`. Identifier, type, planning status, recorded hours, configured next threshold, and bookings on or after the demo day excluding cancelled flights.
- `/fleet/:aircraftId` — `AircraftDetailPage.tsx`, `fleet.view`. Restriction window, linked flights, linked defects and work orders, and aircraft documents already on the register.
- `/maintenance` — `MaintenancePage.tsx`, `maintenance.view`. There is no work-order detail route. The prototype does not have one.
- `/fuel` — `FuelPage.tsx`, `fuel.view`.
- `/hr` — `StaffListPage.tsx`, `staff.view`.
- `/hr/:staffId` — `StaffDetailPage.tsx`, `staff.view`. The prototype linked this from `people.html`. The React route was already `/hr/:staffId`.

Supporting files: `fleetRules.ts`, `fleetQueries.ts`, `maintenanceRules.ts`, `maintenanceQueries.ts`, `staffRules.ts`, `staffQueries.ts`, `fuelRules.ts`, `fuelQueries.ts`. Domain writes stay in `workspaceStore.ts`.

Flight detail links the aircraft code to `/fleet/:aircraftId` when the user has `fleet.view`. Aircraft on the fleet detail links to the flight when the user has `flights.view`.

### Domain models and repository methods

Reused: `listAircraft`, `listStaff`, `listAvailability`, `listTanks`, `listFuelTransactions`, `fuelBalance`, `addFuelTransaction`, `listDocuments`, `listFlights`, `schedulingIssues`, `dashboardSummary`.

Added:

- `getAircraft`, `setAircraftStatus`
- `listDefects`, `listWorkOrders`, `addDefect`, `updateWorkOrder`, `recordRelease`
- `getStaff`, `addAvailability`

`DefectInput` and `AvailabilityInput` are the write payloads. Reads return the existing domain types. Transport DTOs stay in a future HTTP adapter. There is still no row version. The action button is disabled while a mutation is in flight.

Successful aircraft and availability writes invalidate fleet or staff queries, flight queries, and dashboard queries. Maintenance writes invalidate maintenance and fleet queries. They do not change flight blockers, because a defect or a release note does not change aircraft status. Fuel writes invalidate the fuel query only. Persistence remains `airnotix-web-workspace-v1`. The prototype key `airnotix-demo-v1` is still unread and unwritten.

### Rules carried from the prototype

- Aircraft status values on the form are Available, Maintenance, and Restricted. A status other than Available requires a trimmed reason: “A reason is required when the aircraft is not available.” Available clears `restriction`. Otherwise `restriction.from` is `stamp().slice(0, 10)` and `until` falls back to the literal `2026-10-31`. `stamp()` is `toISOString()`, so `from` is the UTC date, as in the prototype.
- Recorded hours stay `openingHours` plus completed flight actual hours. Bookings are flights on or after `DEMO_TODAY` that are not Cancelled. The next threshold is the stored `nextMaintenanceHours`. There is no scheduled-task record, interval, or life limit.
- A defect requires an aircraft and a trimmed description. Severity defaults to Medium when missing. The form’s selected default is High. The mutation also opens a work order assigned to `staff-ravi`, status Open, with a random `WO-` reference. It does not change aircraft status.
- Work-order buttons set `In progress` or `Completed`. An unknown id returns “Work order not found.”
- Release requires a note: “Release notes are required.” It sets status `Release recorded` and stores who, when, and the note. It does not set the aircraft to Available. The audit text says this is not a system serviceability decision.
- Open-defect count is status Open. Open-work-order count excludes Release recorded and Completed. Aircraft not available is status other than Available.
- Availability requires staff, date, start, and end. Kind defaults to Unavailable. A blank reason becomes “Demo availability block”. The form defaults are date `2026-10-01`, 13:00–18:00, kind Leave, reason “Demo leave”. The person’s stored availability label is not recalculated from blocks.
- A qualification with `expires` before `DEMO_TODAY` is shown as informational. An equal date is not. That is the same comparison flight planning already uses. It does not block a flight.
- Fuel receipt adds, issue subtracts, and adjustment adds the signed quantity. An issue greater than the calculated balance is refused. An issue equal to the balance is allowed. An adjustment needs a reason. A missing tank, type, or quantity, including 0, returns “Tank, type, and quantity are required.” Low stock is `balance < threshold`. Thresholds stay the fixture values, 2000 L and 2500 L. No conversion, safety stock, or accounting rule was added.
- `schedulingIssues` was not rewritten. A non-Available aircraft is a blocker. An availability overlap is a blocker. A qualification date before the flight is a warning.

### Permissions

The role map was not expanded.

| Role | What this stage allows |
| --- | --- |
| Academy Administrator | Fleet status, defect and work status, fuel, staff availability. No release record. |
| Operations Manager | View fleet, maintenance, and staff. Manage fuel. No aircraft status, defect, or availability form. |
| Chief Flying Instructor | View staff. No fleet, maintenance, or fuel. No availability form. |
| Instructor | None of these routes. Cadet visibility is unchanged: `listCadets` still limits an instructor to assigned cadets. |
| Maintenance Officer | View fleet. Record defects, work status, and release. No fuel and no staff route. No aircraft status form. |
| Finance Officer | None of these routes. |
| HR / Staff Coordinator | View staff and add availability. No fleet, maintenance, or fuel. |
| Super Admin | None of these routes. Dashboard operational figures stay hidden. |
| Cadet | None of these routes. |

Direct route access and the action buttons were both tested. A hidden button is not authorization. The API must enforce the same permissions later.

### Cross-module behaviour

- Setting an aircraft out of Available is visible on the next read of that flight’s `schedulingIssues`. The flight’s own status is left as stored.
- A new leave or unavailable block is visible the same way. The prototype toast says scheduling will warn. The flight screen still treats the overlap as a blocker. The toast text was kept.
- Dashboard active cadets and aircraft available use `dashboardSummary` when `operational` is true. With the seed that is 6 and 2. Maintenance has `fleet.view` but an empty operational summary, so the aircraft card for that role counts Available aircraft from `listAircraft` instead of showing a fabricated zero. The hint says the count is a planning status, not an airworthiness decision. Active cadets stay hidden for that role.
- Aircraft, staff, defect, work-order, and fuel rows are not copied into feature-specific stores. Features do not import each other. Flight code links by route only.

### Checks

`npm test`: 13 files, 75 tests, all passed. New coverage is in `workspaceStore.test.ts`, `fleetPages.test.tsx`, `maintenancePages.test.tsx`, `staffPages.test.tsx`, `fuelPages.test.tsx`, and `resourceAccess.test.tsx`. It covers fleet filters and detail, status mutation, maintenance defect, work status, and release, the planning restriction on an existing approved flight, staff leave and the qualification note, the leave block on an existing approved flight, fuel balance, receipt, issue, adjustment, and the stock limit, persistence after remount, route denial, action denial, and loading, empty, invalid-id, and error states. Cadet, training, and flight tests still pass, including the updated dashboard assertion that active cadets are 6 and aircraft available are 2.

`npm run lint`: exit 0. Eight `react/only-export-components` warnings remain: WorkspaceRepositoryProvider (3), AuthProvider, snackbar, confirm, and router (2). Removing the unused fleet and staff placeholders dropped the earlier third router warning. No new warning was added.

`npm run build`: succeeded. The existing chunk-size warning remains. The main bundle is about 1,297 kB minified.

A desktop browser pass was not run. This environment has no browser automation tool, and Playwright is not installed. The Fleet to Flight Operations journey, the staff leave to flight journey, and the maintenance release to fleet detail journey were exercised with Vitest, happy-dom, and React Testing Library. Browser storage on this machine was not cleared.

### Customization points

These are prototype constants, not a settings screen:

- Aircraft statuses Available, Maintenance, Restricted.
- Restriction until-date fallback `2026-10-31`.
- Defect severities Low, Medium, High, with High selected on the form.
- Work-order status buttons In progress and Completed.
- New work orders assigned to `staff-ravi`.
- Availability kinds Leave and Unavailable, and the form default date `2026-10-01`.
- Fuel types Receipt, Issue, Adjustment, and the tank thresholds stored on each tank.

### Domain questions still open

- Whether `restriction.from` should stay the UTC date from `toISOString()`.
- Whether a release entry should ever change aircraft status. The prototype does not.
- Whether qualification dates should ever block a flight. They remain informational.
- Whether the availability toast should say “warn” while the flight check blocks.
- Whether random work-order references should stay.
- Whether the fleet identifier and type search should stay. The prototype list filtered by status only. Search uses the code and type already stored on the aircraft.
- Whether Maintenance should see the aircraft-available dashboard count. They can open Fleet. The ported `dashboardSummary` still returns an empty operational summary for that role, so the card uses a separate count of Available aircraft.

### Architectural notes

- No scheduled maintenance programme was invented. The threshold table says so on the maintenance screen.
- Document rows are shown when an aircraft or staff member already owns them. Review actions were not added.
- The fleet and maintenance hour displays pass the aircraft and flight lists into `recordedAircraftHours`. They do not keep a second copy of those records.
- Finance, documents, the approvals queue, and header notifications are recorded in section 16. Reports, audit, and the cadet portal were not started in Stage 5.

## 16. Stage 6 implementation record

Finance, the document register, the approvals queue, and header notifications now read and write the Stage 1 workspace. The HTML prototype was not modified. `decideFlight`, flight status transitions, and scheduling blockers were not rewritten. Reports, audit, settings editing, users, portal content, and a backend were not started. `/portal/notifications` stays a placeholder.

Frontend role checks remain a demonstration. They are not a security boundary. Tenant isolation still belongs on a future authenticated API.

### Routes and screens

| Route | Permission | Screen |
| --- | --- | --- |
| `/finance` | `finance.view` | `FinancePage` |
| `/documents` | `documents.view` | `DocumentsPage` |
| `/approvals` | `approvals.view` | `ApprovalsPage` |

The header bell is `NotificationButton`. It replaces the fixed notification sentence. Search in the header is unchanged.

Feature folders:

- `features/finance` — `financeRules.ts`, `financeQueries.ts`, `FinancePage.tsx`
- `features/documents` — `documentRules.ts`, `documentQueries.ts`, `DocumentsPage.tsx`
- `features/approvals` — `approvalQueries.ts`, `ApprovalsPage.tsx`
- `features/notifications` — `notificationQueries.ts`, `NotificationButton.tsx`
- `domain/notifications.ts` — visibility and href mapping

Cadet fees stay on `CadetProfilePage`. That page does not import the finance feature. It calls `addPayment` and invalidates the same query keys.

### Repository methods

Added on the existing workspace repository. Screens do not read fixtures or `localStorage` themselves.

| Method | Behaviour |
| --- | --- |
| `financeSnapshot` | `financeSnapshot` in `calculations.ts`. |
| `listFeeAccounts` | `feeAccount` for cadets returned by `visibleCadets`. |
| `listExpenses` | Stored expenses. |
| `addPayment` | Port of `addPayment`. Cadet, amount greater than 0, date, and method are required. Reference defaults to `DEMO`. |
| `addExpense` | Port of `addExpense`. Date, category, trimmed description, and amount greater than 0 are required. Branch is `Kochi Training Base`. Status is `Recorded`. |
| `reviewDocument` | Sets `review` to the given label. Error `Document not found.` |
| `listPendingApprovals` | Flights whose status is `Awaiting approval` (`pendingApprovals`). |
| `listRecordedDecisions` | Flights that already have `approval` and are not `Awaiting approval`. Read only. |
| `listNotifications` | `visibleNotifications`. |
| `markNotificationRead` | Marks one row. A missing id still returns success, as in the prototype. |
| `markAllNotificationsRead` | Marks rows whose `userId` or `audienceRole` matches the actor. |

`decideFlight` was not edited. Approvals call it.

`finance.adjust` is still in the permission map and still has no store action. The finance screen says no fee-adjustment action is defined. `documents.manage` is still unused. There is no upload and no metadata edit.

### Finance rules

`feeAccount` is unchanged. Outstanding is the course plan total minus that cadet’s payments. Overdue when outstanding is greater than 0 and `feeDueDate` is strictly before `DEMO_TODAY`. There is no tax, discount, or credit note.

`financeSnapshot` uses the prototype page totals, which are not the same formula as one cadet’s outstanding:

- Billed is the sum of each cadet’s plan total.
- Collected is the sum of every payment amount.
- Outstanding is `outstandingFees`.
- Overdue accounts is the count of overdue cadets.
- Expenses is the sum of expense amounts.

Seed figures: billed 12,400,000, collected 3,350,000, outstanding 9,050,000, expenses 605,000, overdue accounts 2 (Ishan Pillai, due 2026-09-15, and Ananya Rao, due 2026-09-01). Meera Thomas is not overdue because her due date is 2026-10-20. Neil is not overdue because outstanding is 0. New-cadet due date stays `2026-11-15`.

The finance page records an expense when `finance.manage` is present. Toast: `Expense recorded.` A payment is recorded on the cadet fees tab when `finance.manage` is present. Methods are Bank transfer, Card, and Cash. Date defaults to `DEMO_TODAY`. Toast: `Payment recorded. Collected and outstanding totals now include it.` A recorded payment is not a confirmed external settlement. No payment gateway is connected, and the page is not an accounting ledger.

Client filters on the account list (search on name, code, and plan, plus All versus Overdue) are extra. The prototype finance page has no filter. The expense list has no filter.

### Documents

The register lists workspace documents. Owner links use the existing record: cadet when `cadets.view`, aircraft when `fleet.view`, staff when `staff.view`. A course owner is text. There is no document detail route.

Toolbar filters are All, Pending, and Accepted, matching the prototype. Rejected rows remain in All. Search on title and category is extra.

Accept and Reject appear only when `documents.review` is present and the stored review is `Pending`. They set the stored label to `Accepted` or `Rejected`. Toast: `Review updated.` That label is not a claim that the file is authentic or regulator-verified.

No document has file bytes or a URL. The screen does not invent a download link. Copy: files are not stored in this browser. Cadet, staff, fleet, and maintenance profiles link to the same rows. They do not copy them.

### Approvals

The queue is the same pending flights as `pendingApprovals`. The only seed row is FLT-2403. Approve and Reject appear only when `flights.approve` is present. They open a comment dialog and call `decideFlight`. An empty comment shows `A comment is required.` Approve is still refused while blockers remain. The toast stays `Flight ${decision.toLowerCase()}.` Flight status transitions and conflict blockers were not changed.

Document rows on this page are links to `/documents?review=Pending`. There are no review buttons here.

Recorded decisions are flights that already store `approval` and are not awaiting approval, including FLT-2401 and cancelled FLT-2410. The prototype queue does not render this history. The React section is a read of the existing `approval` object. It does not decide those flights again.

### Notifications

Visibility matches `visibleNotifications`: a row is included when `userId` matches, otherwise when `audienceRole` matches the user’s role. The header shows the first six. Clicking one marks it read, then navigates. Mark all read marks only the actor’s visible rows.

Stored hrefs stay as prototype HTML paths. `notificationRoute` maps the known ones onto React routes. An unknown href is not a link. `portal-schedule.html` still opens the existing portal placeholder. `decideFlight` and `submitFlight` already call `notify`. After a flight change, notification and approval queries are invalidated with the flight queries. Payment, expense, and document review do not create notifications.

This is not real-time delivery, push, email, or SMS.

### Dashboard and profiles

Outstanding fees is shown only when `finance.view` is present and the operational summary is available. The value is `summary.outstandingFees`, formatted with `inr`. The hint says the accounts are illustrative and not an accounting ledger. Operations does not see the card. The four earlier cards and their visibility rules were not changed, including pending approvals for any operational summary.

Cadet profile fees and documents use the shared cadet, payment, and document records. Staff, aircraft, and maintenance pages link to the register when `documents.view` is present.

### Permissions checked

The role map was not expanded.

| Role | What this stage allows |
| --- | --- |
| Academy Administrator | Finance, including expense recording and payments. Document review. Approvals queue and flight decisions. |
| Operations Manager | Documents view. Approvals queue and Open flight. No finance. No Approve or Reject. No document review. |
| Chief Flying Instructor | Document review. Approvals queue and flight decisions. No finance. |
| Instructor | Documents view. No finance, approvals, or document review. No header notifications in the seed. |
| Maintenance Officer | Documents view. `documents.manage` still has no action. No finance, approvals, or document review. |
| Finance Officer | Finance view, expense recording, and cadet payments. Documents view. No document review and no approvals route. Sees the finance notification. |
| HR / Staff Coordinator | Documents view. No finance, approvals, or document review. |
| Super Admin | None of these routes. |
| Cadet | None of these routes. The cadet user still sees their own notification in the header. |

### Checks

`npm test`: 17 files, 87 tests, all passed. New coverage is in `workspaceStore.test.ts`, `financePages.test.tsx`, `officeAccess.test.tsx`, `documentPages.test.tsx`, and `approvalPages.test.tsx`. It covers finance totals and the overdue filter, expense validation and persistence, a cadet payment that refreshes collected fees without changing the stored due date, document filter, owner navigation, review label, and the absence of a download control, approval reject with a required comment and the stored decision, operations seeing the queue without decide buttons, notification mark-read and route, route denial, and loading, empty, and error states. Cadet, training, flight, fleet, maintenance, staff, and fuel tests still pass.

`npm run lint`: exit 0. The same eight `react/only-export-components` warnings remain: WorkspaceRepositoryProvider (3), AuthProvider, snackbar, confirm, and router (2). No new warning was added.

`npm run build`: succeeded. The existing chunk-size warning remains. The main bundle is about 1,320 kB minified.

A desktop browser pass was not run. This environment has no browser automation tool, and Playwright is not installed. The finance, document, approval, and notification journeys above were exercised with Vitest, happy-dom, and React Testing Library. Browser storage on this machine was not cleared.

### Customization points

These are prototype constants, not a settings screen:

- Payment methods Bank transfer, Card, and Cash.
- Expense category is free text. It is not a configured list.
- Expense branch `Kochi Training Base` and status `Recorded`.
- Document review filters All, Pending, and Accepted.
- Notification href map in `notificationRoute`.
- `finance.adjust` and `documents.manage` remain permissions without a mutation.

### Domain questions still open

- Whether collected and outstanding should ever be reconciled. The prototype sums them differently, and this stage kept both formulas.
- Whether `listFeeAccounts` should stay on `visibleCadets`. No current finance role is an instructor. The helper is the existing cadet visibility rule.
- Whether the extra account search and document title search should stay.
- Whether recorded decisions should stay on the approvals page. The prototype queue does not show them.
- Whether `finance.adjust` and `documents.manage` should gain actions later. They were not invented here.
- Whether notification generation should later move to the server. The header only reads rows the store already writes.

### Architectural notes

- Approvals import `refreshAfterFlightChange` from the flight feature. Flights do not import approvals. Cadet profile does not import finance.
- No second approval table was added. Pending and history both read the flight.
- No generic workflow engine and no user-defined fields were added.
- Transport DTOs were not added. Repository methods still return domain types. A future HTTP adapter can map them.
- Reports, audit, settings edits, and demo users are recorded in section 17. Portal content and a backend were not started.

## 17. Stage 7 implementation record

Reports, the audit log, academy settings edits, and demo-user creation now use the Stage 1 workspace. The HTML prototype was not modified. Stages 1–6 were left in place. The cadet portal, a backend, payment gateway, file storage, and real authentication were not started in Stage 7. The portal is recorded in section 18.

Frontend role checks remain a demonstration. They are not a security boundary. The audit list is not tamper-proof and is not a compliance record.

### Routes and screens

| Route | Permission | Screen |
| --- | --- | --- |
| `/reports` | `reports.view` | `ReportsPage` |
| `/audit` | `audit.view` | `AuditPage` |
| `/settings` | `settings.manage` | `SettingsPage` |
| `/users` | `users.manage` | `UsersPage` |

Feature folders: `features/reports`, `features/audit`. Settings and users stay in their existing folders. Report tables are built in `reportRules.ts`. Audit search is in `auditRules.ts`.

### Repository methods

| Method | Behaviour |
| --- | --- |
| `reportRecords` | Cadets, courses, flights, aircraft, staff, fuel transactions, documents, payments, fee plans, and audit rows. The page does not read fixtures. |
| `saveAcademySettings` | Port of `saveAcademySettings`. Name is required. An empty currency becomes `INR`. An empty time zone keeps the stored zone. Branch, country, and mode are not written. |
| `addUser` | Port of `addUser`. Name, email, and a known role are required. Email is stored in lower case. A duplicate email is refused. No password is stored. |

`listAudit` was already present. Supported mutations from earlier stages already call `remember`. Settings and add-user do the same. No historical events were invented for actions that were not recorded.

### Reports

The eight prototype reports are Cadet roster, Training progress, Flight hours, Aircraft utilisation, Fuel transactions, Fee collection, Document expiry, and Audit activity.

Calculations are the existing ones: `recordedCadetHours`, `progressPercent`, completed-flight `actual.hours`, `recordedAircraftHours`, `feeAccount`, and `formatDate`. Fee collection is paid and outstanding. It is not revenue. Aircraft hours include opening hours plus completed flights and are not a utilisation rate. Aircraft status is a planning label, not a maintenance release. A document review label is not authenticity or regulator verification.

Filters are extra. They use fields already on the records: course and cadet status on the roster, cadet status on progress, date, aircraft, and instructor on flight hours, aircraft status on the fleet report, date and type on fuel, course on fees, review on documents, and a text search on the audit report. Defects, work orders, expenses, and availability blocks are not prototype reports and were not added.

Counts in the report are drawn as bars from the filtered rows. There is no chart library. The CSV download is the filtered rows, with a header row the prototype export did not have. The file name stays `airnotix-demo-report.csv`. The button is shown only for `reports.export`. Anyone with `reports.view` sees every report, including fees, which matches the prototype page. That is not a security boundary.

### Audit

The page lists when, actor, role, action, summary, and reason. `audit-1` and `audit-2` are marked Seed. Later rows are marked Recorded. Search and the action list are extra. They use values already stored on the events. Passwords are not written. The page says the list is not tamper-proof and is not a compliance record.

### Settings

The form edits academy name, currency, and time zone. Branch is shown and not edited. Country and mode stay as stored. Copy matches the prototype: later demo records can use the new values, and historical records keep what they were saved with. There is no workflow builder, no custom-field editor, and no tenant switch. Toast: `Settings saved in this browser.`

### Users

The directory lists name, email, and role. Account status is not a stored field. Every row is labelled Demonstration. Choosing a role shows that role’s existing permission list and says a production API must enforce it. Add user uses the nine existing roles. Existing users are not edited or removed, so this screen cannot take access away from the current administrator. The shared password remains `demonstration` and is not saved on the user.

Sign-in still checks that constant. It resolves the original nine accounts first, then users stored on `airnotix-web-workspace-v1`. It does not read the HTML prototype key. This is still demonstration sign-in, not account provisioning.

### Permissions checked

The role map was not expanded.

| Role | What this stage allows |
| --- | --- |
| Academy Administrator | Reports, including CSV. Audit. Settings. Add a demo user. |
| Operations Manager | Reports, without CSV. No audit, settings, or users. |
| Chief Flying Instructor | Reports, without CSV. No audit, settings, or users. |
| Instructor | None of these routes. |
| Maintenance Officer | Reports, without CSV. No audit, settings, or users. |
| Finance Officer | Reports, including CSV. No audit, settings, or users. |
| HR / Staff Coordinator | Reports, without CSV. No audit, settings, or users. |
| Super Admin | Reports without CSV. Audit, settings, and add a demo user. |
| Cadet | None of these routes. |

### Checks

`npm test`: 18 files, 95 tests, all passed. New coverage is in `workspaceStore.test.ts` and `governancePages.test.tsx`. It covers roster and flight-hour filters, the completed-hours total, CSV contents, export hidden without `reports.export`, an empty report and a load error, seed versus recorded audit rows, audit search and action filter, settings validation and persistence with the branch unchanged, add-user validation, the administrator remaining, a shared-password sign-in for the new directory row, and route denial. Stages 1–6 tests still pass.

`npm run lint`: exit 0. The same eight `react/only-export-components` warnings remain: WorkspaceRepositoryProvider (3), AuthProvider, snackbar, confirm, and router (2). No new warning was added.

`npm run build`: succeeded. The existing chunk-size warning remains. The main bundle is about 1,339 kB minified.

A desktop browser pass was not run. This environment has no browser automation tool, and Playwright is not installed. The journeys above were exercised with Vitest, happy-dom, and React Testing Library. Browser storage on this machine was not cleared.

### Domain questions still open

- Whether fee rows on the report should later be hidden from roles without `finance.view`. The prototype shows them to anyone who can open Reports.
- Whether the extra filters, column headings, count bars, and CSV header should stay.
- Whether defects, work orders, expenses, and staff availability should become reports. They were not in `renderReports`.
- Whether a stored account status should exist. The prototype user has none.
- Whether country, mode, `branchId`, and `tagline` should become editable. The prototype form does not save them.

### Architectural notes

- Report rules call the existing calculation functions. They do not keep a second copy of cadet, flight, or payment records.
- Audit events are still appended by `remember` inside the store. The audit page only reads them.
- No generic workflow engine and no user-defined fields were added.
- The cadet portal is recorded in section 18. A backend was not started.

## 18. Stage 8 implementation record

The cadet portal now reads the signed-in demonstration user’s linked cadet from the Stage 1 workspace. The HTML prototype was not modified. Stages 1–7 were left in place. A backend, payment gateway, file storage, and real authentication were not started.

The portal is demonstration isolation. It is not server-side security. A cadet cannot approve a flight, review a document, record an assessment, or take a payment.

### Routes and navigation

The cadet role already uses the portal sidebar. Labels now follow the portal, and the paths that already existed were kept.

| Route | Page |
| --- | --- |
| `/portal` | Overview |
| `/portal/profile` | My Profile |
| `/portal/training` | My Training |
| `/portal/schedule` | My Flights |
| `/portal/schedule/:flightId` | One released flight |
| `/portal/documents` | My Documents |
| `/portal/fees` | My Fees |
| `/portal/notifications` | Notifications |

All of these stay behind `portal.view`. No permission was added. Documents and fees were not pages in the HTML portal. They are read-only views of records the workspace already stores for that cadet.

The signed-in user’s `cadetId` is the only lookup. A flight id in the URL is opened only when that flight is already in this cadet’s approved or completed list.

### Repository method

`portalHome(user)` returns one `PortalSnapshot` or `null`.

Null means the user has no `cadetId`, or that id is not a cadet. The page then says no cadet profile is linked, using the prototype sentence that points at Aarav Menon.

The snapshot includes that cadet’s profile fields, course, syllabus, illustrative progress, recorded hours, approved and completed flights, documents whose `ownerId` is the cadet, that cadet’s payments and `feeAccount`, assessments without comments, and notifications whose `userId` is the signed-in user.

It does not include other cadets, drafts, flights awaiting approval, internal flight notes, or assessment comments. The prototype training page says internal comments are not shown.

Progress, hours, and fees use `progressPercent`, `recordedCadetHours`, and `feeAccount`. They are not recalculated in the page.

### What the cadet can do

| Area | Reads | Does not do |
| --- | --- | --- |
| Overview | Next approved flight, progress, hours, pending document count, outstanding fees, unread notes | Approve, schedule, or pay |
| Profile | Code, name, email, phone, course, batch, joining date, status | Edit. No photo is stored. Date of birth is stored and is not on the prototype profile, so it is not shown. |
| Training | Syllabus items as Recorded or Outstanding from `completedItemIds`. Assessment outcome, date, and assessor | Record or change an assessment |
| Flights | Approved and completed flights, with aircraft code, instructor name, and completed hours | Create, reschedule, approve, reject, or complete |
| Documents | Title, category, recorded date, expiry, review label | Accept, reject, upload, or download |
| Fees | Plan, billed, recorded payments, outstanding, due date, overdue | Record a payment or start a checkout |
| Notifications | Notes with this user’s id. Mark one read, or mark all read, through the existing methods. A link is shown only when it maps to a `/portal` route | Email, SMS, or push |

Header notifications are unchanged. They still use `visibleNotifications`, which also matches audience role. The portal list follows `renderPortalNotes` and matches `userId` only.

### Checks

`npm test`: 19 files, 100 tests, all passed. New coverage is in `workspaceStore.test.ts` and `portalPages.test.tsx`. It covers Aarav’s progress, hours, and outstanding fees, the next approved flight, hiding another cadet’s flight and a direct flight URL, training items and an assessment without its comment, documents without a download or review action, a payment recorded on the cadet account appearing in My Fees, notification mark-read, an unlinked cadet, a load error, and a non-cadet denied at `/portal`. Stages 1–7 tests still pass.

`npm run lint`: exit 0. The same eight `react/only-export-components` warnings remain. No new warning was added.

`npm run build`: succeeded. The existing chunk-size warning remains. The main bundle is about 1,354 kB minified.

A desktop browser pass was not run. This environment has no browser automation tool, and Playwright is not installed. The journeys above were exercised with Vitest, happy-dom, and React Testing Library. Browser storage on this machine was not cleared.

### Domain questions still open

- Whether date of birth should appear on the cadet profile. It is stored. The prototype profile does not show it.
- Whether documents and fees belong on the portal. The prototype portal did not have those pages. This stage shows the existing rows and does not add actions.
- Whether a cadet should see approved flights dated before the demo day. The prototype schedule includes every approved and completed flight, so those rows are listed under earlier approved flights.
- Whether illustrative progress should ever be treated as course completion. The page says it should not.

### Architectural notes

- The portal does not import cadet, flight, finance, or document pages. It reads `portalHome`.
- Marking a notification read refreshes both the header list and the portal query.
- There is no profile image, payment checkout, file preview, or flight-release control.
- A backend was not started.

## 19. Dropdown standardization

This pass changes presentation only. Option values, labels, defaults, change handlers, validation, permissions, and filters are the same as before.

### Inventory

Every selection control in `apps/web` was a Material `TextField` with `select`. Most used a native HTML list (`slotProps.select.native`). Two already used Material menu items: the cadet register Course and Status filters, and the sign-in demonstration account. The cadet portal has no dropdown. No `Autocomplete`, multi-select, or custom dropdown menu existed.

| Location | Control | Now |
| --- | --- | --- |
| Sign-in | Demonstration account | `AppSelect` |
| Cadet register | Course, Status | `AppSelect` |
| Cadet enrolment and edit | Course, Instructor | `AppSelect` |
| Cadet fees | Payment method | `AppSelect` |
| Training progress | Cadet, Training item, Outcome | `AppSelect` |
| Syllabus item form | Item type | `AppSelect` |
| Flight schedule | Status, Aircraft | `AppSelect` |
| Flight form | Cadet, Training item, Instructor, Aircraft, Flight type | `AppSelect` |
| Flight completion | Outcome, Attendance | `AppSelect` |
| Fleet register and aircraft status | Status | `AppSelect` |
| Maintenance defect form | Aircraft, Severity | `AppSelect` |
| Staff availability | Kind | `AppSelect` |
| Fuel transaction | Tank, Type | `AppSelect` |
| Finance accounts | Account (all or overdue) | `AppSelect` |
| Reports | Course, Status, Aircraft, Instructor, Type, Review | `AppSelect` |
| Audit | Action | `AppSelect` |
| Users | Role | `AppSelect` |
| Top bar | Account and role switcher | Existing `Menu`. Theme only. |
| Header bell | Notification list | Existing `Menu`. Theme only. |

### Shared component and theme

`AppSelect` in `src/components/forms/AppSelect.tsx` is a labelled Material `Select`. It takes a label, the current value, options, and a change handler, plus required, disabled, error, helper text, and width. The menu uses the default portal so it is not clipped by cards, dialogs, or tables.

Theme additions in `src/theme/theme.ts`, using the existing tokens:

- `MuiMenu` paper uses the 8px radius, the line border, and a light navy shadow.
- `MuiMenuItem` uses a 40px row, and the selected row uses `limeSoft` on navy.

There is no dark theme in the app, so none was added. Input borders, focus, and error colors were already on `MuiOutlinedInput` and the error palette.

### Left unchanged

- Date and time fields stay `TextField` with `type="date"` or `type="time"`. There is no date-picker package.
- Settings currency and time zone stay free-text fields. They were not dropdowns, and no option list was invented.
- Finance category, approval comments, and document search stay text fields.
- Document review filters stay buttons.
- The account menu and the notification menu stay action menus. They were not turned into form dropdowns.
- `Autocomplete` was not added. The demo lists are short, and search already lives in the adjacent search fields. A searchable control would change how a value is chosen and submitted.
- No control was a multi-select, so none was added.
- The HTML prototype was not modified.

### Checks

`npm test`: 20 files, 102 tests, all passed. New coverage is `AppSelect.test.tsx`. Existing form and filter tests now open the Material menu and choose the same option labels as before.

`npm run lint`: exit 0. The same eight `react/only-export-components` warnings remain. No new warning was added.

`npm run build`: succeeded. The existing chunk-size warning remains. The main bundle is about 1,352 kB minified.

A desktop browser pass was not run. This environment has no browser automation tool, and Playwright is not installed. Dropdown behavior was exercised with Vitest, happy-dom, and React Testing Library. Browser storage on this machine was not cleared.

## 20. Layout refinement

The empty space came from the shell, not from the sidebar. `AppShell` placed every page in a centered box with `maxWidth: 1200`. The main column already sits in the space beside the drawer, so collapsing the sidebar widened that column, but the 1200px cap stayed put and left the extra width blank. The dashboard then locked summary cards to four columns from the `lg` breakpoint, so Outstanding fees sat alone even when a fifth card would fit.

### Shared layout

Every authenticated route, including list, detail, create, edit, tab, portal, settings, and access-limited screens, uses one frame. `workspaceMaxWidth` in `src/components/layout/contentWidth.ts` is 1680px. The page is 100% of the main column until that maximum, then it centers. Horizontal padding is 16px on small screens, 20px from `sm`, and 24px from `md`. Titles, back links, tabs, filters, and tables share that left edge, so opening a record does not shift the page inward. There is no left margin tied to the sidebar width. The drawer and its paper share a 180ms width transition so the main column follows the sidebar.

Forms stay left-aligned inside that frame and stop at 1120px (`formPanelSx`): cadet enrolment and edit, flight schedule and completion, settings, assessment, expense, fuel transaction, defect, aircraft status, staff availability, and add user. Sign-in stays its own 440px card outside the shell.

Profile and flight facts use `detailGridSx`, which wraps from the actual content width rather than a viewport breakpoint. The same pattern is on the cadet overview, aircraft facts, portal profile, portal flight, portal fees, fuel tanks, report summary cards, and the portal overview.

### Summary cards

`SummaryGrid` uses `repeat(auto-fit, minmax(min(100%, 210px), 1fr))`. Dashboard, finance, and maintenance use it. Five cards share one row when the content width can give each card about 210px. Narrower widths wrap. Cards in a row stay equal width. Portal overview cards use the same kind of grid with a 260px minimum so the sentences can wrap without waiting for the viewport `lg` breakpoint.

### Left unchanged

Routes, navigation, permissions, records, and the HTML prototype. The flight week still scrolls horizontally so seven days keep a usable column. Filter bars already wrap with the existing flex layout. Tables still use `RecordGrid`, now at the content width.

### Checks

`npm test`: 21 files, 103 tests, all passed. `contentWidth.test.ts` checks that list, detail, create, edit, settings, and portal routes share one shell maximum.

`npm run lint`: exit 0. The same eight `react/only-export-components` warnings remain. No new warning was added.

`npm run build`: succeeded. The existing chunk-size warning remains. The main bundle is about 1,352 kB minified.

A desktop browser pass was not run. This environment has no browser automation tool, and Playwright is not installed. Width choice was checked as a pure function. Viewport appearance at 1920, 1600, 1366, 1024, 768, 390, and 360 was not viewed in a browser.

### Known limits

- Between about 880px and 1100px of content width, five summary cards can wrap as four plus one. Forcing five columns there would make the cards too narrow.
- Visual balance with the sidebar expanded and collapsed still needs a manual browser pass. Unit tests confirm that list, detail, create, and portal routes share one shell maximum. They do not render those widths in a browser.

## 21. Role-specific dashboards

Each staff role now opens its own home on `/dashboard`. The cadet home stays `/portal`. The page reads the same workspace records as the inner modules. It does not keep a second set of cadets, flights, fees, or defects, and it does not hard-code fixture totals in the components.

`dashboardSummary` in `calculations.ts` is unchanged in behaviour: its operational flag is still true when the role has `cadets.view` or `flights.view`. The dashboards do not use that flag. Each card and section is loaded only for the matching role, and each action is shown only when `canUser` already allows it. Those checks are demonstration UI only. The future .NET API must enforce the same authorization. A client-supplied tenant id is not used as a security boundary.

### What each role sees

**Super Admin.** Demonstration account count, how many roles have an account (`listDemoUsers`), the newest audit events (`listAudit`), and the academy name and branch (`getAcademy`). Quick actions: Users & Roles, Academy Settings, Audit Log, Reports. Empty copy when there are no audit events or unread notifications. No cadet, flight, aircraft, or fee counts.

**Academy Administrator.** Active cadets, on-hold cadets, flights on the demo day, aircraft whose planning status is Available, aircraft that are not Available, pending approvals, outstanding fees, and overdue accounts. Sections: today's flights, pending approvals with the existing approve and reject dialog (comment required, planning blockers still refuse approval), open defects, open work orders, pending documents, low-fuel tanks, unread notifications. Quick actions: Cadets, Flight Operations, Approvals, Finance, Fleet. September completed hours are not shown. Planning status is not an airworthiness decision. Fee figures stay illustrative.

**Operations.** Active cadets, flights today, aircraft available, and pending approvals. Sections: today's flights, drafts, planning blockers and warnings from `schedulingIssues` on drafts and today's non-cancelled flights, aircraft that are not Available with any stored restriction, upcoming Leave blocks, upcoming Unavailable blocks (kept separate from the staff availability label), low fuel, and pending approvals as read-only rows. Quick actions: Schedule flight when `flights.create` is present, Flight Operations, Fleet, Fuel. No fee figures and no approve or reject buttons.

**Chief Flying Instructor.** Active cadets, flights today, and pending approvals. Sections: pending approvals with the same decide workflow, illustrative cadet progress, pending documents, upcoming approved flights, and saved assessments labelled as history rather than a queue. Unread notifications. Quick actions: Approvals, Training progress, Cadets. No fee figures and no aircraft-availability KPI, because this role does not have `fleet.view`. Progress is not a licence or course-completion decision.

**Instructor.** Personal to the signed-in staff id. Assigned active cadets (`listCadets` already filters `instructorId`), upcoming assigned flights on or after the demo day that are not completed, cancelled, or rejected (drafts included), recorded hours and illustrative progress for those cadets, the instructor's own qualification expiry as information only, and completed assigned flights whose `actual.followUp` is true. Quick actions: My cadets, Flight Operations, Training progress. No academy-wide cadet count, aircraft availability, or pending approvals. The query key is `['dashboard', 'instructor', userId, staffId]` so it cannot reuse an academy-wide dashboard result. Flight-completion assignment checks are unchanged. An instructor account with no staff id sees an empty state instead of academy records.

**Maintenance.** Aircraft available, open defects (`openDefects`), open work orders (`openWorkOrders`), and aircraft not Available. Sections: open defects, open work orders assigned to the signed-in officer, all open work orders, planning status and restriction text, aircraft-owned documents, unread notifications. Quick actions: Maintenance, Fleet. A release note is not an authorisation to fly.

**Finance.** Billed, collected, outstanding, overdue accounts, and expenses from `financeSnapshot`. Fee accounts with overdue rows first (`listFeeAccounts`), recent payments (`listPayments`), recent expenses (`listExpenses`), unread notifications. Quick actions: Finance, Cadets, Reports. No flight, aircraft, or approval metrics. Recorded payments are not a confirmed settlement, and the figures are not an accounting ledger.

**HR / Staff Coordinator.** Staff count and qualification dates before the demo day, labelled informational and fictional. Availability labels on the staff record, upcoming Leave blocks, upcoming Unavailable blocks, staff whose qualification date is before the demo day, pending staff documents, unread notifications if any. Quick actions: HR & Staff, Documents. Leave and Unavailable blocks are not merged with the availability label, and there is no single "unavailable today" count.

**Cadet.** `/portal` is unchanged except for a completed-flight count and a short completed-flight list derived from the existing `portalHome` flights via `completedFlights`. The snapshot stays scoped to the linked cadet. Progress, hours, fees, and payment-settlement caveats remain.

### Data and cache

Selectors live in `dashboardRules.ts` and call the existing domain helpers (`illustrativeProgress`, `recordedHoursForCadet`, `isLowStock`, `openDefects`, `openWorkOrders`, `qualificationBeforeDemoDay`, `schedulingIssues`). Role queries in `dashboardQueries.ts` use TanStack Query keys `['dashboard', role, userId]` (maintenance and instructor also include `staffId`). Mutations that already refreshed `['dashboard']` still do. The same prefix is now invalidated after maintenance, fuel, document, user, academy-settings, training-progress, and cadet-form saves.

Quick actions and notification links only point at routes the current permission map already allows. The static status legend is not on these dashboards; status chips stay on the record rows.

### Reports visibility

`canViewReport` hides Fee collection unless the role has `finance.view`, and hides Audit activity unless the role has `audit.view`. Other reports stay available to anyone with `reports.view`. The report query is disabled when the kind is not allowed, and its key includes the user id. The page also refuses to render rows, cards, bars, filters, or the CSV button unless the kind is allowed. CSV still requires `reports.export`. The empty state says that totals or events are not shown. This is a demonstration UI check. The future API must enforce the same rule.

### Checks

`npm test` in `apps/web`: 23 files, 116 tests, all passed. Coverage includes each of the nine roles, instructor assignment scope, finance without flight metrics, maintenance assigned-to-me versus all open orders, approval comment validation, cadet completed flights, and fee and audit report gating.

`npm run lint`: exit 0. The same eight `react/only-export-components` warnings remain (`snackbar.tsx`, `confirm.tsx`, `AuthProvider.tsx`, `router.tsx`, `WorkspaceRepositoryProvider.tsx`). No new warning was added.

`npm run build`: succeeded (`tsc -b` and Vite). The existing chunk-size warning remains. The main bundle is about 1,387 kB minified.

Browser-level testing was not performed. The browser automation tools were not available in this session. Role content was checked with Vitest and React Testing Library against the untouched fixture, not by signing in through a browser at desktop and mobile widths.

### Known limits

- Demonstration records are not production data. The demo day stays 29 September 2026.
- Planning status, restriction windows, and release notes are not airworthiness or flight-release decisions.
- Illustrative progress and recorded hours are not a licence, course certificate, or regulatory hour total.
- Fee accounts, payments, and expenses are illustrative. A recorded payment is not a confirmed settlement.
- Qualification dates before the demo day are fictional labels, not a legal or licensing check.
- The instructor dashboard includes assigned drafts on or after the demo day. The fixture has no completed assigned flight with follow-up required, so that section is empty for the demonstration instructor.
- Frontend permission checks do not secure the workspace. Equivalent authorization has to be enforced by the future API.

## 22. Dashboard visual redesign

The role dashboards and the cadet portal home now share one visual system. The records, permissions, and calculations are the same as section 21. Recharts is not a dependency of this app, so the summaries are drawn from the loaded records with compact bars, a segmented status strip, progress meters, and a flight scale. No historical series was invented.

### Visual system

`dashboardWidgets.tsx` provides the header, metric tiles, two-column layout, sections, status bars, the demo-day flight scale, progress rows, and outstanding-balance bars. Tiles use a navy, sky, teal, amber, or rose edge. Lime is limited to the available-aircraft tile and the primary quick action. Sky (`#245C86`) and teal (`#1A6B64`) were added to the token file for these summaries. Text stays navy or muted so colour is not the only status cue. Each tile can open the existing filtered list when that page already reads the query, such as `/cadets?status=Active`, `/fleet?status=Available`, and `/flight-operations?view=day&date=2026-09-29`.

The header shows the academy and base when that dashboard already loads academy settings, the demo day, a Refresh button that refetches the role query, and the role’s quick actions. There is no date-range control, because the repository methods do not accept an arbitrary range. Caveats sit on the tile or section they qualify.

### What each view emphasises

Academy, operations, and instructor dashboards lead with the schedule scale and the items that need attention. Academy also shows cadet status and aircraft planning status from the loaded records. Operations keeps approvals read-only and separates planning blockers from warnings. The instructor view stays on assigned cadets and assigned flights.

Chief flying instructor, maintenance, finance, HR, and super admin use the same tiles and sections. Finance compares outstanding balances with horizontal bars and does not draw a payment trend. HR shows availability labels separately from leave and unavailable blocks. The cadet portal keeps its existing cards and adds a progress meter for the stored illustrative percentage.

### Instructor cadet names

Flights FLT-2404 and FLT-2405 are assigned to the demonstration instructor, but the cadets on those flights are not in his assigned cadet list. `getCadet` returns null for those ids, so the dashboard does not guess a name. The row says “Cadet outside assigned list”. Assigned cadet Aarav Menon is still named.

### Checks

`npm test` in `apps/web`: 23 files, 117 tests, all passed. The extra test checks status counts and that a missing cadet name is not replaced with another cadet.

`npm run lint`: exit 0. The same eight `react/only-export-components` warnings remain. No new warning.

`npm run build`: succeeded. The existing chunk-size warning remains. The main bundle is about 1,400 kB minified.

Browser-level testing was not performed. Browser automation was not available in this session.

### Known limits

- Bars and the flight scale describe the current workspace. They are not trends, targets, or live operations.
- A planning status, defect, or release note is still not an airworthiness decision or an approval to fly.
- Illustrative progress is still not a licence or a course certificate.
- Fee bars are illustrative balances, not a ledger.
- The flight-operations register can still show “Unknown cadet” for an instructor, because that page uses the same assigned-cadet list. Only the instructor dashboard wording was changed.
