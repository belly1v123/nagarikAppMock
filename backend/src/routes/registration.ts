/**
 * Registration Routes
 * 
 * Handles citizen registration.
 */

import { Router, Request, Response, IRouter } from 'express';
import { PrismaClient } from '@prisma/client';
import { validate, registrationSchema, asyncHandler, ApiError, registrationLimiter } from '../middleware';
import { checkForDuplicates } from '../services/duplicateCheck';
import { registerCitizen } from '../services/citizenService';
import { verifyDescriptorConsistency, StoredDescriptors } from '../services/faceMatchService';
import { logger, auditLogger } from '../utils/logger';
import { config } from '../config';

const router: IRouter = Router();
const prisma = new PrismaClient();

/**
 * POST /api/register
 * Register a new citizen
 */
router.post(
    '/',
    registrationLimiter,
    validate(registrationSchema),
    asyncHandler(async (req: Request, res: Response) => {
        const {
            fullName,
            citizenshipNumber,
            dateOfBirth,
            gender,
            district,
            municipality,
            wardNumber,
            address,
            phoneNumber,
            email,
            faceDescriptors,
            faceImages,
        } = req.body;

        logger.info('Processing registration', {
            district,
            municipality,
        });

        // Cast face descriptors to correct type
        const descriptors: StoredDescriptors = {
            front: faceDescriptors.front,
            left: faceDescriptors.left,
            right: faceDescriptors.right,
        };

        // 1. Verify descriptor consistency (all 3 angles from same person)
        const consistency = verifyDescriptorConsistency(descriptors);
        if (!consistency.isConsistent) {
            logger.warn('Face descriptor consistency check failed', {
                frontLeftDistance: consistency.frontLeftDistance.toFixed(4),
                frontRightDistance: consistency.frontRightDistance.toFixed(4),
                leftRightDistance: consistency.leftRightDistance.toFixed(4),
            });
            throw ApiError.badRequest(
                'Face captures do not appear to be from the same person. Please retake all photos.',
                { consistency }
            );
        }

        // 2. Check for duplicates (citizenship, phone, face)
        const duplicateCheck = await checkForDuplicates({
            citizenshipNumber,
            phoneNumber,
            faceDescriptors: descriptors,
        });

        if (duplicateCheck.isDuplicate) {
            // Log attempt
            await prisma.auditLog.create({
                data: {
                    action: 'duplicate_detected',
                    details: {
                        type: duplicateCheck.duplicateType,
                        faceMatchScore: duplicateCheck.faceMatchScore,
                    },
                    ipAddress: req.ip,
                },
            });

            if (duplicateCheck.duplicateType === 'citizenship') {
                throw ApiError.conflict('CITIZENSHIP_EXISTS', duplicateCheck.message);
            }
            if (duplicateCheck.duplicateType === 'phone') {
                throw ApiError.conflict('PHONE_EXISTS', duplicateCheck.message);
            }
            if (duplicateCheck.duplicateType === 'face') {
                auditLogger.duplicateDetected(duplicateCheck.faceMatchScore || 0);
                throw ApiError.conflict('DUPLICATE_FACE', duplicateCheck.message, {
                    faceMatchScore: duplicateCheck.faceMatchScore,
                });
            }
        }

        // 3. Calculate age and voter eligibility
        const birthDate = new Date(dateOfBirth);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }

        // 4. Register citizen
        const result = await registerCitizen({
            fullName,
            citizenshipNumber,
            dateOfBirth,
            gender,
            district,
            municipality,
            wardNumber,
            address,
            phoneNumber,
            email,
            faceDescriptors: descriptors,
        });

        // Log successful registration
        auditLogger.registration(result.citizenId, district);

        // 5. Optionally store face images (not recommended in production)
        // TODO: Replace with real S3 storage if STORE_FACE_IMAGES=true
        if (config.storeFaceImages && faceImages) {
            logger.debug('Face images provided but storage disabled by default');
        }

        // 6. Return success response
        res.status(201).json({
            success: true,
            citizenId: result.citizenId,
            citizenshipHash: result.citizenshipHash,
            isVoterEligible: result.isVoterEligible,
            message: 'Registration successful',
        });
    })
);

/**
 * GET /api/register/check-citizenship
 * Check if citizenship number is already registered
 */
router.get(
    '/check-citizenship/:citizenshipNumber',
    asyncHandler(async (req: Request, res: Response) => {
        const { citizenshipNumber } = req.params;
        const { hashValue, normalizeCitizenshipNumber } = await import('../utils/hash');

        const citizenshipHash = hashValue(normalizeCitizenshipNumber(citizenshipNumber));

        const existing = await prisma.citizenRecord.findFirst({
            where: { citizenshipHash },
            select: { id: true },
        });

        res.json({
            exists: !!existing,
        });
    })
);

/**
 * GET /api/register/check-phone
 * Check if phone number is already registered
 */
router.get(
    '/check-phone/:phoneNumber',
    asyncHandler(async (req: Request, res: Response) => {
        const { phoneNumber } = req.params;
        const { hashValue, normalizePhoneNumber } = await import('../utils/hash');

        const phoneHash = hashValue(normalizePhoneNumber(phoneNumber));

        const existing = await prisma.citizenRecord.findFirst({
            where: { phoneHash },
            select: { id: true },
        });

        res.json({
            exists: !!existing,
        });
    })
);

export default router;
