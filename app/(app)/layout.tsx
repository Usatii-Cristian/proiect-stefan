import { requireUser } from "@/lib/dal";
import { getSettings } from "@/lib/queries/settings";
import { listCategories } from "@/lib/queries/categories";
import { todayKey, tomorrowKey } from "@/lib/date";
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
  const [settings, categories] = await Promise.all([
    getSettings(user.id),
    listCategories(user.id),
  ]);

  const tz = settings.timezone;

  return (
    <AppShell
      userName={user.name}
      demo={DEMO}
      categories={categories}
      defaults={{
        today: todayKey(tz),
        tomorrow: tomorrowKey(tz),
        slotMinutes: settings.slotMinutes,
        reminderEmail: settings.defaultReminderEmail,
        reminderTelegram: settings.defaultReminderTelegram,
      }}
    >
      {children}
      <PWARegister />
    </AppShell>
  );
}
