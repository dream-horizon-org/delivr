/**
 * Wizard Step Indicator Component
 * Visual progress indicator for wizard steps
 */

import { Group, Text } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import type { WizardStepIndicatorProps } from '~/types/release-config-props';
import { ICON_SIZES } from '~/constants/release-config-ui';

export function WizardStepIndicator({
  steps,
  currentStep,
  completedSteps,
}: WizardStepIndicatorProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === currentStep;
          const isCompleted = completedSteps.has(index);
          const isPast = index < currentStep;
          
          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                {/* Step circle */}
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center transition-all
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
                    <IconCheck size={ICON_SIZES.MEDIUM} />
                  ) : (
                    <Icon size={ICON_SIZES.MEDIUM} />
                  )}
                </div>
                
                {/* Step label */}
                <Text
                  size="xs"
                  fw={isActive ? 600 : 400}
                  c={isActive ? 'blue' : isCompleted || isPast ? 'green' : 'dimmed'}
                  className="mt-2 text-center max-w-[100px]"
                >
                  {step.title}
                </Text>
              </div>
              
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div
                  className={`
                    flex-1 h-0.5 mx-2 transition-all
                    ${isPast || isCompleted ? 'bg-green-500' : 'bg-gray-200'}
                  `}
                  style={{ marginBottom: '30px' }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

