.PHONY: dev down

APP_COMPOSE = docker compose -f compose.yml

dev:
	@test -f .env || (echo 'Copy .env.example to .env and configure it first.'; exit 1)
	@version=$$(docker compose version --short) && echo "$$version" | awk -F. '{ sub(/^v/, "", $$1); if ($$1 < 2 || ($$1 == 2 && ($$2 < 32 || ($$2 == 32 && $$3 < 2)))) exit 1 }' || (echo 'Docker Compose 2.32.2 or newer is required.'; exit 1)
	SENTRY_RELEASE="$$(node --import tsx telemetry/release.ts)" $(APP_COMPOSE) up --build --watch --remove-orphans

down:
	$(APP_COMPOSE) down --remove-orphans
