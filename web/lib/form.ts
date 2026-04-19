import { z } from "zod";

export type FieldErrors = Record<string, string[] | undefined>;

export type ParseFormResult<T> = { data: T; errors: null } | { data: null; errors: FieldErrors };

export function parseForm<T extends z.ZodType>(
  formData: FormData,
  schema: T,
): ParseFormResult<z.infer<T>> {
  const result = schema.safeParse(Object.fromEntries(formData));
  if (result.success) {
    return { data: result.data, errors: null };
  }
  return { data: null, errors: z.flattenError(result.error).fieldErrors as FieldErrors };
}
