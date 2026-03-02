/**
 * ErrorScreen Component
 * 
 * Displays error states with retry options.
 */

import React from 'react';

interface ErrorScreenProps {
    title?: string;
    message: string;
    details?: string;
    onRetry?: () => void;
    onBack?: () => void;
    variant?: 'error' | 'warning' | 'duplicate';
    locale?: 'en' | 'ne';
}

export const ErrorScreen: React.FC<ErrorScreenProps> = ({
    title = 'Something went wrong',
    message,
    details,
    onRetry,
    onBack,
    variant = 'error',
    locale = 'en',
}) => {
    const t = locale === 'ne'
        ? {
            duplicateTitle: 'डुप्लिकेट रेकर्ड भेटियो',
            duplicateText: 'मिल्दोजुल्दो विवरण भएको नागरिक रेकर्ड प्रणालीमा पहिले नै उपलब्ध छ। विवरण पुनः जाँच गर्नुहोस् वा आवश्यक परे सहयोगमा सम्पर्क गर्नुहोस्।',
            back: 'फर्कनुहोस्',
            retry: 'फेरि प्रयास गर्नुहोस्',
        }
        : {
            duplicateTitle: 'Duplicate Record Detected',
            duplicateText: 'A citizen with matching information already exists in the system. Please verify your details or contact support if you believe this is an error.',
            back: 'Go Back',
            retry: 'Try Again',
        };
    const styles = {
        error: {
            iconBg: 'bg-red-100',
            iconColor: 'text-red-500',
            icon: (
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                />
            ),
        },
        warning: {
            iconBg: 'bg-yellow-100',
            iconColor: 'text-yellow-500',
            icon: (
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
            ),
        },
        duplicate: {
            iconBg: 'bg-orange-100',
            iconColor: 'text-orange-500',
            icon: (
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
            ),
        },
    };

    const currentStyle = styles[variant];

    return (
        <div className="max-w-md mx-auto text-center py-8">
            {/* Error Icon */}
            <div
                className={`w-20 h-20 mx-auto mb-6 ${currentStyle.iconBg} rounded-full flex items-center justify-center`}
            >
                <svg
                    className={`w-12 h-12 ${currentStyle.iconColor}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    {currentStyle.icon}
                </svg>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>

            <p className="text-gray-600 mb-4">{message}</p>

            {/* Details */}
            {details && (
                <div className="bg-gray-100 rounded-lg p-4 mb-6 text-left">
                    <p className="text-sm text-gray-600 font-mono break-all">{details}</p>
                </div>
            )}

            {/* Duplicate-specific Information */}
            {variant === 'duplicate' && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 text-left">
                    <div className="flex gap-3">
                        <svg
                            className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                        >
                            <path
                                fillRule="evenodd"
                                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                clipRule="evenodd"
                            />
                        </svg>
                        <div>
                            <p className="text-sm text-orange-800 font-medium">
                                {t.duplicateTitle}
                            </p>
                            <p className="text-sm text-orange-700 mt-1">
                                {t.duplicateText}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="flex gap-4">
                {onBack && (
                    <button
                        onClick={onBack}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg 
              hover:bg-gray-50 transition-colors font-medium"
                    >
                        {t.back}
                    </button>
                )}
                {onRetry && (
                    <button
                        onClick={onRetry}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg 
              hover:bg-blue-700 transition-colors font-medium"
                    >
                        {t.retry}
                    </button>
                )}
            </div>
        </div>
    );
};

export default ErrorScreen;
