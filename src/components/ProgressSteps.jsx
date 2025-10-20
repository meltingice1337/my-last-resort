import React from 'react';

export default function ProgressSteps({ currentStep, steps }) {
    return (
        <div className="flex items-center justify-center gap-2 sm:gap-4 mb-8 sm:mb-12 px-4 overflow-x-auto">
            {steps.map((stepLabel, index) => {
                const stepNumber = index + 1;
                const isActive = currentStep >= stepNumber;
                const isLast = index === steps.length - 1;

                return (
                    <React.Fragment key={stepNumber}>
                        <div className={`flex items-center gap-1.5 sm:gap-2 flex-shrink-0 ${isActive ? 'text-purple-400' : 'text-gray-600'}`}>
                            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-sm sm:text-base ${isActive ? 'bg-purple-600' : 'bg-gray-700'
                                }`}>
                                {stepNumber}
                            </div>
                            <span className="hidden sm:inline text-sm whitespace-nowrap">{stepLabel}</span>
                            <span className="sm:hidden text-xs whitespace-nowrap">{stepLabel.split(' ')[0]}</span>
                        </div>
                        {!isLast && (
                            <div className={`w-8 sm:w-16 h-0.5 flex-shrink-0 ${currentStep > stepNumber ? 'bg-purple-600' : 'bg-gray-700'}`} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}
