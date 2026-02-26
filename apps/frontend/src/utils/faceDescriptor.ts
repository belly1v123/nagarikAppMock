/**
 * Face Descriptor Utilities
 * 
 * Functions for working with 128-dimensional face descriptors.
 */

// 128-dimensional face descriptor type
export type FaceDescriptor128 = number[];

/**
 * Calculate Euclidean distance between two face descriptors
 */
export function euclideanDistance(
    descriptor1: FaceDescriptor128 | Float32Array,
    descriptor2: FaceDescriptor128 | Float32Array
): number {
    const arr1 = Array.isArray(descriptor1) ? descriptor1 : Array.from(descriptor1);
    const arr2 = Array.isArray(descriptor2) ? descriptor2 : Array.from(descriptor2);

    if (arr1.length !== 128 || arr2.length !== 128) {
        throw new Error('Face descriptors must have 128 dimensions');
    }

    let sum = 0;
    for (let i = 0; i < 128; i++) {
        const diff = arr1[i] - arr2[i];
        sum += diff * diff;
    }

    return Math.sqrt(sum);
}

/**
 * Convert Float32Array to FaceDescriptor128 (number array)
 */
export function toDescriptorArray(data: Float32Array): FaceDescriptor128 {
    return Array.from(data) as FaceDescriptor128;
}

/**
 * Convert FaceDescriptor128 to Float32Array
 */
export function toFloat32Array(descriptor: FaceDescriptor128): Float32Array {
    return new Float32Array(descriptor);
}

/**
 * Validate that a descriptor has correct dimensions
 */
export function isValidDescriptor(
    descriptor: unknown
): descriptor is FaceDescriptor128 {
    return (
        Array.isArray(descriptor) &&
        descriptor.length === 128 &&
        descriptor.every((val) => typeof val === 'number' && !isNaN(val))
    );
}

/**
 * Calculate average descriptor from multiple descriptors
 * Useful for creating a "composite" face template
 */
export function averageDescriptors(
    descriptors: FaceDescriptor128[]
): FaceDescriptor128 {
    if (descriptors.length === 0) {
        throw new Error('Cannot average empty descriptor array');
    }

    if (descriptors.length === 1) {
        return [...descriptors[0]] as FaceDescriptor128;
    }

    const result = new Array(128).fill(0);

    for (const descriptor of descriptors) {
        for (let i = 0; i < 128; i++) {
            result[i] += descriptor[i];
        }
    }

    for (let i = 0; i < 128; i++) {
        result[i] /= descriptors.length;
    }

    return result as FaceDescriptor128;
}

/**
 * Normalize a descriptor to unit length
 */
export function normalizeDescriptor(
    descriptor: FaceDescriptor128
): FaceDescriptor128 {
    // Calculate L2 norm
    let norm = 0;
    for (let i = 0; i < 128; i++) {
        norm += descriptor[i] * descriptor[i];
    }
    norm = Math.sqrt(norm);

    if (norm === 0) {
        return descriptor;
    }

    const normalized = new Array(128);
    for (let i = 0; i < 128; i++) {
        normalized[i] = descriptor[i] / norm;
    }

    return normalized as FaceDescriptor128;
}

/**
 * Calculate cosine similarity between two descriptors
 * Returns value between -1 and 1 (1 = identical)
 */
export function cosineSimilarity(
    descriptor1: FaceDescriptor128,
    descriptor2: FaceDescriptor128
): number {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < 128; i++) {
        dotProduct += descriptor1[i] * descriptor2[i];
        norm1 += descriptor1[i] * descriptor1[i];
        norm2 += descriptor2[i] * descriptor2[i];
    }

    const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);

    if (denominator === 0) {
        return 0;
    }

    return dotProduct / denominator;
}

/**
 * Serialize descriptor to base64 string for storage/transmission
 */
export function serializeDescriptor(descriptor: FaceDescriptor128): string {
    const buffer = new Float32Array(descriptor).buffer;
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Deserialize base64 string back to descriptor
 */
export function deserializeDescriptor(base64: string): FaceDescriptor128 {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    const float32Array = new Float32Array(bytes.buffer);
    return Array.from(float32Array) as FaceDescriptor128;
}
