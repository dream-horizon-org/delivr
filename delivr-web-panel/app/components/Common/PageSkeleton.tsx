/**
 * PageSkeleton Component
 * Reusable loading skeleton for page layouts
 * 
 * Provides consistent loading states across pages with:
 * - Header skeleton (breadcrumb, title, description)
 * - Optional filter/action bar skeleton
 * - Content grid skeleton
 */

import { memo } from 'react';
import { Container, Box, Skeleton, Stack, SimpleGrid } from '@mantine/core';

export interface PageSkeletonProps {
  /** Show header skeleton (breadcrumb, title, description) */
  showHeader?: boolean;
  
  /** Show filter/action bar skeleton */
  showFilterBar?: boolean;
  
  /** Number of content items to show in grid */
  contentItems?: number;
  
  /** Grid columns configuration */
  gridCols?: { base?: number; sm?: number; md?: number; lg?: number; xl?: number };
  
  /** Content item height */
  contentHeight?: number;
  
  /** Container size (default: "xl") */
  containerSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'fluid';
  
  /** Container padding (default: 32) */
  containerPadding?: number | string;
}

export const PageSkeleton = memo(function PageSkeleton({
  showHeader = true,
  showFilterBar = true,
  contentItems = 3,
  gridCols = { base: 1, md: 2, xl: 3 },
  contentHeight = 200,
  containerSize = 'xl',
  containerPadding = 32,
}: PageSkeletonProps) {
  return (
    <Container size={containerSize} py={containerPadding}>
      {/* Header Skeleton */}
      {showHeader && (
        <Box mb={32}>
          <Skeleton height={16} width={200} mb={16} />
          <Skeleton height={32} width={300} mb={8} />
          <Skeleton height={20} width={400} />
        </Box>
      )}

      {/* Content Skeleton */}
      <Stack gap="lg">
        {/* Filter/Action Bar Skeleton */}
        {showFilterBar && (
          <Skeleton height={80} radius="md" />
        )}
        
        {/* Grid Skeleton */}
        <SimpleGrid cols={gridCols} spacing="lg">
          {Array.from({ length: contentItems }).map((_, i) => (
            <Skeleton 
              key={i} 
              height={contentHeight} 
              radius="md" 
            />
          ))}
        </SimpleGrid>
      </Stack>
    </Container>
  );
});

