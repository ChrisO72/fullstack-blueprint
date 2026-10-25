# Storage instructions

This area owns private S3 object operations shared by web and worker.

- Keep buckets private and generate object keys on the server.
- Derive organization ownership from the authenticated caller, never browser input.
- Sign URLs for the final endpoint; do not rewrite signed URLs.

Read [uploads.md](uploads.md) when changing file operations, upload validation, or delivery.
Use [README.md](README.md) for provider, credential, endpoint, and CORS configuration.
For metadata queries, read [db/repositories/repository.md](../db/repositories/repository.md).
