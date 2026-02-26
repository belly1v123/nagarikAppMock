/**
 * Global Error Handler Middleware
 * 
 * Catches all unhandled errors and formats them consistently.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { config } from '../config';

export interface AppError extends Error {
    statusCode?: number;
    code?: string;
    details?: unknown;
}

/**
 * Custom error class for application errors
 */
export class ApiError extends Error implements AppError {
    statusCode: number;
    code: string;
    details?: unknown;

    constructor(statusCode: number, code: string, message: string, details?: unknown) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.name = 'ApiError';
    }

    static badRequest(message: string, details?: unknown): ApiError {
        return new ApiError(400, 'BAD_REQUEST', message, details);
    }

    static unauthorized(message: string = 'Unauthorized'): ApiError {
        return new ApiError(401, 'UNAUTHORIZED', message);
    }

    static forbidden(message: string = 'Forbidden'): ApiError {
        return new ApiError(403, 'FORBIDDEN', message);
    }

    static notFound(message: string = 'Resource not found'): ApiError {
        return new ApiError(404, 'NOT_FOUND', message);
    }

    static conflict(code: string, message: string, details?: unknown): ApiError {
        return new ApiError(409, code, message, details);
    }

    static internal(message: string = 'Internal server error'): ApiError {
        return new ApiError(500, 'SERVER_ERROR', message);
    }
}

/**
 * 404 Not Found handler
 * Must be registered after all routes
 */
export function notFoundHandler(req: Request, res: Response): void {
    res.status(404).json({
        error: 'NOT_FOUND',
        message: `Route ${req.method} ${req.path} not found`,
    });
}

/**
 * Global error handler
 * Must be registered last in the middleware chain
 */
export function errorHandler(
    err: AppError,
    req: Request,
    res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _next: NextFunction
): void {
    // Default to 500 if no status code
    const statusCode = err.statusCode || 500;
    const code = err.code || 'SERVER_ERROR';

    // Log error
    if (statusCode >= 500) {
        logger.error('Server error', err, {
            method: req.method,
            path: req.path,
            ip: req.ip,
            statusCode,
        });
    } else if (statusCode >= 400) {
        logger.warn('Client error', {
            method: req.method,
            path: req.path,
            ip: req.ip,
            statusCode,
            code,
            message: err.message,
        });
    }

    // Build response
    const response: Record<string, unknown> = {
        error: code,
        message: err.message,
    };

    // Include details if available and not in production
    if (err.details) {
        response.details = err.details;
    }

    // Include stack trace in development
    if (config.nodeEnv === 'development' && statusCode >= 500) {
        response.stack = err.stack;
    }

    res.status(statusCode).json(response);
}

/**
 * Async handler wrapper
 * Catches errors in async route handlers and passes them to error middleware
 */
export function asyncHandler(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
    return (req: Request, res: Response, next: NextFunction): void => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

export default {
    ApiError,
    notFoundHandler,
    errorHandler,
    asyncHandler,
};
