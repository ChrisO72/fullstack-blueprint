# File storage

Private S3 storage shared by web and worker. PostgreSQL holds metadata; S3 holds file bytes.
Local development uses the pinned `chrislusf/seaweedfs:4.50` image in single-container `mini` mode,
with no custom Dockerfile or separate initialization service.
All commands run from the repository root.

## Configuration

Set these in root `.env` for local SeaweedFS:

```dotenv
S3_REGION=eu-central-1                # Bucket region
S3_BUCKET=blueprint-files             # Unset to disable the files feature
S3_ENDPOINT=http://127.0.0.1:8333      # Host access to SeaweedFS
S3_PUBLIC_ENDPOINT=http://127.0.0.1:8333 # Browser-reachable signing endpoint
S3_FORCE_PATH_STYLE=true              # Path-style access for local SeaweedFS
S3_ACCESS_KEY_ID=blueprint-access-key  # Local credentials; set both key fields together
S3_SECRET_ACCESS_KEY=blueprint-secret-key
APP_URL=http://localhost:5173         # Allowed local browser origin
```

All `S3_*` settings are optional. Without `S3_BUCKET`, the Files page shows setup guidance.
Compose supplies `http://storage:8333` for server operations while keeping the browser endpoint
reachable from the host. `S3_PUBLIC_ENDPOINT` defaults to `S3_ENDPOINT` when absent.

Compose maps the local key pair to SeaweedFS's AWS credential settings and creates `S3_BUCKET`
on startup, falling back to `blueprint-files` for storage initialization when it is unset.
Omitting `S3_BUCKET` still disables the app's files feature. No anonymous access is configured.

## Run locally

```bash
docker compose up -d --wait storage # Start SeaweedFS and wait for its private bucket
# To stop only SeaweedFS:
docker compose stop storage        # Retain stored files
```

The [whole-app workflow](../README.md#run-the-whole-app) starts storage automatically. Web and
worker wait for a successful SigV4-authenticated HEAD request to the configured bucket; a missing
bucket or rejected credentials prevents startup.

S3 API: <http://127.0.0.1:8333>, published only on host loopback. WebDAV, the admin UI, and the
Iceberg and Lance endpoints are disabled. The `objectdata` volume mounted at `/data` preserves
both file bytes and SeaweedFS metadata across restarts. `npm run docker:wipe` deletes that volume
along with PostgreSQL and Redis data; separate Sentry data is preserved.

## Production

Create a private S3 bucket and supply these settings to web and worker:

```dotenv
S3_REGION=eu-central-1            # Match the bucket's region
S3_BUCKET=your-private-bucket     # Replace with your bucket name
S3_FORCE_PATH_STYLE=false         # AWS S3 addressing
```

On AWS, leave both endpoints and both explicit key fields unset to use the regional endpoint and
default IAM credential chain. Web and worker need `s3:PutObject`, `s3:GetObject`, and `s3:DeleteObject`
on `arn:aws:s3:::your-private-bucket/*`; `HeadObject` uses `s3:GetObject`. Keep the bucket private.

### Browser CORS

Configure direct uploads with the exact production application origin:

```json
[
  {
    "AllowedOrigins": ["https://your-app.example"],
    "AllowedMethods": ["POST"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

Compose passes `APP_URL` to SeaweedFS's `s3.allowedOrigins` setting for local browser uploads.

## Development guides

- [Uploads and downloads](uploads.md) — validation, authorization, signed URLs, and delivery.
- [Repositories](../db/repositories/repository.md) — organization-scoped file metadata access.
