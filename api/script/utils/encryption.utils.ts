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
  
  if (!encryptionKey) {
    const errorMsg = 'ENCRYPTION_KEY environment variable is not set. Cannot decrypt sensitive data.';
    console.error('[Encryption] ' + errorMsg);
    throw new Error(errorMsg);
  }

  try {
    // Convert base64 to buffer
    const buffer = Buffer.from(encryptedData, 'base64');

    // Extract IV (first 12 bytes) and encrypted data
    const iv = buffer.subarray(0, 12) as Buffer;
    const encrypted = buffer.subarray(12) as Buffer;

    // Convert key from base64
    const keyBuffer = Buffer.from(encryptionKey, 'base64');

    // Create decipher
    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer as any, iv as any);

    // Extract auth tag (last 16 bytes of encrypted data)
    const authTag = encrypted.subarray(encrypted.length - 16) as Buffer;
    const ciphertext = encrypted.subarray(0, encrypted.length - 16) as Buffer;

    decipher.setAuthTag(authTag as any);

    // Decrypt
    let decrypted = decipher.update(ciphertext as any);
    decrypted = Buffer.concat([decrypted as any, decipher.final()]);

    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Decryption failed:', error);
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

