/**
 * API Key Authentication Middleware
 * 
 * Validates third-party API keys for verification endpoints.
 */

import { Request, Response, NextFunction } from 'express';
import { validateApiKey, hasPermission, ApiKeyInfo, ApiKeyPermissions } from '../services/apiKeyService';
import { logger } from '../utils/logger';

// Extend Express Request type
declare global {
    namespace Express {
        interface Request {
            apiKey?: ApiKeyInfo;
        }
    }
}

// In-memory rate limit tracking
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

/**
 * Middleware to authenticate API key from X-API-Key header
 */
export function apiKeyAuth(requiredPermission?: keyof ApiKeyPermissions) {
    return async (req: Request, res: Response, next: NextFunction) => {
        const apiKeyHeader = req.headers['x-api-key'];

        if (!apiKeyHeader || typeof apiKeyHeader !== 'string') {
            logger.warn('Missing API key header', {
                ip: req.ip,
                path: req.path
            });
            return res.status(401).json({
                error: 'INVALID_API_KEY',
                message: 'Missing X-API-Key header',
            });
        }

        // Validate the API key
        const validation = await validateApiKey(apiKeyHeader);

        if (!validation.valid || !validation.apiKey) {
            logger.warn('Invalid API key', {
                ip: req.ip,
                path: req.path,
                error: validation.error,
            });
            return res.status(401).json({
                error: 'INVALID_API_KEY',
                message: validation.error || 'Invalid API key',
            });
        }

        const apiKey = validation.apiKey;

        // Check permission if required
        if (requiredPermission && !hasPermission(apiKey, requiredPermission)) {
            logger.warn('API key missing required permission', {
                keyId: apiKey.id.slice(0, 8) + '...',
                requiredPermission,
                path: req.path,
            });
            return res.status(403).json({
                error: 'PERMISSION_DENIED',
                message: `API key does not have '${requiredPermission}' permission`,
            });
        }

        // Check rate limit
        const rateLimitResult = checkRateLimit(apiKey.id, apiKey.rateLimit);

        if (!rateLimitResult.allowed) {
            logger.warn('Rate limit exceeded', {
                keyId: apiKey.id.slice(0, 8) + '...',
                rateLimit: apiKey.rateLimit,
                path: req.path,
            });
            res.setHeader('X-RateLimit-Limit', apiKey.rateLimit);
            res.setHeader('X-RateLimit-Remaining', 0);
            res.setHeader('X-RateLimit-Reset', rateLimitResult.resetAt);

            return res.status(429).json({
                error: 'RATE_LIMIT_EXCEEDED',
                message: `Rate limit of ${apiKey.rateLimit} requests per hour exceeded`,
                resetAt: rateLimitResult.resetAt,
            });
        }

        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', apiKey.rateLimit);
        res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining);
        res.setHeader('X-RateLimit-Reset', rateLimitResult.resetAt);

        // Attach API key to request
        req.apiKey = apiKey;

        next();
    };
}

/**
 * Check rate limit for an API key
 * Uses a sliding window of 1 hour
 */
function checkRateLimit(keyId: string, limit: number): {
    allowed: boolean;
    remaining: number;
    resetAt: number;
} {
    const now = Date.now();
    const windowMs = 60 * 60 * 1000; // 1 hour

    let entry = rateLimitStore.get(keyId);

    // Reset if window has passed
    if (!entry || entry.resetAt < now) {
        entry = {
            count: 0,
            resetAt: now + windowMs,
        };
    }

    // Check if limit exceeded
    if (entry.count >= limit) {
        return {
            allowed: false,
            remaining: 0,
            resetAt: entry.resetAt,
        };
    }

    // Increment count
    entry.count++;
    rateLimitStore.set(keyId, entry);

    return {
        allowed: true,
        remaining: limit - entry.count,
        resetAt: entry.resetAt,
    };
}

/**
 * Clean up expired rate limit entries (run periodically)
 */
export function cleanupRateLimitStore(): void {
    const now = Date.now();
    for (const [keyId, entry] of rateLimitStore.entries()) {
        if (entry.resetAt < now) {
            rateLimitStore.delete(keyId);
        }
    }
}

// Run cleanup every 5 minutes
setInterval(cleanupRateLimitStore, 5 * 60 * 1000);

export default apiKeyAuth;
