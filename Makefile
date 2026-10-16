.PHONY: dev down

dev:
	@test -f .env || (echo 'Copy .env.example to .env and configure it first.'; exit 1)
	@version=$$(docker compose version --short) && echo "$$version" | awk -F. '{ sub(/^v/, "", $$1); if ($$1 < 2 || ($$1 == 2 && $$2 < 32)) exit 1 }' || (echo 'Docker Compose 2.32.0 or newer is required.'; exit 1)
	docker compose up --build --watch

down:
	docker compose down
