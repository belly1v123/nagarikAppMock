// API-related types

import type { CitizenPublicInfo, Gender } from './citizen';
import type { FaceDescriptors, FaceImages, LivenessResult } from './face';

// ═══════════════════════════════════════════════════════════════
// REGISTRATION API
// ═══════════════════════════════════════════════════════════════

export interface RegistrationRequest {
    fullName: string;
    citizenshipNumber: string;
    dateOfBirth: string;
    gender: Gender;
    district: string;
    municipality: string;
    wardNumber: number;
    address?: string;
    phoneNumber: string;
    email?: string;
    faceDescriptors: FaceDescriptors;
    faceImages?: FaceImages;
}

export interface RegistrationResponse {
    success: true;
    citizenId: string;
    citizenshipHash: string;
    isVoterEligible: boolean;
    message: string;
}

export type RegistrationErrorCode =
    | 'VALIDATION_ERROR'
    | 'CITIZENSHIP_EXISTS'
    | 'PHONE_EXISTS'
    | 'DUPLICATE_FACE'
    | 'SERVER_ERROR';

export interface RegistrationError {
    error: RegistrationErrorCode;
    message: string;
    details?: Record<string, string[]>;
}

// ═══════════════════════════════════════════════════════════════
// VERIFICATION API (Third-party consumers)
// ═══════════════════════════════════════════════════════════════

export interface IdentityVerificationRequest {
    phoneNumber: string;
    liveFaceDescriptor: number[];
}

export interface IdentityVerificationResponse {
    verified: boolean;
    matchScore: number;
    weightedScore: number;
    confidence: 'high' | 'low' | 'none';
    bestMatchAngle: 'front' | 'left' | 'right';
    citizenInfo?: CitizenPublicInfo;
}

export interface LivenessVerificationRequest {
    phoneNumber: string;
    liveFaceDescriptor: number[];
    livenessResult: LivenessResult;
}

export interface LivenessVerificationResponse {
    verified: boolean;
    livenessVerified: boolean;
    matchScore: number;
    proofToken: string;
    proofTokenExpiresAt: number;
    citizenInfo?: CitizenPublicInfo;
}

export interface DuplicateCheckRequest {
    liveFaceDescriptor: number[];
}

export interface DuplicateCheckResponse {
    isDuplicate: boolean;
    closestMatchScore: number;
    message: string;
}

export interface CitizenStatusResponse {
    exists: boolean;
    isVoterEligible: boolean;
    isActive: boolean;
    hasPhoneRegistered: boolean;
}

export type VerificationErrorCode =
    | 'INVALID_API_KEY'
    | 'RATE_LIMIT_EXCEEDED'
    | 'CITIZEN_NOT_FOUND'
    | 'CITIZEN_INACTIVE'
    | 'INVALID_LIVENESS'
    | 'VALIDATION_ERROR'
    | 'SERVER_ERROR';

export interface VerificationError {
    error: VerificationErrorCode;
    message: string;
}

// ═══════════════════════════════════════════════════════════════
// ADMIN API
// ═══════════════════════════════════════════════════════════════

export interface AdminLoginRequest {
    username: string;
    password: string;
}

export interface AdminLoginResponse {
    success: true;
    token: string;
    expiresAt: number;
    admin: {
        id: string;
        username: string;
        role: string;
    };
}

export interface DashboardStats {
    totalCitizens: number;
    voterEligibleCount: number;
    verificationsToday: number;
    duplicatesBlocked: number;
    activeApiKeys: number;
    registrationsPerDay: { date: string; count: number }[];
    verificationsPerHour: { hour: number; count: number }[];
    districtDistribution: { district: string; count: number }[];
}

export interface ApiKeyCreateRequest {
    name: string;
    permissions: ApiKeyPermissions;
    rateLimit: number;
    expiresAt?: string;
}

export interface ApiKeyPermissions {
    verify_identity: boolean;
    check_liveness: boolean;
    check_duplicate: boolean;
    check_status: boolean;
}

export interface ApiKeyResponse {
    id: string;
    name: string;
    keyPrefix: string;
    fullKey?: string;  // Only returned on creation
    isActive: boolean;
    permissions: ApiKeyPermissions;
    rateLimit: number;
    createdAt: string;
    expiresAt?: string;
    lastUsedAt?: string;
}

export interface CitizenFlagRequest {
    flagged: boolean;
    reason: string;
}

// ═══════════════════════════════════════════════════════════════
// COMMON API TYPES
// ═══════════════════════════════════════════════════════════════

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface ApiError {
    error: string;
    message: string;
    details?: unknown;
}

export interface HealthCheckResponse {
    status: 'ok' | 'degraded' | 'down';
    timestamp: string;
    version: string;
    database: 'connected' | 'disconnected';
}

// Verification Log
export interface VerificationLog {
    id: string;
    citizenId: string;
    requestedBy: string;
    verificationType: 'identity' | 'liveness' | 'full';
    result: boolean;
    matchScore: number;
    matchAngle: string;
    livenessResult?: boolean;
    livenessChallenge?: string;
    proofToken?: string;
    ipAddress?: string;
    userAgent?: string;
    requestedAt: Date;
}

// Audit Log
export interface AuditLog {
    id: string;
    action: 'register' | 'verify' | 'duplicate_detected' | 'flag' | 'api_key_created' | 'api_key_revoked';
    citizenId?: string;
    performedBy?: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
    createdAt: Date;
}
