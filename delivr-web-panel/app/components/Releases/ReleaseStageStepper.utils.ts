/**
 * ReleaseStageStepper Utils
 */

import { STATUS_TO_STAGE_INDEX } from './ReleaseStageStepper.constants';

/**
 * Maps release status to stage index
 * @param status - Release status from API
 * @returns Stage index (defaults to 0 if status not found)
 */
export function getStageIndexFromStatus(status: string): number {
  return STATUS_TO_STAGE_INDEX[status] ?? 0;
}

