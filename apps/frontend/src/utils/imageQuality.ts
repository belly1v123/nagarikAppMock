/**
 * Image Quality Utilities
 * 
 * Functions for checking image brightness and blur levels.
 */

export interface QualityResult {
    isAcceptable: boolean;
    acceptable: boolean;     // Alias for isAcceptable
    brightness: number;      // 0-255
    blurScore: number;       // Higher = sharper
    issues: string[];
    reasons: string[];       // Alias for issues
}

// Quality thresholds
const MIN_BRIGHTNESS = 80;
const MAX_BRIGHTNESS = 220;
const MIN_BLUR_SCORE = 50;

/**
 * Check image brightness from canvas/image data
 * Returns average brightness (0-255)
 */
export function checkBrightness(imageData: ImageData): number {
    const data = imageData.data;
    let totalBrightness = 0;
    const pixelCount = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
        // Calculate perceived brightness using luminosity formula
        // Y = 0.299 R + 0.587 G + 0.114 B
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        totalBrightness += (0.299 * r + 0.587 * g + 0.114 * b);
    }

    return totalBrightness / pixelCount;
}

/**
 * Check image blur using Laplacian variance
 * Higher values indicate sharper images
 */
export function checkBlur(imageData: ImageData): number {
    const { width, height, data } = imageData;

    // Convert to grayscale
    const grayscale = new Float32Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
        const grayValue = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        grayscale[i / 4] = grayValue;
    }

    // Apply Laplacian kernel and calculate variance
    // Kernel: [0, -1, 0], [-1, 4, -1], [0, -1, 0]
    let sum = 0;
    let sumSquared = 0;
    let count = 0;

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;

            // Apply Laplacian kernel
            const laplacian =
                4 * grayscale[idx] -
                grayscale[idx - 1] -
                grayscale[idx + 1] -
                grayscale[idx - width] -
                grayscale[idx + width];

            sum += laplacian;
            sumSquared += laplacian * laplacian;
            count++;
        }
    }

    // Calculate variance
    const mean = sum / count;
    const variance = (sumSquared / count) - (mean * mean);

    return variance;
}

/**
 * Comprehensive image quality check
 * Accepts either ImageData directly or a canvas element with optional bounding box
 */
export function checkImageQuality(
    input: ImageData | HTMLCanvasElement,
    boundingBox?: { x: number; y: number; width: number; height: number }
): QualityResult {
    let imageData: ImageData;

    if (input instanceof HTMLCanvasElement) {
        const ctx = input.getContext('2d');
        if (!ctx) {
            return {
                isAcceptable: false,
                acceptable: false,
                brightness: 0,
                blurScore: 0,
                issues: ['Could not get canvas context'],
                reasons: ['Could not get canvas context'],
            };
        }

        if (boundingBox) {
            // Extract just the face region
            const { x, y, width, height } = boundingBox;
            imageData = ctx.getImageData(
                Math.max(0, x),
                Math.max(0, y),
                Math.min(width, input.width - x),
                Math.min(height, input.height - y)
            );
        } else {
            imageData = ctx.getImageData(0, 0, input.width, input.height);
        }
    } else {
        imageData = input;
    }

    const brightness = checkBrightness(imageData);
    const blurScore = checkBlur(imageData);
    const issues: string[] = [];

    // Check brightness issues
    if (brightness < MIN_BRIGHTNESS) {
        issues.push('Image is too dark. Please improve lighting.');
    } else if (brightness > MAX_BRIGHTNESS) {
        issues.push('Image is too bright. Please reduce light exposure.');
    }

    // Check blur issues
    if (blurScore < MIN_BLUR_SCORE) {
        issues.push('Image is blurry. Please hold the camera steady.');
    }

    return {
        isAcceptable: issues.length === 0,
        acceptable: issues.length === 0,
        brightness,
        blurScore,
        issues,
        reasons: issues,
    };
}

/**
 * Check if quality is acceptable for face capture
 */
export function isQualityAcceptable(imageData: ImageData): boolean {
    const brightness = checkBrightness(imageData);
    const blurScore = checkBlur(imageData);

    return (
        brightness >= MIN_BRIGHTNESS &&
        brightness <= MAX_BRIGHTNESS &&
        blurScore >= MIN_BLUR_SCORE
    );
}

/**
 * Get image data from a video element
 */
export function getImageDataFromVideo(
    video: HTMLVideoElement,
    canvas?: HTMLCanvasElement
): ImageData {
    const targetCanvas = canvas || document.createElement('canvas');
    targetCanvas.width = video.videoWidth;
    targetCanvas.height = video.videoHeight;

    const ctx = targetCanvas.getContext('2d');
    if (!ctx) {
        throw new Error('Could not get canvas context');
    }

    ctx.drawImage(video, 0, 0);
    return ctx.getImageData(0, 0, targetCanvas.width, targetCanvas.height);
}

/**
 * Get image data from a canvas element
 */
export function getImageDataFromCanvas(canvas: HTMLCanvasElement): ImageData {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Could not get canvas context');
    }

    return ctx.getImageData(0, 0, canvas.width, canvas.height);
}
