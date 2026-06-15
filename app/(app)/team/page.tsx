import { requirePermission } from "@/lib/dal";
import { listTeams } from "@/lib/queries/teams";
import { userOptions } from "@/lib/queries/users";
import TeamsManager from "@/app/components/TeamsManager";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  await requirePermission("teams.manage");
  const [teams, users] = await Promise.all([listTeams(), userOptions()]);
  return (
    <div className="mx-auto max-w-3xl">
      <TeamsManager teams={teams} users={users} />
    </div>
  );
}
