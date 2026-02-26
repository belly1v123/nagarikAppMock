// Face-related types

export interface FaceDescriptors {
    front: number[];  // Float32Array[128] as number[]
    left: number[];   // Float32Array[128] as number[]
    right: number[];  // Float32Array[128] as number[]
}

export interface FaceImages {
    front?: string;  // base64 encoded image
    left?: string;   // base64 encoded image
    right?: string;  // base64 encoded image
}

export interface FaceCaptureResult {
    descriptor: number[];
    imageData: string;  // base64 encoded
    angle: FaceAngle;
    quality: QualityResult;
    timestamp: number;
}

export type FaceAngle = 'front' | 'left' | 'right';

export interface HeadPose {
    yaw: number;    // left-right rotation (-90 to 90)
    pitch: number;  // up-down rotation (-90 to 90)
    roll: number;   // tilt rotation (-90 to 90)
}

export interface QualityResult {
    acceptable: boolean;
    brightness: number;
    blur: number;
    reasons: string[];
}

export interface FaceDetectionResult {
    detected: boolean;
    faceCount: number;
    boundingBox?: BoundingBox;
    landmarks?: FaceLandmarks;
    descriptor?: number[];
    pose?: HeadPose;
    quality?: QualityResult;
    confidence: number;
}

export interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface FaceLandmarks {
    positions: { x: number; y: number }[];
    leftEye: { x: number; y: number }[];
    rightEye: { x: number; y: number }[];
    nose: { x: number; y: number }[];
    mouth: { x: number; y: number }[];
    jawOutline: { x: number; y: number }[];
}

export interface FaceMatchResult {
    frontDistance: number;
    leftDistance: number;
    rightDistance: number;
    bestDistance: number;
    bestAngle: FaceAngle;
    weightedScore: number;
    verified: boolean;
    confidence: 'high' | 'low' | 'none';
}

export interface DuplicateCheckResult {
    isDuplicate: boolean;
    matchedRecordId: string | null;
    closestDistance: number;
}

export interface LivenessResult {
    challenge: LivenessChallenge;
    passed: boolean;
    completionTimeMs: number;
    timestamp: number;
}

export type LivenessChallenge = 'blink' | 'smile' | 'turn_left' | 'turn_right';

export interface CaptureState {
    step: number;
    totalSteps: number;
    currentAngle: FaceAngle;
    status: CaptureStatus;
    instruction: string;
    countdown: number | null;
    captures: {
        front: FaceCaptureResult | null;
        left: FaceCaptureResult | null;
        right: FaceCaptureResult | null;
    };
}

export type CaptureStatus =
    | 'initializing'
    | 'waiting'
    | 'positioning'
    | 'ready'
    | 'capturing'
    | 'captured'
    | 'error';

// Face-api.js model loading
export interface ModelLoadingState {
    tinyFaceDetector: boolean;
    faceLandmark68Net: boolean;
    faceRecognitionNet: boolean;
    faceExpressionNet: boolean;
    allLoaded: boolean;
    progress: number;
    error: string | null;
}

// Face matching constants
export const FACE_MATCH_THRESHOLD = 0.50;
export const FACE_DUPLICATE_THRESHOLD = 0.45;
export const FACE_HIGH_CONFIDENCE_THRESHOLD = 0.40;

// Liveness timing constraints (in ms)
export const LIVENESS_TIMING = {
    blink: { min: 100, max: 500 },
    smile: { min: 300, max: 4000 },
    turn_left: { min: 500, max: 5000 },
    turn_right: { min: 500, max: 5000 },
} as const;
