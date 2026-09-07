import { test } from "node:test";
import assert from "node:assert/strict";
import {
  totals,
  lineSchema,
  selectLocale,
  balanced,
  share,
  messages,
  locales,
} from "../src/domain.js";
import { claims } from "../src/auth.js";
test("money remains exact and rounds VAT per line", () => {
  assert.deepEqual(
    totals([
      {
        description: "License",
        quantity: "3",
        unitPrice: "0.10",
        vatRate: "19",
      },
    ]),
    { net: "0.30", tax: "0.06", total: "0.36" },
  );
});
test("rejects negative money and zero quantity", () => {
  assert.equal(
    lineSchema.safeParse({
      description: "x",
      quantity: "0",
      unitPrice: "1",
      vatRate: "19",
    }).success,
    false,
  );
  assert.equal(
    lineSchema.safeParse({
      description: "x",
      quantity: "1",
      unitPrice: "-1",
      vatRate: "19",
    }).success,
    false,
  );
});
test("locale honors language preference and fallback", () => {
  assert.equal(selectLocale("de-DE,de;q=0.9,en;q=0.8"), "de");
  assert.equal(selectLocale("fa;q=0,en;q=1"), "en");
  assert.equal(selectLocale("xx"), "en");
});
test("all error languages have identical code coverage", () => {
  for (const locale of locales)
    assert.deepEqual(Object.keys(messages[locale]), Object.keys(messages.en));
});
test("journal balancing and percentage calculation", () => {
  assert.equal(
    balanced([
      { account: "a", debit: "119", credit: "0" },
      { account: "b", debit: "0", credit: "119" },
    ]),
    true,
  );
  assert.equal(
    balanced([
      { account: "a", debit: "119", credit: "0" },
      { account: "b", debit: "0", credit: "118" },
    ]),
    false,
  );
  assert.equal(share("100.00", "12.5"), "12.50");
});
test("Fonitas claims require expiry and nested role array", () => {
  assert.equal(
    claims.safeParse({
      user_id: 1,
      type: "access",
      payload: { aud: "accounting", roles: [] },
    }).success,
    false,
  );
  assert.equal(
    claims.safeParse({
      user_id: 1,
      type: "access",
      exp: 123,
      payload: { aud: "accounting", roles: "admin" },
    }).success,
    false,
  );
});

test("VAT rounds the grouped taxable basis, not each invoice line", () => {
  assert.deepEqual(
    totals([
      { description: "a", quantity: "1", unitPrice: "0.03", vatRate: "19" },
      { description: "b", quantity: "1", unitPrice: "0.03", vatRate: "19" },
    ]),
    { net: "0.06", tax: "0.01", total: "0.07" },
  );
});
