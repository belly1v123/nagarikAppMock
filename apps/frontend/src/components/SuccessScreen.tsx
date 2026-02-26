/**
 * SuccessScreen Component
 * 
 * Displays registration success with citizen details.
 */

import React from 'react';

interface SuccessScreenProps {
    citizenId: string;
    fullName: string;
    citizenshipNumber: string;
    isVoterEligible: boolean;
    onReset?: () => void;
}

export const SuccessScreen: React.FC<SuccessScreenProps> = ({
    citizenId,
    fullName,
    citizenshipNumber,
    isVoterEligible,
    onReset,
}) => {
    return (
        <div className="max-w-md mx-auto text-center py-8">
            {/* Success Icon */}
            <div className="w-20 h-20 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
                <svg
                    className="w-12 h-12 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                    />
                </svg>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Registration Successful!
            </h2>

            <p className="text-gray-600 mb-6">
                Your Nagarik ID has been created successfully.
            </p>

            {/* Details Card */}
            <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
                <div className="space-y-4">
                    <div>
                        <p className="text-sm text-gray-500">Nagarik ID</p>
                        <p className="font-mono text-lg font-medium text-blue-600">
                            {citizenId}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">Full Name</p>
                        <p className="font-medium text-gray-900">{fullName}</p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">Citizenship Number</p>
                        <p className="font-medium text-gray-900">{citizenshipNumber}</p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">Voter Eligibility</p>
                        <div className="flex items-center gap-2">
                            {isVoterEligible ? (
                                <>
                                    <span className="w-2 h-2 bg-green-500 rounded-full" />
                                    <span className="font-medium text-green-600">Eligible</span>
                                </>
                            ) : (
                                <>
                                    <span className="w-2 h-2 bg-orange-500 rounded-full" />
                                    <span className="font-medium text-orange-600">Not Eligible (Under 18)</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Info Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
                <div className="flex gap-3">
                    <svg
                        className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                    >
                        <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                            clipRule="evenodd"
                        />
                    </svg>
                    <div>
                        <p className="text-sm text-blue-800 font-medium">Important</p>
                        <p className="text-sm text-blue-700 mt-1">
                            Save your Nagarik ID. You will need it for identity verification
                            with government services and third-party applications.
                        </p>
                    </div>
                </div>
            </div>

            {/* Actions */}
            {onReset && (
                <button
                    onClick={onReset}
                    className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg 
            hover:bg-gray-200 transition-colors font-medium"
                >
                    Register Another Citizen
                </button>
            )}
        </div>
    );
};

export default SuccessScreen;
