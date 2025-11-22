/**
 * Integration Icon Component
 * Renders icons for integrations using Tabler Icons library
 */

import {
  IconBrandGithub,
  IconBrandGitlab,
  IconBrandBitbucket,
  IconBrandSlack,
  IconBrandAzure,
  IconBrandApple,
  IconBrandAndroid,
  IconBrandFirebase,
  IconBrandDiscord,
  IconPlug,
  IconChecks,
  IconSettings,
  IconDeviceDesktop,
  IconBrandGooglePlay,
} from '@tabler/icons-react';

interface IntegrationIconProps {
  name: string;
  size?: number;
  className?: string;
}

export function IntegrationIcon({ name, size = 40, className = '' }: IntegrationIconProps) {
  // Normalize icon name to lowercase
  const iconName = (name || '').toLowerCase();

  const iconProps = {
    size,
    className: className || 'text-gray-500',
    stroke: 1.5,
  };

  // Map icon names to Tabler Icon components
  switch (iconName) {
    case 'github':
    case 'github_actions':
      return <IconBrandGithub {...iconProps} />;

    case 'gitlab':
      return <IconBrandGitlab {...iconProps} />;

    case 'bitbucket':
      return <IconBrandBitbucket {...iconProps} />;

    case 'slack':
      return <IconBrandSlack {...iconProps} />;

    case 'jenkins':
      // Jenkins doesn't have a Tabler icon, use settings gear
      return <IconSettings {...iconProps} />;

    case 'checkmate':
      return <IconChecks {...iconProps} />;

    case 'jira':
      // JIRA doesn't have a Tabler icon, use device desktop as placeholder
      return <IconDeviceDesktop {...iconProps} />;

    case 'teams':
    case 'discord':
      return <IconBrandDiscord {...iconProps} />;

    case 'linear':
    case 'asana':
      // Use IconPlug for unsupported integrations
      return <IconPlug {...iconProps} />;

    case 'firebase':
      return <IconBrandFirebase {...iconProps} />;

    case 'apple':
    case 'app_store':
      return <IconBrandApple {...iconProps} />;

    case 'android':
      return <IconBrandAndroid {...iconProps} />;
      
    case 'play_store':
      return <IconBrandGooglePlay {...iconProps} />;

    case 'azure':
      return <IconBrandAzure {...iconProps} />;

    case 'testrail':
    case 'zephyr':
    default:
      // Default icon for integrations without custom SVG
      return <IconPlug {...iconProps} />;
  }
}
