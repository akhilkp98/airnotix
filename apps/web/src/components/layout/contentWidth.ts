/** Every authenticated page uses this fluid maximum. List and detail routes share it so the title does not jump. */
export const workspaceMaxWidth = 1680;

/** Left-aligned cap for forms and other short entry panels. The page frame stays at the workspace width. */
export const formPanelMaxWidth = 1120;

export const formPanelSx = {
  width: '100%',
  maxWidth: formPanelMaxWidth,
} as const;

export const detailGridSx = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
  gap: 2,
  '& > *': { minWidth: 0 },
} as const;

export function shellMaxWidth(): number {
  return workspaceMaxWidth;
}
