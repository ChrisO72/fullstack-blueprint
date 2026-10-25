# Mail

Server-only email transport and templates using Lettermint. This is shared application code;
it has no container or process of its own.

## Configuration

Set these in root `.env`, or supply them through the production deployment environment:

```dotenv
APP_URL=http://localhost:5173  # Public web origin used in email links
LETTERMINT_API_KEY=           # Provider API key; required to enable email
LETTERMINT_MAIL_FROM=         # Verified sender address; required to enable email
```

Both Lettermint settings are optional for application startup. Set both to enable account
confirmation and password-reset email. Use the production public origin for deployed email links.

## Run locally

Run the [whole app](../README.md#run-the-whole-app), or follow the individual
[web](../web/README.md#run-locally) and [worker](../worker/README.md#run-locally) instructions.
Web enqueues emails; a running worker performs delivery. Restart the processes after changing configuration.

## Development guides

- [Templates and delivery](templates.md) — adding email types and connecting delivery jobs.
- [Instrumentation](../telemetry/instrumentation.md) — safe logging and error ownership.
