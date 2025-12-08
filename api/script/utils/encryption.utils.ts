/**
 * Generic Encryption Utilities (Backend)
 * Uses AES-256-GCM encryption with a shared secret key
 * 
 * Environment Variable: ENCRYPTION_KEY (base64 encoded 256-bit key)
 * Add to backend .env: ENCRYPTION_KEY=your_base64_key_here
 * 
 * Note: This key must match the frontend VITE_ENCRYPTION_KEY value
 * Frontend uses VITE_ prefix (Vite requirement), backend uses plain ENCRYPTION_KEY
 */

import * as crypto from 'crypto';

// Get encryption key from environment (value must match frontend VITE_ENCRYPTION_KEY)
const getEncryptionKey = (): string | undefined => {
  return process.env.ENCRYPTION_KEY;
};

/**
 * Generic decryption function - decrypts any string using AES-256-GCM
 * @param encryptedData - Base64 encoded encrypted string with IV prepended
 * @returns Decrypted plaintext string
 */
export function decrypt(encryptedData: string): string {
  const encryptionKey = getEncryptionKey();
  
  console.log('\n========== DECRYPT ATTEMPT ==========');
  console.log('[Decrypt] Input length:', encryptedData?.length);
  console.log('[Decrypt] Input preview:', encryptedData?.substring(0, 30) + '...');
  console.log('[Decrypt] Key set:', !!encryptionKey);
  
  if (!encryptionKey) {
    const errorMsg = 'ENCRYPTION_KEY environment variable is not set. Cannot decrypt sensitive data.';
    console.error('[Decrypt] ERROR:', errorMsg);
    throw new Error(errorMsg);
  }

  try {
    // Convert base64 to buffer
    const buffer = Buffer.from(encryptedData, 'base64');
    console.log('[Decrypt] Buffer length:', buffer.length);

    // Extract IV (first 12 bytes) and encrypted data
    const iv = buffer.subarray(0, 12) as Buffer;
    const encrypted = buffer.subarray(12) as Buffer;

    // Convert key from base64
    const keyBuffer = Buffer.from(encryptionKey, 'base64');
    console.log('[Decrypt] Key buffer length:', keyBuffer.length, '(should be 32)');

    // Create decipher
    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer as any, iv as any);

    // Extract auth tag (last 16 bytes of encrypted data)
    const authTag = encrypted.subarray(encrypted.length - 16) as Buffer;
    const ciphertext = encrypted.subarray(0, encrypted.length - 16) as Buffer;

    decipher.setAuthTag(authTag as any);

    // Decrypt
    let decrypted = decipher.update(ciphertext as any);
    decrypted = Buffer.concat([decrypted as any, decipher.final()]);

    const result = decrypted.toString('utf8');
    console.log('[Decrypt] SUCCESS! Result preview:', result.substring(0, 20) + '...');
    console.log('==========================================\n');
    return result;
  } catch (error) {
    console.error('[Decrypt] FAILED:', error instanceof Error ? error.message : error);
    console.log('==========================================\n');
    throw new Error('Failed to decrypt data');
  }
}

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
 * Example:
 * Frontend (.env): VITE_ENCRYPTION_KEY=ABCDeFgHiJkLmNoPqRsTuVwXyZ123456789=
 * Backend (.env):  ENCRYPTION_KEY=ABCDeFgHiJkLmNoPqRsTuVwXyZ123456789=
 */
export function generateEncryptionKey(): string {
  const key = crypto.randomBytes(32); // 256 bits
  return key.toString('base64');
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
    const decrypted = decrypt(value);
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
 * Process an object with encrypted fields
 * Decrypts specified fields for verification, returns both decrypted and original values
 * 
 * Pattern: Frontend sends encrypted values with optional _encrypted flag
 * Backend decrypts for verification but stores encrypted value
 * 
 * @param data - Object containing potentially encrypted fields
 * @param encryptedFields - Array of field names that may be encrypted
 * @returns Object with decrypted values for use in API calls
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

/**
 * Process config object with encrypted fields (for nested configs)
 * Common pattern: config.apiToken, config.authToken, etc.
 * 
 * @param config - Configuration object with potentially encrypted fields
 * @param encryptedFields - Array of field names within config that may be encrypted
 * @returns Object with decrypted config for verification and original for storage
 */
export function decryptConfigFields<T extends Record<string, any>>(
  config: T,
  encryptedFields: string[] = ['apiToken', 'authToken']
): { decrypted: T; original: T } {
  return decryptFields(config, encryptedFields);
}

