#!/bin/bash

# ============================================================================
# JIRA Integration - Simple Test Suite
# Tests Integration and Configuration APIs
# ============================================================================

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BASE_URL="http://localhost:3010"
JIRA_URL="https://mycompany.atlassian.net"
API_TOKEN="test_api_token_12345"
EMAIL="admin@mycompany.com"

# Test counters
PASSED=0
FAILED=0

# Print functions
success() { echo -e "${GREEN}✓ $1${NC}"; PASSED=$((PASSED + 1)); }
fail() { echo -e "${RED}✗ $1${NC}"; FAILED=$((FAILED + 1)); }
info() { echo -e "${BLUE}ℹ $1${NC}"; }
header() { echo -e "\n${YELLOW}═══ $1 ═══${NC}\n"; }

# Store IDs
TENANT_ID=""
CONFIG_ID=""

header "JIRA API TEST SUITE"
info "Base URL: $BASE_URL\n"

# ============================================================================
# STEP 0: Find a valid tenant ID
# ============================================================================
info "Finding valid tenant ID..."

# Try common tenant IDs or patterns
for tid in "tenant_1" "test_tenant" "demo_tenant"; do
    RESPONSE=$(curl -s -X GET "$BASE_URL/tenants" 2>/dev/null || echo "")
    if [ -n "$RESPONSE" ]; then
        # Try to extract first tenant ID from response
        TENANT_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
        if [ -n "$TENANT_ID" ]; then
            info "Found tenant ID: $TENANT_ID"
            break
        fi
    fi
    
    # If API doesn't work, try hardcoded values
    TENANT_ID=$tid
    # Test if this tenant works by trying to read (should get 404, not foreign key error)
    TEST=$(curl -s -X GET "$BASE_URL/tenants/$TENANT_ID/integrations/jira" 2>/dev/null || echo "")
    if [ -n "$TEST" ]; then
        if ! echo "$TEST" | grep -q "foreign key"; then
            info "Using tenant ID: $TENANT_ID"
            break
        fi
    fi
done

if [ -z "$TENANT_ID" ]; then
    echo -e "${RED}✗ Cannot find valid tenant ID. Please provide a valid tenant ID.${NC}"
    echo -e "${YELLOW}Usage: TENANT_ID=your_tenant_id ./test-jira-complete.sh${NC}"
    exit 1
fi

# ============================================================================
# TEST 1: JIRA INTEGRATION (CREDENTIALS)
# ============================================================================
header "TEST 1: JIRA INTEGRATION APIs"

info "1.1 Creating JIRA Integration..."
RESPONSE=$(curl -s -X POST "$BASE_URL/tenants/$TENANT_ID/integrations/jira" \
  -H "Content-Type: application/json" \
  -d "{
    \"jiraInstanceUrl\": \"$JIRA_URL\",
    \"apiToken\": \"$API_TOKEN\",
    \"email\": \"$EMAIL\",
    \"jiraType\": \"JIRA_CLOUD\",
    \"isEnabled\": true
  }")

if echo "$RESPONSE" | grep -q '"success":true'; then
    success "Create Integration"
elif echo "$RESPONSE" | grep -q "foreign key"; then
    fail "Create Integration - Invalid tenant ID: $TENANT_ID"
    info "   Please use: TENANT_ID=your_valid_tenant_id ./test-jira-complete.sh"
    exit 1
else
    fail "Create Integration"
    info "   Response: $(echo $RESPONSE | head -c 200)"
fi

info "1.2 Reading JIRA Integration..."
RESPONSE=$(curl -s -X GET "$BASE_URL/tenants/$TENANT_ID/integrations/jira")
if echo "$RESPONSE" | grep -q '"success":true'; then
    success "Read Integration"
else
    fail "Read Integration"
fi

info "1.3 Testing JIRA Connection..."
RESPONSE=$(curl -s -X POST "$BASE_URL/tenants/$TENANT_ID/integrations/jira/test")
if echo "$RESPONSE" | grep -q '"success":true'; then
    success "Test Connection"
else
    fail "Test Connection"
fi

info "1.4 Updating JIRA Integration..."
RESPONSE=$(curl -s -X POST "$BASE_URL/tenants/$TENANT_ID/integrations/jira" \
  -H "Content-Type: application/json" \
  -d "{
    \"jiraInstanceUrl\": \"$JIRA_URL\",
    \"apiToken\": \"$API_TOKEN\",
    \"email\": \"updated@mycompany.com\",
    \"jiraType\": \"JIRA_CLOUD\",
    \"isEnabled\": true
  }")

if echo "$RESPONSE" | grep -q '"success":true'; then
    success "Update Integration"
else
    fail "Update Integration"
fi

# ============================================================================
# TEST 2: JIRA CONFIGURATION
# ============================================================================
header "TEST 2: JIRA CONFIGURATION APIs"

info "2.1 Creating JIRA Configuration..."
RESPONSE=$(curl -s -X POST "$BASE_URL/tenants/$TENANT_ID/jira/configurations" \
  -H "Content-Type: application/json" \
  -d '{
    "configName": "Test Config",
    "description": "Test configuration",
    "platformsConfig": {
      "WEB": {
        "projectKey": "FE",
        "readyToReleaseState": "Done"
      },
      "IOS": {
        "projectKey": "MOBILE",
        "readyToReleaseState": "Ready for Production"
      },
      "ANDROID": {
        "projectKey": "MOBILE",
        "readyToReleaseState": "Ready for Production"
      }
    }
  }')

if echo "$RESPONSE" | grep -q '"success":true'; then
    success "Create Configuration"
    CONFIG_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    info "   Config ID: $CONFIG_ID"
else
    fail "Create Configuration"
    info "   Response: $(echo $RESPONSE | head -c 200)"
fi

info "2.2 Reading All Configurations..."
RESPONSE=$(curl -s -X GET "$BASE_URL/tenants/$TENANT_ID/jira/configurations")
if echo "$RESPONSE" | grep -q '"success":true'; then
    success "Read All Configurations"
else
    fail "Read All Configurations"
fi

info "2.3 Reading Single Configuration..."
RESPONSE=$(curl -s -X GET "$BASE_URL/tenants/$TENANT_ID/jira/configurations/$CONFIG_ID")
if echo "$RESPONSE" | grep -q '"success":true'; then
    success "Read Single Configuration"
else
    fail "Read Single Configuration"
fi

info "2.4 Updating Configuration..."
RESPONSE=$(curl -s -X PUT "$BASE_URL/tenants/$TENANT_ID/jira/configurations/$CONFIG_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "configName": "Updated Config",
    "description": "Updated description",
    "platformsConfig": {
      "WEB": {
        "projectKey": "FE",
        "readyToReleaseState": "Ready to Deploy"
      }
    }
  }')

if echo "$RESPONSE" | grep -q '"success":true'; then
    success "Update Configuration"
else
    fail "Update Configuration"
fi

info "2.5 Verifying Configuration..."
RESPONSE=$(curl -s -X POST "$BASE_URL/tenants/$TENANT_ID/jira/configurations/$CONFIG_ID/verify")
if echo "$RESPONSE" | grep -q '"success":true'; then
    success "Verify Configuration"
    VALID=$(echo "$RESPONSE" | grep -o '"valid":[^,}]*' | cut -d':' -f2)
    info "   Validation result: $VALID"
else
    fail "Verify Configuration"
fi

# ============================================================================
# TEST 3: NEGATIVE TESTS
# ============================================================================
header "TEST 3: NEGATIVE TESTS"

info "3.1 Get Non-existent Configuration..."
RESPONSE=$(curl -s -X GET "$BASE_URL/tenants/$TENANT_ID/jira/configurations/non_existent")
if echo "$RESPONSE" | grep -q '"success":false'; then
    success "Properly Handles Non-existent Config"
else
    fail "Should Return Error for Non-existent Config"
fi

info "3.2 Create Config with Invalid Project Key..."
RESPONSE=$(curl -s -X POST "$BASE_URL/tenants/$TENANT_ID/jira/configurations" \
  -H "Content-Type: application/json" \
  -d '{
    "configName": "Invalid",
    "platformsConfig": {
      "WEB": {
        "projectKey": "invalid-123",
        "readyToReleaseState": "Done"
      }
    }
  }')

if echo "$RESPONSE" | grep -q '"success":false'; then
    success "Properly Validates Project Key"
else
    fail "Should Reject Invalid Project Key"
fi

info "3.3 Create Config with Missing Fields..."
RESPONSE=$(curl -s -X POST "$BASE_URL/tenants/$TENANT_ID/jira/configurations" \
  -H "Content-Type: application/json" \
  -d '{"configName": "Incomplete"}')

if echo "$RESPONSE" | grep -q '"success":false'; then
    success "Properly Validates Required Fields"
else
    fail "Should Reject Missing Fields"
fi

# ============================================================================
# TEST 4: CLEANUP
# ============================================================================
header "TEST 4: CLEANUP"

info "4.1 Deleting Configuration..."
RESPONSE=$(curl -s -X DELETE "$BASE_URL/tenants/$TENANT_ID/jira/configurations/$CONFIG_ID")
if echo "$RESPONSE" | grep -q '"success":true'; then
    success "Delete Configuration"
else
    fail "Delete Configuration"
fi

info "4.2 Verifying Config is Inactive..."
RESPONSE=$(curl -s -X GET "$BASE_URL/tenants/$TENANT_ID/jira/configurations/$CONFIG_ID")
if echo "$RESPONSE" | grep -q '"isActive":false'; then
    success "Configuration Marked Inactive"
else
    fail "Configuration Should be Inactive"
fi

info "4.3 Deleting Integration..."
RESPONSE=$(curl -s -X DELETE "$BASE_URL/tenants/$TENANT_ID/integrations/jira")
if echo "$RESPONSE" | grep -q '"success":true'; then
    success "Delete Integration"
else
    fail "Delete Integration"
fi

# ============================================================================
# SUMMARY
# ============================================================================
header "TEST SUMMARY"
TOTAL=$((PASSED + FAILED))
echo -e "Total Tests: $TOTAL"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✓ All tests passed!${NC}\n"
    exit 0
else
    echo -e "\n${RED}✗ $FAILED test(s) failed!${NC}\n"
    exit 1
fi
