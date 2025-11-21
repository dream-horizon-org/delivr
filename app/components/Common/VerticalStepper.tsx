/**
 * Vertical Stepper Component
 * Reusable vertical step indicator for multi-step flows
 * Used by: Release Configuration, Onboarding Flow, etc.
 */

import { Text } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';

export interface Step {
  id: string;
  title: string;
  description?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

interface VerticalStepperProps {
  steps: Step[];
  currentStep: number;
  completedSteps: Set<number>;
  onStepClick?: (stepIndex: number) => void;
  allowNavigation?: boolean;
}

export function VerticalStepper({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
  allowNavigation = false,
}: VerticalStepperProps) {
  return (
    <div className="flex flex-col">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isActive = index === currentStep;
        const isCompleted = completedSteps.has(index);
        const isPast = index < currentStep;
        const isClickable = allowNavigation && (isCompleted || isPast);
        
        return (
          <div key={step.id} className="relative">
            {/* Step content */}
            <div
              className={`
                flex items-center w-full p-3 rounded-lg transition-all relative
                ${isActive ? 'bg-blue-50 border-2 border-blue-500' : 'border-2 border-transparent'}
                ${isClickable ? 'cursor-pointer hover:bg-gray-50' : ''}
              `}
              onClick={() => isClickable && onStepClick?.(index)}
            >
              {/* Step circle with icon */}
              <div
                className={`
                  flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all z-10 relative
                  ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg scale-110'
                      : isCompleted || isPast
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }
                `}
              >
                {isCompleted || isPast ? (
                  <IconCheck size={20} strokeWidth={2.5} />
                ) : (
                  <Icon size={20} />
                )}
              </div>
              
              {/* Step text */}
              <div className="ml-4 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Text
                    size="sm"
                    fw={isActive ? 600 : 500}
                    c={isActive ? 'blue' : isCompleted || isPast ? 'green' : 'dimmed'}
                    className="truncate"
                  >
                    {step.title}
                  </Text>
                  
                  {isActive && (
                    <span className="flex-shrink-0 text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                      Current
                    </span>
                  )}
                </div>
                
                {step.description && (
                  <Text size="xs" c="dimmed" className="mt-0.5">
                    {step.description}
                  </Text>
                )}
              </div>
            </div>
            
            {/* Vertical line connector - positioned after content for proper alignment */}
            {index < steps.length - 1 && (
              <div
                className={`absolute left-[32px] top-[56px] w-0.5 h-[calc(100%-56px)] transition-all ${
                  isPast || isCompleted ? 'bg-green-500' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

