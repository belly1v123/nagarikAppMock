/**
 * Citizen Service
 * 
 * Handles citizen CRUD operations with encryption/decryption of PII.
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { hashValue, normalizePhoneNumber, normalizeCitizenshipNumber } from '../utils/hash';
import { encryptCitizenPII, decryptCitizenPII } from '../utils/encryption';
import { StoredDescriptors } from './faceMatchService';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface CitizenRegistrationData {
    fullName: string;
    citizenshipNumber: string;
    dateOfBirth: string;
    gender: string;
    district: string;
    municipality: string;
    wardNumber: number;
    address?: string;
    phoneNumber: string;
    email?: string;
    faceDescriptors: StoredDescriptors;
}

export interface CitizenPublicData {
    id: string;
    fullName: string;
    citizenshipHash: string;
    district: string;
    isVoterEligible: boolean;
    isActive: boolean;
    isFlagged: boolean;
    registeredAt: Date;
}

export interface CitizenDetailData extends CitizenPublicData {
    citizenshipNumber: string;
    dateOfBirth: string;
    gender: string;
    municipality: string;
    wardNumber: string;
    address?: string;
    phoneNumber: string;
    phoneHash: string;
    email?: string;
    eligibilityReason?: string;
    flagReason?: string;
    updatedAt: Date;
}

/**
 * Calculate voter eligibility based on date of birth
 */
function calculateVoterEligibility(dateOfBirth: string): { eligible: boolean; reason?: string } {
    const dob = new Date(dateOfBirth);
    const today = new Date();

    // Calculate age
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
    }

    if (age < 18) {
        return { eligible: false, reason: 'Age below 18' };
    }

    return { eligible: true };
}

/**
 * Register a new citizen
 */
export async function registerCitizen(data: CitizenRegistrationData): Promise<{
    citizenId: string;
    citizenshipHash: string;
    isVoterEligible: boolean;
}> {
    // Normalize identifiers
    const normalizedCitizenship = normalizeCitizenshipNumber(data.citizenshipNumber);
    const normalizedPhone = normalizePhoneNumber(data.phoneNumber);

    // Generate hashes for lookup
    const citizenshipHash = hashValue(normalizedCitizenship);
    const phoneHash = hashValue(normalizedPhone);

    // Calculate eligibility
    const eligibility = calculateVoterEligibility(data.dateOfBirth);

    // Encrypt PII
    const encryptedPII = encryptCitizenPII({
        fullName: data.fullName,
        citizenshipNumber: normalizedCitizenship,
        dateOfBirth: data.dateOfBirth,
        phoneNumber: normalizedPhone,
    });

    // Create citizen record
    const citizen = await prisma.citizenRecord.create({
        data: {
            fullName: encryptedPII.fullName,
            citizenshipNumber: encryptedPII.citizenshipNumber,
            citizenshipHash,
            dateOfBirth: encryptedPII.dateOfBirth,
            gender: data.gender,
            district: data.district,
            municipality: data.municipality,
            wardNumber: data.wardNumber.toString(),
            address: data.address,
            phoneNumber: normalizedPhone,  // Store plain phone with +977 prefix
            phoneHash,
            email: data.email,
            faceDescriptorFront: data.faceDescriptors.front,
            faceDescriptorLeft: data.faceDescriptors.left,
            faceDescriptorRight: data.faceDescriptors.right,
            isVoterEligible: eligibility.eligible,
            eligibilityReason: eligibility.reason,
            isActive: true,
            isFlagged: false,
        },
    });

    // Create audit log
    await prisma.auditLog.create({
        data: {
            action: 'register',
            citizenId: citizen.id,
            details: { district: data.district },
        },
    });

    logger.info('Citizen registered successfully', {
        citizenId: citizen.id.slice(0, 8) + '...',
        district: data.district,
        isVoterEligible: eligibility.eligible,
    });

    return {
        citizenId: citizen.id,
        citizenshipHash,
        isVoterEligible: eligibility.eligible,
    };
}

/**
 * Find citizen by phone hash
 */
export async function findCitizenByPhone(phoneNumber: string): Promise<CitizenDetailData | null> {
    const phoneHash = hashValue(normalizePhoneNumber(phoneNumber));

    const citizen = await prisma.citizenRecord.findFirst({
        where: { phoneHash },
    });

    if (!citizen) return null;

    return decryptCitizenRecord(citizen);
}

/**
 * Find citizen by citizenship hash
 */
export async function findCitizenByCitizenship(citizenshipNumber: string): Promise<CitizenDetailData | null> {
    const citizenshipHash = hashValue(normalizeCitizenshipNumber(citizenshipNumber));

    const citizen = await prisma.citizenRecord.findFirst({
        where: { citizenshipHash },
    });

    if (!citizen) return null;

    return decryptCitizenRecord(citizen);
}

/**
 * Get citizen by ID
 */
export async function getCitizenById(id: string): Promise<CitizenDetailData | null> {
    const citizen = await prisma.citizenRecord.findUnique({
        where: { id },
    });

    if (!citizen) return null;

    return decryptCitizenRecord(citizen);
}

/**
 * Get citizen with stored descriptors (for verification)
 */
export async function getCitizenWithDescriptors(phoneNumber: string): Promise<{
    citizen: CitizenDetailData;
    descriptors: StoredDescriptors;
} | null> {
    const phoneHash = hashValue(normalizePhoneNumber(phoneNumber));

    const citizen = await prisma.citizenRecord.findFirst({
        where: { phoneHash },
    });

    if (!citizen) return null;

    return {
        citizen: decryptCitizenRecord(citizen),
        descriptors: {
            front: citizen.faceDescriptorFront as number[],
            left: citizen.faceDescriptorLeft as number[],
            right: citizen.faceDescriptorRight as number[],
        },
    };
}

/**
 * List citizens with pagination and filtering
 */
export async function listCitizens(params: {
    page?: number;
    limit?: number;
    search?: string;
    district?: string;
    eligible?: boolean;
    flagged?: boolean;
    active?: boolean;
}): Promise<{
    citizens: CitizenPublicData[];
    total: number;
    page: number;
    totalPages: number;
}> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (params.district) {
        where.district = params.district;
    }

    if (params.eligible !== undefined) {
        where.isVoterEligible = params.eligible;
    }

    if (params.flagged !== undefined) {
        where.isFlagged = params.flagged;
    }

    if (params.active !== undefined) {
        where.isActive = params.active;
    }

    // Get total count
    const total = await prisma.citizenRecord.count({ where });

    // Get citizens
    const citizens = await prisma.citizenRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { registeredAt: 'desc' },
    });

    // Decrypt and filter by search if needed
    let decryptedCitizens = citizens.map(c => {
        const decrypted = decryptCitizenRecord(c);
        return {
            id: decrypted.id,
            fullName: decrypted.fullName,
            citizenshipNumber: decrypted.citizenshipNumber,
            citizenshipHash: decrypted.citizenshipHash,
            district: decrypted.district,
            isVoterEligible: decrypted.isVoterEligible,
            isActive: decrypted.isActive,
            isFlagged: decrypted.isFlagged,
            registeredAt: decrypted.registeredAt,
            createdAt: decrypted.registeredAt, // Alias for frontend compatibility
        };
    });

    // Filter by search on decrypted name
    if (params.search) {
        const searchLower = params.search.toLowerCase();
        decryptedCitizens = decryptedCitizens.filter(c =>
            c.fullName.toLowerCase().includes(searchLower)
        );
    }

    return {
        citizens: decryptedCitizens,
        total,
        page,
        totalPages: Math.ceil(total / limit),
    };
}

/**
 * Flag/unflag a citizen
 */
export async function flagCitizen(
    citizenId: string,
    flagged: boolean,
    reason: string,
    performedBy?: string
): Promise<CitizenDetailData> {
    const citizen = await prisma.citizenRecord.update({
        where: { id: citizenId },
        data: {
            isFlagged: flagged,
            flagReason: flagged ? reason : null,
        },
    });

    // Create audit log
    await prisma.auditLog.create({
        data: {
            action: 'flag',
            citizenId,
            performedBy,
            details: { flagged, reason },
        },
    });

    logger.info('Citizen flag status updated', {
        citizenId: citizenId.slice(0, 8) + '...',
        flagged,
        reason,
    });

    return decryptCitizenRecord(citizen);
}

/**
 * Update citizen active status
 */
export async function updateCitizenStatus(
    citizenId: string,
    isActive: boolean,
    performedBy?: string
): Promise<CitizenDetailData> {
    const citizen = await prisma.citizenRecord.update({
        where: { id: citizenId },
        data: { isActive },
    });

    await prisma.auditLog.create({
        data: {
            action: 'flag',
            citizenId,
            performedBy,
            details: { isActive },
        },
    });

    return decryptCitizenRecord(citizen);
}

/**
 * Get citizen status by phone hash
 */
export async function getCitizenStatus(phoneHash: string): Promise<{
    exists: boolean;
    isVoterEligible: boolean;
    isActive: boolean;
    hasPhoneRegistered: boolean;
}> {
    const citizen = await prisma.citizenRecord.findFirst({
        where: { phoneHash },
        select: {
            isVoterEligible: true,
            isActive: true,
        },
    });

    if (!citizen) {
        return {
            exists: false,
            isVoterEligible: false,
            isActive: false,
            hasPhoneRegistered: false,
        };
    }

    return {
        exists: true,
        isVoterEligible: citizen.isVoterEligible,
        isActive: citizen.isActive,
        hasPhoneRegistered: true,
    };
}

/**
 * Decrypt a citizen record from database
 */
function decryptCitizenRecord(citizen: {
    id: string;
    fullName: string;
    citizenshipNumber: string;
    citizenshipHash: string;
    dateOfBirth: string;
    gender: string;
    district: string;
    municipality: string;
    wardNumber: string;
    address: string | null;
    phoneNumber: string;
    phoneHash: string;
    email: string | null;
    isVoterEligible: boolean;
    eligibilityReason: string | null;
    isActive: boolean;
    isFlagged: boolean;
    flagReason: string | null;
    registeredAt: Date;
    updatedAt: Date;
}): CitizenDetailData {
    const decryptedPII = decryptCitizenPII({
        fullName: citizen.fullName,
        citizenshipNumber: citizen.citizenshipNumber,
        dateOfBirth: citizen.dateOfBirth,
        phoneNumber: citizen.phoneNumber,  // Phone is now stored plain, but we pass it through for interface compatibility
    });

    return {
        id: citizen.id,
        fullName: decryptedPII.fullName,
        citizenshipNumber: decryptedPII.citizenshipNumber,
        citizenshipHash: citizen.citizenshipHash,
        dateOfBirth: decryptedPII.dateOfBirth,
        gender: citizen.gender,
        district: citizen.district,
        municipality: citizen.municipality,
        wardNumber: citizen.wardNumber,
        address: citizen.address || undefined,
        phoneNumber: citizen.phoneNumber,  // Plain phone number with +977 prefix
        phoneHash: citizen.phoneHash,
        email: citizen.email || undefined,
        isVoterEligible: citizen.isVoterEligible,
        eligibilityReason: citizen.eligibilityReason || undefined,
        isActive: citizen.isActive,
        isFlagged: citizen.isFlagged,
        flagReason: citizen.flagReason || undefined,
        registeredAt: citizen.registeredAt,
        updatedAt: citizen.updatedAt,
    };
}

export const citizenService = {
    registerCitizen,
    findCitizenByPhone,
    findCitizenByCitizenship,
    getCitizenById,
    getCitizenWithDescriptors,
    listCitizens,
    flagCitizen,
    updateCitizenStatus,
    getCitizenStatus,
};

export default citizenService;
