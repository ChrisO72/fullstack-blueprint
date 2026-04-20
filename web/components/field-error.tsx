import { ErrorMessage } from "./ui-kit/fieldset";
import type { ActionData } from "../lib/form";

/**
 * Render the first validation message for `name` from a route action's
 * `fieldErrors`, or nothing if there is no error. Sits inside `<Field>` next
 * to `<Input>`.
 *
 * ```tsx
 * <Field>
 *   <Label>Email</Label>
 *   <Input type="email" name="email" invalid={!!actionData?.fieldErrors?.email} />
 *   <FieldError name="email" actionData={actionData} />
 * </Field>
 * ```
 */
export function FieldError({ name, actionData }: { name: string; actionData?: ActionData | null }) {
  const message = actionData?.fieldErrors?.[name]?.[0];
  if (!message) return null;
  return <ErrorMessage>{message}</ErrorMessage>;
}
