/**
 * Cron Scheduler Service
 * 
 * Manages internal cron job scheduling using setInterval.
 * Handles interval lifecycle (start, stop, pause, resume).
 * 
 * Follows cursorrules: No 'any' types - use explicit types
 */

/**
 * Cron interval map
 * Key: releaseId, Value: NodeJS.Timeout
 */
const cronIntervals: Map<string, NodeJS.Timeout> = new Map();

/**
 * Polling interval in milliseconds (60 seconds)
 */
const POLLING_INTERVAL_MS = 60000;

/**
 * Start cron job polling for a release
 * 
 * Creates a setInterval that polls every 60 seconds.
 * If an interval already exists for this release, it is not recreated.
 * 
 * @param releaseId - The release ID
 * @param executeCronJob - Function to execute on each poll
 * @returns true if interval was created, false if already exists
 */
export function startCronJob(
  releaseId: string,
  executeCronJob: () => Promise<void>
): boolean {
  if (cronIntervals.has(releaseId)) {
    // Interval already exists - don't create duplicate
    return false;
  }

  // Create interval that executes every 60 seconds
  const interval = setInterval(async () => {
    try {
      await executeCronJob();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error in cron job execution for release ${releaseId}:`, errorMessage);
      // Don't stop interval on error - continue polling
    }
  }, POLLING_INTERVAL_MS);

  // Store interval in map
  cronIntervals.set(releaseId, interval);

  // Execute immediately (don't wait for first interval)
  executeCronJob().catch((error) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error in initial cron job execution for release ${releaseId}:`, errorMessage);
  });

  return true;
}

/**
 * Stop cron job polling for a release
 * 
 * Clears the interval and removes it from the map.
 * 
 * @param releaseId - The release ID
 * @returns true if interval was stopped, false if it didn't exist
 */
export function stopCronJob(releaseId: string): boolean {
  const interval = cronIntervals.get(releaseId);
  if (!interval) {
    return false;
  }

  clearInterval(interval);
  cronIntervals.delete(releaseId);
  return true;
}

/**
 * Pause cron job polling for a release
 * 
 * Alias for stopCronJob (same behavior).
 * 
 * @param releaseId - The release ID
 * @returns true if interval was paused, false if it didn't exist
 */
export function pauseCronJob(releaseId: string): boolean {
  return stopCronJob(releaseId);
}

/**
 * Resume cron job polling for a release
 * 
 * Starts the cron job if it's not already running.
 * 
 * @param releaseId - The release ID
 * @param executeCronJob - Function to execute on each poll
 * @returns true if interval was created/resumed, false if already running
 */
export function resumeCronJob(
  releaseId: string,
  executeCronJob: () => Promise<void>
): boolean {
  if (cronIntervals.has(releaseId)) {
    // Already running
    return false;
  }

  return startCronJob(releaseId, executeCronJob);
}

/**
 * Check if cron job is running for a release
 * 
 * @param releaseId - The release ID
 * @returns true if interval exists (cron job is running)
 */
export function isCronJobRunning(releaseId: string): boolean {
  return cronIntervals.has(releaseId);
}

/**
 * Get all running cron job release IDs
 * 
 * @returns Array of release IDs that have active cron jobs
 */
export function getRunningCronJobs(): string[] {
  return Array.from(cronIntervals.keys());
}

/**
 * Stop all cron jobs
 * 
 * Useful for graceful shutdown.
 */
export function stopAllCronJobs(): void {
  for (const [_releaseId, interval] of cronIntervals.entries()) {
    clearInterval(interval);
  }
  cronIntervals.clear();
}

/**
 * Get polling interval in milliseconds
 * 
 * @returns Polling interval (60000 = 60 seconds)
 */
export function getPollingInterval(): number {
  return POLLING_INTERVAL_MS;
}

