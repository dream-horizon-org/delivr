/**
 * Encryption utilities for sensitive data (API tokens, secrets, etc.)
 * Uses AES-256-GCM for authenticated encryption
 */

import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 16 bytes for GCM
const AUTH_TAG_LENGTH = 16; // 16 bytes for authentication tag
const SALT_LENGTH = 64; // 64 bytes for key derivation salt

/**
 * Get encryption key from environment or generate a warning
 * In production, this MUST be set via environment variable or AWS Secrets Manager
 */
function getEncryptionKey(): string {
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
 * Derive a 32-byte encryption key from the master key and salt
 */
function deriveKey(masterKey: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(masterKey, salt, 100000, 32, 'sha256');
}

/**
 * Encrypt sensitive data (e.g., API tokens)
 * 
 * @param plaintext - The sensitive data to encrypt
 * @returns Encrypted string in format: salt:iv:authTag:ciphertext (all base64 encoded)
 * 
 * @example
 * const encrypted = encrypt('my-api-token-12345');
 * // Returns: "base64salt:base64iv:base64tag:base64cipher"
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) {
    throw new Error('Cannot encrypt empty value');
  }
  
  try {
    const masterKey = getEncryptionKey();
    
    // Generate random salt for key derivation (ensures same plaintext → different ciphertext)
    const salt = crypto.randomBytes(SALT_LENGTH);
    
    // Derive encryption key from master key + salt
    const key = deriveKey(masterKey, salt);
    
    // Generate random IV (Initialization Vector)
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
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
    throw new Error(`Failed to encrypt data: ${error.message}`);
  }
}

/**
 * Decrypt sensitive data
 * 
 * @param encryptedData - Encrypted string in format: salt:iv:authTag:ciphertext
 * @returns Decrypted plaintext
 * 
 * @example
 * const decrypted = decrypt('base64salt:base64iv:base64tag:base64cipher');
 * // Returns: "my-api-token-12345"
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData) {
    throw new Error('Cannot decrypt empty value');
  }
  
  try {
    const masterKey = getEncryptionKey();
    
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
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt the data
    let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
    
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error(`Failed to decrypt data: ${error.message}`);
  }
}

/**
 * Check if a string appears to be encrypted (has the expected format)
 */
export function isEncrypted(value: string): boolean {
  if (!value) return false;
  
  // Check if it matches the format: base64:base64:base64:base64
  const parts = value.split(':');
  if (parts.length !== 4) return false;
  
  // Basic validation that each part looks like base64
  const base64Regex = /^[A-Za-z0-9+/]+=*$/;
  return parts.every(part => base64Regex.test(part) && part.length > 0);
}

/**
 * Safely encrypt a config object's sensitive fields
 * Used for Project Management Integration configs (apiToken, webhookSecret, etc.)
 * 
 * @param config - Configuration object with potentially sensitive fields
 * @param sensitiveFields - Array of field names to encrypt (default: ['apiToken'])
 * @returns New config object with encrypted sensitive fields
 */
export function encryptConfigFields<T extends Record<string, any>>(
  config: T,
  sensitiveFields: string[] = ['apiToken']
): T {
  const encryptedConfig = { ...config } as any;
  
  for (const field of sensitiveFields) {
    if (encryptedConfig[field] && typeof encryptedConfig[field] === 'string') {
      // Only encrypt if not already encrypted
      if (!isEncrypted(encryptedConfig[field])) {
        encryptedConfig[field] = encrypt(encryptedConfig[field]);
      }
    }
  }
  
  return encryptedConfig as T;
}

/**
 * Safely decrypt a config object's sensitive fields
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
      // Only decrypt if it appears to be encrypted
      if (isEncrypted(decryptedConfig[field])) {
        try {
          decryptedConfig[field] = decrypt(decryptedConfig[field]);
        } catch (error: any) {
          console.error(`Failed to decrypt field '${field}':`, error.message);
          // Keep the encrypted value if decryption fails
        }
      }
    }
  }
  
  return decryptedConfig as T;
}

