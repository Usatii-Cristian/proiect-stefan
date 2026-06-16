import { requirePermission } from "@/lib/dal";
import { listUsers } from "@/lib/queries/users";
import UsersManager from "@/app/components/UsersManager";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  await requirePermission("users.manage");
  const users = await listUsers();
  return (
    <div className="w-full">
      <UsersManager users={users} />
    </div>
  );
}
