/**
 * Verification Routes
 * 
 * Third-party API endpoints for identity verification.
 * All routes require valid API key authentication.
 */

import { Router, Request, Response, IRouter } from 'express';
import { PrismaClient } from '@prisma/client';
import {
    apiKeyAuth,
    validate,
    identityVerificationSchema,
    livenessVerificationSchema,
    duplicateCheckSchema,
    asyncHandler,
    ApiError,
    verificationLimiter,
} from '../middleware';
import { getCitizenWithDescriptors, getCitizenStatus } from '../services/citizenService';
import { compareFaceDescriptors } from '../services/faceMatchService';
import { checkFaceDuplicateOnly } from '../services/duplicateCheck';
import { generateProofToken, hashValue, normalizePhoneNumber } from '../utils/hash';
import { logger, auditLogger } from '../utils/logger';
import { config } from '../config';

const router: IRouter = Router();
const prisma = new PrismaClient();

// All verification routes require API key
router.use(verificationLimiter);

// ═══════════════════════════════════════════════════════════════
// POST /api/verify/identity
// ═══════════════════════════════════════════════════════════════
router.post(
    '/identity',
    apiKeyAuth('verify_identity'),
    validate(identityVerificationSchema),
    asyncHandler(async (req: Request, res: Response) => {
        const { phoneNumber, liveFaceDescriptor } = req.body;
        const apiKey = req.apiKey!;

        logger.info('Identity verification request', {
            apiKeyId: apiKey.id.slice(0, 8) + '...',
            apiKeyName: apiKey.name,
        });

        // 1. Look up citizen by phone
        const citizenData = await getCitizenWithDescriptors(phoneNumber);

        if (!citizenData) {
            logger.warn('Citizen not found for verification', {
                phoneHash: hashValue(normalizePhoneNumber(phoneNumber)).slice(0, 16) + '...',
            });
            throw ApiError.notFound('Citizen not found with this phone number');
        }

        const { citizen, descriptors } = citizenData;

        // 2. Check if citizen is active
        if (!citizen.isActive) {
            throw new ApiError(403, 'CITIZEN_INACTIVE', 'Citizen record is inactive');
        }

        // 3. Compare face descriptors
        const matchResult = compareFaceDescriptors(liveFaceDescriptor, descriptors);

        // 4. Log verification attempt
        await prisma.verificationLog.create({
            data: {
                citizenId: citizen.id,
                requestedBy: apiKey.id,
                verificationType: 'identity',
                result: matchResult.verified,
                matchScore: matchResult.bestDistance,
                matchAngle: matchResult.bestAngle,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
            },
        });

        auditLogger.verification(apiKey.id, matchResult.verified, matchResult.bestDistance);

        // 5. Return response
        const response: Record<string, unknown> = {
            verified: matchResult.verified,
            matchScore: parseFloat(matchResult.bestDistance.toFixed(4)),
            weightedScore: parseFloat(matchResult.weightedScore.toFixed(4)),
            confidence: matchResult.confidence,
            bestMatchAngle: matchResult.bestAngle,
        };

        // Only include citizen info if verified
        if (matchResult.verified) {
            response.citizenInfo = {
                citizenHash: citizen.citizenshipHash,
                fullName: citizen.fullName,
                isVoterEligible: citizen.isVoterEligible,
                district: citizen.district,
            };
        }

        res.json(response);
    })
);

// ═══════════════════════════════════════════════════════════════
// POST /api/verify/liveness-and-identity
// ═══════════════════════════════════════════════════════════════
router.post(
    '/liveness-and-identity',
    apiKeyAuth('check_liveness'),
    validate(livenessVerificationSchema),
    asyncHandler(async (req: Request, res: Response) => {
        const { phoneNumber, liveFaceDescriptor, livenessResult } = req.body;
        const apiKey = req.apiKey!;

        logger.info('Liveness + Identity verification request', {
            apiKeyId: apiKey.id.slice(0, 8) + '...',
            challenge: livenessResult.challenge,
        });

        // 1. Validate liveness timing
        const timingRanges = {
            blink: { min: 100, max: 500 },
            smile: { min: 300, max: 4000 },
            turn_left: { min: 500, max: 5000 },
            turn_right: { min: 500, max: 5000 },
        };

        const timing = timingRanges[livenessResult.challenge as keyof typeof timingRanges];
        if (!timing) {
            throw ApiError.badRequest('Invalid liveness challenge type');
        }

        // Check if timing is within natural range
        const isTimingNatural =
            livenessResult.completionTimeMs >= timing.min &&
            livenessResult.completionTimeMs <= timing.max;

        // Check if timestamp is recent (within last 5 minutes)
        const maxAge = 5 * 60 * 1000; // 5 minutes
        const isTimestampRecent = Date.now() - livenessResult.timestamp < maxAge;

        const livenessVerified =
            livenessResult.passed && isTimingNatural && isTimestampRecent;

        if (!livenessVerified) {
            logger.warn('Liveness check failed', {
                passed: livenessResult.passed,
                isTimingNatural,
                isTimestampRecent,
                completionTimeMs: livenessResult.completionTimeMs,
            });
        }

        // 2. Look up citizen and verify identity
        const citizenData = await getCitizenWithDescriptors(phoneNumber);

        if (!citizenData) {
            throw ApiError.notFound('Citizen not found with this phone number');
        }

        const { citizen, descriptors } = citizenData;

        if (!citizen.isActive) {
            throw new ApiError(403, 'CITIZEN_INACTIVE', 'Citizen record is inactive');
        }

        // 3. Compare face descriptors
        const matchResult = compareFaceDescriptors(liveFaceDescriptor, descriptors);

        // 4. Generate proof token if both verifications pass
        let proofToken: string | null = null;
        let proofTokenExpiresAt: number | null = null;

        if (matchResult.verified && livenessVerified) {
            proofToken = generateProofToken(
                citizen.citizenshipHash,
                livenessResult.challenge,
                livenessResult.timestamp
            );
            proofTokenExpiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
        }

        // 5. Log verification attempt
        await prisma.verificationLog.create({
            data: {
                citizenId: citizen.id,
                requestedBy: apiKey.id,
                verificationType: 'full',
                result: matchResult.verified && livenessVerified,
                matchScore: matchResult.bestDistance,
                matchAngle: matchResult.bestAngle,
                livenessResult: livenessVerified,
                livenessChallenge: livenessResult.challenge,
                proofToken: proofToken ? hashValue(proofToken) : null,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
            },
        });

        auditLogger.verification(
            apiKey.id,
            matchResult.verified && livenessVerified,
            matchResult.bestDistance
        );

        // 6. Return response
        const response: Record<string, unknown> = {
            verified: matchResult.verified,
            livenessVerified,
            matchScore: parseFloat(matchResult.bestDistance.toFixed(4)),
        };

        if (proofToken && proofTokenExpiresAt) {
            response.proofToken = proofToken;
            response.proofTokenExpiresAt = proofTokenExpiresAt;
        }

        if (matchResult.verified && livenessVerified) {
            response.citizenInfo = {
                citizenHash: citizen.citizenshipHash,
                fullName: citizen.fullName,
                isVoterEligible: citizen.isVoterEligible,
                district: citizen.district,
            };
        }

        res.json(response);
    })
);

// ═══════════════════════════════════════════════════════════════
// POST /api/verify/check-duplicate-face
// ═══════════════════════════════════════════════════════════════
router.post(
    '/check-duplicate-face',
    apiKeyAuth('check_duplicate'),
    validate(duplicateCheckSchema),
    asyncHandler(async (req: Request, res: Response) => {
        const { liveFaceDescriptor } = req.body;
        const apiKey = req.apiKey!;

        logger.info('Duplicate face check request', {
            apiKeyId: apiKey.id.slice(0, 8) + '...',
        });

        const result = await checkFaceDuplicateOnly(liveFaceDescriptor);

        let message: string;
        if (result.isDuplicate) {
            message = 'A matching face was found in the system.';
        } else if (result.closestMatchScore < config.faceDuplicateThreshold + 0.1) {
            message = 'No exact match found, but similar faces exist.';
        } else {
            message = 'No matching face found in the system.';
        }

        res.json({
            isDuplicate: result.isDuplicate,
            closestMatchScore: parseFloat(result.closestMatchScore.toFixed(4)),
            message,
        });
    })
);

// ═══════════════════════════════════════════════════════════════
// GET /api/verify/citizen-status/:phoneHash
// ═══════════════════════════════════════════════════════════════
router.get(
    '/citizen-status/:phoneHash',
    apiKeyAuth('check_status'),
    asyncHandler(async (req: Request, res: Response) => {
        const { phoneHash } = req.params;

        const status = await getCitizenStatus(phoneHash);

        res.json(status);
    })
);

export default router;
