#!/bin/bash
# dev-docker.sh - Run application in Docker with hot reload
#
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
API_DIR="$PROJECT_ROOT"

# Default values
COMMAND=""
FOLLOW_LOGS=false
SKIP_CONFIRM=false

# Parse arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        fresh|clear-data|rebuild)
            COMMAND="$1"
            ;;
        --logs)
            FOLLOW_LOGS=true
            ;;
        --yes|-y)
            SKIP_CONFIRM=true
            ;;
        -h|--help)
            echo "Usage: $0 <command> [options]"
            echo ""
            echo "Commands:"
            echo "  (none)       Start containers (creates .env if missing, preserves data)"
            echo "  fresh        Complete reset - removes volumes, rewrites .env, new API key"
            echo "  clear-data   Removes volumes but keeps .env (except new Cronicle API key)"
            echo "  rebuild      Rebuild containers only, preserves volumes and data"
            echo ""
            echo "Options:"
            echo "  --logs       Follow logs after starting"
            echo "  --yes, -y    Skip confirmation prompts"
            echo "  -h, --help   Show this help"
            echo ""
            echo "Examples:"
            echo "  $0                    # Normal start"
            echo "  $0 fresh --logs       # Fresh start + follow logs"
            echo "  $0 clear-data -y      # Clear data without confirmation"
            echo "  $0 rebuild            # Rebuild containers only"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
    shift
done

# -----------------------------------------------------------------------------
# Confirmation helper
# -----------------------------------------------------------------------------
confirm() {
    local message="$1"
    local warning="$2"
    
    if [ "$SKIP_CONFIRM" = true ]; then
        return 0
    fi
    
    echo ""
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}  ⚠️  WARNING${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${YELLOW}$warning${NC}"
    echo ""
    read -p "$(echo -e ${BOLD}$message ${NC}[y/N]: )" -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Aborted.${NC}"
        exit 0
    fi
}

# -----------------------------------------------------------------------------
# Header
# -----------------------------------------------------------------------------
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Delivr Server OTA - Docker Development Mode${NC}"
if [ -n "$COMMAND" ]; then
    echo -e "${BLUE}  Mode: ${BOLD}${COMMAND}${NC}"
fi
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cd "$API_DIR"

# -----------------------------------------------------------------------------
# Handle commands with confirmation
# -----------------------------------------------------------------------------

REMOVE_VOLUMES=false
REWRITE_ENV=false
REBUILD_CONTAINERS=false
FORCE_NEW_API_KEY=false

case "$COMMAND" in
    fresh)
        confirm "Are you sure you want to perform a FRESH start?" \
            "This will:\n  • Stop and remove ALL containers\n  • DELETE ALL VOLUMES (database data, Cronicle data, etc.)\n  • Rewrite .env file with defaults\n  • Generate a new Cronicle API key\n\n  All existing data will be PERMANENTLY LOST!"
        REMOVE_VOLUMES=true
        REWRITE_ENV=true
        REBUILD_CONTAINERS=true
        FORCE_NEW_API_KEY=true
        ;;
    clear-data)
        confirm "Are you sure you want to CLEAR DATA?" \
            "This will:\n  • Stop and remove ALL containers\n  • DELETE ALL VOLUMES (database data, Cronicle data, etc.)\n  • Keep existing .env (except Cronicle API key)\n  • Generate a new Cronicle API key\n\n  All database and Cronicle data will be PERMANENTLY LOST!"
        REMOVE_VOLUMES=true
        REWRITE_ENV=false
        REBUILD_CONTAINERS=true
        FORCE_NEW_API_KEY=true
        ;;
    rebuild)
        echo -e "\n${YELLOW}Rebuild mode - containers will be rebuilt, data preserved${NC}"
        REMOVE_VOLUMES=false
        REWRITE_ENV=false
        REBUILD_CONTAINERS=true
        FORCE_NEW_API_KEY=false
        ;;
    "")
        # Normal start - no special handling
        REMOVE_VOLUMES=false
        REWRITE_ENV=false
        REBUILD_CONTAINERS=false
        FORCE_NEW_API_KEY=false
        ;;
esac

# -----------------------------------------------------------------------------
# Step 0: Clean up if needed
# -----------------------------------------------------------------------------
if [ "$REMOVE_VOLUMES" = true ]; then
    echo -e "\n${YELLOW}[0/5]${NC} Removing containers and volumes..."
    docker compose --profile dev down -v --remove-orphans 2>/dev/null || true
    echo -e "  ${GREEN}✓${NC} Cleaned up"
fi

# -----------------------------------------------------------------------------
# Step 1: Ensure .env file exists
# -----------------------------------------------------------------------------
echo -e "\n${YELLOW}[1/5]${NC} Checking .env file..."

if [ "$REWRITE_ENV" = true ] || [ ! -f .env ] || [ ! -s .env ] || ! grep -q "^DB_HOST=" .env 2>/dev/null; then
    if [ "$REWRITE_ENV" = true ]; then
        echo -e "  Rewriting .env file from .env.example..."
    else
        echo -e "  Creating .env file from .env.example..."
    fi
    
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "  ${GREEN}✓${NC} .env file created from .env.example"
    else
        echo -e "  ${RED}✗${NC} .env.example not found"
        exit 1
    fi
else
    echo -e "  ${GREEN}✓${NC} .env file exists"
fi

# -----------------------------------------------------------------------------
# Step 2: Setup Cronicle API Key
# -----------------------------------------------------------------------------
echo -e "\n${YELLOW}[2/5]${NC} Setting up Cronicle..."

# Start Cronicle first to get API key
docker compose --profile dev up -d cronicle

# Wait for Cronicle to be ready
echo -e "  Waiting for Cronicle to be ready..."
MAX_WAIT=30
for i in $(seq 1 $MAX_WAIT); do
    if curl -s http://localhost:3012/api/app/ping > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} Cronicle is ready"
        break
    fi
    if [ $i -eq $MAX_WAIT ]; then
        echo -e "  ${RED}✗${NC} Cronicle failed to start"
        exit 1
    fi
    sleep 2
done

# Check if we need to create API key
EXISTING_KEY=$(grep -s "^CRONICLE_API_KEY=" .env 2>/dev/null | cut -d'=' -f2 || echo "")

if [ "$FORCE_NEW_API_KEY" = true ] || [ -z "$EXISTING_KEY" ] || [ "$EXISTING_KEY" = "" ]; then
    echo -e "  Creating Cronicle API key..."
    
    # Login to get session
    LOGIN_RESPONSE=$(curl -s -c - 'http://localhost:3012/api/user/login' \
        -H 'Content-Type: application/json' \
        -d '{"username":"admin","password":"admin"}')
    
    SESSION_ID=$(echo "$LOGIN_RESPONSE" | grep -o '"session_id":"[^"]*"' | cut -d'"' -f4)
    
    if [ -z "$SESSION_ID" ]; then
        echo -e "  ${RED}✗${NC} Failed to login to Cronicle"
        exit 1
    fi
    
    # Generate random API key
    API_KEY=$(openssl rand -hex 16)
    
    # Create API key
    CREATE_RESPONSE=$(curl -s "http://localhost:3012/api/app/create_api_key?session_id=$SESSION_ID" \
        -H 'Content-Type: application/json' \
        -d "{\"title\":\"DevKey-$(date +%s)\",\"key\":\"$API_KEY\",\"active\":1,\"privileges\":{\"admin\":1}}")
    
    if echo "$CREATE_RESPONSE" | grep -q '"code":0'; then
        # Update .env file
        if grep -q "^CRONICLE_API_KEY=" .env; then
            sed -i '' "s/^CRONICLE_API_KEY=.*/CRONICLE_API_KEY=$API_KEY/" .env
        else
            echo "CRONICLE_API_KEY=$API_KEY" >> .env
        fi
        export CRONICLE_API_KEY="$API_KEY"
        echo -e "  ${GREEN}✓${NC} API key created and saved"
    else
        echo -e "  ${YELLOW}⚠${NC} Could not create API key (may already exist)"
    fi
else
    export CRONICLE_API_KEY="$EXISTING_KEY"
    echo -e "  ${GREEN}✓${NC} Using existing API key"
fi

# -----------------------------------------------------------------------------
# Step 3: Start infrastructure containers
# -----------------------------------------------------------------------------
echo -e "\n${YELLOW}[3/5]${NC} Starting infrastructure containers..."
docker compose --profile dev up -d db redis memcached localstack
echo -e "  ${GREEN}✓${NC} Infrastructure started"

# Wait for MySQL
echo -e "  Waiting for MySQL..."
MAX_WAIT=30
for i in $(seq 1 $MAX_WAIT); do
    if docker compose --profile dev exec -T db mysqladmin ping -h localhost -u root -proot > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} MySQL is ready"
        break
    fi
    if [ $i -eq $MAX_WAIT ]; then
        echo -e "  ${RED}✗${NC} MySQL failed to start"
        exit 1
    fi
    sleep 2
done

# Create database if not exists
echo -e "  Creating database if not exists..."
docker compose --profile dev exec -T db mysql -u root -proot -e "CREATE DATABASE IF NOT EXISTS delivrdb;" 2>/dev/null
echo -e "  ${GREEN}✓${NC} Database ready"

# -----------------------------------------------------------------------------
# Step 4: Start app container
# -----------------------------------------------------------------------------
echo -e "\n${YELLOW}[4/5]${NC} Starting app container..."

BUILD_FLAG=""
if [ "$REBUILD_CONTAINERS" = true ]; then
    BUILD_FLAG="--build"
    echo -e "  Rebuilding app container..."
fi

docker compose --profile dev up -d $BUILD_FLAG app-dev

# Wait for app container to be ready
echo -e "  Waiting for app container..."
sleep 5

# -----------------------------------------------------------------------------
# Step 5: Create database schema
# -----------------------------------------------------------------------------
echo -e "\n${YELLOW}[5/5]${NC} Creating database schema..."
if docker compose --profile dev exec -T app-dev ts-node -r dotenv/config /app/api/setup/create-schema.ts > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} Database schema created"
else
    echo -e "  ${YELLOW}⚠${NC} Schema creation had issues (may already exist)"
fi

# -----------------------------------------------------------------------------
# Done!
# -----------------------------------------------------------------------------
echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Docker Development Environment Ready!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "\n${YELLOW}Hot Reload:${NC}"
echo -e "  • File changes in ./api/script/ trigger auto-restart"

echo -e "\n${YELLOW}URLs:${NC}"
echo -e "  • API Server:  http://localhost:3010"
echo -e "  • Cronicle UI: http://localhost:3012"

echo -e "\n${YELLOW}Commands:${NC}"
echo -e "  • View logs:        $0 --logs"
echo -e "  • Rebuild:          $0 rebuild"
echo -e "  • Clear data:       $0 clear-data"
echo -e "  • Fresh start:      $0 fresh"
echo -e "  • Stop:             docker compose --profile dev down"

# Follow logs if requested
if [ "$FOLLOW_LOGS" = true ]; then
    echo -e "\n${YELLOW}Following logs (Ctrl+C to stop)...${NC}\n"
    docker compose --profile dev logs -f app-dev
fi
