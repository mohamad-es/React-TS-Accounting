import { createHash } from "node:crypto";
import type { Response } from "express";
import { Decimal } from "decimal.js";
import {
  sellerSchema,
  xmlInvoice,
  htmlInvoice,
  type DocumentInput,
} from "./invoice.js";
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  UseGuards,
  Inject,
  HttpCode,
  Res,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { z } from "zod";
import { Database } from "./database.js";
import { AuthGuard, Actor, staff, admin } from "./auth.js";
import { lineSchema, locales, money, totals, share } from "./domain.js";
const id = z.string().uuid();
const address = z
  .object({
    street: z.string().min(1),
    city: z.string().min(1),
    postalCode: z.string().min(1),
    country: z.string().regex(/^[A-Z]{2}$/),
  })
  .strict();
const customerInvoiceSelect = {
  id: true,
  number: true,
  projectId: true,
  currency: true,
  locale: true,
  status: true,
  lines: true,
  seller: true,
  buyer: true,
  net: true,
  tax: true,
  total: true,
  createdAt: true,
  issuedAt: true,
  dueDate: true,
  supplyDate: true,
  buyerReference: true,
} as const;
type Request = { actor: Actor };
@ApiBearerAuth()
@Controller("v1")
@UseGuards(AuthGuard)
export class ApiController {
  constructor(@Inject(Database) private db: Database) {}
  @Get("settings") async settings(@Req() req: Request) {
    staff(req.actor);
    return {
      seller:
        (await this.db.sellerSettings.findUnique({ where: { id: "fonitas" } }))
          ?.details ?? null,
      validatorConfigured: !!process.env.INVOICE_VALIDATOR_URL,
      mollieConfigured: !!process.env.MOLLIE_API_KEY?.startsWith("test_"),
    };
  }
  @Post("settings/seller") async seller(
    @Req() req: Request,
    @Body() body: unknown,
  ) {
    admin(req.actor);
    const details = sellerSchema.parse(body);
    return this.db.$transaction(async (tx) => {
      const result = await tx.sellerSettings.upsert({
        where: { id: "fonitas" },
        create: { id: "fonitas", details },
        update: { details },
      });
      await tx.audit.create({
        data: {
          userId: req.actor.userId,
          action: "seller.update",
          entityId: "fonitas",
        },
      });
      return result;
    });
  }
  @Get("me") me(@Req() req: Request) {
    return req.actor;
  }
  @Get("projects") projects(@Req() req: Request) {
    staff(req.actor);
    return this.db.project.findMany({
      take: 100,
      orderBy: { createdAt: "desc" },
    });
  }
  @Post("projects") async project(@Req() req: Request, @Body() body: unknown) {
    admin(req.actor);
    return this.db.project.create({
      data: z
        .object({
          key: z.string().regex(/^[a-z0-9-]+$/),
          name: z.string().min(1),
        })
        .strict()
        .parse(body),
    });
  }
  @Get("customers") customers(@Req() req: Request) {
    staff(req.actor);
    return this.db.customer.findMany({ take: 100 });
  }
  @Post("customers") customer(@Req() req: Request, @Body() body: unknown) {
    staff(req.actor, true);
    return this.db.customer.create({
      data: z
        .object({
          userId: z.number().int().positive(),
          legalName: z.string().min(1),
          email: z.email(),
          address,
          vatId: z.string().optional(),
          locale: z.enum(locales).default("en"),
        })
        .strict()
        .parse(body),
    });
  }
  @Post("contributors") contributor(
    @Req() req: Request,
    @Body() body: unknown,
  ) {
    admin(req.actor);
    return this.db.contributor.create({
      data: z
        .object({
          name: z.string().min(1),
          kind: z.enum([
            "DEVELOPER",
            "AFFILIATE",
            "MARKETING",
            "PROMOTER",
            "MEDIA",
            "EMPLOYEE",
            "CONTRACTOR",
            "INVESTOR",
          ]),
        })
        .strict()
        .parse(body),
    });
  }
  @Get("contributors") contributors(@Req() req: Request) {
    staff(req.actor);
    return this.db.contributor.findMany({ take: 100 });
  }
  @Post("contracts") contract(@Req() req: Request, @Body() body: unknown) {
    admin(req.actor);
    const data = z
      .object({
        number: z.string().min(1),
        version: z.number().int().positive(),
        projectId: id,
        contributorId: id,
        basis: z.literal("NET_SALES_BEFORE_FEES"),
        rate: z
          .string()
          .regex(/^(100|\d{1,2})(\.\d{1,6})?$/)
          .refine((x) => Number(x) <= 100),
        startsAt: z.iso.datetime(),
        endsAt: z.iso.datetime().optional(),
      })
      .strict()
      .parse(body);
    if (data.endsAt && data.endsAt <= data.startsAt)
      throw new ConflictException();
    return this.db.contract.create({ data });
  }
  @Get("contracts") contracts(@Req() req: Request) {
    staff(req.actor);
    return this.db.contract.findMany({
      take: 100,
      include: { contributor: true },
    });
  }
  @Post("expenses") expense(@Req() req: Request, @Body() body: unknown) {
    staff(req.actor, true);
    return this.db.expense.create({
      data: z
        .object({
          projectId: id,
          description: z.string().min(1),
          amount: money,
          currency: z.literal("EUR"),
          classification: z.enum(["FIXED", "VARIABLE"]),
          recurrence: z.enum(["ONCE", "MONTHLY", "YEARLY"]),
        })
        .strict()
        .parse(body),
    });
  }
  @Get("accruals") accruals(@Req() req: Request) {
    staff(req.actor);
    return this.db.accrual.findMany({
      take: 100,
      orderBy: { createdAt: "desc" },
    });
  }
  @Post("accruals/:id/approve") async approve(
    @Req() req: Request,
    @Param("id") accrualId: string,
  ) {
    admin(req.actor);
    return this.db.$transaction(async (tx) => {
      const result = await tx.accrual.updateMany({
        where: { id: id.parse(accrualId), status: "PENDING" },
        data: { status: "APPROVED" },
      });
      if (result.count !== 1) throw new ConflictException();
      await tx.audit.create({
        data: {
          userId: req.actor.userId,
          action: "accrual.approve",
          entityId: accrualId,
        },
      });
      return { approved: true };
    });
  }
  @Get("expenses") expenses(@Req() req: Request) {
    staff(req.actor);
    return this.db.expense.findMany({
      take: 100,
      orderBy: { createdAt: "desc" },
    });
  }
  @Post("invoices") async draft(@Req() req: Request, @Body() body: unknown) {
    staff(req.actor, true);
    const input = z
      .object({
        projectId: id,
        customerId: id,
        locale: z.enum(locales),
        lines: z.array(lineSchema).min(1).max(200),
        dueDate: z.iso.date(),
        supplyDate: z.iso.date(),
        buyerReference: z.string().min(1).max(200),
        contractIds: z.array(id).max(50).default([]),
      })
      .strict()
      .parse(body);
    const settings = await this.db.sellerSettings.findUnique({
      where: { id: "fonitas" },
    });
    if (!settings) throw new ConflictException({ code: "SELLER_REQUIRED" });
    const seller = sellerSchema.parse(settings.details);
    const customer = await this.db.customer.findUnique({
      where: { id: input.customerId },
    });
    if (!customer) throw new NotFoundException();
    if (
      seller.address.country !== "DE" ||
      (customer.address as { country: string }).country !== "DE" ||
      input.lines.some(
        (line) => !["7", "19"].includes(new Decimal(line.vatRate).toString()),
      )
    )
      throw new BadRequestException({ code: "TAX_SCOPE" });
    if (new Decimal(totals(input.lines).total).lte(0))
      throw new BadRequestException();
    const contracts = await this.db.contract.findMany({
      where: {
        id: { in: input.contractIds },
        projectId: input.projectId,
        startsAt: { lte: new Date() },
        OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
      },
      include: { contributor: true },
    });
    if (new Set(contracts.map((c) => c.number)).size !== contracts.length)
      throw new ConflictException();
    if (contracts.length !== new Set(input.contractIds).size)
      throw new ConflictException();
    if (
      contracts
        .reduce((sum, c) => sum.add(c.rate.toString()), new Decimal(0))
        .gt(100)
    )
      throw new ConflictException();
    return this.db.invoice.create({
      data: {
        projectId: input.projectId,
        customerId: input.customerId,
        locale: input.locale,
        lines: input.lines,
        seller,
        dueDate: input.dueDate,
        supplyDate: input.supplyDate,
        buyerReference: input.buyerReference,
        buyer: {
          legalName: customer.legalName,
          email: customer.email,
          address: customer.address,
          vatId: customer.vatId,
        },
        contractSnapshot: JSON.parse(JSON.stringify(contracts)),
        ...totals(input.lines),
      },
    });
  }
  @Get("invoices") invoices(@Req() req: Request) {
    staff(req.actor);
    return this.db.invoice.findMany({
      take: 100,
      orderBy: { createdAt: "desc" },
    });
  }
  @Get("customer/invoices") ownInvoices(@Req() req: Request) {
    return this.db.invoice.findMany({
      where: {
        customer: { userId: req.actor.userId },
        status: { not: "DRAFT" },
      },
      select: customerInvoiceSelect,
      take: 100,
      orderBy: { createdAt: "desc" },
    });
  }
  @Get("customer/payments") ownPayments(@Req() req: Request) {
    return this.db.payment.findMany({
      where: { invoice: { customer: { userId: req.actor.userId } } },
      take: 100,
      orderBy: { createdAt: "desc" },
    });
  }
  @Get("customer/invoices/:id") async ownInvoice(
    @Req() req: Request,
    @Param("id") invoiceId: string,
  ) {
    const invoice = await this.db.invoice.findFirst({
      where: {
        id: id.parse(invoiceId),
        customer: { userId: req.actor.userId },
        status: { not: "DRAFT" },
      },
      select: customerInvoiceSelect,
    });
    if (!invoice) throw new NotFoundException();
    return invoice;
  }
  @Get("invoices/:id/document") async document(
    @Req() req: Request,
    @Param("id") invoiceId: string,
    @Res() res: Response,
  ) {
    staff(req.actor);
    return this.sendDocument(invoiceId, res);
  }
  @Get("customer/invoices/:id/document") async customerDocument(
    @Req() req: Request,
    @Param("id") invoiceId: string,
    @Res() res: Response,
  ) {
    const invoice = await this.db.invoice.findFirst({
      where: {
        id: id.parse(invoiceId),
        customer: { userId: req.actor.userId },
        status: { in: ["ISSUED", "PAID"] },
      },
    });
    if (!invoice) throw new NotFoundException();
    return this.sendDocument(invoiceId, res);
  }
  private async sendDocument(invoiceId: string, res: Response) {
    const invoice = await this.db.invoice.findUnique({
      where: { id: id.parse(invoiceId) },
    });
    if (!invoice) throw new NotFoundException();
    const format = res.req.query.format ?? "html";
    if (!["html", "xml"].includes(String(format)))
      throw new BadRequestException();
    if (format === "xml" && !invoice.xml) throw new ConflictException();
    const content =
      format === "xml"
        ? invoice.xml!
        : (invoice.html ??
          htmlInvoice(
            this.documentData(
              invoice,
              "DRAFT",
              new Date().toISOString().slice(0, 10),
            ),
            true,
          ));
    return res
      .set({
        "Content-Type":
          format === "xml"
            ? "application/xml; charset=utf-8"
            : "text/html; charset=utf-8",
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="${invoice.number ?? invoice.id}.${format}"`,
      })
      .send(content);
  }
  private documentData(
    invoice: any,
    number: string,
    date: string,
  ): DocumentInput {
    return {
      number,
      issueDate: date,
      dueDate: invoice.dueDate,
      supplyDate: invoice.supplyDate,
      buyerReference: invoice.buyerReference,
      locale: invoice.locale,
      currency: invoice.currency,
      seller: invoice.seller,
      buyer: invoice.buyer,
      lines: invoice.lines,
      references: invoice.contractSnapshot.map(
        (c: any) =>
          `${c.contributor?.name ?? ""} — ${c.number} (v${c.version})`,
      ),
    };
  }
  @Post("invoices/:id/issue") async issue(
    @Req() req: Request,
    @Param("id") invoiceId: string,
  ) {
    staff(req.actor, true);
    id.parse(invoiceId);
    const validator = process.env.INVOICE_VALIDATOR_URL;
    if (!validator) throw new ServiceUnavailableException();
    return this.db.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${invoiceId}))`;
        const invoice = await tx.invoice.findUnique({
          where: { id: invoiceId },
        });
        if (!invoice) throw new NotFoundException();
        if (invoice.status !== "DRAFT")
          return {
            id: invoice.id,
            number: invoice.number,
            status: invoice.status,
          };
        const date = new Date().toISOString().slice(0, 10);
        if (
          !invoice.dueDate ||
          !invoice.supplyDate ||
          !invoice.buyerReference ||
          invoice.dueDate < date
        )
          throw new BadRequestException();
        sellerSchema.parse(invoice.seller);
        const year = Number(date.slice(0, 4));
        const seq = await tx.invoiceSequence.upsert({
          where: { year },
          create: { year, value: 1 },
          update: { value: { increment: 1 } },
        });
        const number = `FON-${year}-${String(seq.value).padStart(6, "0")}`;
        const data = this.documentData(invoice, number, date);
        const xml = xmlInvoice(data);
        let response: globalThis.Response;
        try {
          response = await fetch(validator, {
            method: "POST",
            headers: { "Content-Type": "application/xml" },
            body: xml,
            signal: AbortSignal.timeout(20000),
            redirect: "error",
          });
        } catch {
          throw new ServiceUnavailableException();
        }
        const report = await response.text();
        if (response.status === 406)
          throw new BadRequestException({ code: "INVOICE_INVALID" });
        if (response.status !== 200 || !report.includes("report"))
          throw new ServiceUnavailableException();
        const html = htmlInvoice(data);
        await tx.invoice.update({
          where: { id: invoiceId },
          data: {
            number,
            status: "ISSUED",
            issuedAt: new Date(),
            xml,
            html,
            validationReport: report,
            documentHash: createHash("sha256").update(xml).digest("hex"),
          },
        });
        await tx.journal.create({
          data: {
            reference: `invoice:${invoiceId}`,
            currency: invoice.currency,
            entries: [
              {
                account: "receivables",
                debit: invoice.total.toFixed(2),
                credit: "0.00",
              },
              {
                account: "sales",
                debit: "0.00",
                credit: invoice.net.toFixed(2),
              },
              {
                account: "vat-payable",
                debit: "0.00",
                credit: invoice.tax.toFixed(2),
              },
            ],
          },
        });
        await tx.audit.create({
          data: {
            userId: req.actor.userId,
            action: "invoice.issue",
            entityId: invoiceId,
          },
        });
        return { id: invoiceId, number, status: "ISSUED" };
      },
      { timeout: 30000 },
    );
  }
  @Post("customer/invoices/:id/pay") async pay(
    @Req() req: Request,
    @Param("id") invoiceId: string,
  ) {
    const invoice = await this.db.invoice.findFirst({
      where: {
        id: id.parse(invoiceId),
        customer: { userId: req.actor.userId },
        status: "ISSUED",
      },
    });
    if (!invoice) throw new NotFoundException();
    const key = process.env.MOLLIE_API_KEY;
    if (!key?.startsWith("test_")) throw new ServiceUnavailableException();
    // Advisory lock serializes concurrent checkout creation for the same invoice.
    const payment = await this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${invoice.id}))`;
      const old = await tx.payment.findFirst({
        where: {
          invoiceId: invoice.id,
          status: { in: ["CREATING", "open", "pending", "authorized", "paid"] },
        },
      });
      return old ?? tx.payment.create({ data: { invoiceId: invoice.id } });
    });
    if (payment.checkoutUrl) return { checkoutUrl: payment.checkoutUrl };
    const base = process.env.PUBLIC_API_URL;
    const portal = process.env.CUSTOMER_PORTAL_URL;
    if (!base || !portal) throw new ServiceUnavailableException();
    const response = await fetch("https://api.mollie.com/v2/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "Idempotency-Key": payment.id,
      },
      body: JSON.stringify({
        amount: { currency: invoice.currency, value: invoice.total.toFixed(2) },
        description: invoice.number ?? invoice.id,
        redirectUrl: portal,
        webhookUrl: `${base}/api/webhooks/mollie`,
        metadata: { paymentId: payment.id },
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new ServiceUnavailableException();
    const data: any = await response.json();
    if (
      typeof data.id !== "string" ||
      typeof data._links?.checkout?.href !== "string"
    )
      throw new ServiceUnavailableException();
    await this.db.payment.update({
      where: { id: payment.id },
      data: {
        providerId: data.id,
        status: data.status,
        checkoutUrl: data._links.checkout.href,
      },
    });
    return { checkoutUrl: data._links.checkout.href };
  }
}
@Controller("health")
export class HealthController {
  constructor(@Inject(Database) private db: Database) {}
  @Get("live") live() {
    return { status: "ok" };
  }
  @Get("ready") async ready() {
    await this.db.$queryRaw`SELECT 1`;
    return { status: "ok" };
  }
}
@Controller("webhooks")
export class WebhookController {
  constructor(@Inject(Database) private db: Database) {}
  @Post("mollie") @HttpCode(200) async mollie(@Body() body: unknown) {
    const { id: providerId } = z
      .object({ id: z.string().regex(/^tr_[a-zA-Z0-9]+$/) })
      .parse(body);
    const payment = await this.db.payment.findUnique({
      where: { providerId },
      include: { invoice: true },
    });
    if (!payment) return { received: true };
    const key = process.env.MOLLIE_API_KEY;
    if (!key?.startsWith("test_")) throw new ServiceUnavailableException();
    const response = await fetch(
      `https://api.mollie.com/v2/payments/${providerId}`,
      {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!response.ok) throw new ServiceUnavailableException();
    const data: any = await response.json();
    if (
      data.id !== providerId ||
      data.amount?.currency !== payment.invoice.currency ||
      data.amount?.value !== payment.invoice.total.toFixed(2) ||
      data.metadata?.paymentId !== payment.id ||
      data.mode !== "test"
    )
      throw new ConflictException();
    await this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${payment.invoiceId}))`;
      const fresh = await tx.payment.findUniqueOrThrow({
        where: { id: payment.id },
      });
      if (fresh.status === "paid") return;
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: data.status },
      });
      if (data.status === "paid") {
        for (const contract of payment.invoice.contractSnapshot as any[]) {
          await tx.accrual.create({
            data: {
              paymentId: payment.id,
              contractId: contract.id,
              contributorId: contract.contributorId,
              contractNumber: contract.number,
              contractVersion: contract.version,
              amount: share(payment.invoice.net.toFixed(2), contract.rate),
              currency: payment.invoice.currency,
            },
          });
        }
        await tx.invoice.update({
          where: { id: payment.invoiceId },
          data: { status: "PAID" },
        });
        await tx.journal.create({
          data: {
            reference: `payment:${payment.id}`,
            currency: payment.invoice.currency,
            entries: [
              {
                account: "mollie-clearing",
                debit: payment.invoice.total.toFixed(2),
                credit: "0.00",
              },
              {
                account: "receivables",
                debit: "0.00",
                credit: payment.invoice.total.toFixed(2),
              },
            ],
          },
        });
      }
    });
    return { received: true };
  }
}
