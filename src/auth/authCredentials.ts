import type { AppRole } from "../lib/accessRoles";

export interface AuthSession {
  username: string;
  role: AppRole;
}

const SESSION_KEY = "maika-session-v1";

export function tryLogin(username: string, password: string): AuthSession | null {
  const u = username.trim().toLowerCase();
  if (u === "admin" && password === "admin") return { username: "admin", role: "admin" };
  if (u === "orga" && password === "orga") return { username: "orga", role: "orga" };
  if (u === "user" && password === "user") return { username: "user", role: "user" };
  return null;
}

export function readStoredSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const o: unknown = JSON.parse(raw);
    if (!o || typeof o !== "object") return null;
    const s = o as { username?: string; role?: string };
    if (s.role !== "admin" && s.role !== "orga" && s.role !== "user") return null;
    if (typeof s.username !== "string") return null;
    return { username: s.username, role: s.role };
  } catch {
    return null;
  }
}

export function writeStoredSession(session: AuthSession | null): void {
  if (session === null) {
    localStorage.removeItem(SESSION_KEY);
    return;
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}
