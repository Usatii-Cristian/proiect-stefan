"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { DEMO } from "@/lib/demo";
import type { ProjectStatus } from "@prisma/client";

export type ProjectState = { ok?: boolean; error?: string; id?: string } | undefined;

const STATUSES: ProjectStatus[] = ["ACTIVE", "ON_HOLD", "DONE", "ARCHIVED"];

function parse(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const clientId = (formData.get("clientId") as string) || null;
  const assigneeId = (formData.get("assigneeId") as string) || null;
  const teamId = (formData.get("teamId") as string) || null;
  const status = STATUSES.includes(formData.get("status") as ProjectStatus)
    ? (formData.get("status") as ProjectStatus)
    : "ACTIVE";
  return { name, description, clientId, assigneeId, teamId, status };
}

export async function createProject(
  _prev: ProjectState,
  formData: FormData,
): Promise<ProjectState> {
  const user = await requireUser();
  if (!can(user, "projects.create")) return { error: "Fără permisiune." };
  if (DEMO) return { error: "Mod demo." };
  const d = parse(formData);
  if (!d.name) return { error: "Numele e obligatoriu." };
  const p = await prisma.project.create({
    data: {
      name: d.name,
      description: d.description,
      status: d.status,
      ownerId: user.id,
      clientId: d.clientId,
      assigneeId: d.assigneeId,
      teamId: d.teamId,
    },
    select: { id: true },
  });
  revalidatePath("/projects");
  revalidateTag("projects", "max");
  return { ok: true, id: p.id };
}

export async function updateProject(
  _prev: ProjectState,
  formData: FormData,
): Promise<ProjectState> {
  const user = await requireUser();
  if (!can(user, "projects.edit")) return { error: "Fără permisiune." };
  if (DEMO) return { error: "Mod demo." };
  const id = String(formData.get("id") ?? "");
  const d = parse(formData);
  if (!d.name) return { error: "Numele e obligatoriu." };
  await prisma.project.update({
    where: { id },
    data: {
      name: d.name,
      description: d.description,
      status: d.status,
      clientId: d.clientId,
      assigneeId: d.assigneeId,
      teamId: d.teamId,
    },
  });
  revalidatePath("/projects");
  revalidateTag("projects", "max");
  return { ok: true, id };
}

export async function deleteProject(id: string): Promise<void> {
  const user = await requireUser();
  if (!can(user, "projects.delete")) return;
  if (DEMO) return;
  // Detașează task-urile (nu le ștergem)
  await prisma.task.updateMany({ where: { projectId: id }, data: { projectId: null } });
  await prisma.project.delete({ where: { id } }).catch(() => {});
  revalidatePath("/projects");
  revalidateTag("projects", "max");
}
