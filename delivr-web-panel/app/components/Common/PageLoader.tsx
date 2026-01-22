/**
 * Page Loader Component
 * Common loading state component used across the app
 * 
 * Uses plain HTML/CSS (Tailwind) to avoid MantineProvider dependency during SSR/hydration
 * 
 * Can be used as:
 * - Full page replacement (withContainer=true) - replaces entire page
 * - Inline content (withContainer=false) - fits within existing layout
 */

import { memo } from 'react';

interface PageLoaderProps {
  message?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  withContainer?: boolean;
  fullHeight?: boolean;
}

const sizeMap = {
  xs: 'w-4 h-4',
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
};

export const PageLoader = memo(function PageLoader({
  message = 'Loading...',
  size = 'md',
  withContainer = true,
  fullHeight = false,
}: PageLoaderProps) {
  const spinnerSize = sizeMap[size];
  
  const content = (
    <div className="bg-white border border-gray-200 rounded-lg p-8 text-center shadow-sm">
      <div className={`${spinnerSize} border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto`}></div>
      <p className="text-sm text-gray-600 mt-4">
        {message}
      </p>
    </div>
  );

  if (!withContainer) {
    return content;
  }

  return (
    <div className={`max-w-7xl mx-auto ${fullHeight ? 'py-8 min-h-[400px]' : 'py-8'} px-4`}>
      {content}
    </div>
  );
});

