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
const _AUTH_TAG_LENGTH = 16; // 16 bytes for authentication tag
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
  return crypto.pbkdf2Sync(masterKey, salt as any, 100000, 32, 'sha256');
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
 * Decrypt ciphertext from backend storage (Layer 2 - Database At-Rest Encryption)
 * Uses BACKEND_STORAGE_ENCRYPTION_KEY
 * Format: salt:iv:authTag:ciphertext (4 parts with colons)
 * 
 * NOTE: This function ONLY handles backend storage format. 
 * For frontend-encrypted data (Layer 1), use decryptIfEncrypted() instead.
 * 
 * @param ciphertext - Encrypted string from database (backend storage format) or plaintext
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
  
  // Only handle backend storage format (salt:iv:authTag:ciphertext)
  if (isBackendEncrypted(ciphertext)) {
    try {
      return decryptBackendStorage(ciphertext);
    } catch (error: any) {
      console.error(`[Encryption] Backend storage decryption failed: ${error.message}`);
      throw new Error(`Failed to decrypt value from storage: ${error.message}`);
    }
  }
  
  // If format doesn't match, it might be plaintext (shouldn't happen in production, but handle gracefully)
  console.warn('[Encryption] Value does not match backend storage encrypted format, returning as-is (might be plaintext)');
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
 * Safely decrypt a config object's sensitive fields
 * 
 * Handles BOTH formats:
 * 1. Layer 1 (Frontend): salt:iv:authTag:ciphertext with ENCRYPTION_KEY (PBKDF2)
 * 2. Layer 2 (Backend Storage): salt:iv:authTag:ciphertext with BACKEND_STORAGE_ENCRYPTION_KEY (PBKDF2)
 * 
 * This function is used by providers during verification (Layer 1) and when reading from DB (Layer 2).
 * 
 * @param config - Configuration object with encrypted fields (from frontend or database)
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
      
      // Check for known plaintext prefixes - if present, skip decryption
      const knownPlainTextPrefixes = [
        'xoxb-',      // Slack bot tokens
        'ghp_',       // GitHub personal access tokens
        'gho_',       // GitHub OAuth tokens
        'github_pat_', // GitHub fine-grained PATs
        '-----BEGIN', // PEM keys
      ];
      
      if (knownPlainTextPrefixes.some(prefix => value.startsWith(prefix))) {
        // Already plaintext, keep as-is
        continue;
      }
      
      // Check if it's the encrypted format (salt:iv:authTag:ciphertext)
      if (isBackendEncrypted(value)) {
        // Try Layer 1 (Frontend) decryption first (for verification scenarios)
        // Frontend uses ENCRYPTION_KEY with PBKDF2
        const encryptionKey = process.env.ENCRYPTION_KEY;
        if (encryptionKey) {
          try {
            const layer1Decrypted = decryptFrontendWithPBKDF2(value, encryptionKey, field);
            decryptedConfig[field] = layer1Decrypted;
            continue;
          } catch (layer1Error) {
            // Layer 1 decryption failed, try Layer 2 (Backend Storage)
            // Backend uses BACKEND_STORAGE_ENCRYPTION_KEY with PBKDF2
            try {
              decryptedConfig[field] = decryptBackendStorage(value);
              continue;
            } catch (layer2Error: any) {
              console.error(`Failed to decrypt field '${field}' (tried both Layer 1 and Layer 2):`, layer2Error.message);
              // Keep the encrypted value if both decryptions fail
            }
          }
        } else {
          // No ENCRYPTION_KEY, try Layer 2 only
          try {
            decryptedConfig[field] = decryptBackendStorage(value);
          } catch (error: any) {
            console.error(`Failed to decrypt field '${field}' (backend storage format):`, error.message);
            // Keep the encrypted value if decryption fails
          }
        }
      }
      // If format doesn't match, assume it's plaintext
      else {
        console.warn(`Field '${field}' does not match encrypted format, keeping as-is (might be plaintext)`);
      }
    }
  }
  
  return decryptedConfig as T;
}

// ============================================================================
// FRONTEND DECRYPTION (Layer 1 - Decrypting from frontend)
// Uses: ENCRYPTION_KEY (shared with frontend)
// Format: salt:iv:authTag:ciphertext (4 parts with colons, PBKDF2 key derivation)
// ============================================================================

/**
 * Decrypt a value encrypted by the frontend (AES-256-GCM with PBKDF2 key derivation)
 * Frontend format: salt:iv:authTag:ciphertext (4 parts with colons, all base64 encoded)
 * Uses ENCRYPTION_KEY (shared with frontend) with PBKDF2 key derivation
 * NOT BACKEND_STORAGE_ENCRYPTION_KEY
 * 
 * @param encryptedData - Encrypted string in format: salt:iv:authTag:ciphertext
 * @returns Decrypted plaintext string
 */
export function decryptFromFrontend(encryptedData: string): string {
  const encryptionKey = getFrontendEncryptionKey();
  
  if (!encryptionKey) {
    const errorMsg = 'ENCRYPTION_KEY environment variable is not set. Cannot decrypt sensitive data.';
    console.error('[Decrypt] ERROR:', errorMsg);
    throw new Error(errorMsg);
  }

  // Frontend uses PBKDF2 format: salt:iv:authTag:ciphertext
  return decryptFrontendWithPBKDF2(encryptedData, encryptionKey);
}

/**
 * Decrypt frontend data that uses PBKDF2 + salt format
 * Frontend format: salt:iv:authTag:ciphertext (4 parts with colons)
 * Uses ENCRYPTION_KEY (shared with frontend) with PBKDF2 key derivation
 * 
 * @param encryptedData - Encrypted string in format: salt:iv:authTag:ciphertext
 * @param masterKey - The master encryption key (ENCRYPTION_KEY)
 * @param fieldName - Field name for logging (optional)
 * @returns Decrypted plaintext string
 */
function decryptFrontendWithPBKDF2(encryptedData: string, masterKey: string, fieldName?: string): string {  
  // Validate format: must be salt:iv:authTag:ciphertext (4 parts with colons)
  if (!isBackendEncrypted(encryptedData)) {
    throw new Error('Invalid frontend encryption format: expected salt:iv:authTag:ciphertext (4 parts with colons). ' +
                    'Frontend must use PBKDF2 format with ENCRYPTION_KEY.');
  }
  
  try {
    // Split the encrypted data: salt:iv:authTag:ciphertext
    const parts = encryptedData.split(':');
    if (parts.length !== 4) {
      throw new Error('Invalid encrypted data format: expected 4 parts (salt:iv:authTag:ciphertext)');
    }
    
    const [saltB64, ivB64, authTagB64, ciphertextB64] = parts;
    
    // Convert from base64
    const salt = Buffer.from(saltB64, 'base64');
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');
    
    // Derive key using PBKDF2 (same as frontend: 100000 iterations, SHA-256, 32 bytes)
    // Frontend uses the master key as raw string (not base64 decoded)
    // The ENCRYPTION_KEY is a base64 string, but frontend uses it as raw bytes for PBKDF2
    const masterKeyBuffer = Buffer.from(masterKey, 'utf8'); // Use as raw string, not base64
    
    const derivedKey = crypto.pbkdf2Sync(masterKeyBuffer as any, salt as any, 100000, 32, 'sha256');
    
    // Create decipher
    const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey as any, iv as any);
    decipher.setAuthTag(authTag as any);
    
    // Decrypt (ciphertext is base64 encoded)
    let decrypted = decipher.update(ciphertextB64, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw error;
  }
}


/**
 * Decrypt a value only if it appears to be encrypted (Layer 1 - Frontend Encryption)
 * Frontend format: salt:iv:authTag:ciphertext (4 parts with colons, PBKDF2 key derivation)
 * Uses ENCRYPTION_KEY (shared with frontend)
 * 
 * @param value - The value to potentially decrypt
 * @param fieldName - Field name for logging (optional)
 * @returns Decrypted value if encrypted, original value otherwise
 */
export function decryptIfEncrypted(value: string, fieldName?: string): string {
  if (!value) {
    return value;
  }

  // Check for known plaintext prefixes - if present, return as-is
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

  // Frontend uses PBKDF2 format: salt:iv:authTag:ciphertext
  if (isBackendEncrypted(value)) {
    try {
      const decrypted = decryptFrontendWithPBKDF2(value, encryptionKey, fieldName);
      return decrypted;
    } catch (error) {
      // Return original value - may cause validation to fail if truly encrypted
      return value;
    }
  }
  return value;
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
 * @deprecated Use decryptIfEncrypted() instead for automatic format detection
 * This function now uses the new PBKDF2 format (salt:iv:authTag:ciphertext)
 * 
 * For Layer 1 (frontend encryption): Use decryptIfEncrypted()
 * For Layer 2 (backend storage): Use decryptFromStorage()
 */
export const decrypt = decryptFromFrontend;

/**
 * @deprecated Use isBackendEncrypted() instead
 * Legacy export for backward compatibility
 */
export const isEncrypted = isBackendEncrypted;
