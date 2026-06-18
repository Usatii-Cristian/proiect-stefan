import Link from "next/link";
import { requirePermission } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { listTasks } from "@/lib/queries/tasks";
import { userOptions } from "@/lib/queries/users";
import { teamOptions } from "@/lib/queries/teams";
import { projectOptions } from "@/lib/queries/projects";
import TasksManager from "@/app/components/TasksManager";

export const dynamic = "force-dynamic";

const SCOPES = [
  { key: "mine", label: "Ale mele" },
  { key: "all", label: "Toate" },
  { key: "created", label: "Create de mine" },
] as const;

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; page?: string; create?: string; project?: string }>;
}) {
  const user = await requirePermission("tasks.view");
  const sp = await searchParams;
  const scope = (["mine", "all", "created"].includes(sp.scope ?? "")
    ? sp.scope
    : "mine") as "mine" | "all" | "created";
  const page = Math.max(1, Number(sp.page) || 1);
  const initialCreate =
    sp.create === "ticket" ? "TICKET" : sp.create === "work_order" ? "WORK_ORDER" : sp.create === "task" ? "TASK" : undefined;
  const initialProjectId = typeof sp.project === "string" ? sp.project : undefined;

  // Încărcăm setul scope-ului (server); filtrele status/tip/persoană/dată se aplică pe client (instant).
  const [result, users, teams, projects] = await Promise.all([
    listTasks({ scope, userId: user.id, teamIds: user.teamIds, page, pageSize: 100 }),
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
            prefetch={false}
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
        users={users}
        teams={teams}
        projects={projects}
        canCreate={can(user, "tasks.create")}
        canDelete={can(user, "tasks.delete")}
        canCreateProject={can(user, "projects.create")}
        initialCreate={can(user, "tasks.create") ? initialCreate : undefined}
        initialProjectId={can(user, "tasks.create") ? initialProjectId : undefined}
      />
    </div>
  );
}
