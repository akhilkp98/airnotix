import { dashboardSummary } from '../../domain/calculations';
import { delay } from '../delay';
import {
  createMemoryStorage,
  createWorkspaceStore,
  type KeyValueStorage,
  type WorkspaceStore,
} from './workspaceStore';
import type { WorkspaceRepository } from './workspaceRepository';

type Wait = (ms?: number) => Promise<unknown>;

function browserOrMemoryStorage(): KeyValueStorage {
  if (typeof window === 'undefined') return createMemoryStorage();
  return window.localStorage;
}

let appStore: WorkspaceStore | undefined;

function appWorkspaceStore() {
  appStore ??= createWorkspaceStore(browserOrMemoryStorage());
  return appStore;
}

export function createMockWorkspaceRepository(options?: {
  store?: WorkspaceStore;
  wait?: Wait;
}): WorkspaceRepository {
  const resolveStore = () => options?.store ?? appWorkspaceStore();
  const wait = options?.wait ?? delay;

  const run = async <T>(fn: (store: WorkspaceStore) => T): Promise<T> => {
    await wait();
    return fn(resolveStore());
  };

  return {
    getAcademy() {
      return run((store) => {
        const academy = store.load().academy;
        return {
          name: academy.name,
          branchName: academy.branchName,
          country: academy.country,
          currency: academy.currency,
          timeZone: academy.timeZone,
          mode: academy.mode,
        };
      });
    },
    listDemoUsers() {
      return run((store) => store.load().users.map((user) => ({ ...user })));
    },
    listCadets(user) {
      return run((store) => store.listCadets(user));
    },
    listCadetLabels() {
      return run((store) => store.listCadetLabels());
    },
    getCadet(id, user) {
      return run((store) => store.getCadet(id, user));
    },
    lookupCadet(id, user) {
      return run((store) => store.lookupCadet(id, user));
    },
    listCourses() {
      return run((store) => store.listCourses());
    },
    listSyllabi() {
      return run((store) => store.listSyllabi());
    },
    listAssessments() {
      return run((store) => store.listAssessments());
    },
    listFlights() {
      return run((store) => store.listFlights());
    },
    listPendingApprovals() {
      return run((store) => store.listPendingApprovals());
    },
    listRecordedDecisions() {
      return run((store) => store.listRecordedDecisions());
    },
    getFlight(id) {
      return run((store) => store.getFlight(id));
    },
    listAircraft() {
      return run((store) => store.listAircraft());
    },
    getAircraft(id) {
      return run((store) => store.getAircraft(id));
    },
    setAircraftStatus(id, status, reason, until, actor) {
      return run((store) => store.setAircraftStatus(id, status, reason, until, actor));
    },
    listDefects() {
      return run((store) => store.listDefects());
    },
    listWorkOrders() {
      return run((store) => store.listWorkOrders());
    },
    addDefect(payload, actor) {
      return run((store) => store.addDefect(payload, actor));
    },
    updateWorkOrder(id, status, actor) {
      return run((store) => store.updateWorkOrder(id, status, actor));
    },
    recordRelease(id, note, actor) {
      return run((store) => store.recordRelease(id, note, actor));
    },
    listStaff() {
      return run((store) => store.listStaff());
    },
    getStaff(id) {
      return run((store) => store.getStaff(id));
    },
    listAvailability() {
      return run((store) => store.listAvailability());
    },
    addAvailability(payload, actor) {
      return run((store) => store.addAvailability(payload, actor));
    },
    schedulingIssues(flight, ignoreId) {
      return run((store) => store.schedulingIssues(flight, ignoreId));
    },
    dashboardSummary(user) {
      return run((store) => dashboardSummary(store.load(), user));
    },
    listTanks() {
      return run((store) => store.listTanks());
    },
    listFuelTransactions() {
      return run((store) => store.listFuelTransactions());
    },
    fuelBalance(tankId) {
      return run((store) => store.fuelBalance(tankId));
    },
    listFeePlans() {
      return run((store) => store.listFeePlans());
    },
    listPayments() {
      return run((store) => store.listPayments());
    },
    listExpenses() {
      return run((store) => store.listExpenses());
    },
    financeSnapshot() {
      return run((store) => store.financeSnapshot());
    },
    listFeeAccounts(user) {
      return run((store) => store.listFeeAccounts(user));
    },
    addPayment(payload, actor) {
      return run((store) => store.addPayment(payload, actor));
    },
    addExpense(payload, actor) {
      return run((store) => store.addExpense(payload, actor));
    },
    listDocuments() {
      return run((store) => store.listDocuments());
    },
    reviewDocument(id, review, actor) {
      return run((store) => store.reviewDocument(id, review, actor));
    },
    listNotifications(user) {
      return run((store) => store.listNotifications(user));
    },
    markNotificationRead(id) {
      return run((store) => store.markNotificationRead(id));
    },
    markAllNotificationsRead(actor) {
      return run((store) => store.markAllNotificationsRead(actor));
    },
    listAudit() {
      return run((store) => store.listAudit());
    },
    reportRecords() {
      return run((store) => store.reportRecords());
    },
    saveAcademySettings(payload, actor) {
      return run((store) => store.saveAcademySettings(payload, actor));
    },
    addUser(payload, actor) {
      return run((store) => store.addUser(payload, actor));
    },
    feeAccount(cadetId) {
      return run((store) => store.feeAccount(cadetId));
    },
    portalHome(user) {
      return run((store) => store.portalHome(user));
    },
    saveCadet(payload, actor) {
      return run((store) => store.saveCadet(payload, actor));
    },
    setCadetStatus(id, status, reason, actor) {
      return run((store) => store.setCadetStatus(id, status, reason, actor));
    },
    addSyllabusPhase(syllabusId, name, actor) {
      return run((store) => store.addSyllabusPhase(syllabusId, name, actor));
    },
    addSyllabusItem(syllabusId, phaseId, item, actor) {
      return run((store) => store.addSyllabusItem(syllabusId, phaseId, item, actor));
    },
    moveSyllabusItem(syllabusId, phaseId, itemId, direction) {
      return run((store) => store.moveSyllabusItem(syllabusId, phaseId, itemId, direction));
    },
    publishSyllabus(syllabusId, actor) {
      return run((store) => store.publishSyllabus(syllabusId, actor));
    },
    saveAssessment(payload, actor) {
      return run((store) => store.saveAssessment(payload, actor));
    },
    saveFlightDraft(payload, actor) {
      return run((store) => store.saveFlightDraft(payload, actor));
    },
    submitFlight(payload, actor) {
      return run((store) => store.submitFlight(payload, actor));
    },
    decideFlight(id, decision, comment, actor) {
      return run((store) => store.decideFlight(id, decision, comment, actor));
    },
    cancelFlight(id, reason, actor) {
      return run((store) => store.cancelFlight(id, reason, actor));
    },
    completeFlight(id, actual, actor) {
      return run((store) => store.completeFlight(id, actual, actor));
    },
    correctFlight(id, hours, reason, actor) {
      return run((store) => store.correctFlight(id, hours, reason, actor));
    },
    addFuelTransaction(payload, actor) {
      return run((store) => store.addFuelTransaction(payload, actor));
    },
  };
}

export const mockWorkspaceRepository = createMockWorkspaceRepository();
