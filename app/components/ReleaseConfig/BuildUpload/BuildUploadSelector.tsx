/**
 * Build Upload Selector Component
 * Allows users to choose between Manual Upload and CI/CD Workflows
 */

import { Stack, Text, Paper, Radio, Group, Box, ThemeIcon, UnstyledButton, useMantineTheme, Anchor, Badge } from '@mantine/core';
import { IconUpload, IconRocket, IconCheck, IconAlertCircle, IconPlug } from '@tabler/icons-react';
import { Link, useParams } from '@remix-run/react';
import type { BuildUploadSelectorProps } from '~/types/release-config-props';
import { BUILD_UPLOAD_STEPS } from '~/types/release-config-constants';

export function BuildUploadSelector({
  hasManualBuildUpload,
  onChange,
  hasIntegrations,
}: BuildUploadSelectorProps) {
  const theme = useMantineTheme();
  const params = useParams();
  const tenantId = params.org || '';
  const selectedMode = hasManualBuildUpload ? BUILD_UPLOAD_STEPS.MANUAL : BUILD_UPLOAD_STEPS.CI_CD;

  const options = [
    {
      value: BUILD_UPLOAD_STEPS.MANUAL,
      label: 'Manual Upload',
      description: 'Upload builds manually through the dashboard',
      icon: IconUpload,
      color: 'blue',
      available: true,
    },
    {
      value: BUILD_UPLOAD_STEPS.CI_CD,
      label: 'CI/CD Workflows',
      description: 'Automate builds using connected CI/CD integrations',
      icon: IconRocket,
      color: 'grape',
      available: hasIntegrations,
    },
  ];

  return (
    <Stack gap="md">
      {/* Options */}
      <Radio.Group
        value={selectedMode}
        onChange={(value) => onChange(value === BUILD_UPLOAD_STEPS.MANUAL)}
      >
        <Stack gap="md">
          {options.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedMode === option.value;
            const isDisabled = !option.available;

            return (
              <Box key={option.value}>
                <UnstyledButton
                  onClick={() => !isDisabled && onChange(option.value === BUILD_UPLOAD_STEPS.MANUAL)}
                  w="100%"
                  disabled={isDisabled}
                >
                  <Paper
                    p="lg"
                    radius="md"
                    withBorder
                    style={{
                      borderColor: isSelected
                        ? theme.colors[option.color][4]
                        : isDisabled
                        ? theme.colors.red[2]
                        : theme.colors.slate[2],
                      backgroundColor: isSelected
                        ? theme.colors[option.color][0]
                        : '#ffffff',
                      opacity: isDisabled ? 0.85 : 1,
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      transition: 'all 150ms ease',
                    }}
                  >
                    <Group gap="md" align="flex-start">
                      <Radio
                        value={option.value}
                        size="md"
                        disabled={isDisabled}
                        color={option.color}
                        mt={2}
                      />

                      <ThemeIcon
                        size={48}
                        radius="md"
                        variant={isSelected ? 'filled' : isDisabled ? 'light' : 'light'}
                        color={isDisabled ? 'red' : option.color}
                      >
                        <Icon size={24} />
                      </ThemeIcon>

                      <Box style={{ flex: 1 }}>
                        <Group gap="xs" mb={4}>
                          <Text fw={600} size="md" c={isDisabled ? theme.colors.slate[5] : theme.colors.slate[8]}>
                            {option.label}
                          </Text>
                          {isSelected && (
                            <ThemeIcon size={20} radius="xl" color={option.color}>
                              <IconCheck size={12} />
                            </ThemeIcon>
                          )}
                        </Group>
                        <Text size="sm" c={isDisabled ? theme.colors.slate[4] : theme.colors.slate[6]}>
                          {option.description}
                        </Text>
                      </Box>
                    </Group>
                  </Paper>
                </UnstyledButton>

                {/* Integration Required Warning - Shown inline with CI/CD card */}
                {isDisabled && option.value === BUILD_UPLOAD_STEPS.CI_CD && (
                  <Paper
                    mt="xs"
                    p="md"
                    radius="md"
                    style={{
                      backgroundColor: theme.colors.red[0],
                      border: `1px solid ${theme.colors.red[2]}`,
                    }}
                  >
                    <Group gap="sm" align="flex-start">
                      <ThemeIcon size={28} radius="md" variant="light" color="red">
                        <IconAlertCircle size={16} />
                      </ThemeIcon>
                      <Box style={{ flex: 1 }}>
                        <Text size="sm" fw={600} c={theme.colors.red[8]} mb={4}>
                          CI/CD Integration Required
                        </Text>
                        <Text size="xs" c={theme.colors.red[7]} mb="sm">
                          Connect at least one CI/CD provider to use this option:
                        </Text>
                        <Group gap="xs" mb="sm">
                          <Badge size="sm" variant="light" color="red">
                            Jenkins
                          </Badge>
                          <Badge size="sm" variant="light" color="red">
                            GitHub Actions
                          </Badge>
                        </Group>
                        <Anchor
                          component={Link}
                          to={`/dashboard/${tenantId}/integrations`}
                          size="sm"
                          c={theme.colors.red[8]}
                          fw={600}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <IconPlug size={14} />
                          Connect Integration
                        </Anchor>
                      </Box>
                    </Group>
                  </Paper>
                )}
              </Box>
            );
          })}
        </Stack>
      </Radio.Group>

      {/* Selected Mode Info */}
      {selectedMode === BUILD_UPLOAD_STEPS.CI_CD && hasIntegrations && (
        <Paper
          p="md"
          radius="md"
          style={{
            backgroundColor: theme.colors.brand[0],
            border: `1px solid ${theme.colors.brand[2]}`,
          }}
        >
          <Group gap="sm">
            <ThemeIcon size={32} radius="md" variant="light" color="brand">
              <IconRocket size={18} />
            </ThemeIcon>
            <Box>
              <Text size="sm" fw={500} c={theme.colors.brand[8]}>
                Next step: Configure your CI/CD workflows
              </Text>
              <Text size="xs" c={theme.colors.brand[6]}>
                You'll set up workflows for the platforms you selected
              </Text>
            </Box>
          </Group>
        </Paper>
      )}
    </Stack>
  );
}
