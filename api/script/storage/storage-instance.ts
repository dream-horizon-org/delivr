/**
 * Storage Instance Singleton
 * 
 * This module exports a singleton storage instance that can be imported
 * anywhere in the application. The instance is initialized during app startup.
 */

import { Storage } from './storage';

let storageInstance: Storage | null = null;

/**
 * Initialize the storage singleton
 * This should be called once during app startup (in default-server.ts)
 */
export function initializeStorage(storage: Storage): void {
  if (storageInstance) {
    console.warn('[Storage] Storage instance already initialized, overwriting...');
  }
  storageInstance = storage;
}

/**
 * Get the storage singleton instance
 * Throws error if storage hasn't been initialized
 */
export function getStorage(): Storage {
  if (!storageInstance) {
    throw new Error(
      '[Storage] Storage instance not initialized. Call initializeStorage() during app startup.'
    );
  }
  return storageInstance;
}

/**
 * Check if storage has been initialized
 */
export function isStorageInitialized(): boolean {
  return storageInstance !== null;
}

