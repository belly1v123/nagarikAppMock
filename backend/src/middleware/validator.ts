/**
 * Zod Validation Middleware
 * 
 * Provides request body validation using Zod schemas.
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';

// ═══════════════════════════════════════════════════════════════
// VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════

// Citizenship number format: XX-XX-XX-XXXXX
const citizenshipNumberRegex = /^\d{2}-\d{2}-\d{2}-\d{5}$/;

// Nepal phone number format: +977XXXXXXXXXX or 98XXXXXXXX
const phoneNumberRegex = /^(\+977|977)?[9][0-9]\d{8}$/;

// Face descriptor: array of 128 numbers
const faceDescriptorSchema = z.array(z.number()).length(128);

/**
 * Citizen Registration Schema
 */
export const registrationSchema = z.object({
    fullName: z.string()
        .min(3, 'Full name must be at least 3 characters')
        .max(100, 'Full name must be at most 100 characters'),

    citizenshipNumber: z.string()
        .regex(citizenshipNumberRegex, 'Citizenship number must be in format XX-XX-XX-XXXXX'),

    dateOfBirth: z.string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
        .refine(date => {
            const dob = new Date(date);
            const today = new Date();
            const age = today.getFullYear() - dob.getFullYear();
            return age >= 16 && age <= 120;
        }, 'Invalid date of birth'),

    gender: z.enum(['male', 'female', 'other'], {
        errorMap: () => ({ message: 'Gender must be male, female, or other' }),
    }),

    district: z.string()
        .min(2, 'District is required'),

    municipality: z.string()
        .min(2, 'Municipality is required'),

    wardNumber: z.number()
        .int()
        .min(1, 'Ward number must be at least 1')
        .max(33, 'Ward number must be at most 33'),

    address: z.string().optional(),

    phoneNumber: z.string()
        .regex(phoneNumberRegex, 'Invalid phone number format'),

    email: z.string().email('Invalid email format').optional().or(z.literal('')),

    faceDescriptors: z.object({
        front: faceDescriptorSchema,
        left: faceDescriptorSchema,
        right: faceDescriptorSchema,
    }),

    faceImages: z.object({
        front: z.string().optional(),
        left: z.string().optional(),
        right: z.string().optional(),
    }).optional(),
});

/**
 * Identity Verification Schema
 */
export const identityVerificationSchema = z.object({
    phoneNumber: z.string()
        .regex(phoneNumberRegex, 'Invalid phone number format'),

    liveFaceDescriptor: faceDescriptorSchema,
});

/**
 * Liveness Verification Schema
 */
export const livenessVerificationSchema = z.object({
    phoneNumber: z.string()
        .regex(phoneNumberRegex, 'Invalid phone number format'),

    liveFaceDescriptor: faceDescriptorSchema,

    livenessResult: z.object({
        challenge: z.enum(['blink', 'smile', 'turn_left', 'turn_right']),
        passed: z.boolean(),
        completionTimeMs: z.number().positive(),
        timestamp: z.number().positive(),
    }),
});

/**
 * Duplicate Check Schema
 */
export const duplicateCheckSchema = z.object({
    liveFaceDescriptor: faceDescriptorSchema,
});

/**
 * Admin Login Schema
 */
export const adminLoginSchema = z.object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required'),
});

/**
 * API Key Create Schema
 */
export const apiKeyCreateSchema = z.object({
    name: z.string()
        .min(3, 'Name must be at least 3 characters')
        .max(100, 'Name must be at most 100 characters'),

    permissions: z.object({
        verify_identity: z.boolean(),
        check_liveness: z.boolean(),
        check_duplicate: z.boolean().optional().default(false),
        check_status: z.boolean().optional().default(false),
    }),

    rateLimit: z.number()
        .int()
        .min(1)
        .max(10000)
        .default(100),

    expiresAt: z.string().datetime().optional(),
});

/**
 * Citizen Flag Schema
 */
export const citizenFlagSchema = z.object({
    flagged: z.boolean(),
    reason: z.string().min(1, 'Reason is required when flagging'),
});

// ═══════════════════════════════════════════════════════════════
// VALIDATION MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

/**
 * Create validation middleware for any Zod schema
 */
export function validate<T extends ZodSchema>(schema: T) {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            schema.parse(req.body);
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const details: Record<string, string[]> = {};

                for (const issue of error.issues) {
                    const path = issue.path.join('.');
                    if (!details[path]) {
                        details[path] = [];
                    }
                    details[path].push(issue.message);
                }

                return res.status(400).json({
                    error: 'VALIDATION_ERROR',
                    message: 'Input validation failed',
                    details,
                });
            }

            return res.status(400).json({
                error: 'VALIDATION_ERROR',
                message: 'Invalid request body',
            });
        }
    };
}

/**
 * Parse and validate request, returning typed result
 */
export function parseRequest<T extends ZodSchema>(
    schema: T,
    data: unknown
): { success: true; data: z.infer<T> } | { success: false; errors: Record<string, string[]> } {
    const result = schema.safeParse(data);

    if (result.success) {
        return { success: true, data: result.data };
    }

    const errors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
        const path = issue.path.join('.');
        if (!errors[path]) {
            errors[path] = [];
        }
        errors[path].push(issue.message);
    }

    return { success: false, errors };
}

export default {
    validate,
    parseRequest,
    schemas: {
        registration: registrationSchema,
        identityVerification: identityVerificationSchema,
        livenessVerification: livenessVerificationSchema,
        duplicateCheck: duplicateCheckSchema,
        adminLogin: adminLoginSchema,
        apiKeyCreate: apiKeyCreateSchema,
        citizenFlag: citizenFlagSchema,
    },
};
