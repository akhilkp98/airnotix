import { DEMO_TODAY } from "../data/seed";
import {
  aircraftOf,
  blockers,
  cadetOf,
  findById,
  formatDate,
  fullName,
  itemName,
  schedulingIssues,
  staffOf,
  weekDates,
  weekday
} from "../data/derive";
import { can, cancelFlight, completeFlight, correctFlight, currentUser, decideFlight, getState, saveFlight } from "../data/store";
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
const options = (items, selected, label) => items.map((item) => `<option value="${esc(item.id)}"${item.id === selected ? " selected" : ""}>${esc(label(item))}</option>`).join("");
const issuesHtml = (issues) => issues.length ? `<div class="alert ${issues.some((issue) => issue.level === "blocker") ? "alert-warning" : "alert-info"}"><ul class="mb-0">${issues.map((issue) => `<li><strong>${esc(issue.resource)}.</strong> ${esc(issue.message)} ${issue.conflictId ? `<a href="flight-operations.html?id=${esc(issue.conflictId)}">View conflict</a>` : ""}</li>`).join("")}</ul></div>` : `<p class="small text-muted">No overlap, availability, or aircraft planning issues for these values.</p>`;

const renderForm = (state, query) => {
  const existing = query.get("edit") ? findById(state.flights, query.get("edit")) : null;
  const value = existing || { date: query.get("date") || DEMO_TODAY, start: "09:00", end: "10:30", cadetId: "", instructorId: "", aircraftId: "", itemId: "item-circuits", flightType: "Training", notes: "" };
  const items = [];
  state.syllabi.filter((syllabus) => syllabus.status !== "Archived").forEach((syllabus) => syllabus.phases.forEach((phase) => phase.items.forEach((item) => items.push(item))));
  const cadets = currentUser() && currentUser().role === "instructor" ? state.cadets.filter((cadet) => cadet.instructorId === currentUser().staffId) : state.cadets;
  mount(`<section class="card"><div class="card-body"><h2 class="h5">${existing ? `Edit ${esc(existing.reference)}` : "Schedule flight"}</h2><form id="flight-form" data-form="flight">${existing ? `<input type="hidden" name="id" value="${esc(existing.id)}">` : ""}<div class="row">
    <div class="col-md-4">${field("date", "Date", `<input class="form-control" id="date" name="date" type="date" required value="${esc(value.date)}">`)}</div>
    <div class="col-md-4">${field("start", "Start", `<input class="form-control" id="start" name="start" type="time" required value="${esc(value.start)}">`)}</div>
    <div class="col-md-4">${field("end", "End", `<input class="form-control" id="end" name="end" type="time" required value="${esc(value.end)}">`)}</div>
    <div class="col-md-6">${field("cadetId", "Cadet", `<select class="form-select" id="cadetId" name="cadetId" required><option value="">Choose</option>${options(cadets, value.cadetId, fullName)}</select>`)}</div>
    <div class="col-md-6">${field("itemId", "Training item", `<select class="form-select" id="itemId" name="itemId">${items.map((item) => `<option value="${esc(item.id)}"${item.id === value.itemId ? " selected" : ""}>${esc(item.name)}</option>`).join("")}</select>`)}</div>
    <div class="col-md-6">${field("instructorId", "Instructor", `<select class="form-select" id="instructorId" name="instructorId" required><option value="">Choose</option>${options(state.staff.filter((item) => /instructor/i.test(item.role)), value.instructorId, (item) => item.name)}</select>`)}</div>
    <div class="col-md-6">${field("aircraftId", "Aircraft", `<select class="form-select" id="aircraftId" name="aircraftId" required><option value="">Choose</option>${options(state.aircraft, value.aircraftId, (item) => `${item.code} · ${item.status}`)}</select>`)}</div>
    <div class="col-md-6">${field("flightType", "Flight type", `<select class="form-select" id="flightType" name="flightType"><option>Training</option><option>Progress check</option></select>`)}</div>
    <div class="col-12">${field("notes", "Notes", `<textarea class="form-control" id="notes" name="notes" rows="2">${esc(value.notes || "")}</textarea>`)}</div>
  </div><div id="flight-issues"></div><p class="small text-muted">A draft may keep a conflict. Approval stays blocked until the conflict is cleared. The form will not switch the aircraft or instructor for you.</p>
  <button class="btn btn-outline-primary" type="submit" name="intent" value="draft">Save draft</button>
  ${can("flights.submit") ? `<button class="btn btn-accent" type="submit" name="intent" value="submit">Submit for approval</button>` : ""}
  <a class="btn btn-link" href="flight-operations.html">Cancel</a></form></div></section>`);
  const form = document.getElementById("flight-form");
  const paint = () => {
    const data = Object.fromEntries(new FormData(form).entries());
    document.getElementById("flight-issues").innerHTML = issuesHtml(schedulingIssues(state, data, data.id));
  };
  form.addEventListener("input", paint);
  paint();
};

const renderDetail = (state, id) => {
  const flight = findById(state.flights, id);
  if (!flight) {
    mount(`<p>That flight is not in the demo calendar. <a href="flight-operations.html">Back</a></p>`);
    return;
  }
  const issues = schedulingIssues(state, flight, flight.id);
  const actions = [];
  if ((flight.status === "Draft" || flight.status === "Rejected") && can("flights.update")) actions.push(`<a class="btn btn-outline-primary" href="flight-operations.html?edit=${esc(flight.id)}">Edit draft</a>`);
  if (flight.status === "Draft" && can("flights.submit")) actions.push(`<button class="btn btn-accent" type="button" data-action="submit-flight" data-id="${esc(flight.id)}">Submit for approval</button>`);
  if (flight.status === "Awaiting approval" && can("flights.approve")) {
    actions.push(`<button class="btn btn-accent" type="button" data-action="decide-flight" data-id="${esc(flight.id)}" data-decision="Approved">Approve</button>`);
    actions.push(`<button class="btn btn-outline-danger" type="button" data-action="decide-flight" data-id="${esc(flight.id)}" data-decision="Rejected">Reject</button>`);
  }
  if (flight.status !== "Completed" && flight.status !== "Cancelled" && (can("flights.update") || can("flights.approve"))) actions.push(`<button class="btn btn-outline-danger" type="button" data-action="cancel-flight" data-id="${esc(flight.id)}">Cancel</button>`);
  if (flight.status === "Approved" && can("flights.complete")) actions.push(`<a class="btn btn-accent" href="flight-operations.html?id=${esc(flight.id)}&complete=1">Record completion</a>`);
  const showComplete = params().get("complete") === "1" && flight.status === "Approved" && can("flights.complete");
  mount(`<section class="card mb-3"><div class="card-body"><h2 class="h4">${esc(flight.reference)} ${badge(flight.status)}</h2>
    <dl class="row"><dt class="col-sm-3">When</dt><dd class="col-sm-9">${esc(formatDate(flight.date))} ${esc(flight.start)}–${esc(flight.end)}</dd>
    <dt class="col-sm-3">Cadet</dt><dd class="col-sm-9"><a href="cadets.html?id=${esc(flight.cadetId)}">${esc(fullName(cadetOf(state, flight.cadetId)))}</a></dd>
    <dt class="col-sm-3">Training item</dt><dd class="col-sm-9">${esc(itemName(state, flight.itemId))}</dd>
    <dt class="col-sm-3">Instructor</dt><dd class="col-sm-9">${esc((staffOf(state, flight.instructorId) || {}).name || "")}</dd>
    <dt class="col-sm-3">Aircraft</dt><dd class="col-sm-9"><a href="fleet.html?id=${esc(flight.aircraftId)}">${esc((aircraftOf(state, flight.aircraftId) || {}).code || "")}</a></dd>
    <dt class="col-sm-3">Notes</dt><dd class="col-sm-9">${esc(flight.notes || "—")}</dd>
    <dt class="col-sm-3">Decision</dt><dd class="col-sm-9">${flight.approval ? `${esc(flight.approval.decision)} by ${esc(flight.approval.by)}: ${esc(flight.approval.comment)}` : "Not decided"}</dd>
    ${flight.actual ? `<dt class="col-sm-3">Actual</dt><dd class="col-sm-9">${esc(flight.actual.hours)} h · ${esc(flight.actual.outcome)} · ${esc(flight.actual.comments || "")}</dd>` : ""}</dl>
    ${issuesHtml(issues)}<div class="d-flex flex-wrap gap-2">${actions.join("")}</div></div></section>
    ${showComplete ? `<section class="card"><div class="card-body"><h2 class="h6">Record completion</h2><form data-form="complete"><input type="hidden" name="id" value="${esc(flight.id)}"><div class="row">
      <div class="col-md-3">${field("actualStart", "Actual start", `<input class="form-control" id="actualStart" name="start" type="time" value="${esc(flight.start)}" required>`)}</div>
      <div class="col-md-3">${field("actualEnd", "Actual end", `<input class="form-control" id="actualEnd" name="end" type="time" value="${esc(flight.end)}" required>`)}</div>
      <div class="col-md-3">${field("hours", "Actual hours", `<input class="form-control" id="hours" name="hours" type="number" min="0.1" step="0.1" value="1.2" required>`)}</div>
      <div class="col-md-3">${field("outcome", "Outcome", `<select class="form-select" id="outcome" name="outcome"><option>Satisfactory</option><option>Further Training Required</option><option>Not Assessed</option></select>`)}</div>
      <div class="col-md-6">${field("attendance", "Attendance", `<select class="form-select" id="attendance" name="attendance"><option>Present</option><option>Absent</option></select>`)}</div>
      <div class="col-md-6">${field("comments", "Comments", `<input class="form-control" id="comments" name="comments">`)}</div>
      <div class="col-12"><div class="form-check mb-3"><input class="form-check-input" id="followUp" name="followUp" type="checkbox"><label class="form-check-label" for="followUp">Follow-up required</label></div></div>
    </div><button class="btn btn-accent" type="submit">Submit completion</button></form></div></section>` : ""}
    ${flight.status === "Completed" && can("flights.complete") ? `<section class="card"><div class="card-body"><h2 class="h6">Correction</h2><form data-form="correct" class="row"><input type="hidden" name="id" value="${esc(flight.id)}"><div class="col-md-3">${field("revised", "Revised hours", `<input class="form-control" id="revised" name="hours" type="number" step="0.1" min="0.1" value="${esc(flight.actual.hours)}" required>`)}</div><div class="col-md-6">${field("reason", "Reason", `<input class="form-control" id="reason" name="reason" required>`)}</div><div class="col-12"><button class="btn btn-outline-primary" type="submit">Save correction</button></div></form></div></section>` : ""}`);
};

export const renderFlights = (state) => {
  const query = params();
  if (query.get("new") === "1" || query.get("edit")) {
    renderForm(state, query);
    return;
  }
  if (query.get("id")) {
    renderDetail(state, query.get("id"));
    return;
  }
  const narrow = window.matchMedia("(max-width: 767.98px)").matches;
  const mode = query.get("view") || (narrow ? "agenda" : "week");
  const date = query.get("date") || DEMO_TODAY;
  const dates = weekDates(date);
  const flights = state.flights.filter((flight) => (!query.get("status") || flight.status === query.get("status")) && (!query.get("aircraft") || flight.aircraftId === query.get("aircraft")));
  const head = `<div class="toolbar"><div class="btn-group"><a class="btn btn-sm ${mode === "week" ? "btn-accent" : "btn-outline-primary"}" href="flight-operations.html?view=week&date=${esc(date)}">Week</a><a class="btn btn-sm ${mode === "day" ? "btn-accent" : "btn-outline-primary"}" href="flight-operations.html?view=day&date=${esc(date)}">Day</a><a class="btn btn-sm ${mode === "agenda" ? "btn-accent" : "btn-outline-primary"}" href="flight-operations.html?view=agenda&date=${esc(date)}">Agenda</a></div><form class="d-flex gap-2" data-form="flight-date"><input class="form-control" type="date" name="date" value="${esc(date)}" aria-label="Calendar date"><input type="hidden" name="view" value="${esc(mode)}"><button class="btn btn-outline-primary" type="submit">Show</button></form>${can("flights.create") ? `<a class="btn btn-accent" href="flight-operations.html?new=1&date=${esc(date)}">Schedule flight</a>` : ""}</div><p class="small text-muted">${esc(state.academy.branchName)} · ${esc(state.academy.timeZone)}. Demo day is ${esc(formatDate(DEMO_TODAY))}.</p>`;
  if (mode !== "week") {
    const list = flights.filter((flight) => (mode === "day" ? flight.date === date : dates.includes(flight.date))).sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));
    mount(`${head}<section class="card"><div class="table-responsive"><table class="table mb-0"><thead><tr><th>When</th><th>Reference</th><th>Cadet</th><th>Instructor</th><th>Aircraft</th><th>Status</th></tr></thead><tbody>${list.map((flight) => `<tr><td>${esc(formatDate(flight.date))} ${esc(flight.start)}</td><td><a href="flight-operations.html?id=${esc(flight.id)}">${esc(flight.reference)}</a></td><td>${esc(fullName(cadetOf(state, flight.cadetId)))}</td><td>${esc((staffOf(state, flight.instructorId) || {}).name || "")}</td><td>${esc((aircraftOf(state, flight.aircraftId) || {}).code || "")}</td><td>${badge(flight.status)}</td></tr>`).join("") || emptyRow(6, "No flights in this view.")}</tbody></table></div></section>`);
    return;
  }
  mount(`${head}<div class="week-board">${dates.map((day) => `<section><header><strong>${weekday(day)}</strong><span>${esc(day.slice(8))}</span>${can("flights.create") ? `<a href="flight-operations.html?new=1&date=${day}">Add</a>` : ""}</header>${flights.filter((flight) => flight.date === day).sort((a, b) => a.start.localeCompare(b.start)).map((flight) => `<a class="flight-chip" href="flight-operations.html?id=${esc(flight.id)}"><strong>${esc(flight.start)}</strong> ${esc(fullName(cadetOf(state, flight.cadetId)))}<span>${esc((aircraftOf(state, flight.aircraftId) || {}).code || "")} · ${esc(((staffOf(state, flight.instructorId) || {}).name || "").split(" ")[0])}</span><em>${esc(flight.status)}</em></a>`).join("") || `<p class="small text-muted">No flights</p>`}</section>`).join("")}</div>`);
};

onForm("flight-date", (form, data) => {
  window.location.href = `flight-operations.html?view=${data.view || "week"}&date=${data.date}`;
});
onForm("flight", (form, data, event) => {
  const submit = event.submitter && event.submitter.value === "submit";
  const result = saveFlight(data, submit);
  if (fail(result)) return;
  toast(submit ? "Submitted for approval." : "Draft saved.");
  window.location.href = `flight-operations.html?id=${result.id}`;
});
onForm("complete", (form, data) => {
  data.followUp = Boolean(form.querySelector("[name=followUp]").checked);
  if (fail(completeFlight(data.id, data))) return;
  toast("Completion recorded. Cadet and aircraft hours now include it.");
  window.location.href = `flight-operations.html?id=${data.id}`;
});
onForm("correct", (form, data) => {
  if (fail(correctFlight(data.id, data.hours, data.reason))) return;
  toast("Correction stored in the activity log.");
  refresh();
});
onClick("submit-flight", (button) => {
  const flight = findById(getState().flights, button.dataset.id);
  const result = saveFlight(flight, true);
  if (fail(result)) return;
  toast("Submitted for approval.");
  window.location.href = `flight-operations.html?id=${flight.id}`;
});
onClick("decide-flight", async (button) => {
  const flight = findById(getState().flights, button.dataset.id);
  const state = getState();
  if (button.dataset.decision === "Approved" && blockers(schedulingIssues(state, flight, flight.id)).length) {
    toast(blockers(schedulingIssues(state, flight, flight.id))[0].message);
    return;
  }
  const answer = await confirmAction({ title: `${button.dataset.decision} flight`, body: reasonField("Comment"), confirmLabel: button.dataset.decision });
  if (!answer.ok || fail(decideFlight(button.dataset.id, button.dataset.decision, answer.reason))) return;
  toast(`Flight ${button.dataset.decision.toLowerCase()}.`);
  refresh();
});
onClick("cancel-flight", async (button) => {
  const answer = await confirmAction({ title: "Cancel flight", body: reasonField("Reason"), confirmLabel: "Cancel flight", danger: true });
  if (!answer.ok || fail(cancelFlight(button.dataset.id, answer.reason))) return;
  toast("Flight cancelled.");
  refresh();
});
