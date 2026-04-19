import type { ActionData } from "../lib/form";

/**
 * Render the top-level error banner for a route action's `formError`, or
 * nothing if there is no error. Use at the top of the `<Form>` for errors
 * that don't belong to a single field (e.g. "Invalid email or password").
 *
 * ```tsx
 * <Form method="POST">
 *   <FormError actionData={actionData} />
 *   ...
 * </Form>
 * ```
 */
export function FormError({ actionData }: { actionData?: ActionData | null }) {
  if (!actionData?.formError) return null;
  return (
    <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
      {actionData.formError}
    </div>
  );
}
