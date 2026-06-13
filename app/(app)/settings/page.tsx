import Link from "next/link";
import { requireUser } from "@/lib/dal";
import { getSettings } from "@/lib/queries/settings";
import { listCategories } from "@/lib/queries/categories";
import SettingsForm from "@/app/components/SettingsForm";
import CategoriesManager from "@/app/components/CategoriesManager";
import PushToggle from "@/app/components/PushToggle";
import { IconChevronRight } from "@/app/components/icons";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  const [settings, categories] = await Promise.all([
    getSettings(user.id),
    listCategories(user.id),
  ]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <SettingsForm settings={settings} />
      <CategoriesManager categories={categories} />
      <PushToggle />

      <Link
        href="/telegram"
        className="card tap flex items-center justify-between p-5 hover:border-brand"
      >
        <div>
          <h2 className="text-base font-bold">Telegram Bot</h2>
          <p className="text-sm text-ink-soft">Conectează botul și gestionează din chat.</p>
        </div>
        <IconChevronRight className="size-5 text-brand" />
      </Link>
    </div>
  );
}
