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
type Status = "PENDING" | "READ" | "IN_PROGRESS" | "ON_HOLD" | "BLOCKED" | "DONE" | "CANCELLED";
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

const ST: Record<Status, { label: string; badge: string; dot: string }> = {
  PENDING: { label: "În așteptare", badge: "bg-st-new/12 text-st-new", dot: "bg-st-new" },
  READ: { label: "Citit", badge: "bg-st-confirmed/12 text-st-confirmed", dot: "bg-st-confirmed" },
  IN_PROGRESS: { label: "În lucru", badge: "bg-st-progress/12 text-st-progress", dot: "bg-st-progress" },
  ON_HOLD: { label: "Suspendat", badge: "bg-st-noshow/12 text-st-noshow", dot: "bg-st-noshow" },
  BLOCKED: { label: "Blocat", badge: "bg-st-cancelled/12 text-st-cancelled", dot: "bg-st-cancelled" },
  DONE: { label: "Finalizat", badge: "bg-st-done/12 text-st-done", dot: "bg-st-done" },
  CANCELLED: { label: "Anulat", badge: "bg-st-cancelled/12 text-st-cancelled", dot: "bg-st-cancelled" },
};
const TYPE_RO = { TASK: "Task", TICKET: "Tichet", WORK_ORDER: "Work order" };
const PRIO_RO = { LOW: "Scăzută", MEDIUM: "Medie", HIGH: "Ridicată", URGENT: "Urgentă" };
const STATUSES: Status[] = ["PENDING", "READ", "IN_PROGRESS", "ON_HOLD", "BLOCKED", "DONE", "CANCELLED"];

const fld =
  "h-9 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-2 text-xs outline-none focus:border-brand";
const dlgInput =
  "h-11 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3 text-sm outline-none focus:border-brand";

export default function TasksManager({
  items,
  hasMore,
  page,
  scope,
  status,
  type,
  assignee,
  due,
  q,
  users,
  teams,
  projects,
  canCreate,
  canDelete,
  initialCreate,
}: {
  items: Task[];
  hasMore: boolean;
  page: number;
  scope: string;
  status: string;
  type: string;
  assignee: string;
  due: string;
  q: string;
  users: Opt[];
  teams: Opt[];
  projects: Opt[];
  canCreate: boolean;
  canDelete: boolean;
  initialCreate?: "TASK" | "TICKET" | "WORK_ORDER";
}) {
  const router = useRouter();
  const toast = useToast();
  const [createType, setCreateType] = useState<"TASK" | "TICKET" | "WORK_ORDER" | null>(
    initialCreate ?? null,
  );
  const [tasks, setTasks] = useState(items);
  useEffect(() => setTasks(items), [items]);

  const [search, setSearch] = useState(q);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function navigate(params: Record<string, string | number>) {
    const sp = new URLSearchParams();
    sp.set("scope", scope);
    const merged = { status, type, assignee, due, q, page, ...params };
    for (const k of ["status", "type", "assignee", "due", "q"] as const) {
      if (merged[k]) sp.set(k, String(merged[k]));
    }
    if (merged.page && Number(merged.page) > 1) sp.set("page", String(merged.page));
    router.push(`/tasks?${sp.toString()}`);
  }

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
        setTasks(prev);
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
      .then(() => toast.success("Șters"))
      .catch(() => {
        setTasks(prev);
        toast.error("Ștergerea a eșuat");
      });
  }

  const activeFilters = Boolean(status || type || assignee || due);

  return (
    <>
      {/* Filtre */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Caută…"
          className="h-9 min-w-40 flex-1 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 text-sm outline-none focus:border-brand"
        />
        <select value={status} onChange={(e) => navigate({ status: e.target.value, page: 1 })} className={fld}>
          <option value="">Status: toate</option>
          {STATUSES.map((s) => <option key={s} value={s}>{ST[s].label}</option>)}
        </select>
        <select value={type} onChange={(e) => navigate({ type: e.target.value, page: 1 })} className={fld}>
          <option value="">Tip: toate</option>
          <option value="TASK">Task</option>
          <option value="TICKET">Tichet</option>
          <option value="WORK_ORDER">Work order</option>
        </select>
        <select value={assignee} onChange={(e) => navigate({ assignee: e.target.value, page: 1 })} className={fld}>
          <option value="">Persoană: toți</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <input type="date" value={due} onChange={(e) => navigate({ due: e.target.value, page: 1 })} title="Scadent până la" className={fld} />
        {activeFilters && (
          <button onClick={() => router.push(`/tasks?scope=${scope}`)} className="tap h-9 rounded-lg border border-[var(--color-line)] px-3 text-xs text-ink-soft hover:bg-[var(--color-surface-2)]">
            Resetează
          </button>
        )}
      </div>

      {canCreate && (
        <div className="mb-3 flex gap-2">
          <button onClick={() => setCreateType("TASK")} className="tap h-10 flex-1 rounded-xl bg-brand text-sm font-semibold text-white hover:bg-brand-strong">
            + Task nou
          </button>
          <button onClick={() => setCreateType("TICKET")} className="tap h-10 flex-1 rounded-xl bg-[var(--color-surface-2)] text-sm font-semibold hover:bg-brand-soft">
            + Tichet nou
          </button>
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="card grid place-items-center p-8 text-center text-sm text-ink-soft">Niciun rezultat.</div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {tasks.map((t) => (
            <div key={t.id} className="card flex items-center gap-2.5 px-3 py-2">
              <span className={`size-2.5 shrink-0 rounded-full ${ST[t.status].dot}`} title={ST[t.status].label} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{t.title}</span>
                  <span className="hidden shrink-0 rounded bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[10px] text-ink-soft sm:inline">
                    {TYPE_RO[t.type]}
                  </span>
                </div>
                <p className="truncate text-[11px] text-ink-soft">
                  {PRIO_RO[t.priority]}
                  {t.projectName && ` · ${t.projectName}`}
                  {(t.assigneeName || t.teamName) && ` · ${t.assigneeName ?? t.teamName}`}
                  {t.dueAt && ` · ${new Date(t.dueAt).toLocaleDateString("ro-RO")}`}
                </p>
              </div>
              <select
                value={t.status}
                onChange={(e) => changeStatus(t.id, e.target.value as Status)}
                className="h-8 w-28 shrink-0 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-1.5 text-[11px] outline-none focus:border-brand"
              >
                {STATUSES.map((s) => <option key={s} value={s}>{ST[s].label}</option>)}
              </select>
              {canDelete && (
                <button onClick={() => remove(t.id)} className="tap grid size-8 shrink-0 place-items-center rounded-lg border border-[var(--color-line)] text-st-cancelled hover:bg-[var(--color-surface-2)]" title="Șterge">
                  <IconTrash className="size-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {(page > 1 || hasMore) && (
        <div className="mt-4 flex items-center justify-between">
          <button disabled={page <= 1} onClick={() => navigate({ page: page - 1 })} className="tap card inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-40">
            <IconChevronLeft className="size-4" /> Anterior
          </button>
          <span className="text-sm text-ink-soft">Pagina {page}</span>
          <button disabled={!hasMore} onClick={() => navigate({ page: page + 1 })} className="tap card inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-40">
            Următor <IconChevronRight className="size-4" />
          </button>
        </div>
      )}

      {createType && (
        <CreateDialog
          initialType={createType}
          users={users}
          teams={teams}
          projects={projects}
          onClose={() => setCreateType(null)}
          onCreated={() => router.refresh()}
        />
      )}
    </>
  );
}

function CreateDialog({
  initialType,
  users,
  teams,
  projects,
  onClose,
  onCreated,
}: {
  initialType: "TASK" | "TICKET" | "WORK_ORDER";
  users: Opt[];
  teams: Opt[];
  projects: Opt[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const toast = useToast();
  const [state, action, pending] = useActionState<TaskState, FormData>(createTaskAction, undefined);
  useEffect(() => {
    if (state?.ok) {
      toast.success("Creat");
      onCreated();
      onClose();
    } else if (state?.error) {
      toast.error(state.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const title = initialType === "TICKET" ? "Tichet nou" : initialType === "WORK_ORDER" ? "Work order nou" : "Task nou";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card max-h-[92dvh] w-full max-w-lg overflow-auto rounded-b-none rounded-t-2xl p-5 sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold">{title}</h2>
          <button onClick={onClose} className="tap grid size-9 place-items-center rounded-lg text-ink-soft hover:bg-[var(--color-surface-2)]" aria-label="Închide">
            <IconX className="size-4" />
          </button>
        </div>
        <form action={action} className="flex flex-col gap-3">
          <input name="title" placeholder="Titlu *" required autoFocus className={dlgInput} />
          <textarea name="description" placeholder="Descriere" rows={3} className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm outline-none focus:border-brand" />
          <div className="grid grid-cols-2 gap-3">
            <select name="type" defaultValue={initialType} className={dlgInput}>
              <option value="TASK">Task</option>
              <option value="TICKET">Tichet</option>
              <option value="WORK_ORDER">Work order</option>
            </select>
            <select name="priority" defaultValue="MEDIUM" className={dlgInput}>
              <option value="LOW">Prioritate scăzută</option>
              <option value="MEDIUM">Prioritate medie</option>
              <option value="HIGH">Prioritate ridicată</option>
              <option value="URGENT">Urgentă</option>
            </select>
          </div>
          <select name="projectId" defaultValue="" className={dlgInput}>
            <option value="">Fără proiect (se asignează ție)</option>
            {projects.map((p) => <option key={p.id} value={p.id}>Proiect: {p.name}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <select name="assigneeId" defaultValue="" className={dlgInput}>
              <option value="">Asignează persoană…</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <select name="teamId" defaultValue="" className={dlgInput}>
              <option value="">…sau echipă</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-soft">Scadent (opțional)</label>
            <input type="date" name="dueAt" className={dlgInput} />
          </div>
          {state?.error && <p className="text-sm text-st-cancelled">{state.error}</p>}
          <button type="submit" disabled={pending} className="tap h-12 rounded-xl bg-brand font-semibold text-white hover:bg-brand-strong disabled:opacity-60">
            {pending ? "Se salvează…" : "Creează"}
          </button>
        </form>
      </div>
    </div>
  );
}
