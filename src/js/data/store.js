import {
  DEMO_PASSWORD,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  STORAGE_KEY,
  createSeed
} from "./seed";
import { blockers, canUser, findById, schedulingIssues } from "./derive";

const clone = (value) => JSON.parse(JSON.stringify(value));

export const loadState = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createSeed();
    }
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.seedVersion !== createSeed().seedVersion) {
      return createSeed();
    }
    return parsed;
  } catch (error) {
    return createSeed();
  }
};

export const saveState = (state) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const commit = (mutator) => {
  const next = clone(loadState());
  const result = mutator(next) || { ok: true };
  if (result.ok === false) {
    return result;
  }
  saveState(next);
  return result;
};

const current = (state) => findById(state.users, state.activeUserId);

const stamp = () => new Date().toISOString();

const remember = (state, action, resourceType, resourceId, summary, reason) => {
  const user = current(state);
  state.audit.unshift({
    id: `audit-${Date.now()}`,
    at: stamp(),
    actor: user ? user.name : "Demo user",
    role: user ? ROLE_LABELS[user.role] : "",
    action,
    resourceType,
    resourceId,
    summary,
    reason: reason || ""
  });
};

const notify = (state, notification) => {
  state.notifications.unshift({
    id: `nt-${Date.now()}`,
    read: false,
    at: stamp(),
    userId: "",
    audienceRole: "",
    category: "Update",
    ...notification
  });
};

export const getState = () => loadState();

export const currentUser = () => current(loadState());

export const can = (permission) => canUser(currentUser(), permission);

export const signIn = (email, password) => {
  const state = loadState();
  const user = state.users.find((item) => item.email.toLowerCase() === String(email || "").trim().toLowerCase());
  if (!user || password !== DEMO_PASSWORD) {
    return { ok: false, error: "Those demo details do not match a sample account. Use password “demonstration”." };
  }
  state.signedIn = true;
  state.activeUserId = user.id;
  saveState(state);
  return { ok: true, user };
};

export const signOut = () => {
  const state = loadState();
  state.signedIn = false;
  saveState(state);
};

export const setActiveUser = (userId) => commit((state) => {
  if (!findById(state.users, userId)) {
    return { ok: false, error: "That demo user is not in this workspace." };
  }
  state.activeUserId = userId;
  state.signedIn = true;
  return { ok: true };
});

export const resetDemo = () => {
  const previous = loadState();
  const fresh = createSeed();
  fresh.signedIn = true;
  fresh.activeUserId = previous.activeUserId || "user-admin";
  if (!findById(fresh.users, fresh.activeUserId)) {
    fresh.activeUserId = "user-admin";
  }
  saveState(fresh);
};

const nextCode = (state) => {
  const numbers = state.cadets.map((cadet) => Number(cadet.code.slice(-3)) || 0);
  return `NFA-2026-${String(Math.max(0, ...numbers) + 1).padStart(3, "0")}`;
};

export const saveCadet = (payload) => commit((state) => {
  const firstName = String(payload.firstName || "").trim();
  const lastName = String(payload.lastName || "").trim();
  const email = String(payload.email || "").trim();
  if (!firstName || !lastName || !payload.courseId || !payload.joiningDate) {
    return { ok: false, error: "First name, last name, course, and joining date are required." };
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Enter a valid email address, or leave it blank." };
  }
  const course = findById(state.courses, payload.courseId);
  if (!course) {
    return { ok: false, error: "Choose a course from the demo list." };
  }
  if (payload.id) {
    const cadet = findById(state.cadets, payload.id);
    if (!cadet) {
      return { ok: false, error: "That cadet is no longer in the demo data." };
    }
    Object.assign(cadet, {
      firstName,
      lastName,
      email,
      phone: String(payload.phone || "").trim(),
      dob: payload.dob || "",
      courseId: course.id,
      syllabusId: course.syllabusId,
      batch: payload.batch || cadet.batch,
      joiningDate: payload.joiningDate,
      instructorId: payload.instructorId || cadet.instructorId
    });
    remember(state, "Cadet updated", "Cadet", cadet.id, `Updated ${firstName} ${lastName}.`);
    return { ok: true, id: cadet.id };
  }
  const cadet = {
    id: `cadet-${Date.now()}`,
    code: nextCode(state),
    firstName,
    lastName,
    email,
    phone: String(payload.phone || "").trim(),
    dob: payload.dob || "",
    courseId: course.id,
    syllabusId: course.syllabusId,
    batch: payload.batch || `${course.type}-2026-A`,
    joiningDate: payload.joiningDate,
    status: "Active",
    openingHours: 0,
    completedRequired: 0,
    instructorId: payload.instructorId || "staff-arun",
    feeDueDate: "2026-11-15",
    completedItemIds: []
  };
  state.cadets.unshift(cadet);
  remember(state, "Cadet created", "Cadet", cadet.id, `Enrolled ${firstName} ${lastName} on ${course.name}.`);
  return { ok: true, id: cadet.id };
});

export const setCadetStatus = (id, status, reason) => commit((state) => {
  const cadet = findById(state.cadets, id);
  if (!cadet) {
    return { ok: false, error: "Cadet not found." };
  }
  if (!reason || !String(reason).trim()) {
    return { ok: false, error: "A reason is required for a status change." };
  }
  cadet.status = status;
  remember(state, "Cadet status changed", "Cadet", id, `${cadet.firstName} ${cadet.lastName} is now ${status}.`, reason);
  return { ok: true };
});

export const addSyllabusPhase = (syllabusId, name) => commit((state) => {
  const syllabus = findById(state.syllabi, syllabusId);
  if (!syllabus || syllabus.status === "Published") {
    return { ok: false, error: "Add phases to a draft syllabus. Published versions stay unchanged." };
  }
  if (!String(name || "").trim()) {
    return { ok: false, error: "Phase name is required." };
  }
  syllabus.phases.push({ id: `ph-${Date.now()}`, name: String(name).trim(), items: [] });
  remember(state, "Syllabus phase added", "Syllabus", syllabusId, `Added phase “${name.trim()}” to ${syllabus.label}.`);
  return { ok: true };
});

export const addSyllabusItem = (syllabusId, phaseId, item) => commit((state) => {
  const syllabus = findById(state.syllabi, syllabusId);
  const phase = syllabus && syllabus.phases.find((entry) => entry.id === phaseId);
  if (!syllabus || syllabus.status === "Published" || !phase) {
    return { ok: false, error: "Items can be added to a draft phase only." };
  }
  if (!String(item.name || "").trim()) {
    return { ok: false, error: "Item name is required." };
  }
  phase.items.push({
    id: `item-${Date.now()}`,
    name: String(item.name).trim(),
    type: item.type || "Flight exercise",
    required: item.required !== false
  });
  remember(state, "Syllabus item added", "Syllabus", syllabusId, `Added “${item.name.trim()}” to ${phase.name}.`);
  return { ok: true };
});

export const moveSyllabusItem = (syllabusId, phaseId, itemId, direction) => commit((state) => {
  const syllabus = findById(state.syllabi, syllabusId);
  const phase = syllabus && syllabus.phases.find((entry) => entry.id === phaseId);
  if (!phase || syllabus.status === "Published") {
    return { ok: false, error: "Published syllabus order is fixed." };
  }
  const index = phase.items.findIndex((item) => item.id === itemId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= phase.items.length) {
    return { ok: false, error: "That item cannot move further." };
  }
  const [item] = phase.items.splice(index, 1);
  phase.items.splice(target, 0, item);
  return { ok: true };
});

export const publishSyllabus = (syllabusId) => commit((state) => {
  const syllabus = findById(state.syllabi, syllabusId);
  if (!syllabus || syllabus.status !== "Draft") {
    return { ok: false, error: "Only a draft can be published." };
  }
  if (!syllabus.phases.length) {
    return { ok: false, error: "Add at least one phase before publishing." };
  }
  state.syllabi.forEach((item) => {
    if (item.courseId === syllabus.courseId && item.status === "Published") {
      item.status = "Archived";
    }
  });
  syllabus.status = "Published";
  const course = state.courses.find((item) => item.id === syllabus.courseId);
  if (course) {
    course.syllabusId = syllabus.id;
  }
  remember(state, "Syllabus published", "Syllabus", syllabusId, `Published ${syllabus.label}. Existing cadet assignments are unchanged until a profile is updated.`);
  return { ok: true };
});

export const saveAssessment = (payload) => commit((state) => {
  const cadet = findById(state.cadets, payload.cadetId);
  if (!cadet || !payload.itemId || !payload.outcome) {
    return { ok: false, error: "Cadet, training item, and outcome are required." };
  }
  const assessment = {
    id: `ass-${Date.now()}`,
    cadetId: cadet.id,
    itemId: payload.itemId,
    outcome: payload.outcome,
    comments: String(payload.comments || "").trim(),
    date: payload.date || stamp().slice(0, 10),
    assessor: current(state) ? current(state).name : "Demo assessor"
  };
  state.assessments.unshift(assessment);
  if (payload.outcome === "Satisfactory" && !cadet.completedItemIds.includes(payload.itemId)) {
    cadet.completedItemIds.push(payload.itemId);
    const course = findById(state.courses, cadet.courseId);
    cadet.completedRequired = Math.min(course ? course.requiredCount : 100, Number(cadet.completedRequired) + 1);
  }
  remember(state, "Assessment recorded", "Cadet", cadet.id, `${assessment.outcome} recorded for ${cadet.firstName} ${cadet.lastName}.`, assessment.comments);
  return { ok: true };
});

const flightFrom = (payload, existing) => ({
  id: existing ? existing.id : `flt-${Date.now()}`,
  reference: existing ? existing.reference : `FLT-${2400 + Math.floor(Math.random() * 500)}`,
  date: payload.date,
  start: payload.start,
  end: payload.end,
  cadetId: payload.cadetId,
  itemId: payload.itemId,
  instructorId: payload.instructorId,
  aircraftId: payload.aircraftId,
  flightType: payload.flightType || "Training",
  status: existing ? existing.status : "Draft",
  notes: String(payload.notes || "").trim(),
  submittedBy: existing ? existing.submittedBy : "",
  approval: existing ? existing.approval : null,
  actual: existing ? existing.actual : null
});

export const saveFlight = (payload, submit) => commit((state) => {
  const existing = payload.id ? findById(state.flights, payload.id) : null;
  if (existing && existing.status !== "Draft" && existing.status !== "Rejected") {
    return { ok: false, error: "Only a draft or rejected flight can be edited. Completed flights use a correction." };
  }
  const draft = flightFrom(payload, existing);
  const issues = schedulingIssues(state, draft, draft.id);
  if (submit && blockers(issues).length) {
    return { ok: false, error: blockers(issues)[0].message, issues };
  }
  draft.status = submit ? "Awaiting approval" : "Draft";
  if (submit) {
    draft.submittedBy = current(state) ? current(state).name : "Demo user";
    draft.approval = null;
  }
  if (existing) {
    Object.assign(existing, draft);
  } else {
    state.flights.push(draft);
  }
  remember(state, submit ? "Flight submitted" : "Flight draft saved", "Flight", draft.id, `${draft.reference} ${draft.date} ${draft.start}–${draft.end}.`);
  if (submit) {
    notify(state, { audienceRole: "cfi", title: "Flight awaiting approval", body: `${draft.reference} was submitted.`, href: `flight-operations.html?id=${draft.id}`, category: "Approval" });
    notify(state, { audienceRole: "academy-admin", title: "Flight awaiting approval", body: `${draft.reference} was submitted.`, href: `flight-operations.html?id=${draft.id}`, category: "Approval" });
  }
  return { ok: true, id: draft.id, issues };
});

export const decideFlight = (id, decision, comment) => commit((state) => {
  const flight = findById(state.flights, id);
  if (!flight || flight.status !== "Awaiting approval") {
    return { ok: false, error: "Only a flight awaiting approval can be decided." };
  }
  if (!String(comment || "").trim()) {
    return { ok: false, error: "A comment is required." };
  }
  if (decision === "Approved" && blockers(schedulingIssues(state, flight, flight.id)).length) {
    return { ok: false, error: "Resolve the scheduling conflicts before approval." };
  }
  const user = current(state);
  flight.status = decision === "Approved" ? "Approved" : "Rejected";
  flight.approval = { by: user ? user.name : "Demo approver", at: stamp(), comment: comment.trim(), decision: flight.status };
  remember(state, decision === "Approved" ? "Flight approved" : "Flight rejected", "Flight", id, `${flight.reference} is ${flight.status}.`, comment.trim());
  const cadet = findById(state.cadets, flight.cadetId);
  const cadetUser = cadet && state.users.find((item) => item.cadetId === cadet.id);
  if (decision === "Approved" && cadetUser) {
    notify(state, { userId: cadetUser.id, title: "Flight approved", body: `${flight.reference} on ${flight.date} is approved.`, href: "portal-schedule.html", category: "Schedule" });
  }
  notify(state, { audienceRole: "operations", title: `Flight ${flight.status.toLowerCase()}`, body: `${flight.reference}: ${comment.trim()}`, href: `flight-operations.html?id=${flight.id}`, category: "Approval" });
  return { ok: true };
});

export const cancelFlight = (id, reason) => commit((state) => {
  const flight = findById(state.flights, id);
  if (!flight || flight.status === "Completed" || flight.status === "Cancelled") {
    return { ok: false, error: "That flight cannot be cancelled." };
  }
  if (!String(reason || "").trim()) {
    return { ok: false, error: "A reason is required." };
  }
  flight.status = "Cancelled";
  remember(state, "Flight cancelled", "Flight", id, `${flight.reference} was cancelled.`, reason.trim());
  return { ok: true };
});

export const completeFlight = (id, actual) => commit((state) => {
  const flight = findById(state.flights, id);
  if (!flight || flight.status !== "Approved") {
    return { ok: false, error: "Only an approved flight can be completed." };
  }
  const user = current(state);
  if (user && user.role === "instructor" && user.staffId !== flight.instructorId) {
    return { ok: false, error: "Instructors can record completion only for their assigned flights." };
  }
  const hours = Number(actual.hours);
  if (!actual.start || !actual.end || !hours || hours <= 0 || !actual.outcome) {
    return { ok: false, error: "Actual times, hours, and an outcome are required." };
  }
  flight.status = "Completed";
  flight.actual = {
    start: actual.start,
    end: actual.end,
    hours,
    outcome: actual.outcome,
    comments: String(actual.comments || "").trim(),
    attendance: actual.attendance || "Present",
    followUp: Boolean(actual.followUp),
    followUpNotes: String(actual.followUpNotes || "").trim()
  };
  const cadet = findById(state.cadets, flight.cadetId);
  if (cadet && actual.outcome === "Satisfactory" && flight.itemId && !cadet.completedItemIds.includes(flight.itemId)) {
    cadet.completedItemIds.push(flight.itemId);
    const course = findById(state.courses, cadet.courseId);
    cadet.completedRequired = Math.min(course ? course.requiredCount : 100, Number(cadet.completedRequired) + 1);
  }
  remember(state, "Flight completed", "Flight", id, `${flight.reference} recorded ${hours} hours. Outcome: ${actual.outcome}.`);
  notify(state, { audienceRole: "operations", title: "Flight completed", body: `${flight.reference} was recorded as completed.`, href: `flight-operations.html?id=${id}`, category: "Flight" });
  return { ok: true };
});

export const correctFlight = (id, hours, reason) => commit((state) => {
  const flight = findById(state.flights, id);
  const nextHours = Number(hours);
  if (!flight || flight.status !== "Completed" || !flight.actual) {
    return { ok: false, error: "Only a completed flight can be corrected." };
  }
  if (!nextHours || nextHours <= 0 || !String(reason || "").trim()) {
    return { ok: false, error: "A revised hour value and a reason are required." };
  }
  const previous = flight.actual.hours;
  flight.actual.hours = nextHours;
  remember(state, "Flight corrected", "Flight", id, `${flight.reference} hours changed from ${previous} to ${nextHours}.`, reason.trim());
  return { ok: true };
});

export const setAircraftStatus = (id, status, reason, until) => commit((state) => {
  const aircraft = findById(state.aircraft, id);
  if (!aircraft) {
    return { ok: false, error: "Aircraft not found." };
  }
  if (status !== "Available" && !String(reason || "").trim()) {
    return { ok: false, error: "A reason is required when the aircraft is not available." };
  }
  aircraft.status = status;
  aircraft.restriction = status === "Available" ? null : {
    from: stamp().slice(0, 10),
    until: until || "2026-10-31",
    reason: String(reason || "").trim()
  };
  remember(state, "Aircraft status changed", "Aircraft", id, `${aircraft.code} is now ${status}.`, reason || "");
  return { ok: true };
});

export const addDefect = (payload) => commit((state) => {
  const aircraft = findById(state.aircraft, payload.aircraftId);
  if (!aircraft || !String(payload.description || "").trim()) {
    return { ok: false, error: "Aircraft and description are required." };
  }
  const defect = {
    id: `def-${Date.now()}`,
    aircraftId: aircraft.id,
    reportedAt: stamp(),
    description: payload.description.trim(),
    severity: payload.severity || "Medium",
    reportedBy: current(state) ? current(state).name : "Demo user",
    status: "Open"
  };
  state.defects.unshift(defect);
  const order = {
    id: `wo-${Date.now()}`,
    reference: `WO-${Math.floor(2500 + Math.random() * 400)}`,
    aircraftId: aircraft.id,
    defectId: defect.id,
    assigneeId: "staff-ravi",
    description: defect.description,
    status: "Open",
    notes: "",
    release: null
  };
  state.workOrders.unshift(order);
  remember(state, "Defect recorded", "Aircraft", aircraft.id, `${aircraft.code}: ${defect.description}`);
  notify(state, { audienceRole: "maintenance", title: "Defect recorded", body: `${aircraft.code} has a new demo defect.`, href: "maintenance.html", category: "Maintenance" });
  return { ok: true };
});

export const updateWorkOrder = (id, status) => commit((state) => {
  const order = findById(state.workOrders, id);
  if (!order) {
    return { ok: false, error: "Work order not found." };
  }
  order.status = status;
  remember(state, "Work order updated", "Work order", id, `${order.reference} is now ${status}.`);
  return { ok: true };
});

export const recordRelease = (id, note) => commit((state) => {
  const order = findById(state.workOrders, id);
  if (!order) {
    return { ok: false, error: "Work order not found." };
  }
  if (!String(note || "").trim()) {
    return { ok: false, error: "Release notes are required." };
  }
  const user = current(state);
  order.status = "Release recorded";
  order.release = { by: user ? user.name : "Demo user", at: stamp(), note: note.trim() };
  remember(state, "Authorized release recorded", "Work order", id, `${order.reference}: authorized release recorded. This is not a system serviceability decision.`, note.trim());
  return { ok: true };
});

export const addFuelTransaction = (payload) => commit((state) => {
  const tank = findById(state.tanks, payload.tankId);
  const quantity = Number(payload.quantity);
  if (!tank || !payload.type || !quantity) {
    return { ok: false, error: "Tank, type, and quantity are required." };
  }
  if (quantity <= 0 && payload.type !== "Adjustment") {
    return { ok: false, error: "Quantity must be greater than zero." };
  }
  if (payload.type === "Adjustment" && !String(payload.reason || "").trim()) {
    return { ok: false, error: "An adjustment needs a reason." };
  }
  const currentBalance = state.fuelTransactions.filter((tx) => tx.tankId === tank.id).reduce((sum, tx) => {
    if (tx.type === "Receipt") return sum + Number(tx.quantity);
    if (tx.type === "Issue") return sum - Number(tx.quantity);
    return sum + Number(tx.quantity);
  }, 0);
  if (payload.type === "Issue" && quantity > currentBalance) {
    return { ok: false, error: "That issue is larger than the calculated stock." };
  }
  state.fuelTransactions.unshift({
    id: `fuel-${Date.now()}`,
    tankId: tank.id,
    type: payload.type,
    quantity: payload.type === "Adjustment" ? quantity : Math.abs(quantity),
    unitCost: Number(payload.unitCost) || 0,
    at: stamp(),
    reference: payload.reference || "DEMO",
    notes: String(payload.notes || "").trim(),
    reason: String(payload.reason || "").trim()
  });
  remember(state, "Fuel transaction recorded", "Fuel", tank.id, `${payload.type} of ${quantity} ${tank.unit} on ${tank.name}.`, payload.reason || "");
  return { ok: true };
});

export const addPayment = (payload) => commit((state) => {
  const cadet = findById(state.cadets, payload.cadetId);
  const amount = Number(payload.amount);
  if (!cadet || !amount || amount <= 0 || !payload.date || !payload.method) {
    return { ok: false, error: "Cadet, amount, date, and method are required." };
  }
  state.payments.unshift({
    id: `pay-${Date.now()}`,
    cadetId: cadet.id,
    amount,
    date: payload.date,
    method: payload.method,
    reference: payload.reference || "DEMO"
  });
  remember(state, "Payment recorded", "Cadet", cadet.id, `${cadet.firstName} ${cadet.lastName} payment of ${amount} INR recorded.`);
  return { ok: true };
});

export const addExpense = (payload) => commit((state) => {
  const amount = Number(payload.amount);
  if (!payload.date || !payload.category || !String(payload.description || "").trim() || !amount || amount <= 0) {
    return { ok: false, error: "Date, category, description, and amount are required." };
  }
  state.expenses.unshift({
    id: `exp-${Date.now()}`,
    date: payload.date,
    category: payload.category,
    description: payload.description.trim(),
    amount,
    branch: "Kochi Training Base",
    status: "Recorded"
  });
  remember(state, "Expense recorded", "Finance", payload.category, `${payload.category}: ${payload.description.trim()}.`);
  return { ok: true };
});

export const addAvailability = (payload) => commit((state) => {
  if (!payload.staffId || !payload.date || !payload.start || !payload.end) {
    return { ok: false, error: "Staff member, date, and times are required." };
  }
  state.availability.unshift({
    id: `avl-${Date.now()}`,
    staffId: payload.staffId,
    date: payload.date,
    start: payload.start,
    end: payload.end,
    kind: payload.kind || "Unavailable",
    reason: String(payload.reason || "Demo availability block").trim()
  });
  const staff = findById(state.staff, payload.staffId);
  remember(state, "Availability updated", "Staff", payload.staffId, `${staff ? staff.name : "Staff"} marked ${payload.kind || "Unavailable"} on ${payload.date}.`);
  return { ok: true };
});

export const reviewDocument = (id, review) => commit((state) => {
  const document = findById(state.documents, id);
  if (!document) {
    return { ok: false, error: "Document not found." };
  }
  document.review = review;
  remember(state, "Document reviewed", "Document", id, `${document.title} marked ${review}.`);
  return { ok: true };
});

export const markNotificationRead = (id) => commit((state) => {
  const notification = findById(state.notifications, id);
  if (notification) {
    notification.read = true;
  }
  return { ok: true };
});

export const markAllNotificationsRead = () => commit((state) => {
  const user = current(state);
  state.notifications.forEach((notification) => {
    const mine = notification.userId === (user && user.id) || notification.audienceRole === (user && user.role);
    if (mine) {
      notification.read = true;
    }
  });
  return { ok: true };
});

export const saveAcademySettings = (payload) => commit((state) => {
  if (!String(payload.name || "").trim()) {
    return { ok: false, error: "Academy name is required." };
  }
  state.academy.name = payload.name.trim();
  state.academy.currency = payload.currency || "INR";
  state.academy.timeZone = payload.timeZone || state.academy.timeZone;
  remember(state, "Settings updated", "Academy", "academy", "Academy profile updated for future demo records.");
  return { ok: true };
});

export const addUser = (payload) => commit((state) => {
  const name = String(payload.name || "").trim();
  const email = String(payload.email || "").trim().toLowerCase();
  if (!name || !email || !payload.role || !ROLE_PERMISSIONS[payload.role]) {
    return { ok: false, error: "Name, email, and role are required." };
  }
  if (state.users.some((user) => user.email.toLowerCase() === email)) {
    return { ok: false, error: "That email is already a demo user." };
  }
  const user = { id: `user-${Date.now()}`, name, email, role: payload.role };
  state.users.push(user);
  remember(state, "User added", "User", user.id, `${name} added as ${ROLE_LABELS[payload.role]}.`);
  return { ok: true };
});

export { ROLE_LABELS, ROLE_PERMISSIONS, DEMO_PASSWORD };
