import Link from "next/link";
import { requirePermission } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { listTasks } from "@/lib/queries/tasks";
import { userOptions } from "@/lib/queries/users";
import { teamOptions } from "@/lib/queries/teams";
import { projectOptions } from "@/lib/queries/projects";
import TasksManager from "@/app/components/TasksManager";
import type { TaskStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const SCOPES = [
  { key: "mine", label: "Ale mele" },
  { key: "all", label: "Toate" },
  { key: "created", label: "Create de mine" },
] as const;

const STATUSES: TaskStatus[] = ["PENDING", "READ", "IN_PROGRESS", "DONE", "CANCELLED"];

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; status?: string; q?: string; page?: string }>;
}) {
  const user = await requirePermission("tasks.view");
  const sp = await searchParams;
  const scope = (["mine", "all", "created"].includes(sp.scope ?? "")
    ? sp.scope
    : "mine") as "mine" | "all" | "created";
  const status = STATUSES.includes(sp.status as TaskStatus)
    ? (sp.status as TaskStatus)
    : undefined;
  const q = sp.q?.trim() || "";
  const page = Math.max(1, Number(sp.page) || 1);

  const [result, users, teams, projects] = await Promise.all([
    listTasks({ scope, status, search: q, userId: user.id, teamIds: user.teamIds, page }),
    userOptions(),
    teamOptions(),
    projectOptions(),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {SCOPES.map((s) => (
          <Link
            key={s.key}
            href={`/tasks?scope=${s.key}`}
            className={`tap shrink-0 rounded-full px-4 py-2 text-sm font-medium ${
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
        q={q}
        users={users}
        teams={teams}
        projects={projects}
        canCreate={can(user, "tasks.create")}
        canDelete={can(user, "tasks.delete")}
      />
    </div>
  );
}
