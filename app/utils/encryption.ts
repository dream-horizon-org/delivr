/**
 * Generic Encryption Utilities (Frontend)
 * Uses AES-256-GCM encryption with PBKDF2 key derivation
 * Matches backend encryption format: salt:iv:authTag:ciphertext
 * 
 * Environment Variable: VITE_ENCRYPTION_KEY (base64 encoded master key)
 * Add to frontend .env: VITE_ENCRYPTION_KEY=your_base64_key_here
 * 
 * Note: In Vite, environment variables must be prefixed with VITE_ to be accessible
 * 
 * Encryption Type: SYMMETRIC (same key for encryption and decryption)
 * Algorithm: AES-256-GCM (Authenticated Encryption)
 */

const IV_LENGTH = 16; // 16 bytes for GCM (matches backend)
const AUTH_TAG_LENGTH = 16; // 16 bytes for authentication tag
const SALT_LENGTH = 64; // 64 bytes for key derivation salt
const PBKDF2_ITERATIONS = 100000; // Key derivation iterations (matches backend)
const PBKDF2_HASH = 'SHA-256'; // Hash algorithm for key derivation

// Get encryption key from environment
const getEncryptionKey = (): string | undefined => {
  return import.meta.env.VITE_ENCRYPTION_KEY;
};

// Convert base64 key to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert string to ArrayBuffer
function stringToArrayBuffer(str: string): ArrayBuffer {
  const encoder = new TextEncoder();
  return encoder.encode(str).buffer;
}

/**
 * Derive encryption key using PBKDF2 (matches backend key derivation)
 * @param masterKey - Master key from environment
 * @param salt - Random salt for key derivation
 * @returns Derived encryption key
 */
async function deriveKey(masterKey: string, salt: Uint8Array): Promise<CryptoKey> {
  // Import master key as raw key material
  const masterKeyBuffer = stringToArrayBuffer(masterKey);
  const masterKeyCrypto = await crypto.subtle.importKey(
    'raw',
    masterKeyBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  // Derive key using PBKDF2
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH,
    },
    masterKeyCrypto,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  return derivedKey;
}

/**
 * Generic encryption function - encrypts any string using AES-256-GCM
 * Matches backend format: salt:iv:authTag:ciphertext (all base64 encoded, colon-separated)
 * 
 * @param plaintext - The string to encrypt
 * @returns Encrypted string in format: salt:iv:authTag:ciphertext (all base64)
 * 
 * @example
 * const encrypted = await encrypt('my-secret-data');
 * // Returns: "base64salt:base64iv:base64tag:base64cipher"
 */
export async function encrypt(plaintext: string): Promise<string> {
  const masterKey = getEncryptionKey();
  
  if (!masterKey) {
    console.error('❌ VITE_ENCRYPTION_KEY not set in environment. Cannot encrypt sensitive data!');
    throw new Error('VITE_ENCRYPTION_KEY is not configured. Please set it in your .env file.');
  }

  if (!plaintext) {
    throw new Error('Cannot encrypt empty value');
  }

  try {
    // Generate random salt for key derivation (ensures same plaintext → different ciphertext)
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    
    // Derive encryption key from master key + salt using PBKDF2
    const key = await deriveKey(masterKey, salt);
    
    // Generate random IV (Initialization Vector) - 16 bytes for GCM
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    
    // Encrypt the data
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );
    
    // In Web Crypto API, GCM includes authTag at the end of encryptedData
    // Extract ciphertext and authTag
    const encryptedBytes = new Uint8Array(encryptedData);
    const authTag = encryptedBytes.slice(encryptedBytes.length - AUTH_TAG_LENGTH);
    const ciphertext = encryptedBytes.slice(0, encryptedBytes.length - AUTH_TAG_LENGTH);
    
    // Combine: salt:iv:authTag:ciphertext (all base64 encoded)
    return [
      arrayBufferToBase64(salt.buffer),
      arrayBufferToBase64(iv.buffer),
      arrayBufferToBase64(authTag.buffer),
      arrayBufferToBase64(ciphertext.buffer)
    ].join(':');
    
  } catch (error: any) {
    console.error('Encryption error:', error);
    throw new Error(`Failed to encrypt data: ${error.message}`);
  }
}

/**
 * Check if encryption is properly configured
 * @returns true if VITE_ENCRYPTION_KEY is set
 */
export function isEncryptionConfigured(): boolean {
  return !!getEncryptionKey();
}

/**
 * Generates a random 256-bit encryption key (for initial setup)
 * Use this to generate a key and store it in .env files (both frontend and backend)
 * 
 * Setup Instructions:
 * 1. Run this function in browser console to generate a key
 * 2. Add to frontend .env:  VITE_ENCRYPTION_KEY=generated_key_here
 * 3. Add to backend .env:   ENCRYPTION_KEY=generated_key_here
 * 4. Both values should be identical (same base64 string)
 * 
 * Example:
 * Frontend (.env): VITE_ENCRYPTION_KEY=ABCDeFgHiJkLmNoPqRsTuVwXyZ123456789=
 * Backend (.env):  ENCRYPTION_KEY=ABCDeFgHiJkLmNoPqRsTuVwXyZ123456789=
 */
export function generateEncryptionKey(): string {
  const key = crypto.getRandomValues(new Uint8Array(32)); // 256 bits
  return arrayBufferToBase64(key.buffer);
}

