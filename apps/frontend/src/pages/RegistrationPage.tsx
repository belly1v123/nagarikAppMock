/**
 * Registration Page
 * 
 * Multi-step citizen registration flow:
 * 1. Personal Information Form
 * 2. Face Capture (3 angles)
 * 3. Confirmation & Success
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { useFaceApi, useCamera, useFaceCapture, useLanguage } from '../hooks';
import { registerCitizen, ApiError } from '../api';
import { estimateHeadPose } from '../utils/poseDetection';
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
    isCaptureReady: boolean;
    qualityMessage: string;
    blurScore: number;
    brightness: number;
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
const MIN_DETECTION_CONFIDENCE = 0.65;
const MIN_BLUR_SCORE = 85;
const MIN_BRIGHTNESS = 55;
const MAX_BRIGHTNESS = 205;

const COPY = {
    en: {
        pageTitle: 'Citizen Registration',
        pageSubtitle: 'Enter your personal information as per your citizenship certificate',
        captureTitle: 'Face Capture',
        captureSubtitle: 'Position your face in the oval and follow the instructions',
        noFaceMessage: 'Position your face in the oval',
        frontInstruction: 'Look straight at the camera',
        leftInstruction: 'Turn your head slightly to the LEFT',
        rightInstruction: 'Turn your head slightly to the RIGHT',
        capturedImages: 'Captured Images',
        cancel: 'Cancel and start over',
        processing: 'Processing registration...',
        processingSub: 'Verifying your information',
        improveQuality: 'Improve frame quality',
        positionToCapture: 'Position face to capture',
        languageLabel: 'Language',
        duplicateFound: 'Duplicate Found',
        registrationFailed: 'Registration Failed',
    },
    ne: {
        pageTitle: 'नागरिक दर्ता',
        pageSubtitle: 'नागरिकता प्रमाणपत्र अनुसार आफ्नो व्यक्तिगत विवरण भर्नुहोस्',
        captureTitle: 'अनुहार क्याप्चर',
        captureSubtitle: 'अनुहारलाई ओभल भित्र राखेर निर्देशन पालना गर्नुहोस्',
        noFaceMessage: 'अनुहारलाई ओभल भित्र राख्नुहोस्',
        frontInstruction: 'क्यामेरातर्फ सिधा हेर्नुहोस्',
        leftInstruction: 'टाउको हल्का बायाँ फर्काउनुहोस्',
        rightInstruction: 'टाउको हल्का दायाँ फर्काउनुहोस्',
        capturedImages: 'क्याप्चर गरिएका तस्बिरहरू',
        cancel: 'रद्द गरेर फेरि सुरु गर्नुहोस्',
        processing: 'दर्ता प्रक्रिया चलिरहेको छ...',
        processingSub: 'तपाईंको जानकारी प्रमाणीकरण हुँदैछ',
        improveQuality: 'फ्रेमको गुणस्तर सुधार्नुहोस्',
        positionToCapture: 'क्याप्चरका लागि अनुहार मिलाउनुहोस्',
        languageLabel: 'भाषा',
        duplicateFound: 'डुप्लिकेट भेटियो',
        registrationFailed: 'दर्ता असफल भयो',
    },
} as const;

export const RegistrationPage: React.FC = () => {
    const { language, setLanguage } = useLanguage();
    const t = COPY[language];

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
        isCaptureReady: false,
        qualityMessage: 'Position your face in the oval',
        blurScore: 0,
        brightness: 0,
    });
    const [isProcessing, setIsProcessing] = useState(false);
    const analysisCanvasRef = useRef<HTMLCanvasElement | null>(null);

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

    const computeBrightness = useCallback((imageData: ImageData, step: number = 2): number => {
        const { data, width, height } = imageData;
        let luminanceSum = 0;
        let count = 0;

        for (let y = 0; y < height; y += step) {
            for (let x = 0; x < width; x += step) {
                const idx = (y * width + x) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                luminanceSum += (0.299 * r) + (0.587 * g) + (0.114 * b);
                count++;
            }
        }

        return count > 0 ? luminanceSum / count : 0;
    }, []);

    const computeBlurScore = useCallback((imageData: ImageData, step: number = 2): number => {
        const { data, width, height } = imageData;
        const gray = new Float32Array(width * height);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                gray[y * width + x] = (0.299 * data[idx]) + (0.587 * data[idx + 1]) + (0.114 * data[idx + 2]);
            }
        }

        let sum = 0;
        let sumSq = 0;
        let count = 0;

        for (let y = 1; y < height - 1; y += step) {
            for (let x = 1; x < width - 1; x += step) {
                const center = gray[y * width + x];
                const laplacian =
                    (4 * center) -
                    gray[y * width + (x - 1)] -
                    gray[y * width + (x + 1)] -
                    gray[(y - 1) * width + x] -
                    gray[(y + 1) * width + x];

                sum += laplacian;
                sumSq += laplacian * laplacian;
                count++;
            }
        }

        if (count === 0) return 0;
        const mean = sum / count;
        return (sumSq / count) - (mean * mean);
    }, []);

    const evaluateCaptureQuality = useCallback((
        angle: CaptureAngle,
        confidence: number,
        videoWidth: number,
        videoHeight: number,
        noseX: number,
        noseY: number,
        pose: { yaw: number; pitch: number; roll: number },
        faceBox?: { x: number; y: number; width: number; height: number }
    ): { isReady: boolean; reason: string; blurScore: number; brightness: number } => {
        const confidenceOk = confidence >= MIN_DETECTION_CONFIDENCE;

        let positionOk = false;
        if (faceBox) {
            const centerX = (faceBox.x + faceBox.width / 2) / videoWidth;
            const centerY = (faceBox.y + faceBox.height / 2) / videoHeight;
            const areaRatio = (faceBox.width * faceBox.height) / (videoWidth * videoHeight);
            positionOk =
                centerX > 0.28 && centerX < 0.72 &&
                centerY > 0.24 && centerY < 0.76 &&
                areaRatio > 0.10 && areaRatio < 0.58;
        } else {
            positionOk = noseX > 0.25 && noseX < 0.75 && noseY > 0.20 && noseY < 0.82;
        }

        const angleOk = (() => {
            if (Math.abs(pose.pitch) > 22 || Math.abs(pose.roll) > 18) return false;

            switch (angle) {
                case 'front':
                    return Math.abs(pose.yaw) <= 12;
                case 'left':
                    return pose.yaw <= -10 && pose.yaw >= -50;
                case 'right':
                    return pose.yaw >= 10 && pose.yaw <= 50;
                default:
                    return false;
            }
        })();

        let brightness = 0;
        let blurScore = 0;
        const video = videoRef.current;

        if (video && faceBox) {
            if (!analysisCanvasRef.current) {
                analysisCanvasRef.current = document.createElement('canvas');
            }

            const analysisCanvas = analysisCanvasRef.current;
            analysisCanvas.width = videoWidth;
            analysisCanvas.height = videoHeight;
            const analysisCtx = analysisCanvas.getContext('2d', { willReadFrequently: true });

            if (analysisCtx) {
                analysisCtx.drawImage(video, 0, 0, videoWidth, videoHeight);

                const padX = faceBox.width * 0.12;
                const padY = faceBox.height * 0.18;
                const roiX = Math.max(0, Math.floor(faceBox.x - padX));
                const roiY = Math.max(0, Math.floor(faceBox.y - padY));
                const roiW = Math.max(32, Math.min(videoWidth - roiX, Math.floor(faceBox.width + (padX * 2))));
                const roiH = Math.max(32, Math.min(videoHeight - roiY, Math.floor(faceBox.height + (padY * 2))));

                const roiImageData = analysisCtx.getImageData(roiX, roiY, roiW, roiH);
                brightness = computeBrightness(roiImageData, 2);
                blurScore = computeBlurScore(roiImageData, 2);
            }
        }

        const lightingOk = brightness >= MIN_BRIGHTNESS && brightness <= MAX_BRIGHTNESS;
        const blurOk = blurScore >= MIN_BLUR_SCORE;
        if (!confidenceOk) {
            return {
                isReady: false,
                reason: language === 'ne'
                    ? 'अनुहार पहिचान विश्वसनीय छैन। अलि नजिक आउनुहोस् र स्थिर बस्नुहोस्।'
                    : 'Face confidence too low. Move closer and keep still.',
                blurScore,
                brightness,
            };
        }
        if (!lightingOk) {
            return {
                isReady: false,
                reason: brightness < MIN_BRIGHTNESS
                    ? (language === 'ne' ? 'प्रकाश कम छ। उज्यालो ठाउँमा जानुहोस्।' : 'Lighting is too low. Move to brighter light.')
                    : (language === 'ne' ? 'प्रकाश धेरै चर्को छ। सिधा चमक कम गर्नुहोस्।' : 'Lighting is too harsh. Reduce direct light/glare.'),
                blurScore,
                brightness,
            };
        }
        if (!blurOk) {
            return {
                isReady: false,
                reason: language === 'ne'
                    ? 'तस्बिर धमिलो छ। मोबाइल स्थिर राख्नुहोस्।'
                    : 'Image appears blurry. Hold device steady and avoid motion.',
                blurScore,
                brightness,
            };
        }
        if (!positionOk) {
            return {
                isReady: false,
                reason: language === 'ne'
                    ? 'अनुहार फ्रेमको बीचमा वा उपयुक्त आकारमा छैन।'
                    : 'Face is not centered or size is not correct in frame.',
                blurScore,
                brightness,
            };
        }
        if (!angleOk) {
            if (angle === 'front') {
                return {
                    isReady: false,
                    reason: language === 'ne'
                        ? 'सामुन्ने क्याप्चरका लागि सिधा क्यामेरातर्फ हेर्नुहोस्।'
                        : 'Look straight at the camera for front capture.',
                    blurScore,
                    brightness,
                };
            }
            if (angle === 'left') {
                return {
                    isReady: false,
                    reason: language === 'ne' ? 'टाउको हल्का बायाँ फर्काउनुहोस्।' : 'Turn your head slightly to the LEFT.',
                    blurScore,
                    brightness,
                };
            }
            return {
                isReady: false,
                reason: language === 'ne' ? 'टाउको हल्का दायाँ फर्काउनुहोस्।' : 'Turn your head slightly to the RIGHT.',
                blurScore,
                brightness,
            };
        }

        return {
            isReady: true,
            reason: language === 'ne' ? 'स्थिति राम्रो छ। क्याप्चरका लागि स्थिर रहनुहोस्।' : 'Good position. Hold still for capture.',
            blurScore,
            brightness,
        };
    }, [computeBlurScore, computeBrightness, videoRef, language]);

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
                    const videoHeight = videoRef.current.videoHeight;

                    // Get actual nose position from landmarks (index 30 is nose tip)
                    const noseTip = detection.landmarks.positions[30];
                    const noseX = noseTip.x / videoWidth;
                    const confidence = detection.confidence;

                    const pose = estimateHeadPose(detection.landmarks);
                    const quality = evaluateCaptureQuality(
                        currentAngle,
                        confidence,
                        videoWidth,
                        videoHeight,
                        noseX,
                        noseTip.y / videoHeight,
                        pose,
                        detection.boundingBox
                    );

                    // Check auto-capture conditions
                    const shouldCapture = quality.isReady;

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

                    setDetectionStatus({
                        isFaceDetected: true,
                        confidence,
                        nosePosition: { x: noseX, y: noseTip.y / videoHeight },
                        isCaptureReady: quality.isReady,
                        qualityMessage: quality.reason,
                        blurScore: quality.blurScore,
                        brightness: quality.brightness,
                    });
                } else {
                    setDetectionStatus({
                        isFaceDetected: false,
                        confidence: 0,
                        nosePosition: null,
                        isCaptureReady: false,
                        qualityMessage: t.noFaceMessage,
                        blurScore: 0,
                        brightness: 0,
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
    }, [state.step, cameraReady, isFaceApiLoaded, currentAngle, currentAngleIndex, detectFace, evaluateCaptureQuality, takeSnapshot, videoRef]);

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
                title: t.registrationFailed,
                message: language === 'ne' ? 'अप्रत्याशित समस्या भयो। फेरि प्रयास गर्नुहोस्।' : 'An unexpected error occurred. Please try again.',
                variant: 'error',
            };

            if (err instanceof ApiError) {
                if (err.statusCode === 409) {
                    errorState = {
                        title: t.duplicateFound,
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

        if (!detectionStatus.isCaptureReady) {
            alert(detectionStatus.qualityMessage);
            return;
        }

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
                alert(language === 'ne'
                    ? 'अनुहार पहिचान भएन। कृपया फ्रेममा अनुहार मिलाएर फेरि प्रयास गर्नुहोस्।'
                    : 'No face detected. Please position your face in the frame and try again.');
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
                    message={language === 'ne' ? 'अनुहार पहिचान मोडेल लोड हुँदैछ...' : 'Loading face detection models...'}
                    subMessage={language === 'ne' ? 'केही समय लाग्न सक्छ' : 'This may take a moment'}
                    size="lg"
                />
            );
        }

        if (faceApiError) {
            return (
                <ErrorScreen
                    title={language === 'ne' ? 'सुरुआती त्रुटि' : 'Initialization Error'}
                    message={faceApiError}
                    onRetry={() => window.location.reload()}
                    locale={language}
                />
            );
        }

        switch (state.step) {
            case 'form':
                return (
                    <div className="max-w-xl mx-auto">
                        <div className="mb-8 text-center">
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">
                                {t.pageTitle}
                            </h1>
                            <p className="text-gray-600">
                                {t.pageSubtitle}
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
                                {t.captureTitle}
                            </h2>
                            <p className="text-gray-600">
                                {t.captureSubtitle}
                            </p>
                        </div>

                        <div className="mb-6">
                            <FaceCaptureSteps
                                currentAngle={currentAngle}
                                completedAngles={completedAngles}
                                locale={language}
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
                                disabled={!detectionStatus.isFaceDetected || !detectionStatus.isCaptureReady}
                                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                            >
                                {detectionStatus.isFaceDetected
                                    ? (detectionStatus.isCaptureReady
                                        ? (language === 'ne' ? `${currentAngle === 'front' ? 'सामुन्ने' : currentAngle === 'left' ? 'बायाँ' : 'दायाँ'} दृश्य क्याप्चर गर्नुहोस्` : `Capture ${currentAngle} view`)
                                        : t.improveQuality)
                                    : t.positionToCapture}
                            </button>
                        </div>

                        {/* Instructions */}
                        <div className="text-center mb-4">
                            <p className="text-sm text-gray-600">
                                {currentAngle === 'front' && t.frontInstruction}
                                {currentAngle === 'left' && t.leftInstruction}
                                {currentAngle === 'right' && t.rightInstruction}
                            </p>
                            {detectionStatus.isFaceDetected && (
                                <>
                                    <p className={`text-xs mt-1 ${detectionStatus.isCaptureReady ? 'text-green-600' : 'text-amber-600'}`}>
                                        {detectionStatus.qualityMessage}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {language === 'ne' ? 'विश्वसनीयता' : 'Confidence'}: {Math.round(detectionStatus.confidence * 100)}% · {language === 'ne' ? 'ब्लर' : 'Blur'}: {Math.round(detectionStatus.blurScore)} · {language === 'ne' ? 'प्रकाश' : 'Light'}: {Math.round(detectionStatus.brightness)}
                                    </p>
                                </>
                            )}
                        </div>

                        <div className="mt-6">
                            <p className="text-sm text-gray-500 text-center mb-3">
                                {t.capturedImages}
                            </p>
                            <CapturedImages
                                images={state.capturedFaces.map((f) => ({
                                    angle: f.angle,
                                    imageData: f.imageData,
                                }))}
                                locale={language}
                            />
                        </div>

                        <div className="mt-6 text-center">
                            <button
                                onClick={handleReset}
                                className="text-gray-500 hover:text-gray-700 text-sm"
                            >
                                {t.cancel}
                            </button>
                        </div>
                    </div>
                );

            case 'processing':
                return (
                    <Loading
                        message={t.processing}
                        subMessage={t.processingSub}
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
                        locale={language}
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
                        locale={language}
                    />
                ) : null;

            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="container mx-auto">
                <div className="max-w-3xl mx-auto mb-4 flex items-center justify-end gap-3">
                    <span className="text-sm text-gray-500">{t.languageLabel}</span>
                    <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden bg-white">
                        <button
                            onClick={() => setLanguage('en')}
                            className={`px-3 py-1.5 text-sm font-medium ${language === 'en' ? 'bg-blue-600 text-white' : 'text-gray-700'}`}
                        >
                            EN
                        </button>
                        <button
                            onClick={() => setLanguage('ne')}
                            className={`px-3 py-1.5 text-sm font-medium ${language === 'ne' ? 'bg-blue-600 text-white' : 'text-gray-700'}`}
                        >
                            नेपाली
                        </button>
                    </div>
                </div>
                {renderContent()}
            </div>
            <LoadingOverlay
                isVisible={isProcessing}
                message={language === 'ne' ? 'प्रक्रिया चलिरहेको छ...' : 'Processing...'}
            />
        </div>
    );
};

export default RegistrationPage;
