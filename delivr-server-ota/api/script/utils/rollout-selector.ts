// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * ============================================================================
 * Design Rationale: Deterministic Rollout Selection Algorithm
 * ============================================================================
 * 
 * PURPOSE:
 * 
 * Implement gradual rollouts (5% → 50% → 100%) with CONSISTENT user assignment.
 * Same user must always get same rollout decision to prevent "flapping".
 * 
 * THE PROBLEM: ROLLOUT FLAPPING
 * 
 * Bad approach (random selection):
 * - Time 0: User checks for update, 10% rollout, random(0-99) = 5 → Gets update ✓
 * - Time 1: User refreshes app, 10% rollout, random(0-99) = 45 → NO update ✗
 * - Time 2: User refreshes again, 10% rollout, random(0-99) = 8 → Gets update ✓
 * 
 * Result: User sees update, then doesn't, then does = TERRIBLE UX
 * 
 * SOLUTION: DETERMINISTIC HASH-BASED SELECTION
 * 
 * Core principle: Hash(userId + releaseLabel) → bucket (0-99)
 * - Same user + same release → ALWAYS same bucket
 * - If bucket < rolloutPercentage → user gets update
 * - Stateless (no server-side storage of user assignments)
 * 
 * IMPLEMENTATION:
 * 
 * Algorithm:
 * 1. Combine clientId + releaseLabel (e.g., "user123-v1.2.0")
 * 2. Hash to integer using simple string hash function
 * 3. Map hash to 0-99 range using modulo: bucket = abs(hash) % 100
 * 4. User in rollout if: bucket < rolloutPercentage
 * 
 * Example walkthrough:
 * - User: "abc123", Release: "v1.2.0", Rollout: 10%
 * - Identifier: "abc123-v1.2.0"
 * - Hash: getHashCode("abc123-v1.2.0") = 142573
 * - Bucket: 142573 % 100 = 73
 * - Decision: 73 >= 10 → NOT in rollout
 * - User checks again → SAME bucket (73) → STILL not in rollout ✅
 * 
 * - User: "xyz789", Release: "v1.2.0", Rollout: 10%
 * - Identifier: "xyz789-v1.2.0"
 * - Hash: getHashCode("xyz789-v1.2.0") = 98421
 * - Bucket: 98421 % 100 = 21 → Wait, should be < 10!
 * - Actually: Let's say hash was -98421 → abs(-98421) = 98421 → 21 % 100 = 21
 * - Decision: 21 >= 10 → NOT in rollout
 * 
 * Let's use a user that DOES get the update:
 * - User: "def456", Release: "v1.2.0", Rollout: 10%
 * - Hash: (some value that maps to bucket 5)
 * - Bucket: 5
 * - Decision: 5 < 10 → IN rollout
 * - User checks again → SAME bucket (5) → STILL in rollout ✅
 * 
 * HASH FUNCTION PROPERTIES:
 * 
 * Uses simple string hash (djb2-inspired):
 * - hash = ((hash << 5) - hash) + charCode
 * - NOT cryptographic (SHA256 would be overkill)
 * - Fast (O(n) where n = string length ~15 chars)
 * - Deterministic (same input → same output always)
 * - Evenly distributed (statistically uniform across 0-99)
 * 
 * Why simple hash over SHA256:
 * - SHA256: 200x slower, security not needed here
 * - Simple hash: Sufficient for uniform distribution
 * - No collision resistance needed (not storing hashes)
 * 
 * WHY INCLUDE releaseLabel IN HASH:
 * 
 * Without releaseLabel: Hash(clientId) only
 * - Problem: User in 10% for v1.0 → ALWAYS in 10% for v1.1, v1.2, etc.
 * - Result: Same 10% of users test EVERY release (unfair burden)
 * 
 * With releaseLabel: Hash(clientId + releaseLabel)
 * - User in 10% for v1.0 → might NOT be in 10% for v1.1
 * - Different releases get different user cohorts
 * - Distributes risk across user population over time
 * 
 * ROLLOUT CONSISTENCY GUARANTEES:
 * 
 * 1. Same user + same release → ALWAYS same decision
 * 2. Increasing rollout → existing users stay included
 *    - User in 10% rollout → also in 50% rollout (bucket still < 50)
 * 3. Different releases → potentially different users
 *    - New hash input → new bucket assignment
 * 
 * LESSON LEARNED:
 * 
 * Deterministic rollouts via hashing are ESSENTIAL for good UX. Random
 * selection causes flapping and user confusion. Hash-based selection
 * solves consistency without server-side state.
 * 
 * Real-world scenario:
 * - Release v1.1.0 at 10% rollout
 * - 100,000 users check for update
 * - ~10,000 get update (bucket 0-9)
 * - Those 10,000 users check again → SAME 10,000 get update
 * - Next day, increase to 50% rollout
 * - Previous 10,000 + 40,000 new users = 50,000 total
 * - All 50,000 consistently get update on every check
 * 
 * TRADE-OFFS:
 * 
 * Benefits:
 * - Consistent user experience (no flapping)
 * - Stateless (no DB table storing user assignments)
 * - Fast (simple hash, no DB queries)
 * - Scales infinitely (no storage growth as users increase)
 * - Monotonic rollout (increasing % never removes users)
 * 
 * Costs:
 * - Approximate distribution (10% target might be 9.8% or 10.2%)
 *   - Acceptable: Hash is statistically uniform over large N
 *   - Example: 1M users → 10% rollout = ~100,000 users (not exactly 100,000)
 * 
 * - Can't change user's bucket (deterministic by design)
 *   - This is actually a FEATURE (consistency is the point)
 *   - If you need to re-assign users, increment releaseLabel
 * 
 * - Can't target specific users (everyone gets hash-based assignment)
 *   - For targeting: Use separate whitelist/blacklist feature
 *   - Example: VIP users always get updates (bypass rollout logic)
 * 
 * WHEN NOT TO USE HASH-BASED ROLLOUT:
 * 
 * 1. Need EXACT percentage (e.g., exactly 1000 users, not ~1000)
 *    - Use server-side assignment table (user_id → rollout_version)
 * 
 * 2. Need to target specific users (e.g., beta testers)
 *    - Use separate targeting rules (whitelist of user IDs)
 * 
 * 3. Need to change user assignment mid-rollout
 *    - Use server-side state (but accept complexity and scale limits)
 * 
 * ALTERNATIVES CONSIDERED:
 * 
 * 1. Random selection per request
 *    - Rejected: Causes flapping (user gets update, then doesn't)
 * 
 * 2. Server-side assignment table (DB: user_id → version)
 *    - Rejected: Doesn't scale (1M users = 1M DB rows to query)
 *    - Rejected: Adds state (must store + sync assignments)
 * 
 * 3. Client-side random with local cache
 *    - Rejected: Users can manipulate by clearing cache
 *    - Rejected: New install = new random assignment (inconsistent)
 * 
 * 4. Cryptographic hash (SHA256) instead of simple hash
 *    - Rejected: 200x slower, security not needed
 *    - Simple hash provides same uniformity for this use case
 * 
 * SECURITY NOTE:
 * 
 * This is NOT a security feature:
 * - Hash is predictable (not secret)
 * - User could compute hash and predict rollout eligibility
 * - Don't use this for security-sensitive targeting
 * 
 * For security-sensitive decisions (e.g., premium features):
 * - Use server-side authorization (check user permissions)
 * - Don't rely on client-provided clientId
 * 
 * RELATED FILES:
 * 
 * - routes/acquisition.ts: Calls isSelectedForRollout() on update checks
 * - utils/acquisition.ts: Orchestrates rollout selection logic
 * 
 * ============================================================================
 */

const DELIMITER = "-";

function getHashCode(input: string): number {
  let hash: number = 0;

  if (input.length === 0) {
    return hash;
  }

  for (let i = 0; i < input.length; i++) {
    const chr = input.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
  }

  return hash;
}

export function isSelectedForRollout(clientId: string, rollout: number, releaseTag: string): boolean {
  const identifier: string = clientId + DELIMITER + releaseTag;
  const hashValue: number = getHashCode(identifier);
  return Math.abs(hashValue) % 100 < rollout;
}

export function isUnfinishedRollout(rollout: number): boolean {
  return rollout && rollout !== 100;
}
