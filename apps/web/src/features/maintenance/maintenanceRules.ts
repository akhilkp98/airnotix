import type { Defect, WorkOrder } from '../../domain/workspace';

/** Severity options on the prototype defect form. High is the selected default. */
export const DEFECT_SEVERITIES = ['Low', 'Medium', 'High'] as const;

/** Status buttons on a work order. Release is a separate action. */
export const WORK_STATUS_OPTIONS = ['In progress', 'Completed'] as const;

export function openDefects(defects: Defect[]) {
  return defects.filter((item) => item.status === 'Open');
}

/** The prototype open-work-order count excludes Release recorded and Completed. */
export function openWorkOrders(orders: WorkOrder[]) {
  return orders.filter((item) => item.status !== 'Release recorded' && item.status !== 'Completed');
}
