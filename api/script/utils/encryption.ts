/**
 * Consolidated Encryption Utilities
 * 
 * Handles both:
 * 1. Backend Storage Encryption (uses BACKEND_STORAGE_ENCRYPTION_KEY)
 * 2. Frontend Decryption (uses ENCRYPTION_KEY - shared with frontend)
 * 
 * Double-Layer Encryption:
 * - Layer 1 (Frontend): Frontend encrypts with ENCRYPTION_KEY (shared with backend)
 * - Layer 2 (Backend Storage): Backend re-encrypts with BACKEND_STORAGE_ENCRYPTION_KEY (backend-only)
 * 
 * Database NEVER stores plaintext or frontend-encrypted values - only backend-encrypted values.
 */

import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 16 bytes for GCM
const AUTH_TAG_LENGTH = 16; // 16 bytes for authentication tag
const SALT_LENGTH = 64; // 64 bytes for key derivation salt

// ============================================================================
// KEY MANAGEMENT
// ============================================================================

/**
 * Get frontend encryption key (shared with frontend)
 * Used for decrypting values sent from frontend
 */
function getFrontendEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  
  if (!key) {
    console.warn('⚠️  WARNING: ENCRYPTION_KEY not set! Using fallback (INSECURE for production)');
    // Fallback for development - DO NOT USE IN PRODUCTION
    return 'dev-encryption-key-change-this-in-production-must-be-32-bytes!!';
  }
  
  if (key.length < 32) {
    throw new Error('ENCRYPTION_KEY must be at least 32 characters long');
  }
  
  return key;
}

/**
 * Get backend storage encryption key (backend-only, frontend never sees this)
 * Used for encrypting values before storing in database
 */
function getBackendStorageKey(): string {
  const key = process.env.BACKEND_STORAGE_ENCRYPTION_KEY;
  
  if (!key) {
    throw new Error(
      'BACKEND_STORAGE_ENCRYPTION_KEY environment variable is not set. ' +
      'This key is required for database at-rest encryption. ' +
      'Set it in your .env file or environment configuration.'
    );
  }
  
  if (key.length < 32) {
    throw new Error('BACKEND_STORAGE_ENCRYPTION_KEY must be at least 32 characters long');
  }
  
  return key;
}

/**
 * Derive a 32-byte encryption key from the master key and salt
 */
function deriveKey(masterKey: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(masterKey, salt, 100000, 32, 'sha256');
}

// ============================================================================
// BACKEND STORAGE ENCRYPTION (Database)
// Uses: BACKEND_STORAGE_ENCRYPTION_KEY
// Format: salt:iv:authTag:ciphertext (4 parts with colons)
// ============================================================================

/**
 * Encrypt sensitive data for backend storage (uses BACKEND_STORAGE_ENCRYPTION_KEY)
 * 
 * @param plaintext - The sensitive data to encrypt
 * @returns Encrypted string in format: salt:iv:authTag:ciphertext (all base64 encoded)
 * 
 * @example
 * const encrypted = encryptForStorage('my-api-token-12345');
 * // Returns: "base64salt:base64iv:base64tag:base64cipher"
 */
export function encryptForStorage(plaintext: string): string {
  if (!plaintext) {
    throw new Error('Cannot encrypt empty value');
  }
  
  try {
    const masterKey = getBackendStorageKey();
    
    // Generate random salt for key derivation (ensures same plaintext → different ciphertext)
    const salt = crypto.randomBytes(SALT_LENGTH);
    
    // Derive encryption key from master key + salt
    const key = deriveKey(masterKey, salt);
    
    // Generate random IV (Initialization Vector)
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key as any, iv as any);
    
    // Encrypt the data
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // Get authentication tag
    const authTag = cipher.getAuthTag();
    
    // Combine: salt:iv:authTag:ciphertext (all base64 encoded)
    return [
      salt.toString('base64'),
      iv.toString('base64'),
      authTag.toString('base64'),
      encrypted
    ].join(':');
    
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error(`Failed to encrypt data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrypt sensitive data from backend storage (uses BACKEND_STORAGE_ENCRYPTION_KEY)
 * 
 * @param encryptedData - Encrypted string in format: salt:iv:authTag:ciphertext
 * @returns Decrypted plaintext
 * 
 * @example
 * const decrypted = decryptFromStorage('base64salt:base64iv:base64tag:base64cipher');
 * // Returns: "my-api-token-12345"
 */
function decryptBackendStorage(encryptedData: string): string {
  if (!encryptedData) {
    throw new Error('Cannot decrypt empty value');
  }
  
  try {
    const masterKey = getBackendStorageKey();
    
    // Split the encrypted data
    const parts = encryptedData.split(':');
    if (parts.length !== 4) {
      throw new Error('Invalid encrypted data format');
    }
    
    const [saltB64, ivB64, authTagB64, ciphertext] = parts;
    
    // Convert from base64
    const salt = Buffer.from(saltB64, 'base64');
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');
    
    // Derive the same key using the stored salt
    const key = deriveKey(masterKey, salt);
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key as any, iv as any);
    decipher.setAuthTag(authTag as any);
    
    // Decrypt the data
    let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
    
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error(`Failed to decrypt data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if a string appears to be backend-encrypted (has the expected format)
 */
export function isBackendEncrypted(value: string): boolean {
  if (!value) return false;
  
  // Check if it matches the format: base64:base64:base64:base64
  const parts = value.split(':');
  if (parts.length !== 4) return false;
  
  // Basic validation that each part looks like base64
  const base64Regex = /^[A-Za-z0-9+/]+=*$/;
  return parts.every(part => base64Regex.test(part) && part.length > 0);
}

/**
 * Decrypt ciphertext from backend storage
 * Handles both backend-encrypted format and legacy frontend-encrypted format
 * (for backward compatibility with existing data)
 * 
 * @param ciphertext - Encrypted string (backend or frontend format) or plaintext
 * @returns Decrypted plaintext string (or original if already plaintext)
 */
export function decryptFromStorage(ciphertext: string): string {
  if (!ciphertext) {
    throw new Error('Cannot decrypt empty value');
  }
  
  // Check for known plaintext prefixes - if present, return as-is
  const knownPlainTextPrefixes = [
    'xoxb-',       // Slack bot tokens
    'ghp_',        // GitHub personal access tokens
    'gho_',        // GitHub OAuth tokens
    'github_pat_', // GitHub fine-grained PATs
    '-----BEGIN',  // PEM keys
    'http://',     // URLs
    'https://',    // URLs
  ];
  
  if (knownPlainTextPrefixes.some(prefix => ciphertext.startsWith(prefix))) {
    // Already plaintext, return as-is
    return ciphertext;
  }
  
  // Try backend storage format first (salt:iv:authTag:ciphertext)
  if (isBackendEncrypted(ciphertext)) {
    try {
      return decryptBackendStorage(ciphertext);
    } catch (error: any) {
      console.warn(`[Encryption] Backend format decryption failed, trying frontend format: ${error.message}`);
      // Fall through to try frontend format
    }
  }
  
  // Try frontend format (legacy data or migration scenario)
  if (isFrontendEncrypted(ciphertext)) {
    try {
      return decryptFromFrontend(ciphertext);
    } catch (error: any) {
      console.error(`[Encryption] Frontend format decryption also failed: ${error.message}`);
      throw new Error(`Failed to decrypt value: tried both backend and frontend formats, both failed`);
    }
  }
  
  // If neither format matches, it might be plaintext (shouldn't happen in production, but handle gracefully)
  console.warn('[Encryption] Value does not match backend or frontend encrypted format, returning as-is (might be plaintext)');
  return ciphertext;
}

/**
 * Safely encrypt a config object's sensitive fields for backend storage
 * Used for all integration configs (apiToken, webhookSecret, authToken, etc.)
 * 
 * IMPORTANT: This function expects PLAINTEXT values and encrypts them with BACKEND_STORAGE_ENCRYPTION_KEY.
 * Before calling this, you must decrypt any frontend-encrypted values using decryptFields() (which uses ENCRYPTION_KEY).
 * 
 * Flow:
 * 1. Frontend sends encrypted token (using ENCRYPTION_KEY)
 * 2. Backend decrypts using decryptFields() (ENCRYPTION_KEY)
 * 3. Backend re-encrypts using encryptConfigFields() (BACKEND_STORAGE_ENCRYPTION_KEY)
 * 4. Store backend-encrypted value in database
 * 
 * @param config - Configuration object with plaintext sensitive fields
 * @param sensitiveFields - Array of field names to encrypt (default: ['apiToken', 'authToken', 'webhookSecret'])
 * @returns New config object with backend-encrypted sensitive fields
 */
export function encryptConfigFields<T extends Record<string, any>>(
  config: T,
  sensitiveFields: string[] = ['apiToken', 'authToken', 'webhookSecret']
): T {
  const encryptedConfig = { ...config } as any;
  
  // Remove _encrypted flag if present (frontend indicator, not needed in storage)
  delete encryptedConfig._encrypted;
  
  for (const field of sensitiveFields) {
    if (encryptedConfig[field] && typeof encryptedConfig[field] === 'string') {
      // Only encrypt if not already encrypted (backend format check)
      // This prevents double-encryption if called multiple times
      if (!isBackendEncrypted(encryptedConfig[field])) {
        encryptedConfig[field] = encryptForStorage(encryptedConfig[field]);
      }
    }
  }
  
  return encryptedConfig as T;
}

/**
 * Safely decrypt a config object's sensitive fields from backend storage
 * 
 * Supports two encryption formats:
 * 1. Backend format: salt:iv:authTag:ciphertext (4 parts with colons)
 * 2. Frontend format: single base64 string (used when _encrypted was true)
 * 
 * @param config - Configuration object with encrypted fields
 * @param sensitiveFields - Array of field names to decrypt (default: ['apiToken'])
 * @returns New config object with decrypted sensitive fields
 */
export function decryptConfigFields<T extends Record<string, any>>(
  config: T,
  sensitiveFields: string[] = ['apiToken']
): T {
  const decryptedConfig = { ...config } as any;
  
  for (const field of sensitiveFields) {
    if (decryptedConfig[field] && typeof decryptedConfig[field] === 'string') {
      const value = decryptedConfig[field];
      
      // Check for backend encryption format (salt:iv:authTag:ciphertext)
      if (isBackendEncrypted(value)) {
        try {
          decryptedConfig[field] = decryptBackendStorage(value);
        } catch (error: any) {
          console.error(`Failed to decrypt field '${field}' (backend format):`, error.message);
          // Keep the encrypted value if decryption fails
        }
      } 
      // Check for frontend encryption format (single base64 string, no known prefix)
      else if (isFrontendEncrypted(value)) {
        try {
          decryptedConfig[field] = decryptFromFrontend(value);
        } catch (error: any) {
          console.error(`Failed to decrypt field '${field}' (frontend format):`, error.message);
          // Keep the encrypted value if decryption fails
        }
      }
    }
  }
  
  return decryptedConfig as T;
}

// ============================================================================
// FRONTEND DECRYPTION (Decrypting from frontend)
// Uses: ENCRYPTION_KEY (shared with frontend)
// Format: base64(iv + ciphertext + authTag) - single base64 string
// ============================================================================

/**
 * Decrypt a value encrypted by the frontend (AES-256-GCM with different format)
 * Frontend format: base64(iv + ciphertext + authTag)
 * Uses ENCRYPTION_KEY (shared with frontend), NOT BACKEND_STORAGE_ENCRYPTION_KEY
 * 
 * @param encryptedData - Base64 encoded encrypted string with IV prepended
 * @returns Decrypted plaintext string
 */
export function decryptFromFrontend(encryptedData: string): string {
  const encryptionKey = getFrontendEncryptionKey();
  
  if (!encryptionKey) {
    const errorMsg = 'ENCRYPTION_KEY environment variable is not set. Cannot decrypt sensitive data.';
    console.error('[Decrypt] ERROR:', errorMsg);
    throw new Error(errorMsg);
  }

  try {
    // Convert base64 to buffer
    const buffer = Buffer.from(encryptedData, 'base64');

    // Extract IV (first 12 bytes) and encrypted data
    const iv = buffer.subarray(0, 12);
    const encrypted = buffer.subarray(12);

    // Convert key from base64
    const keyBuffer = Buffer.from(encryptionKey, 'base64');

    // Create decipher
    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer as any, iv as any);

    // Extract auth tag (last 16 bytes of encrypted data)
    const authTag = encrypted.subarray(encrypted.length - 16);
    const ciphertext = encrypted.subarray(0, encrypted.length - 16);

    decipher.setAuthTag(authTag as any);

    // Decrypt
    let decrypted = decipher.update(ciphertext as any);
    decrypted = Buffer.concat([decrypted as any, decipher.final() as any]);

    return decrypted.toString('utf8');
  } catch (error) {
    console.error('[Decrypt] FAILED:', error instanceof Error ? error.message : error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Check if a value appears to be encrypted by the frontend
 * Frontend encrypted values are base64 strings without known plaintext prefixes
 */
function isFrontendEncrypted(value: string): boolean {
  if (!value) return false;
  
  // Known plaintext prefixes - if value starts with these, it's NOT encrypted
  const knownPlainTextPrefixes = [
    'xoxb-',       // Slack bot tokens
    'ghp_',        // GitHub personal access tokens
    'gho_',        // GitHub OAuth tokens
    'github_pat_', // GitHub fine-grained PATs
    '-----BEGIN',  // PEM keys
    'http://',     // URLs
    'https://',    // URLs
  ];
  
  if (knownPlainTextPrefixes.some(prefix => value.startsWith(prefix))) {
    return false;
  }
  
  // Check if it looks like base64 (frontend encryption produces base64)
  const base64Regex = /^[A-Za-z0-9+/]+=*$/;
  return base64Regex.test(value) && value.length > 20;
}

/**
 * Decrypt a value only if it appears to be encrypted
 * Encrypted values from frontend are base64 encoded strings
 * 
 * @param value - The value to potentially decrypt
 * @param fieldName - Field name for logging (optional)
 * @returns Decrypted value if encrypted, original value otherwise
 */
export function decryptIfEncrypted(value: string, fieldName?: string): string {
  if (!value) {
    return value;
  }

  // Check if value looks like a base64 encoded encrypted string
  // Frontend encryption produces base64 strings (no special prefixes like xoxb-, ghp_, etc.)
  // Skip decryption for tokens that have known plaintext prefixes
  const knownPlainTextPrefixes = [
    'xoxb-',      // Slack bot tokens
    'ghp_',       // GitHub personal access tokens
    'gho_',       // GitHub OAuth tokens
    'github_pat_', // GitHub fine-grained PATs
    '-----BEGIN', // PEM keys
  ];

  const hasPlainTextPrefix = knownPlainTextPrefixes.some(prefix => value.startsWith(prefix));
  if (hasPlainTextPrefix) {
    console.log(`[Encryption] ${fieldName ?? 'Field'} already plaintext (has known prefix)`);
    return value; // Already plaintext
  }

  // Check if ENCRYPTION_KEY is set before attempting decryption
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    console.error(`[Encryption] ENCRYPTION_KEY not set! Cannot decrypt ${fieldName ?? 'field'}. Value appears encrypted (no known prefix).`);
    // Return original - will likely cause validation to fail
    return value;
  }

  // Try to decrypt - if it fails, assume it's already plaintext
  try {
    const decrypted = decryptFromFrontend(value);
    console.log(`[Encryption] ${fieldName ?? 'Field'} decrypted successfully, result starts with: ${decrypted.substring(0, 10)}...`);
    return decrypted;
  } catch (error) {
    // If decryption fails, log the error but return original
    console.error(`[Encryption] Failed to decrypt ${fieldName ?? 'field'}:`, error instanceof Error ? error.message : 'Unknown error');
    console.error(`[Encryption] Value starts with: ${value.substring(0, 20)}...`);
    // Return original value - may cause validation to fail if truly encrypted
    return value;
  }
}

/**
 * Process an object with encrypted fields from frontend
 * Decrypts specified fields for verification, returns both decrypted and original values
 * 
 * Pattern: Frontend sends encrypted values with optional _encrypted flag
 * Backend decrypts for verification but stores encrypted value
 * 
 * @param data - Object containing potentially encrypted fields
 * @param encryptedFields - Array of field names that may be encrypted
 * @returns Object with decrypted values for use in API calls and original for storage
 */
export function decryptFields<T extends Record<string, any>>(
  data: T,
  encryptedFields: string[]
): { decrypted: T; original: T } {
  const decrypted = { ...data } as any;
  const original = { ...data } as any;

  for (const field of encryptedFields) {
    if (decrypted[field] && typeof decrypted[field] === 'string') {
      decrypted[field] = decryptIfEncrypted(decrypted[field], field);
    }
  }

  // Remove _encrypted flag if present
  delete decrypted._encrypted;
  delete original._encrypted;

  return { decrypted, original };
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Generates a random 256-bit encryption key (for initial setup)
 * Use this to generate a key and store it in .env files (both frontend and backend)
 * 
 * Setup Instructions:
 * 1. Run this function (e.g., in a Node.js script) to generate a key
 * 2. Add to frontend .env:  VITE_ENCRYPTION_KEY=generated_key_here
 * 3. Add to backend .env:   ENCRYPTION_KEY=generated_key_here
 * 4. Both values should be identical (same base64 string)
 * 
 * @example
 * Frontend (.env): VITE_ENCRYPTION_KEY=ABCDeFgHiJkLmNoPqRsTuVwXyZ123456789=
 * Backend (.env):  ENCRYPTION_KEY=ABCDeFgHiJkLmNoPqRsTuVwXyZ123456789=
 */
export function generateEncryptionKey(): string {
  const key = crypto.randomBytes(32); // 256 bits
  return key.toString('base64');
}

// ============================================================================
// LEGACY EXPORTS (for backward compatibility)
// ============================================================================

/**
 * @deprecated Use decryptFromFrontend() instead
 * Legacy export for backward compatibility
 */
export const decrypt = decryptFromFrontend;

/**
 * @deprecated Use isBackendEncrypted() instead
 * Legacy export for backward compatibility
 */
export const isEncrypted = isBackendEncrypted;
