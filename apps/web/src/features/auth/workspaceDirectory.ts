import { SEED_VERSION } from '../../domain/fixtures';
import type { DemoUser } from '../../domain/demoData';
import { WORKSPACE_STORAGE_KEY } from '../../services/repositories/workspaceStore';

/**
 * Reads demonstration users from the React workspace key.
 * Sign-in still checks the shared demonstration password. It does not read a stored password.
 * The HTML prototype key is not read.
 */
export function readWorkspaceDemoUsers(): DemoUser[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { seedVersion?: number; users?: DemoUser[] } | null;
    if (!parsed || parsed.seedVersion !== SEED_VERSION || !Array.isArray(parsed.users)) return [];
    return parsed.users;
  } catch {
    return [];
  }
}
