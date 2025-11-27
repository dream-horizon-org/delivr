# Delivr Setup Guide

Get Delivr running locally in 10 minutes with Docker.

---

## Overview

This guide will help you:
- ✅ Set up Delivr locally with Docker
- ✅ Configure all required services
- ✅ Create your first app in the dashboard
- ✅ Prepare for SDK integration

**What you'll get:**
- Web Dashboard at http://localhost:3000
- API Server at http://localhost:3010
- Complete local development environment

---

## Prerequisites

Before you begin, ensure you have:

- **Docker Desktop** (running) - [Download here](https://www.docker.com/products/docker-desktop)
- **Node.js 18+** - [Download here](https://nodejs.org/)
- **Git** - For cloning the repository

---

## Step 1: Clone Repository

```bash
git clone https://github.com/ds-horizon/delivr.git
cd delivr
```

---

## Step 2: Configure Environment

Delivr requires two `.env` files for local development.

### Server Environment File

Create `delivr-server-ota/api/.env`:

```bash
# Database Configuration
DB_DIALECT=mysql
DB_HOST=db
DB_PORT=3306
DB_NAME=codepushdb
DB_USER=root
DB_PASSWORD=root

# Server Configuration
NODE_ENV=development
PORT=3010

# Storage Configuration (LocalStack for local S3 emulation)
STORAGE_TYPE=s3
AWS_ENDPOINT=http://localstack:4566
AWS_BUCKET=codepush-bundles
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_REGION=us-east-1

# Cache Configuration
REDIS_URL=redis://redis:6379
MEMCACHED_SERVERS=memcached:11211

# Authentication (Optional - for Google OAuth)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

**Configuration Notes:**
- `DB_NAME=codepushdb` - Legacy database name (required)
- `AWS_ENDPOINT` - Points to LocalStack for local S3 emulation
- `STORAGE_TYPE=s3` - Uses S3-compatible storage locally
- Google OAuth is optional for local testing

### Web Panel Environment File

Create `delivr-web-panel/.env`:

```bash
# Web Panel Configuration
DELIVR_BACKEND_URL=http://localhost:3010
PORT=3000

# Authentication (Optional - must match server config)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

**Configuration Notes:**
- `DELIVR_BACKEND_URL` - Must point to your API server
- OAuth credentials must match server configuration

---

## Step 3: Launch Services

Run the automated launch script:

```bash
chmod +x launch_script.sh
./launch_script.sh
```

### What the Script Does

1. **Validates Environment**
   - ✅ Checks Docker is installed and running
   - ✅ Verifies `.env` files exist
   - ✅ Reads port configurations

2. **Handles Port Conflicts**
   - ✅ Detects if ports 3000 or 3010 are in use
   - ✅ Prompts to stop conflicting processes

3. **Starts Infrastructure**
   - ✅ MySQL database
   - ✅ Redis cache
   - ✅ Memcached
   - ✅ LocalStack (S3 emulation)

4. **Starts API Server**
   - ✅ Waits for server initialization (≈3 min)
   - ✅ Monitors health check endpoint
   - ✅ Ensures database migrations complete

5. **Starts Web Dashboard**
   - ✅ Connects to API server
   - ✅ Makes dashboard available

### Expected Output

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
ℹ️  Server: http://localhost:3010
ℹ️  Dashboard: http://localhost:3000
```

### Services Running

| Service | Port | Purpose |
|---------|------|---------|
| **Web Dashboard** | 3000 | Management UI for creating apps and deployments |
| **API Server** | 3010 | Backend for OTA updates and orchestration |
| **MySQL** | 3306 | Database for apps, deployments, and releases |
| **Redis** | 6379 | Analytics and real-time metrics |
| **Memcached** | 11211 | Response caching layer |
| **LocalStack** | 4566 | Local S3 emulation for bundle storage |

---

## Step 4: Verify Installation

### Check API Health

```bash
curl http://localhost:3010/healthcheck
```

**Expected response:**
```json
{"status":"ok"}
```

### Access Dashboard

Open in your browser:
```bash
open http://localhost:3000
```

Or manually navigate to: http://localhost:3000

---

## Step 5: Create Your First App

1. **Sign In** - Navigate to http://localhost:3000
2. **Create Organization** - Set up your organization
3. **Create App** - Click "New App" and configure:
   - App Name: `MyApp-iOS` or `MyApp-Android`
   - Platform: iOS or Android
4. **Copy Deployment Keys** - You'll see two keys:
   - **Staging** - For testing updates
   - **Production** - For live app updates

**⚠️ Important:** Save these deployment keys - you'll need them to integrate the SDK into your mobile app.

---

## Next Steps

### 1. Integrate SDK into Your Mobile App

**OTA Updates (React Native):**
- [Delivr SDK Overview](delivr-sdk-ota/README.md)
- [iOS Setup Guide](delivr-sdk-ota/docs/setup-ios.md)
- [Android Setup Guide](delivr-sdk-ota/docs/setup-android.md)
- [JavaScript API Reference](delivr-sdk-ota/docs/api-js.md)

_Note: OTA updates currently support React Native apps. Build Orchestration and Release Management (coming soon) will support all mobile apps._

### 2. Deploy Your First Update

**Using the CLI:**
- [CLI Overview](delivr-cli/README.md)
- [CLI Command Reference](delivr-cli/CLI_REFERENCE.md)
- [Complete Setup Guide](https://delivr.live/dota/full-setup)

### 3. Production Deployment

Ready to deploy to production?
- [AWS Deployment Guide](delivr-server-ota/docs/DEV_SETUP.md)
- [Azure Deployment Guide](delivr-server-ota/docs/DEV_SETUP.md)
- [On-Premises Setup](delivr-server-ota/docs/DEV_SETUP.md)

### 4. Advanced Features

- [Delta Patching Guide](https://delivr.live/dota/patch-update-guide)
- [Bytecode Optimization](https://delivr.live/dota/base-bytecode-optimization)
- [Multi-Deployment Testing](delivr-sdk-ota/docs/multi-deployment-testing.md)

---

## Troubleshooting

### Port Conflicts

**Problem:** Port 3000 or 3010 already in use

**Solution:**
- The launch script will automatically detect and offer to stop conflicting processes
- Answer `y` to stop the process automatically
- Or manually find and kill the process:

```bash
# Find process using port 3010
lsof -i :3010

# Kill the process (replace PID with actual process ID)
kill -9 <PID>
```

### Docker Not Running

**Problem:** `Docker Desktop is not running`

**Solution:**
1. Open Docker Desktop application
2. Wait for it to fully start (green icon in menu bar)
3. Retry `./launch_script.sh`

### Missing Environment Files

**Problem:** `.env file not found`

**Solution:**
1. Ensure you created both `.env` files:
   - `delivr-server-ota/api/.env`
   - `delivr-web-panel/.env`
2. Verify file names are exactly `.env` (not `.env.txt`)
3. Check files are not empty

### Service Health Issues

**Problem:** Server doesn't become healthy after 6 minutes

**Solutions:**

1. **Check server logs:**
   ```bash
   docker-compose logs api
   ```

2. **Verify all services are running:**
   ```bash
   docker-compose ps
   ```

3. **Check database is ready:**
   ```bash
   docker-compose logs db
   ```

4. **Restart problematic service:**
   ```bash
   docker-compose restart api
   ```

### Web Panel Can't Connect to API

**Problem:** Dashboard shows connection errors

**Solutions:**

1. **Verify API is responding:**
   ```bash
   curl http://localhost:3010/healthcheck
   ```

2. **Check DELIVR_BACKEND_URL:**
   - Open `delivr-web-panel/.env`
   - Ensure `DELIVR_BACKEND_URL=http://localhost:3010`

3. **Check API logs:**
   ```bash
   docker-compose logs api
   ```

### Database Connection Issues

**Problem:** API can't connect to database

**Solutions:**

1. **Check MySQL is running:**
   ```bash
   docker-compose ps db
   ```

2. **Verify database credentials** in `delivr-server-ota/api/.env`

3. **Reset database (⚠️ deletes all data):**
   ```bash
   docker-compose down -v
   ./launch_script.sh
   ```

### View Detailed Logs

**All services:**
```bash
docker-compose logs -f
```

**Specific service:**
```bash
docker-compose logs -f api      # API server
docker-compose logs -f web      # Web dashboard
docker-compose logs -f db       # MySQL database
docker-compose logs -f redis    # Redis cache
```

**Last 100 lines:**
```bash
docker-compose logs --tail=100 api
```

---

## Managing Services

### Stop All Services

```bash
docker-compose down
```

### Stop and Remove All Data

**⚠️ Warning:** This deletes all database data, apps, and deployments

```bash
docker-compose down -v
```

### Restart Specific Service

```bash
docker-compose restart api
docker-compose restart web
```

### Rebuild Services

If you've made changes to code or Docker configuration:

```bash
docker-compose up --build
```

---

## Alternative: Manual Docker Compose

Instead of using `launch_script.sh`, you can manually control services:

```bash
# Start all services
docker-compose up

# Start in background (detached mode)
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f
```

---

## Production Deployment

**This setup is for local development only.**

For production deployment:
- Use managed databases (AWS RDS, Azure SQL)
- Use real S3/Azure Blob storage (not LocalStack)
- Configure proper authentication
- Set up SSL/TLS certificates
- Use production-grade infrastructure

**See:** [Production Deployment Guide](delivr-server-ota/docs/DEV_SETUP.md)

---

## Getting Help

- **Documentation:** [delivr.live](https://delivr.live)
- **GitHub Issues:** [Report bugs](https://github.com/ds-horizon/delivr/issues)
- **GitHub Discussions:** [Ask questions](https://github.com/ds-horizon/delivr/discussions)
- **Component Docs:** Check individual component READMEs

---

**Next:** [Integrate SDK](delivr-sdk-ota/README.md) | [Deploy Updates](delivr-cli/README.md) | [Full Documentation](https://delivr.live)

