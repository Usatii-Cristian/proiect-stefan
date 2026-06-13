"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/dal";
import { clientSchema } from "@/lib/validation";

export type ClientState = { ok?: boolean; error?: string; id?: string } | undefined;

function clean(v: FormDataEntryValue | null): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
}

export async function createClient(
  _prev: ClientState,
  formData: FormData,
): Promise<ClientState> {
  const user = await requireUser();
  const parsed = clientSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") ?? "",
    email: formData.get("email") ?? "",
    telegramChatId: formData.get("telegramChatId") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Date invalide." };
  }
  const d = parsed.data;
  const client = await prisma.client.create({
    data: {
      userId: user.id,
      name: d.name,
      phone: d.phone || null,
      email: d.email || null,
      telegramChatId: d.telegramChatId || null,
      notes: d.notes || null,
    },
    select: { id: true },
  });
  revalidatePath("/clients");
  return { ok: true, id: client.id };
}

export async function updateClient(
  _prev: ClientState,
  formData: FormData,
): Promise<ClientState> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const owned = await prisma.client.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!owned) return { error: "Client inexistent." };

  const parsed = clientSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") ?? "",
    email: formData.get("email") ?? "",
    telegramChatId: formData.get("telegramChatId") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Date invalide." };
  }
  const d = parsed.data;
  await prisma.client.update({
    where: { id },
    data: {
      name: d.name,
      phone: d.phone || null,
      email: d.email || null,
      telegramChatId: d.telegramChatId || null,
      notes: d.notes || null,
    },
  });
  revalidatePath("/clients");
  return { ok: true, id };
}

export async function deleteClient(id: string): Promise<void> {
  const user = await requireUser();
  await prisma.client.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/clients");
}
