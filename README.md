# Airnotix prototype

Clickable demonstration of Airnotix, a proposed flying-academy workspace from Arionix Global LLP. The demo academy is **Northstar Flight Academy**, Kochi Training Base. Every person, aircraft identifier, fee, and syllabus entry is fictional.

The interface shell started from [AdminKit](https://github.com/adminkit/adminkit) (MIT). `LICENSE` keeps that copyright. This is not the production application and it does not make flight, maintenance, financial, or regulatory decisions.

## Run

```sh
npm install
npm start
```

Open http://localhost:8080/sign-in.html. Choose a demo account or use `meera.krishnan@northstar.example` with password `demonstration`.

```sh
npm run build
```

Pages are assembled from `src/layout/` and `src/pages/` by `scripts/render-pages.js`. Demo records live in `src/js/data/seed.js` and changes stay in this browser under `localStorage` key `airnotix-demo-v1`. **Reset demo data** in the profile menu restores the seed.

## What you can walk through

- Role switcher for Super Admin, Academy Administrator, Operations, Chief Flying Instructor, Instructor, Maintenance, Finance, HR, and Cadet Aarav Menon
- Cadet list, create, profile, status change, and linked syllabus progress
- Draft syllabus edits and publish
- Week, day, and agenda calendar, including a deliberate overlap on FLT-2405
- Submit, approve, reject, cancel, complete, and correct a flight
- Aircraft planning status, defects, work orders, and an authorized-release record
- Instructor leave that blocks scheduling
- Fuel transactions that change the calculated stock
- Payments and expenses that change fee totals
- Documents, approvals, reports with a local CSV, audit history, and the cadet portal

## Assumptions

- The stack stays static HTML, Bootstrap 5, Sass, and vanilla JavaScript. The production direction in the PRD (Angular, ASP.NET Core, PostgreSQL) is not implemented here.
- Demo “today” is 29 September 2026. The calendar week is the Monday–Sunday week containing that date.
- Illustrative progress is `completed required items / course required count` (100). A first Satisfactory assessment of an item adds one.
- Recorded hours are an opening balance plus completed flight actual hours. Planned time is not included.
- A draft may be saved with a conflict. Approval is refused while a blocker remains. The form does not reassign another aircraft or instructor.
- Aircraft status and an “authorized release recorded” entry are planning records. They are not a serviceability decision.
- Qualification labels are fictional. An expiry before the flight date is a warning only.
- Fee totals, fuel stock, and reports are calculated from the demo records. They are not an accounting ledger.
- Frontend role checks hide navigation and actions. They are not access control.

## Limitations

No real authentication, tenant isolation, payments, file storage, email, regulator integration, or offline sync. Reset demo data before a review if an earlier browser session should be discarded.

## Brand

Navy `#101C2C`, accent `#8EE53F`, Inter. The sidebar uses `src/img/airnotix-logo-white.png`. Sign-in uses `src/img/airnotix-logo.png`. The browser icon is `src/img/favicon.png`.
