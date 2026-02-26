/**
 * Face descriptor distance calculations
 * 
 * Face descriptors are 128-dimensional vectors produced by face-api.js
 * The euclidean distance between two descriptors indicates similarity:
 * - Lower distance = more similar faces
 * - Distance < 0.45 = likely same person (duplicate threshold)
 * - Distance < 0.50 = probable match (verification threshold)
 * - Distance >= 0.55 = different people
 */

/**
 * Calculate Euclidean distance between two face descriptors
 * Formula: sqrt(sum((a[i] - b[i])^2)) for all 128 dimensions
 */
export function euclideanDistance(a: number[], b: number[]): number {
    if (a.length !== b.length) {
        throw new Error(`Descriptor length mismatch: ${a.length} vs ${b.length}`);
    }

    if (a.length !== 128) {
        throw new Error(`Invalid descriptor length: ${a.length} (expected 128)`);
    }

    let sum = 0;
    for (let i = 0; i < 128; i++) {
        const diff = a[i] - b[i];
        sum += diff * diff;
    }

    return Math.sqrt(sum);
}

/**
 * Calculate cosine similarity between two face descriptors
 * Returns value between -1 and 1 (1 = identical, 0 = orthogonal, -1 = opposite)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length !== 128) {
        throw new Error('Invalid descriptor length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < 128; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;

    return dotProduct / denominator;
}

/**
 * Validate that a descriptor is a valid 128-dimensional array
 */
export function isValidDescriptor(descriptor: unknown): descriptor is number[] {
    if (!Array.isArray(descriptor)) return false;
    if (descriptor.length !== 128) return false;
    return descriptor.every(v => typeof v === 'number' && !isNaN(v) && isFinite(v));
}

/**
 * Parse a descriptor from JSON (handles both array and JSON string)
 */
export function parseDescriptor(descriptor: unknown): number[] {
    if (typeof descriptor === 'string') {
        try {
            const parsed = JSON.parse(descriptor);
            if (isValidDescriptor(parsed)) return parsed;
        } catch {
            throw new Error('Invalid descriptor JSON string');
        }
    }

    if (isValidDescriptor(descriptor)) return descriptor;

    throw new Error('Invalid descriptor format');
}

/**
 * Normalize a descriptor to unit length (L2 normalization)
 * This can improve matching consistency
 */
export function normalizeDescriptor(descriptor: number[]): number[] {
    const norm = Math.sqrt(descriptor.reduce((sum, v) => sum + v * v, 0));
    if (norm === 0) return descriptor;
    return descriptor.map(v => v / norm);
}

/**
 * Generate a random descriptor for testing purposes
 * NOTE: These are NOT real face descriptors and should only be used for seeding test data
 */
export function generateRandomDescriptor(): number[] {
    const descriptor: number[] = [];
    for (let i = 0; i < 128; i++) {
        // Face-api.js descriptors typically range from -0.3 to 0.3
        descriptor.push((Math.random() - 0.5) * 0.6);
    }
    return normalizeDescriptor(descriptor);
}
