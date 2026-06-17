import { requireUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { DEMO } from "@/lib/demo";
import AppShell from "@/app/components/AppShell";
import PWARegister from "@/app/components/PWARegister";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  // Permisiuni pentru filtrarea meniului (ascundem ce userul nu poate accesa)
  const perms: Record<string, boolean> = {
    "tasks.view": can(user, "tasks.view"),
    "projects.view": can(user, "projects.view"),
    "teams.view": can(user, "teams.view"),
    "invoices.view": can(user, "invoices.view"),
    "clients.view": can(user, "clients.view"),
    "appointments.view": can(user, "appointments.view"),
    "users.manage": can(user, "users.manage"),
  };

  return (
    <AppShell userName={user.name} demo={DEMO} perms={perms}>
      {children}
      <PWARegister />
    </AppShell>
  );
}
