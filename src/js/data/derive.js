import { DEMO_TODAY, ROLE_PERMISSIONS } from "./seed";

export const minutes = (value) => {
  const [hours, mins] = String(value || "0:0").split(":").map(Number);
  return (hours * 60) + mins;
};

export const rangesOverlap = (startA, endA, startB, endB) => minutes(startA) < minutes(endB) && minutes(startB) < minutes(endA);

export const dateInRange = (date, from, until) => Boolean(from && until && date >= from && date <= until);

export const fullName = (cadet) => cadet ? `${cadet.firstName} ${cadet.lastName}` : "Unknown cadet";

export const findById = (list, id) => (list || []).find((item) => item.id === id);

export const canUser = (user, permission) => {
  if (!user) {
    return false;
  }
  return (ROLE_PERMISSIONS[user.role] || []).includes(permission);
};

export const courseOf = (state, cadet) => findById(state.courses, cadet && cadet.courseId);
export const staffOf = (state, id) => findById(state.staff, id);
export const aircraftOf = (state, id) => findById(state.aircraft, id);
export const cadetOf = (state, id) => findById(state.cadets, id);

export const itemName = (state, itemId) => {
  for (const syllabus of state.syllabi) {
    for (const phase of syllabus.phases) {
      const item = phase.items.find((entry) => entry.id === itemId);
      if (item) {
        return item.name;
      }
    }
  }
  return "Training item";
};

export const progressPercent = (state, cadet) => {
  const course = courseOf(state, cadet);
  const total = course ? course.requiredCount : 0;
  if (!cadet || !total) {
    return 0;
  }
  return Math.round((Number(cadet.completedRequired) / total) * 100);
};

export const recordedCadetHours = (state, cadetId) => {
  const cadet = cadetOf(state, cadetId);
  const flown = state.flights
    .filter((flight) => flight.cadetId === cadetId && flight.status === "Completed" && flight.actual)
    .reduce((sum, flight) => sum + Number(flight.actual.hours || 0), 0);
  return Math.round(((cadet ? cadet.openingHours : 0) + flown) * 10) / 10;
};

export const recordedAircraftHours = (state, aircraftId) => {
  const aircraft = aircraftOf(state, aircraftId);
  const flown = state.flights
    .filter((flight) => flight.aircraftId === aircraftId && flight.status === "Completed" && flight.actual)
    .reduce((sum, flight) => sum + Number(flight.actual.hours || 0), 0);
  return Math.round(((aircraft ? aircraft.openingHours : 0) + flown) * 10) / 10;
};

export const feeAccount = (state, cadet) => {
  const course = courseOf(state, cadet);
  const plan = state.feePlans.find((item) => item.courseId === (course && course.id));
  const total = plan ? plan.total : 0;
  const paid = state.payments
    .filter((payment) => payment.cadetId === cadet.id)
    .reduce((sum, payment) => sum + Number(payment.amount), 0);
  const outstanding = Math.round((total - paid) * 100) / 100;
  return {
    plan,
    total,
    paid,
    outstanding,
    overdue: outstanding > 0 && cadet.feeDueDate && cadet.feeDueDate < DEMO_TODAY
  };
};

export const fuelBalance = (state, tankId) => state.fuelTransactions
  .filter((tx) => tx.tankId === tankId)
  .reduce((sum, tx) => {
    if (tx.type === "Receipt") {
      return sum + Number(tx.quantity);
    }
    if (tx.type === "Issue") {
      return sum - Number(tx.quantity);
    }
    return sum + Number(tx.quantity);
  }, 0);

export const activeCadets = (state) => state.cadets.filter((cadet) => cadet.status === "Active");

export const flightsOnDate = (state, date) => state.flights.filter((flight) => flight.date === date && flight.status !== "Cancelled");

export const pendingApprovals = (state) => state.flights.filter((flight) => flight.status === "Awaiting approval");

export const isoDate = (date) => {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

export const weekDates = (anchor) => {
  const date = new Date(`${anchor}T00:00:00`);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + mondayOffset);
  return Array.from({ length: 7 }, (_, index) => {
    const next = new Date(monday);
    next.setDate(monday.getDate() + index);
    return isoDate(next);
  });
};

export const schedulingIssues = (state, flight, ignoreId) => {
  const issues = [];
  if (!flight.date || !flight.start || !flight.end || !flight.cadetId || !flight.instructorId || !flight.aircraftId) {
    return [{ level: "blocker", resource: "Form", message: "Date, times, cadet, instructor, and aircraft are required." }];
  }
  if (minutes(flight.start) >= minutes(flight.end)) {
    issues.push({ level: "blocker", resource: "Time", message: "Start time must be earlier than end time." });
  }

  const others = state.flights.filter((item) => item.id !== ignoreId && item.date === flight.date && item.status !== "Cancelled" && item.status !== "Rejected");
  const clash = (resourceId, key, label) => {
    const hit = others.find((item) => item[key] === resourceId && rangesOverlap(flight.start, flight.end, item.start, item.end));
    if (hit) {
      issues.push({
        level: "blocker",
        resource: label,
        message: `${label} overlaps ${hit.reference} (${hit.start}–${hit.end}).`,
        conflictId: hit.id
      });
    }
  };
  clash(flight.cadetId, "cadetId", "Cadet");
  clash(flight.instructorId, "instructorId", "Instructor");
  clash(flight.aircraftId, "aircraftId", "Aircraft");

  state.availability
    .filter((block) => block.staffId === flight.instructorId && block.date === flight.date && rangesOverlap(flight.start, flight.end, block.start, block.end))
    .forEach((block) => {
      issues.push({ level: "blocker", resource: "Instructor", message: `Instructor is marked ${block.kind.toLowerCase()} ${block.start}–${block.end}. ${block.reason}` });
    });

  const aircraft = aircraftOf(state, flight.aircraftId);
  if (aircraft && aircraft.status !== "Available") {
    issues.push({
      level: "blocker",
      resource: "Aircraft",
      message: `${aircraft.code} is recorded as ${aircraft.status}. This is a planning constraint, not a serviceability decision. ${aircraft.restriction ? aircraft.restriction.reason : ""}`
    });
  } else if (aircraft && aircraft.restriction && dateInRange(flight.date, aircraft.restriction.from, aircraft.restriction.until)) {
    issues.push({ level: "blocker", resource: "Aircraft", message: `${aircraft.code} has a planning restriction until ${aircraft.restriction.until}. ${aircraft.restriction.reason}` });
  }

  const instructor = staffOf(state, flight.instructorId);
  if (instructor) {
    instructor.qualifications.forEach((qualification) => {
      if (qualification.expires && qualification.expires < flight.date) {
        issues.push({ level: "warning", resource: "Qualification", message: `${qualification.name} is dated before this flight (${qualification.expires}). This is informational only.` });
      }
    });
  }
  return issues;
};

export const blockers = (issues) => issues.filter((issue) => issue.level === "blocker");

export const inr = (amount) => new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
}).format(Number(amount) || 0);

export const formatDate = (iso) => {
  if (!iso) {
    return "—";
  }
  const [year, month, day] = iso.slice(0, 10).split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${Number(day)} ${months[Number(month) - 1]} ${year}`;
};

export const weekday = (iso) => {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[new Date(`${iso}T00:00:00`).getDay()];
};
