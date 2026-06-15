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

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; status?: string }>;
}) {
  const user = await requirePermission("tasks.view");
  const sp = await searchParams;
  const scope = (["mine", "all", "created"].includes(sp.scope ?? "")
    ? sp.scope
    : "mine") as "mine" | "all" | "created";
  const status = sp.status as TaskStatus | undefined;

  const [tasks, users, teams, projects] = await Promise.all([
    listTasks({ scope, status, userId: user.id, teamIds: user.teamIds, type: undefined }),
    userOptions(),
    teamOptions(),
    projectOptions(),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
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
        tasks={tasks}
        users={users}
        teams={teams}
        projects={projects}
        canCreate={can(user, "tasks.create")}
        canDelete={can(user, "tasks.delete")}
      />
    </div>
  );
}
