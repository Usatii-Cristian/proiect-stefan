import { requirePermission } from "@/lib/dal";
import { getUserTimezone } from "@/lib/queries/settings";
import { listForKanban } from "@/lib/queries/appointments";
import { todayKey, addDaysToKey } from "@/lib/date";
import { toVM } from "@/lib/view";
import KanbanBoard from "@/app/components/KanbanBoard";

export const dynamic = "force-dynamic";

export default async function KanbanPage() {
  const user = await requirePermission("appointments.view");
  const tz = await getUserTimezone(user.id);
  const today = todayKey(tz);

  // Fereastră: ultimele 7 zile + următoarele 30
  const start = addDaysToKey(today, -7, tz);
  const keys = Array.from({ length: 38 }, (_, i) => addDaysToKey(start, i, tz));

  const items = (await listForKanban(user.id, keys)).map((a) => toVM(a, tz));

  return (
    <div className="mx-auto max-w-6xl">
      <p className="mb-4 text-sm text-ink-soft">
        Programări din ultimele 7 zile și următoarele 30 — mută între coloane.
      </p>
      <KanbanBoard items={items} />
    </div>
  );
}
