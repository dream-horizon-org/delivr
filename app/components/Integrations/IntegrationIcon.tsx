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
  IconLayoutKanban,
  IconBrandGooglePlay,
  IconRocket,
} from '@tabler/icons-react';

interface IntegrationIconProps {
  name: string;
  size?: number;
  className?: string;
  color?: string;
}

export function IntegrationIcon({ name, size = 40, className = '', color }: IntegrationIconProps) {
  // Normalize icon name to lowercase
  const iconName = (name || '').toLowerCase();

  const iconProps = {
    size,
    className: className || undefined,
    stroke: 1.5,
    color: color || undefined,
  };

  // Map icon names to Tabler Icon components
  switch (iconName) {
    case 'github':
      return <IconBrandGithub {...iconProps} />;
    
    case 'github_actions':
      return <IconRocket {...iconProps} />;

    case 'gitlab':
      return <IconBrandGitlab {...iconProps} />;

    case 'bitbucket':
      return <IconBrandBitbucket {...iconProps} />;

    case 'slack':
      return <IconBrandSlack {...iconProps} />;

    case 'jenkins':
      return <IconSettings {...iconProps} />;

    case 'checkmate':
      return <IconChecks {...iconProps} />;

    case 'jira':
      return <IconLayoutKanban {...iconProps} />;

    case 'teams':
    case 'discord':
      return <IconBrandDiscord {...iconProps} />;

    case 'linear':
    case 'asana':
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
      return <IconPlug {...iconProps} />;
  }
}
