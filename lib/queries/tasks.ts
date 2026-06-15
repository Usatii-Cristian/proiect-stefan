import "server-only";
import { prisma } from "../prisma";
import { DEMO } from "../demo";
import type { Prisma, TaskStatus, TaskType, TaskPriority } from "@prisma/client";

export type TaskRow = {
  id: string;
  type: TaskType;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt: Date | null;
  creatorId: string;
  assigneeId: string | null;
  teamId: string | null;
  projectId: string | null;
  assigneeName: string | null;
  teamName: string | null;
  projectName: string | null;
  creatorName: string;
  createdAt: Date;
};

const TASK_SELECT = {
  id: true,
  type: true,
  title: true,
  status: true,
  priority: true,
  dueAt: true,
  creatorId: true,
  assigneeId: true,
  teamId: true,
  projectId: true,
  createdAt: true,
  assignee: { select: { name: true } },
  team: { select: { name: true } },
  project: { select: { name: true } },
  creator: { select: { name: true } },
} as const;

function toRow(t: Prisma.TaskGetPayload<{ select: typeof TASK_SELECT }>): TaskRow {
  return {
    id: t.id,
    type: t.type,
    title: t.title,
    status: t.status,
    priority: t.priority,
    dueAt: t.dueAt,
    creatorId: t.creatorId,
    assigneeId: t.assigneeId,
    teamId: t.teamId,
    projectId: t.projectId,
    assigneeName: t.assignee?.name ?? null,
    teamName: t.team?.name ?? null,
    projectName: t.project?.name ?? null,
    creatorName: t.creator.name,
    createdAt: t.createdAt,
  };
}

export type TaskFilter = {
  scope?: "all" | "mine" | "created"; // mine = asignate mie / echipei mele
  status?: TaskStatus;
  type?: TaskType;
  projectId?: string;
  search?: string;
  userId: string; // userul curent (pentru scope)
  teamIds?: string[]; // echipele userului curent
  page?: number;
  pageSize?: number;
};

const PAGE_SIZE = 30;

function buildWhere(filter: TaskFilter): Prisma.TaskWhereInput {
  const where: Prisma.TaskWhereInput = {};
  if (filter.scope === "mine") {
    where.OR = [
      { assigneeId: filter.userId },
      ...(filter.teamIds?.length ? [{ teamId: { in: filter.teamIds } }] : []),
    ];
  } else if (filter.scope === "created") {
    where.creatorId = filter.userId;
  }
  if (filter.status) where.status = filter.status;
  if (filter.type) where.type = filter.type;
  if (filter.projectId) where.projectId = filter.projectId;
  if (filter.search?.trim()) {
    where.title = { contains: filter.search.trim(), mode: "insensitive" };
  }
  return where;
}

export async function listTasks(
  filter: TaskFilter,
): Promise<{ items: TaskRow[]; hasMore: boolean; page: number }> {
  if (DEMO) return { items: [], hasMore: false, page: 1 };

  const page = Math.max(1, filter.page ?? 1);
  const pageSize = filter.pageSize ?? PAGE_SIZE;
  const where = buildWhere(filter);

  // Aducem pageSize+1 ca să știm dacă există pagină următoare, fără count separat.
  const rows = await prisma.task.findMany({
    where,
    select: TASK_SELECT,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize + 1,
  });

  const hasMore = rows.length > pageSize;
  return { items: rows.slice(0, pageSize).map(toRow), hasMore, page };
}

export async function getTask(id: string) {
  if (DEMO) return null;
  return prisma.task.findUnique({
    where: { id },
    select: {
      ...TASK_SELECT,
      description: true,
      createdFrom: true,
      activities: {
        select: {
          id: true,
          fromStatus: true,
          toStatus: true,
          note: true,
          createdAt: true,
          user: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });
}

/** Statistici pe status pentru un scope (dashboard/rapoarte). */
export async function taskStats(userId: string, teamIds: string[], scope: "mine" | "all") {
  if (DEMO) {
    return { PENDING: 0, READ: 0, IN_PROGRESS: 0, DONE: 0, CANCELLED: 0, total: 0 };
  }
  const where: Prisma.TaskWhereInput =
    scope === "mine"
      ? { OR: [{ assigneeId: userId }, ...(teamIds.length ? [{ teamId: { in: teamIds } }] : [])] }
      : {};
  const grouped = await prisma.task.groupBy({
    by: ["status"],
    where,
    _count: { _all: true },
  });
  const m = Object.fromEntries(grouped.map((g) => [g.status, g._count._all])) as Record<
    TaskStatus,
    number
  >;
  return {
    PENDING: m.PENDING ?? 0,
    READ: m.READ ?? 0,
    IN_PROGRESS: m.IN_PROGRESS ?? 0,
    DONE: m.DONE ?? 0,
    CANCELLED: m.CANCELLED ?? 0,
    total: grouped.reduce((s, g) => s + g._count._all, 0),
  };
}

/** Activitate recentă (pentru admin: ce task-uri au fost modificate). */
export async function recentActivity(limit = 30) {
  if (DEMO) return [];
  return prisma.taskActivity.findMany({
    select: {
      id: true,
      fromStatus: true,
      toStatus: true,
      createdAt: true,
      user: { select: { name: true } },
      task: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
