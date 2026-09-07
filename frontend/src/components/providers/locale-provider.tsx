import { useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { setDocumentLocale, isLocale } from "@/i18n";

interface LocaleProviderProps {
  children: ReactNode;
}

export function LocaleProvider({ children }: LocaleProviderProps) {
  const { i18n } = useTranslation();

  useEffect(() => {
    const locale = i18n.language.split("-")[0];

    if (isLocale(locale)) {
      setDocumentLocale(locale);
    }
  }, [i18n.language]);

  return children;
}
