# Authentication and authorization

Read this when changing sessions, protected routes, permissions, or public authentication actions.

## Protected routes

The [protected layout middleware](routes/layout.tsx) calls `requireAuth(request)` once per request,
stores the user in `authenticatedUserContext`, and appends rotated cookies to the final response.
This covers loaders and actions without racing parallel matched loaders. Invalid sessions redirect
to `/login`; deleted-user sessions also clear cookies.

Refresh rotation is serialized in PostgreSQL. Parallel requests may reuse the previous token for
10 seconds and receive the same replacement; logout revokes either token's session.

Protected loaders and actions read the cached user with `getAuthenticatedUser(context)`.
User queries return an explicit public field projection; only `getUserCredentialsByEmail`
includes the password hash for server-side authentication.
For admin-only routes, use `requireAdmin(context)`; non-admins redirect to `/`:

```ts
import type { Route } from "./+types/index";
import { requireAdmin } from "~/lib/session.server";

export async function loader({ context }: Route.LoaderArgs) {
  const { user } = requireAdmin(context);
  return { user };
}
```

Apply the same permission check in actions that perform admin-only writes.

## Server modules

Server-only code lives in `*.server.ts` and is never imported from client components.

- [lib/session.server.ts](lib/session.server.ts) — auth cookies, protected-route context, and authorization helpers.
- `lib/auth/` — password validation, registration, session tokens, and email-confirmation tokens in focused server modules.
- [`../mail/`](../mail/) — shared outbound mail transport and one server module per email type, delivered through worker jobs.
- [`../storage/`](../storage/) — shared S3 client and object operations used by web and worker code.

## Rate limiting

Public auth actions use Redis-backed fixed windows shared by every web instance:

- Login: 10 requests per submitted email every 15 minutes.
- Signup: 5 requests per submitted email per hour.
- Password-reset requests and confirmation resend: 3 requests per submitted email per hour.
- Password-reset completion: 5 attempts per account every 15 minutes, after token validation.

Counters use HMAC-pseudonymized account identifiers, expire with their window, return `429` with `Retry-After` when exceeded, and fail open if Redis is unavailable.

Use the [route template](routes.md#route-module-template) for loaders and actions. Read the
[mail setup](../mail/README.md) when enabling account confirmation or password resets.
