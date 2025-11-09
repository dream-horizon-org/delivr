/**
 * WizardStep - Wrapper component for each wizard step
 */

import React from 'react';

interface WizardStepProps {
  title: string;
  description?: string;
  isRequired?: boolean;
  children: React.ReactNode;
  actions?: React.ReactNode;
  error?: string | null;
}

export function WizardStep({ 
  title, 
  description, 
  isRequired = false, 
  children, 
  actions,
  error 
}: WizardStepProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-2xl font-bold text-gray-900">
          {title}
          {isRequired && <span className="text-red-500 ml-1">*</span>}
        </h2>
        {description && (
          <p className="mt-2 text-sm text-gray-600">{description}</p>
        )}
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      )}
      
      {/* Content */}
      <div className="space-y-6">
        {children}
      </div>
      
      {/* Actions */}
      {actions && (
        <div className="pt-6 border-t border-gray-200">
          {actions}
        </div>
      )}
    </div>
  );
}

