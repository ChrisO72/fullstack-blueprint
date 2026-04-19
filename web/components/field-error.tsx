import { ErrorMessage } from "./ui-kit/fieldset";
import type { FieldErrors } from "../lib/form";

/**
 * Render the first validation message for `name` from a `parseForm` errors map,
 * or nothing if there is no error. Sits inside `<Field>` next to `<Input>`.
 *
 * ```tsx
 * <Field>
 *   <Label>Email</Label>
 *   <Input type="email" name="email" invalid={!!errors?.email} />
 *   <FieldError name="email" errors={errors} />
 * </Field>
 * ```
 */
export function FieldError({ name, errors }: { name: string; errors?: FieldErrors | null }) {
  const messages = errors?.[name];
  if (!messages?.length) return null;
  return <ErrorMessage>{messages[0]}</ErrorMessage>;
}
