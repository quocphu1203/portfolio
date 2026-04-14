import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "ja", "vi"],
  defaultLocale: "vi",
  localePrefix: "always",
});
