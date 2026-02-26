/**
 * useFaceApi Hook
 * 
 * Loads face-api.js models and provides face detection functions.
 */

import { useState, useEffect, useCallback } from 'react';
import * as faceapi from 'face-api.js';

export interface FaceDetectionResult {
    detected: boolean;
    confidence: number;
    boundingBox?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    landmarks?: faceapi.FaceLandmarks68;
    descriptor?: Float32Array;
    expressions?: faceapi.FaceExpressions;
}

interface UseFaceApiReturn {
    modelsLoaded: boolean;
    loading: boolean;
    loadingProgress: number;
    error: string | null;
    detectFace: (input: HTMLVideoElement | HTMLCanvasElement) => Promise<FaceDetectionResult>;
    extractDescriptor: (input: HTMLVideoElement | HTMLCanvasElement) => Promise<Float32Array | null>;
    getFaceDetections: (input: HTMLVideoElement | HTMLCanvasElement) => Promise<faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }, faceapi.FaceLandmarks68>[]>;
}

const MODELS_PATH = '/models';

export function useFaceApi(): UseFaceApiReturn {
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    // Load face-api.js models on mount
    useEffect(() => {
        let isMounted = true;

        async function loadModels() {
            try {
                setLoading(true);
                setError(null);

                // Load models sequentially with progress updates
                const models = [
                    { name: 'tinyFaceDetector', loader: () => faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_PATH) },
                    { name: 'faceLandmark68Net', loader: () => faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_PATH) },
                    { name: 'faceRecognitionNet', loader: () => faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_PATH) },
                    { name: 'faceExpressionNet', loader: () => faceapi.nets.faceExpressionNet.loadFromUri(MODELS_PATH) },
                ];

                for (let i = 0; i < models.length; i++) {
                    if (!isMounted) return;

                    console.log(`Loading model: ${models[i].name}`);
                    await models[i].loader();

                    if (!isMounted) return;
                    setLoadingProgress(((i + 1) / models.length) * 100);
                }

                if (isMounted) {
                    setModelsLoaded(true);
                    setLoading(false);
                    console.log('All face-api.js models loaded successfully');
                }
            } catch (err) {
                console.error('Error loading face-api.js models:', err);
                if (isMounted) {
                    setError('Failed to load face detection models. Please refresh the page.');
                    setLoading(false);
                }
            }
        }

        loadModels();

        return () => {
            isMounted = false;
        };
    }, []);

    // Detect a single face and return detection result
    const detectFace = useCallback(async (
        input: HTMLVideoElement | HTMLCanvasElement
    ): Promise<FaceDetectionResult> => {
        if (!modelsLoaded) {
            return { detected: false, confidence: 0 };
        }

        try {
            const detection = await faceapi
                .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceExpressions()
                .withFaceDescriptor();

            if (!detection) {
                return { detected: false, confidence: 0 };
            }

            return {
                detected: true,
                confidence: detection.detection.score,
                boundingBox: {
                    x: detection.detection.box.x,
                    y: detection.detection.box.y,
                    width: detection.detection.box.width,
                    height: detection.detection.box.height,
                },
                landmarks: detection.landmarks,
                descriptor: detection.descriptor,
                expressions: detection.expressions,
            };
        } catch (err) {
            console.error('Face detection error:', err);
            return { detected: false, confidence: 0 };
        }
    }, [modelsLoaded]);

    // Extract face descriptor
    const extractDescriptor = useCallback(async (
        input: HTMLVideoElement | HTMLCanvasElement
    ): Promise<Float32Array | null> => {
        if (!modelsLoaded) return null;

        try {
            const detection = await faceapi
                .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptor();

            return detection?.descriptor || null;
        } catch (err) {
            console.error('Descriptor extraction error:', err);
            return null;
        }
    }, [modelsLoaded]);

    // Get all face detections with landmarks
    const getFaceDetections = useCallback(async (
        input: HTMLVideoElement | HTMLCanvasElement
    ) => {
        if (!modelsLoaded) return [];

        try {
            const detections = await faceapi
                .detectAllFaces(input, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks();

            return detections;
        } catch (err) {
            console.error('Face detection error:', err);
            return [];
        }
    }, [modelsLoaded]);

    return {
        modelsLoaded,
        loading,
        loadingProgress,
        error,
        detectFace,
        extractDescriptor,
        getFaceDetections,
    };
}

export default useFaceApi;
