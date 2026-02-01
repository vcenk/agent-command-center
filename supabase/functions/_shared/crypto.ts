// Encryption utilities for sensitive data (OAuth tokens, API keys, etc.)
// Uses AES-256-GCM encryption with Web Crypto API

// Get encryption key from environment
function getEncryptionKey(): string {
  const key = Deno.env.get('ENCRYPTION_KEY');
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }
  if (key.length < 32) {
    throw new Error('ENCRYPTION_KEY must be at least 32 characters');
  }
  return key;
}

// Convert string to Uint8Array
function stringToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

// Convert Uint8Array to string
function bytesToString(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

// Convert Uint8Array to base64
function bytesToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

// Convert base64 to Uint8Array
function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Derive a crypto key from the encryption key string with a random salt
async function deriveKey(keyString: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    stringToBytes(keyString.slice(0, 32)), // Use first 32 chars
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt, // Use provided random salt for each encryption
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a string using AES-256-GCM
 * @param plaintext - The string to encrypt
 * @returns Base64 encoded encrypted string (salt:iv:ciphertext)
 */
export async function encrypt(plaintext: string): Promise<string> {
  // Generate random salt (16 bytes) for key derivation
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(getEncryptionKey(), salt);

  // Generate random IV (12 bytes for GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Encrypt
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    stringToBytes(plaintext)
  );

  // Combine salt, IV, and ciphertext, encode as base64
  const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
  combined.set(salt);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length);

  return bytesToBase64(combined);
}

/**
 * Decrypt an AES-256-GCM encrypted string
 * @param encryptedBase64 - Base64 encoded encrypted string (salt:iv:ciphertext)
 * @returns Decrypted plaintext string
 */
export async function decrypt(encryptedBase64: string): Promise<string> {
  // Decode base64 and extract salt, IV, and ciphertext
  const combined = base64ToBytes(encryptedBase64);
  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const ciphertext = combined.slice(28);

  const key = await deriveKey(getEncryptionKey(), salt);

  // Decrypt
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  return bytesToString(new Uint8Array(plaintext));
}

/**
 * Encrypt an object (JSON serializable)
 * @param obj - Object to encrypt
 * @returns Base64 encoded encrypted string
 */
export async function encryptObject<T>(obj: T): Promise<string> {
  const json = JSON.stringify(obj);
  return encrypt(json);
}

/**
 * Decrypt an encrypted object
 * @param encryptedBase64 - Base64 encoded encrypted string
 * @returns Decrypted object
 */
export async function decryptObject<T>(encryptedBase64: string): Promise<T> {
  const json = await decrypt(encryptedBase64);
  return JSON.parse(json) as T;
}

/**
 * Check if a string looks like it's encrypted (base64 format with minimum length)
 * This is a heuristic check, not a guarantee
 */
export function isEncrypted(value: string): boolean {
  if (!value || value.length < 20) return false;
  // Check if it looks like base64
  const base64Regex = /^[A-Za-z0-9+/]+=*$/;
  return base64Regex.test(value);
}

/**
 * Safely encrypt - returns original if encryption fails
 * Logs error but doesn't throw
 */
export async function safeEncrypt(plaintext: string): Promise<string> {
  try {
    return await encrypt(plaintext);
  } catch (error) {
    console.error('Encryption failed:', error);
    return plaintext; // Return original on failure (not ideal but prevents data loss)
  }
}

/**
 * Safely decrypt - returns original if decryption fails
 * Useful for handling mixed encrypted/unencrypted data during migration
 */
export async function safeDecrypt(maybeEncrypted: string): Promise<string> {
  try {
    // If it doesn't look encrypted, return as-is
    if (!isEncrypted(maybeEncrypted)) {
      return maybeEncrypted;
    }
    return await decrypt(maybeEncrypted);
  } catch (error) {
    // If decryption fails, it might be unencrypted data
    console.warn('Decryption failed, returning original value');
    return maybeEncrypted;
  }
}

/**
 * Encrypt OAuth config object
 * Encrypts sensitive fields (access_token, refresh_token)
 */
export async function encryptOAuthConfig(config: {
  access_token?: string;
  refresh_token?: string;
  [key: string]: unknown;
}): Promise<Record<string, unknown>> {
  const encrypted: Record<string, unknown> = { ...config };

  if (config.access_token) {
    encrypted.access_token = await encrypt(config.access_token);
    encrypted._access_token_encrypted = true;
  }

  if (config.refresh_token) {
    encrypted.refresh_token = await encrypt(config.refresh_token);
    encrypted._refresh_token_encrypted = true;
  }

  return encrypted;
}

/**
 * Decrypt OAuth config object
 * Decrypts sensitive fields if they were encrypted
 */
export async function decryptOAuthConfig(config: {
  access_token?: string;
  refresh_token?: string;
  _access_token_encrypted?: boolean;
  _refresh_token_encrypted?: boolean;
  [key: string]: unknown;
}): Promise<Record<string, unknown>> {
  const decrypted: Record<string, unknown> = { ...config };

  if (config.access_token && config._access_token_encrypted) {
    decrypted.access_token = await decrypt(config.access_token);
    delete decrypted._access_token_encrypted;
  }

  if (config.refresh_token && config._refresh_token_encrypted) {
    decrypted.refresh_token = await decrypt(config.refresh_token);
    delete decrypted._refresh_token_encrypted;
  }

  return decrypted;
}
