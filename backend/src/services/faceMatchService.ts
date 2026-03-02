/**
 * Face Match Service
 * 
 * Handles face descriptor comparison for identity verification and duplicate detection.
 * Uses Euclidean distance to compare 128-dimensional face descriptors from face-api.js.
 */

import { config } from '../config';
import {
    euclideanDistance,
    cosineSimilarity,
    normalizeDescriptor,
    parseDescriptor,
    isValidDescriptor,
} from '../utils/faceDistance';
import { logger } from '../utils/logger';

// Constants from config
const MATCH_THRESHOLD = config.faceMatchThreshold;           // 0.50 - below = same person
const DUPLICATE_THRESHOLD = config.faceDuplicateThreshold;   // 0.45 - below = duplicate at registration
const HIGH_CONFIDENCE = config.faceHighConfidenceThreshold;  // 0.40 - very strong match
const MIN_COSINE_SIMILARITY = config.faceMinCosineSimilarity;
const SIDE_ANGLE_ALLOWANCE = config.faceSideAngleAllowance;
const AMBIGUOUS_DISTANCE_MARGIN = config.faceAmbiguousDistanceMargin;
const DESCRIPTOR_NORM_MIN = config.faceDescriptorNormMin;
const DESCRIPTOR_NORM_MAX = config.faceDescriptorNormMax;
const DESCRIPTOR_VARIANCE_MIN = config.faceDescriptorVarianceMin;
const CONSISTENCY_THRESHOLD = config.faceConsistencyThreshold;

interface DescriptorQuality {
    norm: number;
    variance: number;
    meanAbs: number;
    isAcceptable: boolean;
}

interface MatchSignals {
    euclidean: number;
    cosine: number;
    cosineDistance: number;
    compositeDistance: number;
}

function evaluateDescriptorQuality(descriptor: number[]): DescriptorQuality {
    const normSquared = descriptor.reduce((sum, value) => sum + (value * value), 0);
    const norm = Math.sqrt(normSquared);
    const mean = descriptor.reduce((sum, value) => sum + value, 0) / descriptor.length;
    const variance = descriptor.reduce((sum, value) => {
        const diff = value - mean;
        return sum + (diff * diff);
    }, 0) / descriptor.length;
    const meanAbs = descriptor.reduce((sum, value) => sum + Math.abs(value), 0) / descriptor.length;

    const isAcceptable =
        norm >= DESCRIPTOR_NORM_MIN &&
        norm <= DESCRIPTOR_NORM_MAX &&
        variance >= DESCRIPTOR_VARIANCE_MIN &&
        meanAbs > 0;

    return {
        norm,
        variance,
        meanAbs,
        isAcceptable,
    };
}

function ensureDescriptorQuality(descriptor: number[], label: string): void {
    const quality = evaluateDescriptorQuality(descriptor);
    if (!quality.isAcceptable) {
        throw new Error(
            `${label} failed quality gates (norm=${quality.norm.toFixed(4)}, variance=${quality.variance.toFixed(6)})`
        );
    }
}

function calculateMatchSignals(live: number[], stored: number[]): MatchSignals {
    const euclidean = euclideanDistance(live, stored);
    const normalizedLive = normalizeDescriptor(live);
    const normalizedStored = normalizeDescriptor(stored);
    const cosine = cosineSimilarity(normalizedLive, normalizedStored);
    const cosineDistance = 1 - cosine;

    // Weighted composite distance (lower = better).
    // Euclidean remains primary signal for compatibility with existing thresholds.
    const compositeDistance = (euclidean * 0.75) + (cosineDistance * 0.25);

    return {
        euclidean,
        cosine,
        cosineDistance,
        compositeDistance,
    };
}

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

export interface FaceDuplicateCheckResult {
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

    ensureDescriptorQuality(liveDescriptor, 'Live descriptor');
    ensureDescriptorQuality(storedDescriptors.front, 'Stored front descriptor');
    ensureDescriptorQuality(storedDescriptors.left, 'Stored left descriptor');
    ensureDescriptorQuality(storedDescriptors.right, 'Stored right descriptor');

    // Calculate distances for each angle
    const frontSignals = calculateMatchSignals(liveDescriptor, storedDescriptors.front);
    const leftSignals = calculateMatchSignals(liveDescriptor, storedDescriptors.left);
    const rightSignals = calculateMatchSignals(liveDescriptor, storedDescriptors.right);

    const frontDistance = frontSignals.euclidean;
    const leftDistance = leftSignals.euclidean;
    const rightDistance = rightSignals.euclidean;

    const rankedAngles: Array<{ angle: FaceAngle; signals: MatchSignals }> = [
        { angle: 'front' as FaceAngle, signals: frontSignals },
        { angle: 'left' as FaceAngle, signals: leftSignals },
        { angle: 'right' as FaceAngle, signals: rightSignals },
    ].sort((a, b) => a.signals.compositeDistance - b.signals.compositeDistance);

    const best = rankedAngles[0];
    const secondBest = rankedAngles[1];

    const bestDistance = best.signals.euclidean;
    const bestAngle = best.angle;

    // Calculate weighted score (0-1, higher = better match)
    // Front descriptor weighted more heavily as it's typically the most reliable.
    // Use composite distance to reduce sensitivity to single-metric noise.
    const weightedScore =
        (1 - Math.min(frontSignals.compositeDistance, 1)) * 0.5 +
        (1 - Math.min(leftSignals.compositeDistance, 1)) * 0.25 +
        (1 - Math.min(rightSignals.compositeDistance, 1)) * 0.25;

    // Determine verification result and confidence level
    let verified = false;
    let confidence: ConfidenceLevel = 'none';

    const bestCosine = best.signals.cosine;
    const separation = secondBest.signals.euclidean - bestDistance;
    const isAmbiguous = separation < AMBIGUOUS_DISTANCE_MARGIN;

    if (!isAmbiguous && bestDistance < HIGH_CONFIDENCE && bestCosine >= MIN_COSINE_SIMILARITY + 0.03) {
        verified = true;
        confidence = 'high';
    } else if (!isAmbiguous && bestDistance < MATCH_THRESHOLD && bestCosine >= MIN_COSINE_SIMILARITY) {
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
        bestCosine: bestCosine.toFixed(4),
        bestAngle,
        separation: separation.toFixed(4),
        isAmbiguous,
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
): FaceDuplicateCheckResult {
    let isDuplicate = false;
    let matchedRecordId: string | null = null;
    let closestDistance = Infinity;
    let bestDuplicateComposite = Infinity;

    // Validate new descriptors
    if (!isValidDescriptor(newDescriptors.front) ||
        !isValidDescriptor(newDescriptors.left) ||
        !isValidDescriptor(newDescriptors.right)) {
        throw new Error('Invalid new descriptors for duplicate check');
    }

    ensureDescriptorQuality(newDescriptors.front, 'New front descriptor');
    ensureDescriptorQuality(newDescriptors.left, 'New left descriptor');
    ensureDescriptorQuality(newDescriptors.right, 'New right descriptor');

    // Compare against all existing records
    for (const record of existingRecords) {
        try {
            // Parse stored descriptors from JSON
            const storedFront = parseDescriptor(record.faceDescriptorFront);
            const storedLeft = parseDescriptor(record.faceDescriptorLeft);
            const storedRight = parseDescriptor(record.faceDescriptorRight);

            const storedFrontQuality = evaluateDescriptorQuality(storedFront);
            const storedLeftQuality = evaluateDescriptorQuality(storedLeft);
            const storedRightQuality = evaluateDescriptorQuality(storedRight);

            if (!storedFrontQuality.isAcceptable || !storedLeftQuality.isAcceptable || !storedRightQuality.isAcceptable) {
                logger.warn('Skipping low-quality stored descriptors', {
                    recordId: record.id.slice(0, 8) + '...',
                    frontNorm: storedFrontQuality.norm.toFixed(4),
                    leftNorm: storedLeftQuality.norm.toFixed(4),
                    rightNorm: storedRightQuality.norm.toFixed(4),
                });
                continue;
            }

            // Primary comparison: same-angle signals
            const frontSignals = calculateMatchSignals(newDescriptors.front, storedFront);
            const leftSignals = calculateMatchSignals(newDescriptors.left, storedLeft);
            const rightSignals = calculateMatchSignals(newDescriptors.right, storedRight);
            const frontDistance = frontSignals.euclidean;

            // Update closest match tracking
            if (frontDistance < closestDistance) {
                closestDistance = frontDistance;
            }

            const sideThreshold = DUPLICATE_THRESHOLD + SIDE_ANGLE_ALLOWANCE;
            const frontMatch =
                frontSignals.euclidean < DUPLICATE_THRESHOLD &&
                frontSignals.cosine >= MIN_COSINE_SIMILARITY;

            const sideMatchCount = [leftSignals, rightSignals].filter(signal =>
                signal.euclidean < sideThreshold &&
                signal.cosine >= (MIN_COSINE_SIMILARITY - 0.02)
            ).length;

            const compositeDistance =
                (frontSignals.compositeDistance * 0.5) +
                (leftSignals.compositeDistance * 0.25) +
                (rightSignals.compositeDistance * 0.25);

            const recordIsDuplicate =
                (frontMatch && sideMatchCount >= 1) ||
                (compositeDistance < DUPLICATE_THRESHOLD && sideMatchCount === 2);

            if (recordIsDuplicate && compositeDistance < bestDuplicateComposite) {
                bestDuplicateComposite = compositeDistance;
                isDuplicate = true;
                matchedRecordId = record.id;

                logger.warn('Duplicate face candidate detected', {
                    matchedRecordId: record.id.slice(0, 8) + '...',
                    frontDistance: frontSignals.euclidean.toFixed(4),
                    leftDistance: leftSignals.euclidean.toFixed(4),
                    rightDistance: rightSignals.euclidean.toFixed(4),
                    frontCosine: frontSignals.cosine.toFixed(4),
                    compositeDistance: compositeDistance.toFixed(4),
                    sideMatchCount,
                });
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

    if (!isValidDescriptor(newFrontDescriptor)) {
        throw new Error('Invalid new front descriptor for quick duplicate check');
    }

    ensureDescriptorQuality(newFrontDescriptor, 'New front descriptor');

    for (const existing of existingFrontDescriptors) {
        try {
            if (!isValidDescriptor(existing.front)) {
                continue;
            }

            const quality = evaluateDescriptorQuality(existing.front);
            if (!quality.isAcceptable) {
                continue;
            }

            const signal = calculateMatchSignals(newFrontDescriptor, existing.front);
            if (signal.euclidean < QUICK_CHECK_THRESHOLD && signal.cosine >= (MIN_COSINE_SIMILARITY - 0.05)) {
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
    if (!isValidDescriptor(descriptors.front) ||
        !isValidDescriptor(descriptors.left) ||
        !isValidDescriptor(descriptors.right)) {
        return {
            isConsistent: false,
            frontLeftDistance: 1,
            frontRightDistance: 1,
            leftRightDistance: 1,
        };
    }

    const frontQuality = evaluateDescriptorQuality(descriptors.front);
    const leftQuality = evaluateDescriptorQuality(descriptors.left);
    const rightQuality = evaluateDescriptorQuality(descriptors.right);

    if (!frontQuality.isAcceptable || !leftQuality.isAcceptable || !rightQuality.isAcceptable) {
        logger.warn('Descriptor quality below preferred registration gate, proceeding with consistency distance check', {
            frontNorm: frontQuality.norm.toFixed(4),
            leftNorm: leftQuality.norm.toFixed(4),
            rightNorm: rightQuality.norm.toFixed(4),
            frontVariance: frontQuality.variance.toFixed(6),
            leftVariance: leftQuality.variance.toFixed(6),
            rightVariance: rightQuality.variance.toFixed(6),
        });
    }

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
