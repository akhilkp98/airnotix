/** Transaction types on the prototype fuel form. */
export const FUEL_TRANSACTION_TYPES = ['Receipt', 'Issue', 'Adjustment'] as const;

/** The prototype shows Low stock when the calculated balance is below the tank threshold. */
export function isLowStock(balance: number, threshold: number) {
  return balance < threshold;
}
