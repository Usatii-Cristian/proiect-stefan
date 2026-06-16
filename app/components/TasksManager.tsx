"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createTaskAction,
  setTaskStatus,
  deleteTask,
  type TaskState,
} from "@/app/actions/tasks";
import { useToast } from "./toast";
import { IconTrash, IconX, IconChevronLeft, IconChevronRight } from "./icons";

type Opt = { id: string; name: string };
type Status = "PENDING" | "READ" | "IN_PROGRESS" | "DONE" | "CANCELLED";
type Task = {
  id: string;
  type: "TASK" | "TICKET" | "WORK_ORDER";
  title: string;
  status: Status;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueAt: string | Date | null;
  assigneeName: string | null;
  teamName: string | null;
  projectName: string | null;
  creatorName: string;
};

const ST: Record<Status, { label: string; cls: string }> = {
  PENDING: { label: "În așteptare", cls: "bg-st-new/12 text-st-new" },
  READ: { label: "Citit", cls: "bg-st-confirmed/12 text-st-confirmed" },
  IN_PROGRESS: { label: "În lucru", cls: "bg-st-progress/12 text-st-progress" },
  DONE: { label: "Finalizat", cls: "bg-st-done/12 text-st-done" },
  CANCELLED: { label: "Anulat", cls: "bg-st-cancelled/12 text-st-cancelled" },
};
const TYPE_RO = { TASK: "Task", TICKET: "Tichet", WORK_ORDER: "Work Order" };
const PRIO_RO = { LOW: "Scăzută", MEDIUM: "Medie", HIGH: "Ridicată", URGENT: "Urgentă" };
const STATUSES: Status[] = ["PENDING", "READ", "IN_PROGRESS", "DONE", "CANCELLED"];

const input =
  "h-11 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3 text-sm outline-none focus:border-brand";

export default function TasksManager({
  items,
  hasMore,
  page,
  scope,
  status,
  q,
  users,
  teams,
  projects,
  canCreate,
  canDelete,
}: {
  items: Task[];
  hasMore: boolean;
  page: number;
  scope: string;
  status: string;
  q: string;
  users: Opt[];
  teams: Opt[];
  projects: Opt[];
  canCreate: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  // Lista locală pentru actualizări optimiste (butoane instant, fără refresh).
  const [tasks, setTasks] = useState(items);
  useEffect(() => setTasks(items), [items]);

  const [search, setSearch] = useState(q);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function navigate(params: Record<string, string | number>) {
    const sp = new URLSearchParams();
    sp.set("scope", scope);
    const merged = { status, q, page, ...params };
    if (merged.status) sp.set("status", String(merged.status));
    if (merged.q) sp.set("q", String(merged.q));
    if (merged.page && Number(merged.page) > 1) sp.set("page", String(merged.page));
    router.push(`/tasks?${sp.toString()}`);
  }

  // Căutare debounce
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (search === q) return;
    timer.current = setTimeout(() => navigate({ q: search, page: 1 }), 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function changeStatus(id: string, next: Status) {
    const prev = tasks;
    setTasks((cur) => cur.map((t) => (t.id === id ? { ...t, status: next } : t)));
    setTaskStatus(id, next).then((res) => {
      if (res?.error) {
        setTasks(prev); // revert
        toast.error(res.error);
      } else {
        toast.success(`Status: ${ST[next].label}`);
      }
    });
  }

  function remove(id: string) {
    if (!confirm("Ștergi task-ul?")) return;
    const prev = tasks;
    setTasks((cur) => cur.filter((t) => t.id !== id));
    deleteTask(id)
      .then(() => toast.success("Task șters"))
      .catch(() => {
        setTasks(prev);
        toast.error("Ștergerea a eșuat");
      });
  }

  return (
    <>
      <div className="mb-3 flex gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Caută task…"
          className="h-11 flex-1 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3 text-sm outline-none focus:border-brand"
        />
        <select
          value={status}
          onChange={(e) => navigate({ status: e.target.value, page: 1 })}
          className="h-11 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-2 text-sm outline-none"
        >
          <option value="">Toate statusurile</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{ST[s].label}</option>
          ))}
        </select>
      </div>

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
                <span>{t.assigneeName ? `→ ${t.assigneeName}` : t.teamName ? `→ ${t.teamName}` : "neasignat"}</span>
                {t.dueAt && <span>· scadent {new Date(t.dueAt).toLocaleDateString("ro-RO")}</span>}
              </div>

              <div className="mt-3 flex items-center gap-2">
                <select
                  value={t.status}
                  onChange={(e) => changeStatus(t.id, e.target.value as Status)}
                  className="h-9 flex-1 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-2 text-xs outline-none focus:border-brand"
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
                    className="tap grid size-9 shrink-0 place-items-center rounded-lg border border-[var(--color-line)] text-st-cancelled hover:bg-[var(--color-surface-2)]"
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

      {(page > 1 || hasMore) && (
        <div className="mt-5 flex items-center justify-between">
          <button
            disabled={page <= 1}
            onClick={() => navigate({ page: page - 1 })}
            className="tap card inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-40"
          >
            <IconChevronLeft className="size-4" /> Anterior
          </button>
          <span className="text-sm text-ink-soft">Pagina {page}</span>
          <button
            disabled={!hasMore}
            onClick={() => navigate({ page: page + 1 })}
            className="tap card inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-40"
          >
            Următor <IconChevronRight className="size-4" />
          </button>
        </div>
      )}

      {open && (
        <CreateDialog
          users={users}
          teams={teams}
          projects={projects}
          onClose={() => setOpen(false)}
          onCreated={() => router.refresh()}
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
  onCreated,
}: {
  users: Opt[];
  teams: Opt[];
  projects: Opt[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [state, action, pending] = useActionState<TaskState, FormData>(
    createTaskAction,
    undefined,
  );
  useEffect(() => {
    if (state?.ok) {
      onCreated();
      onClose();
    }
  }, [state, onCreated, onClose]);

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
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <select name="teamId" defaultValue="" className={input}>
              <option value="">…sau echipă</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
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
