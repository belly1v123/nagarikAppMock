/**
 * Nagarik App Mock - Backend Entry Point
 * 
 * Express server setup with all middleware and routes.
 */

import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import { logger } from './utils/logger';
import { generalLimiter, errorHandler, notFoundHandler } from './middleware';
import { registrationRoutes, verificationRoutes, adminRoutes, healthRoutes, authRoutes } from './routes';

// Create Express app
const app: Application = express();

// ═══════════════════════════════════════════════════════════════
// SECURITY MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

// Helmet for secure HTTP headers
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS configuration
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);

        // Check against allowed origins
        if (config.allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        // Also allow if origin ends with allowed port
        const allowedPorts = ['3000', '3001', '5173', '5174'];
        const originPort = origin.split(':').pop();
        if (originPort && allowedPorts.includes(originPort)) {
            return callback(null, true);
        }

        logger.warn(`CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
}));

// ═══════════════════════════════════════════════════════════════
// PARSING MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

// Parse JSON bodies (larger limit for face descriptor data)
app.use(express.json({ limit: '2mb' }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// ═══════════════════════════════════════════════════════════════
// LOGGING MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

// Request logging
if (config.nodeEnv === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined', {
        stream: {
            write: (message: string) => logger.info(message.trim()),
        },
    }));
}

// ═══════════════════════════════════════════════════════════════
// RATE LIMITING
// ═══════════════════════════════════════════════════════════════

// Apply general rate limit to all routes
app.use(generalLimiter);

// ═══════════════════════════════════════════════════════════════
// API ROUTES
// ═══════════════════════════════════════════════════════════════

// Health check routes (no rate limit)
app.use('/api/health', healthRoutes);

// Registration routes
app.use('/api/register', registrationRoutes);

// Verification routes (third-party API)
app.use('/api/verify', verificationRoutes);

// Admin routes
app.use('/api/admin', adminRoutes);

// Auth routes (for third-party identity verification)
app.use('/api/auth', authRoutes);

// ═══════════════════════════════════════════════════════════════
// ERROR HANDLING
// ═══════════════════════════════════════════════════════════════

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ═══════════════════════════════════════════════════════════════
// SERVER STARTUP
// ═══════════════════════════════════════════════════════════════

const PORT = config.port;

app.listen(PORT, () => {
    logger.info(`🚀 Nagarik Mock API Server started`, {
        port: PORT,
        environment: config.nodeEnv,
        allowedOrigins: config.allowedOrigins,
    });

    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║     🇳🇵 NAGARIK APP MOCK — Nepal Citizen Identity Platform    ║
║                                                               ║
║     Server running at: http://localhost:${PORT}                  ║
║     Environment: ${config.nodeEnv.padEnd(44)}║
║                                                               ║
║     API Endpoints:                                            ║
║     • POST /api/register        - Register citizen            ║
║     • POST /api/verify/identity - Verify identity             ║
║     • GET  /api/health          - Health check                ║
║     • POST /api/admin/login     - Admin login                 ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    process.exit(0);
});

export default app;
