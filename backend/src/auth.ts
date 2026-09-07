import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { z } from "zod";
export const claims = z.object({
  user_id: z.number().int().positive(),
  type: z.literal("access"),
  exp: z.number(),
  payload: z.object({ aud: z.string(), roles: z.array(z.string()) }),
});
export type Actor = { userId: number; roles: string[] };
@Injectable()
export class AuthGuard implements CanActivate {
  private keys = createRemoteJWKSet(new URL(process.env.FONITAS_JWKS_URL!));
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const match = /^Bearer ([^\s]+)$/.exec(req.headers.authorization ?? "");
    if (!match) throw new UnauthorizedException();
    try {
      const { payload, protectedHeader } = await jwtVerify(
        match[1],
        this.keys,
        {
          algorithms: ["RS256"],
          issuer: process.env.FONITAS_TOKEN_ISSUER,
          requiredClaims: ["exp", "iat"],
        },
      );
      if (!protectedHeader.kid) throw new Error();
      const data = claims.parse(payload);
      if (data.payload.aud !== process.env.FONITAS_PROJECT_KEY)
        throw new Error();
      req.actor = { userId: data.user_id, roles: data.payload.roles };
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
export function staff(actor: Actor, write = false) {
  if (
    !actor.roles.some((r) =>
      (write
        ? ["admin", "accountant"]
        : ["admin", "accountant", "viewer"]
      ).includes(r),
    )
  )
    throw new ForbiddenException();
}
export function admin(actor: Actor) {
  if (!actor.roles.includes("admin")) throw new ForbiddenException();
}
