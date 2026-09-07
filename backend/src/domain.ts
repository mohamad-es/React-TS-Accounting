import { Decimal } from "decimal.js";
import { z } from "zod";
export const locales = ["en", "de", "fa", "ar", "tr"] as const;
export const money = z.string().regex(/^\d{1,12}(\.\d{1,2})?$/);
export const lineSchema = z
  .object({
    description: z.string().min(1).max(500),
    quantity: z
      .string()
      .regex(/^\d{1,8}(\.\d{1,4})?$/)
      .refine((v) => new Decimal(v).gt(0)),
    unitPrice: money,
    vatRate: z.string().regex(/^\d{1,2}(\.\d{1,4})?$/),
  })
  .strict();
export function totals(lines: z.infer<typeof lineSchema>[]) {
  let net = new Decimal(0);
  const groups = new Map<string, Decimal>();
  for (const line of lines) {
    const amount = new Decimal(line.quantity)
      .mul(line.unitPrice)
      .toDecimalPlaces(2);
    net = net.add(amount);
    const rate = new Decimal(line.vatRate).toString();
    groups.set(rate, (groups.get(rate) ?? new Decimal(0)).add(amount));
  }
  const tax = [...groups].reduce(
    (sum, [rate, amount]) =>
      sum.add(amount.mul(rate).div(100).toDecimalPlaces(2)),
    new Decimal(0),
  );
  return {
    net: net.toFixed(2),
    tax: tax.toFixed(2),
    total: net.add(tax).toFixed(2),
  };
}

export function balanced(
  entries: { account: string; debit: string; credit: string }[],
) {
  return (
    entries.length >= 2 &&
    entries.every(
      (e) => new Decimal(e.debit).gte(0) && new Decimal(e.credit).gte(0),
    ) &&
    entries.reduce((v, e) => v.add(e.debit).sub(e.credit), new Decimal(0)).eq(0)
  );
}
export function share(net: string, rate: string) {
  return new Decimal(net).mul(rate).div(100).toDecimalPlaces(2).toFixed(2);
}
export function selectLocale(header: string = "en") {
  for (const item of header
    .split(",")
    .map((x) => {
      const [tag, ...params] = x.trim().split(";");
      return {
        tag: tag.toLowerCase().split("-")[0],
        q: Number(
          params
            .find((p) => p.trim().startsWith("q="))
            ?.trim()
            .slice(2) ?? 1,
        ),
      };
    })
    .filter((x) => x.q > 0 && x.q <= 1)
    .sort((a, b) => b.q - a.q)) {
    if (locales.includes(item.tag as any)) return item.tag;
  }
  return "en";
}
export const messages: Record<string, Record<string, string>> = {
  en: {
    UNAUTHORIZED: "Please sign in.",
    FORBIDDEN: "Access denied.",
    INVALID: "Check the submitted fields.",
    NOT_FOUND: "Record not found.",
    CONFLICT: "This operation conflicts with the current state.",
    UNAVAILABLE: "Service temporarily unavailable.",
    INTERNAL: "An unexpected error occurred.",
  },
  de: {
    UNAUTHORIZED: "Bitte anmelden.",
    FORBIDDEN: "Zugriff verweigert.",
    INVALID: "Bitte Eingaben prüfen.",
    NOT_FOUND: "Eintrag nicht gefunden.",
    CONFLICT: "Der aktuelle Status erlaubt diesen Vorgang nicht.",
    UNAVAILABLE: "Dienst vorübergehend nicht verfügbar.",
    INTERNAL: "Ein unerwarteter Fehler ist aufgetreten.",
  },
  fa: {
    UNAUTHORIZED: "لطفاً وارد شوید.",
    FORBIDDEN: "دسترسی مجاز نیست.",
    INVALID: "اطلاعات وارد شده را بررسی کنید.",
    NOT_FOUND: "رکورد یافت نشد.",
    CONFLICT: "این عملیات با وضعیت فعلی سازگار نیست.",
    UNAVAILABLE: "سرویس موقتاً در دسترس نیست.",
    INTERNAL: "خطای غیرمنتظره رخ داد.",
  },
  ar: {
    UNAUTHORIZED: "يرجى تسجيل الدخول.",
    FORBIDDEN: "الوصول مرفوض.",
    INVALID: "يرجى التحقق من البيانات.",
    NOT_FOUND: "السجل غير موجود.",
    CONFLICT: "العملية غير متوافقة مع الحالة الحالية.",
    UNAVAILABLE: "الخدمة غير متاحة مؤقتاً.",
    INTERNAL: "حدث خطأ غير متوقع.",
  },
  tr: {
    UNAUTHORIZED: "Lütfen giriş yapın.",
    FORBIDDEN: "Erişim reddedildi.",
    INVALID: "Gönderilen alanları kontrol edin.",
    NOT_FOUND: "Kayıt bulunamadı.",
    CONFLICT: "İşlem mevcut durumla çelişiyor.",
    UNAVAILABLE: "Hizmet geçici olarak kullanılamıyor.",
    INTERNAL: "Beklenmeyen bir hata oluştu.",
  },
};

const additional: Record<string, string[]> = {
  en: [
    "Save Fonitas legal seller details first.",
    "Only domestic German sales with 7% or 19% VAT are supported.",
    "The invoice did not pass XRechnung validation. Check its required fields.",
  ],
  de: [
    "Bitte zuerst die rechtlichen Verkäuferdaten speichern.",
    "Nur deutsche Inlandsumsätze mit 7 % oder 19 % USt. werden unterstützt.",
    "Die Rechnung hat die XRechnung-Validierung nicht bestanden. Bitte Pflichtangaben prüfen.",
  ],
  fa: [
    "ابتدا اطلاعات قانونی فروشنده را ذخیره کنید.",
    "فقط فروش داخلی آلمان با مالیات ۷ یا ۱۹ درصد پشتیبانی می‌شود.",
    "اعتبارسنجی فاکتور ناموفق بود. اطلاعات الزامی را بررسی کنید.",
  ],
  ar: [
    "احفظ بيانات البائع القانونية أولاً.",
    "تدعم فقط المبيعات المحلية الألمانية بضريبة 7% أو 19%.",
    "لم تجتز الفاتورة التحقق. راجع الحقول المطلوبة.",
  ],
  tr: [
    "Önce yasal satıcı bilgilerini kaydedin.",
    "Yalnızca %7 veya %19 KDV ile Almanya içi satışlar desteklenir.",
    "Fatura doğrulamayı geçemedi. Zorunlu alanları kontrol edin.",
  ],
};
for (const locale of locales)
  ["SELLER_REQUIRED", "TAX_SCOPE", "INVOICE_INVALID"].forEach(
    (key, i) => (messages[locale][key] = additional[locale][i]),
  );
