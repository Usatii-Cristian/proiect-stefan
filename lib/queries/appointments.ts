import "server-only";
import { prisma } from "../prisma";
import type { AppointmentStatus } from "@prisma/client";

/** Câmpuri suficiente pentru listări (folosesc snapshot-urile, fără include). */
export const LIST_SELECT = {
  id: true,
  title: true,
  status: true,
  startAt: true,
  endAt: true,
  dateKey: true,
  clientId: true,
  clientNameSnapshot: true,
  categoryNameSnapshot: true,
  categoryColorSnapshot: true,
  reminderEmailEnabled: true,
  reminderTelegramEnabled: true,
} as const;

export type AppointmentListItem = {
  id: string;
  title: string;
  status: AppointmentStatus;
  startAt: Date;
  endAt: Date;
  dateKey: string;
  clientId: string;
  clientNameSnapshot: string;
  categoryNameSnapshot: string | null;
  categoryColorSnapshot: string | null;
  reminderEmailEnabled: boolean;
  reminderTelegramEnabled: boolean;
};

const ACTIVE_STATUSES: AppointmentStatus[] = [
  "NEW",
  "CONFIRMED",
  "IN_PROGRESS",
  "DONE",
];

/** Programările unei zile (Azi / Telegram). Query unic pe index userId+dateKey. */
export function listByDateKey(userId: string, dateKey: string) {
  return prisma.appointment.findMany({
    where: { userId, dateKey },
    select: LIST_SELECT,
    orderBy: { startAt: "asc" },
  });
}

/** Mai multe zile deodată (săptămână / calendar). */
export function listByDateKeys(userId: string, dateKeys: string[]) {
  return prisma.appointment.findMany({
    where: { userId, dateKey: { in: dateKeys } },
    select: LIST_SELECT,
    orderBy: { startAt: "asc" },
  });
}

/** Fereastră pentru Kanban (ex. ultimele zile + următoarele), grupare în UI. */
export function listForKanban(userId: string, dateKeys: string[]) {
  return prisma.appointment.findMany({
    where: { userId, dateKey: { in: dateKeys } },
    select: LIST_SELECT,
    orderBy: { startAt: "asc" },
  });
}

export function getAppointment(userId: string, id: string) {
  return prisma.appointment.findFirst({
    where: { id, userId },
    select: {
      ...LIST_SELECT,
      message: true,
      categoryId: true,
      createdFrom: true,
      createdAt: true,
    },
  });
}

/** Următoarea programare activă de acum încolo. */
export async function nextAppointment(userId: string) {
  return prisma.appointment.findFirst({
    where: {
      userId,
      startAt: { gte: new Date() },
      status: { in: ["NEW", "CONFIRMED", "IN_PROGRESS"] },
    },
    select: LIST_SELECT,
    orderBy: { startAt: "asc" },
  });
}

/** Numărători pentru dashboard, dintr-un singur groupBy pe zi. */
export async function dayStats(userId: string, dateKey: string) {
  const grouped = await prisma.appointment.groupBy({
    by: ["status"],
    where: { userId, dateKey },
    _count: { _all: true },
  });
  const byStatus = Object.fromEntries(
    grouped.map((g) => [g.status, g._count._all]),
  ) as Record<AppointmentStatus, number>;

  const total = grouped.reduce((s, g) => s + g._count._all, 0);
  return {
    total,
    confirmed: byStatus.CONFIRMED ?? 0,
    inProgress: byStatus.IN_PROGRESS ?? 0,
    done: byStatus.DONE ?? 0,
    cancelled: byStatus.CANCELLED ?? 0,
    noShow: byStatus.NO_SHOW ?? 0,
    new: byStatus.NEW ?? 0,
  };
}

/**
 * Verifică dacă intervalul [startAt, endAt) se suprapune cu altă programare activă.
 * Overlap: existent.startAt < newEnd ȘI existent.endAt > newStart.
 */
export async function findOverlapping(
  userId: string,
  startAt: Date,
  endAt: Date,
  excludeId?: string,
) {
  return prisma.appointment.findFirst({
    where: {
      userId,
      ...(excludeId ? { id: { not: excludeId } } : {}),
      status: { in: ACTIVE_STATUSES },
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
    select: {
      id: true,
      startAt: true,
      endAt: true,
      clientNameSnapshot: true,
    },
  });
}
