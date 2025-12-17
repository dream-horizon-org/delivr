#!/bin/bash

# Test Distribution Stage Mock Data
# This script verifies all mock endpoints and data are working correctly

echo "🧪 Testing Distribution Stage Mock Data"
echo "========================================"
echo ""

BASE_URL="http://localhost:4000"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to test an endpoint
test_endpoint() {
  local method=$1
  local endpoint=$2
  local expected_status=$3
  local description=$4
  
  echo -n "Testing: $description ... "
  
  response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint")
  status_code=$(echo "$response" | tail -n 1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$status_code" -eq "$expected_status" ]; then
    echo -e "${GREEN}✓ PASS${NC} (HTTP $status_code)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    return 0
  else
    echo -e "${RED}✗ FAIL${NC} (Expected HTTP $expected_status, got $status_code)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    return 1
  fi
}

# Function to test JSON response
test_json_field() {
  local method=$1
  local endpoint=$2
  local jq_query=$3
  local expected_value=$4
  local description=$5
  
  echo -n "Testing: $description ... "
  
  response=$(curl -s -X $method "$BASE_URL$endpoint")
  actual_value=$(echo "$response" | jq -r "$jq_query")
  
  if [ "$actual_value" = "$expected_value" ]; then
    echo -e "${GREEN}✓ PASS${NC} (Value: $actual_value)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    return 0
  else
    echo -e "${RED}✗ FAIL${NC} (Expected: $expected_value, Got: $actual_value)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    return 1
  fi
}

echo "📋 Test 1: GET /api/v1/releases/:releaseId/distribution"
echo "--------------------------------------------------------"
test_endpoint "GET" "/api/v1/releases/rel_test_dist_pending/distribution" 200 "Fetch pending distribution"
test_json_field "GET" "/api/v1/releases/rel_test_dist_pending/distribution" ".data.status" "PENDING" "Distribution status is PENDING"
test_json_field "GET" "/api/v1/releases/rel_test_dist_pending/distribution" ".data.submissions | length" "2" "Has 2 submissions (Android + iOS)"
echo ""

echo "📋 Test 2: Check pending submissions details"
echo "--------------------------------------------------------"
test_json_field "GET" "/api/v1/releases/rel_test_dist_pending/distribution" '.data.submissions[] | select(.platform=="ANDROID") | .status' "PENDING" "Android submission is PENDING"
test_json_field "GET" "/api/v1/releases/rel_test_dist_pending/distribution" '.data.submissions[] | select(.platform=="IOS") | .status' "PENDING" "iOS submission is PENDING"
echo ""

echo "📋 Test 3: GET /api/v1/releases/:releaseId/distribution (Submitted)"
echo "--------------------------------------------------------"
test_endpoint "GET" "/api/v1/releases/rel_test_dist_submitted/distribution" 200 "Fetch submitted distribution"
test_json_field "GET" "/api/v1/releases/rel_test_dist_submitted/distribution" ".data.status" "PARTIALLY_RELEASED" "Distribution status is PARTIALLY_RELEASED"
echo ""

echo "📋 Test 4: Check submitted submissions details"
echo "--------------------------------------------------------"
test_json_field "GET" "/api/v1/releases/rel_test_dist_submitted/distribution" '.data.submissions[] | select(.platform=="ANDROID") | .status' "LIVE" "Android submission is LIVE"
test_json_field "GET" "/api/v1/releases/rel_test_dist_submitted/distribution" '.data.submissions[] | select(.platform=="IOS") | .status' "IN_REVIEW" "iOS submission is IN_REVIEW"
test_json_field "GET" "/api/v1/releases/rel_test_dist_submitted/distribution" '.data.submissions[] | select(.platform=="ANDROID") | .rolloutPercentage' "50" "Android rollout is 50%"
echo ""

echo "📋 Test 5: Check artifacts in pending submissions"
echo "--------------------------------------------------------"
test_json_field "GET" "/api/v1/releases/rel_test_dist_pending/distribution" '.data.submissions[] | select(.platform=="ANDROID") | .artifact.name' "app-release-9.0.0.aab" "Android artifact name exists"
test_json_field "GET" "/api/v1/releases/rel_test_dist_pending/distribution" '.data.submissions[] | select(.platform=="IOS") | .artifact.buildNumber' "90000" "iOS build number exists"
echo ""

echo "📋 Test 6: Test Tenant Config with APP_DISTRIBUTION integrations"
echo "--------------------------------------------------------"
test_endpoint "GET" "/api/v1/tenants/EkgmlbgGQx" 200 "Fetch tenant config"
test_json_field "GET" "/api/v1/tenants/EkgmlbgGQx" '.data.organisation.releaseManagement.config.connectedIntegrations.APP_DISTRIBUTION | length' "2" "Has 2 APP_DISTRIBUTION integrations"
echo ""

echo ""
echo "📊 Test Summary"
echo "========================================"
echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed! Mock data is ready.${NC}"
  exit 0
else
  echo -e "${RED}✗ Some tests failed. Please check the mock server.${NC}"
  exit 1
fi
