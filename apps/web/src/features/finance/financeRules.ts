import type { FeeAccountRow } from '../../domain/workspace';

/** Methods on the prototype payment form. */
export const PAYMENT_METHODS = ['Bank transfer', 'Card', 'Cash'] as const;

export function filterFeeAccounts(rows: FeeAccountRow[], search: string, overdueOnly: boolean) {
  const query = search.trim().toLowerCase();
  return rows.filter((row) => {
    if (overdueOnly && !row.overdue) return false;
    if (!query) return true;
    return `${row.name} ${row.code} ${row.planName}`.toLowerCase().includes(query);
  });
}
