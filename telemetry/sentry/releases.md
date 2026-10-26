# Releases and source maps

Read this when building a release or uploading source maps. Configure the upload token using
[README.md](README.md#configuration). Run commands from the repository root.

```bash
npm run build          # source maps and debug IDs; no upload credentials required
npm run sentry:upload  # upload that build explicitly, using SENTRY_UPLOAD_TOKEN
```

Uploads include browser/server output, worker, and the SDK preload. Upload failures fail the command.
Debug IDs are injected before the artifacts are deployed; upload does not rewrite running artifacts.
Each build stages uploadable pairs in `build/<service>/sentry-artifacts/` and removes browser
`.map` files from `build/web/client/`. Keep artifact directories private. The default upload command
processes both builds; `npm run sentry:upload -- web` or `-- worker` selects one. For container builds,
extract the service's build directory from its image into the corresponding host `build/` location
before uploading. Upload the exact artifacts shipped in that image, not a separate rebuild.

Set the same `SENTRY_RELEASE` build argument for both production images. Host `npm run build`
resolves one identifier and passes it to both builds. Individual host builds derive
`blueprint@<git-sha>` (with `-dirty` for working changes) unless explicitly supplied; container builds
default to `blueprint@local`. Each build writes `build/<service>/release.json`; production startup
reads that identifier without Git. An explicit runtime `SENTRY_RELEASE` overrides it and must match
the uploaded artifacts. `make dev` passes a host-derived identifier into both containers.
SDK configuration changes require a restart.

For production commands, see the [web](../../web/README.md#production) and
[worker](../../worker/README.md#production) READMEs. Run the two services as separate supervised
processes; `npm start` starts both through concurrently for local use.
