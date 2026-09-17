export type UserRole = "trainer" | "client";

export const defaultUserRole: UserRole = "trainer";

export const userRoleLabels: Record<UserRole, string> = {
  trainer: "Тренер",
  client: "Клиент",
};

export const normalizeUserRole = (role: unknown): UserRole => {
  if (typeof role !== "string") {
    return defaultUserRole;
  }

  const normalizedRole = role.trim().toLowerCase();

  if (normalizedRole === "client" || normalizedRole === "клиент") {
    return "client";
  }

  return defaultUserRole;
};
