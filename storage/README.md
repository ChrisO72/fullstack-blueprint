# File Storage

Private, S3-compatible object storage shared by the web app and worker. PostgreSQL holds
organization-scoped metadata; object storage holds file bytes.

## Local development

`npm run docker:up` starts a MinIO-compatible server and creates the private `blueprint-files`
bucket automatically.

- S3 API: `http://127.0.0.1:9000`
- Console: `http://127.0.0.1:9001`
- Region: `eu-central-1`
- Credentials and bucket: [`.env.example`](../.env.example)

The `objectdata` Docker volume preserves files across restarts. `npm run docker:wipe` deliberately
removes it along with PostgreSQL and Redis data.

The browser must receive presigned URLs containing `127.0.0.1:9000`, not the Compose hostname
`storage`. The provided endpoint does this because the web process runs on the host.

## Production S3

Create a private bucket in `eu-central-1`, configure its CORS policy for the application origin, and
set:

```dotenv
S3_REGION=eu-central-1
S3_BUCKET=your-private-bucket
S3_FORCE_PATH_STYLE=false
```

Leave `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, and `S3_SECRET_ACCESS_KEY` unset on AWS so the SDK uses its
regional endpoint and default IAM credential chain. For another S3-compatible provider, set its
endpoint and credentials; enable path-style addressing only when the provider requires it.

The web and worker roles need only these bucket actions:

- `s3:PutObject`, `s3:GetObject`, and `s3:DeleteObject` for
  `arn:aws:s3:::your-private-bucket/*` (`HeadObject` is authorized by `s3:GetObject`)

Do not grant public bucket access. Presigned POST policies constrain uploads to the server-generated
key, declared content type, exact expected size, and a five-minute lifetime.

## Browser CORS

Direct uploads require a bucket CORS rule equivalent to:

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

Use the exact production application origin. The local container reads `APP_URL` and configures its
API CORS origin accordingly.

## Delivery and CloudFront

The default private-file flow authorizes every download in the app and redirects to a five-minute
S3 signed URL with an attachment disposition. This is the simplest solid default.

For high-volume delivery, put CloudFront in front of the private bucket with Origin Access Control
and issue CloudFront signed URLs or cookies after the same organization authorization check. Keep
uploads pointed directly at S3; a CDN is a download optimization, not required storage
infrastructure.
