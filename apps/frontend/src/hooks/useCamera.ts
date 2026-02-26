/**
 * useCamera Hook
 * 
 * Manages camera access and provides video/canvas refs.
 */

import { useRef, useState, useCallback, useEffect } from 'react';

interface UseCameraReturn {
    videoRef: React.RefObject<HTMLVideoElement>;
    canvasRef: React.RefObject<HTMLCanvasElement>;
    cameraReady: boolean;
    error: string | null;
    startCamera: () => Promise<void>;
    stopCamera: () => void;
    takeSnapshot: () => string | null;
    getVideoElement: () => HTMLVideoElement | null;
}

interface CameraOptions {
    width?: number;
    height?: number;
    facingMode?: 'user' | 'environment';
}

export function useCamera(options: CameraOptions = {}): UseCameraReturn {
    const {
        width = 640,
        height = 480,
        facingMode = 'user',
    } = options;

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [cameraReady, setCameraReady] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Start camera
    const startCamera = useCallback(async () => {
        try {
            setError(null);
            setCameraReady(false);

            // Request camera access
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: width },
                    height: { ideal: height },
                    facingMode,
                },
                audio: false,
            });

            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;

                // Wait for video to be ready
                await new Promise<void>((resolve, reject) => {
                    if (!videoRef.current) {
                        reject(new Error('Video element not found'));
                        return;
                    }

                    videoRef.current.onloadedmetadata = () => {
                        videoRef.current?.play()
                            .then(() => resolve())
                            .catch(reject);
                    };

                    videoRef.current.onerror = () => {
                        reject(new Error('Video element error'));
                    };
                });

                setCameraReady(true);
                console.log('Camera started successfully');
            }
        } catch (err) {
            console.error('Camera access error:', err);

            let errorMessage = 'Failed to access camera';

            if (err instanceof DOMException) {
                switch (err.name) {
                    case 'NotAllowedError':
                        errorMessage = 'Camera access denied. Please allow camera access and try again.';
                        break;
                    case 'NotFoundError':
                        errorMessage = 'No camera found. Please connect a camera and try again.';
                        break;
                    case 'NotReadableError':
                        errorMessage = 'Camera is in use by another application.';
                        break;
                    case 'OverconstrainedError':
                        errorMessage = 'Camera does not meet the required constraints.';
                        break;
                }
            }

            setError(errorMessage);
            setCameraReady(false);
        }
    }, [width, height, facingMode]);

    // Stop camera
    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }

        setCameraReady(false);
        console.log('Camera stopped');
    }, []);

    // Take snapshot from video
    const takeSnapshot = useCallback((): string | null => {
        if (!videoRef.current || !canvasRef.current || !cameraReady) {
            return null;
        }

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (!ctx) return null;

        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw current video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Return as base64 data URL
        return canvas.toDataURL('image/jpeg', 0.9);
    }, [cameraReady]);

    // Get video element
    const getVideoElement = useCallback((): HTMLVideoElement | null => {
        return videoRef.current;
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, [stopCamera]);

    return {
        videoRef,
        canvasRef,
        cameraReady,
        error,
        startCamera,
        stopCamera,
        takeSnapshot,
        getVideoElement,
    };
}

export default useCamera;
