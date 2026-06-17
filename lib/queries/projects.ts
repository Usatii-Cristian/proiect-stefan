import "server-only";
import { unstable_cache } from "next/cache";
import { prisma } from "../prisma";
import { DEMO } from "../demo";
import type { ProjectStatus } from "@prisma/client";

export type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  ownerId: string;
  clientId: string | null;
  assigneeId: string | null;
  teamId: string | null;
  taskCount: number;
};

export async function listProjects(): Promise<ProjectRow[]> {
  if (DEMO) return [];
  const rows = await prisma.project.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      ownerId: true,
      clientId: true,
      assigneeId: true,
      teamId: true,
      _count: { select: { tasks: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    status: r.status,
    ownerId: r.ownerId,
    clientId: r.clientId,
    assigneeId: r.assigneeId,
    teamId: r.teamId,
    taskCount: r._count.tasks,
  }));
}

export const projectOptions = unstable_cache(
  async (): Promise<
    { id: string; name: string; assigneeId: string | null; teamId: string | null }[]
  > => {
    if (DEMO) return [];
    return prisma.project.findMany({
      where: { status: { in: ["ACTIVE", "ON_HOLD"] } },
      select: { id: true, name: true, assigneeId: true, teamId: true },
      orderBy: { name: "asc" },
    });
  },
  ["project-options"],
  { tags: ["projects"], revalidate: 300 },
);

export async function getProject(id: string) {
  if (DEMO) return null;
  return prisma.project.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      ownerId: true,
      assigneeId: true,
      teamId: true,
    },
  });
}
