/**
 * Admin API Client
 */

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

function getAuthHeader(): HeadersInit {
    const token = localStorage.getItem('adminToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(response: Response): Promise<T> {
    const data = await response.json();

    if (!response.ok) {
        if (response.status === 401) {
            localStorage.removeItem('adminToken');
            window.location.href = '/login';
        }
        throw new ApiError(response.status, data.error || 'An error occurred', data.details);
    }

    return data;
}

// Auth
export async function adminLogin(username: string, password: string): Promise<{ token: string }> {
    const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });

    const data = await handleResponse<{ success: boolean; token?: string; error?: string }>(response);

    if (data.token) {
        localStorage.setItem('adminToken', data.token);
        return { token: data.token };
    }

    throw new Error(data.error || 'Login failed');
}

export function adminLogout(): void {
    localStorage.removeItem('adminToken');
    window.location.href = '/login';
}

export function isAuthenticated(): boolean {
    return !!localStorage.getItem('adminToken');
}

// Stats
export async function getStats(): Promise<{
    totalCitizens: number;
    totalVerifications: number;
    verificationsByResult: { match: number; noMatch: number; error: number };
    recentRegistrations: number;
}> {
    const response = await fetch(`${API_BASE_URL}/api/admin/stats`, {
        headers: {
            ...getAuthHeader(),
            'Content-Type': 'application/json',
        },
    });

    const data = await handleResponse<{ success: boolean; data: unknown }>(response);
    return data.data as {
        totalCitizens: number;
        totalVerifications: number;
        verificationsByResult: { match: number; noMatch: number; error: number };
        recentRegistrations: number;
    };
}

// Citizens
export interface CitizenListItem {
    id: string;
    fullName: string;
    citizenshipNumber: string;
    district: string;
    isVoterEligible: boolean;
    createdAt: string;
}

export async function listCitizens(
    page: number = 1,
    limit: number = 20,
    search?: string
): Promise<{ citizens: CitizenListItem[]; total: number; page: number; totalPages: number }> {
    const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
    });

    const response = await fetch(`${API_BASE_URL}/api/admin/citizens?${params}`, {
        headers: {
            ...getAuthHeader(),
            'Content-Type': 'application/json',
        },
    });

    const data = await handleResponse<{ success: boolean; data: unknown }>(response);
    return data.data as { citizens: CitizenListItem[]; total: number; page: number; totalPages: number };
}

export async function getCitizen(id: string): Promise<CitizenListItem & {
    phoneNumber: string;
    municipality: string;
    wardNumber: number;
    dateOfBirth: string;
    gender: string;
}> {
    const response = await fetch(`${API_BASE_URL}/api/admin/citizens/${id}`, {
        headers: {
            ...getAuthHeader(),
            'Content-Type': 'application/json',
        },
    });

    const data = await handleResponse<{ success: boolean; data: unknown }>(response);
    return data.data as CitizenListItem & {
        phoneNumber: string;
        municipality: string;
        wardNumber: number;
        dateOfBirth: string;
        gender: string;
    };
}

export async function deleteCitizen(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/admin/citizens/${id}`, {
        method: 'DELETE',
        headers: {
            ...getAuthHeader(),
            'Content-Type': 'application/json',
        },
    });

    await handleResponse(response);
}

// API Keys
export interface ApiKey {
    id: string;
    name: string;
    keyPrefix: string;
    isActive: boolean;
    createdAt: string;
    lastUsedAt: string | null;
}

export async function listApiKeys(): Promise<ApiKey[]> {
    const response = await fetch(`${API_BASE_URL}/api/admin/api-keys`, {
        headers: {
            ...getAuthHeader(),
            'Content-Type': 'application/json',
        },
    });

    const data = await handleResponse<{ success: boolean; data: unknown }>(response);
    return data.data as ApiKey[];
}

export async function createApiKey(name: string): Promise<{ apiKey: ApiKey; rawKey: string }> {
    const response = await fetch(`${API_BASE_URL}/api/admin/api-keys`, {
        method: 'POST',
        headers: {
            ...getAuthHeader(),
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
    });

    const data = await handleResponse<{ success: boolean; data: unknown }>(response);
    return data.data as { apiKey: ApiKey; rawKey: string };
}

export async function revokeApiKey(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/admin/api-keys/${id}`, {
        method: 'DELETE',
        headers: {
            ...getAuthHeader(),
            'Content-Type': 'application/json',
        },
    });

    await handleResponse(response);
}

export { ApiError };
