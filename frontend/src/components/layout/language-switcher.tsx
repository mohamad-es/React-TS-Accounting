import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";

import { localeConfig, isLocale, setLocale, type Locale } from "@/i18n";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const language = i18n.language.split("-")[0];
  const currentLocale: Locale = isLocale(language) ? language : "fa";

  const handleChangeLocale = async (locale: Locale) => {
    if (locale === currentLocale) return;
    await setLocale(locale);
  };

  return (
    <Select value={currentLocale} onValueChange={(value) => handleChangeLocale(value as Locale)}>
      <SelectTrigger size="sm" className="w-35 gap-2 bg-background" aria-label={t("language.select")}>
        <Languages className="size-4" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="end">
        {Object.entries(localeConfig).map(([locale, config]) => (
          <SelectItem key={locale} value={locale}>
            {config.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
