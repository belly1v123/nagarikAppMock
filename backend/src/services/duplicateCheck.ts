/**
 * Duplicate Check Service
 * 
 * Handles duplicate detection during registration.
 * Checks citizenship number, phone number, and face descriptors.
 */

import { PrismaClient } from '@prisma/client';
import { hashValue, normalizePhoneNumber, normalizeCitizenshipNumber } from '../utils/hash';
import { checkDuplicateFace, StoredDescriptors, ExistingRecord } from './faceMatchService';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface DuplicateCheckInput {
    citizenshipNumber: string;
    phoneNumber: string;
    faceDescriptors: StoredDescriptors;
}

export interface DuplicateCheckResult {
    isDuplicate: boolean;
    duplicateType: 'citizenship' | 'phone' | 'face' | null;
    message: string;
    matchedRecordId?: string;
    faceMatchScore?: number;
}

/**
 * Comprehensive duplicate check
 * Checks citizenship, phone, and face in order of computational cost
 */
export async function checkForDuplicates(input: DuplicateCheckInput): Promise<DuplicateCheckResult> {
    // 1. Check citizenship number first (fast hash lookup)
    const citizenshipHash = hashValue(normalizeCitizenshipNumber(input.citizenshipNumber));
    const existingCitizenship = await prisma.citizenRecord.findFirst({
        where: { citizenshipHash },
        select: { id: true },
    });

    if (existingCitizenship) {
        logger.warn('Duplicate citizenship number detected', {
            citizenshipHash: citizenshipHash.slice(0, 16) + '...',
        });
        return {
            isDuplicate: true,
            duplicateType: 'citizenship',
            message: 'This citizenship number is already registered in the system.',
            matchedRecordId: existingCitizenship.id,
        };
    }

    // 2. Check phone number (fast hash lookup)
    const phoneHash = hashValue(normalizePhoneNumber(input.phoneNumber));
    const existingPhone = await prisma.citizenRecord.findFirst({
        where: { phoneHash },
        select: { id: true },
    });

    if (existingPhone) {
        logger.warn('Duplicate phone number detected', {
            phoneHash: phoneHash.slice(0, 16) + '...',
        });
        return {
            isDuplicate: true,
            duplicateType: 'phone',
            message: 'This phone number is already registered in the system.',
            matchedRecordId: existingPhone.id,
        };
    }

    // 3. Check face descriptors (expensive - compare against all records)
    const allCitizens = await prisma.citizenRecord.findMany({
        where: { isActive: true },
        select: {
            id: true,
            faceDescriptorFront: true,
            faceDescriptorLeft: true,
            faceDescriptorRight: true,
        },
    });

    if (allCitizens.length > 0) {
        const faceCheck = checkDuplicateFace(input.faceDescriptors, allCitizens as ExistingRecord[]);

        if (faceCheck.isDuplicate) {
            logger.warn('Duplicate face detected during registration', {
                matchedRecordId: faceCheck.matchedRecordId?.slice(0, 8) + '...',
                closestDistance: faceCheck.closestDistance.toFixed(4),
            });
            return {
                isDuplicate: true,
                duplicateType: 'face',
                message: 'A record matching your face already exists in the system. Each person can only register once.',
                matchedRecordId: faceCheck.matchedRecordId || undefined,
                faceMatchScore: faceCheck.closestDistance,
            };
        }
    }

    // No duplicates found
    return {
        isDuplicate: false,
        duplicateType: null,
        message: 'No duplicates found.',
    };
}

/**
 * Check only face duplicates
 * Used by third-party platforms via API
 */
export async function checkFaceDuplicateOnly(
    faceDescriptor: number[]
): Promise<{ isDuplicate: boolean; closestMatchScore: number }> {
    const allCitizens = await prisma.citizenRecord.findMany({
        where: { isActive: true },
        select: {
            id: true,
            faceDescriptorFront: true,
            faceDescriptorLeft: true,
            faceDescriptorRight: true,
        },
    });

    if (allCitizens.length === 0) {
        return { isDuplicate: false, closestMatchScore: 1 };
    }

    // Create a StoredDescriptors object using the same descriptor for all angles
    // since we only have one live descriptor
    const faceCheck = checkDuplicateFace(
        { front: faceDescriptor, left: faceDescriptor, right: faceDescriptor },
        allCitizens as ExistingRecord[]
    );

    return {
        isDuplicate: faceCheck.isDuplicate,
        closestMatchScore: faceCheck.closestDistance,
    };
}

export const duplicateCheckService = {
    checkForDuplicates,
    checkFaceDuplicateOnly,
};

export default duplicateCheckService;
