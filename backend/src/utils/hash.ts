import crypto from 'crypto';
import { config } from '../config';

/**
 * Hash a value using SHA256 with salt
 * Used for creating searchable hashes of sensitive data (citizenship number, phone)
 */
export function hashValue(value: string, salt: string = config.hashSalt): string {
    return crypto
        .createHash('sha256')
        .update(value + salt)
        .digest('hex');
}

/**
 * Hash an API key using SHA256 (no salt needed for API keys)
 * API keys are already high-entropy random strings
 */
export function hashApiKey(key: string): string {
    return crypto
        .createHash('sha256')
        .update(key)
        .digest('hex');
}

/**
 * Generate a proof token for verification records
 * This token can be stored on a blockchain by consuming platforms
 */
export function generateProofToken(
    citizenHash: string,
    challenge: string,
    timestamp: number,
    secret: string = config.proofSecret
): string {
    return crypto
        .createHash('sha256')
        .update(citizenHash + challenge + timestamp.toString() + secret)
        .digest('hex');
}

/**
 * Generate a random API key
 * Format: nag_live_ + 32 random hex characters
 */
export function generateApiKey(): string {
    const prefix = 'nag_live_';
    const randomPart = crypto.randomBytes(16).toString('hex');
    return prefix + randomPart;
}

/**
 * Get the prefix of an API key for display purposes
 * Returns first 12 characters (includes "nag_live_")
 */
export function getApiKeyPrefix(key: string): string {
    return key.substring(0, 12) + '...';
}

/**
 * Normalize phone number to consistent format for hashing
 * Removes spaces, dashes, and ensures +977 prefix
 */
export function normalizePhoneNumber(phone: string): string {
    // Remove all non-digit characters except +
    let normalized = phone.replace(/[^\d+]/g, '');

    // Handle different formats
    if (normalized.startsWith('+977')) {
        return normalized;
    } else if (normalized.startsWith('977')) {
        return '+' + normalized;
    } else if (normalized.startsWith('9')) {
        return '+977' + normalized;
    }

    return normalized;
}

/**
 * Normalize citizenship number for consistent hashing
 * Format: XX-XX-XX-XXXXX (11 digits total)
 */
export function normalizeCitizenshipNumber(citizenshipNumber: string): string {
    // Remove all non-digit characters
    const digitsOnly = citizenshipNumber.replace(/\D/g, '');

    // If in correct format (11 digits), normalize
    if (digitsOnly.length === 11) {
        return `${digitsOnly.slice(0, 2)}-${digitsOnly.slice(2, 4)}-${digitsOnly.slice(4, 6)}-${digitsOnly.slice(6)}`;
    }

    return citizenshipNumber.trim();
}
