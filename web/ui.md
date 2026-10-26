# UI components and styling

Read this when building or changing interfaces. Use the existing Catalyst-style primitives in
[components/ui-kit/](components/ui-kit/) for buttons, dialogs, tables, dropdowns, headings, and fields.

## Component pattern

```tsx
import { PlusIcon } from "@heroicons/react/16/solid";
import { Button } from "~/components/ui-kit/button";
import { Heading } from "~/components/ui-kit/heading";

type ItemsHeaderProps = { onCreate: () => void };

export function ItemsHeader({ onCreate }: ItemsHeaderProps) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <Heading>Items</Heading>
      <Button onClick={onCreate}>
        <PlusIcon data-slot="icon" /> New item
      </Button>
    </div>
  );
}
```

Use [routes/items/index.tsx](routes/items/index.tsx) for the table, pagination, and action-menu
example. The [route guide](routes.md#route-module-template) owns the form and validation template.

## Styling

- Tailwind v4 tokens live in [app.css](app.css); there is no `tailwind.config.js`.
- Use `clsx` for conditional class composition.
- Use `@heroicons/react` icons with `data-slot="icon"` so primitives style them correctly.
- Use the shared `FormError` and `FieldError` components for action errors; details are in
  [form validation](routes.md#validation).
