/**
 * Test Platform Utility Functions
 */

import { TEST_PLATFORMS, TestPlatform } from './platform.interface';

/**
 * Type guard to check if a value is a valid TestPlatform
 */
export const isValidTestPlatform = (value: unknown): value is TestPlatform => {
  const isString = typeof value === 'string';
  if (!isString) {
    return false;
  }
  return TEST_PLATFORMS.includes(value as TestPlatform);
};


