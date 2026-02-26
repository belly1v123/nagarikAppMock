/**
 * Health Check Routes
 * 
 * System health and status endpoints.
 */

import { Router, Request, Response, IRouter } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../middleware';

const router: IRouter = Router();
const prisma = new PrismaClient();

// Version from package.json
const version = '1.0.0';

/**
 * GET /api/health
 * Basic health check
 */
router.get('/', (_req: Request, res: Response) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version,
    });
});

/**
 * GET /api/health/detailed
 * Detailed health check including database
 */
router.get(
    '/detailed',
    asyncHandler(async (_req: Request, res: Response) => {
        let databaseStatus: 'connected' | 'disconnected' = 'disconnected';

        try {
            // Test database connection
            await prisma.$queryRaw`SELECT 1`;
            databaseStatus = 'connected';
        } catch {
            databaseStatus = 'disconnected';
        }

        const overallStatus =
            databaseStatus === 'connected' ? 'ok' : 'degraded';

        res.json({
            status: overallStatus,
            timestamp: new Date().toISOString(),
            version,
            database: databaseStatus,
            uptime: process.uptime(),
            memory: {
                used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
                total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
            },
        });
    })
);

/**
 * GET /api/health/ready
 * Readiness probe for container orchestration
 */
router.get(
    '/ready',
    asyncHandler(async (_req: Request, res: Response) => {
        try {
            await prisma.$queryRaw`SELECT 1`;
            res.json({ ready: true });
        } catch {
            res.status(503).json({ ready: false });
        }
    })
);

/**
 * GET /api/health/live
 * Liveness probe for container orchestration
 */
router.get('/live', (_req: Request, res: Response) => {
    res.json({ live: true });
});

export default router;
