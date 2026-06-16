import Link from "next/link";
import { requirePermission } from "@/lib/dal";
import { getUserTimezone } from "@/lib/queries/settings";
import { listByDateKey, listByDateKeys } from "@/lib/queries/appointments";
import {
  todayKey,
  weekKeys,
  addDaysToKey,
  humanDay,
} from "@/lib/date";
import { toVM } from "@/lib/view";
import AppointmentItem from "@/app/components/AppointmentItem";
import { IconChevronLeft, IconChevronRight } from "@/app/components/icons";
import type { ApptVM } from "@/app/components/types";

export const dynamic = "force-dynamic";

type View = "day" | "week" | "month";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  const user = await requirePermission("appointments.view");
  const tz = await getUserTimezone(user.id);
  const sp = await searchParams;
  const view = (["day", "week", "month"].includes(sp.view ?? "") ? sp.view : "week") as View;
  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(sp.date ?? "") ? sp.date! : todayKey(tz);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-full bg-[var(--color-surface-2)] p-1">
          {(["day", "week", "month"] as View[]).map((v) => (
            <Link
              key={v}
              href={`/calendar?view=${v}&date=${anchor}`}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
                view === v ? "bg-brand text-white" : "text-ink-soft"
              }`}
            >
              {v === "day" ? "Zi" : v === "week" ? "Săptămână" : "Lună"}
            </Link>
          ))}
        </div>
        <Link
          href={`/calendar?view=${view}&date=${todayKey(tz)}`}
          className="tap card ml-auto rounded-full px-3.5 py-1.5 text-sm"
        >
          Azi
        </Link>
      </div>

      {view === "day" && <DayView userId={user.id} tz={tz} dateKey={anchor} />}
      {view === "week" && <WeekView userId={user.id} tz={tz} anchor={anchor} />}
      {view === "month" && <MonthView userId={user.id} tz={tz} anchor={anchor} />}
    </div>
  );
}

async function DayView({ userId, tz, dateKey }: { userId: string; tz: string; dateKey: string }) {
  const items = (await listByDateKey(userId, dateKey)).map((a) => toVM(a, tz));
  return (
    <div>
      <Nav
        view="day"
        prev={addDaysToKey(dateKey, -1, tz)}
        next={addDaysToKey(dateKey, 1, tz)}
        label={humanDay(dateKey, tz)}
      />
      {items.length === 0 ? (
        <Empty />
      ) : (
        <div className="flex flex-col gap-2.5">
          {items.map((a) => (
            <AppointmentItem key={a.id} appt={a} />
          ))}
        </div>
      )}
    </div>
  );
}

async function WeekView({ userId, tz, anchor }: { userId: string; tz: string; anchor: string }) {
  const keys = weekKeys(anchor, tz);
  const items = (await listByDateKeys(userId, keys)).map((a) => toVM(a, tz));
  const byDay = new Map<string, ApptVM[]>();
  for (const it of items) {
    const arr = byDay.get(it.dateKey) ?? [];
    arr.push(it);
    byDay.set(it.dateKey, arr);
  }
  const today = todayKey(tz);

  return (
    <div>
      <Nav
        view="week"
        prev={addDaysToKey(keys[0], -7, tz)}
        next={addDaysToKey(keys[0], 7, tz)}
        label={`${keys[0]} – ${keys[6]}`}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {keys.map((day) => {
          const dayItems = byDay.get(day) ?? [];
          return (
            <div key={day} className={`card p-2.5 ${day === today ? "ring-2 ring-brand" : ""}`}>
              <Link href={`/calendar?view=day&date=${day}`} className="mb-2 block">
                <p className="text-[11px] font-semibold uppercase text-ink-soft capitalize">
                  {humanDay(day, tz)}
                </p>
              </Link>
              <div className="flex flex-col gap-1.5">
                {dayItems.length === 0 && (
                  <p className="py-2 text-center text-xs text-ink-soft">—</p>
                )}
                {dayItems.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-lg px-2 py-1.5 text-xs"
                    style={{ background: (a.categoryColor ?? "#64748b") + "22" }}
                  >
                    <span className="font-semibold tabular-nums">{a.time}</span>{" "}
                    <span className="text-ink-soft">{a.clientName}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

async function MonthView({ userId, tz, anchor }: { userId: string; tz: string; anchor: string }) {
  const [y, m] = anchor.split("-").map(Number);
  // Prima zi a lunii și grila de 42 de celule pornind de Luni
  const firstKey = `${y}-${String(m).padStart(2, "0")}-01`;
  const firstDow = (new Date(Date.UTC(y, m - 1, 1, 12)).getUTCDay() + 6) % 7;
  const gridStart = addDaysToKey(firstKey, -firstDow, tz);
  const cells = Array.from({ length: 42 }, (_, i) => addDaysToKey(gridStart, i, tz));

  const items = await listByDateKeys(userId, cells);
  const counts = new Map<string, number>();
  for (const it of items) counts.set(it.dateKey, (counts.get(it.dateKey) ?? 0) + 1);

  const today = todayKey(tz);
  const prevMonth = addDaysToKey(firstKey, -1, tz).slice(0, 7) + "-01";
  const nextMonth = addDaysToKey(`${y}-${String(m).padStart(2, "0")}-28`, 7, tz).slice(0, 7) + "-01";
  const monthLabel = new Intl.DateTimeFormat("ro-RO", { timeZone: tz, month: "long", year: "numeric" }).format(
    new Date(Date.UTC(y, m - 1, 15)),
  );

  return (
    <div>
      <Nav view="month" prev={prevMonth} next={nextMonth} label={monthLabel} />
      <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-semibold text-ink-soft">
        {["L", "Ma", "Mi", "J", "V", "S", "D"].map((d) => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day) => {
          const inMonth = day.slice(0, 7) === `${y}-${String(m).padStart(2, "0")}`;
          const n = counts.get(day) ?? 0;
          return (
            <Link
              key={day}
              href={`/calendar?view=day&date=${day}`}
              className={`card flex aspect-square flex-col items-center justify-center gap-1 p-1 ${
                inMonth ? "" : "opacity-40"
              } ${day === today ? "ring-2 ring-brand" : ""}`}
            >
              <span className="text-sm tabular-nums">{Number(day.slice(8))}</span>
              {n > 0 && (
                <span className="rounded-full bg-brand px-1.5 text-[10px] font-bold text-white">
                  {n}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Nav({ view, prev, next, label }: { view: View; prev: string; next: string; label: string }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <Link href={`/calendar?view=${view}&date=${prev}`} className="tap card grid size-9 place-items-center rounded-lg" aria-label="Anterior">
        <IconChevronLeft className="size-4" />
      </Link>
      <span className="text-sm font-semibold capitalize">{label}</span>
      <Link href={`/calendar?view=${view}&date=${next}`} className="tap card grid size-9 place-items-center rounded-lg" aria-label="Următor">
        <IconChevronRight className="size-4" />
      </Link>
    </div>
  );
}

function Empty() {
  return (
    <div className="card grid place-items-center p-10 text-center text-sm text-ink-soft">
      Nicio programare.
    </div>
  );
}
