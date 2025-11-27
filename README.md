# Delivr

Delivr is a monorepo containing the complete OTA (Over-The-Air) update solution with server, web panel, SDK, and CLI components.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Setup Instructions](#setup-instructions)
- [Running the Application](#running-the-application)
  - [Option 1: Using Launch Script (Recommended)](#option-1-using-launch-script-recommended)
  - [Option 2: Using Docker Compose](#option-2-using-docker-compose)
  - [Running Individual Services](#running-individual-services)
- [Accessing the Services](#accessing-the-services)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, ensure you have the following installed:

- **Docker Desktop** - [Download and install Docker Desktop](https://www.docker.com/products/docker-desktop)
  - Make sure Docker Desktop is running before starting the services
  - Docker Compose is included with Docker Desktop

## Project Structure

```
delivr/
├── delivr-server-ota/          # Backend API server
│   └── api/
│       ├── .env               # Server environment variables (required)
│       └── docker-compose.yml # Server docker-compose file
├── delivr-web-panel/          # Frontend web dashboard
│   ├── .env                   # Web panel environment variables (required)
│   └── docker-compose.yml     # Web panel docker-compose file
├── delivr-sdk-ota/            # React Native SDK
├── delivr-cli/                # Command-line interface
├── docker-compose.yml         # Root docker-compose (orchestrates both services)
└── launch_script.sh           # Automated launch script
```

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd delivr
   ```

2. **Create environment files** (see [Setup Instructions](#setup-instructions))

3. **Run the application** using one of the methods below

## Setup Instructions

### 1. Create Server Environment File

Create a `.env` file in `delivr-server-ota/api/` directory:

```bash
cd delivr-server-ota/api
touch .env
```

Add the following configuration (adjust values as needed):

```env
# Server Configuration
PORT=3010
NODE_ENV=development

# Database Configuration
DB_HOST=db
MYSQL_ROOT_PASSWORD=root
MYSQL_DATABASE=codepushdb

# Redis Configuration (optional)
REDIS_HOST=redis
REDIS_PORT=6379

# Storage Configuration
# For local development with LocalStack
AWS_ACCESS_KEY_ID=localstack
AWS_SECRET_ACCESS_KEY=localstack
S3_ENDPOINT=http://localstack:4566
S3_BUCKETNAME=delivr-ota-bucket
S3_REGION=us-east-1
MEMCACHED_SERVERS=memcached:11211
LOGIN_AUTHORIZED_DOMAINS=gmail.com 

# Add other required environment variables as per your setup
```

### 2. Create Web Panel Environment File

Create a `.env` file in `delivr-web-panel/` directory:

```bash
cd delivr-web-panel
touch .env
```

Add the following configuration:

```env
# Web Panel Configuration
PORT=3000
NODE_ENV=production

# Backend API URL
DELIVR_BACKEND_URL=http://localhost:3010

# Add other required environment variables as per your setup
```

**Note:** When running with the root `docker-compose.yml`, the `DELIVR_BACKEND_URL` will be automatically converted to use the Docker service name `api` instead of `localhost`.

## Running the Application

### Option 1: Using Launch Script (Recommended)

The `launch_script.sh` is an automated script that handles the entire startup process:

**Features:**
- ✅ Checks if Docker Desktop is installed and running
- ✅ Validates that `.env` files exist
- ✅ Reads port numbers from `.env` files
- ✅ Checks for port conflicts and prompts to stop conflicting processes
- ✅ Starts server first and waits for it to be healthy
- ✅ Then starts the web panel

**Usage:**

```bash
./launch_script.sh
```

**What it does:**
1. Validates Docker installation and status
2. Checks for required `.env` files in both server and web panel directories
3. Reads `PORT` from both `.env` files
4. Checks if ports are already in use
5. Prompts to stop conflicting processes if found
6. Starts the server docker-compose (`delivr-server-ota/api/docker-compose.yml`)
7. Waits 3 minutes for server initialization
8. Monitors server healthcheck for up to 3 minutes
9. Once server is healthy, starts the web panel docker-compose (`delivr-web-panel/docker-compose.yml`)
10. Displays final summary with service URLs

**Example Output:**
```
🔍 Checking Docker installation and status...
✅ Docker is installed
✅ Docker Desktop is running
✅ Docker Compose is available

🔍 Checking for required .env files...
✅ Server .env file found
✅ Web panel .env file found

🚀 Step 1: Starting Delivr API Server...
✅ Server docker-compose started

⏳ Step 2: Waiting for server to be healthy...
✅ Server is UP and HEALTHY!

🚀 Step 3: Starting Delivr Web Panel...
✅ Web panel docker-compose started

✅ All services started successfully!
```

### Option 2: Using Docker Compose

The root `docker-compose.yml` orchestrates both services together with health checks and dependencies.

**Usage:**

```bash
# Start both services
docker-compose up

# Start in detached mode (background)
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f api
docker-compose logs -f web
```

**What it does:**
- Starts all supporting services (MySQL, Redis, Memcached, LocalStack)
- Starts the API server with healthcheck monitoring
- Waits for API to be healthy before starting web panel
- Both services run in the same Docker network

**Services included:**
- `api` - Backend API server (port from `.env`, default: 3010)
- `web` - Frontend web panel (port from `.env`, default: 3000)
- `db` - MySQL database (port: 3306)
- `redis` - Redis cache (port: 6379)
- `memcached` - Memcached cache (port: 11211)
- `localstack` - LocalStack for S3 emulation (port: 4566)

### Running Individual Services

You can also run services individually:

**Start only the API server:**
```bash
docker-compose up api
```
This will also start all dependencies (db, redis, memcached, localstack).

**Start only the web panel:**
```bash
docker-compose up web
```
This will automatically start the API server and its dependencies first (due to `depends_on`).

**Start specific services:**
```bash
# Start only database and Redis
docker-compose up db redis

# Start API with dependencies
docker-compose up api
```

## Accessing the Services

Once the services are running:

- **Web Panel**: http://localhost:3000 (or port specified in `delivr-web-panel/.env`)
- **API Server**: http://localhost:3010 (or port specified in `delivr-server-ota/api/.env`)
- **API Healthcheck**: http://localhost:3010/healthcheck (or your configured port)
- **MySQL**: localhost:3306
- **Redis**: localhost:6379
- **LocalStack S3**: http://localhost:4566

## Troubleshooting

### Port Already in Use

If you get an error about ports being in use:

**Using launch_script.sh:**
- The script will automatically detect port conflicts and ask for permission to stop the process
- Answer `y` to stop the conflicting process, or `n` to exit and stop it manually

**Manual fix:**
```bash
# Find process using port 3010
lsof -i :3010

# Kill the process (replace PID with actual process ID)
kill -9 <PID>
```

### Docker Desktop Not Running

**Error:** `Docker Desktop is not running`

**Solution:** Start Docker Desktop application on your machine.

### .env File Missing

**Error:** `.env file not found`

**Solution:** Create the required `.env` files as described in [Setup Instructions](#setup-instructions).

### Server Not Becoming Healthy

**Symptoms:** Script waits for 6 minutes but server doesn't become healthy

**Solutions:**
1. Check server logs:
   ```bash
   docker-compose logs api
   ```
2. Verify database is running:
   ```bash
   docker-compose ps
   ```
3. Check if port is correct in `.env` file
4. Ensure all required environment variables are set

### Web Panel Can't Connect to API

**Symptoms:** Web panel starts but shows connection errors

**Solutions:**
1. Verify API is healthy:
   ```bash
   curl http://localhost:3010/healthcheck
   ```
2. Check `DELIVR_BACKEND_URL` in web panel `.env` file
3. When using root `docker-compose.yml`, the URL is automatically converted to use service name `api`

### Database Connection Issues

**Symptoms:** API fails to connect to database

**Solutions:**
1. Ensure MySQL container is running:
   ```bash
   docker-compose ps db
   ```
2. Check database credentials in server `.env` file
3. Restart the database:
   ```bash
   docker-compose restart db
   ```

### Viewing Logs

**View all logs:**
```bash
docker-compose logs -f
```

**View specific service logs:**
```bash
docker-compose logs -f api
docker-compose logs -f web
docker-compose logs -f db
```

**View last 100 lines:**
```bash
docker-compose logs --tail=100 api
```

### Stopping Services

**Stop all services:**
```bash
docker-compose down
```

**Stop and remove volumes (⚠️ deletes database data):**
```bash
docker-compose down -v
```

**Stop specific service:**
```bash
docker-compose stop api
docker-compose stop web
```

## Additional Resources

- **Server Documentation**: See `delivr-server-ota/docs/`
- **Web Panel Documentation**: See `delivr-web-panel/README.md`
- **SDK Documentation**: See `delivr-sdk-ota/README.md`
- **CLI Documentation**: See `delivr-cli/README.md`

## Support

For issues and questions, please check the individual component README files or open an issue in the repository.
