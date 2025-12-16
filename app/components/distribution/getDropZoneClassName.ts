/**
 * getDropZoneClassName - Computes drop zone CSS classes based on state
 * 
 * Note: Originally named `useDropZoneClassName` but renamed since it's a pure function,
 * not a React hook (doesn't use useState, useEffect, etc.)
 */

export function getDropZoneClassName(isDragging: boolean, disabled: boolean): string {
  const baseClasses = 'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors duration-200';
  const draggingClasses = isDragging 
    ? 'border-blue-500 bg-blue-50' 
    : 'border-gray-300 hover:border-gray-400 bg-gray-50';
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : '';
  
  return `${baseClasses} ${draggingClasses} ${disabledClasses}`;
}

