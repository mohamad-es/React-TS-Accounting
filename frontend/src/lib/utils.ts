import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type SupportedNumberLocale = "fa-IR" | "en-US" | "ar-SA";

export function formatNumberFa(value: number): string {
  return new Intl.NumberFormat("fa-IR").format(value);
}

export function formatNumber(value: number, locale: SupportedNumberLocale | string): string {
  return new Intl.NumberFormat(locale).format(value);
}

export function formatCurrency(
  value: number,
  locale: SupportedNumberLocale | string,
  currency = "USD",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(value);
}

export function formatPercent(
  value: number,
  locale: SupportedNumberLocale | string,
  fractionDigits = 1,
): string {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value / 100);
}

export function createFormData(data: Record<string, any>, form?: FormData, parentKey?: string): FormData {
  const formData = form || new FormData();

  Object.entries(data).forEach(([key, value]) => {
    const fullKey = parentKey ? `${parentKey}.${key}` : key;

    if (value instanceof Date) {
      formData.append(fullKey, value.toISOString());
    } else if (value instanceof File || value instanceof Blob) {
      formData.append(fullKey, value);
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => {
        const arrayKey = `${fullKey}[${index}]`;

        if (typeof item === "object" && item !== null) {
          createFormData(item, formData, arrayKey);
        } else {
          formData.append(arrayKey, item);
        }
      });
    } else if (value !== null && typeof value === "object") {
      createFormData(value, formData, fullKey);
    } else if (value !== undefined && value !== null) {
      formData.append(fullKey, String(value));
    }
  });

  return formData;
}

export function uid() {
  if ("randomUUID" in crypto) return (crypto as any).randomUUID();
  return Math.random().toString(36).slice(2);
}

export function toJalaliString(date: Date | string): string {
  const d: Date = typeof date === "string" ? new Date(date) : date;

  if (Number.isNaN(d.getTime())) return "";

  const gYear = d.getFullYear();
  const gMonth = d.getMonth() + 1;
  const gDay = d.getDate();

  const g_d_m: number[] = [
    0,
    31,
    (gYear % 4 === 0 && gYear % 100 !== 0) || gYear % 400 === 0 ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  const gy = gYear - 1600;
  const gm = gMonth - 1;
  const gd = gDay - 1;

  let g_day_no = 365 * gy + Math.floor((gy + 3) / 4) - Math.floor((gy + 99) / 100) + Math.floor((gy + 399) / 400);

  // اصلاح اصلی اینجاست
  for (let i = 1; i <= gm; ++i) {
    g_day_no += g_d_m[i] ?? 0;
  }

  g_day_no += gd;

  let j_day_no = g_day_no - 79;

  const j_np = Math.floor(j_day_no / 12053);
  j_day_no %= 12053;

  let jy = 979 + 33 * j_np + 4 * Math.floor(j_day_no / 1461);
  j_day_no %= 1461;

  if (j_day_no >= 366) {
    jy += Math.floor((j_day_no - 1) / 365);
    j_day_no = (j_day_no - 1) % 365;
  }

  const j_dm: number[] = [0, 31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];

  let jm = 0;

  for (let i = 1; i <= 12; i++) {
    if (j_day_no < (j_dm[i] ?? 0)) {
      jm = i;
      break;
    }

    j_day_no -= j_dm[i] ?? 0;
  }

  const jd = j_day_no + 1;

  const faDigits = (value: string): string => value.replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)] ?? digit);

  const jalaliDate = `${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`;

  return faDigits(jalaliDate);
}
