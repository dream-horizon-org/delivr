/**
 * StepIndicator - Visual progress indicator for wizard steps
 */

import React from 'react';
import type { WizardStepConfig, SetupStep } from '../types';

interface StepIndicatorProps {
  steps: WizardStepConfig[];
  currentStep: SetupStep;
  onStepClick?: (stepId: SetupStep) => void;
}

export function StepIndicator({ steps, currentStep, onStepClick }: StepIndicatorProps) {
  const currentStepIndex = steps.findIndex(s => s.id === currentStep);
  
  return (
    <nav aria-label="Progress">
      <ol className="flex items-center">
        {steps.map((step, index) => {
          const isActive = step.id === currentStep;
          const isCompleted = step.isComplete;
          const isPast = index < currentStepIndex;
          const isFuture = index > currentStepIndex;
          const isClickable = isPast || isCompleted;
          
          return (
            <li 
              key={step.id} 
              className={`relative ${index !== steps.length - 1 ? 'pr-8 sm:pr-20 flex-1' : ''}`}
            >
              {/* Connector Line */}
              {index !== steps.length - 1 && (
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className={`h-0.5 w-full ${isCompleted || isPast ? 'bg-blue-600' : 'bg-gray-200'}`} />
                </div>
              )}
              
              {/* Step Circle */}
              <button
                type="button"
                onClick={() => isClickable && onStepClick?.(step.id)}
                disabled={!isClickable}
                className={`relative flex items-center justify-center w-8 h-8 rounded-full ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : isCompleted || isPast
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-500'
                } ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'} transition-colors`}
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
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </button>
              
              {/* Step Label (Desktop only) */}
              <div className="hidden sm:block absolute top-10 left-1/2 transform -translate-x-1/2 w-32 text-center">
                <span className={`text-xs font-medium ${
                  isActive ? 'text-blue-600' : isCompleted || isPast ? 'text-gray-900' : 'text-gray-500'
                }`}>
                  {step.title}
                </span>
                {step.isRequired && (
                  <span className="block text-xs text-red-500">*</span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      
      {/* Mobile - Current Step Name */}
      <div className="mt-4 sm:hidden text-center">
        <p className="text-sm font-medium text-gray-900">
          {steps[currentStepIndex].title}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Step {currentStepIndex + 1} of {steps.length}
        </p>
      </div>
    </nav>
  );
}

