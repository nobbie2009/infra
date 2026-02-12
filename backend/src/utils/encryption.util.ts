import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync, timingSafeEqual } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const SALT_LENGTH = 16;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const ITERATIONS = 100000;

export interface EncryptionResult {
  encrypted: Buffer;
  iv: Buffer;
  salt: Buffer;
  authTag: Buffer;
}

export interface DecryptionInput {
  encrypted: Buffer;
  iv: Buffer;
  salt: Buffer;
  authTag: Buffer;
  masterKey: string;
}

/**
 * Derive encryption key from master key and salt using PBKDF2
 */
export function deriveKey(masterKey: string, salt: Buffer): Buffer {
  return pbkdf2Sync(masterKey, salt, ITERATIONS, KEY_LENGTH, 'sha256');
}

/**
 * Encrypt data using AES-256-GCM
 * @param data - Data to encrypt
 * @param masterKey - Master encryption key
 * @returns Encrypted data with IV, salt, and auth tag
 */
export function encrypt(data: string, masterKey: string): EncryptionResult {
  // Validate inputs
  if (!data || typeof data !== 'string') {
    throw new Error('Data must be a non-empty string');
  }

  if (!masterKey || typeof masterKey !== 'string') {
    throw new Error('Master key must be provided');
  }

  try {
    // Generate random salt and IV
    const salt = randomBytes(SALT_LENGTH);
    const iv = randomBytes(IV_LENGTH);

    // Derive encryption key
    const key = deriveKey(masterKey, salt);

    // Create cipher
    const cipher = createCipheriv(ALGORITHM, key, iv);

    // Encrypt data
    let encrypted = cipher.update(data, 'utf-8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv,
      salt,
      authTag,
    };
  } catch (error) {
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Decrypt data using AES-256-GCM
 * @param input - Decryption input with encrypted data, IV, salt, auth tag, and master key
 * @returns Decrypted data as string
 */
export function decrypt(input: DecryptionInput): string {
  const { encrypted, iv, salt, authTag, masterKey } = input;

  // Validate inputs
  if (!encrypted || !Buffer.isBuffer(encrypted)) {
    throw new Error('Encrypted data must be a Buffer');
  }

  if (!iv || !Buffer.isBuffer(iv) || iv.length !== IV_LENGTH) {
    throw new Error('Invalid IV');
  }

  if (!salt || !Buffer.isBuffer(salt) || salt.length !== SALT_LENGTH) {
    throw new Error('Invalid salt');
  }

  if (!authTag || !Buffer.isBuffer(authTag) || authTag.length !== TAG_LENGTH) {
    throw new Error('Invalid authentication tag');
  }

  if (!masterKey || typeof masterKey !== 'string') {
    throw new Error('Master key must be provided');
  }

  try {
    // Derive the same key
    const key = deriveKey(masterKey, salt);

    // Create decipher
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt data
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf-8');
  } catch (error) {
    // Be vague about decryption failures for security
    throw new Error('Decryption failed: Invalid credentials or corrupted data');
  }
}

/**
 * Validate a decryption by checking if we can decrypt successfully
 * Uses constant-time comparison to prevent timing attacks
 */
export function validateDecryption(
  input: DecryptionInput,
  expectedValue: string
): boolean {
  try {
    const decrypted = decrypt(input);
    // Use timing-safe comparison to prevent timing attacks
    return timingSafeEqual(Buffer.from(decrypted), Buffer.from(expectedValue));
  } catch {
    return false;
  }
}

/**
 * Generate a random master key (Base64-encoded)
 * Should be stored in environment variable
 */
export function generateMasterKey(): string {
  return randomBytes(32).toString('base64');
}

/**
 * Decode master key from Base64
 * @param masterKeyBase64 - Base64-encoded master key from environment
 */
export function decodeMasterKey(masterKeyBase64: string): string {
  try {
    return Buffer.from(masterKeyBase64, 'base64').toString('utf-8');
  } catch (error) {
    throw new Error(`Failed to decode master key: ${error instanceof Error ? error.message : String(error)}`);
  }
}
