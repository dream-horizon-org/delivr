/**
 * Generic Encryption Utilities (Frontend)
 * Uses AES-256-GCM encryption with a shared secret key
 * 
 * Environment Variable: VITE_ENCRYPTION_KEY (base64 encoded 256-bit key)
 * Add to frontend .env: VITE_ENCRYPTION_KEY=your_base64_key_here
 * 
 * Note: In Vite, environment variables must be prefixed with VITE_ to be accessible
 */

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

/**
 * Generic encryption function - encrypts any string using AES-256-GCM
 * @param plaintext - The string to encrypt
 * @returns Base64 encoded encrypted string with IV prepended
 */
export async function encrypt(plaintext: string): Promise<string> {
  const encryptionKey = getEncryptionKey();
  
  if (!encryptionKey) {
    console.error('❌ VITE_ENCRYPTION_KEY not set in environment. Cannot encrypt sensitive data!');
    throw new Error('VITE_ENCRYPTION_KEY is not configured. Please set it in your .env file.');
  }

  try {
    // Generate a random IV (12 bytes for GCM)
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Import the key
    const keyData = base64ToArrayBuffer(encryptionKey);
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );

    // Encrypt the data
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedData), iv.length);

    // Return as base64
    return arrayBufferToBase64(combined.buffer);
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
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

