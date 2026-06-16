"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { DEMO } from "@/lib/demo";
import { createInvoice, updateInvoice } from "@/lib/services/invoices";
import type { InvoiceStatus } from "@prisma/client";

export type InvoicePayload = {
  id?: string;
  status: InvoiceStatus;
  issueDate: string; // YYYY-MM-DD
  dueDate: string | null;
  clientId: string | null;
  projectId: string | null;
  taskId: string | null;
  notes: string;
  terms: string;
  items: { description: string; quantity: number; unitPrice: number; taxRate: number }[];
};

export type InvoiceActionResult = { ok: boolean; id?: string; error?: string };

const STATUSES: InvoiceStatus[] = ["DRAFT", "SENT", "PAID", "CANCELLED", "OVERDUE"];

function toDate(s: string | null): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return new Date(`${s}T12:00:00`);
}

export async function saveInvoice(payload: InvoicePayload): Promise<InvoiceActionResult> {
  const user = await requireUser();
  if (!can(user, "invoices.manage")) return { ok: false, error: "Fără permisiune." };
  if (DEMO) return { ok: false, error: "Mod demo: conectează o bază de date." };

  if (!payload.items || payload.items.length === 0) {
    return { ok: false, error: "Adaugă cel puțin un rând în factură." };
  }
  const status = STATUSES.includes(payload.status) ? payload.status : "DRAFT";

  const input = {
    status,
    issueDate: toDate(payload.issueDate) ?? new Date(),
    dueDate: toDate(payload.dueDate),
    clientId: payload.clientId,
    projectId: payload.projectId,
    taskId: payload.taskId,
    notes: payload.notes,
    terms: payload.terms,
    items: payload.items,
  };

  const res = payload.id
    ? await updateInvoice(payload.id, input)
    : await createInvoice(user.id, input);

  if (!res.ok) return { ok: false, error: res.error };
  revalidatePath("/invoices");
  return { ok: true, id: res.id };
}

export async function setInvoiceStatus(
  id: string,
  status: string,
): Promise<InvoiceActionResult> {
  const user = await requireUser();
  if (!can(user, "invoices.manage")) return { ok: false, error: "Fără permisiune." };
  if (DEMO) return { ok: false, error: "Mod demo." };
  if (!STATUSES.includes(status as InvoiceStatus)) return { ok: false, error: "Status invalid." };
  await prisma.invoice.update({ where: { id }, data: { status: status as InvoiceStatus } });
  revalidatePath("/invoices");
  return { ok: true };
}

export async function deleteInvoice(id: string): Promise<void> {
  const user = await requireUser();
  if (!can(user, "invoices.manage")) return;
  if (DEMO) return;
  await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });
  await prisma.invoice.delete({ where: { id } }).catch(() => {});
  revalidatePath("/invoices");
}
