import { DEMO_TODAY, ROLE_LABELS, ROLE_PERMISSIONS } from "../data/seed";
import {
  activeCadets,
  aircraftOf,
  cadetOf,
  feeAccount,
  findById,
  flightsOnDate,
  formatDate,
  fuelBalance,
  fullName,
  inr,
  pendingApprovals,
  progressPercent,
  recordedAircraftHours,
  recordedCadetHours,
  staffOf,
  weekDates,
  weekday
} from "../data/derive";
import {
  addAvailability,
  addDefect,
  addExpense,
  addFuelTransaction,
  addUser,
  can,
  currentUser,
  recordRelease,
  reviewDocument,
  saveAcademySettings,
  setAircraftStatus,
  updateWorkOrder
} from "../data/store";
import { drawBars } from "./charts-pages";
import { badge, confirmAction, emptyRow, esc, field, mount, reasonField, toast } from "./ui";
import { onClick, onForm, refresh } from "./screen-kit";

const params = () => new URLSearchParams(window.location.search);
const fail = (result) => {
  if (!result || result.ok === false) {
    toast(result && result.error ? result.error : "That action could not be completed.");
    return true;
  }
  return false;
};

export const renderDashboard = (state) => {
  if (!can("cadets.view") && !can("flights.view")) {
    mount(`<section class="card"><div class="card-body"><h2 class="h5">${esc(state.academy.name)}</h2><p>Platform administration is separate from academy operational records. This role can review setup, users, and the audit log.</p><div class="d-flex gap-2 flex-wrap"><a class="btn btn-accent" href="users.html">Users and roles</a><a class="btn btn-outline-primary" href="audit.html">Audit log</a><a class="btn btn-outline-primary" href="settings.html">Settings</a></div></div></section>`);
    return;
  }
  const hours = state.flights.filter((flight) => flight.status === "Completed" && String(flight.date).startsWith("2026-09") && flight.actual).reduce((sum, flight) => sum + Number(flight.actual.hours), 0);
  const fees = state.cadets.reduce((sum, cadet) => sum + feeAccount(state, cadet).outstanding, 0);
  const cards = [
    ["Active cadets", activeCadets(state).length, "Status is Active", "cadets.html?status=Active", can("cadets.view")],
    ["Flights today", flightsOnDate(state, DEMO_TODAY).length, formatDate(DEMO_TODAY), `flight-operations.html?view=day&date=${DEMO_TODAY}`, can("flights.view")],
    ["Flight hours this month", hours.toFixed(1), "Completed flights in Sep 2026", "reports.html?report=hours", can("reports.view")],
    ["Available aircraft", state.aircraft.filter((aircraft) => aircraft.status === "Available").length, "Planning status, not a release", "fleet.html?status=Available", can("fleet.view")],
    ["Pending approvals", pendingApprovals(state).length, "Waiting for a person", "approvals.html", can("approvals.view")],
    ["Outstanding fees", inr(fees), "Illustrative accounts", "finance.html", can("finance.view")]
  ].filter((card) => card[4]);
  const dates = weekDates(DEMO_TODAY);
  const upcoming = state.flights.filter((flight) => flight.date >= DEMO_TODAY && !["Cancelled", "Draft", "Rejected"].includes(flight.status)).slice(0, 6);
  const attention = [];
  state.aircraft.filter((aircraft) => aircraft.status !== "Available").forEach((aircraft) => attention.push([`${aircraft.code} is ${aircraft.status}`, aircraft.restriction ? aircraft.restriction.reason : "", `fleet.html?id=${aircraft.id}`]));
  pendingApprovals(state).forEach((flight) => attention.push([`${flight.reference} needs a decision`, `${formatDate(flight.date)} ${flight.start}`, `flight-operations.html?id=${flight.id}`]));
  mount(`<section class="mb-3"><h2 class="section-title">Academy snapshot</h2><p class="small text-muted">Counts come from the current demo records.</p><div class="row">${cards.map(([label, value, meta, href]) => `<div class="col-sm-6 col-xl-4 mb-3"><a class="card h-100 text-decoration-none" href="${href}"><div class="card-body"><h3 class="kpi-label">${esc(label)}</h3><p class="kpi-value">${esc(value)}</p><p class="kpi-meta mb-0">${esc(meta)}</p></div></a></div>`).join("")}</div></section>
    <div class="row"><div class="col-lg-7 mb-3"><section class="card h-100"><div class="card-header"><h2 class="h6 mb-0">Flights planned and completed</h2></div><div class="card-body"><div class="chart chart-sm"><canvas id="chart-flights"></canvas></div></div></section></div>
    <div class="col-lg-5 mb-3"><section class="card h-100"><div class="card-header"><h2 class="h6 mb-0">Needs attention</h2></div><div class="list-group list-group-flush">${attention.slice(0, 5).map(([title, body, href]) => `<a class="list-group-item" href="${esc(href)}"><strong>${esc(title)}</strong><div class="small text-muted">${esc(body)}</div></a>`).join("") || `<div class="list-group-item text-muted">Nothing waiting.</div>`}</div></section></div></div>
    <section class="card"><div class="card-header"><h2 class="h6 mb-0">Upcoming flights</h2></div><div class="table-responsive"><table class="table mb-0"><thead><tr><th>When</th><th>Reference</th><th>Cadet</th><th>Aircraft</th><th>Status</th></tr></thead><tbody>${upcoming.map((flight) => `<tr><td>${esc(formatDate(flight.date))} ${esc(flight.start)}</td><td><a href="flight-operations.html?id=${esc(flight.id)}">${esc(flight.reference)}</a></td><td>${esc(fullName(cadetOf(state, flight.cadetId)))}</td><td>${esc((aircraftOf(state, flight.aircraftId) || {}).code || "")}</td><td>${badge(flight.status)}</td></tr>`).join("") || emptyRow(5, "No upcoming flights.")}</tbody></table></div></section>`);
  drawBars("chart-flights", dates.map(weekday), [
    { label: "Planned", data: dates.map((date) => state.flights.filter((flight) => flight.date === date && flight.status !== "Cancelled").length), color: "#101C2C" },
    { label: "Completed", data: dates.map((date) => state.flights.filter((flight) => flight.date === date && flight.status === "Completed").length), color: "#8EE53F" }
  ]);
};

export const renderFleet = (state) => {
  const id = params().get("id");
  if (id) {
    const aircraft = findById(state.aircraft, id);
    if (!aircraft) {
      mount(`<p>Aircraft not found.</p>`);
      return;
    }
    const flights = state.flights.filter((flight) => flight.aircraftId === aircraft.id);
    mount(`<section class="card mb-3"><div class="card-body"><h2 class="h4">${esc(aircraft.code)} ${badge(aircraft.status)}</h2><p>${esc(aircraft.type)} · ${esc(aircraft.base)}</p><p>Recorded hours ${recordedAircraftHours(state, aircraft.id)} · Next configured threshold ${esc(aircraft.nextMaintenanceHours)} h</p>${aircraft.restriction ? `<div class="alert alert-warning">${esc(aircraft.restriction.reason)} Planning window ${esc(formatDate(aircraft.restriction.from))} to ${esc(formatDate(aircraft.restriction.until))}.</div>` : ""}<p class="small text-muted">A status here is a planning record. It is not an airworthiness or release decision.</p>${can("fleet.manage") ? `<form data-form="aircraft-status" class="row"><input type="hidden" name="id" value="${esc(aircraft.id)}"><div class="col-md-3">${field("status", "Status", `<select class="form-select" id="status" name="status">${["Available", "Maintenance", "Restricted"].map((item) => `<option${item === aircraft.status ? " selected" : ""}>${item}</option>`).join("")}</select>`)}</div><div class="col-md-3">${field("until", "Until", `<input class="form-control" id="until" name="until" type="date" value="${esc(aircraft.restriction ? aircraft.restriction.until : "2026-10-31")}">`)}</div><div class="col-md-6">${field("reason", "Reason", `<input class="form-control" id="reason" name="reason" placeholder="Required unless available">`)}</div><div class="col-12"><button class="btn btn-accent" type="submit">Update status</button></div></form>` : ""}</div></section>
      <section class="card"><div class="card-header"><h2 class="h6 mb-0">Flights using this aircraft</h2></div><table class="table mb-0"><thead><tr><th>Date</th><th>Reference</th><th>Status</th></tr></thead><tbody>${flights.map((flight) => `<tr><td>${esc(formatDate(flight.date))}</td><td><a href="flight-operations.html?id=${esc(flight.id)}">${esc(flight.reference)}</a></td><td>${badge(flight.status)}</td></tr>`).join("") || emptyRow(3, "No linked flights.")}</tbody></table></section>`);
    return;
  }
  const status = params().get("status") || "";
  const rows = state.aircraft.filter((aircraft) => !status || aircraft.status === status);
  mount(`<section class="card"><div class="table-responsive"><table class="table mb-0"><thead><tr><th>Identifier</th><th>Type</th><th>Status</th><th>Recorded hours</th><th>Next threshold</th><th>Bookings</th></tr></thead><tbody>${rows.map((aircraft) => `<tr><td><a href="fleet.html?id=${esc(aircraft.id)}">${esc(aircraft.code)}</a></td><td>${esc(aircraft.type)}</td><td>${badge(aircraft.status)}</td><td>${recordedAircraftHours(state, aircraft.id)}</td><td>${esc(aircraft.nextMaintenanceHours)}</td><td>${state.flights.filter((flight) => flight.aircraftId === aircraft.id && flight.date >= DEMO_TODAY && flight.status !== "Cancelled").length}</td></tr>`).join("")}</tbody></table></div><div class="card-body small text-muted">Identifiers are fictional. Hours are the opening balance plus completed demo flights.</div></section>`);
};

export const renderMaintenance = (state) => {
  mount(`<div class="row mb-3"><div class="col-md-4"><article class="card"><div class="card-body"><h3 class="kpi-label">Open defects</h3><p class="kpi-value">${state.defects.filter((item) => item.status === "Open").length}</p></div></article></div><div class="col-md-4"><article class="card"><div class="card-body"><h3 class="kpi-label">Open work orders</h3><p class="kpi-value">${state.workOrders.filter((item) => item.status !== "Release recorded" && item.status !== "Completed").length}</p></div></article></div><div class="col-md-4"><article class="card"><div class="card-body"><h3 class="kpi-label">Aircraft not available</h3><p class="kpi-value">${state.aircraft.filter((item) => item.status !== "Available").length}</p></div></article></div></div>
    ${can("maintenance.record") ? `<section class="card mb-3"><div class="card-body"><h2 class="h6">Record defect</h2><form data-form="defect" class="row"><div class="col-md-4">${field("aircraftId", "Aircraft", `<select class="form-select" id="aircraftId" name="aircraftId">${state.aircraft.map((item) => `<option value="${esc(item.id)}">${esc(item.code)}</option>`).join("")}</select>`)}</div><div class="col-md-3">${field("severity", "Severity", `<select class="form-select" id="severity" name="severity"><option>Low</option><option>Medium</option><option selected>High</option></select>`)}</div><div class="col-md-5">${field("description", "Description", `<input class="form-control" id="description" name="description" required>`)}</div><div class="col-12"><button class="btn btn-accent" type="submit">Save defect</button></div></form></div></section>` : ""}
    <section class="card mb-3"><div class="card-header"><h2 class="h6 mb-0">Defects</h2></div><table class="table mb-0"><thead><tr><th>Aircraft</th><th>Description</th><th>Severity</th><th>Status</th></tr></thead><tbody>${state.defects.map((item) => `<tr><td>${esc((aircraftOf(state, item.aircraftId) || {}).code || "")}</td><td>${esc(item.description)}</td><td>${badge(item.severity)}</td><td>${badge(item.status)}</td></tr>`).join("")}</tbody></table></section>
    <section class="card"><div class="card-header"><h2 class="h6 mb-0">Work orders</h2></div><div class="table-responsive"><table class="table mb-0"><thead><tr><th>Reference</th><th>Aircraft</th><th>Status</th><th></th></tr></thead><tbody>${state.workOrders.map((item) => `<tr><td>${esc(item.reference)}</td><td>${esc((aircraftOf(state, item.aircraftId) || {}).code || "")}</td><td>${badge(item.status)}<div class="small text-muted">${esc(item.description)}</div>${item.release ? `<div class="small">Authorized release recorded by ${esc(item.release.by)}. Not a system serviceability decision.</div>` : ""}</td><td>${can("maintenance.record") ? `<button class="btn btn-sm btn-outline-primary" type="button" data-action="work-status" data-id="${esc(item.id)}" data-status="In progress">In progress</button> <button class="btn btn-sm btn-outline-primary" type="button" data-action="work-status" data-id="${esc(item.id)}" data-status="Completed">Completed</button>` : ""} ${can("maintenance.release_record") ? `<button class="btn btn-sm btn-accent" type="button" data-action="release" data-id="${esc(item.id)}">Record release</button>` : ""}</td></tr>`).join("")}</tbody></table></div></section>`);
};

export const renderFuel = (state) => {
  mount(`<div class="row mb-3">${state.tanks.map((tank) => {
    const balance = fuelBalance(state, tank.id);
    return `<div class="col-md-6 mb-3"><article class="card h-100"><div class="card-body"><h3 class="h6">${esc(tank.name)}</h3><p class="kpi-value">${balance} ${esc(tank.unit)}</p><p class="small text-muted">${esc(tank.fuelType)} · threshold ${tank.threshold} ${esc(tank.unit)}</p>${balance < tank.threshold ? `<p>${badge("Low stock")}</p>` : ""}</div></article></div>`;
  }).join("")}</div>
    ${can("fuel.manage") ? `<section class="card mb-3"><div class="card-body"><h2 class="h6">Record transaction</h2><form data-form="fuel" class="row"><div class="col-md-4">${field("tankId", "Tank", `<select class="form-select" id="tankId" name="tankId">${state.tanks.map((tank) => `<option value="${esc(tank.id)}">${esc(tank.name)}</option>`).join("")}</select>`)}</div><div class="col-md-4">${field("type", "Type", `<select class="form-select" id="type" name="type"><option>Receipt</option><option>Issue</option><option>Adjustment</option></select>`)}</div><div class="col-md-4">${field("quantity", "Quantity", `<input class="form-control" id="quantity" name="quantity" type="number" step="0.1" required>`)}</div><div class="col-md-4">${field("reference", "Reference", `<input class="form-control" id="reference" name="reference">`)}</div><div class="col-md-8">${field("reason", "Reason", `<input class="form-control" id="reason" name="reason" placeholder="Required for an adjustment">`)}</div><div class="col-12"><button class="btn btn-accent" type="submit">Save transaction</button></div></form></div></section>` : ""}
    <section class="card"><table class="table mb-0"><thead><tr><th>When</th><th>Tank</th><th>Type</th><th>Quantity</th><th>Reference</th></tr></thead><tbody>${state.fuelTransactions.map((tx) => `<tr><td>${esc(formatDate(tx.at))}</td><td>${esc((findById(state.tanks, tx.tankId) || {}).name || "")}</td><td>${esc(tx.type)}</td><td>${esc(tx.quantity)}</td><td>${esc(tx.reference)}</td></tr>`).join("")}</tbody></table></section>`);
};

export const renderFinance = (state) => {
  const billed = state.cadets.reduce((sum, cadet) => sum + feeAccount(state, cadet).total, 0);
  const collected = state.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const outstanding = state.cadets.reduce((sum, cadet) => sum + feeAccount(state, cadet).outstanding, 0);
  const overdue = state.cadets.filter((cadet) => feeAccount(state, cadet).overdue).length;
  const expenseTotal = state.expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  mount(`<p class="small text-muted">Illustrative demo amounts. No payment gateway is connected, and this is not an accounting ledger.</p><div class="row mb-3">${[["Billed", inr(billed)], ["Collected", inr(collected)], ["Outstanding", inr(outstanding)], ["Overdue accounts", overdue], ["Expenses", inr(expenseTotal)]].map(([label, value]) => `<div class="col-md-4 col-xl mb-3"><article class="card h-100"><div class="card-body"><h3 class="kpi-label">${esc(label)}</h3><p class="kpi-value">${esc(value)}</p></div></article></div>`).join("")}</div>
    <section class="card mb-3"><div class="card-header"><h2 class="h6 mb-0">Cadet accounts</h2></div><div class="table-responsive"><table class="table mb-0"><thead><tr><th>Cadet</th><th>Plan</th><th>Collected</th><th>Outstanding</th></tr></thead><tbody>${state.cadets.map((cadet) => { const fees = feeAccount(state, cadet); return `<tr><td><a href="cadets.html?id=${esc(cadet.id)}&tab=fees">${esc(fullName(cadet))}</a></td><td>${esc(fees.plan ? fees.plan.name : "")}</td><td>${inr(fees.paid)}</td><td>${inr(fees.outstanding)} ${fees.overdue ? badge("Overdue") : ""}</td></tr>`; }).join("")}</tbody></table></div></section>
    ${can("finance.manage") ? `<section class="card mb-3"><div class="card-body"><h2 class="h6">Record expense</h2><form data-form="expense" class="row"><div class="col-md-3">${field("exp-date", "Date", `<input class="form-control" id="exp-date" name="date" type="date" value="${DEMO_TODAY}" required>`)}</div><div class="col-md-3">${field("category", "Category", `<input class="form-control" id="category" name="category" required>`)}</div><div class="col-md-3">${field("exp-amount", "Amount", `<input class="form-control" id="exp-amount" name="amount" type="number" min="1" required>`)}</div><div class="col-md-3">${field("exp-desc", "Description", `<input class="form-control" id="exp-desc" name="description" required>`)}</div><div class="col-12"><button class="btn btn-accent" type="submit">Save expense</button></div></form></div></section>` : ""}
    <section class="card"><table class="table mb-0"><thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th></tr></thead><tbody>${state.expenses.map((expense) => `<tr><td>${esc(formatDate(expense.date))}</td><td>${esc(expense.category)}</td><td>${esc(expense.description)}</td><td>${inr(expense.amount)}</td></tr>`).join("")}</tbody></table></section>`);
};

export const renderStaff = (state) => {
  const id = params().get("id");
  if (id) {
    const person = findById(state.staff, id);
    if (!person) {
      mount(`<p>Staff member not found.</p>`);
      return;
    }
    const blocks = state.availability.filter((item) => item.staffId === person.id);
    mount(`<section class="card mb-3"><div class="card-body"><h2 class="h4">${esc(person.name)}</h2><p>${esc(person.code)} · ${esc(person.role)} · ${esc(person.base)} ${badge(person.availability)}</p><p>${esc(person.email)}</p><h3 class="h6">Illustrative qualifications</h3><ul>${person.qualifications.map((item) => `<li>${esc(item.name)} · dated through ${esc(formatDate(item.expires))}</li>`).join("")}</ul><h3 class="h6">Availability blocks</h3><ul>${blocks.map((item) => `<li>${esc(formatDate(item.date))} ${esc(item.start)}–${esc(item.end)} · ${esc(item.kind)} · ${esc(item.reason)}</li>`).join("") || "<li>None</li>"}</ul>${can("staff.manage") ? `<form data-form="availability" class="row"><input type="hidden" name="staffId" value="${esc(person.id)}"><div class="col-md-3">${field("avl-date", "Date", `<input class="form-control" id="avl-date" name="date" type="date" value="2026-10-01" required>`)}</div><div class="col-md-2">${field("avl-start", "Start", `<input class="form-control" id="avl-start" name="start" type="time" value="13:00" required>`)}</div><div class="col-md-2">${field("avl-end", "End", `<input class="form-control" id="avl-end" name="end" type="time" value="18:00" required>`)}</div><div class="col-md-2">${field("kind", "Kind", `<select class="form-select" id="kind" name="kind"><option>Leave</option><option>Unavailable</option></select>`)}</div><div class="col-md-3">${field("avl-reason", "Reason", `<input class="form-control" id="avl-reason" name="reason" value="Demo leave">`)}</div><div class="col-12"><button class="btn btn-accent" type="submit">Add block</button></div></form>` : ""}</div></section>`);
    return;
  }
  mount(`<section class="card"><table class="table mb-0"><thead><tr><th>Staff ID</th><th>Name</th><th>Role</th><th>Availability</th><th>Qualification date</th></tr></thead><tbody>${state.staff.map((person) => `<tr><td>${esc(person.code)}</td><td><a href="people.html?id=${esc(person.id)}">${esc(person.name)}</a></td><td>${esc(person.role)}</td><td>${badge(person.availability)}</td><td>${esc(formatDate(person.qualifications[0].expires))}</td></tr>`).join("")}</tbody></table><div class="card-body small text-muted">Qualification labels are fictional and are not authorisations.</div></section>`);
};

export const renderDocuments = (state) => {
  const review = params().get("review") || "";
  const rows = state.documents.filter((document) => !review || document.review === review);
  mount(`<div class="toolbar"><a class="btn btn-sm ${review === "" ? "btn-accent" : "btn-outline-primary"}" href="documents.html">All</a><a class="btn btn-sm ${review === "Pending" ? "btn-accent" : "btn-outline-primary"}" href="documents.html?review=Pending">Pending</a><a class="btn btn-sm ${review === "Accepted" ? "btn-accent" : "btn-outline-primary"}" href="documents.html?review=Accepted">Accepted</a></div>
    <section class="card"><table class="table mb-0"><thead><tr><th>Title</th><th>Owner</th><th>Uploaded</th><th>Expiry</th><th>Review</th><th></th></tr></thead><tbody>${rows.map((document) => `<tr><td>${esc(document.title)}<div class="small text-muted">${esc(document.category)} · preview placeholder</div></td><td>${esc(ownerName(state, document))}</td><td>${esc(formatDate(document.uploaded))}</td><td>${document.expires ? esc(formatDate(document.expires)) : "—"}</td><td>${badge(document.review)}</td><td>${can("documents.review") && document.review === "Pending" ? `<button class="btn btn-sm btn-outline-primary" type="button" data-action="review-doc" data-id="${esc(document.id)}" data-review="Accepted">Accept</button> <button class="btn btn-sm btn-outline-danger" type="button" data-action="review-doc" data-id="${esc(document.id)}" data-review="Rejected">Reject</button>` : ""}</td></tr>`).join("") || emptyRow(6, "No documents in this filter.")}</tbody></table></section>`);
};

const ownerName = (state, document) => {
  if (document.ownerType === "Cadet") return fullName(cadetOf(state, document.ownerId));
  if (document.ownerType === "Aircraft") return (aircraftOf(state, document.ownerId) || {}).code || "";
  if (document.ownerType === "Staff") return (staffOf(state, document.ownerId) || {}).name || "";
  return document.ownerType;
};

export const renderApprovals = (state) => {
  const waiting = pendingApprovals(state);
  mount(`<section class="card mb-3"><div class="card-header"><h2 class="h6 mb-0">Flight approvals</h2></div><div class="card-body">${waiting.map((flight) => `<article class="border rounded p-3 mb-3"><h3 class="h6">${esc(flight.reference)} · ${esc(fullName(cadetOf(state, flight.cadetId)))}</h3><p class="mb-2">${esc(formatDate(flight.date))} ${esc(flight.start)}–${esc(flight.end)} · submitted by ${esc(flight.submittedBy || "demo user")}</p><a href="flight-operations.html?id=${esc(flight.id)}">Open flight</a> ${can("flights.approve") ? `<button class="btn btn-sm btn-accent" type="button" data-action="decide-flight" data-id="${esc(flight.id)}" data-decision="Approved">Approve</button> <button class="btn btn-sm btn-outline-danger" type="button" data-action="decide-flight" data-id="${esc(flight.id)}" data-decision="Rejected">Reject</button>` : ""}</article>`).join("") || `<p class="mb-0 text-muted">No flights are awaiting approval.</p>`}</div></section>
    <section class="card"><div class="card-header"><h2 class="h6 mb-0">Document reviews</h2></div><div class="card-body">${state.documents.filter((document) => document.review === "Pending").map((document) => `<p><a href="documents.html?review=Pending">${esc(document.title)}</a></p>`).join("") || `<p class="mb-0 text-muted">No documents are pending review.</p>`}</div></section>`);
};

export const renderReports = (state) => {
  const report = params().get("report") || "roster";
  const reports = [["roster", "Cadet roster"], ["progress", "Training progress"], ["hours", "Flight hours"], ["fleet", "Aircraft utilisation"], ["fuel", "Fuel transactions"], ["fees", "Fee collection"], ["documents", "Document expiry"], ["audit", "Audit activity"]];
  let table = "";
  if (report === "progress") table = state.cadets.map((cadet) => `<tr><td>${esc(fullName(cadet))}</td><td>${progressPercent(state, cadet)}%</td><td>${esc(cadet.status)}</td></tr>`).join("");
  else if (report === "hours") table = state.flights.filter((flight) => flight.status === "Completed").map((flight) => `<tr><td>${esc(flight.reference)}</td><td>${esc(fullName(cadetOf(state, flight.cadetId)))}</td><td>${esc(flight.actual.hours)}</td></tr>`).join("");
  else if (report === "fleet") table = state.aircraft.map((aircraft) => `<tr><td>${esc(aircraft.code)}</td><td>${recordedAircraftHours(state, aircraft.id)}</td><td>${esc(aircraft.status)}</td></tr>`).join("");
  else if (report === "fuel") table = state.fuelTransactions.map((tx) => `<tr><td>${esc(formatDate(tx.at))}</td><td>${esc(tx.type)}</td><td>${esc(tx.quantity)}</td></tr>`).join("");
  else if (report === "fees") table = state.cadets.map((cadet) => { const fees = feeAccount(state, cadet); return `<tr><td>${esc(fullName(cadet))}</td><td>${inr(fees.paid)}</td><td>${inr(fees.outstanding)}</td></tr>`; }).join("");
  else if (report === "documents") table = state.documents.map((document) => `<tr><td>${esc(document.title)}</td><td>${document.expires ? esc(formatDate(document.expires)) : "—"}</td><td>${esc(document.review)}</td></tr>`).join("");
  else if (report === "audit") table = state.audit.map((event) => `<tr><td>${esc(event.at)}</td><td>${esc(event.actor)}</td><td>${esc(event.summary)}</td></tr>`).join("");
  else table = state.cadets.map((cadet) => `<tr><td>${esc(cadet.code)}</td><td>${esc(fullName(cadet))}</td><td>${esc((findById(state.courses, cadet.courseId) || {}).name || "")}</td><td>${recordedCadetHours(state, cadet.id)}</td></tr>`).join("");
  mount(`<div class="toolbar">${reports.map(([id, label]) => `<a class="btn btn-sm ${report === id ? "btn-accent" : "btn-outline-primary"}" href="reports.html?report=${id}">${label}</a>`).join("")}${can("reports.export") ? `<button class="btn btn-sm btn-outline-primary" type="button" data-action="export-report">Demo CSV</button>` : ""}</div><section class="card"><div class="card-body small text-muted">Illustrative report for the demo workspace. Period basis is the seeded records, not a live operational extract.</div><div class="table-responsive"><table class="table mb-0" id="report-table"><tbody>${table}</tbody></table></div></section>`);
};

export const renderSettings = (state) => {
  mount(`<section class="card"><div class="card-body"><h2 class="h5">Academy profile</h2><p class="small text-muted">These values apply to later demo records in this browser. Historical records keep the values they were saved with.</p><form data-form="settings" class="row"><div class="col-md-6">${field("academy-name", "Academy name", `<input class="form-control" id="academy-name" name="name" value="${esc(state.academy.name)}" required>`)}</div><div class="col-md-3">${field("currency", "Currency", `<input class="form-control" id="currency" name="currency" value="${esc(state.academy.currency)}">`)}</div><div class="col-md-3">${field("timeZone", "Time zone", `<input class="form-control" id="timeZone" name="timeZone" value="${esc(state.academy.timeZone)}">`)}</div><div class="col-12"><p>Branch: ${esc(state.academy.branchName)}. Additional branches are not part of this single-base demo.</p><button class="btn btn-accent" type="submit">Save settings</button></div></form></div></section>`);
};

export const renderUsers = (state) => {
  const role = params().get("role") || "academy-admin";
  mount(`<section class="card mb-3"><table class="table mb-0"><thead><tr><th>Name</th><th>Email</th><th>Role</th></tr></thead><tbody>${state.users.map((user) => `<tr><td>${esc(user.name)}</td><td>${esc(user.email)}</td><td><a href="users.html?role=${esc(user.role)}">${esc(ROLE_LABELS[user.role])}</a></td></tr>`).join("")}</tbody></table></section>
    <section class="card mb-3"><div class="card-body"><h2 class="h6">${esc(ROLE_LABELS[role] || role)} permissions</h2><p class="small text-muted">Frontend checks only. A production API must enforce the same rules.</p><ul>${(ROLE_PERMISSIONS[role] || []).map((item) => `<li><code>${esc(item)}</code></li>`).join("")}</ul></div></section>
    ${can("users.manage") ? `<section class="card"><div class="card-body"><h2 class="h6">Add demo user</h2><form data-form="user" class="row"><div class="col-md-4">${field("user-name", "Name", `<input class="form-control" id="user-name" name="name" required>`)}</div><div class="col-md-4">${field("user-email", "Email", `<input class="form-control" id="user-email" name="email" type="email" required>`)}</div><div class="col-md-4">${field("user-role", "Role", `<select class="form-select" id="user-role" name="role">${Object.entries(ROLE_LABELS).map(([id, label]) => `<option value="${esc(id)}">${esc(label)}</option>`).join("")}</select>`)}</div><div class="col-12"><p class="small text-muted">The shared demo password remains “demonstration”.</p><button class="btn btn-accent" type="submit">Add user</button></div></form></div></section>` : ""}`);
};

export const renderAudit = (state) => {
  mount(`<section class="card"><table class="table mb-0"><thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Summary</th></tr></thead><tbody>${state.audit.map((event) => `<tr><td>${esc(event.at.replace("T", " ").slice(0, 16))}</td><td>${esc(event.actor)}<div class="small text-muted">${esc(event.role)}</div></td><td>${esc(event.action)}</td><td>${esc(event.summary)} ${event.reason ? `<div class="small text-muted">${esc(event.reason)}</div>` : ""}</td></tr>`).join("")}</tbody></table></section>`);
};

const portalCadet = (state) => cadetOf(state, (currentUser() || {}).cadetId);

export const renderPortal = (state) => {
  const cadet = portalCadet(state);
  if (!cadet) {
    mount(`<section class="card"><div class="card-body"><p>This portal is the cadet experience. Use the profile menu and choose Aarav Menon.</p></div></section>`);
    return;
  }
  const next = state.flights.find((flight) => flight.cadetId === cadet.id && flight.status === "Approved" && flight.date >= DEMO_TODAY);
  mount(`<section class="card"><div class="card-body"><h2 class="h5">Hello, ${esc(cadet.firstName)}</h2><p>${esc(cadet.code)} · ${esc((findById(state.courses, cadet.courseId) || {}).name || "")}</p><p>Illustrative progress ${progressPercent(state, cadet)}% · Recorded hours ${recordedCadetHours(state, cadet.id)}</p><p>${next ? `Next approved flight ${esc(next.reference)} on ${esc(formatDate(next.date))} at ${esc(next.start)}.` : "No approved flight is scheduled."}</p><a class="btn btn-accent" href="portal-schedule.html">My schedule</a></div></section>`);
};

export const renderPortalSchedule = (state) => {
  const cadet = portalCadet(state);
  const rows = state.flights.filter((flight) => cadet && flight.cadetId === cadet.id && (flight.status === "Approved" || flight.status === "Completed"));
  mount(`<section class="card"><table class="table mb-0"><thead><tr><th>When</th><th>Reference</th><th>Aircraft</th><th>Status</th></tr></thead><tbody>${rows.map((flight) => `<tr><td>${esc(formatDate(flight.date))} ${esc(flight.start)}</td><td>${esc(flight.reference)}</td><td>${esc((aircraftOf(state, flight.aircraftId) || {}).code || "")}</td><td>${badge(flight.status)}</td></tr>`).join("") || emptyRow(4, "No personal flights to show.")}</tbody></table><div class="card-body small text-muted">Drafts, other cadets, and internal notes are not shown.</div></section>`);
};

export const renderPortalTraining = (state) => {
  const cadet = portalCadet(state);
  const syllabus = cadet && findById(state.syllabi, cadet.syllabusId);
  mount(`<section class="card"><div class="card-body"><h2 class="h5">Illustrative progress ${cadet ? progressPercent(state, cadet) : 0}%</h2>${syllabus ? syllabus.phases.map((phase) => `<h3 class="h6 mt-3">${esc(phase.name)}</h3><ul>${phase.items.map((item) => `<li>${esc(item.name)} · ${cadet.completedItemIds.includes(item.id) ? "Recorded" : "Outstanding"}</li>`).join("")}</ul>`).join("") : ""}<p class="small text-muted">Released progress only. Internal comments are not shown.</p></div></section>`);
};

export const renderPortalNotes = (state) => {
  const user = currentUser();
  const notes = state.notifications.filter((item) => item.userId === (user && user.id));
  mount(`<section class="card"><div class="list-group list-group-flush">${notes.map((item) => `<div class="list-group-item"><strong>${esc(item.title)}</strong><div class="small text-muted">${esc(item.body)}</div></div>`).join("") || `<div class="list-group-item text-muted">No notifications.</div>`}</div></section>`);
};

export const renderPortalProfile = (state) => {
  const cadet = portalCadet(state);
  mount(cadet ? `<section class="card"><div class="card-body"><h2 class="h5">${esc(fullName(cadet))}</h2><p>${esc(cadet.email)} · ${esc(cadet.phone)}</p><p>Batch ${esc(cadet.batch)} · Joined ${esc(formatDate(cadet.joiningDate))}</p></div></section>` : `<p>No cadet profile is linked.</p>`);
};

onForm("aircraft-status", (form, data) => {
  if (fail(setAircraftStatus(data.id, data.status, data.reason, data.until))) return;
  toast("Aircraft planning status updated.");
  refresh();
});
onForm("defect", (form, data) => {
  if (fail(addDefect(data))) return;
  toast("Defect and work order recorded.");
  refresh();
});
onForm("fuel", (form, data) => {
  if (fail(addFuelTransaction(data))) return;
  toast("Stock balance updated.");
  refresh();
});
onForm("expense", (form, data) => {
  if (fail(addExpense(data))) return;
  toast("Expense recorded.");
  refresh();
});
onForm("availability", (form, data) => {
  if (fail(addAvailability(data))) return;
  toast("Availability saved. Scheduling will warn on an overlap.");
  refresh();
});
onForm("settings", (form, data) => {
  if (fail(saveAcademySettings(data))) return;
  toast("Settings saved in this browser.");
  refresh();
});
onForm("user", (form, data) => {
  if (fail(addUser(data))) return;
  toast("Demo user added.");
  refresh();
});
onClick("work-status", (button) => {
  if (fail(updateWorkOrder(button.dataset.id, button.dataset.status))) return;
  refresh();
});
onClick("release", async (button) => {
  const answer = await confirmAction({ title: "Record authorized release", body: `<p>This records that an authorized person made an entry. The prototype does not decide serviceability.</p>${reasonField("Release note")}`, confirmLabel: "Record" });
  if (!answer.ok || fail(recordRelease(button.dataset.id, answer.reason))) return;
  toast("Release entry recorded.");
  refresh();
});
onClick("review-doc", (button) => {
  if (fail(reviewDocument(button.dataset.id, button.dataset.review))) return;
  toast("Review updated.");
  refresh();
});
onClick("export-report", () => {
  const table = document.getElementById("report-table");
  if (!table) return;
  const lines = Array.from(table.querySelectorAll("tr")).map((row) => Array.from(row.children).map((cell) => `"${cell.textContent.trim().replace(/"/g, "\"\"")}"`).join(","));
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "airnotix-demo-report.csv";
  link.click();
  URL.revokeObjectURL(link.href);
});
