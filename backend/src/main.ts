import "reflect-metadata";
import { Prisma } from "@prisma/client";
import {
  Module,
  Catch,
  ArgumentsHost,
  ExceptionFilter,
  HttpException,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import helmet from "helmet";
import { ZodError } from "zod";
import { Database } from "./database.js";
import { AuthGuard } from "./auth.js";
import {
  ApiController,
  HealthController,
  WebhookController,
} from "./routes.js";
import { messages, selectLocale } from "./domain.js";
@Catch()
class Errors implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const req = http.getRequest();
    const res = http.getResponse();
    let status =
      error instanceof ZodError
        ? 400
        : error instanceof HttpException
          ? error.getStatus()
          : error instanceof Prisma.PrismaClientKnownRequestError &&
              ["P2002", "P2003", "P2025"].includes(error.code)
            ? 409
            : 500;
    let code =
      (
        {
          400: "INVALID",
          401: "UNAUTHORIZED",
          403: "FORBIDDEN",
          404: "NOT_FOUND",
          409: "CONFLICT",
          503: "UNAVAILABLE",
        } as Record<number, string>
      )[status] ?? "INTERNAL";
    const detail = error instanceof HttpException ? error.getResponse() : null;
    if (
      detail &&
      typeof detail === "object" &&
      "code" in detail &&
      typeof detail.code === "string" &&
      messages.en[detail.code]
    )
      code = detail.code;
    if (status === 500) console.error(error);
    const locale = selectLocale(req.headers["accept-language"]);
    res
      .status(status)
      .set("Content-Language", locale)
      .json({
        code,
        message: messages[locale][code],
        ...(error instanceof ZodError
          ? {
              fields: error.issues.map((i) => ({ path: i.path, code: i.code })),
            }
          : {}),
      });
  }
}
@Module({
  controllers: [ApiController, HealthController, WebhookController],
  providers: [Database, AuthGuard],
})
class App {}
async function main() {
  for (const key of [
    "DATABASE_URL",
    "FONITAS_JWKS_URL",
    "FONITAS_TOKEN_ISSUER",
    "FONITAS_PROJECT_KEY",
    "FRONTEND_ORIGIN",
  ])
    if (!process.env[key]) throw new Error(`Missing ${key}`);
  const app = await NestFactory.create(App);
  app.use(helmet());
  app.enableCors({
    origin: process.env
      .FRONTEND_ORIGIN!.split(",")
      .map((value) => value.trim()),
    credentials: false,
  });
  app.setGlobalPrefix("api");
  app.useGlobalFilters(new Errors());
  app.enableShutdownHooks();
  const doc = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle("Fonitas Accounting")
      .setVersion("0.1")
      .addBearerAuth()
      .build(),
  );
  SwaggerModule.setup("api/docs", app, doc);
  await app.listen(Number(process.env.PORT ?? 3100), "127.0.0.1");
}
main();
