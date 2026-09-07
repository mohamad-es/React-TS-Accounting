import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { PrismaClient } from "@prisma/client";
import { generateKeyPair, exportJWK, SignJWT } from "jose";
test("API enforces signed project identity, roles, and customer ownership", async () => {
  const database = process.env.TEST_DATABASE_URL;
  if (!database)
    throw new Error(
      "Set TEST_DATABASE_URL to an isolated migrated test database",
    );
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const jwk = {
    ...(await exportJWK(publicKey)),
    kid: "test",
    alg: "RS256",
    use: "sig",
  };
  const keys = createServer((_, res) => {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ keys: [jwk] }));
  });
  keys.listen(0, "127.0.0.1");
  await once(keys, "listening");
  const keyPort = (keys.address() as any).port;
  const proc = spawn(
    process.execPath,
    ["--import", "./test/mollie-fixture.mjs", "dist/main.js"],
    {
      env: {
        ...process.env,
        DATABASE_URL: database,
        PORT: "3199",
        INVOICE_VALIDATOR_URL: "http://127.0.0.1:8087/invoice.xml",
        MOLLIE_API_KEY: "test_fixture",
        PUBLIC_API_URL: "http://127.0.0.1:3199",
        CUSTOMER_PORTAL_URL: "http://127.0.0.1:5174/finance",
        FONITAS_JWKS_URL: `http://127.0.0.1:${keyPort}`,
        FONITAS_TOKEN_ISSUER: "test",
        FONITAS_PROJECT_KEY: "accounting",
        FRONTEND_ORIGIN: "http://localhost:5173",
      },
      stdio: "pipe",
    },
  );
  let logs = "";
  proc.stdout.on("data", (x) => (logs += x));
  proc.stderr.on("data", (x) => (logs += x));
  const db = new PrismaClient({ datasourceUrl: database });
  const url = "http://127.0.0.1:3199/api/v1/";
  async function token(user: number, roles: string[], aud = "accounting") {
    return new SignJWT({
      user_id: user,
      type: "access",
      payload: { aud, roles },
    })
      .setProtectedHeader({ alg: "RS256", kid: "test" })
      .setIssuer("test")
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(privateKey);
  }
  async function call(path: string, bearer?: string, body?: unknown) {
    return fetch(url + path, {
      method: body ? "POST" : "GET",
      headers: {
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
        "Content-Type": "application/json",
        "Accept-Language": "de",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  }
  try {
    let ready = false;
    for (let i = 0; i < 50; i++) {
      try {
        if ((await fetch("http://127.0.0.1:3199/api/health/ready")).ok) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 100));
    }
    assert.ok(ready, logs);
    assert.equal((await call("projects")).status, 401);
    const wrong = await call(
      "projects",
      await token(1, ["admin"], "another-project"),
    );
    assert.equal(wrong.status, 401);
    assert.equal((await wrong.json()).message, "Bitte anmelden.");
    assert.equal((await call("projects", await token(2, []))).status, 403);
    const administrator = await token(1, ["admin"]);
    const project = await call("projects", administrator, {
      key: `test-${Date.now()}`,
      name: "Test project",
    });
    assert.equal(project.status, 201);
    const p = await project.json();
    const customer = await call("customers", administrator, {
      userId: Math.floor(Date.now() / 1000),
      legalName: "Test buyer",
      email: "buyer@example.test",
      address: {
        street: "Test 1",
        city: "Berlin",
        postalCode: "10115",
        country: "DE",
      },
    });
    assert.equal(customer.status, 201);
    const c = await customer.json();
    const seller = {
      legalName: "Test seller",
      vatId: "DE123456789",
      email: "seller@example.test",
      contactName: "Test Person",
      phone: "+4930123456",
      address: {
        street: "Test 2",
        city: "Berlin",
        postalCode: "10115",
        country: "DE",
      },
    };
    assert.equal(
      (await call("settings/seller", administrator, seller)).status,
      201,
    );
    assert.equal(
      (await call("settings/seller", await token(2, ["viewer"]), seller))
        .status,
      403,
    );
    const contributor = await (
      await call("contributors", administrator, {
        name: "Test developer",
        kind: "DEVELOPER",
      })
    ).json();
    const contract = await (
      await call("contracts", administrator, {
        number: `TEST-${Date.now()}`,
        version: 1,
        projectId: p.id,
        contributorId: contributor.id,
        basis: "NET_SALES_BEFORE_FEES",
        rate: "25",
        startsAt: "2026-01-01T00:00:00.000Z",
      })
    ).json();
    const draft = await call("invoices", administrator, {
      projectId: p.id,
      customerId: c.id,
      locale: "de",
      dueDate: "2099-12-31",
      supplyDate: new Date().toISOString().slice(0, 10),
      buyerReference: "TEST-BUYER",
      contractIds: [contract.id],
      lines: [
        {
          description: "License",
          quantity: "1",
          unitPrice: "100.00",
          vatRate: "19",
        },
      ],
    });
    assert.equal(draft.status, 201);
    const invoice = await draft.json();
    assert.equal(invoice.total, "119");
    const own = await call("customer/invoices", await token(c.userId, []));
    assert.deepEqual(await own.json(), []);
    assert.equal(
      (await call(`customer/invoices/${invoice.id}`, await token(99, [])))
        .status,
      404,
    );
    const original = await db.invoice.findUniqueOrThrow({
      where: { id: invoice.id },
    });
    await db.invoice.update({
      where: { id: invoice.id },
      data: { buyer: { ...(original.buyer as object), email: "" } },
    });
    assert.equal(
      (await call(`invoices/${invoice.id}/issue`, administrator, {})).status,
      400,
    );
    const rejected = await db.invoice.findUniqueOrThrow({
      where: { id: invoice.id },
    });
    assert.equal(rejected.status, "DRAFT");
    assert.equal(rejected.number, null);
    assert.equal(rejected.xml, null);
    assert.equal(
      await db.journal.count({ where: { reference: `invoice:${invoice.id}` } }),
      0,
    );
    await db.invoice.update({
      where: { id: invoice.id },
      data: { buyer: original.buyer! },
    });
    const issued = await call(
      `invoices/${invoice.id}/issue`,
      administrator,
      {},
    );
    assert.equal(issued.status, 201, await issued.clone().text());
    const issuedData = await issued.json();
    const again = await (
      await call(`invoices/${invoice.id}/issue`, administrator, {})
    ).json();
    assert.equal(again.number, issuedData.number);
    assert.equal(
      await db.journal.count({ where: { reference: `invoice:${invoice.id}` } }),
      1,
    );
    const visible = await call(
      `customer/invoices/${invoice.id}`,
      await token(c.userId, []),
    );
    assert.equal(visible.status, 200);
    assert.equal("contractSnapshot" in (await visible.json()), false);
    assert.equal(
      (await call(`customer/invoices/${invoice.id}`, await token(99, [])))
        .status,
      404,
    );
    const downloaded = await call(
      `customer/invoices/${invoice.id}/document?format=xml`,
      await token(c.userId, []),
    );
    assert.equal(downloaded.status, 200);
    assert.match(await downloaded.text(), /xrechnung_3.0/);
    assert.equal(
      (
        await call(
          `customer/invoices/${invoice.id}/document?format=xml`,
          await token(99, []),
        )
      ).status,
      404,
    );
    const checkout = await call(
      `customer/invoices/${invoice.id}/pay`,
      await token(c.userId, []),
      {},
    );
    assert.equal(checkout.status, 201);
    for (let i = 0; i < 2; i++) {
      const hook = await fetch("http://127.0.0.1:3199/api/webhooks/mollie", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "id=tr_fixture",
      });
      assert.equal(hook.status, 200);
    }
    assert.equal(
      (await db.invoice.findUniqueOrThrow({ where: { id: invoice.id } }))
        .status,
      "PAID",
    );
    const accrued = await db.accrual.findMany({
      where: { contractId: contract.id },
    });
    assert.equal(accrued.length, 1);
    assert.equal(accrued[0].amount.toFixed(2), "25.00");
    await db.accrual.deleteMany({ where: { contractId: contract.id } });
    await db.journal.deleteMany({
      where: {
        reference: {
          in: [
            `invoice:${invoice.id}`,
            ...(
              await db.payment.findMany({ where: { invoiceId: invoice.id } })
            ).map((p) => `payment:${p.id}`),
          ],
        },
      },
    });
    await db.payment.deleteMany({ where: { invoiceId: invoice.id } });
    await db.audit.deleteMany({ where: { entityId: invoice.id } });
    await db.invoice.delete({ where: { id: invoice.id } });
    await db.contract.delete({ where: { id: contract.id } });
    await db.contributor.delete({ where: { id: contributor.id } });
    await db.customer.delete({ where: { id: c.id } });
    await db.project.delete({ where: { id: p.id } });
  } finally {
    await db.$disconnect();
    proc.kill("SIGTERM");
    await once(proc, "exit");
    keys.close();
  }
});
