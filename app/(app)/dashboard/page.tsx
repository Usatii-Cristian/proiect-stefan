import { requireUser } from "@/lib/dal";
import { getUserTimezone } from "@/lib/queries/settings";
import {
  dayStats,
  listByDateKey,
  nextAppointment,
} from "@/lib/queries/appointments";
import { todayKey, humanDay } from "@/lib/date";
import { toVM } from "@/lib/view";
import AppointmentItem from "@/app/components/AppointmentItem";
import OpenQuickAddButton from "@/app/components/OpenQuickAddButton";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const tz = await getUserTimezone(user.id);
  const today = todayKey(tz);

  const [stats, appts, next] = await Promise.all([
    dayStats(user.id, today),
    listByDateKey(user.id, today),
    nextAppointment(user.id),
  ]);

  const items = appts.map((a) => toVM(a, tz));
  const nextVm = next ? toVM(next, tz) : null;

  return (
    <div className="mx-auto max-w-3xl">
      <p className="mb-4 text-sm text-ink-soft capitalize">{humanDay(today, tz)}</p>

      <OpenQuickAddButton />

      <div className="mt-5 grid grid-cols-3 gap-3">
        <Stat label="Programări azi" value={stats.total} accent="text-ink" />
        <Stat label="Confirmate" value={stats.confirmed} accent="text-st-confirmed" />
        <Stat label="Nu au venit" value={stats.noShow} accent="text-st-noshow" />
      </div>

      {nextVm && (
        <div className="mt-5">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Următorul client
          </h2>
          <div className="card flex items-center gap-3 p-4">
            <div className="grid size-12 place-items-center rounded-xl bg-brand-soft text-lg font-bold text-brand-strong">
              {nextVm.time}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold">{nextVm.clientName}</p>
              <p className="truncate text-sm text-ink-soft">
                {nextVm.categoryName ?? nextVm.title} · {nextVm.dateKey === today ? "azi" : nextVm.dateKey}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
          Astăzi
        </h2>
        {items.length === 0 ? (
          <div className="card grid place-items-center p-10 text-center text-sm text-ink-soft">
            Nicio programare azi. Apasă „Adaugă programare".
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {items.map((a) => (
              <AppointmentItem key={a.id} appt={a} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="card p-4">
      <p className={`text-2xl font-bold ${accent}`}>{value}</p>
      <p className="mt-0.5 text-xs text-ink-soft">{label}</p>
    </div>
  );
}
