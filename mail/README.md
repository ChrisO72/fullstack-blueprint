# Mail

Server-only outbound email transport and templates.

## Structure

- `client.server.ts` owns the provider client and the low-level `sendEmail` function.
- Each email type has its own `*.server.ts` file, such as `confirmation.server.ts`.
- BullMQ handlers in `worker/jobs/` call these modules. Web routes enqueue jobs instead of
  contacting the provider directly.

## Adding an email

1. Add a focused module such as `password-reset.server.ts` that accepts typed domain inputs, builds
   the HTML and text bodies, and calls `sendEmail`.
2. Add a matching typed job in `worker/jobs/` with its name, payload, handler, and enqueue helper.
3. Register the job in `worker/jobs/dispatcher.ts`.
4. Enqueue it from web code through the helper exported by its job module.

Keep queue payloads limited to the values needed to render the message. Configure bounded retries,
backoff, retention, and a stable job ID in the enqueue helper. Email delivery is at least once, so a
provider timeout may result in a duplicate message on retry.

## Configuration

Set `LETTERMINT_API_KEY`, `LETTERMINT_MAIL_FROM`, and `APP_URL`. The first two are optional so email
can remain disabled in development; `isEmailConfigured` reports whether both are present.
