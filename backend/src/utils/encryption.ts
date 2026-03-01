import crypto from 'crypto';
import { config } from '../config';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;  // 16 bytes for AES-GCM
// AUTH_TAG_LENGTH = 16 bytes (used implicitly by getAuthTag())

/**
 * Encrypt plaintext using AES-256-GCM
 * Returns format: IV:authTag:ciphertext (all base64 encoded)
 */
export function encrypt(plaintext: string, key: string = config.encryptionKey): string {
    // Ensure key is exactly 32 bytes for AES-256
    const keyBuffer = Buffer.from(key.padEnd(32, '0').slice(0, 32));

    // Generate random IV
    const iv = crypto.randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);

    // Encrypt
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // Get auth tag
    const authTag = cipher.getAuthTag();

    // Return IV:authTag:ciphertext
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Decrypt ciphertext using AES-256-GCM
 * Expects format: IV:authTag:ciphertext (all base64 encoded)
 */
export function decrypt(encrypted: string, key: string = config.encryptionKey): string {
    // Ensure key is exactly 32 bytes for AES-256
    const keyBuffer = Buffer.from(key.padEnd(32, '0').slice(0, 32));

    // Parse encrypted string
    const parts = encrypted.split(':');
    if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    const ciphertext = parts[2];

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
    decipher.setAuthTag(authTag);

    // Decrypt
    let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

/**
 * Encrypt sensitive citizen data fields
 */
export interface CitizenPII {
    fullName: string;
    citizenshipNumber: string;
    dateOfBirth: string;
    phoneNumber: string;
}

export interface EncryptedCitizenPII {
    fullName: string;
    citizenshipNumber: string;
    dateOfBirth: string;
    phoneNumber: string;
}

export function encryptCitizenPII(data: CitizenPII): EncryptedCitizenPII {
    return {
        fullName: encrypt(data.fullName),
        citizenshipNumber: encrypt(data.citizenshipNumber),
        dateOfBirth: encrypt(data.dateOfBirth),
        phoneNumber: data.phoneNumber,  // Phone stored as plain text with +977 prefix
    };
}

export function decryptCitizenPII(data: EncryptedCitizenPII): CitizenPII {
    return {
        fullName: decrypt(data.fullName),
        citizenshipNumber: decrypt(data.citizenshipNumber),
        dateOfBirth: decrypt(data.dateOfBirth),
        phoneNumber: data.phoneNumber,  // Phone is already plain text
    };
}

/**
 * Safely decrypt a single field, returning original if decryption fails
 * Useful during migration or when data might be unencrypted
 */
export function safeDecrypt(value: string, key?: string): string {
    try {
        // Check if value looks like encrypted data (base64:base64:base64)
        if (value.includes(':') && value.split(':').length === 3) {
            return decrypt(value, key);
        }
        return value;
    } catch {
        // Return original value if decryption fails
        return value;
    }
}
