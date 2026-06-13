"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setStatus, deleteAppointment } from "@/app/actions/appointments";
import { STATUS_META } from "./status";
import { IconCheck, IconCheckCircle, IconDots, IconMail, IconSend } from "./icons";
import type { ApptStatus, ApptVM } from "./types";

const actionBtn =
  "tap grid size-9 place-items-center rounded-lg border border-[var(--color-line)] text-sm hover:bg-[var(--color-surface-2)]";

export default function AppointmentItem({ appt }: { appt: ApptVM }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [menu, setMenu] = useState(false);
  const meta = STATUS_META[appt.status];

  function change(status: ApptStatus) {
    start(async () => {
      await setStatus(appt.id, status);
      router.refresh();
    });
    setMenu(false);
  }

  function remove() {
    if (!confirm("Ștergi programarea?")) return;
    start(async () => {
      await deleteAppointment(appt.id);
      router.refresh();
    });
  }

  return (
    <div className={`card flex items-center gap-3 p-3 ${pending ? "opacity-60" : ""}`}>
      <div className="flex w-14 shrink-0 flex-col items-center">
        <span className="text-base font-bold tabular-nums">{appt.time}</span>
        <span className="text-[11px] text-ink-soft tabular-nums">{appt.endTime}</span>
      </div>

      <div
        className="h-10 w-1 shrink-0 rounded-full"
        style={{ background: appt.categoryColor ?? "var(--color-line)" }}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold">{appt.clientName}</span>
          {(appt.remEmail || appt.remTelegram) && (
            <span className="flex items-center gap-1 text-ink-soft">
              {appt.remEmail && <IconMail className="size-3.5" />}
              {appt.remTelegram && <IconSend className="size-3.5" />}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-ink-soft">
          {appt.categoryName && <span className="truncate">{appt.categoryName}</span>}
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.badge}`}>
            {meta.label}
          </span>
        </div>
      </div>

      <div className="relative flex items-center gap-1.5">
        {appt.status !== "CONFIRMED" && appt.status !== "DONE" && (
          <button title="Confirmă" onClick={() => change("CONFIRMED")} className={actionBtn}>
            <IconCheck className="size-4" />
          </button>
        )}
        {appt.status !== "DONE" && (
          <button title="Finalizat" onClick={() => change("DONE")} className={`${actionBtn} text-st-done`}>
            <IconCheckCircle className="size-4" />
          </button>
        )}
        <button
          onClick={() => setMenu((m) => !m)}
          className={actionBtn}
          title="Mai mult"
        >
          <IconDots className="size-4" />
        </button>
        {menu && (
          <div className="absolute right-0 top-11 z-20 w-44 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-1 shadow-lg">
            <MenuItem onClick={() => change("IN_PROGRESS")}>În lucru</MenuItem>
            <MenuItem onClick={() => change("CANCELLED")}>Anulează</MenuItem>
            <MenuItem onClick={() => change("NO_SHOW")}>Nu a venit</MenuItem>
            <div className="my-1 h-px bg-[var(--color-line)]" />
            <MenuItem danger onClick={remove}>Șterge</MenuItem>
          </div>
        )}
      </div>
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--color-surface-2)] ${
        danger ? "text-st-cancelled" : ""
      }`}
    >
      {children}
    </button>
  );
}
