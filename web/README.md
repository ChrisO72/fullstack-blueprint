# Web

React Router 7 SSR app. See the repo-root [README.md](../README.md) for stack, commands, and conventions.

## Routing

Route table lives in [routes.ts](routes.ts). Add new routes there with `route()`, `index()`, and `layout()` from `@react-router/dev/routes`:

```ts
import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  route("login", "routes/auth/login.tsx"),
  layout("routes/layout.tsx", [
    index("routes/home.tsx"),
    route("manage-items", "routes/manage-items/index.tsx"),
  ]),
] satisfies RouteConfig;
```

## Route module template

Each route module exports a `loader`, an `action`, and a default component. Types come from the generated `./+types/<name>` module.

```ts
import type { Route } from "./+types/index";
import { Form, redirect, useActionData } from "react-router";
import { z } from "zod";
import { FieldError } from "~/components/field-error";
import { FormError } from "~/components/form-error";
import { Field, Label } from "~/components/ui-kit/fieldset";
import { Input } from "~/components/ui-kit/input";
import { requireAuth } from "~/lib/session.server";
import { parseForm, type ActionData } from "~/lib/form";
import { createItem } from "~/db/repositories/items";

const createItemSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
});

export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireAuth(request);
  return { user };
}

export async function action({ request }: Route.ActionArgs): Promise<ActionData | Response> {
  const { user } = await requireAuth(request);

  const formData = await request.formData();
  const { data, fieldErrors } = parseForm(formData, createItemSchema);
  if (fieldErrors) return { fieldErrors };

  await createItem({ organizationId: user.organizationId, ...data });
  return redirect(".");
}

export default function Page() {
  const actionData = useActionData<ActionData>();
  return (
    <Form method="POST">
      <FormError actionData={actionData} />
      <Field>
        <Label>Title</Label>
        <Input name="title" invalid={!!actionData?.fieldErrors?.title} />
        <FieldError name="title" actionData={actionData} />
      </Field>
    </Form>
  );
}
```

`requireAuth` returns `{ user, newAccessToken, newRefreshToken }`. The token fields are non-null only when the access token expired and was rotated via the refresh token; the root layout loader sets the new cookies on the response (see [routes/layout.tsx](routes/layout.tsx)). If the session is invalid or the user record was deleted, `requireAuth` throws a redirect to `/login` (clearing cookies in the deleted-user case), so loaders/actions never need to handle the missing-user branch themselves. Use `requireAdmin` for admin-only routes — it returns the same shape and additionally redirects non-admins to `/`.

## Server boundary

Server-only code lives in `*.server.ts` and is never imported from client components.

- [lib/session.server.ts](lib/session.server.ts) — `requireAuth(request)` for loaders/actions.
- [lib/auth.server.ts](lib/auth.server.ts) — password hashing, token issuance.
- [lib/mail.server.ts](lib/mail.server.ts) — outbound email.

## Data access

Routes import from [db/repositories/](../db/repositories/).

```ts
import { listItemsByOrgPaginated } from "~/db/repositories/items";

const items = await listItemsByOrgPaginated(user.organizationId, page, pageSize);
```

Multi-org: scope every query by `organizationId` (read it from the authenticated user). See [db/README.md](../db/README.md).

## Validation

Zod for every form/action input. Parse with `parseForm` from [lib/form.ts](lib/form.ts) (action template above). Actions return the shared `ActionData` shape — `{ fieldErrors?, formError? }` — so every form renders the same way:

- `<FormError actionData={actionData} />` from [components/form-error.tsx](components/form-error.tsx) at the top of the `<Form>` for top-level errors (e.g. "Invalid email or password").
- `<FieldError name="..." actionData={actionData} />` from [components/field-error.tsx](components/field-error.tsx) next to each `<Input>`, with `invalid={!!actionData?.fieldErrors?.<name>}` on the input.

If an action also needs to return successful data alongside, intersect with the extra fields (`type MyActionData = ActionData & { resentAt?: string }`) — never reuse `formError`/`fieldErrors` for non-error state.

## UI

Catalyst-style primitives live in [components/ui-kit/](components/ui-kit) (`Button`, `Dialog`, `Table`, `Dropdown`, `Heading`, `Input`, `Fieldset`, …) and cover most UI needs.

```tsx
import { PlusIcon, EllipsisHorizontalIcon } from "@heroicons/react/16/solid";
import { Badge } from "~/components/ui-kit/badge";
import { Button } from "~/components/ui-kit/button";
import { Dropdown, DropdownButton, DropdownItem, DropdownMenu } from "~/components/ui-kit/dropdown";
import { Heading } from "~/components/ui-kit/heading";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui-kit/table";

<div className="mb-6 flex items-start justify-between">
  <Heading>Items</Heading>
  <Button href="/items/new">
    <PlusIcon data-slot="icon" /> New item
  </Button>
</div>

<Table>
  <TableHead>
    <TableRow>
      <TableHeader>Title</TableHeader>
      <TableHeader>Status</TableHeader>
      <TableHeader>Actions</TableHeader>
    </TableRow>
  </TableHead>
  <TableBody>
    {items.map((item) => (
      <TableRow key={item.id}>
        <TableCell>{item.title}</TableCell>
        <TableCell>
          <Badge color={item.status === "published" ? "green" : "zinc"}>{item.status}</Badge>
        </TableCell>
        <TableCell>
          <Dropdown>
            <DropdownButton plain aria-label="More options">
              <EllipsisHorizontalIcon data-slot="icon" />
            </DropdownButton>
            <DropdownMenu>
              <DropdownItem href={`/items/${item.id}`}>View</DropdownItem>
              <DropdownItem onClick={() => onDelete(item.id)}>Delete</DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

- Tailwind v4 — no `tailwind.config.js`; tokens live in [app.css](app.css).
- Use `clsx` for conditional class composition.
- Icons: `@heroicons/react`. Pass `data-slot="icon"` so ui-kit components style them correctly.
