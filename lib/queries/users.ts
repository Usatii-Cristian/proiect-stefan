import "server-only";
import { prisma } from "../prisma";
import { DEMO } from "../demo";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "STAFF";
  isActive: boolean;
  permissions: string[];
  telegramChatId: string | null;
};

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  permissions: true,
  telegramChatId: true,
} as const;

export async function listUsers(): Promise<UserRow[]> {
  if (DEMO) {
    return [
      { id: "demo-user", name: "Cont Demo", email: "demo@local", role: "ADMIN", isActive: true, permissions: [], telegramChatId: null },
    ];
  }
  return prisma.user.findMany({
    select: USER_SELECT,
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
}

export async function getUserById(id: string): Promise<UserRow | null> {
  if (DEMO) return null;
  return prisma.user.findUnique({ where: { id }, select: USER_SELECT });
}

/** Opțiuni minime pentru selectoare de asignare (utilizatori activi). */
export async function userOptions(): Promise<{ id: string; name: string }[]> {
  if (DEMO) return [{ id: "demo-user", name: "Cont Demo" }];
  return prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
