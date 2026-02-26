/**
 * useFaceCapture Hook
 * 
 * Manages the 3-angle face capture flow with auto-capture logic.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { FaceDetectionResult } from './useFaceApi';
import { estimateHeadPose, HeadPose } from '../utils/poseDetection';
import { checkImageQuality, QualityResult } from '../utils/imageQuality';

export type FaceAngle = 'front' | 'left' | 'right';
export type CaptureStatus = 'waiting' | 'positioning' | 'ready' | 'capturing' | 'captured' | 'error';

export interface FaceCaptureData {
    descriptor: number[];
    imageData: string;
    angle: FaceAngle;
    quality: QualityResult;
    timestamp: number;
}

export interface CaptureState {
    currentAngle: FaceAngle;
    status: CaptureStatus;
    instruction: string;
    countdown: number | null;
    errorMessage: string | null;
    captures: {
        front: FaceCaptureData | null;
        left: FaceCaptureData | null;
        right: FaceCaptureData | null;
    };
}

interface UseFaceCaptureOptions {
    onCapture?: (data: FaceCaptureData) => void;
    onComplete?: (captures: { front: FaceCaptureData; left: FaceCaptureData; right: FaceCaptureData }) => void;
    onError?: (error: string) => void;
}

// Capture requirements
const FRONT_CAPTURE_CONFIG = {
    minConfidence: 0.85,
    maxYaw: 15,
    maxPitch: 15,
    minFaceWidth: 0.25, // 25% of frame width
    centerTolerance: 0.15, // nose within center 30%
    holdFrames: 3,
};

const LEFT_CAPTURE_CONFIG = {
    minConfidence: 0.7,
    noseXMax: 0.35, // nose x < 35% of frame
    holdFrames: 3,
};

const RIGHT_CAPTURE_CONFIG = {
    minConfidence: 0.7,
    noseXMin: 0.65, // nose x > 65% of frame
    holdFrames: 3,
};

export function useFaceCapture(options: UseFaceCaptureOptions = {}) {
    const { onCapture, onComplete, onError } = options;

    const [state, setState] = useState<CaptureState>({
        currentAngle: 'front',
        status: 'waiting',
        instruction: 'Position your face in the oval',
        countdown: null,
        errorMessage: null,
        captures: {
            front: null,
            left: null,
            right: null,
        },
    });

    const readyFramesRef = useRef(0);
    const countdownIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Get instruction for current angle
    const getInstruction = useCallback((angle: FaceAngle): string => {
        switch (angle) {
            case 'front':
                return 'Look straight at the camera';
            case 'left':
                return 'Slowly turn your head to the LEFT';
            case 'right':
                return 'Slowly turn your head to the RIGHT';
        }
    }, []);

    // Check if capture requirements are met for current angle
    const checkCaptureRequirements = useCallback((
        detection: FaceDetectionResult,
        pose: HeadPose,
        frameWidth: number,
        angle: FaceAngle
    ): { met: boolean; status: CaptureStatus; message: string } => {
        if (!detection.detected || !detection.boundingBox) {
            return { met: false, status: 'waiting', message: 'Position your face in the oval' };
        }

        const { boundingBox, confidence, landmarks } = detection;
        const faceWidthRatio = boundingBox.width / frameWidth;

        if (angle === 'front') {
            // Check confidence
            if (confidence < FRONT_CAPTURE_CONFIG.minConfidence) {
                return { met: false, status: 'positioning', message: 'Move closer to the camera' };
            }

            // Check face size
            if (faceWidthRatio < FRONT_CAPTURE_CONFIG.minFaceWidth) {
                return { met: false, status: 'positioning', message: 'Move closer to the camera' };
            }

            // Check face is centered (using nose position)
            if (landmarks) {
                const noseX = landmarks.getNose()[3].x / frameWidth;
                const centerMin = 0.5 - FRONT_CAPTURE_CONFIG.centerTolerance;
                const centerMax = 0.5 + FRONT_CAPTURE_CONFIG.centerTolerance;

                if (noseX < centerMin || noseX > centerMax) {
                    return { met: false, status: 'positioning', message: 'Center your face in the frame' };
                }
            }

            // Check head pose (looking straight)
            if (Math.abs(pose.yaw) > FRONT_CAPTURE_CONFIG.maxYaw) {
                return { met: false, status: 'positioning', message: 'Look straight at the camera' };
            }

            if (Math.abs(pose.pitch) > FRONT_CAPTURE_CONFIG.maxPitch) {
                return { met: false, status: 'positioning', message: 'Keep your head level' };
            }

            return { met: true, status: 'ready', message: 'Hold still...' };
        }

        if (angle === 'left') {
            if (confidence < LEFT_CAPTURE_CONFIG.minConfidence) {
                return { met: false, status: 'positioning', message: 'Turn your head to the left' };
            }

            // Check nose position (should be on left side)
            if (landmarks) {
                const noseX = landmarks.getNose()[3].x / frameWidth;
                if (noseX > LEFT_CAPTURE_CONFIG.noseXMax) {
                    return { met: false, status: 'positioning', message: 'Turn your head more to the LEFT' };
                }
            }

            return { met: true, status: 'ready', message: 'Hold still...' };
        }

        if (angle === 'right') {
            if (confidence < RIGHT_CAPTURE_CONFIG.minConfidence) {
                return { met: false, status: 'positioning', message: 'Turn your head to the right' };
            }

            // Check nose position (should be on right side)
            if (landmarks) {
                const noseX = landmarks.getNose()[3].x / frameWidth;
                if (noseX < RIGHT_CAPTURE_CONFIG.noseXMin) {
                    return { met: false, status: 'positioning', message: 'Turn your head more to the RIGHT' };
                }
            }

            return { met: true, status: 'ready', message: 'Hold still...' };
        }

        return { met: false, status: 'waiting', message: getInstruction(angle) };
    }, [getInstruction]);

    // Process detection frame
    const processFrame = useCallback((
        detection: FaceDetectionResult,
        frameWidth: number,
        canvas: HTMLCanvasElement
    ) => {
        // Skip if already captured for this angle
        if (state.captures[state.currentAngle]) return;

        // Skip if multiple faces detected
        // (Would need to modify to track face count)

        // Estimate head pose
        const pose = detection.landmarks
            ? estimateHeadPose(detection.landmarks)
            : { yaw: 0, pitch: 0, roll: 0 };

        // Check requirements
        const requirements = checkCaptureRequirements(
            detection,
            pose,
            frameWidth,
            state.currentAngle
        );

        if (requirements.met) {
            // Increment ready frames counter
            readyFramesRef.current += 1;

            if (readyFramesRef.current >= 3 && state.status !== 'capturing') {
                // Start countdown
                setState(prev => ({
                    ...prev,
                    status: 'capturing',
                    countdown: 3,
                }));

                // Run countdown
                let count = 3;
                countdownIntervalRef.current = setInterval(() => {
                    count -= 1;

                    if (count <= 0) {
                        // Clear interval
                        if (countdownIntervalRef.current) {
                            clearInterval(countdownIntervalRef.current);
                            countdownIntervalRef.current = null;
                        }

                        // Capture
                        captureCurrentAngle(detection, canvas);
                    } else {
                        setState(prev => ({ ...prev, countdown: count }));
                    }
                }, 1000);
            }
        } else {
            // Reset ready frames
            readyFramesRef.current = 0;

            // Clear countdown if active
            if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
                countdownIntervalRef.current = null;
            }

            setState(prev => ({
                ...prev,
                status: requirements.status,
                instruction: requirements.message,
                countdown: null,
            }));
        }
    }, [state.currentAngle, state.status, state.captures, checkCaptureRequirements]);

    // Capture current angle
    const captureCurrentAngle = useCallback((
        detection: FaceDetectionResult,
        canvas: HTMLCanvasElement
    ) => {
        if (!detection.descriptor || !detection.boundingBox) {
            setState(prev => ({
                ...prev,
                status: 'error',
                errorMessage: 'Failed to extract face data. Please try again.',
            }));
            onError?.('Failed to extract face data');
            return;
        }

        // Check image quality
        const quality = checkImageQuality(canvas, detection.boundingBox);

        if (!quality.acceptable) {
            setState(prev => ({
                ...prev,
                status: 'error',
                errorMessage: quality.reasons.join('. '),
            }));
            onError?.(quality.reasons.join('. '));
            return;
        }

        // Get image data
        const imageData = canvas.toDataURL('image/jpeg', 0.9);

        // Create capture data
        const captureData: FaceCaptureData = {
            descriptor: Array.from(detection.descriptor),
            imageData,
            angle: state.currentAngle,
            quality,
            timestamp: Date.now(),
        };

        // Update state
        const newCaptures = {
            ...state.captures,
            [state.currentAngle]: captureData,
        };

        // Notify
        onCapture?.(captureData);

        // Check if all captures complete
        if (newCaptures.front && newCaptures.left && newCaptures.right) {
            setState(prev => ({
                ...prev,
                status: 'captured',
                captures: newCaptures,
                instruction: 'All captures complete!',
            }));

            onComplete?.({
                front: newCaptures.front,
                left: newCaptures.left,
                right: newCaptures.right,
            });
        } else {
            // Move to next angle
            const nextAngle = state.currentAngle === 'front'
                ? 'left'
                : state.currentAngle === 'left'
                    ? 'right'
                    : 'front';

            setState(prev => ({
                ...prev,
                status: 'captured',
                captures: newCaptures,
                currentAngle: nextAngle,
                instruction: getInstruction(nextAngle),
            }));

            // Reset after brief delay to show "captured" state
            setTimeout(() => {
                readyFramesRef.current = 0;
                setState(prev => ({
                    ...prev,
                    status: 'waiting',
                }));
            }, 1000);
        }
    }, [state.currentAngle, state.captures, getInstruction, onCapture, onComplete, onError]);

    // Retake current angle
    const retakeCapture = useCallback((angle: FaceAngle) => {
        readyFramesRef.current = 0;

        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
        }

        setState(prev => ({
            ...prev,
            currentAngle: angle,
            status: 'waiting',
            instruction: getInstruction(angle),
            countdown: null,
            errorMessage: null,
            captures: {
                ...prev.captures,
                [angle]: null,
            },
        }));
    }, [getInstruction]);

    // Reset all captures
    const reset = useCallback(() => {
        readyFramesRef.current = 0;

        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
        }

        setState({
            currentAngle: 'front',
            status: 'waiting',
            instruction: 'Position your face in the oval',
            countdown: null,
            errorMessage: null,
            captures: {
                front: null,
                left: null,
                right: null,
            },
        });
    }, []);

    // Check if all captures are complete
    const isComplete = state.captures.front && state.captures.left && state.captures.right;

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
            }
        };
    }, []);

    return {
        state,
        isComplete,
        processFrame,
        retakeCapture,
        reset,
    };
}

export default useFaceCapture;
