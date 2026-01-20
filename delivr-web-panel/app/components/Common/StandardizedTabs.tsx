/**
 * Standardized Tabs Component
 * Reusable tabs component with consistent UI across Integrations, Releases, and Workflows pages
 * Uses pills variant with full-width segmented control style
 */

import { memo, type ReactNode } from 'react';
import { Tabs, useMantineTheme, Paper, Badge, Group, Text } from '@mantine/core';

export interface TabConfig {
  value: string;
  label: string;
  icon?: React.ComponentType<any>;
  count?: number;
  badgeColor?: string;
}

export interface StandardizedTabsProps {
  activeTab: string;
  onTabChange: (value: string | null) => void;
  tabs: TabConfig[];
  children: ReactNode;
  className?: string;
  tabFontSize?: "xs" | "sm" | "md" | "lg" | "xl";
}

export const StandardizedTabs = memo(function StandardizedTabs({
  activeTab,
  onTabChange,
  tabs,
  children,
  className,
  tabFontSize = "xs",
}: StandardizedTabsProps) {
  const theme = useMantineTheme();

  return (
    <Paper shadow="sm" p="md" radius="md" withBorder style={{ marginBottom: theme.spacing.lg }} className={className}>
      <style>{`
        .standardized-tab[data-active] {
          color: #ffffff !important;
          background: ${theme.colors.brand[5]} !important;
          box-shadow: ${theme.shadows.sm} !important;
        }
        .standardized-tab[data-active] .mantine-Badge-root {
          background-color: rgba(255, 255, 255, 0.25) !important;
          color: #ffffff !important;
        }
        .standardized-tab:hover:not([data-active]) {
          background: ${theme.colors.slate[2]} !important;
          color: ${theme.colors.slate[8]} !important;
        }
        .standardized-tabs-list::-webkit-scrollbar {
          height: 6px;
        }
        .standardized-tabs-list::-webkit-scrollbar-track {
          background: transparent;
        }
        .standardized-tabs-list::-webkit-scrollbar-thumb {
          background: ${theme.colors.slate[4]};
          border-radius: 3px;
        }
        .standardized-tabs-list::-webkit-scrollbar-thumb:hover {
          background: ${theme.colors.slate[5]};
        }
      `}</style>
      <Tabs 
        value={activeTab} 
        onChange={onTabChange}
        variant="pills"
        classNames={{
          tab: 'standardized-tab',
          list: 'standardized-tabs-list',
        }}
        styles={{
          root: {
            marginBottom: 0,
          },
          list: {
            gap: 4,
            background: theme.colors.slate[1],
            padding: 4,
            borderRadius: theme.radius.md,
            width: '100%',
            display: 'flex',
            marginBottom: theme.spacing.md,
            border: `1px solid ${theme.colors.slate[2]}`,
            overflowX: 'auto',
            overflowY: 'hidden',
            scrollbarWidth: 'thin',
            scrollbarColor: `${theme.colors.slate[4]} transparent`,
            WebkitOverflowScrolling: 'touch',
            minWidth: '100%',
          },
          tab: {
            flex: 1,
            minWidth: 0,
            borderRadius: theme.radius.sm,
            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
            transition: 'all 0.15s ease',
            fontWeight: 500,
            fontSize: 14,
            color: theme.colors.slate[6],
            textAlign: 'center',
            justifyContent: 'center',
            whiteSpace: 'nowrap',
          },
        }}
      >
        <Tabs.List>
          {tabs.map((tabConfig) => {
            const Icon = tabConfig.icon;

            return (
              <Tabs.Tab
                key={tabConfig.value}
                value={tabConfig.value}
                leftSection={Icon ? <Icon size={16} /> : undefined}
              >
                <Group gap="xs" align="center" wrap="wrap">
                  <Text size={tabFontSize}>{tabConfig.label}</Text>
                  {tabConfig.count !== undefined && (
                    <Badge
                      size={tabFontSize}
                      variant="filled"
                      color={tabConfig.badgeColor || "slate"}
                      style={{
                        backgroundColor: activeTab === tabConfig.value 
                          ? 'rgba(255, 255, 255, 0.25)' 
                          : theme.colors.brand[5],
                        color: '#ffffff',
                      }}
                    >
                      {tabConfig.count}
                    </Badge>
                  )}
                </Group>
              </Tabs.Tab>
            );
          })}
        </Tabs.List>

        {children}
      </Tabs>
    </Paper>
  );
});

