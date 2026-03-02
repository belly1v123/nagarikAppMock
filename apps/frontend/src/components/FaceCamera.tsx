/**
 * FaceCamera Component
 * 
 * Integrates video stream, face detection, and face guide overlay.
 */

import React, { useRef, useEffect, useState } from 'react';
import { FaceGuide } from './FaceGuide';

// Local type definitions
export type CaptureAngle = 'front' | 'left' | 'right';
export type FaceCaptureState = 'idle' | 'positioning' | 'ready' | 'capturing' | 'processing' | 'completed' | 'error';

interface FaceCameraProps {
    videoRef: React.RefObject<HTMLVideoElement>;
    canvasRef: React.RefObject<HTMLCanvasElement>;
    captureState: FaceCaptureState;
    currentAngle: CaptureAngle;
    detectionStatus?: {
        isFaceDetected: boolean;
        confidence: number;
        nosePosition: { x: number; y: number } | null;
        isCaptureReady?: boolean;
        qualityMessage?: string;
    };
    onCapture?: () => void;
    width?: number;
    height?: number;
}

const ANGLE_INSTRUCTIONS: Record<CaptureAngle, string> = {
    front: 'Look straight at the camera',
    left: 'Turn your head slightly to the LEFT',
    right: 'Turn your head slightly to the RIGHT',
};

const ANGLE_LABELS: Record<CaptureAngle, string> = {
    front: 'Front View',
    left: 'Left Profile',
    right: 'Right Profile',
};

export const FaceCamera: React.FC<FaceCameraProps> = ({
    videoRef,
    canvasRef,
    captureState,
    currentAngle,
    detectionStatus,
    onCapture,
    width = 640,
    height = 480,
}) => {
    const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
    const [isVideoReady, setIsVideoReady] = useState(false);

    // Draw face detection overlay
    useEffect(() => {
        const overlayCanvas = overlayCanvasRef.current;
        if (!overlayCanvas || !detectionStatus) return;

        const ctx = overlayCanvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, width, height);

        if (!detectionStatus.isFaceDetected) {
            return;
        }

        // Draw nose position indicator if face detected
        if (detectionStatus.isFaceDetected && detectionStatus.nosePosition) {
            const { x, y } = detectionStatus.nosePosition;
            const screenX = x * width;
            const screenY = y * height;

            // Draw crosshair at nose position
            ctx.beginPath();
            ctx.strokeStyle = detectionStatus.confidence > 0.85 ? '#22c55e' : '#f59e0b';
            ctx.lineWidth = 2;

            // Horizontal line
            ctx.moveTo(screenX - 10, screenY);
            ctx.lineTo(screenX + 10, screenY);

            // Vertical line
            ctx.moveTo(screenX, screenY - 10);
            ctx.lineTo(screenX, screenY + 10);

            ctx.stroke();

            // Draw confidence indicator
            ctx.fillStyle = detectionStatus.confidence > 0.85 ? '#22c55e' : '#f59e0b';
            ctx.font = '12px sans-serif';
            ctx.fillText(
                `${Math.round(detectionStatus.confidence * 100)}%`,
                screenX + 15,
                screenY - 5
            );
        }
    }, [detectionStatus, width, height]);

    // Handle video loaded
    const handleVideoLoaded = () => {
        setIsVideoReady(true);
    };

    const getMessage = (): string => {
        if (captureState === 'completed') {
            return 'All captures completed!';
        }
        if (captureState === 'error') {
            return 'Error during capture. Please try again.';
        }
        if (captureState === 'processing') {
            return 'Processing...';
        }
        if (captureState === 'capturing') {
            if (!detectionStatus?.isFaceDetected) {
                return 'Position your face in the oval';
            }
            if (detectionStatus.qualityMessage) {
                return detectionStatus.qualityMessage;
            }
            return ANGLE_INSTRUCTIONS[currentAngle];
        }
        return 'Preparing camera...';
    };

    const isSuccess =
        captureState === 'completed' ||
        (detectionStatus?.isFaceDetected && !!detectionStatus?.isCaptureReady);

    return (
        <div
            className="relative bg-black rounded-lg overflow-hidden"
            style={{ width, height }}
        >
            {/* Video stream */}
            <video
                ref={videoRef}
                width={width}
                height={height}
                autoPlay
                playsInline
                muted
                onLoadedMetadata={handleVideoLoaded}
                className="absolute inset-0"
                style={{ transform: 'scaleX(-1)' }} // Mirror for selfie view
            />

            {/* Hidden canvas for frame capture */}
            <canvas
                ref={canvasRef}
                width={width}
                height={height}
                className="hidden"
            />

            {/* Face detection overlay canvas */}
            <canvas
                ref={overlayCanvasRef}
                width={width}
                height={height}
                className="absolute inset-0 pointer-events-none"
                style={{ transform: 'scaleX(-1)' }}
            />

            {/* Face guide overlay */}
            <FaceGuide
                width={width}
                height={height}
                message={getMessage()}
                isActive={captureState === 'capturing'}
                isSuccess={isSuccess}
            />

            {/* Current angle indicator */}
            <div className="absolute top-4 left-4 bg-black/50 px-3 py-1 rounded-full">
                <span className="text-white text-sm font-medium">
                    {ANGLE_LABELS[currentAngle]}
                </span>
            </div>

            {/* Manual capture button (optional) */}
            {onCapture && captureState === 'capturing' && (
                <button
                    onClick={onCapture}
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 
            bg-blue-500 hover:bg-blue-600 text-white 
            px-6 py-2 rounded-full font-medium
            transition-colors duration-200"
                >
                    Capture
                </button>
            )}

            {/* Loading overlay */}
            {!isVideoReady && (
                <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                    <div className="text-white text-center">
                        <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
                        <p>Starting camera...</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FaceCamera;
