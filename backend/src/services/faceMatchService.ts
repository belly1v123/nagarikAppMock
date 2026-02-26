/**
 * Face Match Service
 * 
 * Handles face descriptor comparison for identity verification and duplicate detection.
 * Uses Euclidean distance to compare 128-dimensional face descriptors from face-api.js.
 */

import { config } from '../config';
import { euclideanDistance, parseDescriptor, isValidDescriptor } from '../utils/faceDistance';
import { logger } from '../utils/logger';

// Constants from config
const MATCH_THRESHOLD = config.faceMatchThreshold;           // 0.50 - below = same person
const DUPLICATE_THRESHOLD = config.faceDuplicateThreshold;   // 0.45 - below = duplicate at registration
const HIGH_CONFIDENCE = config.faceHighConfidenceThreshold;  // 0.40 - very strong match

export type FaceAngle = 'front' | 'left' | 'right';
export type ConfidenceLevel = 'high' | 'low' | 'none';

export interface StoredDescriptors {
    front: number[];
    left: number[];
    right: number[];
}

export interface FaceMatchResult {
    frontDistance: number;
    leftDistance: number;
    rightDistance: number;
    bestDistance: number;
    bestAngle: FaceAngle;
    weightedScore: number;
    verified: boolean;
    confidence: ConfidenceLevel;
}

export interface DuplicateCheckResult {
    isDuplicate: boolean;
    matchedRecordId: string | null;
    closestDistance: number;
}

export interface ExistingRecord {
    id: string;
    faceDescriptorFront: unknown;  // JSON from Prisma
    faceDescriptorLeft: unknown;   // JSON from Prisma
    faceDescriptorRight: unknown;  // JSON from Prisma
}

/**
 * Compare a live face descriptor against stored descriptors
 * Returns match result with distances for all angles and overall verification status
 */
export function compareFaceDescriptors(
    liveDescriptor: number[],
    storedDescriptors: StoredDescriptors
): FaceMatchResult {
    // Validate inputs
    if (!isValidDescriptor(liveDescriptor)) {
        throw new Error('Invalid live descriptor');
    }
    if (!isValidDescriptor(storedDescriptors.front) ||
        !isValidDescriptor(storedDescriptors.left) ||
        !isValidDescriptor(storedDescriptors.right)) {
        throw new Error('Invalid stored descriptors');
    }

    // Calculate distances for each angle
    const frontDistance = euclideanDistance(liveDescriptor, storedDescriptors.front);
    const leftDistance = euclideanDistance(liveDescriptor, storedDescriptors.left);
    const rightDistance = euclideanDistance(liveDescriptor, storedDescriptors.right);

    // Find best match (minimum distance)
    let bestDistance = frontDistance;
    let bestAngle: FaceAngle = 'front';

    if (leftDistance < bestDistance) {
        bestDistance = leftDistance;
        bestAngle = 'left';
    }
    if (rightDistance < bestDistance) {
        bestDistance = rightDistance;
        bestAngle = 'right';
    }

    // Calculate weighted score (0-1, higher = better match)
    // Front descriptor weighted more heavily as it's typically the most reliable
    const weightedScore =
        (1 - Math.min(frontDistance, 1)) * 0.5 +
        (1 - Math.min(leftDistance, 1)) * 0.25 +
        (1 - Math.min(rightDistance, 1)) * 0.25;

    // Determine verification result and confidence level
    let verified = false;
    let confidence: ConfidenceLevel = 'none';

    if (bestDistance < HIGH_CONFIDENCE) {
        verified = true;
        confidence = 'high';
    } else if (bestDistance < MATCH_THRESHOLD) {
        verified = true;
        confidence = 'low';
    } else if (bestDistance < MATCH_THRESHOLD + 0.05) {
        // Borderline case
        verified = false;
        confidence = 'low';
    }

    logger.debug('Face comparison result', {
        frontDistance: frontDistance.toFixed(4),
        leftDistance: leftDistance.toFixed(4),
        rightDistance: rightDistance.toFixed(4),
        bestDistance: bestDistance.toFixed(4),
        bestAngle,
        weightedScore: weightedScore.toFixed(4),
        verified,
        confidence,
    });

    return {
        frontDistance,
        leftDistance,
        rightDistance,
        bestDistance,
        bestAngle,
        weightedScore,
        verified,
        confidence,
    };
}

/**
 * Check if a new face descriptor matches any existing records
 * Used during registration to prevent duplicate identities
 */
export function checkDuplicateFace(
    newDescriptors: StoredDescriptors,
    existingRecords: ExistingRecord[]
): DuplicateCheckResult {
    let isDuplicate = false;
    let matchedRecordId: string | null = null;
    let closestDistance = Infinity;

    // Validate new descriptors
    if (!isValidDescriptor(newDescriptors.front) ||
        !isValidDescriptor(newDescriptors.left) ||
        !isValidDescriptor(newDescriptors.right)) {
        throw new Error('Invalid new descriptors for duplicate check');
    }

    // Compare against all existing records
    for (const record of existingRecords) {
        try {
            // Parse stored descriptors from JSON
            const storedFront = parseDescriptor(record.faceDescriptorFront);
            const storedLeft = parseDescriptor(record.faceDescriptorLeft);
            const storedRight = parseDescriptor(record.faceDescriptorRight);

            // Primary comparison: front to front
            const frontDistance = euclideanDistance(newDescriptors.front, storedFront);

            // Update closest match tracking
            if (frontDistance < closestDistance) {
                closestDistance = frontDistance;

                // Check if this is a duplicate
                if (frontDistance < DUPLICATE_THRESHOLD) {
                    // Secondary verification with side angles
                    const leftDistance = euclideanDistance(newDescriptors.left, storedLeft);
                    const rightDistance = euclideanDistance(newDescriptors.right, storedRight);

                    // Consider duplicate if front matches AND at least one side matches
                    if (frontDistance < DUPLICATE_THRESHOLD &&
                        (leftDistance < DUPLICATE_THRESHOLD + 0.1 || rightDistance < DUPLICATE_THRESHOLD + 0.1)) {
                        isDuplicate = true;
                        matchedRecordId = record.id;

                        logger.warn('Duplicate face detected', {
                            matchedRecordId: record.id.slice(0, 8) + '...',
                            frontDistance: frontDistance.toFixed(4),
                            leftDistance: leftDistance.toFixed(4),
                            rightDistance: rightDistance.toFixed(4),
                        });
                    }
                }
            }
        } catch (error) {
            // Skip records with invalid descriptors
            logger.warn('Skipping record with invalid descriptor', {
                recordId: record.id.slice(0, 8) + '...',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    return {
        isDuplicate,
        matchedRecordId,
        closestDistance: closestDistance === Infinity ? 1 : closestDistance,
    };
}

/**
 * Quick check for potential duplicate using only front descriptor
 * Used for faster screening before full check
 */
export function quickDuplicateCheck(
    newFrontDescriptor: number[],
    existingFrontDescriptors: { id: string; front: number[] }[]
): { potentialDuplicate: boolean; candidateIds: string[] } {
    const candidates: string[] = [];
    const QUICK_CHECK_THRESHOLD = DUPLICATE_THRESHOLD + 0.15; // Slightly higher threshold for screening

    for (const existing of existingFrontDescriptors) {
        try {
            const distance = euclideanDistance(newFrontDescriptor, existing.front);
            if (distance < QUICK_CHECK_THRESHOLD) {
                candidates.push(existing.id);
            }
        } catch {
            // Skip invalid descriptors
        }
    }

    return {
        potentialDuplicate: candidates.length > 0,
        candidateIds: candidates,
    };
}

/**
 * Find the best matching citizen for a given face descriptor
 * Returns the citizen ID with the best match score
 */
export function findBestMatch(
    liveDescriptor: number[],
    existingRecords: ExistingRecord[],
    threshold: number = MATCH_THRESHOLD
): { found: boolean; citizenId: string | null; matchScore: number; matchAngle: FaceAngle } {
    let bestCitizenId: string | null = null;
    let bestScore = Infinity;
    let bestMatchAngle: FaceAngle = 'front';

    for (const record of existingRecords) {
        try {
            const storedFront = parseDescriptor(record.faceDescriptorFront);
            const storedLeft = parseDescriptor(record.faceDescriptorLeft);
            const storedRight = parseDescriptor(record.faceDescriptorRight);

            const result = compareFaceDescriptors(liveDescriptor, {
                front: storedFront,
                left: storedLeft,
                right: storedRight,
            });

            if (result.bestDistance < bestScore) {
                bestScore = result.bestDistance;
                bestCitizenId = record.id;
                bestMatchAngle = result.bestAngle;
            }
        } catch {
            // Skip invalid records
        }
    }

    return {
        found: bestScore < threshold,
        citizenId: bestScore < threshold ? bestCitizenId : null,
        matchScore: bestScore === Infinity ? 1 : bestScore,
        matchAngle: bestMatchAngle,
    };
}

/**
 * Verify that descriptors belong to the same person
 * Compares front, left, and right descriptors to each other
 * Returns false if the angles don't appear to be from the same face
 */
export function verifyDescriptorConsistency(descriptors: StoredDescriptors): {
    isConsistent: boolean;
    frontLeftDistance: number;
    frontRightDistance: number;
    leftRightDistance: number;
} {
    // Same-person descriptors from different angles should have
    // distances below 0.6-0.7 from each other
    const CONSISTENCY_THRESHOLD = 0.7;

    const frontLeftDistance = euclideanDistance(descriptors.front, descriptors.left);
    const frontRightDistance = euclideanDistance(descriptors.front, descriptors.right);
    const leftRightDistance = euclideanDistance(descriptors.left, descriptors.right);

    const isConsistent =
        frontLeftDistance < CONSISTENCY_THRESHOLD &&
        frontRightDistance < CONSISTENCY_THRESHOLD &&
        leftRightDistance < CONSISTENCY_THRESHOLD;

    return {
        isConsistent,
        frontLeftDistance,
        frontRightDistance,
        leftRightDistance,
    };
}

export const faceMatchService = {
    compareFaceDescriptors,
    checkDuplicateFace,
    quickDuplicateCheck,
    findBestMatch,
    verifyDescriptorConsistency,
};

export default faceMatchService;
