.PHONY: dev dev:web build run stop

# Development
dev:
	npm run dev

dev\:web:
	npm run dev:web

# Production (Docker)
build:
	docker build -t fullstack-blueprint .

run:
	@docker rm -f fullstack-blueprint 2>/dev/null || true
	docker run --name fullstack-blueprint -p 3000:3000 --env-file .env fullstack-blueprint

stop:
	docker stop fullstack-blueprint
