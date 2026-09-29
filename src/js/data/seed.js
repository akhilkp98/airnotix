export const SEED_VERSION = 1;
export const STORAGE_KEY = "airnotix-demo-v1";
export const DEMO_TODAY = "2026-09-29";
export const DEMO_PASSWORD = "demonstration";
export const DEMO_TIME_ZONE = "Asia/Kolkata";

export const ROLE_LABELS = {
  "super-admin": "Super Admin",
  "academy-admin": "Academy Administrator",
  operations: "Operations Manager",
  cfi: "Chief Flying Instructor",
  instructor: "Instructor",
  maintenance: "Maintenance Officer",
  finance: "Finance Officer",
  hr: "HR / Staff Coordinator",
  cadet: "Cadet"
};

const ALL_STAFF = [
  "dashboard.view",
  "cadets.view", "cadets.create", "cadets.update",
  "training.view", "training.configure", "training.assess",
  "flights.view", "flights.create", "flights.update", "flights.submit", "flights.approve", "flights.complete",
  "fleet.view", "fleet.manage",
  "maintenance.view", "maintenance.record", "maintenance.release_record",
  "fuel.view", "fuel.manage",
  "finance.view", "finance.manage", "finance.adjust",
  "staff.view", "staff.manage",
  "documents.view", "documents.manage", "documents.review",
  "approvals.view",
  "reports.view", "reports.export",
  "settings.manage", "users.manage", "audit.view"
];

export const ROLE_PERMISSIONS = {
  "super-admin": ["dashboard.view", "settings.manage", "users.manage", "audit.view", "reports.view"],
  "academy-admin": ALL_STAFF.filter((item) => item !== "maintenance.release_record"),
  operations: [
    "dashboard.view", "cadets.view", "training.view",
    "flights.view", "flights.create", "flights.update", "flights.submit",
    "fleet.view", "maintenance.view", "fuel.view", "fuel.manage",
    "staff.view", "documents.view", "approvals.view", "reports.view"
  ],
  cfi: [
    "dashboard.view", "cadets.view", "training.view", "training.configure", "training.assess",
    "flights.view", "flights.approve", "staff.view", "documents.view", "documents.review",
    "approvals.view", "reports.view"
  ],
  instructor: [
    "dashboard.view", "cadets.view", "training.view", "training.assess",
    "flights.view", "flights.complete", "documents.view"
  ],
  maintenance: [
    "dashboard.view", "fleet.view", "maintenance.view", "maintenance.record", "maintenance.release_record",
    "documents.view", "documents.manage", "reports.view"
  ],
  finance: [
    "dashboard.view", "cadets.view", "finance.view", "finance.manage", "finance.adjust",
    "documents.view", "reports.view", "reports.export"
  ],
  hr: ["dashboard.view", "staff.view", "staff.manage", "documents.view", "reports.view"],
  cadet: ["portal.view"]
};

const cplPhases = [
  {
    id: "ph-cpl-ground",
    name: "Ground Knowledge",
    items: [
      { id: "item-air-law", name: "Air law briefing", type: "Knowledge item", required: true },
      { id: "item-met", name: "Meteorology classroom", type: "Ground lesson", required: true },
      { id: "item-nav-theory", name: "Navigation theory", type: "Knowledge item", required: true }
    ]
  },
  {
    id: "ph-cpl-basic",
    name: "Basic Flight Training",
    items: [
      { id: "item-circuits", name: "Circuits", type: "Flight exercise", required: true },
      { id: "item-stall", name: "Stall recovery", type: "Flight exercise", required: true }
    ]
  },
  {
    id: "ph-cpl-nav",
    name: "Navigation Exercises",
    items: [
      { id: "item-nav", name: "Navigation exercise", type: "Flight exercise", required: true }
    ]
  },
  {
    id: "ph-cpl-adv",
    name: "Advanced Exercises",
    items: [
      { id: "item-instrument", name: "Instrument familiarisation", type: "Flight exercise", required: true }
    ]
  },
  {
    id: "ph-cpl-check",
    name: "Progress Checks",
    items: [
      { id: "item-progress", name: "Phase progress check", type: "Progress check", required: true }
    ]
  }
];

const pplPhases = [
  {
    id: "ph-ppl-ground",
    name: "Ground Knowledge",
    items: [
      { id: "item-ppl-principles", name: "Principles of flight", type: "Knowledge item", required: true },
      { id: "item-ppl-ground", name: "Pre-flight briefing", type: "Ground lesson", required: true }
    ]
  },
  {
    id: "ph-ppl-basic",
    name: "Basic Flight Training",
    items: [
      { id: "item-ppl-effects", name: "Effects of controls", type: "Flight exercise", required: true },
      { id: "item-ppl-circuits", name: "Circuit introduction", type: "Flight exercise", required: true }
    ]
  },
  {
    id: "ph-ppl-check",
    name: "Progress Checks",
    items: [
      { id: "item-ppl-check", name: "First progress check", type: "Assessment", required: true }
    ]
  }
];

export const createSeed = () => ({
  seedVersion: SEED_VERSION,
  signedIn: false,
  activeUserId: "user-admin",
  academy: {
    name: "Northstar Flight Academy",
    branchId: "branch-kochi",
    branchName: "Kochi Training Base",
    country: "India",
    currency: "INR",
    timeZone: DEMO_TIME_ZONE,
    mode: "Demo",
    tagline: "Every cadet. Every flight. One clear view."
  },
  users: [
    { id: "user-super", name: "Anil Rao", email: "anil.rao@arionix.example", role: "super-admin" },
    { id: "user-admin", name: "Meera Krishnan", email: "meera.krishnan@northstar.example", role: "academy-admin", staffId: "staff-meera" },
    { id: "user-ops", name: "Kabir Nair", email: "kabir.nair@northstar.example", role: "operations", staffId: "staff-kabir" },
    { id: "user-cfi", name: "Nisha Varghese", email: "nisha.varghese@northstar.example", role: "cfi", staffId: "staff-nisha" },
    { id: "user-arun", name: "Arun Menon", email: "arun.menon@northstar.example", role: "instructor", staffId: "staff-arun" },
    { id: "user-maint", name: "Ravi Das", email: "ravi.das@northstar.example", role: "maintenance", staffId: "staff-ravi" },
    { id: "user-fin", name: "Priya Shah", email: "priya.shah@northstar.example", role: "finance", staffId: "staff-priya" },
    { id: "user-hr", name: "Devika Rao", email: "devika.rao@northstar.example", role: "hr", staffId: "staff-devika" },
    { id: "user-aarav", name: "Aarav Menon", email: "aarav.menon@northstar.example", role: "cadet", cadetId: "cadet-aarav" }
  ],
  cadets: [
    { id: "cadet-aarav", code: "NFA-2026-001", firstName: "Aarav", lastName: "Menon", email: "aarav.menon@northstar.example", phone: "+91 98000 10001", dob: "2004-04-12", courseId: "course-cpl", syllabusId: "syl-cpl-1", batch: "CPL-2026-A", joiningDate: "2026-01-06", status: "Active", openingHours: 28.4, completedRequired: 36, instructorId: "staff-arun", feeDueDate: "2026-11-01", completedItemIds: [] },
    { id: "cadet-diya", code: "NFA-2026-002", firstName: "Diya", lastName: "Nair", email: "diya.nair@northstar.example", phone: "+91 98000 10002", dob: "2003-11-02", courseId: "course-cpl", syllabusId: "syl-cpl-1", batch: "CPL-2026-A", joiningDate: "2026-01-06", status: "Active", openingHours: 41.0, completedRequired: 52, instructorId: "staff-leela", feeDueDate: "2026-11-01", completedItemIds: [] },
    { id: "cadet-rohan", code: "NFA-2026-003", firstName: "Rohan", lastName: "Varma", email: "rohan.varma@northstar.example", phone: "+91 98000 10003", dob: "2005-01-19", courseId: "course-ppl", syllabusId: "syl-ppl-1", batch: "PPL-2026-A", joiningDate: "2026-03-02", status: "Active", openingHours: 12.6, completedRequired: 24, instructorId: "staff-leela", feeDueDate: "2026-11-01", completedItemIds: [] },
    { id: "cadet-meera", code: "NFA-2026-004", firstName: "Meera", lastName: "Thomas", email: "meera.thomas@northstar.example", phone: "+91 98000 10004", dob: "2002-08-30", courseId: "course-cpl", syllabusId: "syl-cpl-1", batch: "CPL-2026-A", joiningDate: "2025-11-10", status: "Active", openingHours: 62.5, completedRequired: 68, instructorId: "staff-farhan", feeDueDate: "2026-10-20", completedItemIds: [] },
    { id: "cadet-ishan", code: "NFA-2026-005", firstName: "Ishan", lastName: "Pillai", email: "ishan.pillai@northstar.example", phone: "+91 98000 10005", dob: "2003-06-14", courseId: "course-cpl", syllabusId: "syl-cpl-1", batch: "CPL-2026-B", joiningDate: "2026-02-16", status: "On Hold", openingHours: 33.2, completedRequired: 41, instructorId: "staff-arun", feeDueDate: "2026-09-15", completedItemIds: [] },
    { id: "cadet-ananya", code: "NFA-2026-006", firstName: "Ananya", lastName: "Rao", email: "ananya.rao@northstar.example", phone: "+91 98000 10006", dob: "2005-09-08", courseId: "course-ppl", syllabusId: "syl-ppl-1", batch: "PPL-2026-A", joiningDate: "2026-06-01", status: "Active", openingHours: 6.8, completedRequired: 17, instructorId: "staff-leela", feeDueDate: "2026-09-01", completedItemIds: [] },
    { id: "cadet-neil", code: "NFA-2026-007", firstName: "Neil", lastName: "Joseph", email: "neil.joseph@northstar.example", phone: "+91 98000 10007", dob: "2001-12-22", courseId: "course-cpl", syllabusId: "syl-cpl-1", batch: "CPL-2025-C", joiningDate: "2025-04-07", status: "Completed", openingHours: 185.0, completedRequired: 100, instructorId: "staff-nisha", feeDueDate: "2026-01-15", completedItemIds: [] },
    { id: "cadet-sara", code: "NFA-2026-008", firstName: "Sara", lastName: "Mathew", email: "sara.mathew@northstar.example", phone: "+91 98000 10008", dob: "2004-02-11", courseId: "course-cpl", syllabusId: "syl-cpl-1", batch: "CPL-2026-B", joiningDate: "2026-02-16", status: "Active", openingHours: 19.5, completedRequired: 29, instructorId: "staff-farhan", feeDueDate: "2026-10-28", completedItemIds: [] }
  ],
  courses: [
    { id: "course-cpl", code: "CPL-ILL", name: "CPL Training", type: "CPL", status: "Active", requiredCount: 100, syllabusId: "syl-cpl-1" },
    { id: "course-ppl", code: "PPL-ILL", name: "PPL Training", type: "PPL", status: "Active", requiredCount: 100, syllabusId: "syl-ppl-1" }
  ],
  syllabi: [
    { id: "syl-cpl-1", courseId: "course-cpl", label: "CPL illustrative v1", status: "Published", phases: cplPhases },
    { id: "syl-cpl-draft", courseId: "course-cpl", label: "CPL draft", status: "Draft", phases: [] },
    { id: "syl-ppl-1", courseId: "course-ppl", label: "PPL illustrative v1", status: "Published", phases: pplPhases }
  ],
  assessments: [],
  staff: [
    { id: "staff-meera", code: "NFA-STF-01", name: "Meera Krishnan", role: "Academy Administrator", base: "Kochi Training Base", email: "meera.krishnan@northstar.example", availability: "Available", qualifications: [{ name: "Illustrative academy administrator record", expires: "2027-12-31" }] },
    { id: "staff-kabir", code: "NFA-STF-02", name: "Kabir Nair", role: "Operations Manager", base: "Kochi Training Base", email: "kabir.nair@northstar.example", availability: "Available", qualifications: [{ name: "Illustrative operations coordinator record", expires: "2027-06-30" }] },
    { id: "staff-nisha", code: "NFA-STF-03", name: "Nisha Varghese", role: "Chief Flying Instructor", base: "Kochi Training Base", email: "nisha.varghese@northstar.example", availability: "Available", qualifications: [{ name: "Illustrative CFI record", expires: "2027-04-30" }] },
    { id: "staff-arun", code: "NFA-STF-04", name: "Arun Menon", role: "Flight instructor", base: "Kochi Training Base", email: "arun.menon@northstar.example", availability: "Available", qualifications: [{ name: "Illustrative flight instructor record", expires: "2027-03-01" }] },
    { id: "staff-leela", code: "NFA-STF-05", name: "Leela Krishnan", role: "Flight instructor", base: "Kochi Training Base", email: "leela.krishnan@northstar.example", availability: "Available", qualifications: [{ name: "Illustrative flight instructor record", expires: "2027-08-15" }] },
    { id: "staff-farhan", code: "NFA-STF-06", name: "Farhan Iqbal", role: "Flight instructor", base: "Kochi Training Base", email: "farhan.iqbal@northstar.example", availability: "Limited", qualifications: [{ name: "Illustrative flight instructor record", expires: "2026-09-20" }] },
    { id: "staff-ravi", code: "NFA-STF-07", name: "Ravi Das", role: "Maintenance Officer", base: "Kochi Training Base", email: "ravi.das@northstar.example", availability: "Available", qualifications: [{ name: "Illustrative maintenance record", expires: "2027-01-31" }] },
    { id: "staff-priya", code: "NFA-STF-08", name: "Priya Shah", role: "Finance Officer", base: "Kochi Training Base", email: "priya.shah@northstar.example", availability: "Available", qualifications: [{ name: "Illustrative finance record", expires: "2027-09-30" }] },
    { id: "staff-devika", code: "NFA-STF-09", name: "Devika Rao", role: "HR / Staff Coordinator", base: "Kochi Training Base", email: "devika.rao@northstar.example", availability: "Available", qualifications: [{ name: "Illustrative HR record", expires: "2027-05-31" }] }
  ],
  availability: [
    { id: "avl-1", staffId: "staff-farhan", date: "2026-10-01", start: "13:00", end: "18:00", kind: "Leave", reason: "Demo leave block" }
  ],
  aircraft: [
    { id: "ac-c172-01", code: "NFA-C172-01", type: "Cessna 172 (illustrative)", base: "Kochi Training Base", status: "Available", openingHours: 4120.5, nextMaintenanceHours: 4200, restriction: null },
    { id: "ac-c172-02", code: "NFA-C172-02", type: "Cessna 172 (illustrative)", base: "Kochi Training Base", status: "Available", openingHours: 3888.0, nextMaintenanceHours: 4000, restriction: null },
    { id: "ac-da40", code: "NFA-DA40-01", type: "Diamond DA40 (illustrative)", base: "Kochi Training Base", status: "Maintenance", openingHours: 1540.2, nextMaintenanceHours: 1600, restriction: { from: "2026-09-27", until: "2026-10-06", reason: "Oil weep recorded on the demo defect. Planning constraint only." } },
    { id: "ac-da42", code: "NFA-DA42-01", type: "Diamond DA42 (illustrative)", base: "Kochi Training Base", status: "Restricted", openingHours: 2210.0, nextMaintenanceHours: 2300, restriction: { from: "2026-09-28", until: "2026-10-04", reason: "Demo restriction pending a document check. Not a serviceability decision." } }
  ],
  flights: [
    { id: "flt-2409", reference: "FLT-2409", date: "2026-09-28", start: "08:00", end: "09:30", cadetId: "cadet-aarav", itemId: "item-circuits", instructorId: "staff-arun", aircraftId: "ac-c172-01", flightType: "Training", status: "Completed", notes: "Morning dual.", submittedBy: "Kabir Nair", approval: { by: "Nisha Varghese", at: "2026-09-27T11:00:00+05:30", comment: "Approved for the demo week.", decision: "Approved" }, actual: { start: "08:05", end: "09:28", hours: 1.4, outcome: "Satisfactory", comments: "Demo debrief only.", attendance: "Present", followUp: false } },
    { id: "flt-2401", reference: "FLT-2401", date: "2026-09-29", start: "06:30", end: "08:00", cadetId: "cadet-aarav", itemId: "item-circuits", instructorId: "staff-arun", aircraftId: "ac-c172-01", flightType: "Training", status: "Approved", notes: "", submittedBy: "Kabir Nair", approval: { by: "Nisha Varghese", at: "2026-09-28T16:10:00+05:30", comment: "Approved.", decision: "Approved" }, actual: null },
    { id: "flt-2402", reference: "FLT-2402", date: "2026-09-29", start: "08:30", end: "10:30", cadetId: "cadet-diya", itemId: "item-nav", instructorId: "staff-leela", aircraftId: "ac-c172-02", flightType: "Training", status: "Approved", notes: "", submittedBy: "Kabir Nair", approval: { by: "Meera Krishnan", at: "2026-09-28T16:20:00+05:30", comment: "Approved.", decision: "Approved" }, actual: null },
    { id: "flt-2403", reference: "FLT-2403", date: "2026-09-29", start: "11:00", end: "12:30", cadetId: "cadet-meera", itemId: "item-instrument", instructorId: "staff-farhan", aircraftId: "ac-c172-01", flightType: "Training", status: "Awaiting approval", notes: "Qualification expiry is a warning only.", submittedBy: "Kabir Nair", approval: null, actual: null },
    { id: "flt-2404", reference: "FLT-2404", date: "2026-09-30", start: "09:00", end: "11:00", cadetId: "cadet-diya", itemId: "item-nav", instructorId: "staff-arun", aircraftId: "ac-c172-01", flightType: "Training", status: "Approved", notes: "", submittedBy: "Kabir Nair", approval: { by: "Nisha Varghese", at: "2026-09-28T17:00:00+05:30", comment: "Approved.", decision: "Approved" }, actual: null },
    { id: "flt-2405", reference: "FLT-2405", date: "2026-09-30", start: "10:00", end: "12:00", cadetId: "cadet-rohan", itemId: "item-ppl-circuits", instructorId: "staff-arun", aircraftId: "ac-c172-01", flightType: "Training", status: "Draft", notes: "Deliberate overlap with FLT-2404 so the conflict warning can be reviewed.", submittedBy: "", approval: null, actual: null },
    { id: "flt-2406", reference: "FLT-2406", date: "2026-10-01", start: "07:00", end: "09:00", cadetId: "cadet-ananya", itemId: "item-ppl-circuits", instructorId: "staff-leela", aircraftId: "ac-c172-02", flightType: "Training", status: "Approved", notes: "", submittedBy: "Kabir Nair", approval: { by: "Meera Krishnan", at: "2026-09-28T17:15:00+05:30", comment: "Approved.", decision: "Approved" }, actual: null },
    { id: "flt-2407", reference: "FLT-2407", date: "2026-10-01", start: "14:00", end: "16:00", cadetId: "cadet-sara", itemId: "item-instrument", instructorId: "staff-farhan", aircraftId: "ac-da42", flightType: "Training", status: "Draft", notes: "Uses an instructor leave block and a restricted aircraft.", submittedBy: "", approval: null, actual: null },
    { id: "flt-2410", reference: "FLT-2410", date: "2026-10-02", start: "15:00", end: "16:30", cadetId: "cadet-neil", itemId: "item-progress", instructorId: "staff-nisha", aircraftId: "ac-c172-02", flightType: "Training", status: "Cancelled", notes: "Cancelled in the demo history.", submittedBy: "Kabir Nair", approval: { by: "Meera Krishnan", at: "2026-09-26T10:00:00+05:30", comment: "Cancelled before the slot.", decision: "Cancelled" }, actual: null }
  ],
  defects: [
    { id: "def-1", aircraftId: "ac-da40", reportedAt: "2026-09-27T09:00:00+05:30", description: "Oil weep noticed during the daily inspection demo record.", severity: "High", reportedBy: "Ravi Das", status: "Open" }
  ],
  workOrders: [
    { id: "wo-2408", reference: "WO-2408", aircraftId: "ac-da40", defectId: "def-1", assigneeId: "staff-ravi", description: "Inspect the reported oil weep.", status: "In progress", notes: "Illustrative work order. Not a maintenance release.", release: null }
  ],
  tanks: [
    { id: "tank-avgas", name: "Kochi Avgas tank", fuelType: "Avgas 100LL", capacity: 10000, unit: "L", threshold: 2000 },
    { id: "tank-jeta", name: "Kochi Jet-A1 tank", fuelType: "Jet A-1", capacity: 8000, unit: "L", threshold: 2500 }
  ],
  fuelTransactions: [
    { id: "fuel-1", tankId: "tank-avgas", type: "Receipt", quantity: 6000, unitCost: 95, at: "2026-09-01T08:00:00+05:30", reference: "GRN-2401", notes: "Demo receipt", reason: "" },
    { id: "fuel-2", tankId: "tank-avgas", type: "Issue", quantity: 900, unitCost: 95, at: "2026-09-20T07:00:00+05:30", reference: "ISS-2408", notes: "Issued to NFA-C172-01", reason: "" },
    { id: "fuel-3", tankId: "tank-avgas", type: "Issue", quantity: 400, unitCost: 95, at: "2026-09-28T06:40:00+05:30", reference: "ISS-2411", notes: "Issued to NFA-C172-02", reason: "" },
    { id: "fuel-4", tankId: "tank-jeta", type: "Receipt", quantity: 3000, unitCost: 88, at: "2026-09-05T09:00:00+05:30", reference: "GRN-2404", notes: "Demo receipt", reason: "" },
    { id: "fuel-5", tankId: "tank-jeta", type: "Issue", quantity: 1200, unitCost: 88, at: "2026-09-22T10:00:00+05:30", reference: "ISS-2409", notes: "Demo issue", reason: "" }
  ],
  feePlans: [
    { id: "plan-cpl", courseId: "course-cpl", name: "CPL training fee (illustrative)", total: 1850000 },
    { id: "plan-ppl", courseId: "course-ppl", name: "PPL training fee (illustrative)", total: 650000 }
  ],
  payments: [
    { id: "pay-1", cadetId: "cadet-aarav", amount: 400000, date: "2026-02-02", method: "Bank transfer", reference: "UTR-24021" },
    { id: "pay-2", cadetId: "cadet-diya", amount: 750000, date: "2026-02-04", method: "Bank transfer", reference: "UTR-24028" },
    { id: "pay-3", cadetId: "cadet-meera", amount: 200000, date: "2026-03-12", method: "Card", reference: "UTR-24102" },
    { id: "pay-4", cadetId: "cadet-rohan", amount: 150000, date: "2026-03-18", method: "Bank transfer", reference: "UTR-24110" },
    { id: "pay-5", cadetId: "cadet-neil", amount: 1850000, date: "2026-01-20", method: "Bank transfer", reference: "UTR-23990" }
  ],
  expenses: [
    { id: "exp-1", date: "2026-09-15", category: "Fuel", description: "Avgas receipt for the Kochi tank", amount: 570000, branch: "Kochi Training Base", status: "Recorded" },
    { id: "exp-2", date: "2026-09-18", category: "Facilities", description: "Hangar utilities for the demo month", amount: 35000, branch: "Kochi Training Base", status: "Recorded" }
  ],
  documents: [
    { id: "doc-1", title: "Cadet enrolment form", category: "Cadet", ownerType: "Cadet", ownerId: "cadet-aarav", uploaded: "2026-01-06", expires: "", review: "Accepted" },
    { id: "doc-2", title: "Medical certificate (demo)", category: "Cadet", ownerType: "Cadet", ownerId: "cadet-sara", uploaded: "2025-10-01", expires: "2026-10-01", review: "Pending" },
    { id: "doc-3", title: "Insurance schedule (demo)", category: "Aircraft", ownerType: "Aircraft", ownerId: "ac-c172-01", uploaded: "2026-04-01", expires: "2026-10-04", review: "Accepted" },
    { id: "doc-4", title: "Instructor record (demo)", category: "Staff", ownerType: "Staff", ownerId: "staff-farhan", uploaded: "2025-10-06", expires: "2026-10-05", review: "Pending" },
    { id: "doc-5", title: "CPL syllabus note", category: "Training", ownerType: "Course", ownerId: "course-cpl", uploaded: "2026-01-02", expires: "", review: "Accepted" }
  ],
  notifications: [
    { id: "nt-1", audienceRole: "cfi", userId: "", title: "Flight awaiting approval", body: "FLT-2403 is waiting for a decision.", href: "approvals.html", category: "Approval", read: false, at: "2026-09-28T18:00:00+05:30" },
    { id: "nt-2", audienceRole: "academy-admin", userId: "", title: "Flight awaiting approval", body: "FLT-2403 is waiting for a decision.", href: "approvals.html", category: "Approval", read: false, at: "2026-09-28T18:00:00+05:30" },
    { id: "nt-3", audienceRole: "maintenance", userId: "", title: "Open defect", body: "NFA-DA40-01 has an open demo defect.", href: "maintenance.html", category: "Maintenance", read: false, at: "2026-09-27T09:05:00+05:30" },
    { id: "nt-4", audienceRole: "", userId: "user-aarav", title: "Flight approved", body: "FLT-2401 on 29 Sep 2026 is approved.", href: "portal-schedule.html", category: "Schedule", read: false, at: "2026-09-28T16:10:00+05:30" },
    { id: "nt-5", audienceRole: "finance", userId: "", title: "Fee due date passed", body: "Ishan Pillai has an illustrative overdue balance.", href: "finance.html", category: "Finance", read: false, at: "2026-09-16T09:00:00+05:30" }
  ],
  audit: [
    { id: "audit-1", at: "2026-09-27T09:05:00+05:30", actor: "Ravi Das", role: "Maintenance Officer", action: "Defect recorded", resourceType: "Aircraft", resourceId: "ac-da40", summary: "Opened a demo defect for NFA-DA40-01.", reason: "" },
    { id: "audit-2", at: "2026-09-28T16:10:00+05:30", actor: "Nisha Varghese", role: "Chief Flying Instructor", action: "Flight approved", resourceType: "Flight", resourceId: "flt-2401", summary: "Approved FLT-2401.", reason: "Approved." }
  ]
});
