/**
 * CapturedImages Component
 * 
 * Displays thumbnails of captured face images with their angles.
 */

import React from 'react';
import type { CaptureAngle } from '../types';

interface CapturedImage {
    angle: CaptureAngle;
    imageData: string; // base64 or data URL
}

interface CapturedImagesProps {
    images: CapturedImage[];
    onRemove?: (angle: CaptureAngle) => void;
    size?: 'sm' | 'md' | 'lg';
    locale?: 'en' | 'ne';
}

const ANGLE_LABELS: Record<'en' | 'ne', Record<CaptureAngle, string>> = {
    en: {
        front: 'Front',
        left: 'Left',
        right: 'Right',
    },
    ne: {
        front: 'सामुन्ने',
        left: 'बायाँ',
        right: 'दायाँ',
    },
};

export const CapturedImages: React.FC<CapturedImagesProps> = ({
    images,
    onRemove,
    size = 'md',
    locale = 'en',
}) => {
    const sizeClasses = {
        sm: 'w-16 h-20',
        md: 'w-24 h-32',
        lg: 'w-32 h-40',
    };

    const allAngles: CaptureAngle[] = ['front', 'left', 'right'];

    return (
        <div className="flex gap-4 justify-center">
            {allAngles.map((angle) => {
                const captured = images.find((img) => img.angle === angle);

                return (
                    <div key={angle} className="flex flex-col items-center">
                        <div
                            className={`${sizeClasses[size]} rounded-lg overflow-hidden border-2 
                ${captured ? 'border-green-500' : 'border-gray-300 border-dashed'}
                bg-gray-100 relative`}
                        >
                            {captured ? (
                                <>
                                    <img
                                        src={captured.imageData}
                                        alt={`${angle} view`}
                                        className="w-full h-full object-cover"
                                        style={{ transform: 'scaleX(-1)' }}
                                    />
                                    {onRemove && (
                                        <button
                                            onClick={() => onRemove(angle)}
                                            className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white 
                        rounded-full flex items-center justify-center text-xs
                        hover:bg-red-600 transition-colors"
                                            title="Remove"
                                        >
                                            ×
                                        </button>
                                    )}
                                    <div className="absolute bottom-0 left-0 right-0 bg-green-500/80 py-0.5">
                                        <svg
                                            className="w-4 h-4 text-white mx-auto"
                                            fill="currentColor"
                                            viewBox="0 0 20 20"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    </div>
                                </>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    <svg
                                        className="w-8 h-8"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={1.5}
                                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                        />
                                    </svg>
                                </div>
                            )}
                        </div>
                        <span
                            className={`mt-2 text-sm font-medium ${captured ? 'text-green-600' : 'text-gray-500'
                                }`}
                        >
                            {ANGLE_LABELS[locale][angle]}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};

export default CapturedImages;
