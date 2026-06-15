"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createTaskAction,
  setTaskStatus,
  deleteTask,
  type TaskState,
} from "@/app/actions/tasks";
import { IconTrash, IconX } from "./icons";

type Opt = { id: string; name: string };
type Task = {
  id: string;
  type: "TASK" | "TICKET" | "WORK_ORDER";
  title: string;
  status: "PENDING" | "READ" | "IN_PROGRESS" | "DONE" | "CANCELLED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueAt: string | Date | null;
  assigneeName: string | null;
  teamName: string | null;
  projectName: string | null;
  creatorName: string;
};

const ST: Record<Task["status"], { label: string; cls: string }> = {
  PENDING: { label: "În așteptare", cls: "bg-st-new/12 text-st-new" },
  READ: { label: "Citit", cls: "bg-st-confirmed/12 text-st-confirmed" },
  IN_PROGRESS: { label: "În lucru", cls: "bg-st-progress/12 text-st-progress" },
  DONE: { label: "Finalizat", cls: "bg-st-done/12 text-st-done" },
  CANCELLED: { label: "Anulat", cls: "bg-st-cancelled/12 text-st-cancelled" },
};
const TYPE_RO = { TASK: "Task", TICKET: "Tichet", WORK_ORDER: "Work Order" };
const PRIO_RO = { LOW: "Scăzută", MEDIUM: "Medie", HIGH: "Ridicată", URGENT: "Urgentă" };
const STATUSES: Task["status"][] = ["PENDING", "READ", "IN_PROGRESS", "DONE", "CANCELLED"];

const input =
  "h-11 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3 text-sm outline-none focus:border-brand";

export default function TasksManager({
  tasks,
  users,
  teams,
  projects,
  canCreate,
  canDelete,
}: {
  tasks: Task[];
  users: Opt[];
  teams: Opt[];
  projects: Opt[];
  canCreate: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [, start] = useTransition();

  function changeStatus(id: string, status: string) {
    start(async () => {
      await setTaskStatus(id, status);
      router.refresh();
    });
  }
  function remove(id: string) {
    if (!confirm("Ștergi task-ul?")) return;
    start(async () => {
      await deleteTask(id);
      router.refresh();
    });
  }

  return (
    <>
      {canCreate && (
        <button
          onClick={() => setOpen(true)}
          className="tap mb-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand font-semibold text-white hover:bg-brand-strong"
        >
          + Task nou
        </button>
      )}

      {tasks.length === 0 ? (
        <div className="card grid place-items-center p-10 text-center text-sm text-ink-soft">
          Niciun task.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {tasks.map((t) => (
            <div key={t.id} className="card p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold">{t.title}</p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {TYPE_RO[t.type]} · {PRIO_RO[t.priority]}
                    {t.projectName && ` · ${t.projectName}`}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${ST[t.status].cls}`}>
                  {ST[t.status].label}
                </span>
              </div>

              <div className="mt-2 flex items-center gap-2 text-xs text-ink-soft">
                <span>
                  {t.assigneeName ? `→ ${t.assigneeName}` : t.teamName ? `→ ${t.teamName}` : "neasignat"}
                </span>
                {t.dueAt && (
                  <span>· scadent {new Date(t.dueAt).toLocaleDateString("ro-RO")}</span>
                )}
              </div>

              <div className="mt-3 flex items-center gap-2">
                <select
                  value={t.status}
                  onChange={(e) => changeStatus(t.id, e.target.value)}
                  className="h-9 flex-1 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-2 text-xs outline-none"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {ST[s].label}
                    </option>
                  ))}
                </select>
                {canDelete && (
                  <button
                    onClick={() => remove(t.id)}
                    className="tap grid size-9 place-items-center rounded-lg border border-[var(--color-line)] text-st-cancelled hover:bg-[var(--color-surface-2)]"
                    title="Șterge"
                  >
                    <IconTrash className="size-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <CreateDialog
          users={users}
          teams={teams}
          projects={projects}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function CreateDialog({
  users,
  teams,
  projects,
  onClose,
}: {
  users: Opt[];
  teams: Opt[];
  projects: Opt[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<TaskState, FormData>(
    createTaskAction,
    undefined,
  );
  useEffect(() => {
    if (state?.ok) {
      router.refresh();
      onClose();
    }
  }, [state, router, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="card max-h-[92dvh] w-full max-w-lg overflow-auto rounded-b-none rounded-t-2xl p-5 sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold">Task nou</h2>
          <button onClick={onClose} className="tap grid size-9 place-items-center rounded-lg text-ink-soft hover:bg-[var(--color-surface-2)]" aria-label="Închide">
            <IconX className="size-4" />
          </button>
        </div>
        <form action={action} className="flex flex-col gap-3">
          <input name="title" placeholder="Titlu *" required className={input} />
          <textarea name="description" placeholder="Descriere" rows={3} className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm outline-none focus:border-brand" />

          <div className="grid grid-cols-2 gap-3">
            <select name="type" defaultValue="TASK" className={input}>
              <option value="TASK">Task</option>
              <option value="TICKET">Tichet</option>
              <option value="WORK_ORDER">Work Order</option>
            </select>
            <select name="priority" defaultValue="MEDIUM" className={input}>
              <option value="LOW">Prioritate scăzută</option>
              <option value="MEDIUM">Prioritate medie</option>
              <option value="HIGH">Prioritate ridicată</option>
              <option value="URGENT">Urgentă</option>
            </select>
          </div>

          <select name="projectId" defaultValue="" className={input}>
            <option value="">Fără proiect (se asignează ție)</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>Proiect: {p.name}</option>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-3">
            <select name="assigneeId" defaultValue="" className={input}>
              <option value="">Asignează persoană…</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            <select name="teamId" defaultValue="" className={input}>
              <option value="">…sau echipă</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-soft">Scadent (opțional)</label>
            <input type="date" name="dueAt" className={input} />
          </div>

          {state?.error && <p className="text-sm text-st-cancelled">{state.error}</p>}
          <button type="submit" disabled={pending} className="tap h-12 rounded-xl bg-brand font-semibold text-white hover:bg-brand-strong disabled:opacity-60">
            {pending ? "Se salvează…" : "Creează task"}
          </button>
        </form>
      </div>
    </div>
  );
}
