/**
 * StepIndicator Component
 * 
 * Displays progress through multi-step processes like 3-angle face capture.
 */

import React from 'react';

interface Step {
    id: string;
    label: string;
    description?: string;
}

interface StepIndicatorProps {
    steps: Step[];
    currentStep: number; // 0-indexed
    completedSteps?: number[];
    variant?: 'horizontal' | 'vertical';
    size?: 'sm' | 'md' | 'lg';
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
    steps,
    currentStep,
    completedSteps = [],
    variant = 'horizontal',
    size = 'md',
}) => {
    const sizeClasses = {
        sm: {
            circle: 'w-6 h-6 text-xs',
            connector: 'h-0.5',
            label: 'text-xs',
            description: 'text-xs',
        },
        md: {
            circle: 'w-8 h-8 text-sm',
            connector: 'h-0.5',
            label: 'text-sm',
            description: 'text-xs',
        },
        lg: {
            circle: 'w-10 h-10 text-base',
            connector: 'h-1',
            label: 'text-base',
            description: 'text-sm',
        },
    };

    const classes = sizeClasses[size];

    const getStepStatus = (index: number): 'completed' | 'current' | 'pending' => {
        if (completedSteps.includes(index)) return 'completed';
        if (index === currentStep) return 'current';
        return 'pending';
    };

    const getStepClasses = (status: 'completed' | 'current' | 'pending') => {
        switch (status) {
            case 'completed':
                return 'bg-green-500 border-green-500 text-white';
            case 'current':
                return 'bg-blue-500 border-blue-500 text-white ring-4 ring-blue-200';
            case 'pending':
                return 'bg-gray-200 border-gray-300 text-gray-500';
        }
    };

    const getConnectorClasses = (index: number) => {
        const isCompleted = completedSteps.includes(index);
        return isCompleted ? 'bg-green-500' : 'bg-gray-300';
    };

    if (variant === 'vertical') {
        return (
            <div className="flex flex-col space-y-4">
                {steps.map((step, index) => {
                    const status = getStepStatus(index);
                    return (
                        <div key={step.id} className="flex items-start">
                            <div className="flex flex-col items-center mr-4">
                                {/* Step circle */}
                                <div
                                    className={`
                    ${classes.circle} rounded-full border-2 
                    flex items-center justify-center font-medium
                    ${getStepClasses(status)}
                    transition-all duration-300
                  `}
                                >
                                    {status === 'completed' ? (
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path
                                                fillRule="evenodd"
                                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    ) : (
                                        index + 1
                                    )}
                                </div>
                                {/* Vertical connector */}
                                {index < steps.length - 1 && (
                                    <div
                                        className={`w-0.5 h-8 ${getConnectorClasses(index)} transition-colors duration-300`}
                                    />
                                )}
                            </div>
                            {/* Step content */}
                            <div className="pt-1">
                                <p className={`${classes.label} font-medium text-gray-900`}>
                                    {step.label}
                                </p>
                                {step.description && (
                                    <p className={`${classes.description} text-gray-500 mt-0.5`}>
                                        {step.description}
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }

    // Horizontal variant
    return (
        <div className="w-full">
            <div className="flex items-center justify-between">
                {steps.map((step, index) => {
                    const status = getStepStatus(index);
                    return (
                        <React.Fragment key={step.id}>
                            {/* Step */}
                            <div className="flex flex-col items-center">
                                <div
                                    className={`
                    ${classes.circle} rounded-full border-2 
                    flex items-center justify-center font-medium
                    ${getStepClasses(status)}
                    transition-all duration-300
                  `}
                                >
                                    {status === 'completed' ? (
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path
                                                fillRule="evenodd"
                                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    ) : (
                                        index + 1
                                    )}
                                </div>
                                <p className={`${classes.label} mt-2 text-center font-medium ${status === 'current' ? 'text-blue-600' :
                                    status === 'completed' ? 'text-green-600' :
                                        'text-gray-500'
                                    }`}>
                                    {step.label}
                                </p>
                            </div>

                            {/* Connector */}
                            {index < steps.length - 1 && (
                                <div
                                    className={`flex-1 mx-4 ${classes.connector} ${getConnectorClasses(index)} transition-colors duration-300`}
                                />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};

// Pre-configured step indicator for face capture
export const FaceCaptureSteps: React.FC<{
    currentAngle: 'front' | 'left' | 'right';
    completedAngles: ('front' | 'left' | 'right')[];
    locale?: 'en' | 'ne';
}> = ({ currentAngle, completedAngles, locale = 'en' }) => {
    const steps: Step[] = locale === 'ne'
        ? [
            { id: 'front', label: 'सामुन्ने', description: 'सिधा हेर्नुहोस्' },
            { id: 'left', label: 'बायाँ', description: 'बायाँ फर्कनुहोस्' },
            { id: 'right', label: 'दायाँ', description: 'दायाँ फर्कनुहोस्' },
        ]
        : [
            { id: 'front', label: 'Front', description: 'Look straight' },
            { id: 'left', label: 'Left', description: 'Turn left' },
            { id: 'right', label: 'Right', description: 'Turn right' },
        ];

    const angleToIndex: Record<string, number> = {
        front: 0,
        left: 1,
        right: 2,
    };

    return (
        <StepIndicator
            steps={steps}
            currentStep={angleToIndex[currentAngle]}
            completedSteps={completedAngles.map((a) => angleToIndex[a])}
        />
    );
};

export default StepIndicator;
