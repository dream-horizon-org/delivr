/**
 * Page Loader Component
 * Common loading state component used across the app
 * 
 * Can be used as:
 * - Full page replacement (withContainer=true) - replaces entire page
 * - Inline content (withContainer=false) - fits within existing layout
 */

import { memo } from 'react';
import { Container, Paper, Loader, Text } from '@mantine/core';

interface PageLoaderProps {
  message?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  withContainer?: boolean;
  fullHeight?: boolean;
}

export const PageLoader = memo(function PageLoader({
  message = 'Loading...',
  size = 'md',
  withContainer = true,
  fullHeight = false,
}: PageLoaderProps) {
  const content = (
    <Paper p="xl" withBorder className="text-center">
      <Loader size={size} className="mx-auto" />
      <Text c="dimmed" mt="md">
        {message}
      </Text>
    </Paper>
  );

  if (!withContainer) {
    return content;
  }

  return (
    <Container size="xl" className={fullHeight ? 'py-8 min-h-[400px]' : 'py-8'}>
      {content}
    </Container>
  );
});

