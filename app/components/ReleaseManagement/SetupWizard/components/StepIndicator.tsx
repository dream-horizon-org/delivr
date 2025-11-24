/**
 * StepIndicator - Visual progress indicator for wizard steps
 */

import React from 'react';
import type { WizardStepConfig, SetupStep } from '~/types/setup-wizard';

interface StepIndicatorProps {
  steps: WizardStepConfig[];
  currentStep: SetupStep;
  onStepClick?: (stepId: SetupStep) => void;
}

export function StepIndicator({ steps, currentStep, onStepClick }: StepIndicatorProps) {
  const currentStepIndex = steps.findIndex(s => s.id === currentStep);
  
  return (
    <nav aria-label="Progress" className="w-full">
      <ol className="flex items-start justify-between max-w-8xl">
        {steps.map((step, index) => {
          const isActive = step.id === currentStep;
          const isCompleted = step.isComplete;
          const isPast = index < currentStepIndex;
          const isFuture = index > currentStepIndex;
          const isClickable = isPast || isCompleted;
          const isFirstStep = index === 0;
          const isLastStep = index === steps.length - 1;
          
          return (
            <li 
              key={step.id} 
              className="relative flex flex-col items-center"
              style={{ flex: '1 1 0px' }}
            >
              {/* Step Circle and Connector Row */}
              <div className="flex items-center justify-center w-full relative">
                {/* Connector Line - Before (except first item) */}
                {!isFirstStep && (
                  <div className="absolute left-0 right-1/2 h-0.5 -translate-y-px">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        isPast || isCompleted ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    />
                  </div>
                )}
                
                {/* Step Circle Container */}
                <button
                  type="button"
                  onClick={() => isClickable && onStepClick?.(step.id)}
                  disabled={!isClickable}
                  className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${
                    isActive
                      ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-110'
                      : isCompleted
                      ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700 hover:scale-105'
                      : 'bg-white border-gray-300 text-gray-500'
                  } ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                >
                  {isCompleted ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <span className="font-semibold text-sm">{index + 1}</span>
                  )}
                </button>
                
                {/* Connector Line - After (except last item) */}
                {!isLastStep && (
                  <div className="absolute left-1/2 right-0 h-0.5 -translate-y-px">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        isCompleted ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    />
                  </div>
                )}
              </div>
              
              {/* Step Label */}
              <div className="mt-3 text-center px-1 max-w-[200px]">
                <p className={`text-sm font-medium leading-snug ${
                  isActive ? 'text-blue-600' : isCompleted ? 'text-gray-900' : 'text-gray-500'
                }`}>
                  {step.title}
                </p>
                {step.isRequired && !isCompleted && (
                  <span className="text-xs text-red-500">*</span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

