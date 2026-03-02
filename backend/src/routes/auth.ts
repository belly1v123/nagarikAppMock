/**
 * Auth Routes
 * 
 * Endpoints for third-party apps to verify citizen identity by phone number.
 * Used by voting apps and other platforms that need to verify Nepali citizens.
 */

import { Router, Request, Response, IRouter } from 'express';
import { z } from 'zod';
import { findCitizenByPhone } from '../services/citizenService';
import { asyncHandler, ApiError, validate, apiKeyAuth } from '../middleware';
import { logger } from '../utils/logger';
import { normalizePhoneNumber, hashValue } from '../utils/hash';

const router: IRouter = Router();

// ═══════════════════════════════════════════════════════════════
// VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════

const verifyIdentitySchema = z.object({
    phone_number: z.string()
        .min(10, 'Phone number must be at least 10 digits')
        .max(15, 'Phone number must be at most 15 digits'),
    session_token: z.string()
        .min(1, 'Session token is required'),
});

// ═══════════════════════════════════════════════════════════════
// POST /api/auth/verify-identity
// Verify if a phone number exists in Nagarik database
// Protected endpoint for voting apps (API key required)
// ═══════════════════════════════════════════════════════════════
router.post(
    '/verify-identity',
    apiKeyAuth('verify_identity'),
    validate(verifyIdentitySchema),
    asyncHandler(async (req: Request, res: Response) => {
        const { phone_number, session_token } = req.body;

        logger.info('Identity verification request', {
            phonePrefix: phone_number.slice(0, 4) + '****',
        });

        // Normalize phone number (adds +977 if needed)
        const normalizedPhone = normalizePhoneNumber(phone_number);

        // Look up citizen by phone
        const citizen = await findCitizenByPhone(normalizedPhone);

        if (!citizen) {
            logger.warn('Citizen not found', {
                phoneHash: hashValue(normalizedPhone).slice(0, 16) + '...',
            });
            throw new ApiError(404, 'IDENTITY_NOT_FOUND', 'Phone number not found in Nagarik App records');
        }

        // Check if citizen is active
        if (!citizen.isActive) {
            throw new ApiError(403, 'NOT_ELIGIBLE', 'Citizen record is inactive');
        }

        // Check voter eligibility
        if (!citizen.isVoterEligible) {
            throw new ApiError(403, 'NOT_ELIGIBLE', citizen.eligibilityReason || 'Not eligible to vote');
        }

        // Return the same session token - the voting app already validated it via OTP
        // We just confirm the phone exists in Nagarik
        const verifiedSessionToken = session_token;

        logger.info('Identity verified successfully', {
            citizenId: citizen.id.slice(0, 8) + '...',
            district: citizen.district,
        });

        res.json({
            success: true,
            voter_name: citizen.fullName,
            verified_session_token: verifiedSessionToken,
            district: citizen.district,
            is_voter_eligible: citizen.isVoterEligible,
        });
    })
);

// ═══════════════════════════════════════════════════════════════
// POST /api/auth/check-phone
// Simple check if phone exists (no details returned)
// ═══════════════════════════════════════════════════════════════
router.post(
    '/check-phone',
    apiKeyAuth('check_status'),
    asyncHandler(async (req: Request, res: Response) => {
        const { phone_number } = req.body;

        if (!phone_number) {
            throw ApiError.badRequest('phone_number is required');
        }

        const normalizedPhone = normalizePhoneNumber(phone_number);
        const citizen = await findCitizenByPhone(normalizedPhone);

        res.json({
            exists: !!citizen,
            is_active: citizen?.isActive ?? false,
            is_voter_eligible: citizen?.isVoterEligible ?? false,
        });
    })
);

export default router;
