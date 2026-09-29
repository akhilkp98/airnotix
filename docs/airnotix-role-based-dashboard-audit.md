# Airnotix role-based dashboard audit

Audit of the React application in `apps/web`. No application source, routes, permissions, data, tests, or other documentation were changed. This file is the audit report only.

Figures below are from the untouched workspace fixture in `apps/web/src/domain/fixtures.ts`, as asserted by `dashboardSummary` in `calculations.test.ts`. The running app reads `localStorage` key `airnotix-web-workspace-v1`, so a browser that has already changed records will show different numbers. The demo day is the constant `DEMO_TODAY` (`2026-09-29`), not the computer clock. The shared demonstration password is `demonstration`.

Frontend role checks hide navigation and actions. They are not access control.

---

## 1. Executive summary

Eight roles open one shared staff page, `/dashboard` (`DashboardPage`). The cadet does not. The cadet home is `/portal` (`PortalOverviewPage`). There is no per-role dashboard component.

The staff page always renders the same four labels — Active cadets, Flights today, Aircraft available, Pending approvals — plus a static status-label legend. A fifth card, Outstanding fees, appears only when `finance.view` is present and the summary is operational. None of the cards are links. The page has no table, chart, schedule, notification list, pending-task list, or quick action.

`dashboardSummary` returns live workspace counts when the signed-in role has `cadets.view` **or** `flights.view`. The function comment and the migration notes say “both”. The code uses **or**. On the fixture that produces:

| Card | Untouched fixture |
| --- | --- |
| Active cadets | 6 |
| Flights today | 3 |
| Aircraft available | 2 |
| Pending approvals | 1 |
| Outstanding fees | ₹90,50,000 (`9050000`) |

Those five numbers are academy-wide. They are not filtered by the signed-in user, assigned cadets, or assigned flights. `completedHoursThisMonth` is calculated (`1.4` on the fixture) and is not shown.

Roles without `cadets.view` and without `flights.view` get an empty operational summary. Super Admin and HR then see an em dash on every count. Maintenance has `fleet.view`, so Aircraft available is filled from `listAircraft` (2 on the fixture) while the other three counts stay blank.

Main gaps:

- One layout serves eight different jobs.
- Instructor cadet lists are assignment-scoped; the dashboard is not.
- Finance sees flight, approval, and aircraft counts without `flights.view`, `approvals.view`, or `fleet.view`.
- Pending approvals is shown to Instructor, who cannot open `/approvals`.
- Reports, including Fee collection, are available to every role with `reports.view`, including roles without `finance.view`.
- Maintenance, finance, training, fuel, staff, and document summaries already exist on their own pages and are not brought onto the dashboard.
- The cadet portal overview is already a personal dashboard. The staff page is not.

---

## 2. Current dashboard by role

Shared staff chrome, not part of the dashboard body:

- Sidebar items come from `STAFF_NAV`, filtered by `filterNav` and `canUser`. A visible item is one permission. Actions inside the module use narrower permissions.
- The header bell uses `listNotifications` and `visibleNotifications`. A row is included when `userId` matches, otherwise when `audienceRole` matches. It shows the first six. This is not on the dashboard page.
- Header search is shown when the role has `cadets.view`, `flights.view`, or `fleet.view`. Submitting it only shows the toast “Search will be available when academy records are connected.”
- The account menu can switch among demonstration users. That is a demo control, not a permission.

Opening `/dashboard` without `dashboard.view` renders `AccessDenied` (“Access limited”). The cadet hits that page if the address is opened directly. Home for a cadet is `/portal`.

Cards do not navigate. Data source for the operational path is `useDashboardQuery` → `repository.dashboardSummary(actor)` → `dashboardSummary` in `calculations.ts`. Aircraft available for a non-operational role with `fleet.view` is a separate query, `listAircraft`, counting `status === 'Available'`.

The status-label block lists six fixed strings: Active, On Hold, Awaiting approval, Draft, Maintenance, Release recorded. They are not counts and do not change with the workspace.

### 2.1 Super Admin

| | |
| --- | --- |
| Demo user | Anil Rao, `anil.rao@arionix.example`, `user-super`, role `super-admin`. No `staffId`. |
| Other users of this role | None in the seed. A user added on Users & Roles with this role would see the same page. The summary is role-based, not user-based. |

**Cards**

| Card | Untouched value | Source | Rule | Live? | Who sees the number |
| --- | --- | --- | --- | --- | --- |
| Active cadets | — | `dashboardSummary`, `operational: false` | Role lacks `cadets.view` and `flights.view`, so counts are zeroed and the page prints an em dash. Hint: “Not shown for this role”. | The zero is computed; the page hides it. | Every Super Admin. |
| Flights today | — | Same | `flightsOnDate` is not applied. | Same | Every Super Admin. |
| Aircraft available | — | Same, and the fleet fallback is off | No `fleet.view`, so `listAircraft` is not called. | Same | Every Super Admin. |
| Pending approvals | — | Same | `pendingApprovals` is not applied. | Same | Every Super Admin. |
| Outstanding fees | Absent | Card is not rendered | Requires `finance.view` and an operational summary. Super Admin has neither. | — | — |

**Sections**

| Section | State |
| --- | --- |
| Tables | Absent |
| Charts | Absent. September completed hours (`1.4`) is on the summary object and is not rendered. |
| Recent activity | Absent on the page. Header notifications: none in the seed (`audienceRole` is never `super-admin`). |
| Upcoming schedule | Absent |
| Pending tasks | Absent |
| Alerts | Absent, other than the static legend |
| Quick actions | Absent. Cards are not links. |
| Status labels | Present. Static chips, same for every staff role. |

**Scope.** Role only. Not the signed-in user, not assignments. Academy name in the subtitle comes from `getAcademy` (fixture default Northstar Flight Academy, Kochi Training Base).

**Navigation** (`dashboard.view`, `reports.view`, `settings.manage`, `users.manage`, `audit.view`):

| Item | Route |
| --- | --- |
| Dashboard | `/dashboard` |
| Reports | `/reports` |
| Academy Settings | `/settings` |
| Users & Roles | `/users` |
| Audit Log | `/audit` |

No Cadets, Training, Flight Operations, Fleet, Maintenance, Fuel, Finance, HR, Documents, or Approvals. Search is hidden. Reports still includes Fee collection, Flight hours, and the other seven report types. Export is hidden (`reports.export` is absent).

**Limits.** The page does not summarise users, settings, or audit, which are the modules this role can open. Reports expose operational and fee rows this role cannot open as modules.

### 2.2 Academy Administrator

| | |
| --- | --- |
| Demo user | Meera Krishnan, `meera.krishnan@northstar.example`, `user-admin`, `staffId` `staff-meera`. |
| Other users | None in the seed. |

**Cards.** Operational summary is on. All five cards show numbers. Outstanding fees is included because `finance.view` is present.

| Card | Fixture value | Rule |
| --- | --- | --- |
| Active cadets | 6 | `cadets` with `status === 'Active'`. Not instructor-filtered. |
| Flights today | 3 | Flights on `2026-09-29` whose status is not `Cancelled`. |
| Aircraft available | 2 | Aircraft with planning status `Available`. Hint states this is not an airworthiness decision. |
| Pending approvals | 1 | Flights with status `Awaiting approval`. |
| Outstanding fees | ₹90,50,000 | Sum of each cadet’s plan total minus that cadet’s payments. Hint: illustrative, not a ledger. |

`completedHoursThisMonth` is `1.4` and is not shown.

**Sections.** Same as Super Admin: legend only. No table, chart, schedule, activity, or quick action on the page. Header notification seed: `nt-2`, “Flight awaiting approval”, unread, links to `/approvals`.

**Scope.** Academy-wide. Meera’s `staffId` is not used by `dashboardSummary`.

**Navigation.** `ROLE_PERMISSIONS['academy-admin']` is every staff permission except `maintenance.release_record`. Sidebar: every `STAFF_NAV` item. Search is shown and is still a placeholder.

Actions this role can take inside modules, beyond view: create and update cadets, configure and assess training, create, update, submit, approve, and complete flights, manage fleet, record maintenance (not an authorised-release record), manage fuel, manage and adjust finance, manage staff, review documents, export reports, edit settings, add demo users. The dashboard itself offers none of these.

**Limits.** The richest permission set still lands on the same four-count page as Operations. Approvals, finance totals, fleet blockers, and training progress stay on other routes.

### 2.3 Operations Manager

| | |
| --- | --- |
| Demo user | Kabir Nair, `kabir.nair@northstar.example`, `user-ops`, `staffId` `staff-kabir`. |
| Other users | None in the seed. |

**Cards.** Operational, no `finance.view`. Four numbers match Academy Administrator (6, 3, 2, 1). Outstanding fees is not rendered.

**Sections.** Legend only. No schedule strip, conflict list, or approval queue on the page. Header notifications: no seed row for `operations`.

**Scope.** Academy-wide, not Kabir’s assignments.

**Navigation**

| Item | Route | Relevant extra checks |
| --- | --- | --- |
| Dashboard | `/dashboard` | |
| Cadets | `/cadets` | View only. No create or status change. |
| Training & Knowledge | `/training/courses` | View only. No configure or assess. |
| Flight Operations | `/flight-operations` | Create, update, submit. No approve, no complete. |
| Fleet | `/fleet` | View only. No status change (`fleet.manage` absent). |
| Maintenance | `/maintenance` | View only. No defect, work-order, or release actions. |
| Fuel | `/fuel` | View and record transactions (`fuel.manage`). |
| HR & Staff | `/hr` | View only. No availability edit. |
| Documents | `/documents` | View only. No review. |
| Notifications & Approvals | `/approvals` | Can open a flight. Approve and Reject require `flights.approve`, which this role does not have. |
| Reports | `/reports` | No CSV export. Includes Fee collection. |

Hidden: Finance, Settings, Users, Audit.

**Limits.** The role’s daily work (schedule, conflicts, aircraft and instructor blocks) is on `/flight-operations` and related pages, not on the dashboard. The pending-approval count is visible, and the queue is reachable, but this role cannot decide the flight.

### 2.4 Chief Flying Instructor

| | |
| --- | --- |
| Demo user | Nisha Varghese, `nisha.varghese@northstar.example`, `user-cfi`, `staffId` `staff-nisha`. Role label in the app: “Chief Flying Instructor”. The audit name “Training Manager” is not a separate role. |
| Other users | None in the seed. Staff record `staff-nisha` is also Neil Joseph’s assigned instructor. That link is not used by the dashboard. |

**Cards.** Same four numbers as Operations (6, 3, 2, 1). No Outstanding fees.

**Sections.** Legend only. Header notification seed: `nt-1`, “Flight awaiting approval”, unread, links to `/approvals`.

**Scope.** Academy-wide.

**Navigation**

| Item | Route | Extra checks |
| --- | --- | --- |
| Dashboard | `/dashboard` | |
| Cadets | `/cadets` | View only. |
| Training & Knowledge | `/training/courses` | `training.configure` and `training.assess`. |
| Flight Operations | `/flight-operations` | View and `flights.approve`. Cannot create, edit, submit, or complete. |
| HR & Staff | `/hr` | View only. |
| Documents | `/documents` | `documents.review` on Pending rows. |
| Notifications & Approvals | `/approvals` | Approve and Reject are shown. |
| Reports | `/reports` | No export. Includes Fee collection. |

Hidden: Fleet, Maintenance, Fuel, Finance, Settings, Users, Audit. Search is shown because of `cadets.view` and `flights.view`.

**Limits.** Training progress, assessment entry, and the approval queue exist and are not summarised here. Aircraft available is shown even though Fleet is hidden.

### 2.5 Instructor

| | |
| --- | --- |
| Demo user | Arun Menon, `arun.menon@northstar.example`, `user-arun`, `staffId` `staff-arun`. |
| Other users of this role | No second instructor login. Staff records Leela Krishnan (`staff-leela`) and Farhan Iqbal (`staff-farhan`) are instructors without demonstration accounts. A new demo user with role `instructor` and a `staffId` would share this dashboard. Cadet assignment would change `/cadets`, not these cards. |

**Cards.** Same four academy-wide numbers (6, 3, 2, 1). No Outstanding fees. Arun’s assigned cadets in the fixture are Aarav Menon (Active) and Ishan Pillai (On Hold). The Active cadets card does not show 1.

**Sections.** Legend only. Header notifications: none in the seed for `instructor` or `user-arun`.

**Scope.** The dashboard is role-level and academy-wide. Cadet list and cadet profile use `visibleCadets` / `isCadetVisible` and keep only cadets whose `instructorId` equals `staffId`. Flight list (`listFlights`) is not filtered. Completion of a flight is refused in the store when `actor.role === 'instructor'` and `actor.staffId !== flight.instructorId`.

**Navigation**

| Item | Route | Extra checks |
| --- | --- | --- |
| Dashboard | `/dashboard` | |
| Cadets | `/cadets` | Own assigned cadets only. |
| Training & Knowledge | `/training/courses` | `training.assess`. No configure. |
| Flight Operations | `/flight-operations` | View all flights in the register. Complete only an assigned flight. No create, submit, or approve. |
| Documents | `/documents` | View only. No review. |

Hidden: Fleet, Maintenance, Fuel, Finance, HR, Approvals, Reports, Settings, Users, Audit.

**Limits.** Pending approvals shows 1, and `/approvals` is denied. Aircraft available shows 2, and `/fleet` is denied. Assigned cadets, today’s assigned flights, and progress are available in other modules and are not on this page.

### 2.6 Maintenance Officer

| | |
| --- | --- |
| Demo user | Ravi Das, `ravi.das@northstar.example`, `user-maint`, `staffId` `staff-ravi`. |
| Other users | None in the seed. Work order `WO-2408` is assigned to `staff-ravi`. The dashboard does not read that assignment. |

**Cards**

| Card | Fixture value | Why |
| --- | --- | --- |
| Active cadets | — | Not operational. |
| Flights today | — | Not operational. |
| Aircraft available | 2 | `listAircraft` filtered to `Available`, because `fleet.view` is set and `operational` is false. Hint: planning status, not airworthiness. |
| Pending approvals | — | Not operational. |
| Outstanding fees | Absent | No `finance.view`. |

**Sections.** Legend only. Header notification seed: `nt-3`, “Open defect”, unread, links to `/maintenance`.

**Scope.** The one live number is academy-wide aircraft status, not “assigned to Ravi”.

**Navigation**

| Item | Route | Extra checks |
| --- | --- | --- |
| Dashboard | `/dashboard` | |
| Fleet | `/fleet` | View only. |
| Maintenance | `/maintenance` | `maintenance.record` and `maintenance.release_record`. |
| Documents | `/documents` | `documents.manage` is on the role and is not checked by `DocumentsPage`. Review buttons need `documents.review`, which this role does not have. |
| Reports | `/reports` | Includes Fee collection and Flight hours. No export. |

Hidden: Cadets, Training, Flight Operations, Fuel, Finance, HR, Approvals, Settings, Users, Audit. Search is shown because of `fleet.view`.

**Limits.** Open defects, open work orders, and aircraft not available are already cards on `/maintenance` and are absent here.

### 2.7 Finance Officer

| | |
| --- | --- |
| Demo user | Priya Shah, `priya.shah@northstar.example`, `user-fin`, `staffId` `staff-priya`. |
| Other users | None in the seed. |

**Cards.** `cadets.view` makes `operational` true even without `flights.view`. All five cards show the academy-wide fixture numbers, including Flights today (3), Aircraft available (2), Pending approvals (1), and Outstanding fees (₹90,50,000).

**Sections.** Legend only. Header notification seed: `nt-5`, “Fee due date passed”, unread, links to `/finance`.

**Scope.** Academy-wide fee and cadet totals. Not limited to an assigned account list. `listFeeAccounts` uses `visibleCadets`, which returns every cadet for this role.

**Navigation**

| Item | Route | Extra checks |
| --- | --- | --- |
| Dashboard | `/dashboard` | |
| Cadets | `/cadets` | View only. Profile fees can record a payment when `finance.manage` is present. |
| Finance | `/finance` | `finance.manage` and `finance.adjust`. |
| Documents | `/documents` | View only. |
| Reports | `/reports` | `reports.export` shows Demo CSV. |

Hidden: Training, Flight Operations, Fleet, Maintenance, Fuel, HR, Approvals, Settings, Users, Audit.

**Limits.** The finance page already shows Billed, Collected, Outstanding, Overdue accounts, and Expenses. The dashboard shows only the outstanding total, and it also shows flight and aircraft counts this role cannot open.

### 2.8 HR / Staff Coordinator

| | |
| --- | --- |
| Demo user | Devika Rao, `devika.rao@northstar.example`, `user-hr`, `staffId` `staff-devika`. |
| Other users | None in the seed. |

**Cards.** All four values are —. Outstanding fees is absent. No `cadets.view`, `flights.view`, `fleet.view`, or `finance.view`.

**Sections.** Legend only. Header notifications: none in the seed for `hr`.

**Scope.** Nothing on the page is user-specific. Staff screens are academy-wide.

**Navigation**

| Item | Route | Extra checks |
| --- | --- | --- |
| Dashboard | `/dashboard` | |
| HR & Staff | `/hr` | `staff.manage` can add an availability block. |
| Documents | `/documents` | View only. |
| Reports | `/reports` | Includes Fee collection and Flight hours. No export. |

Hidden: Cadets, Training, Flight Operations, Fleet, Maintenance, Fuel, Finance, Approvals, Settings, Users, Audit. Search is hidden.

**Limits.** The dashboard does not use the staff directory, leave blocks, or qualification dates that `/hr` already shows.

### 2.9 Cadet

| | |
| --- | --- |
| Demo user | Aarav Menon, `aarav.menon@northstar.example`, `user-aarav`, `cadetId` `cadet-aarav`. |
| Other users | None in the seed. `portalHome` returns null without a `cadetId` that matches a cadet. A second cadet login would see only that cadet’s snapshot. Staff users get `null` and the portal gate does not treat them as this cadet. |

There is no `/dashboard` for this role. `/dashboard` is Access limited. Home is `/portal`.

`portalHome` builds the snapshot from the linked cadet only. Flights included are that cadet’s `Approved` and `Completed` flights. Other cadets’ names are not in the snapshot (covered by `workspaceStore.test.ts`).

**Cards on the untouched fixture**

| Card | Value | Rule |
| --- | --- | --- |
| Illustrative progress | 36% | `completedRequired` 36 / course `requiredCount` 100. Copy says this is not a licence or course certificate. |
| Recorded hours | 29.8 | Opening hours 28.4 plus completed actual hours 1.4 on FLT-2409. Copy says this is not a regulatory hour total. |
| Upcoming flights | 1 | `Approved` and date on or after the demo day. FLT-2401 qualifies. FLT-2409 is Completed, so it is excluded. |
| Pending documents | 0 | Documents with `ownerId` `cadet-aarav` and `review === 'Pending'`. The enrolment form is `Accepted`. |
| Outstanding fees | ₹14,50,000 | CPL plan 18,50,000 minus payment 4,00,000. Due 1 Nov 2026, so not overdue on the demo day. Copy says a recorded payment is not a confirmed settlement. |
| Unread notifications | 1 | Notifications with `userId === 'user-aarav'`. Seed row `nt-4` is unread. Audience-role rows for other roles are excluded. |

**Sections**

| Section | Content |
| --- | --- |
| Upcoming flights | Next approved flight: FLT-2401, 29 Sep 2026, 06:30–08:00, aircraft and instructor names, status chip. Links to `/portal/schedule/flt-2401` and `/portal/schedule`. |
| Training progress | “Illustrative progress 36%” and syllabus label. Link to `/portal/training`. |
| Recent activity | First three notifications (one in the seed), with a portal-only link when `notificationRoute` starts with `/portal`. Link to `/portal/notifications`. |
| Outstanding items | Pending-document link when count &gt; 0 (not shown for Aarav). Outstanding amount links to `/portal/fees`. |
| Tables | Not on the overview. Flights, documents, and payments are tables on the other portal pages. |
| Charts | Absent. |
| Quick actions | Text links only. No create or edit. |

**Navigation** (all require `portal.view`): Overview `/portal`, My Profile `/portal/profile`, My Training `/portal/training`, My Flights `/portal/schedule`, My Documents `/portal/documents`, My Fees `/portal/fees`, Notifications `/portal/notifications`.

The cadet shell does not show staff navigation. Header search is hidden. The header bell still lists this cadet’s notifications.

**Limits.** Drafts, flights awaiting approval, and other cadets are omitted. Progress and fees are illustrative. Notifications are stored rows, not a live feed.

---

## 3. Existing system data inventory

Only behaviour present in `apps/web` is listed. “Dashboard reuse” means the current staff dashboard or cadet overview already reads it, or a later dashboard could call the same method without a new store.

| Module | Records and metrics that exist | Methods / queries | Roles that can open the module | Dashboard reuse now |
| --- | --- | --- | --- | --- |
| Cadets | 8 fixture cadets. Status Active, On Hold, Completed. Search, course, and status filters. Progress and recorded hours on the list. | `listCadets` (instructor-scoped), `getCadet`, `lookupCadet`, `saveCadet`, `setCadetStatus`, `activeCadets`, `progressPercent`, `recordedCadetHours` | View: admin, ops, CFI, instructor, finance. Create/update: admin only. | Active count on operational dashboards. Not scoped for instructors. |
| Training | 2 courses, published and draft syllabi, assessments. | `listCourses`, `listSyllabi`, `listAssessments`, `saveAssessment`, `publishSyllabus`, phase/item edits | View: admin, ops, CFI, instructor. Configure: admin, CFI. Assess: admin, CFI, instructor. | Not on the staff dashboard. Cadet overview shows own percent and syllabus label. |
| Flights | 9 fixture flights. Week, day, and agenda. Status and aircraft filters. Conflict blockers via `schedulingIssues`. Statuses include Draft, Awaiting approval, Approved, Completed, Cancelled. | `listFlights` (not assignment-scoped), `listPendingApprovals`, `getFlight`, `schedulingIssues`, draft/submit/decide/cancel/complete/correct | View: admin, ops, CFI, instructor. Create/update/submit: admin, ops. Approve: admin, CFI. Complete: admin, instructor (assigned only). | Flights today and pending count when operational. No list on the page. |
| Fleet | 4 aircraft. Status Available, Maintenance, Restricted. Recorded hours and next threshold. | `listAircraft`, `getAircraft`, `setAircraftStatus`, `recordedAircraftHours` | View: admin, ops, maintenance. Manage: admin. | Available count. Maintenance uses the fleet query; operational roles use the summary, including roles without `fleet.view`. |
| Maintenance | 1 open defect, 1 in-progress work order. Cards: open defects, open work orders, aircraft not available. | `listDefects`, `listWorkOrders`, `addDefect`, `updateWorkOrder`, `recordRelease`, `openDefects`, `openWorkOrders` | View: admin, ops. Record: admin, maintenance. Release record: maintenance only. | Not on the dashboard. |
| Fuel | 2 tanks. Balance from receipts, issues, adjustments. Low stock when balance &lt; threshold. Fixture: Avgas 4700 (threshold 2000), Jet A-1 1800 (threshold 2500, low). | `listTanks`, `listFuelTransactions`, `fuelBalance`, `addFuelTransaction`, `isLowStock` | View: admin, ops. Manage: admin, ops. | Not on the dashboard. |
| Finance | Billed 1,24,00,000, collected 33,50,000, outstanding 90,50,000, overdue accounts 2 (Ishan, Ananya), expenses 6,05,000 on the fixture. | `financeSnapshot`, `listFeeAccounts`, `feeAccount`, `listPayments`, `listExpenses`, `addPayment`, `addExpense` | View/manage/adjust: admin, finance. Cadet sees only `portalHome` fees. | Outstanding total for admin and finance only, and only when operational. |
| Staff | 9 staff. Availability label. First qualification expiry. Warning when expiry &lt; demo day (Farhan, 20 Sep 2026). One leave block, 1 Oct 2026. | `listStaff`, `getStaff`, `listAvailability`, `addAvailability`, `qualificationBeforeDemoDay` | View: admin, ops, CFI. Manage: admin, HR. | Not on the dashboard. |
| Documents | 5 documents. Review Pending or Accepted. Two Pending (Sara’s medical, Farhan’s instructor record). | `listDocuments`, `reviewDocument`, `filterDocuments` | View: admin, ops, CFI, instructor, maintenance, finance, HR. Review: admin, CFI. `documents.manage` has no screen check. | Not on the staff dashboard. Cadet overview counts own Pending rows. |
| Approvals | Same pending flights as the dashboard count. Recorded decisions are flights that already store `approval` and are not awaiting approval. Document rows are links, not a second queue. | `listPendingApprovals`, `listRecordedDecisions`, `decideFlight` | View: admin, ops, CFI. Decide: admin, CFI (`flights.approve`). | Count only, and for every operational role, including instructor and finance. |
| Notifications | 5 seed rows, role- or user-addressed. | `listNotifications`, `markNotificationRead`, `markAllNotificationsRead` | Header for every signed-in user. Approvals page is separate. | Cadet overview only. Staff dashboard does not list them. |
| Reports | Eight reports: roster, progress, hours, fleet, fuel, fees, documents, audit. Filters and bar counts. CSV if `reports.export`. | `reportRecords`, `buildReport` | View: admin, ops, CFI, maintenance, finance, HR, super admin. Export: admin, finance. | Not embedded in the dashboard. Fee report is not gated by `finance.view`. |
| Audit | Seed has two events. New mutations append events. | `listAudit` | Super Admin and Academy Administrator (`audit.view`). | Not on the dashboard. The audit report is visible to every reports role. |
| Settings | Academy name, currency, time zone. | `getAcademy`, `saveAcademySettings` | Super Admin, Academy Administrator. | Name is in the dashboard subtitle via `useAcademyQuery`. |
| Users | Nine seed accounts plus `addUser`. | `listDemoUsers`, `addUser` | Super Admin, Academy Administrator. | Not summarised on the dashboard. |
| Cadet portal | Personal progress, hours, flights, documents, fees, notifications, profile. | `portalHome` | Cadet only (`portal.view`). | This is the cadet dashboard. |

Placeholder, not a data source: header search.

---

## 4. Role-based gap analysis

“Supported” means the workspace already stores the records and a repository method or pure function can derive the figure. It does not mean the role should see it. Permission fit is stated on each line.

### Super Admin

| | |
| --- | --- |
| Currently available | Static legend. Em dashes on the four counts. Academy name in the subtitle. |
| Missing but supported | User count and counts by role (`listDemoUsers`). Recent audit rows (`listAudit`). Academy profile fields already loaded for the subtitle. |
| Requires clarification | Whether this role should see academy operational counts. The summary deliberately returns zeros, and the role cannot open those modules. Reports already show the underlying rows. |
| Not supported | Live regulatory status, system health, or a real user directory beyond demonstration accounts. |

### Academy Administrator

| | |
| --- | --- |
| Currently available | Five academy-wide cards and the legend. |
| Missing but supported | On Hold and Completed cadet counts (`listCadets`). Today’s flight list (`flightsOnDate` / `listFlights`). Pending flight rows (`listPendingApprovals`). Overdue account count and billed/collected/expenses (`financeSnapshot`). Open defects and work orders. Aircraft not Available. Pending documents. Unread notifications for `academy-admin`. Low fuel (`isLowStock`). Draft flights. |
| Requires clarification | Whether September completed hours (`completedHoursThisMonth`, month fixed as `2026-09`) should be a card. The value exists and the page omits it. |
| Not supported | A true monthly hours chart. The prototype chart was not ported. No time-series store exists beyond individual flight dates. |

### Operations Manager

| | |
| --- | --- |
| Currently available | Four operational cards. No fee card, which matches `finance.view`. |
| Missing but supported | Today’s flights with cadet, instructor, and aircraft (`listFlights`, `listCadetLabels`, `listStaff`, `listAircraft`). Drafts and the known overlap on FLT-2405 (`schedulingIssues`). Awaiting-approval rows, without Approve buttons. Aircraft not Available and restrictions. Instructor leave (`listAvailability`). Low fuel. Pending documents as links only. |
| Requires clarification | Whether a conflict count should include drafts that are not yet submitted. The store can flag them; the product has not defined a dashboard threshold. |
| Not supported | Dispatch release, weather, or NOTAM data. Approval on this dashboard would contradict `flights.approve`. |

### Chief Flying Instructor

| | |
| --- | --- |
| Currently available | Four operational cards. |
| Missing but supported | Pending approvals as rows (`listPendingApprovals`) with decide actions gated by `flights.approve`. Progress list (`progressPercent` over `listCadets`). Assessments already stored (`listAssessments`). Upcoming training flights. Pending document reviews. Own unread notification. |
| Requires clarification | “Assessment workload” is not a stored queue. Only saved assessments exist. Follow-up is a boolean on a completed flight’s `actual`, not an open task list. |
| Not supported | Licence eligibility or an official training-complete flag. `progressPercent` is illustrative. |

### Instructor

| | |
| --- | --- |
| Currently available | Four academy-wide cards, including counts for modules this role cannot open. |
| Missing but supported | Assigned cadets (`listCadets` already filters to `staff-arun`: Aarav and Ishan on the fixture). Assigned flights by filtering `listFlights` on `instructorId`. Progress and hours for those cadets. Own qualification expiry (`listStaff` + `qualificationBeforeDemoDay`) as an informational label. Completed flights with `followUp === true` (none in the fixture). |
| Requires clarification | The schedule currently shows every cadet’s name. A dashboard that listed only assigned flights would be narrower than the schedule. That should be confirmed before hiding names that the schedule still shows. |
| Not supported | An inbox of assessments waiting to be entered. Nothing in the store marks an item as “due for assessment” except the absence of a satisfactory record, and that absence is not a task assigned to this instructor. |

### Maintenance Officer

| | |
| --- | --- |
| Currently available | Aircraft available (2). Other counts hidden. |
| Missing but supported | The three cards already on `/maintenance`: open defects (1), open work orders excluding Completed and Release recorded (1), aircraft whose status is not Available (2). Defect and work-order rows. Own unread notification. Pending aircraft documents if filtered by `ownerType === 'Aircraft'` (the pending seed documents are Cadet and Staff, not Aircraft). |
| Requires clarification | Whether “my work orders” means `assigneeId === staff-ravi` or every open order. Both fields exist. The maintenance page lists all orders. |
| Not supported | An airworthiness or release decision. `recordRelease` stores a planning note. The dashboard must keep that wording. |

### Finance Officer

| | |
| --- | --- |
| Currently available | Five cards, including flight and aircraft counts this role cannot open. Outstanding fees matches the finance page outstanding total. |
| Missing but supported | Billed, collected, overdue accounts (2), expenses (`financeSnapshot`). Recent payments and expenses. Cadet account rows (`listFeeAccounts`). Unread finance notification. |
| Requires clarification | The operational flag is true because of `cadets.view` alone. Hiding flight and aircraft cards would match the navigation. Keeping them matches the current `or` condition. |
| Not supported | A reconciled ledger, tax, or settlement status. Copy on the finance page and the fee card already says the figures are illustrative. |

### HR / Staff Coordinator

| | |
| --- | --- |
| Currently available | Em dashes and the legend. |
| Missing but supported | Staff count (`listStaff`, 9). Availability labels. Leave and unavailability blocks (`listAvailability`, one Leave on the fixture). Qualification expiry before the demo day (Farhan). Pending staff documents (`listDocuments`, Farhan’s instructor record). |
| Requires clarification | Staff `availability` (Available / Limited) and availability-block `kind` (Leave / Unavailable) are different fields. A dashboard should not merge them into one “on leave today” figure without a stated rule. |
| Not supported | Payroll, recruitment, or a legal qualification register. Labels are fictional. |

### Cadet

| | |
| --- | --- |
| Currently available | Six personal cards, next flight, progress, recent notifications, and outstanding items. |
| Missing but supported | Completed-flight count is already inside `portalHome.flights` and is not a card (FLT-2409). Earlier approved flights exist as `earlierApprovedFlights` and are not on the overview. |
| Requires clarification | Whether a zero pending-document card should stay when the only stored document is Accepted. It is accurate and easy to misread as “nothing is required”. |
| Not supported | Draft or unapproved flights, other cadets, or a regulatory hour total. |

---

## 5. Cross-role dashboard matrix

**Current widgets.** P = number or content shown. D = card present, value hidden (em dash). A = card not rendered. N = this role does not use that page.

| Widget | Super Admin | Academy Admin | Operations | CFI | Instructor | Maintenance | Finance | HR | Cadet |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Active cadets | D | P | P | P | P | D | P | D | N |
| Flights today | D | P | P | P | P | D | P | D | N |
| Aircraft available | D | P | P | P | P | P | P | D | N |
| Pending approvals | D | P | P | P | P | D | P | D | N |
| Outstanding fees | A | P | A | A | A | A | P | A | N |
| Status-label legend | P | P | P | P | P | P | P | P | N |
| Chart | A | A | A | A | A | A | A | A | A |
| Table on the home page | A | A | A | A | A | A | A | A | A |
| September completed hours | A | A | A | A | A | A | A | A | N |
| Personal progress | N | N | N | N | N | N | N | N | P |
| Recorded hours | N | N | N | N | N | N | N | N | P |
| Upcoming flights | N | N | N | N | N | N | N | N | P |
| Pending own documents | N | N | N | N | N | N | N | N | P |
| Own outstanding fees | N | N | N | N | N | N | N | N | P |
| Unread notifications on the page | A | A | A | A | A | A | A | A | P |
| Next flight detail | A | A | A | A | A | A | A | A | P |
| Recent activity | A | A | A | A | A | A | A | A | P |

Header notifications are outside this matrix. They follow `audienceRole` / `userId`, not the dashboard.

**Inconsistent duplicates**

- Aircraft available is one label with two queries: summary for operational roles, `listAircraft` for Maintenance.
- Outstanding fees on the dashboard and Outstanding on `/finance` use the same `outstandingFees` total. The dashboard shows it to Academy Administrator and Finance only. The Fee collection report shows fee rows to every `reports.view` role.
- Active cadets on the dashboard counts every Active cadet. `/cadets` for an instructor does not.
- Pending approvals on the dashboard is wider than `/approvals`.

**Candidate widgets that already have a source.** “Fit” means the role’s current permissions allow the module. Reuse does not mean every role should see the same scope.

| Candidate | Source | Admin | Ops | CFI | Instructor | Maintenance | Finance | HR | Super Admin | Cadet |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Today’s flights | `listFlights` + demo day | Fit | Fit | Fit | Assigned only, if confirmed | No `flights.view` | No `flights.view` | No | No module | Own approved flights already shown |
| Approval queue | `listPendingApprovals` | Fit | View, no decide | Fit | No `approvals.view` | No | No | No | No | No |
| Open defects / work orders | `openDefects`, `openWorkOrders` | Fit | View | No `maintenance.view` | No | Fit | No | No | No | No |
| Finance snapshot | `financeSnapshot` | Fit | No `finance.view` | No | No | No | Fit | No | No | Own account already shown |
| Staff leave and expiry warning | `listAvailability`, `qualificationBeforeDemoDay` | Fit | View | View | Own record only, informational | No `staff.view` | No | Fit | No | No |
| Pending documents | `listDocuments` | Fit | View | Review | View | View | View | View | No | Own rows already shown |
| Progress list | `progressPercent` | Fit | View | Fit | Assigned cadets | No | No | No | No | Own percent already shown |
| Role and audit summary | `listDemoUsers`, `listAudit` | Fit | No | No | No | No | No | No | Fit | No |
| Low fuel | `isLowStock` | Fit | Fit | No | No | No | No | No | No | No |

---

## 6. Recommended dashboard layouts

Labels below stay inside the wording the app already uses. Aircraft status is a planning label. Fees are illustrative. Progress is not a certificate. Flight approval is not a release. Notifications are stored rows.

### Super Admin

| Band | Available now | Requires clarification | Not supported |
| --- | --- | --- | --- |
| Summary | Demonstration accounts (`listDemoUsers`). Academy name, branch, and mode already loaded. | Operational counts. Showing them repeats data the role cannot open as modules, unless Reports is accepted as the intended window. | System health, tenant administration. |
| Main | Latest audit events (`listAudit`), with the existing “not a compliance record” limit. | | |
| Secondary | Link to Reports. Do not repeat fee totals here. | | |
| Alerts | None in the notification seed. An empty state is honest. | | |
| Actions | Users & Roles, Academy Settings, Audit Log, Reports. | | |

### Academy Administrator

| Band | Available now |
| --- | --- |
| Summary | Keep the five current cards. Add On Hold count, overdue account count, and aircraft not Available, using the same functions as the list and finance pages. |
| Main | Today’s flights. Flights awaiting approval. |
| Secondary | Open defects and open work orders. Pending documents. Low-fuel tanks. |
| Alerts | Unread rows for `academy-admin`. |
| Actions | Cadets, Flight Operations, Approvals, Finance, Fleet. |

September completed hours stays under clarification because the month is hard-coded to September 2026.

### Operations Manager

| Band | Available now |
| --- | --- |
| Summary | Keep the four cards. Do not add Outstanding fees. |
| Main | Today’s flights. Draft and overlap warnings from `schedulingIssues`, labelled as planning blockers, not a dispatch decision. |
| Secondary | Aircraft not Available, with restriction reason. Leave blocks on the demo day and the days shown. Low fuel. |
| Alerts | Awaiting-approval count with a link to `/approvals`, without Approve or Reject. |
| Actions | Schedule flight (`flights.create`), Flight Operations, Fleet, Fuel. |

### Chief Flying Instructor

| Band | Available now | Requires clarification |
| --- | --- | --- |
| Summary | Keep Active cadets, flights today, and pending approvals. Aircraft available is a poor fit because Fleet is hidden; keep it only as a planning figure with the current hint, or move it off this role after confirmation. | |
| Main | Approval queue for `Awaiting approval`, with Approve and Reject still requiring a comment and still refused while blockers remain. Cadets with illustrative progress, not a pass/fail. | |
| Secondary | Pending documents awaiting review. Upcoming approved training flights. | Stored assessments are history, not an outstanding-task queue. |
| Alerts | The existing CFI notification. | |
| Actions | Approvals, Training progress, Cadets. | |

### Instructor

| Band | Available now | Requires clarification |
| --- | --- | --- |
| Summary | Assigned active cadets via `listCadets`, not the academy-wide 6. Own upcoming flights by filtering `listFlights` on `staffId`. | Hide the academy-wide pending-approval and aircraft cards. They describe modules this role cannot open. |
| Main | Assigned cadets with illustrative progress and recorded hours. | |
| Secondary | Own qualification expiry as “informational only”, matching the staff list. | Follow-up flags only where `actual.followUp` is true. Do not invent an assessment inbox. |
| Alerts | None in the seed. | |
| Actions | My cadets, Flight Operations, Training progress. Complete remains on the flight, and only when `staffId` matches. | |

### Maintenance Officer

| Band | Available now |
| --- | --- |
| Summary | Keep Aircraft available. Add open defects, open work orders, and aircraft not Available, copied from the maintenance page rules. |
| Main | Open defect and work-order rows. Planning status and restriction text. |
| Secondary | Documents linked to aircraft. |
| Alerts | The existing maintenance notification. |
| Actions | Maintenance, Fleet. |

Do not add cadet, flight, or fee figures.

### Finance Officer

| Band | Available now | Requires clarification |
| --- | --- | --- |
| Summary | Replace the flight cards with the finance page set: Billed, Collected, Outstanding, Overdue accounts, Expenses. | Remove Flights today, Aircraft available, and Pending approvals unless `flights.view` is added. |
| Main | Account rows from `listFeeAccounts`, overdue first. | |
| Secondary | Latest payments and expenses. | |
| Alerts | The finance notification. | |
| Actions | Finance, Cadets, Reports. | |

### HR / Staff Coordinator

| Band | Available now | Requires clarification |
| --- | --- | --- |
| Summary | Staff count. Count of qualification records with expiry before the demo day, labelled informational and fictional. | Do not collapse `availability` and leave blocks into one number until the rule is chosen. |
| Main | Leave and unavailability blocks (`listAvailability`). Staff whose first qualification expires before the demo day. | |
| Secondary | Pending staff documents. | |
| Alerts | None in the seed. | |
| Actions | HR & Staff, Documents. | |

Do not add fee or flight cards. The reports page already exposes them; the dashboard should not repeat that.

### Cadet

| Band | Available now |
| --- | --- |
| Summary | Keep the six portal cards and their current hints. |
| Main | Keep next flight, training progress, and outstanding items. |
| Secondary | Completed flights from the same snapshot, as a count or a short list. |
| Alerts | Keep the notification section. |
| Actions | Keep the existing portal links. |

No staff modules.

---

## 7. Permission and data-visibility findings

1. **Operational rule does not match its comment.** `dashboardSummary` sets `operational` when the role has `cadets.view` **or** `flights.view`. The comment above the function, and migration section 14, say both. Finance has only `cadets.view` and still receives flight, aircraft, and approval counts.

2. **Flight and aircraft figures without those permissions.** Finance sees Flights today, Aircraft available, and Pending approvals, and cannot open Flight Operations, Fleet, or Approvals. Instructor and CFI see Aircraft available without `fleet.view`. Instructor sees Pending approvals without `approvals.view`. The cards are not links, so the mismatch is visibility, not a button that navigates into a forbidden page.

3. **Fee report is wider than `finance.view`.** `/reports` lists Fee collection for every role with `reports.view`: Super Admin, Operations, CFI, Maintenance, HR, and Finance. Only Academy Administrator and Finance have `finance.view`. CSV export is correctly limited to `reports.export` (admin and finance). Viewing the fee rows is not.

4. **Audit report is wider than `audit.view`.** The audit report is in the same report list. `audit.view` is only Super Admin and Academy Administrator.

5. **Instructor scope is inconsistent.** `listCadets` and `getCadet` hide other instructors’ cadets. `dashboardSummary` and `listFlights` do not. Completion is assignment-checked. The dashboard therefore over-reports relative to the cadet register.

6. **`documents.manage` has no effect.** Maintenance is the only role that has it without also having `documents.review`. `DocumentsPage` checks `documents.review` only.

7. **Header search implies capability it does not have.** It is shown to roles that can view cadets, flights, or fleet, then tells them search is not connected.

8. **Cadet fee and progress copy is appropriately limited.** The portal says the progress figure is not a certificate and the balance is illustrative. The staff outstanding-fees hint says the same. Those hints should be kept on any new card.

9. **Maintenance aircraft count is consistent with its permission.** That card uses `fleet.view`. The other three dashes match the missing cadet and flight permissions.

10. **Permissions are demonstration-only.** Any of the above can be bypassed outside this UI. The audit does not treat the sidebar as a security boundary.

---

## 8. Shared components and architecture

Reuse these. Do not add a second card style.

| Piece | Role |
| --- | --- |
| `KpiCard` and `SummaryGrid` | Staff dashboard and finance, maintenance, and report summaries. |
| `PageHeader` | Every page, including portal overview sections’ titles (portal uses a local `Section` box instead). |
| `StatusChip` | Legend, flights, cadets, staff, portal. |
| `dashboardSummary` | Keep as the academy-wide count function. Call it only when the role should see those counts. Do not overload it with instructor scoping. |
| `useDashboardQuery` | Already keyed by user id. A scoped instructor summary needs its own query so the academy-wide cache is not reused by mistake. |
| `visibleCadets`, `listFlights`, `listPendingApprovals`, `financeSnapshot`, `openDefects`, `openWorkOrders`, `listAvailability`, `listDocuments`, `listNotifications`, `portalHome` | Existing reads. Dashboards should call these, not a parallel store. |
| `NotificationButton` | Staff dashboards can list the same `useNotificationQuery` result. The cadet overview already has its own list from `portalHome`. |
| `filterNav` | Quick actions should point at routes this helper would show. |
| Portal `Section` | The cadet layout is separate and should stay separate. |

`completedHoursThisMonth` should not be wired through a new formula. It is already the September 2026 sum.

---

## 9. Implementation plan

No work in this audit. Suggested order if a later change is approved:

1. **Visibility correction.** Decide the `or` versus `and` rule. Stop rendering a card when the role lacks the matching view permission (`flights.view`, `fleet.view`, `approvals.view`, `finance.view`). This removes the finance and instructor mismatches before new widgets are added.
2. **Shared section components.** A flight-day list, a pending-flight list, and a notification list, each taking data the pages already load. Used by Academy Administrator, Operations, and CFI with different actions.
3. **Operations and CFI.** Today’s flights and the approval queue. CFI gets decide actions. Operations does not.
4. **Instructor scope.** Assigned cadets and assigned flights only, using `listCadets` and a filter on `instructorId`.
5. **Maintenance and finance.** Move the cards those pages already render onto the home page, and drop unrelated counts.
6. **HR and Super Admin.** Staff/leave/qualification summary, and user plus audit summary. Do not copy fee totals onto these homes.
7. **Cadet.** Only small additions from `portalHome` (completed-flight count). The overview is already the dashboard.
8. **Reports gating.** Separate from dashboards, but it is the largest existing leak of fee and audit rows. Do it before putting report charts on a home page.

Dependencies: step 1 before any role layout. Steps 3–6 can share the components from step 2. Cadet work does not depend on the staff page.

---

## 10. Questions for product owner

1. Should `dashboardSummary` require both `cadets.view` and `flights.view`, as the comment says, or either permission, as the code does? This decides whether Finance sees flight counts.
2. Should Instructor home counts follow assigned cadets and assigned flights, while the schedule continues to show every flight?
3. Should September completed hours be shown, given the month is fixed to `2026-09`?
4. Should Fee collection and Audit activity remain on `/reports` for roles without `finance.view` and `audit.view`?
5. For Maintenance, is a work-order summary all open orders, or only orders whose `assigneeId` is the signed-in staff member?
6. For HR, should “unavailable” mean the staff `availability` label, a Leave/Unavailable block on the demo day, or both kept separate?
7. Is the cadet portal overview the cadet dashboard for good, with no `/dashboard` for that role?

---

## 11. Validation

No application source, tests, routes, permissions, fixtures, or other docs were modified. This report file was added because the audit is too long to leave only in the chat.

**Read for this audit**

- `docs/airnotix-prototype-to-react-migration.md` (sections 3.3, 11–18, and the dashboard notes in sections 14–16).
- `apps/web/src/features/dashboard/DashboardPage.tsx`
- `apps/web/src/features/dashboard/dashboardQueries.ts`
- `apps/web/src/domain/calculations.ts` (`dashboardSummary`, `activeCadets`, `flightsOnDate`, `pendingApprovals`, `outstandingFees`, `completedHoursInSeptember`, `financeSnapshot`, `feeAccount`, `visibleCadets`, `progressPercent`, `recordedCadetHours`)
- `apps/web/src/domain/calculations.test.ts` (fixture expectations)
- `apps/web/src/domain/permissions.ts`
- `apps/web/src/domain/demoData.ts`
- `apps/web/src/domain/fixtures.ts` (cadets, aircraft, flights, defects, work orders, staff, availability, fees, documents, notifications)
- `apps/web/src/domain/notifications.ts`
- `apps/web/src/domain/workspace.ts` (follow-up fields)
- `apps/web/src/app/router.tsx`
- `apps/web/src/components/layout/navigation.ts`
- `apps/web/src/components/layout/AppShell.tsx`
- `apps/web/src/components/layout/TopBar.tsx`
- `apps/web/src/components/data/KpiCard.tsx`
- `apps/web/src/features/auth/AuthProvider.tsx`
- `apps/web/src/features/auth/RequirePermission.tsx`
- `apps/web/src/features/auth/AccessDenied.tsx`
- `apps/web/src/features/portal/PortalOverviewPage.tsx`
- `apps/web/src/features/portal/portalRules.ts`
- `apps/web/src/features/portal/portalQueries.ts`
- `apps/web/src/features/notifications/NotificationButton.tsx`
- `apps/web/src/services/repositories/workspaceRepository.ts`
- `apps/web/src/services/repositories/mockWorkspaceRepository.ts` (`dashboardSummary`, `portalHome` delegation)
- `apps/web/src/services/repositories/workspaceStore.ts` (`listCadets`, `portalHome`, `listFeeAccounts`, `listNotifications`, storage key)
- `apps/web/src/services/repositories/workspaceStore.test.ts` (portal snapshot)
- `apps/web/src/features/approvals/ApprovalsPage.tsx`
- `apps/web/src/features/finance/FinancePage.tsx`
- `apps/web/src/features/maintenance/MaintenancePage.tsx`
- `apps/web/src/features/maintenance/maintenanceRules.ts`
- `apps/web/src/features/reports/ReportsPage.tsx`
- `apps/web/src/features/reports/reportRules.ts`
- `apps/web/src/features/flights/FlightSchedulePage.tsx`
- `apps/web/src/features/cadets/CadetListPage.tsx`
- `apps/web/src/features/fuel/FuelPage.tsx`
- `apps/web/src/features/fuel/fuelRules.ts`
- `apps/web/src/features/staff/staffRules.ts`
- `apps/web/src/features/staff/StaffListPage.tsx`
- `apps/web/src/features/documents/DocumentsPage.tsx`
- `apps/web/src/features/documents/documentRules.ts`

The HTML prototype was not executed. Its dashboard behaviour was taken from the migration notes and from the comments in `calculations.ts`, which describe the port of `renderDashboard`. The React source is the record of what the app does now.
