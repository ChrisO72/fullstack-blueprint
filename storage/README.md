# File storage

Private S3 storage shared by web and worker. PostgreSQL holds metadata; S3 holds file bytes.
Local development uses a third-party MinIO image, with no custom Dockerfile.
All commands run from the repository root.

## Configuration

Set these in root `.env` for local MinIO:

```dotenv
S3_REGION=eu-central-1                # Bucket region
S3_BUCKET=blueprint-files             # Unset to disable the files feature
S3_ENDPOINT=http://127.0.0.1:9000      # Host access to MinIO
S3_PUBLIC_ENDPOINT=http://127.0.0.1:9000 # Browser-reachable signing endpoint
S3_FORCE_PATH_STYLE=true              # Required for local MinIO
S3_ACCESS_KEY_ID=blueprint-access-key  # Local MinIO credentials; set both key fields together
S3_SECRET_ACCESS_KEY=blueprint-secret-key
APP_URL=http://localhost:5173         # Allowed local browser origin
```

All `S3_*` settings are optional. Without `S3_BUCKET`, the Files page shows setup guidance.
Compose supplies `http://storage:9000` for server operations while keeping the browser endpoint
reachable from the host. `S3_PUBLIC_ENDPOINT` defaults to `S3_ENDPOINT` when absent.

## Run locally

```bash
docker compose up -d storage storage-init # Start MinIO and create the private bucket
# To stop only MinIO:
docker compose stop storage              # Retain stored files
```

The [whole-app workflow](../README.md#run-the-whole-app) starts these automatically.
S3 API: <http://127.0.0.1:9000>; console: <http://127.0.0.1:9001>.
The `objectdata` volume preserves files across restarts. `npm run docker:wipe` deletes that volume
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

Local MinIO reads `APP_URL` for its CORS origin.

## Development guides

- [Uploads and downloads](uploads.md) — validation, authorization, signed URLs, and delivery.
- [Repositories](../db/repositories/repository.md) — organization-scoped file metadata access.
