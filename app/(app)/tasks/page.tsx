import Link from "next/link";
import { requirePermission } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { listTasks } from "@/lib/queries/tasks";
import { userOptions } from "@/lib/queries/users";
import { teamOptions } from "@/lib/queries/teams";
import { projectOptions } from "@/lib/queries/projects";
import TasksManager from "@/app/components/TasksManager";
import type { TaskStatus, TaskType } from "@prisma/client";

export const dynamic = "force-dynamic";

const SCOPES = [
  { key: "mine", label: "Ale mele" },
  { key: "all", label: "Toate" },
  { key: "created", label: "Create de mine" },
] as const;

const STATUSES: TaskStatus[] = [
  "PENDING",
  "READ",
  "IN_PROGRESS",
  "ON_HOLD",
  "BLOCKED",
  "DONE",
  "CANCELLED",
];
const TYPES: TaskType[] = ["TASK", "TICKET", "WORK_ORDER"];

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{
    scope?: string;
    status?: string;
    type?: string;
    assignee?: string;
    due?: string;
    q?: string;
    page?: string;
    create?: string;
  }>;
}) {
  const user = await requirePermission("tasks.view");
  const sp = await searchParams;
  const initialCreate =
    sp.create === "ticket" ? "TICKET" : sp.create === "work_order" ? "WORK_ORDER" : sp.create === "task" ? "TASK" : undefined;
  const scope = (["mine", "all", "created"].includes(sp.scope ?? "")
    ? sp.scope
    : "mine") as "mine" | "all" | "created";
  const status = STATUSES.includes(sp.status as TaskStatus)
    ? (sp.status as TaskStatus)
    : undefined;
  const type = TYPES.includes(sp.type as TaskType) ? (sp.type as TaskType) : undefined;
  const assignee = sp.assignee?.trim() || undefined;
  const dueStr = /^\d{4}-\d{2}-\d{2}$/.test(sp.due ?? "") ? sp.due! : undefined;
  const dueBefore = dueStr ? new Date(`${dueStr}T23:59:59`) : undefined;
  const q = sp.q?.trim() || "";
  const page = Math.max(1, Number(sp.page) || 1);

  const [result, users, teams, projects] = await Promise.all([
    listTasks({
      scope,
      status,
      type,
      assigneeId: assignee,
      dueBefore,
      search: q,
      userId: user.id,
      teamIds: user.teamIds,
      page,
    }),
    userOptions(),
    teamOptions(),
    projectOptions(),
  ]);

  return (
    <div className="w-full">
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {SCOPES.map((s) => (
          <Link
            key={s.key}
            href={`/tasks?scope=${s.key}`}
            className={`tap shrink-0 rounded-full px-4 py-1.5 text-sm font-medium ${
              scope === s.key ? "bg-brand text-white" : "card text-ink-soft"
            }`}
          >
            {s.label}
          </Link>
        ))}
      </div>

      <TasksManager
        items={result.items}
        hasMore={result.hasMore}
        page={result.page}
        scope={scope}
        status={status ?? ""}
        type={type ?? ""}
        assignee={assignee ?? ""}
        due={dueStr ?? ""}
        q={q}
        users={users}
        teams={teams}
        projects={projects}
        canCreate={can(user, "tasks.create")}
        canDelete={can(user, "tasks.delete")}
        initialCreate={can(user, "tasks.create") ? initialCreate : undefined}
      />
    </div>
  );
}
