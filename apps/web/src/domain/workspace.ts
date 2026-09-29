import type { AcademyProfile, DemoUser } from './demoData';

/** Demonstration statuses stored by the HTML prototype. */
export type CadetStatus = 'Active' | 'On Hold' | 'Completed';
export type FlightStatus = 'Draft' | 'Awaiting approval' | 'Approved' | 'Rejected' | 'Completed' | 'Cancelled';
export type SyllabusStatus = 'Draft' | 'Published' | 'Archived';
export type AircraftStatus = 'Available' | 'Maintenance' | 'Restricted';
export type IssueLevel = 'blocker' | 'warning';

export type ScheduleIssue = {
  level: IssueLevel;
  resource: string;
  message: string;
  conflictId?: string;
};

export type MutationSuccess = {
  ok: true;
  id?: string;
  issues?: ScheduleIssue[];
};

export type MutationFailure = {
  ok: false;
  error: string;
  issues?: ScheduleIssue[];
};

export type MutationResult = MutationSuccess | MutationFailure;

export type WorkspaceAcademy = AcademyProfile & {
  branchId: string;
  tagline: string;
};

export type Cadet = {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dob: string;
  courseId: string;
  syllabusId: string;
  batch: string;
  joiningDate: string;
  status: CadetStatus | string;
  openingHours: number;
  completedRequired: number;
  instructorId: string;
  feeDueDate: string;
  completedItemIds: string[];
};

export type CadetInput = {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dob?: string;
  courseId?: string;
  batch?: string;
  joiningDate?: string;
  instructorId?: string;
};

export type Course = {
  id: string;
  code: string;
  name: string;
  type: string;
  status: string;
  requiredCount: number;
  syllabusId: string;
};

export type SyllabusItem = {
  id: string;
  name: string;
  type: string;
  required: boolean;
};

export type SyllabusPhase = {
  id: string;
  name: string;
  items: SyllabusItem[];
};

export type Syllabus = {
  id: string;
  courseId: string;
  label: string;
  status: SyllabusStatus | string;
  phases: SyllabusPhase[];
};

export type SyllabusItemInput = {
  name?: string;
  type?: string;
  required?: boolean;
};

export type Assessment = {
  id: string;
  cadetId: string;
  itemId: string;
  outcome: string;
  comments: string;
  date: string;
  assessor: string;
};

export type AssessmentInput = {
  cadetId?: string;
  itemId?: string;
  outcome?: string;
  comments?: string;
  date?: string;
};

export type Qualification = {
  name: string;
  expires: string;
};

export type StaffMember = {
  id: string;
  code: string;
  name: string;
  role: string;
  base: string;
  email: string;
  availability: string;
  qualifications: Qualification[];
};

export type AvailabilityBlock = {
  id: string;
  staffId: string;
  date: string;
  start: string;
  end: string;
  kind: string;
  reason: string;
};

export type AircraftRestriction = {
  from: string;
  until: string;
  reason: string;
};

export type Aircraft = {
  id: string;
  code: string;
  type: string;
  base: string;
  status: AircraftStatus | string;
  openingHours: number;
  nextMaintenanceHours: number;
  restriction: AircraftRestriction | null;
};

export type FlightApproval = {
  by: string;
  at: string;
  comment: string;
  decision: string;
};

export type FlightActual = {
  start: string;
  end: string;
  hours: number;
  outcome: string;
  comments: string;
  attendance: string;
  followUp: boolean;
  followUpNotes?: string;
};

export type Flight = {
  id: string;
  reference: string;
  date: string;
  start: string;
  end: string;
  cadetId: string;
  itemId: string;
  instructorId: string;
  aircraftId: string;
  flightType: string;
  status: FlightStatus | string;
  notes: string;
  submittedBy: string;
  approval: FlightApproval | null;
  actual: FlightActual | null;
};

export type FlightInput = {
  id?: string;
  date?: string;
  start?: string;
  end?: string;
  cadetId?: string;
  itemId?: string;
  instructorId?: string;
  aircraftId?: string;
  flightType?: string;
  notes?: string;
};

export type FlightActualInput = {
  start?: string;
  end?: string;
  hours?: number | string;
  outcome?: string;
  comments?: string;
  attendance?: string;
  followUp?: boolean;
  followUpNotes?: string;
};

export type Defect = {
  id: string;
  aircraftId: string;
  reportedAt: string;
  description: string;
  severity: string;
  reportedBy: string;
  status: string;
};

export type WorkOrderRelease = {
  by: string;
  at: string;
  note: string;
};

export type WorkOrder = {
  id: string;
  reference: string;
  aircraftId: string;
  defectId: string;
  assigneeId: string;
  description: string;
  status: string;
  notes: string;
  release: WorkOrderRelease | null;
};

export type FuelTank = {
  id: string;
  name: string;
  fuelType: string;
  capacity: number;
  unit: string;
  threshold: number;
};

export type FuelTransaction = {
  id: string;
  tankId: string;
  type: string;
  quantity: number;
  unitCost: number;
  at: string;
  reference: string;
  notes: string;
  reason: string;
};

export type FuelTransactionInput = {
  tankId?: string;
  type?: string;
  quantity?: number | string;
  unitCost?: number | string;
  reference?: string;
  notes?: string;
  reason?: string;
};

export type DefectInput = {
  aircraftId?: string;
  description?: string;
  severity?: string;
};

export type AvailabilityInput = {
  staffId?: string;
  date?: string;
  start?: string;
  end?: string;
  kind?: string;
  reason?: string;
};

export type FeePlan = {
  id: string;
  courseId: string;
  name: string;
  total: number;
};

export type PaymentInput = {
  cadetId?: string;
  amount?: number | string;
  date?: string;
  method?: string;
  reference?: string;
};

export type ExpenseInput = {
  date?: string;
  category?: string;
  description?: string;
  amount?: number | string;
};

export type FinanceSnapshot = {
  billed: number;
  collected: number;
  outstanding: number;
  overdueAccounts: number;
  expenses: number;
};

export type FeeAccountRow = {
  cadetId: string;
  code: string;
  name: string;
  planName: string;
  paid: number;
  outstanding: number;
  overdue: boolean;
};

export type Payment = {
  id: string;
  cadetId: string;
  amount: number;
  date: string;
  method: string;
  reference: string;
};

export type Expense = {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  branch: string;
  status: string;
};

export type AcademyDocument = {
  id: string;
  title: string;
  category: string;
  ownerType: string;
  ownerId: string;
  uploaded: string;
  expires: string;
  review: string;
};

export type AppNotification = {
  id: string;
  audienceRole: string;
  userId: string;
  title: string;
  body: string;
  href: string;
  category: string;
  read: boolean;
  at: string;
};

export type AcademySettingsInput = {
  name?: string;
  currency?: string;
  timeZone?: string;
};

export type UserInput = {
  name?: string;
  email?: string;
  role?: string;
};

/** Records the prototype report page reads. Screens do not assemble this themselves. */
export type ReportRecords = {
  cadets: Cadet[];
  courses: Course[];
  flights: Flight[];
  aircraft: Aircraft[];
  staff: StaffMember[];
  fuelTransactions: FuelTransaction[];
  documents: AcademyDocument[];
  payments: Payment[];
  feePlans: FeePlan[];
  audit: AuditEvent[];
};

export type AuditEvent = {
  id: string;
  at: string;
  actor: string;
  role: string;
  action: string;
  resourceType: string;
  resourceId: string;
  summary: string;
  reason: string;
};

/**
 * Operational records ported from the HTML prototype seed.
 * Sign-in stays in the React session and is not stored here.
 */
export type WorkspaceState = {
  seedVersion: number;
  academy: WorkspaceAcademy;
  users: DemoUser[];
  cadets: Cadet[];
  courses: Course[];
  syllabi: Syllabus[];
  assessments: Assessment[];
  staff: StaffMember[];
  availability: AvailabilityBlock[];
  aircraft: Aircraft[];
  flights: Flight[];
  defects: Defect[];
  workOrders: WorkOrder[];
  tanks: FuelTank[];
  fuelTransactions: FuelTransaction[];
  feePlans: FeePlan[];
  payments: Payment[];
  expenses: Expense[];
  documents: AcademyDocument[];
  notifications: AppNotification[];
  audit: AuditEvent[];
};

export type FeeAccount = {
  plan: FeePlan | undefined;
  total: number;
  paid: number;
  outstanding: number;
  overdue: boolean;
};

/** Released portal view for the signed-in cadet. Other cadets are not included. */
export type PortalFlight = {
  id: string;
  reference: string;
  date: string;
  start: string;
  end: string;
  status: string;
  aircraftCode: string;
  instructorName: string;
  hours: number | null;
};

export type PortalDocument = {
  id: string;
  title: string;
  category: string;
  uploaded: string;
  expires: string;
  review: string;
};

export type PortalPayment = {
  id: string;
  amount: number;
  date: string;
  method: string;
  reference: string;
};

export type PortalAssessment = {
  id: string;
  itemName: string;
  outcome: string;
  date: string;
  assessor: string;
};

export type PortalNote = {
  id: string;
  title: string;
  body: string;
  href: string;
  read: boolean;
  at: string;
};

export type PortalSyllabusItem = { id: string; name: string; recorded: boolean };

export type PortalSnapshot = {
  code: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  batch: string;
  joiningDate: string;
  status: string;
  feeDueDate: string;
  courseName: string;
  courseStatus: string;
  syllabusLabel: string;
  syllabusStatus: string;
  phases: { id: string; name: string; items: PortalSyllabusItem[] }[];
  progressPercent: number;
  recordedHours: number;
  flights: PortalFlight[];
  documents: PortalDocument[];
  payments: PortalPayment[];
  planName: string;
  billed: number;
  paid: number;
  outstanding: number;
  overdue: boolean;
  assessments: PortalAssessment[];
  notifications: PortalNote[];
};

export type CadetLookup =
  | { status: 'found'; cadet: Cadet }
  | { status: 'missing' }
  | { status: 'denied' };

/** Name used on a flight record. Opening the cadet profile still uses `lookupCadet`. */
export type CadetLabel = {
  id: string;
  name: string;
};
