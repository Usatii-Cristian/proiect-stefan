import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { getSessionToken, hashToken } from "./session";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "STAFF";
};

const ONE_DAY = 24 * 60 * 60 * 1000;

/**
 * getCurrentUser optimizat:
 *  - memoizat cu React `cache()` ⇒ un singur query per render, oricâte componente îl cer
 *  - un singur query cu `select` minimal (fără include greu)
 *  - actualizare `lastUsedAt` throttle-uită (max o dată/zi) ⇒ fără write la fiecare request
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = await getSessionToken();
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      id: true,
      expiresAt: true,
      lastUsedAt: true,
      user: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
  });

  if (!session) return null;

  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  if (Date.now() - session.lastUsedAt.getTime() > ONE_DAY) {
    await prisma.session
      .update({ where: { id: session.id }, data: { lastUsedAt: new Date() } })
      .catch(() => {});
  }

  return session.user as CurrentUser;
});

/** Pentru pagini/acțiuni: întoarce userul sau redirect la /login. */
export const requireUser = cache(async (): Promise<CurrentUser> => {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
});
