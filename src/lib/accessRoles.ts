export type AppRole = "user" | "orga" | "admin";

export function normalizeAppRole(raw: unknown): AppRole {
  if (raw === "admin") return "admin";
  if (raw === "orga") return "orga";
  return "user";
}

export function canManageLeague(role: AppRole): boolean {
  return role === "orga" || role === "admin";
}

export function canAccessConfig(role: AppRole): boolean {
  return role === "admin";
}

export function canAssignElevatedRoles(role: AppRole): boolean {
  return role === "admin";
}

export function appRoleLabel(role: AppRole): string {
  if (role === "admin") return "Admin";
  if (role === "orga") return "Orga";
  return "Lecture";
}
