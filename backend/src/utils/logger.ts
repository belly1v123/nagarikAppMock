import winston from 'winston';
import { config } from '../config';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;

    // Add stack trace for errors
    if (stack) {
        log += `\n${stack}`;
    }

    // Add metadata if present
    if (Object.keys(meta).length > 0) {
        log += `\n${JSON.stringify(meta, null, 2)}`;
    }

    return log;
});

// Create logger instance
export const logger = winston.createLogger({
    level: config.nodeEnv === 'development' ? 'debug' : 'info',
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        logFormat
    ),
    transports: [
        // Console output
        new winston.transports.Console({
            format: combine(
                colorize({ all: true }),
                timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                errors({ stack: true }),
                logFormat
            ),
        }),
        // File output for errors
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        // File output for all logs
        new winston.transports.File({
            filename: 'logs/combined.log',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
    ],
    // Don't exit on handled exceptions
    exitOnError: false,
});

// Handle uncaught exceptions
logger.exceptions.handle(
    new winston.transports.File({ filename: 'logs/exceptions.log' })
);

// Handle unhandled promise rejections
logger.rejections.handle(
    new winston.transports.File({ filename: 'logs/rejections.log' })
);

// Request logger for Express
export const requestLogger = {
    info: (message: string, meta?: Record<string, unknown>) => {
        logger.info(message, meta);
    },
    error: (message: string, error?: Error, meta?: Record<string, unknown>) => {
        logger.error(message, { error: error?.message, stack: error?.stack, ...meta });
    },
    warn: (message: string, meta?: Record<string, unknown>) => {
        logger.warn(message, meta);
    },
    debug: (message: string, meta?: Record<string, unknown>) => {
        logger.debug(message, meta);
    },
};

// Audit logger for sensitive operations
export const auditLogger = {
    registration: (citizenId: string, district: string) => {
        logger.info('AUDIT: New citizen registration', {
            action: 'REGISTRATION',
            citizenId: citizenId.slice(0, 8) + '...',
            district,
        });
    },
    verification: (apiKeyId: string, result: boolean, matchScore: number) => {
        logger.info('AUDIT: Identity verification', {
            action: 'VERIFICATION',
            apiKeyId: apiKeyId.slice(0, 8) + '...',
            result,
            matchScore: matchScore.toFixed(4),
        });
    },
    duplicateDetected: (matchScore: number) => {
        logger.warn('AUDIT: Duplicate face detected', {
            action: 'DUPLICATE_DETECTED',
            matchScore: matchScore.toFixed(4),
        });
    },
    apiKeyCreated: (keyId: string, name: string) => {
        logger.info('AUDIT: API key created', {
            action: 'API_KEY_CREATED',
            keyId: keyId.slice(0, 8) + '...',
            name,
        });
    },
    adminLogin: (adminId: string, success: boolean) => {
        logger.info('AUDIT: Admin login attempt', {
            action: 'ADMIN_LOGIN',
            adminId: adminId.slice(0, 8) + '...',
            success,
        });
    },
};

export default logger;
