/**
 * API Client for Nagarik Backend
 */

import type {
    RegistrationRequest,
    RegistrationResponse,
    VerifyIdentityRequest,
    VerifyIdentityResponse,
    LivenessVerificationRequest,
    LivenessVerificationResponse,
    DuplicateCheckRequest,
    DuplicateCheckResponse,
} from '../types';

const API_BASE_URL = (import.meta as unknown as { env: Record<string, string> }).env.VITE_API_URL || 'http://localhost:3001';

class ApiError extends Error {
    constructor(
        public statusCode: number,
        message: string,
        public details?: unknown
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

async function handleResponse<T>(response: Response): Promise<T> {
    const data = await response.json();

    if (!response.ok) {
        // Build detailed error message
        let errorMessage = data.message || data.error || 'An error occurred';

        // If there are field-specific validation errors, append them
        if (data.details && typeof data.details === 'object') {
            const fieldErrors = Object.entries(data.details)
                .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
                .join('; ');
            if (fieldErrors) {
                errorMessage = `${errorMessage} - ${fieldErrors}`;
            }
        }

        throw new ApiError(
            response.status,
            errorMessage,
            data.details
        );
    }

    return data;
}

/**
 * Register a new citizen
 */
export async function registerCitizen(
    data: RegistrationRequest
): Promise<RegistrationResponse> {
    const response = await fetch(`${API_BASE_URL}/api/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    return handleResponse<RegistrationResponse>(response);
}

/**
 * Verify citizen identity (requires API key - for third-party use)
 */
export async function verifyIdentity(
    data: VerifyIdentityRequest,
    apiKey: string
): Promise<VerifyIdentityResponse> {
    const response = await fetch(`${API_BASE_URL}/api/verify/identity`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey,
        },
        body: JSON.stringify(data),
    });

    return handleResponse<VerifyIdentityResponse>(response);
}

/**
 * Liveness and identity verification (requires API key - for third-party use)
 */
export async function verifyLivenessAndIdentity(
    data: LivenessVerificationRequest,
    apiKey: string
): Promise<LivenessVerificationResponse> {
    const response = await fetch(`${API_BASE_URL}/api/verify/liveness-and-identity`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey,
        },
        body: JSON.stringify(data),
    });

    return handleResponse<LivenessVerificationResponse>(response);
}

/**
 * Check for duplicate face (requires API key)
 */
export async function checkDuplicateFace(
    data: DuplicateCheckRequest,
    apiKey: string
): Promise<DuplicateCheckResponse> {
    const response = await fetch(`${API_BASE_URL}/api/verify/check-duplicate-face`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey,
        },
        body: JSON.stringify(data),
    });

    return handleResponse<DuplicateCheckResponse>(response);
}

/**
 * Health check
 */
export async function healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await fetch(`${API_BASE_URL}/health`);
    return handleResponse<{ status: string; timestamp: string }>(response);
}

export { ApiError };
