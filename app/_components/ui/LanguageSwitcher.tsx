"use client";

import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export function LanguageSwitcher() {
  const t = useTranslations("language");
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <div className="fixed left-3 top-3 z-30 flex items-center gap-1 rounded-full border border-white/10 bg-black/30 p-1.5 backdrop-blur-md md:left-6 md:top-6">
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white/85" title={t("switcherLabel")}>
        <Languages size={14} />
      </span>
      {routing.locales.map((item) => (
        <Link
          key={item}
          href={pathname}
          locale={item}
          className={[
            "rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors",
            locale === item ? "bg-white/20 text-white" : "text-white/55 hover:text-white/80",
          ].join(" ")}
          aria-label={`${t("switcherLabel")}: ${t(item)}`}
        >
          {item}
        </Link>
      ))}
    </div>
  );
}
