import { requirePermission } from "@/lib/dal";
import { listProjects } from "@/lib/queries/projects";
import { userOptions } from "@/lib/queries/users";
import { teamOptions } from "@/lib/queries/teams";
import ProjectsManager from "@/app/components/ProjectsManager";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  await requirePermission("projects.manage");
  const [projects, users, teams] = await Promise.all([
    listProjects(),
    userOptions(),
    teamOptions(),
  ]);
  return (
    <div className="mx-auto max-w-3xl">
      <ProjectsManager projects={projects} users={users} teams={teams} />
    </div>
  );
}
