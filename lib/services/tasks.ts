import "server-only";
import { prisma } from "../prisma";
import { DEMO } from "../demo";
import {
  sendMessage,
  editMessageText,
  taskStatusButtons,
  TASK_STATUS_RO,
} from "../telegram";
import type { TaskStatus, TaskType, TaskPriority, CreatedFrom } from "@prisma/client";

export type CreateTaskInput = {
  title: string;
  description?: string;
  type?: TaskType;
  priority?: TaskPriority;
  dueAt?: Date | null;
  assigneeId?: string | null;
  teamId?: string | null;
  projectId?: string | null;
};

async function telegramChatFor(userId: string): Promise<string | null> {
  const acc = await prisma.telegramAccount.findUnique({
    where: { userId },
    select: { chatId: true },
  });
  return acc?.chatId ?? null;
}

/** Trimite notificarea de task nou către un user (cu butoane de status). */
async function notifyAssignee(
  userId: string,
  taskId: string,
  title: string,
): Promise<{ chatId: string; messageId: number } | null> {
  const chatId = await telegramChatFor(userId);
  if (!chatId) return null;
  const res = (await sendMessage(
    chatId,
    `🆕 <b>Task nou</b>\n${title}\n\nStatus: <b>${TASK_STATUS_RO.PENDING}</b>`,
    taskStatusButtons(taskId),
  )) as { message_id?: number } | null;
  return res?.message_id ? { chatId, messageId: res.message_id } : null;
}

/**
 * Creează un task cu logica de asignare:
 *  - assignee/team explicit au prioritate
 *  - altfel, moștenește asignarea proiectului
 *  - altfel, se asignează creatorului
 */
export async function createTask(
  creatorId: string,
  input: CreateTaskInput,
  source: CreatedFrom = "WEB",
) {
  if (DEMO) return { ok: false as const, error: "Mod demo: conectează o bază de date." };

  let assigneeId = input.assigneeId || null;
  let teamId = input.teamId || null;

  if (!assigneeId && !teamId && input.projectId) {
    const project = await prisma.project.findUnique({
      where: { id: input.projectId },
      select: { assigneeId: true, teamId: true },
    });
    if (project) {
      assigneeId = project.assigneeId;
      teamId = project.teamId;
    }
  }
  // Fără nicio asignare ⇒ revine creatorului
  if (!assigneeId && !teamId) assigneeId = creatorId;

  const task = await prisma.task.create({
    data: {
      title: input.title.trim(),
      description: input.description?.trim() || null,
      type: input.type ?? "TASK",
      priority: input.priority ?? "MEDIUM",
      dueAt: input.dueAt ?? null,
      creatorId,
      assigneeId,
      teamId,
      projectId: input.projectId || null,
      createdFrom: source,
      status: "PENDING",
    },
    select: { id: true, title: true },
  });

  // Notificări Telegram
  const recipients = new Set<string>();
  if (assigneeId) recipients.add(assigneeId);
  if (teamId) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { memberIds: true },
    });
    team?.memberIds.forEach((id) => recipients.add(id));
  }

  let stored = false;
  for (const uid of recipients) {
    const sent = await notifyAssignee(uid, task.id, task.title);
    // Pentru asignat individual, reținem mesajul ca să-l putem edita
    if (sent && uid === assigneeId && !stored) {
      await prisma.task
        .update({
          where: { id: task.id },
          data: { telegramChatId: sent.chatId, telegramMessageId: sent.messageId },
        })
        .catch(() => {});
      stored = true;
    }
  }

  return { ok: true as const, id: task.id, title: task.title };
}

/**
 * Schimbă statusul unui task: jurnal + notificare către creator (admin) +
 * actualizarea mesajului din Telegram (dacă există).
 */
export async function changeTaskStatus(
  taskId: string,
  actorId: string,
  newStatus: TaskStatus,
  opts: { fromTelegram?: boolean } = {},
) {
  if (DEMO) return { ok: false as const, error: "Mod demo." };

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      title: true,
      status: true,
      creatorId: true,
      telegramChatId: true,
      telegramMessageId: true,
    },
  });
  if (!task) return { ok: false as const, error: "Task inexistent." };
  if (task.status === newStatus) return { ok: true as const };

  await prisma.task.update({ where: { id: taskId }, data: { status: newStatus } });
  await prisma.taskActivity.create({
    data: { taskId, userId: actorId, fromStatus: task.status, toStatus: newStatus },
  });

  // Notifică creatorul (adminul) că s-a schimbat statusul
  if (task.creatorId !== actorId) {
    const actor = await prisma.user.findUnique({
      where: { id: actorId },
      select: { name: true },
    });
    const chat = await telegramChatFor(task.creatorId);
    if (chat) {
      await sendMessage(
        chat,
        `🔔 <b>${actor?.name ?? "Cineva"}</b> a schimbat task-ul\n«${task.title}»\nstatus: <b>${TASK_STATUS_RO[newStatus]}</b>`,
      );
    }
  }

  // Actualizează mesajul din Telegram al asignatului
  if (opts.fromTelegram && task.telegramChatId && task.telegramMessageId) {
    const closed = newStatus === "DONE" || newStatus === "CANCELLED";
    await editMessageText(
      task.telegramChatId,
      task.telegramMessageId,
      `📋 ${task.title}\n\nStatus: <b>${TASK_STATUS_RO[newStatus]}</b>`,
      closed ? undefined : taskStatusButtons(task.id),
    );
  }

  return { ok: true as const };
}
