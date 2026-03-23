# Makefile for shipstation-app
# Usage: make <target>

#----------- Make Environment ----------------------
SHELL= /bin/sh
docker_bin= $(shell command -v docker 2> /dev/null)
# Check for docker-compose first, if not found use 'docker compose' format
docker_compose_bin= $(shell if command -v docker-compose > /dev/null 2>&1; then echo 'docker-compose'; else echo 'docker compose'; fi)

# Export all variables from .env automatically
ifneq (,$(wildcard .env))
  include .env
  export
endif


ENV_FILE ?= .env
PROJECT_NAME ?= custom-shopify-dev-tools
PROJECT_ENV ?= prod
COMPOSE_FILE = docker/docker-compose.$(PROJECT_ENV).yml -p $(PROJECT_NAME)

# Ensure .env exists
check-env:
	@if [ ! -f .env ]; then \
		echo "[ERROR] .env file not found. Copy .env.example to .env"; \
		exit 1; \
	fi

# Build all Docker images
build: check-env
	$(docker_compose_bin) -f $(COMPOSE_FILE) --env-file $(ENV_FILE) build

# Start all services in detached mode
up: check-env
	$(docker_compose_bin) -f $(COMPOSE_FILE) --env-file $(ENV_FILE) up -d

up-runtime: check-env
	$(docker_compose_bin) -f $(COMPOSE_FILE) --env-file $(ENV_FILE) up --build

# Stop all services
down:
	$(docker_compose_bin) -f $(COMPOSE_FILE) --env-file $(ENV_FILE) down

# Show logs
logs:
	$(docker_compose_bin) -f $(COMPOSE_FILE) --env-file $(ENV_FILE) logs -f

# Enter shell in a running container: make shell-<service>
shell-%:
	$(docker_compose_bin) -f $(COMPOSE_FILE) --env-file $(ENV_FILE) exec $* sh

docker-ps:
	$(docker_compose_bin) -f $(COMPOSE_FILE) --env-file $(ENV_FILE) ps --all

# Prune Docker images with megapap label
prune:
	$(docker_bin) image prune -f --filter 'label=image-name=custom-shopify-dev-tools'

build-app: check-env
	$(docker_compose_bin) -f $(COMPOSE_FILE) --env-file $(ENV_FILE) build app

up-app: check-env
	$(docker_compose_bin) -f $(COMPOSE_FILE) --env-file $(ENV_FILE) up -d app


# Print help
help:
	@echo "=========== Custom Shopify Dev Tools Makefile ==========="
	@echo ""
	@echo "Environment: custom-shopify-dev-tools"
	@echo "Compose file: $(COMPOSE_FILE)"
	@echo ""
	@echo "Docker Commands:"
	@echo "  build            Build all Docker images for production (default)"
	@echo "  up               Start all services in detached mode (production)"
	@echo "  down             Stop all services"
	@echo "  logs             Show logs from all containers"
	@echo "  prune            Remove all Docker images with the 'megapap' label"
	@echo "  docker-ps        List all Docker containers managed by this compose file"
	@echo ""
	@echo "Container Access:"
	@echo "  shell-<svc>      Enter shell in a running container (e.g. make shell-app)"
	@echo ""
	@echo "Usage Notes:"
	@echo "- By default, PROJECT_ENV=prod for remote/production usage."
	@echo "- To use another environment, override PROJECT_ENV (e.g. make build PROJECT_ENV=dev)"
	@echo "- Using .env environment with docker-compose.yml"
	@echo "========================================================="
