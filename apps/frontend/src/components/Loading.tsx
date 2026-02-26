/**
 * Loading Component
 * 
 * Displays loading states with customizable messages.
 */

import React from 'react';

interface LoadingProps {
    message?: string;
    subMessage?: string;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'spinner' | 'dots' | 'pulse';
}

export const Loading: React.FC<LoadingProps> = ({
    message = 'Loading...',
    subMessage,
    size = 'md',
    variant = 'spinner',
}) => {
    const sizeClasses = {
        sm: { spinner: 'w-6 h-6', text: 'text-sm', subText: 'text-xs' },
        md: { spinner: 'w-10 h-10', text: 'text-base', subText: 'text-sm' },
        lg: { spinner: 'w-16 h-16', text: 'text-lg', subText: 'text-base' },
    };

    const classes = sizeClasses[size];

    const renderSpinner = () => {
        switch (variant) {
            case 'dots':
                return (
                    <div className="flex gap-2">
                        {[0, 1, 2].map((i) => (
                            <div
                                key={i}
                                className={`${size === 'sm' ? 'w-2 h-2' : size === 'md' ? 'w-3 h-3' : 'w-4 h-4'} 
                  bg-blue-500 rounded-full animate-bounce`}
                                style={{ animationDelay: `${i * 0.15}s` }}
                            />
                        ))}
                    </div>
                );
            case 'pulse':
                return (
                    <div
                        className={`${classes.spinner} bg-blue-500 rounded-full animate-pulse`}
                    />
                );
            case 'spinner':
            default:
                return (
                    <div
                        className={`${classes.spinner} border-4 border-blue-200 border-t-blue-500 
              rounded-full animate-spin`}
                    />
                );
        }
    };

    return (
        <div className="flex flex-col items-center justify-center py-8">
            {renderSpinner()}
            {message && (
                <p className={`mt-4 ${classes.text} text-gray-700 font-medium`}>
                    {message}
                </p>
            )}
            {subMessage && (
                <p className={`mt-1 ${classes.subText} text-gray-500`}>{subMessage}</p>
            )}
        </div>
    );
};

// Full-screen loading overlay
export const LoadingOverlay: React.FC<LoadingProps & { isVisible: boolean }> = ({
    isVisible,
    ...props
}) => {
    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <Loading {...props} />
        </div>
    );
};

export default Loading;
