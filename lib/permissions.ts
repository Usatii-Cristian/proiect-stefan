/**
 * Permisiuni individuale per utilizator.
 * ADMIN (role) sau cheia "admin" => acces total.
 * Cheile sunt stocate în User.permissions (String[]).
 */

export type PermissionKey =
  | "tasks.view"
  | "tasks.create"
  | "tasks.edit"
  | "tasks.delete"
  | "tasks.assign"
  | "tasks.close"
  | "projects.manage"
  | "teams.manage"
  | "invoices.manage"
  | "dashboard.view"
  | "reports.view"
  | "users.manage"
  | "admin";

export const PERMISSION_GROUPS: {
  group: string;
  items: { key: PermissionKey; label: string }[];
}[] = [
  {
    group: "Task-uri / Tichete / Work Orders",
    items: [
      { key: "tasks.view", label: "Vizualizare" },
      { key: "tasks.create", label: "Creare" },
      { key: "tasks.edit", label: "Editare" },
      { key: "tasks.delete", label: "Ștergere" },
      { key: "tasks.assign", label: "Asignare" },
      { key: "tasks.close", label: "Închidere / finalizare" },
    ],
  },
  {
    group: "Proiecte & Echipe",
    items: [
      { key: "projects.manage", label: "Gestionare proiecte" },
      { key: "teams.manage", label: "Gestionare echipe" },
      { key: "invoices.manage", label: "Gestionare facturi" },
    ],
  },
  {
    group: "Rapoarte & Administrare",
    items: [
      { key: "dashboard.view", label: "Vizualizare dashboard" },
      { key: "reports.view", label: "Vizualizare rapoarte" },
      { key: "users.manage", label: "Gestionare utilizatori" },
      { key: "admin", label: "Acces administrativ (tot)" },
    ],
  },
];

export const ALL_PERMISSION_KEYS: PermissionKey[] = PERMISSION_GROUPS.flatMap(
  (g) => g.items.map((i) => i.key),
);

export type PermissionSubject = {
  role: "ADMIN" | "STAFF";
  permissions: string[];
};

/** Are userul permisiunea cerută? ADMIN sau "admin" => mereu true. */
export function can(user: PermissionSubject, key: PermissionKey): boolean {
  if (user.role === "ADMIN") return true;
  if (user.permissions.includes("admin")) return true;
  return user.permissions.includes(key);
}

export function canAny(user: PermissionSubject, keys: PermissionKey[]): boolean {
  return keys.some((k) => can(user, k));
}
