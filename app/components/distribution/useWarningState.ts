/**
 * useWarningState - Manages extra commits warning state
 */

import { useCallback, useState } from 'react';

export function useWarningState() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasAcknowledged, setHasAcknowledged] = useState(false);

  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  const acknowledge = useCallback(() => {
    setHasAcknowledged(true);
  }, []);

  return {
    isExpanded,
    hasAcknowledged,
    toggleExpanded,
    acknowledge,
  };
}

