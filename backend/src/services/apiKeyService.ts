/**
 * API Key Service
 * 
 * Manages API keys for third-party platforms.
 */

import { PrismaClient } from '@prisma/client';
import { hashApiKey, generateApiKey, getApiKeyPrefix } from '../utils/hash';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface ApiKeyPermissions {
    verify_identity: boolean;
    check_liveness: boolean;
    check_duplicate: boolean;
    check_status: boolean;
}

export interface ApiKeyCreateData {
    name: string;
    permissions: ApiKeyPermissions;
    rateLimit: number;
    expiresAt?: Date;
}

export interface ApiKeyInfo {
    id: string;
    name: string;
    keyPrefix: string;
    isActive: boolean;
    permissions: ApiKeyPermissions;
    rateLimit: number;
    createdAt: Date;
    expiresAt?: Date;
    lastUsedAt?: Date;
}

/**
 * Create a new API key
 * Returns the full key only on creation (never stored)
 */
export async function createApiKey(data: ApiKeyCreateData): Promise<{
    apiKey: ApiKeyInfo;
    fullKey: string;
}> {
    // Generate the key
    const fullKey = generateApiKey();
    const keyHash = hashApiKey(fullKey);
    const keyPrefix = getApiKeyPrefix(fullKey);

    // Store in database
    const apiKey = await prisma.apiKey.create({
        data: {
            name: data.name,
            keyHash,
            keyPrefix,
            permissions: data.permissions as object,
            rateLimit: data.rateLimit,
            expiresAt: data.expiresAt,
            isActive: true,
        },
    });

    // Create audit log
    await prisma.auditLog.create({
        data: {
            action: 'api_key_created',
            performedBy: 'system',
            details: { keyId: apiKey.id, name: data.name },
        },
    });

    logger.info('API key created', {
        keyId: apiKey.id.slice(0, 8) + '...',
        name: data.name,
        rateLimit: data.rateLimit,
    });

    return {
        apiKey: {
            id: apiKey.id,
            name: apiKey.name,
            keyPrefix: apiKey.keyPrefix,
            isActive: apiKey.isActive,
            permissions: apiKey.permissions as unknown as ApiKeyPermissions,
            rateLimit: apiKey.rateLimit,
            createdAt: apiKey.createdAt,
            expiresAt: apiKey.expiresAt || undefined,
            lastUsedAt: apiKey.lastUsedAt || undefined,
        },
        fullKey,
    };
}

/**
 * Validate an API key and return its info
 */
export async function validateApiKey(key: string): Promise<{
    valid: boolean;
    apiKey?: ApiKeyInfo;
    error?: string;
}> {
    const keyHash = hashApiKey(key);

    const apiKey = await prisma.apiKey.findFirst({
        where: { keyHash },
    });

    if (!apiKey) {
        return { valid: false, error: 'Invalid API key' };
    }

    if (!apiKey.isActive) {
        return { valid: false, error: 'API key is inactive' };
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
        return { valid: false, error: 'API key has expired' };
    }

    // Update last used timestamp
    await prisma.apiKey.update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
    });

    return {
        valid: true,
        apiKey: {
            id: apiKey.id,
            name: apiKey.name,
            keyPrefix: apiKey.keyPrefix,
            isActive: apiKey.isActive,
            permissions: apiKey.permissions as unknown as ApiKeyPermissions,
            rateLimit: apiKey.rateLimit,
            createdAt: apiKey.createdAt,
            expiresAt: apiKey.expiresAt || undefined,
            lastUsedAt: new Date(),
        },
    };
}

/**
 * Check if API key has specific permission
 */
export function hasPermission(
    apiKey: ApiKeyInfo,
    permission: keyof ApiKeyPermissions
): boolean {
    return apiKey.permissions[permission] === true;
}

/**
 * List all API keys (without full key)
 */
export async function listApiKeys(): Promise<ApiKeyInfo[]> {
    const keys = await prisma.apiKey.findMany({
        orderBy: { createdAt: 'desc' },
    });

    return keys.map(key => ({
        id: key.id,
        name: key.name,
        keyPrefix: key.keyPrefix,
        isActive: key.isActive,
        permissions: key.permissions as unknown as ApiKeyPermissions,
        rateLimit: key.rateLimit,
        createdAt: key.createdAt,
        expiresAt: key.expiresAt || undefined,
        lastUsedAt: key.lastUsedAt || undefined,
    }));
}

/**
 * Get API key by ID
 */
export async function getApiKeyById(id: string): Promise<ApiKeyInfo | null> {
    const key = await prisma.apiKey.findUnique({
        where: { id },
    });

    if (!key) return null;

    return {
        id: key.id,
        name: key.name,
        keyPrefix: key.keyPrefix,
        isActive: key.isActive,
        permissions: key.permissions as unknown as ApiKeyPermissions,
        rateLimit: key.rateLimit,
        createdAt: key.createdAt,
        expiresAt: key.expiresAt || undefined,
        lastUsedAt: key.lastUsedAt || undefined,
    };
}

/**
 * Revoke (deactivate) an API key
 */
export async function revokeApiKey(id: string, performedBy?: string): Promise<boolean> {
    const key = await prisma.apiKey.update({
        where: { id },
        data: { isActive: false },
    });

    await prisma.auditLog.create({
        data: {
            action: 'api_key_revoked',
            performedBy,
            details: { keyId: id, name: key.name },
        },
    });

    logger.info('API key revoked', {
        keyId: id.slice(0, 8) + '...',
        name: key.name,
    });

    return true;
}

/**
 * Update API key settings
 */
export async function updateApiKey(
    id: string,
    updates: Partial<{
        name: string;
        permissions: ApiKeyPermissions;
        rateLimit: number;
        expiresAt: Date | null;
        isActive: boolean;
    }>
): Promise<ApiKeyInfo> {
    const key = await prisma.apiKey.update({
        where: { id },
        data: {
            ...updates,
            permissions: updates.permissions as object | undefined,
        },
    });

    return {
        id: key.id,
        name: key.name,
        keyPrefix: key.keyPrefix,
        isActive: key.isActive,
        permissions: key.permissions as unknown as ApiKeyPermissions,
        rateLimit: key.rateLimit,
        createdAt: key.createdAt,
        expiresAt: key.expiresAt || undefined,
        lastUsedAt: key.lastUsedAt || undefined,
    };
}

export const apiKeyService = {
    createApiKey,
    validateApiKey,
    hasPermission,
    listApiKeys,
    getApiKeyById,
    revokeApiKey,
    updateApiKey,
};

export default apiKeyService;
