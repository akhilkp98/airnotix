import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  DEMO_PASSWORD,
  SESSION_STORAGE_KEY,
  findDemoUser,
  findDemoUserByEmail,
  type DemoUser,
} from '../../domain/demoData';
import { canUser, homePathForRole, type Permission } from '../../domain/permissions';
import { readWorkspaceDemoUsers } from './workspaceDirectory';

type SignInResult = { user: DemoUser } | { error: string };

type AuthContextValue = {
  user: DemoUser | null;
  homePath: string;
  signIn: (email: string, password: string) => SignInResult;
  signOut: () => void;
  switchUser: (userId: string) => DemoUser | null;
  can: (permission: Permission) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUserId() {
  try {
    return window.localStorage.getItem(SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredUserId(userId: string | null) {
  try {
    if (userId) window.localStorage.setItem(SESSION_STORAGE_KEY, userId);
    else window.localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // The demonstration session stays in memory when storage is blocked.
  }
}

function directoryUser(userId: string) {
  return findDemoUser(userId) ?? readWorkspaceDemoUsers().find((item) => item.id === userId) ?? null;
}

function directoryUserByEmail(email: string) {
  return findDemoUserByEmail(email)
    ?? readWorkspaceDemoUsers().find((item) => item.email === email.trim().toLowerCase())
    ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(() => readStoredUserId());
  const user = userId ? directoryUser(userId) : null;

  const signIn = useCallback((email: string, password: string): SignInResult => {
    const match = directoryUserByEmail(email);
    if (!match) return { error: 'That email is not one of the demonstration accounts.' };
    if (password !== DEMO_PASSWORD) return { error: 'The demonstration password is not correct.' };
    setUserId(match.id);
    writeStoredUserId(match.id);
    return { user: match };
  }, []);

  const signOut = useCallback(() => {
    setUserId(null);
    writeStoredUserId(null);
  }, []);

  const switchUser = useCallback((nextUserId: string) => {
    const next = directoryUser(nextUserId);
    if (!next) return null;
    setUserId(next.id);
    writeStoredUserId(next.id);
    return next;
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    homePath: user ? homePathForRole(user.role) : '/login',
    signIn,
    signOut,
    switchUser,
    can: (permission) => (user ? canUser(user.role, permission) : false),
  }), [user, signIn, signOut, switchUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('Auth is not available.');
  return value;
}
