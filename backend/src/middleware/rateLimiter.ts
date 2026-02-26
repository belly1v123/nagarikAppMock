/**
 * Rate Limiter Middleware
 * 
 * General-purpose rate limiting for public endpoints.
 */

import rateLimit from 'express-rate-limit';
import { config } from '../config';
import { logger } from '../utils/logger';

/**
 * General rate limiter for all routes
 * 100 requests per 15 minutes per IP
 */
export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: config.generalRateLimitPerMinute * 15, // requests per window
    message: {
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later',
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn('General rate limit exceeded', {
            ip: req.ip,
            path: req.path,
        });
        res.status(429).json({
            error: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests, please try again later',
        });
    },
});

/**
 * Strict rate limiter for registration endpoint
 * 5 requests per hour per IP (registration is expensive)
 */
export const registrationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: {
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many registration attempts, please try again later',
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn('Registration rate limit exceeded', {
            ip: req.ip,
        });
        res.status(429).json({
            error: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many registration attempts, please try again later',
        });
    },
});

/**
 * Admin login rate limiter
 * 5 attempts per 15 minutes per IP
 */
export const adminLoginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: {
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many login attempts, please try again later',
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Only count failed attempts
    handler: (req, res) => {
        logger.warn('Admin login rate limit exceeded', {
            ip: req.ip,
            username: req.body?.username,
        });
        res.status(429).json({
            error: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many login attempts, please try again later',
        });
    },
});

/**
 * Verification rate limiter (in addition to API key limits)
 * 20 requests per minute per IP
 */
export const verificationLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20,
    message: {
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many verification requests, please slow down',
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn('Verification rate limit exceeded', {
            ip: req.ip,
            path: req.path,
        });
        res.status(429).json({
            error: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many verification requests, please slow down',
        });
    },
});

export default {
    generalLimiter,
    registrationLimiter,
    adminLoginLimiter,
    verificationLimiter,
};
