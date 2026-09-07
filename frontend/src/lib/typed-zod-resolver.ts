import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import type { FieldValues, Resolver } from "react-hook-form";

type SchemaOptions = Parameters<typeof zodResolver>[1];
type ResolverOptions = Parameters<typeof zodResolver>[2];

export function zodOutputResolver<
  Schema extends z.ZodType<FieldValues, any, any>,
  TFieldValues extends FieldValues = z.output<Schema>,
  TContext = any,
  TRawValues extends FieldValues = TFieldValues
>(
  schema: Schema,
  schemaOptions?: SchemaOptions,
  resolverOptions?: ResolverOptions
): Resolver<TFieldValues, TContext, TRawValues> {
  const resolver = resolverOptions
    ? zodResolver<TFieldValues, TContext, TRawValues>(schema, schemaOptions, resolverOptions)
    : zodResolver<TFieldValues, TContext, TRawValues>(schema, schemaOptions);

  return resolver as Resolver<TFieldValues, TContext, TRawValues>;
}
