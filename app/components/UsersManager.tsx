"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createUser,
  updateUser,
  toggleUserActive,
  type UserState,
} from "@/app/actions/users";
import { PERMISSION_GROUPS } from "@/lib/permissions";
import { IconX, IconPencil } from "./icons";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "STAFF";
  isActive: boolean;
  permissions: string[];
};

const input =
  "h-11 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3 text-sm outline-none focus:border-brand";

export default function UsersManager({ users }: { users: UserRow[] }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [dialog, setDialog] = useState<{ open: boolean; user: UserRow | null }>({
    open: false,
    user: null,
  });

  function toggle(u: UserRow) {
    start(async () => {
      await toggleUserActive(u.id, !u.isActive);
      router.refresh();
    });
  }

  return (
    <>
      <button
        onClick={() => setDialog({ open: true, user: null })}
        className="tap mb-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand font-semibold text-white hover:bg-brand-strong"
      >
        + Utilizator nou
      </button>

      <div className="flex flex-col gap-2.5">
        {users.map((u) => (
          <div key={u.id} className="card flex items-center gap-3 p-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-bold text-brand-strong">
              {u.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">
                {u.name}
                {!u.isActive && <span className="ml-2 text-xs text-st-cancelled">dezactivat</span>}
              </p>
              <p className="truncate text-xs text-ink-soft">
                {u.email} · {u.role === "ADMIN" ? "Administrator" : `${u.permissions.length} permisiuni`}
              </p>
            </div>
            <button
              onClick={() => toggle(u)}
              className="tap rounded-lg border border-[var(--color-line)] px-2.5 py-1.5 text-xs hover:bg-[var(--color-surface-2)]"
            >
              {u.isActive ? "Dezactivează" : "Activează"}
            </button>
            <button
              onClick={() => setDialog({ open: true, user: u })}
              className="tap grid size-9 place-items-center rounded-lg border border-[var(--color-line)] hover:bg-[var(--color-surface-2)]"
              title="Editează"
            >
              <IconPencil className="size-4" />
            </button>
          </div>
        ))}
      </div>

      {dialog.open && (
        <UserDialog user={dialog.user} onClose={() => setDialog({ open: false, user: null })} />
      )}
    </>
  );
}

function UserDialog({ user, onClose }: { user: UserRow | null; onClose: () => void }) {
  const router = useRouter();
  const action = user ? updateUser : createUser;
  const [state, formAction, pending] = useActionState<UserState, FormData>(action, undefined);
  const [role, setRole] = useState<"ADMIN" | "STAFF">(user?.role ?? "STAFF");

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
          <h2 className="text-base font-bold">{user ? "Editează utilizator" : "Utilizator nou"}</h2>
          <button onClick={onClose} className="tap grid size-9 place-items-center rounded-lg text-ink-soft hover:bg-[var(--color-surface-2)]" aria-label="Închide">
            <IconX className="size-4" />
          </button>
        </div>

        <form action={formAction} className="flex flex-col gap-3">
          {user && <input type="hidden" name="id" value={user.id} />}
          <input name="name" defaultValue={user?.name ?? ""} placeholder="Nume *" required className={input} />
          {!user && <input name="email" type="email" placeholder="Email *" required className={input} />}
          <input
            name="password"
            type="password"
            placeholder={user ? "Parolă nouă (lasă gol = neschimbată)" : "Parolă * (min 8)"}
            required={!user}
            className={input}
          />

          <div className="grid grid-cols-2 gap-3">
            <select name="role" value={role} onChange={(e) => setRole(e.target.value as "ADMIN" | "STAFF")} className={input}>
              <option value="STAFF">Angajat (permisiuni)</option>
              <option value="ADMIN">Administrator (tot)</option>
            </select>
            <label className="flex items-center gap-2 px-1 text-sm">
              <input type="checkbox" name="isActive" defaultChecked={user?.isActive ?? true} className="size-4 accent-[var(--color-brand)]" />
              Activ
            </label>
          </div>

          {role === "STAFF" && (
            <div className="rounded-xl border border-[var(--color-line)] p-3">
              <p className="mb-2 text-xs font-semibold text-ink-soft">Permisiuni</p>
              <div className="flex flex-col gap-3">
                {PERMISSION_GROUPS.map((g) => (
                  <div key={g.group}>
                    <p className="mb-1 text-[11px] font-semibold uppercase text-ink-soft">{g.group}</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {g.items.map((it) => (
                        <label key={it.key} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            name="permissions"
                            value={it.key}
                            defaultChecked={user?.permissions.includes(it.key) ?? false}
                            className="size-4 accent-[var(--color-brand)]"
                          />
                          {it.label}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {state?.error && <p className="text-sm text-st-cancelled">{state.error}</p>}
          <button type="submit" disabled={pending} className="tap h-12 rounded-xl bg-brand font-semibold text-white hover:bg-brand-strong disabled:opacity-60">
            {pending ? "Se salvează…" : "Salvează"}
          </button>
        </form>
      </div>
    </div>
  );
}
