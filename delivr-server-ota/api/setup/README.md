# Delivr Server OTA - Docker Development Setup

## Quick Start

```bash
./api/setup/dev-docker.sh
```

That's it! No local Node.js required. Everything runs inside Docker.

## Commands

### Run Levels

| Command | What it does |
|---------|--------------|
| `./api/setup/dev-docker.sh` | Normal start (preserves data) |
| `./api/setup/dev-docker.sh fresh` | ⚠️ Complete reset - deletes all data, rewrites .env |
| `./api/setup/dev-docker.sh clear-data` | ⚠️ Clear data only - keeps .env (new API key) |
| `./api/setup/dev-docker.sh rebuild` | Rebuild containers, keep data |

### Options

| Flag | Description |
|------|-------------|
| `--logs` | Follow app container logs after starting |
| `--yes`, `-y` | Skip confirmation prompts |
| `-h`, `--help` | Show help |

### Examples

```bash
# Normal start + follow logs
./api/setup/dev-docker.sh --logs

# Complete reset without confirmation
./api/setup/dev-docker.sh fresh -y

# Rebuild + follow logs
./api/setup/dev-docker.sh rebuild --logs
```

## What the Script Does

1. Creates `.env` from `.env.example` (if missing)
2. Starts Cronicle and generates API key
3. Starts infrastructure (MySQL, Redis, Memcached, LocalStack)
4. Starts app container with hot reload
5. Creates database schema

## Docker Profiles

| Profile | Command | Purpose |
|---------|---------|---------|
| `dev` | `docker compose --profile dev up` | Development with hot reload |
| `prod` | `docker compose --profile prod up -d` | Production with PM2 cluster |

## URLs

- **API Server**: http://localhost:3010
- **Cronicle UI**: http://localhost:3012 (login: admin/admin)

## Containers

| Container | Port | Purpose |
|-----------|------|---------|
| `db` | 3306 | MySQL database |
| `redis` | 6379 | Redis cache |
| `memcached` | 11211 | Memcached |
| `localstack` | 4566 | AWS S3 simulation |
| `cronicle` | 3012 | Job scheduler |
| `app-dev` | 3010 | Application (dev) |

## Troubleshooting

### Reset everything
```bash
./api/setup/dev-docker.sh fresh
```

### View logs
```bash
docker compose --profile dev logs -f app-dev
```

### Stop containers
```bash
docker compose --profile dev down
```

### Install npm package
```bash
docker compose --profile dev exec app-dev npm install <package>
```

### Run schema creation manually
```bash
docker compose --profile dev exec app-dev ts-node -r dotenv/config /app/api/setup/create-schema.ts
```

## Files

| File | Purpose |
|------|---------|
| `dev-docker.sh` | Main development script |
| `create-schema.ts` | Database schema creation |
