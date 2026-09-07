import deCommon from "./locales/de/common.json";
import trCommon from "./locales/tr/common.json";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import faCommon from "./locales/fa/common.json";
import enCommon from "./locales/en/common.json";
import arCommon from "./locales/ar/common.json";

export const resources = {
  de: {common:deCommon},
  tr: {common:trCommon},
  fa: { common: faCommon },
  en: { common: enCommon },
  ar: { common: arCommon },
} as const;

export const supportedLocales = ["fa", "en", "ar", "de", "tr"] as const;
export type Locale = (typeof supportedLocales)[number];
export type LocaleDirection = "rtl" | "ltr";

export const localeConfig: Record<Locale, { dir: LocaleDirection; label: string }> = {
  de: { dir: "ltr", label: "Deutsch" },
  tr: { dir: "ltr", label: "Türkçe" },
  fa: { dir: "rtl", label: "فارسی" },
  en: { dir: "ltr", label: "English" },
  ar: { dir: "rtl", label: "العربية" },
};

const LOCALE_STORAGE_KEY = "locale";
const DEFAULT_LOCALE: Locale = "en";

export const isLocale = (value: string | null | undefined): value is Locale =>
  !!value && supportedLocales.includes(value as Locale);

export const getStoredLocale = (): Locale => {
  if (typeof window === "undefined") return DEFAULT_LOCALE;

  const storedLocale = localStorage.getItem(LOCALE_STORAGE_KEY);
  return isLocale(storedLocale) ? storedLocale : DEFAULT_LOCALE;
};

export const setDocumentLocale = (locale: Locale) => {
  const { dir } = localeConfig[locale];
  const root = document.documentElement;

  root.lang = locale;
  root.dir = dir;
  root.dataset.locale = locale;
  root.dataset.direction = dir;
};

export const setLocale = async (locale: Locale) => {
  await i18n.changeLanguage(locale);
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  setDocumentLocale(locale);
};

const initialLocale = getStoredLocale();

setDocumentLocale(initialLocale);

i18n.use(initReactI18next).init({
  resources,
  lng: initialLocale,
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: supportedLocales,
  defaultNS: "common",
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;