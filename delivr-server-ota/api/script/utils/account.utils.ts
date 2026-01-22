/**
 * Account Utility Functions
 * Common utilities for fetching and formatting account details
 */

import type * as storageTypes from '../storage/storage';
import { ErrorCode } from '../storage/storage';
import type { AccountDetails } from '../types/release/release.interface';

/**
 * Fetch account details by account ID
 */
export async function getAccountDetails(
  storage: storageTypes.Storage,
  accountId: string | null,
  context?: string
): Promise<AccountDetails | null> {
  if (!accountId) return null;
  
  const logPrefix = context ? `[${context}]` : '[Account Utils]';
  
  try {
    const account = await storage.getAccount(accountId);
    
    if (!account || !account.email || !account.name) {
      console.warn(`${logPrefix} Account ${accountId} exists but missing required fields`);
      return null;
    }
    
    return {
      id: account.id || accountId,
      email: account.email,
      name: account.name
    };
  } catch (error: any) {
    if (error?.code === ErrorCode.NotFound) {
      console.warn(`${logPrefix} Account ${accountId} not found`);
      return null;
    }
    
    console.error(`${logPrefix} Failed to fetch account ${accountId}:`, error);
    return null;
  }
}

