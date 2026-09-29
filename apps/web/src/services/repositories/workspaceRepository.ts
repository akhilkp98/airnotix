import type { AcademyProfile, DemoUser } from '../../domain/demoData';
import type { DashboardSummary } from '../../domain/calculations';
import type {
  AcademyDocument,
  Aircraft,
  AppNotification,
  Assessment,
  AssessmentInput,
  AcademySettingsInput,
  AuditEvent,
  AvailabilityBlock,
  AvailabilityInput,
  Cadet,
  CadetInput,
  CadetLabel,
  CadetLookup,
  Course,
  Expense,
  ExpenseInput,
  FeeAccount,
  FeeAccountRow,
  FeePlan,
  FinanceSnapshot,
  Flight,
  FlightActualInput,
  Defect,
  DefectInput,
  FlightInput,
  FuelTank,
  FuelTransaction,
  FuelTransactionInput,
  MutationResult,
  Payment,
  PaymentInput,
  PortalSnapshot,
  ScheduleIssue,
  ReportRecords,
  StaffMember,
  Syllabus,
  WorkOrder,
  SyllabusItemInput,
  UserInput,
} from '../../domain/workspace';

/**
 * Academy workspace reads and writes.
 * Sign-in does not go through this interface.
 */
export interface WorkspaceRepository {
  getAcademy(): Promise<AcademyProfile>;
  listDemoUsers(): Promise<DemoUser[]>;
  listCadets(user: DemoUser | null): Promise<Cadet[]>;
  listCadetLabels(): Promise<CadetLabel[]>;
  getCadet(id: string, user: DemoUser | null): Promise<Cadet | null>;
  lookupCadet(id: string, user: DemoUser | null): Promise<CadetLookup>;
  listCourses(): Promise<Course[]>;
  listSyllabi(): Promise<Syllabus[]>;
  listAssessments(): Promise<Assessment[]>;
  listFlights(): Promise<Flight[]>;
  listPendingApprovals(): Promise<Flight[]>;
  listRecordedDecisions(): Promise<Flight[]>;
  getFlight(id: string): Promise<Flight | null>;
  listAircraft(): Promise<Aircraft[]>;
  getAircraft(id: string): Promise<Aircraft | null>;
  setAircraftStatus(id: string, status: string, reason: string, until: string, actor?: DemoUser): Promise<MutationResult>;
  listDefects(): Promise<Defect[]>;
  listWorkOrders(): Promise<WorkOrder[]>;
  addDefect(payload: DefectInput, actor?: DemoUser): Promise<MutationResult>;
  updateWorkOrder(id: string, status: string, actor?: DemoUser): Promise<MutationResult>;
  recordRelease(id: string, note: string, actor?: DemoUser): Promise<MutationResult>;
  listStaff(): Promise<StaffMember[]>;
  getStaff(id: string): Promise<StaffMember | null>;
  listAvailability(): Promise<AvailabilityBlock[]>;
  addAvailability(payload: AvailabilityInput, actor?: DemoUser): Promise<MutationResult>;
  schedulingIssues(flight: FlightInput, ignoreId?: string): Promise<ScheduleIssue[]>;
  dashboardSummary(user: DemoUser | null): Promise<DashboardSummary>;
  listTanks(): Promise<FuelTank[]>;
  listFuelTransactions(): Promise<FuelTransaction[]>;
  fuelBalance(tankId: string): Promise<number>;
  listFeePlans(): Promise<FeePlan[]>;
  listPayments(): Promise<Payment[]>;
  listExpenses(): Promise<Expense[]>;
  financeSnapshot(): Promise<FinanceSnapshot>;
  listFeeAccounts(user: DemoUser | null): Promise<FeeAccountRow[]>;
  addPayment(payload: PaymentInput, actor?: DemoUser): Promise<MutationResult>;
  addExpense(payload: ExpenseInput, actor?: DemoUser): Promise<MutationResult>;
  listDocuments(): Promise<AcademyDocument[]>;
  reviewDocument(id: string, review: string, actor?: DemoUser): Promise<MutationResult>;
  listNotifications(user: DemoUser | null): Promise<AppNotification[]>;
  markNotificationRead(id: string): Promise<MutationResult>;
  markAllNotificationsRead(actor?: DemoUser): Promise<MutationResult>;
  listAudit(): Promise<AuditEvent[]>;
  reportRecords(): Promise<ReportRecords>;
  saveAcademySettings(payload: AcademySettingsInput, actor?: DemoUser): Promise<MutationResult>;
  addUser(payload: UserInput, actor?: DemoUser): Promise<MutationResult>;
  feeAccount(cadetId: string): Promise<FeeAccount | null>;
  portalHome(user: DemoUser | null): Promise<PortalSnapshot | null>;
  saveCadet(payload: CadetInput, actor?: DemoUser): Promise<MutationResult>;
  setCadetStatus(id: string, status: string, reason: string, actor?: DemoUser): Promise<MutationResult>;
  addSyllabusPhase(syllabusId: string, name: string, actor?: DemoUser): Promise<MutationResult>;
  addSyllabusItem(syllabusId: string, phaseId: string, item: SyllabusItemInput, actor?: DemoUser): Promise<MutationResult>;
  moveSyllabusItem(syllabusId: string, phaseId: string, itemId: string, direction: number): Promise<MutationResult>;
  publishSyllabus(syllabusId: string, actor?: DemoUser): Promise<MutationResult>;
  saveAssessment(payload: AssessmentInput, actor?: DemoUser): Promise<MutationResult>;
  saveFlightDraft(payload: FlightInput, actor?: DemoUser): Promise<MutationResult>;
  submitFlight(payload: FlightInput, actor?: DemoUser): Promise<MutationResult>;
  decideFlight(id: string, decision: string, comment: string, actor?: DemoUser): Promise<MutationResult>;
  cancelFlight(id: string, reason: string, actor?: DemoUser): Promise<MutationResult>;
  completeFlight(id: string, actual: FlightActualInput, actor?: DemoUser): Promise<MutationResult>;
  correctFlight(id: string, hours: number | string, reason: string, actor?: DemoUser): Promise<MutationResult>;
  addFuelTransaction(payload: FuelTransactionInput, actor?: DemoUser): Promise<MutationResult>;
}
