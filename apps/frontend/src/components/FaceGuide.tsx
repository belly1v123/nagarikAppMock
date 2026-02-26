/**
 * FaceGuide Component
 * 
 * Displays an oval guide overlay for face positioning.
 */

import React from 'react';

interface FaceGuideProps {
    width?: number;
    height?: number;
    message?: string;
    isActive?: boolean;
    isSuccess?: boolean;
}

export const FaceGuide: React.FC<FaceGuideProps> = ({
    width = 640,
    height = 480,
    message,
    isActive = true,
    isSuccess = false,
}) => {
    // Oval dimensions relative to frame
    const ovalWidth = width * 0.45;
    const ovalHeight = height * 0.7;
    const centerX = width / 2;
    const centerY = height / 2;

    const strokeColor = isSuccess
        ? '#22c55e'  // green-500
        : isActive
            ? '#3b82f6'  // blue-500
            : '#6b7280'; // gray-500

    return (
        <div className="absolute inset-0 pointer-events-none">
            <svg
                width={width}
                height={height}
                className="absolute inset-0"
            >
                {/* Semi-transparent overlay with oval cutout */}
                <defs>
                    <mask id="faceMask">
                        <rect width={width} height={height} fill="white" />
                        <ellipse
                            cx={centerX}
                            cy={centerY}
                            rx={ovalWidth / 2}
                            ry={ovalHeight / 2}
                            fill="black"
                        />
                    </mask>
                </defs>

                {/* Dark overlay outside oval */}
                <rect
                    width={width}
                    height={height}
                    fill="rgba(0, 0, 0, 0.5)"
                    mask="url(#faceMask)"
                />

                {/* Oval guide border */}
                <ellipse
                    cx={centerX}
                    cy={centerY}
                    rx={ovalWidth / 2}
                    ry={ovalHeight / 2}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={3}
                    strokeDasharray={isActive && !isSuccess ? "10,5" : "none"}
                    className={isActive && !isSuccess ? "animate-pulse" : ""}
                />

                {/* Corner guides */}
                <g stroke={strokeColor} strokeWidth={2}>
                    {/* Top-left */}
                    <path d={`M ${centerX - ovalWidth / 2 - 10} ${centerY - ovalHeight / 3} L ${centerX - ovalWidth / 2 - 10} ${centerY - ovalHeight / 2 - 10} L ${centerX - ovalWidth / 3} ${centerY - ovalHeight / 2 - 10}`} fill="none" />
                    {/* Top-right */}
                    <path d={`M ${centerX + ovalWidth / 3} ${centerY - ovalHeight / 2 - 10} L ${centerX + ovalWidth / 2 + 10} ${centerY - ovalHeight / 2 - 10} L ${centerX + ovalWidth / 2 + 10} ${centerY - ovalHeight / 3}`} fill="none" />
                    {/* Bottom-left */}
                    <path d={`M ${centerX - ovalWidth / 2 - 10} ${centerY + ovalHeight / 3} L ${centerX - ovalWidth / 2 - 10} ${centerY + ovalHeight / 2 + 10} L ${centerX - ovalWidth / 3} ${centerY + ovalHeight / 2 + 10}`} fill="none" />
                    {/* Bottom-right */}
                    <path d={`M ${centerX + ovalWidth / 3} ${centerY + ovalHeight / 2 + 10} L ${centerX + ovalWidth / 2 + 10} ${centerY + ovalHeight / 2 + 10} L ${centerX + ovalWidth / 2 + 10} ${centerY + ovalHeight / 3}`} fill="none" />
                </g>
            </svg>

            {/* Message overlay */}
            {message && (
                <div className="absolute bottom-8 left-0 right-0 flex justify-center">
                    <div className={`
            px-4 py-2 rounded-lg text-white text-sm font-medium
            ${isSuccess ? 'bg-green-500' : 'bg-blue-500'}
          `}>
                        {message}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FaceGuide;
