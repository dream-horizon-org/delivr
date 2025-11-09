/**
 * ConnectionCard - Reusable card for displaying connection status
 */

import React from 'react';
import { VerificationBadge } from './VerificationBadge';

interface ConnectionCardProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  isConnected: boolean;
  isVerifying?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  children?: React.ReactNode;
  metadata?: Array<{ label: string; value: string }>;
}

export function ConnectionCard({
  title,
  description,
  icon,
  isConnected,
  isVerifying = false,
  onConnect,
  onDisconnect,
  children,
  metadata,
}: ConnectionCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          {icon && (
            <div className="flex-shrink-0 mt-1">
              {icon}
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            {description && (
              <p className="mt-1 text-sm text-gray-500">{description}</p>
            )}
          </div>
        </div>
        
        <VerificationBadge 
          isVerified={isConnected} 
          isVerifying={isVerifying}
          successText="Connected"
          pendingText="Not Connected"
        />
      </div>
      
      {/* Metadata */}
      {metadata && metadata.length > 0 && isConnected && (
        <div className="mt-4 grid grid-cols-2 gap-4">
          {metadata.map((item, index) => (
            <div key={index}>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                {item.label}
              </dt>
              <dd className="mt-1 text-sm text-gray-900 truncate">
                {item.value}
              </dd>
            </div>
          ))}
        </div>
      )}
      
      {/* Children (custom content) */}
      {children && (
        <div className="mt-4">
          {children}
        </div>
      )}
      
      {/* Actions */}
      <div className="mt-4 flex space-x-3">
        {!isConnected && onConnect && (
          <button
            type="button"
            onClick={onConnect}
            disabled={isVerifying}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isVerifying ? 'Connecting...' : 'Connect'}
          </button>
        )}
        
        {isConnected && onDisconnect && (
          <button
            type="button"
            onClick={onDisconnect}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Disconnect
          </button>
        )}
      </div>
    </div>
  );
}

