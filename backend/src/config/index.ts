import dotenv from 'dotenv';

dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'HASH_SALT',
    'ENCRYPTION_KEY',
    'PROOF_SECRET',
];

for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.warn(`Warning: Missing required environment variable: ${envVar}`);
    }
}

export const config = {
    // Server configuration
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5174').split(','),

    // Database
    databaseUrl: process.env.DATABASE_URL || 'postgresql://nagarik:password@localhost:5432/nagarik_mock',

    // Security
    jwtSecret: process.env.JWT_SECRET || 'dev_jwt_secret_min_32_chars_long_here',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
    hashSalt: process.env.HASH_SALT || 'dev_hash_salt_min_32_chars_long_here',
    encryptionKey: process.env.ENCRYPTION_KEY || 'dev_aes_256_key_exactly_32_c', // Must be 32 chars for AES-256
    proofSecret: process.env.PROOF_SECRET || 'dev_proof_secret_min_32_chars_here',

    // Face matching thresholds
    faceMatchThreshold: parseFloat(process.env.FACE_MATCH_THRESHOLD || '0.50'),
    faceDuplicateThreshold: parseFloat(process.env.FACE_DUPLICATE_THRESHOLD || '0.45'),
    faceHighConfidenceThreshold: parseFloat(process.env.FACE_HIGH_CONFIDENCE_THRESHOLD || '0.40'),

    // Storage
    storeFaceImages: process.env.STORE_FACE_IMAGES === 'true',

    // Rate limiting
    apiRateLimitPerHour: parseInt(process.env.API_RATE_LIMIT_PER_HOUR || '100', 10),
    generalRateLimitPerMinute: parseInt(process.env.GENERAL_RATE_LIMIT_PER_MINUTE || '100', 10),

    // Admin (for seeding)
    adminUsername: process.env.ADMIN_USERNAME || 'admin',
    adminPasswordHash: process.env.ADMIN_PASSWORD_HASH,
} as const;

export type Config = typeof config;
