import { DEMO_TODAY } from "../data/seed";
import {
  cadetOf,
  courseOf,
  feeAccount,
  findById,
  fullName,
  inr,
  itemName,
  progressPercent,
  recordedCadetHours,
  staffOf,
  aircraftOf,
  formatDate
} from "../data/derive";
import {
  addPayment,
  addSyllabusItem,
  addSyllabusPhase,
  can,
  currentUser,
  moveSyllabusItem,
  publishSyllabus,
  saveAssessment,
  saveCadet,
  setCadetStatus
} from "../data/store";
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
const visibleCadets = (state) => {
  const user = currentUser();
  return user && user.role === "instructor" ? state.cadets.filter((cadet) => cadet.instructorId === user.staffId) : state.cadets;
};

export const renderCadets = (state) => {
  const query = params();
  if (query.get("new") === "1" || query.get("edit")) {
    const cadet = query.get("edit") ? findById(state.cadets, query.get("edit")) : null;
    mount(`<section class="card"><div class="card-body"><h2 class="h5">${cadet ? "Edit cadet" : "Add cadet"}</h2><form data-form="cadet" class="row">${cadet ? `<input type="hidden" name="id" value="${esc(cadet.id)}">` : ""}
      <div class="col-md-6">${field("cadet-code", "Cadet ID", `<input class="form-control" id="cadet-code" value="${esc(cadet ? cadet.code : "Assigned on save")}" readonly>`)}</div>
      <div class="col-md-6">${field("firstName", "First name", `<input class="form-control" id="firstName" name="firstName" required value="${esc(cadet ? cadet.firstName : "")}">`)}</div>
      <div class="col-md-6">${field("lastName", "Last name", `<input class="form-control" id="lastName" name="lastName" required value="${esc(cadet ? cadet.lastName : "")}">`)}</div>
      <div class="col-md-6">${field("email", "Email", `<input class="form-control" id="email" name="email" type="email" value="${esc(cadet ? cadet.email : "")}">`)}</div>
      <div class="col-md-6">${field("phone", "Phone", `<input class="form-control" id="phone" name="phone" value="${esc(cadet ? cadet.phone : "")}">`)}</div>
      <div class="col-md-6">${field("dob", "Date of birth", `<input class="form-control" id="dob" name="dob" type="date" value="${esc(cadet ? cadet.dob : "")}">`)}</div>
      <div class="col-md-6">${field("courseId", "Course", `<select class="form-select" id="courseId" name="courseId" required><option value="">Choose</option>${options(state.courses, cadet && cadet.courseId, (item) => item.name)}</select>`)}</div>
      <div class="col-md-6">${field("batch", "Batch", `<input class="form-control" id="batch" name="batch" value="${esc(cadet ? cadet.batch : "")}">`)}</div>
      <div class="col-md-6">${field("joiningDate", "Joining date", `<input class="form-control" id="joiningDate" name="joiningDate" type="date" required value="${esc(cadet ? cadet.joiningDate : DEMO_TODAY)}">`)}</div>
      <div class="col-md-6">${field("instructorId", "Instructor", `<select class="form-select" id="instructorId" name="instructorId">${options(state.staff.filter((item) => /instructor/i.test(item.role)), cadet && cadet.instructorId, (item) => item.name)}</select>`)}</div>
      <div class="col-12"><p class="small text-muted">Branch: ${esc(state.academy.branchName)}. Saving assigns the course's current published syllabus.</p><button class="btn btn-accent" type="submit">Save cadet</button> <a class="btn btn-outline-secondary" href="cadets.html">Cancel</a></div>
    </form></div></section>`);
    return;
  }
  if (query.get("id")) {
    renderProfile(state, query.get("id"), query.get("tab") || "overview");
    return;
  }
  const status = query.get("status") || "";
  const course = query.get("course") || "";
  const search = (query.get("q") || "").toLowerCase();
  const rows = visibleCadets(state).filter((cadet) => (!status || cadet.status === status) && (!course || cadet.courseId === course) && (!search || `${cadet.code} ${fullName(cadet)} ${cadet.batch}`.toLowerCase().includes(search)));
  mount(`<div class="toolbar"><form class="d-flex flex-wrap gap-2" data-form="cadet-filter"><input class="form-control" name="q" value="${esc(query.get("q") || "")}" placeholder="Search name or cadet ID" aria-label="Search cadets"><select class="form-select" name="course" aria-label="Course"><option value="">All courses</option>${state.courses.map((item) => `<option value="${esc(item.id)}"${item.id === course ? " selected" : ""}>${esc(item.name)}</option>`).join("")}</select><select class="form-select" name="status" aria-label="Status"><option value="">All statuses</option>${["Active", "On Hold", "Completed", "Archived"].map((item) => `<option${item === status ? " selected" : ""}>${item}</option>`).join("")}</select><button class="btn btn-outline-primary" type="submit">Apply</button></form>${can("cadets.create") ? `<a class="btn btn-accent" href="cadets.html?new=1">Add cadet</a>` : ""}</div>
    <section class="card"><div class="table-responsive"><table class="table table-hover mb-0"><thead><tr><th>Cadet ID</th><th>Name</th><th>Course</th><th>Batch</th><th>Progress</th><th>Recorded hours</th><th>Status</th><th></th></tr></thead><tbody>
    ${rows.map((cadet) => `<tr><td>${esc(cadet.code)}</td><td><a href="cadets.html?id=${esc(cadet.id)}">${esc(fullName(cadet))}</a></td><td>${esc((courseOf(state, cadet) || {}).name || "")}</td><td>${esc(cadet.batch)}</td><td>${progressPercent(state, cadet)}%</td><td>${recordedCadetHours(state, cadet.id)}</td><td>${badge(cadet.status)}</td><td>${can("cadets.update") ? `<a class="btn btn-sm btn-outline-primary" href="cadets.html?edit=${esc(cadet.id)}">Edit</a>` : ""}</td></tr>`).join("") || emptyRow(8, "No cadets match these filters.")}
    </tbody></table></div><div class="card-body small text-muted">Showing ${rows.length} records. Illustrative progress is completed required items divided by the course count. Hours are the opening balance plus completed flights.</div></section>`);
};

const renderProfile = (state, id, tab) => {
  const cadet = findById(state.cadets, id);
  const user = currentUser();
  if (!cadet) {
    mount(`<p>That cadet is not in this demo workspace.</p>`);
    return;
  }
  if (user && user.role === "instructor" && cadet.instructorId !== user.staffId) {
    mount(`<section class="card"><div class="card-body"><h2 class="h5">Outside your assigned cadets</h2><p>This instructor role only opens cadets assigned to ${esc(user.name)}.</p></div></section>`);
    return;
  }
  const course = courseOf(state, cadet);
  const tabs = ["overview", "training", "flights", "documents", "activity"].concat(can("finance.view") ? ["fees"] : []);
  const syllabus = findById(state.syllabi, cadet.syllabusId);
  const flights = state.flights.filter((flight) => flight.cadetId === cadet.id);
  let panel = "";
  if (tab === "training" && syllabus) {
    panel = syllabus.phases.map((phase) => `<h3 class="h6 mt-3">${esc(phase.name)}</h3><ul class="list-group">${phase.items.map((item) => `<li class="list-group-item d-flex justify-content-between"><span>${esc(item.name)} <span class="small text-muted">${esc(item.type)}</span></span>${badge(cadet.completedItemIds.includes(item.id) ? "Completed" : "Not Assessed")}</li>`).join("")}</ul>`).join("") + `<p class="small text-muted mt-2">Illustrative progress ${progressPercent(state, cadet)}% (${cadet.completedRequired} of ${course.requiredCount}). Not an approved syllabus.</p>`;
  } else if (tab === "flights") {
    panel = `<table class="table"><thead><tr><th>Date</th><th>Exercise</th><th>Instructor</th><th>Aircraft</th><th>Hours</th><th>Status</th></tr></thead><tbody>${flights.map((flight) => `<tr><td><a href="flight-operations.html?id=${esc(flight.id)}">${esc(formatDate(flight.date))}</a></td><td>${esc(itemName(state, flight.itemId))}</td><td>${esc((staffOf(state, flight.instructorId) || {}).name || "")}</td><td>${esc((aircraftOf(state, flight.aircraftId) || {}).code || "")}</td><td>${flight.actual ? esc(flight.actual.hours) : "—"}</td><td>${badge(flight.status)}</td></tr>`).join("") || emptyRow(6, "No flights yet.")}</tbody></table>`;
  } else if (tab === "documents") {
    const docs = state.documents.filter((document) => document.ownerId === cadet.id);
    panel = docs.map((document) => `<article class="border rounded p-3 mb-2"><strong>${esc(document.title)}</strong><div class="small text-muted">${esc(document.review)} · ${document.expires ? `Expires ${esc(formatDate(document.expires))}` : "No expiry"}</div><p class="small mb-0">Preview placeholder. Files are not stored in this browser.</p></article>`).join("") || `<p class="text-muted">No documents linked.</p>`;
  } else if (tab === "fees") {
    const fees = feeAccount(state, cadet);
    panel = `<p>${esc(fees.plan ? fees.plan.name : "No plan")} · Total ${inr(fees.total)} · Collected ${inr(fees.paid)} · Outstanding ${inr(fees.outstanding)} ${fees.overdue ? badge("Overdue") : ""}</p><table class="table"><thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Reference</th></tr></thead><tbody>${state.payments.filter((payment) => payment.cadetId === cadet.id).map((payment) => `<tr><td>${esc(formatDate(payment.date))}</td><td>${inr(payment.amount)}</td><td>${esc(payment.method)}</td><td>${esc(payment.reference)}</td></tr>`).join("") || emptyRow(4, "No payments.")}</tbody></table>${can("finance.manage") ? `<form data-form="payment" class="row"><input type="hidden" name="cadetId" value="${esc(cadet.id)}"><div class="col-md-3">${field("amount", "Amount (INR)", `<input class="form-control" id="amount" name="amount" type="number" min="1" required>`)}</div><div class="col-md-3">${field("pay-date", "Date", `<input class="form-control" id="pay-date" name="date" type="date" value="${DEMO_TODAY}" required>`)}</div><div class="col-md-3">${field("method", "Method", `<select class="form-select" id="method" name="method"><option>Bank transfer</option><option>Card</option><option>Cash</option></select>`)}</div><div class="col-md-3">${field("reference", "Reference", `<input class="form-control" id="reference" name="reference">`)}</div><div class="col-12"><button class="btn btn-accent" type="submit">Record payment</button></div></form>` : ""}`;
  } else if (tab === "activity") {
    panel = state.audit.filter((event) => event.resourceId === cadet.id).map((event) => `<article class="border-bottom py-2"><strong>${esc(event.action)}</strong> · ${esc(event.actor)}<div class="small text-muted">${esc(event.summary)} ${event.reason ? `· ${esc(event.reason)}` : ""}</div></article>`).join("") || `<p class="text-muted">No activity yet.</p>`;
  } else {
    const next = flights.find((flight) => flight.status === "Approved" && flight.date >= DEMO_TODAY);
    panel = `<div class="row"><div class="col-md-6"><p><strong>Email</strong><br>${esc(cadet.email || "—")}</p><p><strong>Phone</strong><br>${esc(cadet.phone || "—")}</p><p><strong>Joined</strong><br>${esc(formatDate(cadet.joiningDate))}</p></div><div class="col-md-6"><p><strong>Illustrative progress</strong><br>${progressPercent(state, cadet)}%</p><p><strong>Recorded hours</strong><br>${recordedCadetHours(state, cadet.id)}</p><p><strong>Next approved flight</strong><br>${next ? `${esc(next.reference)} · ${esc(formatDate(next.date))} ${esc(next.start)}` : "None"}</p></div></div>`;
  }
  const statusButtons = can("cadets.update") ? ["Active", "On Hold", "Completed", "Archived"].filter((status) => status !== cadet.status).map((status) => `<button class="btn btn-sm btn-outline-primary" type="button" data-action="cadet-status" data-id="${esc(cadet.id)}" data-status="${esc(status)}">Mark ${esc(status)}</button>`).join(" ") : "";
  mount(`<section class="card"><div class="card-body"><div class="d-flex justify-content-between flex-wrap gap-2"><div><h2 class="h4 mb-1">${esc(fullName(cadet))}</h2><p class="mb-2 text-muted">${esc(cadet.code)} · ${esc(course ? course.name : "")} · ${esc(cadet.batch)} ${badge(cadet.status)}</p></div><div class="d-flex gap-2 flex-wrap">${can("cadets.update") ? `<a class="btn btn-sm btn-outline-primary" href="cadets.html?edit=${esc(cadet.id)}">Edit</a>` : ""}${statusButtons}</div></div><ul class="nav nav-tabs">${tabs.map((item) => `<li class="nav-item"><a class="nav-link${item === tab ? " active" : ""}" href="cadets.html?id=${esc(cadet.id)}&tab=${item}">${item[0].toUpperCase()}${item.slice(1)}</a></li>`).join("")}</ul><div class="pt-3">${panel}</div></div></section>`);
};

export const renderTraining = (state) => {
  const view = params().get("view") || "courses";
  const links = [["courses", "Courses"], ["syllabus", "Syllabus builder"], ["progress", "Cadet progress"], ["ground", "Ground school"], ["assessments", "Assessments"]];
  let body = "";
  if (view === "syllabus") {
    body = state.syllabi.map((syllabus) => `<section class="card mb-3"><div class="card-header d-flex justify-content-between"><h2 class="h6 mb-0">${esc(syllabus.label)}</h2>${badge(syllabus.status)}</div><div class="card-body">${syllabus.phases.map((phase) => `<h3 class="h6">${esc(phase.name)}</h3><ol>${phase.items.map((item) => `<li>${esc(item.name)} <span class="small text-muted">${esc(item.type)}</span> ${syllabus.status === "Draft" && can("training.configure") ? `<button class="btn btn-sm btn-link" type="button" data-action="move-item" data-syllabus="${esc(syllabus.id)}" data-phase="${esc(phase.id)}" data-item="${esc(item.id)}" data-direction="-1">Up</button><button class="btn btn-sm btn-link" type="button" data-action="move-item" data-syllabus="${esc(syllabus.id)}" data-phase="${esc(phase.id)}" data-item="${esc(item.id)}" data-direction="1">Down</button>` : ""}</li>`).join("")}</ol>${syllabus.status === "Draft" && can("training.configure") ? `<form data-form="syllabus-item" class="row g-2 mb-3"><input type="hidden" name="syllabusId" value="${esc(syllabus.id)}"><input type="hidden" name="phaseId" value="${esc(phase.id)}"><div class="col-md-5"><input class="form-control" name="name" placeholder="Item name" aria-label="Item name" required></div><div class="col-md-4"><select class="form-select" name="type" aria-label="Item type"><option>Knowledge item</option><option>Ground lesson</option><option>Flight exercise</option><option>Assessment</option><option>Progress check</option></select></div><div class="col-md-3"><button class="btn btn-outline-primary" type="submit">Add item</button></div></form>` : ""}`).join("")}${syllabus.status === "Draft" && can("training.configure") ? `<form data-form="syllabus-phase" class="d-flex gap-2"><input type="hidden" name="syllabusId" value="${esc(syllabus.id)}"><input class="form-control" name="name" placeholder="New phase" aria-label="Phase name" required><button class="btn btn-outline-primary" type="submit">Add phase</button></form><button class="btn btn-accent mt-3" type="button" data-action="publish-syllabus" data-id="${esc(syllabus.id)}">Publish version</button>` : `<p class="small text-muted mb-0">Illustrative structure. Not an approved syllabus. Existing cadet assignments stay on their version.</p>`}</div></section>`).join("");
  } else if (view === "progress") {
    body = `<section class="card"><table class="table mb-0"><thead><tr><th>Cadet</th><th>Course</th><th>Illustrative progress</th></tr></thead><tbody>${visibleCadets(state).map((cadet) => `<tr><td><a href="cadets.html?id=${esc(cadet.id)}&tab=training">${esc(fullName(cadet))}</a></td><td>${esc((courseOf(state, cadet) || {}).name || "")}</td><td>${progressPercent(state, cadet)}%</td></tr>`).join("")}</tbody></table></section>`;
  } else if (view === "ground") {
    const lessons = [];
    state.syllabi.filter((syllabus) => syllabus.status === "Published").forEach((syllabus) => syllabus.phases.forEach((phase) => phase.items.forEach((item) => {
      if (item.type === "Ground lesson" || item.type === "Knowledge item") lessons.push(item.name);
    })));
    body = `<section class="card"><div class="card-body"><p class="text-muted">Published knowledge items and ground lessons. No files are attached.</p><ul>${lessons.map((lesson) => `<li>${esc(lesson)}</li>`).join("")}</ul></div></section>`;
  } else if (view === "assessments") {
    const items = [];
    state.syllabi.forEach((syllabus) => syllabus.phases.forEach((phase) => phase.items.forEach((item) => items.push(item))));
    body = `${can("training.assess") ? `<section class="card mb-3"><div class="card-body"><h2 class="h6">Record assessment</h2><p class="small text-muted">Satisfactory increases illustrative progress by one the first time that item is recorded. This does not certify competence.</p><form data-form="assessment" class="row"><div class="col-md-4">${field("cadetId", "Cadet", `<select class="form-select" id="cadetId" name="cadetId" required><option value="">Choose</option>${options(visibleCadets(state), "", fullName)}</select>`)}</div><div class="col-md-4">${field("itemId", "Training item", `<select class="form-select" id="itemId" name="itemId" required><option value="">Choose</option>${items.map((item) => `<option value="${esc(item.id)}">${esc(item.name)}</option>`).join("")}</select>`)}</div><div class="col-md-4">${field("outcome", "Outcome", `<select class="form-select" id="outcome" name="outcome"><option>Satisfactory</option><option>Further Training Required</option><option>Not Assessed</option></select>`)}</div><div class="col-md-4">${field("assess-date", "Date", `<input class="form-control" id="assess-date" name="date" type="date" value="${DEMO_TODAY}">`)}</div><div class="col-md-8">${field("comments", "Comments", `<input class="form-control" id="comments" name="comments">`)}</div><div class="col-12"><button class="btn btn-accent" type="submit">Save assessment</button></div></form></div></section>` : `<p class="text-muted">Your role can review assessments already recorded.</p>`}<section class="card"><table class="table mb-0"><thead><tr><th>Date</th><th>Cadet</th><th>Item</th><th>Outcome</th><th>Assessor</th></tr></thead><tbody>${state.assessments.map((item) => `<tr><td>${esc(formatDate(item.date))}</td><td>${esc(fullName(cadetOf(state, item.cadetId)))}</td><td>${esc(itemName(state, item.itemId))}</td><td>${badge(item.outcome)}</td><td>${esc(item.assessor)}</td></tr>`).join("") || emptyRow(5, "No assessments recorded yet.")}</tbody></table></section>`;
  } else {
    body = `<section class="card"><table class="table mb-0"><thead><tr><th>Code</th><th>Course</th><th>Type</th><th>Syllabus</th><th>Enrolled</th><th>Status</th></tr></thead><tbody>${state.courses.map((course) => `<tr><td>${esc(course.code)}</td><td>${esc(course.name)}</td><td>${esc(course.type)}</td><td>${esc((findById(state.syllabi, course.syllabusId) || {}).label || "")}</td><td>${state.cadets.filter((cadet) => cadet.courseId === course.id).length}</td><td>${badge(course.status)}</td></tr>`).join("")}</tbody></table><div class="card-body small text-muted">Example programmes only. Not a regulator-approved syllabus.</div></section>`;
  }
  mount(`<div class="toolbar">${links.map(([id, label]) => `<a class="btn btn-sm ${view === id ? "btn-accent" : "btn-outline-primary"}" href="training.html?view=${id}">${label}</a>`).join("")}</div>${body}`);
};

onForm("cadet-filter", (form, data) => {
  const next = new URLSearchParams();
  ["q", "course", "status"].forEach((key) => { if (data[key]) next.set(key, data[key]); });
  window.location.href = `cadets.html?${next.toString()}`;
});
onForm("cadet", (form, data) => {
  const result = saveCadet(data);
  if (fail(result)) return;
  toast("Cadet saved.");
  window.location.href = `cadets.html?id=${result.id}`;
});
onForm("payment", (form, data) => {
  if (fail(addPayment(data))) return;
  toast("Payment recorded. Collected and outstanding totals now include it.");
  refresh();
});
onForm("assessment", (form, data) => {
  if (fail(saveAssessment(data))) return;
  toast("Assessment recorded.");
  refresh();
});
onForm("syllabus-phase", (form, data) => {
  if (fail(addSyllabusPhase(data.syllabusId, data.name))) return;
  refresh();
});
onForm("syllabus-item", (form, data) => {
  if (fail(addSyllabusItem(data.syllabusId, data.phaseId, data))) return;
  refresh();
});
onClick("cadet-status", async (button) => {
  const answer = await confirmAction({ title: `Mark cadet ${button.dataset.status}`, body: `<p>This stores a demo status and an activity entry.</p>${reasonField("Reason")}`, confirmLabel: "Update status" });
  if (!answer.ok || fail(setCadetStatus(button.dataset.id, button.dataset.status, answer.reason))) return;
  toast("Status updated.");
  refresh();
});
onClick("publish-syllabus", async (button) => {
  const answer = await confirmAction({ title: "Publish syllabus version", body: "<p>Cadets already assigned keep their current version until someone edits the profile.</p>", confirmLabel: "Publish" });
  if (!answer.ok || fail(publishSyllabus(button.dataset.id))) return;
  toast("Syllabus published.");
  refresh();
});
onClick("move-item", (button) => {
  if (fail(moveSyllabusItem(button.dataset.syllabus, button.dataset.phase, button.dataset.item, Number(button.dataset.direction)))) return;
  refresh();
});
