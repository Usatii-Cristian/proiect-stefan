import { requirePermission } from "@/lib/dal";
import { listProjects } from "@/lib/queries/projects";
import { userOptions } from "@/lib/queries/users";
import { teamOptions } from "@/lib/queries/teams";
import { invoiceClientOptions } from "@/lib/queries/invoices";
import ProjectsManager from "@/app/components/ProjectsManager";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  await requirePermission("projects.view");
  const [projects, users, teams, clients] = await Promise.all([
    listProjects(),
    userOptions(),
    teamOptions(),
    invoiceClientOptions(),
  ]);
  return (
    <div className="mx-auto max-w-3xl">
      <ProjectsManager projects={projects} users={users} teams={teams} clients={clients} />
    </div>
  );
}
