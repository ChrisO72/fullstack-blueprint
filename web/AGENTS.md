# web/AGENTS.md

React Router 7 SSR app. See repo-root [AGENTS.md](../AGENTS.md) for stack and commands.

## Routing

- Route table lives in [web/routes.ts](routes.ts). Add new routes there using `route()`, `index()`, `layout()` from `@react-router/dev/routes`.
- Route modules export `loader` / `action` / a default component. Types come from generated `./+types/<name>` (do not hand-roll `LoaderArgs`/`ActionArgs`).
- Canonical example with auth, Zod validation, pagination, and DELETE handling: [web/routes/manage-items/index.tsx](routes/manage-items/index.tsx).

## Server boundary

- Server-only code lives in `*.server.ts` (e.g. [web/lib/auth.server.ts](lib/auth.server.ts), [web/lib/session.server.ts](lib/session.server.ts), [web/lib/mail.server.ts](lib/mail.server.ts)). Never import these from client components.
- For session/auth in loaders & actions, use `requireAuth(request)` from [web/lib/session.server.ts](lib/session.server.ts). Do not roll your own JWT verification.

## Data access

- Always import repository functions from [db/repositories/](../db/repositories/) (e.g. `~/db/repositories/items`). Do not import `db` directly into route modules.
- Multi-org: scope every domain query by `organizationId` (read it from the authenticated user). See [db/AGENTS.md](../db/AGENTS.md).

## Validation

- Use [Zod](https://zod.dev) for every form/action input. Parse at the route boundary with `safeParse`, then pass typed objects inward.
- On failure, return `{ success: false, errors: z.flattenError(result.error).fieldErrors }` to match the existing `ActionData` shape.

## UI

- Prefer the Catalyst-style primitives in [web/components/ui-kit/](components/ui-kit) (`Button`, `Dialog`, `Table`, `Dropdown`, `Heading`, `Input`, `Fieldset`, etc.) over hand-rolled markup.
- Tailwind v4 — no `tailwind.config.js`; tokens live in [web/app.css](app.css). Use `clsx` for conditional class composition.
- Icons: `@heroicons/react`. Pass `data-slot="icon"` so ui-kit components style them correctly.
