/**
 * Registration Page
 * 
 * Multi-step citizen registration flow:
 * 1. Personal Information Form
 * 2. Face Capture (3 angles)
 * 3. Confirmation & Success
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    CitizenForm,
    FaceCamera,
    FaceCaptureSteps,
    CapturedImages,
    SuccessScreen,
    ErrorScreen,
    Loading,
    LoadingOverlay,
} from '../components';
import { useFaceApi, useCamera, useFaceCapture } from '../hooks';
import { registerCitizen, ApiError } from '../api';
import type {
    CitizenRegistrationInput,
    FaceDescriptor128,
    CaptureAngle
} from '../types';

type RegistrationStep = 'form' | 'face-capture' | 'processing' | 'success' | 'error';

interface CapturedFace {
    angle: CaptureAngle;
    imageData: string;
    descriptor: FaceDescriptor128;
}

interface DetectionStatus {
    isFaceDetected: boolean;
    confidence: number;
    nosePosition: { x: number; y: number } | null;
}

interface RegistrationState {
    step: RegistrationStep;
    formData: Omit<CitizenRegistrationInput, 'faceDescriptors'> | null;
    capturedFaces: CapturedFace[];
    result: {
        citizenId: string;
        fullName: string;
        citizenshipNumber: string;
        isVoterEligible: boolean;
    } | null;
    error: {
        title: string;
        message: string;
        variant: 'error' | 'warning' | 'duplicate';
    } | null;
}

const CAPTURE_ANGLES: CaptureAngle[] = ['front', 'left', 'right'];

export const RegistrationPage: React.FC = () => {
    // Face API setup
    const { modelsLoaded: isFaceApiLoaded, loading: isFaceApiLoading, error: faceApiError, detectFace } = useFaceApi();

    // Camera setup
    const { videoRef, canvasRef, cameraReady, error: cameraError, startCamera, stopCamera, takeSnapshot } = useCamera();

    // Face capture flow
    const {
        state: captureFlowState,
        isComplete: allCapturesComplete,
        reset: resetCapture,
    } = useFaceCapture();

    // Local state
    const [state, setState] = useState<RegistrationState>({
        step: 'form',
        formData: null,
        capturedFaces: [],
        result: null,
        error: null,
    });

    const [currentAngleIndex, setCurrentAngleIndex] = useState(0);
    const [detectionStatus, setDetectionStatus] = useState<DetectionStatus>({
        isFaceDetected: false,
        confidence: 0,
        nosePosition: null,
    });
    const [isProcessing, setIsProcessing] = useState(false);

    const currentAngle = CAPTURE_ANGLES[currentAngleIndex];
    const completedAngles = state.capturedFaces.map(f => f.angle);

    // Start camera when entering face capture step
    useEffect(() => {
        if (state.step === 'face-capture' && isFaceApiLoaded && !cameraReady) {
            startCamera();
        }

        return () => {
            if (cameraReady) {
                stopCamera();
            }
        };
    }, [state.step, isFaceApiLoaded, cameraReady, startCamera, stopCamera]);

    // Check capture conditions based on angle (relaxed for better UX)
    const checkCaptureConditions = useCallback((
        angle: CaptureAngle,
        confidence: number,
        noseX: number
    ): boolean => {
        if (confidence < 0.6) return false;

        switch (angle) {
            case 'front':
                return noseX > 0.35 && noseX < 0.65 && confidence > 0.7;
            case 'left':
                return noseX < 0.45 && confidence > 0.6;
            case 'right':
                return noseX > 0.55 && confidence > 0.6;
            default:
                return false;
        }
    }, []);

    // Face detection loop
    useEffect(() => {
        if (state.step !== 'face-capture' || !cameraReady || !isFaceApiLoaded) {
            return;
        }

        let animationId: number;
        let isRunning = true;
        let captureHoldFrames = 0;
        const requiredHoldFrames = 5;

        const detectLoop = async () => {
            if (!isRunning || !videoRef.current) return;

            try {
                const detection = await detectFace(videoRef.current);

                if (detection.detected && detection.landmarks && detection.descriptor) {
                    const videoWidth = videoRef.current.videoWidth;

                    // Get actual nose position from landmarks (index 30 is nose tip)
                    const noseTip = detection.landmarks.positions[30];
                    const noseX = noseTip.x / videoWidth;
                    const confidence = detection.confidence;

                    setDetectionStatus({
                        isFaceDetected: true,
                        confidence: confidence,
                        nosePosition: { x: noseX, y: noseTip.y / videoRef.current.videoHeight },
                    });

                    // Check auto-capture conditions
                    const shouldCapture = checkCaptureConditions(currentAngle, confidence, noseX);

                    if (shouldCapture) {
                        captureHoldFrames++;

                        if (captureHoldFrames >= requiredHoldFrames) {
                            // Capture the frame
                            const snapshot = takeSnapshot();
                            if (snapshot) {
                                const descriptor = Array.from(detection.descriptor) as FaceDescriptor128;

                                // Save captured face
                                setState((prev) => ({
                                    ...prev,
                                    capturedFaces: [
                                        ...prev.capturedFaces.filter((f) => f.angle !== currentAngle),
                                        { angle: currentAngle, imageData: snapshot, descriptor },
                                    ],
                                }));

                                // Move to next angle
                                if (currentAngleIndex < CAPTURE_ANGLES.length - 1) {
                                    setCurrentAngleIndex(prev => prev + 1);
                                }
                                captureHoldFrames = 0;
                            }
                        }
                    } else {
                        captureHoldFrames = 0;
                    }
                } else {
                    setDetectionStatus({
                        isFaceDetected: false,
                        confidence: 0,
                        nosePosition: null,
                    });
                    captureHoldFrames = 0;
                }
            } catch (err) {
                console.error('Detection error:', err);
            }

            if (isRunning) {
                animationId = requestAnimationFrame(detectLoop);
            }
        };

        detectLoop();

        return () => {
            isRunning = false;
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
        };
    }, [state.step, cameraReady, isFaceApiLoaded, currentAngle, currentAngleIndex, detectFace, checkCaptureConditions, takeSnapshot, videoRef]);

    // Check if all angles captured
    useEffect(() => {
        if (state.capturedFaces.length === 3 && state.step === 'face-capture') {
            handleSubmitRegistration();
        }
    }, [state.capturedFaces.length, state.step]);

    const handleFormSubmit = (data: Omit<CitizenRegistrationInput, 'faceDescriptors'>) => {
        setState((prev) => ({
            ...prev,
            step: 'face-capture',
            formData: data,
        }));
    };

    const handleSubmitRegistration = async () => {
        if (!state.formData || state.capturedFaces.length < 3) return;

        setState((prev) => ({ ...prev, step: 'processing' }));
        setIsProcessing(true);

        try {
            const faceDescriptors = {
                front: state.capturedFaces.find((f) => f.angle === 'front')!.descriptor,
                left: state.capturedFaces.find((f) => f.angle === 'left')!.descriptor,
                right: state.capturedFaces.find((f) => f.angle === 'right')!.descriptor,
            };

            const response = await registerCitizen({
                ...state.formData,
                faceDescriptors,
            });

            if (response.success && response.data) {
                setState((prev) => ({
                    ...prev,
                    step: 'success',
                    result: {
                        citizenId: response.data!.citizenId,
                        fullName: response.data!.fullName,
                        citizenshipNumber: response.data!.citizenshipNumber,
                        isVoterEligible: response.data!.isVoterEligible,
                    },
                }));
            } else {
                throw new Error(response.error || 'Registration failed');
            }
        } catch (err) {
            console.error('Registration error:', err);

            let errorState: { title: string; message: string; variant: 'error' | 'warning' | 'duplicate' } = {
                title: 'Registration Failed',
                message: 'An unexpected error occurred. Please try again.',
                variant: 'error',
            };

            if (err instanceof ApiError) {
                if (err.statusCode === 409) {
                    errorState = {
                        title: 'Duplicate Found',
                        message: err.message,
                        variant: 'duplicate',
                    };
                } else {
                    errorState.message = err.message;
                }
            } else if (err instanceof Error) {
                errorState.message = err.message;
            }

            setState((prev) => ({
                ...prev,
                step: 'error',
                error: errorState,
            }));
        } finally {
            setIsProcessing(false);
            stopCamera();
        }
    };

    const handleReset = () => {
        stopCamera();
        resetCapture();
        setCurrentAngleIndex(0);
        setState({
            step: 'form',
            formData: null,
            capturedFaces: [],
            result: null,
            error: null,
        });
    };

    const handleRetry = () => {
        resetCapture();
        setCurrentAngleIndex(0);
        setState((prev) => ({
            ...prev,
            step: 'face-capture',
            capturedFaces: [],
            error: null,
        }));
    };

    // Manual capture function
    const handleManualCapture = async () => {
        if (!videoRef.current || !cameraReady || !isFaceApiLoaded) return;

        try {
            const detection = await detectFace(videoRef.current);
            if (detection.detected && detection.descriptor) {
                const snapshot = takeSnapshot();
                if (snapshot) {
                    const descriptor = Array.from(detection.descriptor) as FaceDescriptor128;

                    setState((prev) => ({
                        ...prev,
                        capturedFaces: [
                            ...prev.capturedFaces.filter((f) => f.angle !== currentAngle),
                            { angle: currentAngle, imageData: snapshot, descriptor },
                        ],
                    }));

                    // Move to next angle
                    if (currentAngleIndex < CAPTURE_ANGLES.length - 1) {
                        setCurrentAngleIndex(prev => prev + 1);
                    }
                }
            } else {
                alert('No face detected. Please position your face in the frame and try again.');
            }
        } catch (err) {
            console.error('Manual capture error:', err);
        }
    };

    // Suppress unused variable warnings for hooks we might use later
    void captureFlowState;
    void allCapturesComplete;
    void canvasRef;

    // Render based on current step
    const renderContent = () => {
        if (isFaceApiLoading) {
            return (
                <Loading
                    message="Loading face detection models..."
                    subMessage="This may take a moment"
                    size="lg"
                />
            );
        }

        if (faceApiError) {
            return (
                <ErrorScreen
                    title="Initialization Error"
                    message={faceApiError}
                    onRetry={() => window.location.reload()}
                />
            );
        }

        switch (state.step) {
            case 'form':
                return (
                    <div className="max-w-xl mx-auto">
                        <div className="mb-8 text-center">
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">
                                Citizen Registration
                            </h1>
                            <p className="text-gray-600">
                                Enter your personal information as per your citizenship certificate
                            </p>
                        </div>
                        <CitizenForm onSubmit={handleFormSubmit} />
                    </div>
                );

            case 'face-capture':
                return (
                    <div className="max-w-3xl mx-auto">
                        <div className="mb-6 text-center">
                            <h2 className="text-xl font-bold text-gray-900 mb-2">
                                Face Capture
                            </h2>
                            <p className="text-gray-600">
                                Position your face in the oval and follow the instructions
                            </p>
                        </div>

                        <div className="mb-6">
                            <FaceCaptureSteps
                                currentAngle={currentAngle}
                                completedAngles={completedAngles}
                            />
                        </div>

                        {cameraError && (
                            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                                {cameraError}
                            </div>
                        )}

                        <div className="flex justify-center mb-6">
                            <FaceCamera
                                videoRef={videoRef}
                                canvasRef={canvasRef}
                                captureState={cameraReady ? 'capturing' : 'idle'}
                                currentAngle={currentAngle}
                                detectionStatus={detectionStatus}
                            />
                        </div>

                        {/* Manual capture button */}
                        <div className="flex justify-center gap-4 mb-6">
                            <button
                                onClick={handleManualCapture}
                                disabled={!detectionStatus.isFaceDetected}
                                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                            >
                                {detectionStatus.isFaceDetected ? `Capture ${currentAngle} view` : 'Position face to capture'}
                            </button>
                        </div>

                        {/* Instructions */}
                        <div className="text-center mb-4">
                            <p className="text-sm text-gray-600">
                                {currentAngle === 'front' && 'Look straight at the camera'}
                                {currentAngle === 'left' && 'Turn your head slightly to the LEFT'}
                                {currentAngle === 'right' && 'Turn your head slightly to the RIGHT'}
                            </p>
                            {detectionStatus.isFaceDetected && (
                                <p className="text-xs text-green-600 mt-1">
                                    Face detected (confidence: {Math.round(detectionStatus.confidence * 100)}%)
                                </p>
                            )}
                        </div>

                        <div className="mt-6">
                            <p className="text-sm text-gray-500 text-center mb-3">
                                Captured Images
                            </p>
                            <CapturedImages
                                images={state.capturedFaces.map((f) => ({
                                    angle: f.angle,
                                    imageData: f.imageData,
                                }))}
                            />
                        </div>

                        <div className="mt-6 text-center">
                            <button
                                onClick={handleReset}
                                className="text-gray-500 hover:text-gray-700 text-sm"
                            >
                                Cancel and start over
                            </button>
                        </div>
                    </div>
                );

            case 'processing':
                return (
                    <Loading
                        message="Processing registration..."
                        subMessage="Verifying your information"
                        size="lg"
                    />
                );

            case 'success':
                return state.result ? (
                    <SuccessScreen
                        citizenId={state.result.citizenId}
                        fullName={state.result.fullName}
                        citizenshipNumber={state.result.citizenshipNumber}
                        isVoterEligible={state.result.isVoterEligible}
                        onReset={handleReset}
                    />
                ) : null;

            case 'error':
                return state.error ? (
                    <ErrorScreen
                        title={state.error.title}
                        message={state.error.message}
                        variant={state.error.variant}
                        onRetry={handleRetry}
                        onBack={handleReset}
                    />
                ) : null;

            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="container mx-auto">
                {renderContent()}
            </div>
            <LoadingOverlay
                isVisible={isProcessing}
                message="Processing..."
            />
        </div>
    );
};

export default RegistrationPage;
