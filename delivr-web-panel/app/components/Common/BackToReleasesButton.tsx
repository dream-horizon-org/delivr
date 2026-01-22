/**
 * BackToReleasesButton Component
 * Reusable button that navigates back to the releases page
 * Automatically extracts org from route params - no props needed
 */

import { memo } from 'react';
import { Link, useParams } from '@remix-run/react';
import { Button } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';

export interface BackToReleasesButtonProps {
  /** Button variant (default: "default") */
  variant?: 'default' | 'light' | 'filled' | 'outline' | 'subtle' | 'gradient';
  
  /** Button size (default: "sm") */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  
  /** Custom className */
  className?: string;
}

export const BackToReleasesButton = memo(function BackToReleasesButton({
  variant = 'default',
  size = 'sm',
  className,
}: BackToReleasesButtonProps = {}) {
  const params = useParams();
  const org = params.org;

  if (!org) {
    // If no org param, don't render the button
    return null;
  }

  return (
    <Button
      component={Link}
      to={`/dashboard/${org}/releases`}
      variant={variant}
      size={size}
      leftSection={<IconArrowLeft size={16} />}
      className={className}
    >
      Back to Releases
    </Button>
  );
});

