/**
 * AppBadge Component
 * Standardized badge component with consistent styling across the app
 * 
 * Ensures all badges of the same type (platform, target, etc.) use the same
 * color, size, and variant throughout the application.
 * 
 * Usage:
 *   <AppBadge type="platform" value="ANDROID" title="Android" />
 *   <AppBadge type="target" value="PLAY_STORE" title="Play Store" />
 *   <AppBadge type="status" value="success" title="Active" />
 *   <AppBadge type="platform-target" title="Play Store v1.0.0" />
 * 
 * Or use convenience components:
 *   <PlatformBadge platform="ANDROID" />
 *   <TargetBadge target="PLAY_STORE" />
 */

import { Badge, type BadgeProps } from '@mantine/core';
import { getBadgeConfig, type BadgeType, type BadgeSize, type BadgeVariant } from '~/utils/badge-utils';
import { PlatformIcon } from '~/components/Releases/PlatformIcon';
import { PLATFORM_LABELS, TARGET_PLATFORM_LABELS } from '~/constants/release-config-ui';
import type { Platform, TargetPlatform } from '~/types/release-config';

export interface AppBadgeProps extends Omit<BadgeProps, 'color' | 'size' | 'variant'> {
  /**
   * Type of badge - determines standardized color, size, and variant
   */
  type: BadgeType;
  
  /**
   * Value used to determine color (e.g., "ANDROID", "PLAY_STORE", "REGRESSION")
   * Optional - if not provided, uses default color for the type
   */
  value?: string;
  
  /**
   * Badge title/text to display
   */
  title: string;
  
  /**
   * Override default size (optional)
   */
  size?: BadgeSize;
  
  /**
   * Override default variant (optional)
   */
  variant?: BadgeVariant;
  
  /**
   * Override default color (optional - not recommended, use type/value instead)
   */
  color?: string;
}

export function AppBadge({
  type,
  value,
  title,
  size: sizeOverride,
  variant: variantOverride,
  color: colorOverride,
  ...badgeProps
}: AppBadgeProps) {
  const config = getBadgeConfig(type, value);
  
  return (
    <Badge
      color={colorOverride || config.color}
      size={sizeOverride || config.size}
      variant={variantOverride || config.variant}
      {...badgeProps}
    >
      {title}
    </Badge>
  );
}

// ============================================================================
// Convenience Components for Common Badge Types
// ============================================================================

/**
 * Platform Badge - Standardized across app
 * Automatically uses correct color, size, variant, and label for the platform
 */
export function PlatformBadge({ 
  platform, 
  size,
  showIcon = true,
  ...props 
}: { 
  platform: Platform | string;
  size?: BadgeSize;
  showIcon?: boolean;
} & Omit<BadgeProps, 'color' | 'size' | 'variant' | 'children'>) {
  const platformUpper = platform.toUpperCase();
  const label = PLATFORM_LABELS[platformUpper as keyof typeof PLATFORM_LABELS] || platform;
  
  return (
    <AppBadge
      type="platform"
      value={platformUpper}
      title={label}
      size={size}
      leftSection={showIcon ? <PlatformIcon platform={platformUpper} size={14} /> : undefined}
      {...props}
    />
  );
}

/**
 * Target Badge - Standardized across app
 * Automatically uses correct color, size, variant, and label for the target
 */
export function TargetBadge({ 
  target, 
  size,
  ...props 
}: { 
  target: TargetPlatform | string;
  size?: BadgeSize;
} & Omit<BadgeProps, 'color' | 'size' | 'variant' | 'children'>) {
  const targetUpper = target.toUpperCase();
  const label = TARGET_PLATFORM_LABELS[targetUpper as keyof typeof TARGET_PLATFORM_LABELS] || target;
  
  return (
    <AppBadge
      type="target"
      value={targetUpper}
      title={label}
      size={size}
      {...props}
    />
  );
}

/**
 * Platform-Target Combined Badge - Standardized across app
 * Shows platform icon + target name + optional version
 */
export function PlatformTargetBadge({ 
  platform, 
  target,
  version,
  size,
  ...props 
}: { 
  platform: Platform | string;
  target: TargetPlatform | string;
  version?: string | null;
  size?: BadgeSize;
} & Omit<BadgeProps, 'color' | 'size' | 'variant' | 'children'>) {
  const platformUpper = platform.toUpperCase();
  const targetUpper = target.toUpperCase();
  const platformLabel = PLATFORM_LABELS[platformUpper as keyof typeof PLATFORM_LABELS] || platform;
  const targetLabel = TARGET_PLATFORM_LABELS[targetUpper as keyof typeof TARGET_PLATFORM_LABELS] || target;
  
  // Format: "Play Store v1.0.0" or "Play Store"
  const title = version 
    ? `${targetLabel} ${version.startsWith('v') ? version : `v${version}`}`
    : targetLabel;
  
  return (
    <AppBadge
      type="platform-target"
      value={targetUpper}
      title={title}
      size={size}
      leftSection={<PlatformIcon platform={platformUpper} size={14} />}
      {...props}
    />
  );
}

