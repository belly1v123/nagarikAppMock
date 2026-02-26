/**
 * Admin Authentication Middleware
 * 
 * Validates admin JWT tokens for dashboard endpoints.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../utils/logger';

// Admin info attached to request
export interface AdminPayload {
    id: string;
    username: string;
    role: string;
}

// Extend Express Request type
declare global {
    namespace Express {
        interface Request {
            admin?: AdminPayload;
        }
    }
}

/**
 * Middleware to authenticate admin JWT from Authorization header
 */
export function adminAuth(requiredRole?: 'admin' | 'superadmin') {
    return async (req: Request, res: Response, next: NextFunction) => {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            logger.warn('Missing admin authorization header', {
                ip: req.ip,
                path: req.path,
            });
            return res.status(401).json({
                error: 'UNAUTHORIZED',
                message: 'Missing or invalid Authorization header',
            });
        }

        const token = authHeader.substring(7); // Remove 'Bearer '

        try {
            // Verify JWT
            const payload = jwt.verify(token, config.jwtSecret) as AdminPayload;

            // Check role if required
            if (requiredRole) {
                const roleHierarchy = { admin: 1, superadmin: 2 };
                const requiredLevel = roleHierarchy[requiredRole] || 1;
                const actualLevel = roleHierarchy[payload.role as keyof typeof roleHierarchy] || 0;

                if (actualLevel < requiredLevel) {
                    logger.warn('Admin insufficient role', {
                        adminId: payload.id.slice(0, 8) + '...',
                        requiredRole,
                        actualRole: payload.role,
                        path: req.path,
                    });
                    return res.status(403).json({
                        error: 'FORBIDDEN',
                        message: `This action requires '${requiredRole}' role`,
                    });
                }
            }

            // Attach admin to request
            req.admin = payload;

            next();
        } catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                logger.warn('Admin token expired', {
                    ip: req.ip,
                    path: req.path,
                });
                return res.status(401).json({
                    error: 'TOKEN_EXPIRED',
                    message: 'Authentication token has expired',
                });
            }

            if (error instanceof jwt.JsonWebTokenError) {
                logger.warn('Invalid admin token', {
                    ip: req.ip,
                    path: req.path,
                    error: error.message,
                });
                return res.status(401).json({
                    error: 'INVALID_TOKEN',
                    message: 'Invalid authentication token',
                });
            }

            logger.error('Admin auth error', error as Error, {
                ip: req.ip,
                path: req.path,
            });
            return res.status(500).json({
                error: 'SERVER_ERROR',
                message: 'Authentication error',
            });
        }
    };
}

/**
 * Generate admin JWT token
 */
export function generateAdminToken(admin: AdminPayload): string {
    return jwt.sign(admin, config.jwtSecret, {
        expiresIn: config.jwtExpiresIn,
    } as jwt.SignOptions);
}

/**
 * Decode admin token without verification (for debugging)
 */
export function decodeAdminToken(token: string): AdminPayload | null {
    try {
        return jwt.decode(token) as AdminPayload;
    } catch {
        return null;
    }
}

export default adminAuth;
