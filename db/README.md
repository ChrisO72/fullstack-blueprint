# Database

PostgreSQL with Drizzle ORM. All commands run from the repository root.

## Configuration

Use the root `.env` (copy `.env.example` on first setup):

```dotenv
POSTGRES_USER=blueprint-user          # Local PostgreSQL initialization
POSTGRES_PASSWORD=blueprint-password  # Local PostgreSQL initialization
DATABASE_URL=postgresql://blueprint-user:blueprint-password@127.0.0.1:55432/blueprint # Host tools
```

Keep host credentials in `DATABASE_URL` in sync. Compose sets the database name to `blueprint`
and supplies an internal URL to containers. Database tools require only `DATABASE_URL`.

## Run locally

Requires Docker; host tools also require Node 24+ and `npm ci`.

```bash
docker compose up -d --build database # PostgreSQL at 127.0.0.1:55432
npm run db:migrate                   # Apply unapplied migrations from the host
npm run db:studio                    # Open Drizzle Studio; Ctrl+C stops it
# After leaving Studio:
docker compose stop database         # Stop only PostgreSQL; keep its data
```

Whole-app and individual web/worker Compose startup run the migration container automatically
before starting application processes. PostgreSQL restarts do not trigger migrations.

## Production

### PostgreSQL image

[Dockerfile](Dockerfile) extends PostgreSQL 16 Alpine with its standard entrypoint. Export
`POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` with deployment values before running it:

```dotenv
POSTGRES_USER=blueprint-user   # Deployment database role
POSTGRES_PASSWORD=            # Required: replace with a deployment secret
POSTGRES_DB=blueprint         # Database to initialize
```

```bash
docker build -f db/Dockerfile -t blueprint-database .
docker run -d --name blueprint-database \
  -e POSTGRES_USER -e POSTGRES_PASSWORD -e POSTGRES_DB \
  -p 127.0.0.1:55432:5432 -v blueprint-pgdata:/var/lib/postgresql/data blueprint-database
```

The database variables initialize an empty volume; they do not reconfigure an existing database.
For container consumers, supply a reachable database address and deployment networking.

### Migration image

[Dockerfile.migrate](Dockerfile.migrate) packages the Node migration runner and generated SQL.
It needs no web secrets, Redis, mail, or Sentry settings. Builds use the repository root as context.
Export `DATABASE_URL` with a database address reachable from the container:

```bash
docker build -f db/Dockerfile.migrate -t blueprint-migrate .
docker run --rm --init -e DATABASE_URL blueprint-migrate # Once per deployment, before web/worker
```

`docker run -e NAME` reads exported shell values, not root `.env`. Never put application migrations
in PostgreSQL's first-initialization directory: existing databases need later migrations too.

```bash
npm run build:db              # Host build of the migration runner and SQL into build/db/
```

## Migration failures and data

[migrate.ts](migrate.ts) applies unapplied migrations, closes its pool, and exits nonzero on failure.
Compose waits for healthy PostgreSQL and a successful migration exit before starting web/worker.
Errors retain their causes without printing SQL parameters or connection URLs.

For `No space left on device`, free Docker disk space or increase its disk allocation; preserve
`pgdata`. After fixing storage, restart the whole app with `make down` followed by `make dev`.

```bash
npm run docker:down           # Remove app containers; retain database, Redis, and file volumes
npm run docker:wipe           # DELETES all app data in those volumes; preserves separate Sentry data
```

Wiping data is not a recovery command.

## Development guides

- [Schema changes](schema.md) — schema files, migration generation, timestamps, and indexes.
- [Repositories](repositories/repository.md) — database access, soft deletes, and organization scoping.
