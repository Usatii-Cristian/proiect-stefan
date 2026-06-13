import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import AuthForm from "@/app/components/AuthForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // Dacă aplicația nu e încă configurată (fără DB/secret), arătăm ecranul de setup.
  if (!env.isConfigured) {
    return <SetupNotice />;
  }

  const hasUser = (await prisma.user.count().catch(() => 1)) > 0;
  const mode = hasUser ? "login" : "register";

  return (
    <main className="flex min-h-dvh items-center justify-center p-5">
      <div className="card w-full max-w-sm p-7 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-brand text-white">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
              <path d="M3 9h18M8 2.5v4M16 2.5v4" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold leading-5">Programări</h1>
            <p className="text-xs text-ink-soft">
              {mode === "login" ? "Autentificare" : "Configurare inițială"}
            </p>
          </div>
        </div>

        {mode === "register" && (
          <p className="mb-4 rounded-xl bg-brand-soft px-3 py-2 text-xs text-brand-strong">
            Nu există încă niciun cont. Creează contul de administrator pentru a
            începe.
          </p>
        )}

        <Suspense>
          <AuthForm mode={mode} />
        </Suspense>

        <p className="mt-5 text-center text-xs text-ink-soft">
          Sesiune sigură, păstrată pe acest dispozitiv timp îndelungat.
        </p>
      </div>
    </main>
  );
}

function SetupNotice() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-5">
      <div className="card w-full max-w-md p-7 text-center shadow-sm">
        <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-brand text-white">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
          </svg>
        </div>
        <h1 className="text-lg font-bold">Aplicația este în curs de configurare</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Conexiunea la baza de date nu este încă setată. Adaugă variabilele{" "}
          <code className="rounded bg-[var(--color-surface-2)] px-1">DATABASE_URL</code> și{" "}
          <code className="rounded bg-[var(--color-surface-2)] px-1">SESSION_SECRET</code>{" "}
          în setările de mediu, apoi redeploy.
        </p>
        <p className="mt-4 text-xs text-ink-soft">
          După configurare, această pagină devine automat ecranul de autentificare.
        </p>
      </div>
    </main>
  );
}
