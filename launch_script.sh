#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Script directory (root of the repo)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_ENV_FILE="${SCRIPT_DIR}/delivr-server-ota/api/.env"
WEB_ENV_FILE="${SCRIPT_DIR}/delivr-web-panel/.env"
SERVER_COMPOSE_FILE="${SCRIPT_DIR}/delivr-server-ota/api/docker-compose.yml"
WEB_COMPOSE_FILE="${SCRIPT_DIR}/delivr-web-panel/docker-compose.yml"

# Function to print error and exit
error_exit() {
    echo -e "${RED}❌ Error: $1${NC}" >&2
    exit 1
}

# Function to print success message
success_msg() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to print info message
info_msg() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Function to check if port is in use (returns 0 if in use, 1 if available)
check_port_in_use() {
    local port=$1
    if command -v lsof > /dev/null 2>&1; then
        lsof -ti:$port > /dev/null 2>&1
        return $?
    elif command -v netstat > /dev/null 2>&1; then
        netstat -tuln 2>/dev/null | grep -q ":$port "
        return $?
    elif command -v ss > /dev/null 2>&1; then
        ss -tuln 2>/dev/null | grep -q ":$port "
        return $?
    else
        # Fallback: try to connect to the port
        (echo > /dev/tcp/localhost/$port) 2>/dev/null
        return $?
    fi
}

# Function to kill process on port
kill_process_on_port() {
    local port=$1
    local pid=""
    
    if command -v lsof > /dev/null 2>&1; then
        pid=$(lsof -ti:$port 2>/dev/null)
    elif command -v netstat > /dev/null 2>&1; then
        pid=$(netstat -tulnp 2>/dev/null | grep ":$port " | awk '{print $7}' | cut -d'/' -f1 | head -1)
    elif command -v ss > /dev/null 2>&1; then
        pid=$(ss -tulnp 2>/dev/null | grep ":$port " | grep -oP 'pid=\K[0-9]+' | head -1)
    fi
    
    if [ -n "$pid" ] && [ "$pid" != "" ]; then
        info_msg "Killing process $pid on port $port..."
        kill -9 $pid 2>/dev/null || sudo kill -9 $pid 2>/dev/null
        sleep 1
        # Verify process is killed
        sleep 1
        if check_port_in_use "$port"; then
            error_exit "Failed to kill process on port $port. Please stop it manually."
        else
            success_msg "Process on port $port has been stopped"
        fi
    fi
}

# Check if Docker is installed and running
echo "🔍 Checking Docker installation and status..."

if ! command -v docker > /dev/null 2>&1; then
    error_exit "Docker is not installed. Please install Docker Desktop first."
fi
success_msg "Docker is installed"

if ! docker info > /dev/null 2>&1; then
    error_exit "Docker Desktop is not running. Please start Docker Desktop first."
fi
success_msg "Docker Desktop is running"

# Check if docker compose is available
if ! docker compose version > /dev/null 2>&1; then
    error_exit "Docker Compose is not available. Please ensure Docker Desktop includes Docker Compose."
fi
success_msg "Docker Compose is available"

# Check if .env files exist
echo ""
echo "🔍 Checking for required .env files..."

if [ ! -f "$SERVER_ENV_FILE" ]; then
    error_exit ".env file not found at: $SERVER_ENV_FILE"
fi
success_msg "Server .env file found: $SERVER_ENV_FILE"

if [ ! -f "$WEB_ENV_FILE" ]; then
    error_exit ".env file not found at: $WEB_ENV_FILE"
fi
success_msg "Web panel .env file found: $WEB_ENV_FILE"

# Read PORT from server's .env file
info_msg "Reading PORT from server .env file..."
SERVER_PORT=$(grep -E "^PORT=" "$SERVER_ENV_FILE" | cut -d '=' -f2 | tr -d ' ' | tr -d '"' | tr -d "'" || echo "")

# Also check for API_PORT as fallback
if [ -z "$SERVER_PORT" ] || [ "$SERVER_PORT" = "" ]; then
    SERVER_PORT=$(grep -E "^API_PORT=" "$SERVER_ENV_FILE" | cut -d '=' -f2 | tr -d ' ' | tr -d '"' | tr -d "'" || echo "")
fi

# Default to 3010 if still not found
if [ -z "$SERVER_PORT" ] || [ "$SERVER_PORT" = "" ]; then
    info_msg "PORT not found in server .env file, defaulting to 3010"
    SERVER_PORT=3010
else
    success_msg "Found server PORT: $SERVER_PORT"
fi

# Read PORT from web panel's .env file
info_msg "Reading PORT from web panel .env file..."
WEB_PORT=$(grep -E "^PORT=" "$WEB_ENV_FILE" | cut -d '=' -f2 | tr -d ' ' | tr -d '"' | tr -d "'" || echo "")

# Default to 3000 if not found
if [ -z "$WEB_PORT" ] || [ "$WEB_PORT" = "" ]; then
    info_msg "PORT not found in web panel .env file, defaulting to 3000"
    WEB_PORT=3000
else
    success_msg "Found web panel PORT: $WEB_PORT"
fi

# Check if ports are in use
echo ""
echo "🔍 Checking if ports are already in use..."

# Check server port
if check_port_in_use "$SERVER_PORT"; then
    info_msg "Port $SERVER_PORT (server) is already in use"
    echo -e "${YELLOW}⚠️  A process is running on port $SERVER_PORT${NC}"
    read -p "Do you want to stop the process on port $SERVER_PORT? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kill_process_on_port "$SERVER_PORT"
    else
        error_exit "Cannot proceed. Port $SERVER_PORT is in use. Please stop the process manually."
    fi
else
    success_msg "Port $SERVER_PORT (server) is available"
fi

# Check web panel port
if check_port_in_use "$WEB_PORT"; then
    info_msg "Port $WEB_PORT (web panel) is already in use"
    echo -e "${YELLOW}⚠️  A process is running on port $WEB_PORT${NC}"
    read -p "Do you want to stop the process on port $WEB_PORT? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kill_process_on_port "$WEB_PORT"
    else
        error_exit "Cannot proceed. Port $WEB_PORT is in use. Please stop the process manually."
    fi
else
    success_msg "Port $WEB_PORT (web panel) is available"
fi

# Check if docker-compose files exist
if [ ! -f "$SERVER_COMPOSE_FILE" ]; then
    error_exit "Server docker-compose.yml not found at: $SERVER_COMPOSE_FILE"
fi

if [ ! -f "$WEB_COMPOSE_FILE" ]; then
    error_exit "Web panel docker-compose.yml not found at: $WEB_COMPOSE_FILE"
fi

# Step 1: Start server docker-compose
echo ""
echo "🚀 Step 1: Starting Delivr API Server..."
SERVER_COMPOSE_DIR="$(dirname "$SERVER_COMPOSE_FILE")"
SERVER_COMPOSE_FILE_NAME="$(basename "$SERVER_COMPOSE_FILE")"
info_msg "Running: docker compose -f $SERVER_COMPOSE_FILE_NAME up -d"
cd "$SERVER_COMPOSE_DIR" || error_exit "Failed to change directory to server compose location"

docker compose -f "$SERVER_COMPOSE_FILE_NAME" up -d || error_exit "Failed to start server docker-compose"

success_msg "Server docker-compose started"

# Step 2: Wait for server to be healthy
echo ""
echo "⏳ Step 2: Waiting for server to be healthy..."
HEALTHCHECK_URL="http://localhost:${SERVER_PORT}/healthcheck"
MAX_ATTEMPTS=90
ATTEMPT=0

info_msg "Healthcheck URL: $HEALTHCHECK_URL"
info_msg "Initial wait for server setup: 180 seconds (3 minutes) before starting healthcheck..."
info_msg "Then checking healthcheck for up to: $((MAX_ATTEMPTS * 2)) seconds (3 minutes)"

# Initial wait of 3 minutes before starting healthcheck
INITIAL_WAIT=180
info_msg "Waiting ${INITIAL_WAIT} seconds for server to setup and seed data..."
sleep ${INITIAL_WAIT}
info_msg "Initial wait complete. Starting healthcheck monitoring..."

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    # Check if healthcheck endpoint responds with 200
    if curl -f -s "$HEALTHCHECK_URL" > /dev/null 2>&1; then
        success_msg "Server is UP and HEALTHY!"
        success_msg "Healthcheck endpoint responded successfully"
        break
    fi
    
    ATTEMPT=$((ATTEMPT + 1))
    if [ $((ATTEMPT % 5)) -eq 0 ]; then
        info_msg "Still waiting... (attempt ${ATTEMPT}/${MAX_ATTEMPTS})"
    fi
    sleep 2
done

if [ $ATTEMPT -ge $MAX_ATTEMPTS ]; then
    error_exit "Server did not become healthy within expected time. Please check server logs."
fi

# Step 3: Start web panel docker-compose
echo ""
echo "🚀 Step 3: Starting Delivr Web Panel..."
WEB_COMPOSE_DIR="$(dirname "$WEB_COMPOSE_FILE")"
WEB_COMPOSE_FILE_NAME="$(basename "$WEB_COMPOSE_FILE")"
info_msg "Running: docker compose -f $WEB_COMPOSE_FILE_NAME up -d"
cd "$WEB_COMPOSE_DIR" || error_exit "Failed to change directory to web panel compose location"

docker compose -f "$WEB_COMPOSE_FILE_NAME" up -d || error_exit "Failed to start web panel docker-compose"

success_msg "Web panel docker-compose started"

# Final summary
echo ""
echo "=========================================="
success_msg "All services started successfully!"
echo "=========================================="
echo ""
info_msg "Server is running on: http://localhost:${SERVER_PORT}"
info_msg "Server healthcheck: http://localhost:${SERVER_PORT}/healthcheck"
info_msg "Web panel is running on: http://localhost:${WEB_PORT}"
echo ""
