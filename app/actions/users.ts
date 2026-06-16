"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/dal";
import { can, ALL_PERMISSION_KEYS } from "@/lib/permissions";
import { hashPassword } from "@/lib/password";
import { DEMO } from "@/lib/demo";

export type UserState = { ok?: boolean; error?: string; id?: string } | undefined;

function parsePerms(formData: FormData): string[] {
  return formData
    .getAll("permissions")
    .map(String)
    .filter((p) => (ALL_PERMISSION_KEYS as string[]).includes(p));
}

export async function createUser(
  _prev: UserState,
  formData: FormData,
): Promise<UserState> {
  const user = await requireUser();
  if (!can(user, "users.manage")) return { error: "Fără permisiune." };
  if (DEMO) return { error: "Mod demo: conectează o bază de date." };

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = formData.get("role") === "ADMIN" ? "ADMIN" : "STAFF";
  const isActive = formData.get("isActive") !== "off";

  if (name.length < 2) return { error: "Nume prea scurt." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Email invalid." };
  if (password.length < 8) return { error: "Parola: minim 8 caractere." };

  const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (exists) return { error: "Există deja un cont cu acest email." };

  const created = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(password),
      role,
      isActive,
      permissions: role === "ADMIN" ? [] : parsePerms(formData),
      telegramChatId: String(formData.get("telegramChatId") ?? "").trim() || null,
    },
    select: { id: true },
  });
  revalidatePath("/users");
  return { ok: true, id: created.id };
}

export async function updateUser(
  _prev: UserState,
  formData: FormData,
): Promise<UserState> {
  const admin = await requireUser();
  if (!can(admin, "users.manage")) return { error: "Fără permisiune." };
  if (DEMO) return { error: "Mod demo." };

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const role = formData.get("role") === "ADMIN" ? "ADMIN" : "STAFF";
  const isActive = formData.get("isActive") !== "off";
  const newPassword = String(formData.get("password") ?? "");
  if (name.length < 2) return { error: "Nume prea scurt." };

  await prisma.user.update({
    where: { id },
    data: {
      name,
      role,
      isActive,
      permissions: role === "ADMIN" ? [] : parsePerms(formData),
      telegramChatId: String(formData.get("telegramChatId") ?? "").trim() || null,
      ...(newPassword.length >= 8 ? { passwordHash: await hashPassword(newPassword) } : {}),
    },
  });
  revalidatePath("/users");
  return { ok: true, id };
}

/** Dezactivare/reactivare rapidă. */
export async function toggleUserActive(id: string, active: boolean): Promise<void> {
  const admin = await requireUser();
  if (!can(admin, "users.manage")) return;
  if (DEMO) return;
  await prisma.user.update({ where: { id }, data: { isActive: active } });
  // La dezactivare, invalidează sesiunile
  if (!active) await prisma.session.deleteMany({ where: { userId: id } });
  revalidatePath("/users");
}
