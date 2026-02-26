/**
 * Admin Routes
 * 
 * Dashboard and management endpoints for administrators.
 */

import { Router, Request, Response, IRouter } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
    adminAuth,
    generateAdminToken,
    validate,
    adminLoginSchema,
    apiKeyCreateSchema,
    citizenFlagSchema,
    asyncHandler,
    ApiError,
    adminLoginLimiter,
} from '../middleware';
import { listCitizens, getCitizenById, flagCitizen } from '../services/citizenService';
import { createApiKey, listApiKeys, revokeApiKey } from '../services/apiKeyService';
import { logger, auditLogger } from '../utils/logger';

const router: IRouter = Router();
const prisma = new PrismaClient();

// ═══════════════════════════════════════════════════════════════
// POST /api/admin/login
// ═══════════════════════════════════════════════════════════════
router.post(
    '/login',
    adminLoginLimiter,
    validate(adminLoginSchema),
    asyncHandler(async (req: Request, res: Response) => {
        const { username, password } = req.body;

        // Find admin
        const admin = await prisma.admin.findUnique({
            where: { username },
        });

        if (!admin || !admin.isActive) {
            logger.warn('Admin login failed - user not found', { username });
            throw ApiError.unauthorized('Invalid username or password');
        }

        // Verify password
        const isValid = await bcrypt.compare(password, admin.passwordHash);

        if (!isValid) {
            logger.warn('Admin login failed - invalid password', { username });
            auditLogger.adminLogin(admin.id, false);
            throw ApiError.unauthorized('Invalid username or password');
        }

        // Update last login
        await prisma.admin.update({
            where: { id: admin.id },
            data: { lastLoginAt: new Date() },
        });

        // Generate token
        const token = generateAdminToken({
            id: admin.id,
            username: admin.username,
            role: admin.role,
        });

        auditLogger.adminLogin(admin.id, true);

        res.json({
            success: true,
            token,
            expiresAt: Date.now() + 8 * 60 * 60 * 1000, // 8 hours
            admin: {
                id: admin.id,
                username: admin.username,
                role: admin.role,
            },
        });
    })
);

// ═══════════════════════════════════════════════════════════════
// GET /api/admin/stats
// ═══════════════════════════════════════════════════════════════
router.get(
    '/stats',
    adminAuth(),
    asyncHandler(async (_req: Request, res: Response) => {
        // Get various statistics
        const [
            totalCitizens,
            voterEligibleCount,
            activeCitizenCount,
            activeApiKeys,
            todayVerifications,
            duplicatesBlocked,
        ] = await Promise.all([
            prisma.citizenRecord.count(),
            prisma.citizenRecord.count({ where: { isVoterEligible: true } }),
            prisma.citizenRecord.count({ where: { isActive: true } }),
            prisma.apiKey.count({ where: { isActive: true } }),
            prisma.verificationLog.count({
                where: {
                    requestedAt: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0)),
                    },
                },
            }),
            prisma.auditLog.count({
                where: { action: 'duplicate_detected' },
            }),
        ]);

        // Get registrations per day (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentRegistrations = await prisma.citizenRecord.groupBy({
            by: ['registeredAt'],
            where: {
                registeredAt: { gte: sevenDaysAgo },
            },
            _count: true,
        });

        // Process into daily counts
        const registrationsPerDay: { date: string; count: number }[] = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const count = recentRegistrations.filter(r =>
                r.registeredAt.toISOString().split('T')[0] === dateStr
            ).reduce((sum, r) => sum + r._count, 0);
            registrationsPerDay.push({ date: dateStr, count });
        }

        // Get verifications per hour (today)
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todayVerificationLogs = await prisma.verificationLog.findMany({
            where: {
                requestedAt: { gte: todayStart },
            },
            select: { requestedAt: true },
        });

        const verificationsPerHour: { hour: number; count: number }[] = [];
        for (let hour = 0; hour < 24; hour++) {
            const count = todayVerificationLogs.filter(v =>
                v.requestedAt.getHours() === hour
            ).length;
            verificationsPerHour.push({ hour, count });
        }

        // Get district distribution
        const districtGroups = await prisma.citizenRecord.groupBy({
            by: ['district'],
            _count: true,
            orderBy: { _count: { district: 'desc' } },
            take: 10,
        });

        const districtDistribution = districtGroups.map(g => ({
            district: g.district,
            count: g._count,
        }));

        res.json({
            success: true,
            data: {
                totalCitizens,
                totalVerifications: todayVerifications,
                verificationsByResult: {
                    match: 0, // TODO: Calculate from verificationLog
                    noMatch: 0,
                    error: 0,
                },
                recentRegistrations: activeCitizenCount,
                voterEligibleCount,
                activeCitizenCount,
                duplicatesBlocked,
                activeApiKeys,
                registrationsPerDay,
                verificationsPerHour,
                districtDistribution,
            },
        });
    })
);

// ═══════════════════════════════════════════════════════════════
// GET /api/admin/citizens
// ═══════════════════════════════════════════════════════════════
router.get(
    '/citizens',
    adminAuth(),
    asyncHandler(async (req: Request, res: Response) => {
        const { page, limit, search, district, eligible, flagged, active } = req.query;

        const result = await listCitizens({
            page: page ? parseInt(page as string, 10) : 1,
            limit: limit ? parseInt(limit as string, 10) : 20,
            search: search as string | undefined,
            district: district as string | undefined,
            eligible: eligible === 'true' ? true : eligible === 'false' ? false : undefined,
            flagged: flagged === 'true' ? true : flagged === 'false' ? false : undefined,
            active: active === 'true' ? true : active === 'false' ? false : undefined,
        });

        res.json({
            success: true,
            data: {
                citizens: result.citizens,
                total: result.total,
                page: result.page,
                totalPages: result.totalPages,
            },
        });
    })
);

// ═══════════════════════════════════════════════════════════════
// GET /api/admin/citizens/:id
// ═══════════════════════════════════════════════════════════════
router.get(
    '/citizens/:id',
    adminAuth(),
    asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;

        const citizen = await getCitizenById(id);

        if (!citizen) {
            throw ApiError.notFound('Citizen not found');
        }

        // Get verification logs for this citizen
        const verificationLogs = await prisma.verificationLog.findMany({
            where: { citizenId: id },
            orderBy: { requestedAt: 'desc' },
            take: 10,
        });

        res.json({
            citizen,
            verificationLogs,
        });
    })
);

// ═══════════════════════════════════════════════════════════════
// PATCH /api/admin/citizens/:id/flag
// ═══════════════════════════════════════════════════════════════
router.patch(
    '/citizens/:id/flag',
    adminAuth(),
    validate(citizenFlagSchema),
    asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const { flagged, reason } = req.body;
        const admin = req.admin!;

        const citizen = await flagCitizen(id, flagged, reason, admin.id);

        res.json({
            success: true,
            citizen,
        });
    })
);

// ═══════════════════════════════════════════════════════════════
// GET /api/admin/api-keys
// ═══════════════════════════════════════════════════════════════
router.get(
    '/api-keys',
    adminAuth(),
    asyncHandler(async (_req: Request, res: Response) => {
        const keys = await listApiKeys();

        res.json({
            data: keys,
        });
    })
);

// ═══════════════════════════════════════════════════════════════
// POST /api/admin/api-keys
// ═══════════════════════════════════════════════════════════════
router.post(
    '/api-keys',
    adminAuth('superadmin'),
    validate(apiKeyCreateSchema),
    asyncHandler(async (req: Request, res: Response) => {
        const { name, permissions, rateLimit, expiresAt } = req.body;

        const result = await createApiKey({
            name,
            permissions,
            rateLimit,
            expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        });

        auditLogger.apiKeyCreated(result.apiKey.id, name);

        // Return full key only on creation
        res.status(201).json({
            success: true,
            apiKey: {
                ...result.apiKey,
                fullKey: result.fullKey, // Only shown once
            },
            message: 'API key created. Save this key securely - it will not be shown again.',
        });
    })
);

// ═══════════════════════════════════════════════════════════════
// DELETE /api/admin/api-keys/:id
// ═══════════════════════════════════════════════════════════════
router.delete(
    '/api-keys/:id',
    adminAuth('superadmin'),
    asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const admin = req.admin!;

        await revokeApiKey(id, admin.id);

        res.json({
            success: true,
            message: 'API key revoked',
        });
    })
);

// ═══════════════════════════════════════════════════════════════
// GET /api/admin/audit-logs
// ═══════════════════════════════════════════════════════════════
router.get(
    '/audit-logs',
    adminAuth(),
    asyncHandler(async (req: Request, res: Response) => {
        const { page, limit, action } = req.query;

        const pageNum = page ? parseInt(page as string, 10) : 1;
        const limitNum = limit ? parseInt(limit as string, 10) : 50;

        const where = action ? { action: action as string } : {};

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (pageNum - 1) * limitNum,
                take: limitNum,
            }),
            prisma.auditLog.count({ where }),
        ]);

        res.json({
            data: logs,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum),
            },
        });
    })
);

export default router;
