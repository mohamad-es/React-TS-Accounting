import { z } from "zod";
import { Decimal } from "decimal.js";
import { lineSchema, totals } from "./domain.js";
export const postalAddress = z
  .object({
    street: z.string().min(1).max(200),
    city: z.string().min(1).max(100),
    postalCode: z.string().min(1).max(20),
    country: z.string().regex(/^[A-Z]{2}$/),
  })
  .strict();
export const sellerSchema = z
  .object({
    legalName: z.string().min(1).max(200),
    address: postalAddress,
    vatId: z.string().regex(/^DE\d{9}$/),
    email: z.email(),
    contactName: z.string().min(1),
    phone: z.string().min(3),
  })
  .strict();
export const escapeXml = (v: unknown) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
type Party = {
  legalName: string;
  address: z.infer<typeof postalAddress>;
  vatId?: string | null;
  email: string;
  contactName?: string;
  phone?: string;
};
export type DocumentInput = {
  number: string;
  issueDate: string;
  dueDate: string;
  supplyDate: string;
  buyerReference: string;
  locale: string;
  currency: string;
  seller: Party;
  buyer: Party;
  lines: z.infer<typeof lineSchema>[];
  references: string[];
};
function postal(p: Party) {
  return `<cac:PostalAddress><cbc:StreetName>${escapeXml(p.address.street)}</cbc:StreetName><cbc:CityName>${escapeXml(p.address.city)}</cbc:CityName><cbc:PostalZone>${escapeXml(p.address.postalCode)}</cbc:PostalZone><cac:Country><cbc:IdentificationCode>${p.address.country}</cbc:IdentificationCode></cac:Country></cac:PostalAddress>`;
}
function party(p: Party, seller = false) {
  return `<cac:Party><cbc:EndpointID schemeID="EM">${escapeXml(p.email)}</cbc:EndpointID>${postal(p)}${p.vatId ? `<cac:PartyTaxScheme><cbc:CompanyID>${escapeXml(p.vatId)}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>` : ""}<cac:PartyLegalEntity><cbc:RegistrationName>${escapeXml(p.legalName)}</cbc:RegistrationName></cac:PartyLegalEntity>${seller ? `<cac:Contact><cbc:Name>${escapeXml(p.contactName)}</cbc:Name><cbc:Telephone>${escapeXml(p.phone)}</cbc:Telephone><cbc:ElectronicMail>${escapeXml(p.email)}</cbc:ElectronicMail></cac:Contact>` : ""}</cac:Party>`;
}
function taxCategory(rate: string) {
  return `<cbc:ID>S</cbc:ID><cbc:Percent>${rate}</cbc:Percent><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>`;
}
export function xmlInvoice(d: DocumentInput) {
  const amounts = totals(d.lines);
  const groups = new Map<string, Decimal>();
  for (const line of d.lines) {
    const rate = new Decimal(line.vatRate).toString();
    groups.set(
      rate,
      (groups.get(rate) ?? new Decimal(0)).add(
        new Decimal(line.quantity).mul(line.unitPrice).toDecimalPlaces(2),
      ),
    );
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
<cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0</cbc:CustomizationID><cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID><cbc:ID>${escapeXml(d.number)}</cbc:ID><cbc:IssueDate>${d.issueDate}</cbc:IssueDate><cbc:DueDate>${d.dueDate}</cbc:DueDate><cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>${d.references.length ? `<cbc:Note>${escapeXml(d.references.join("; "))}</cbc:Note>` : ""}<cbc:DocumentCurrencyCode>${d.currency}</cbc:DocumentCurrencyCode><cbc:BuyerReference>${escapeXml(d.buyerReference)}</cbc:BuyerReference>
<cac:AccountingSupplierParty>${party(d.seller, true)}</cac:AccountingSupplierParty><cac:AccountingCustomerParty>${party(d.buyer)}</cac:AccountingCustomerParty><cac:Delivery><cbc:ActualDeliveryDate>${d.supplyDate}</cbc:ActualDeliveryDate></cac:Delivery><cac:PaymentMeans><cbc:PaymentMeansCode>1</cbc:PaymentMeansCode></cac:PaymentMeans><cac:PaymentTerms><cbc:Note>Payment via Fonitas customer portal (Mollie)</cbc:Note></cac:PaymentTerms>
<cac:TaxTotal><cbc:TaxAmount currencyID="${d.currency}">${amounts.tax}</cbc:TaxAmount>${[...groups].map(([rate, net]) => `<cac:TaxSubtotal><cbc:TaxableAmount currencyID="${d.currency}">${net.toFixed(2)}</cbc:TaxableAmount><cbc:TaxAmount currencyID="${d.currency}">${net.mul(rate).div(100).toFixed(2)}</cbc:TaxAmount><cac:TaxCategory>${taxCategory(rate)}</cac:TaxCategory></cac:TaxSubtotal>`).join("")}</cac:TaxTotal>
<cac:LegalMonetaryTotal><cbc:LineExtensionAmount currencyID="${d.currency}">${amounts.net}</cbc:LineExtensionAmount><cbc:TaxExclusiveAmount currencyID="${d.currency}">${amounts.net}</cbc:TaxExclusiveAmount><cbc:TaxInclusiveAmount currencyID="${d.currency}">${amounts.total}</cbc:TaxInclusiveAmount><cbc:PayableAmount currencyID="${d.currency}">${amounts.total}</cbc:PayableAmount></cac:LegalMonetaryTotal>
${d.lines.map((line, index) => `<cac:InvoiceLine><cbc:ID>${index + 1}</cbc:ID><cbc:InvoicedQuantity unitCode="C62">${line.quantity}</cbc:InvoicedQuantity><cbc:LineExtensionAmount currencyID="${d.currency}">${new Decimal(line.quantity).mul(line.unitPrice).toFixed(2)}</cbc:LineExtensionAmount><cac:Item><cbc:Name>${escapeXml(line.description)}</cbc:Name><cac:ClassifiedTaxCategory>${taxCategory(line.vatRate)}</cac:ClassifiedTaxCategory></cac:Item><cac:Price><cbc:PriceAmount currencyID="${d.currency}">${line.unitPrice}</cbc:PriceAmount></cac:Price></cac:InvoiceLine>`).join("")}</Invoice>`;
}
const words: Record<string, string[]> = {
  en: [
    "Invoice",
    "DRAFT — not an issued invoice",
    "Seller",
    "Customer",
    "Issue date",
    "Due date",
    "Supply date",
    "Description",
    "Quantity",
    "Unit price",
    "VAT",
    "Net",
    "Total",
    "Contract references",
  ],
  de: [
    "Rechnung",
    "ENTWURF — keine ausgestellte Rechnung",
    "Verkäufer",
    "Kunde",
    "Rechnungsdatum",
    "Fälligkeitsdatum",
    "Leistungsdatum",
    "Beschreibung",
    "Menge",
    "Einzelpreis",
    "USt.",
    "Netto",
    "Gesamt",
    "Vertragsreferenzen",
  ],
  fa: [
    "فاکتور",
    "پیش‌نویس — فاکتور صادر نشده",
    "فروشنده",
    "مشتری",
    "تاریخ صدور",
    "سررسید",
    "تاریخ ارائه",
    "شرح",
    "تعداد",
    "قیمت واحد",
    "مالیات",
    "خالص",
    "جمع",
    "شماره قراردادها",
  ],
  ar: [
    "فاتورة",
    "مسودة — ليست فاتورة صادرة",
    "البائع",
    "العميل",
    "تاريخ الإصدار",
    "تاريخ الاستحقاق",
    "تاريخ التوريد",
    "الوصف",
    "الكمية",
    "سعر الوحدة",
    "الضريبة",
    "الصافي",
    "الإجمالي",
    "مراجع العقود",
  ],
  tr: [
    "Fatura",
    "TASLAK — düzenlenmiş fatura değildir",
    "Satıcı",
    "Müşteri",
    "Düzenleme tarihi",
    "Vade tarihi",
    "Teslim tarihi",
    "Açıklama",
    "Miktar",
    "Birim fiyat",
    "KDV",
    "Net",
    "Toplam",
    "Sözleşme referansları",
  ],
};
export function htmlInvoice(d: DocumentInput, draft = false) {
  const w = words[d.locale] ?? words.en;
  const a = totals(d.lines);
  const format = (v: string) =>
    new Intl.NumberFormat(d.locale, {
      style: "currency",
      currency: d.currency,
    }).format(Number(v));
  const displayDate = (value: string) =>
    new Intl.DateTimeFormat(d.locale, {
      dateStyle: "medium",
      timeZone: "UTC",
    }).format(new Date(value + "T00:00:00Z"));
  const addressText = (p: Party) =>
    `${escapeXml(p.legalName)}<br>${escapeXml(p.address.street)}<br>${escapeXml(p.address.postalCode)} ${escapeXml(p.address.city)}<br>${escapeXml(p.address.country)}<br>${escapeXml(p.vatId)}<br>${escapeXml(p.email)}`;
  return `<!doctype html><html lang="${d.locale}" dir="${["fa", "ar"].includes(d.locale) ? "rtl" : "ltr"}"><head><meta charset="utf-8"><title>${escapeXml(d.number)}</title><style>body{font:14px Arial,sans-serif;color:#182a42;max-width:900px;margin:40px auto;padding:24px}h1{color:#173f70}.parties{display:flex;gap:60px;margin:32px 0}.parties>div{flex:1}table{width:100%;border-collapse:collapse}td,th{padding:12px 8px;text-align:start;border-bottom:1px solid #ddd}th{background:#eef3f8}.totals{text-align:end;line-height:2}.draft{background:#fff0ca;padding:14px}footer{margin-top:35px;font-size:12px}@media print{body{margin:0;max-width:none}tr{break-inside:avoid}thead{display:table-header-group}@page{size:A4;margin:16mm}}</style></head><body>${draft ? `<p class="draft">${w[1]}</p>` : ""}<h1>Fonitas · ${w[0]}</h1><h2>${escapeXml(d.number)}</h2><p>${w[4]}: ${displayDate(d.issueDate)} · ${w[5]}: ${displayDate(d.dueDate)} · ${w[6]}: ${displayDate(d.supplyDate)}</p><div class="parties"><div><h3>${w[2]}</h3>${addressText(d.seller)}</div><div><h3>${w[3]}</h3>${addressText(d.buyer)}</div></div><table><thead><tr>${[w[7], w[8], w[9], w[10], w[11]].map((v) => `<th>${v}</th>`).join("")}</tr></thead><tbody>${d.lines.map((l) => `<tr><td>${escapeXml(l.description)}</td><td>${l.quantity}</td><td>${format(l.unitPrice)}</td><td>${l.vatRate}%</td><td>${format(new Decimal(l.quantity).mul(l.unitPrice).toFixed(2))}</td></tr>`).join("")}</tbody></table><p class="totals">${w[11]}: ${format(a.net)}<br>${w[10]}: ${format(a.tax)}<br><strong>${w[12]}: ${format(a.total)}</strong></p><footer>${w[13]}: ${d.references.map(escapeXml).join("; ")}</footer></body></html>`;
}
