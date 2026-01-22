/**
 * Vertical Stepper Component
 * Reusable vertical step indicator with brand styling
 */

import { Box, Text, Stack, useMantineTheme, Paper, Group, Badge } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';

export interface Step {
  id: string;
  title: string;
  description?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

interface VerticalStepperProps {
  steps: Step[];
  currentStep: number;
  completedSteps: Set<number>;
  onStepClick?: (stepIndex: number) => void;
  allowNavigation?: boolean;
}

export function VerticalStepper({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
  allowNavigation = false,
}: VerticalStepperProps) {
  const theme = useMantineTheme();

  return (
    <Stack gap={0}>
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isActive = index === currentStep;
        const isCompleted = completedSteps.has(index);
        const isPast = index < currentStep;
        const isClickable = allowNavigation && (isCompleted || isPast);
        const isLast = index === steps.length - 1;

        return (
          <Box key={step.id} style={{ position: 'relative' }}>
            {/* Step content */}
            <Paper
              p="md"
              radius="md"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                cursor: isClickable ? 'pointer' : 'default',
                backgroundColor: isActive 
                  ? theme.colors.brand[0] 
                  : 'transparent',
                border: isActive 
                  ? `2px solid ${theme.colors.brand[5]}` 
                  : `1px solid ${isCompleted || isPast ? theme.colors.green[2] : theme.colors.slate[2]}`,
                transition: 'all 200ms ease',
                marginBottom: isLast ? 0 : 8,
                boxShadow: isActive 
                  ? `0 2px 8px ${theme.colors.brand[2]}` 
                  : 'none',
              }}
              onClick={() => isClickable && onStepClick?.(index)}
              onMouseEnter={(e) => {
                if (isClickable) {
                  e.currentTarget.style.backgroundColor = theme.colors.slate[0];
                  e.currentTarget.style.transform = 'translateX(4px)';
                }
              }}
              onMouseLeave={(e) => {
                if (isClickable) {
                  e.currentTarget.style.backgroundColor = isActive ? theme.colors.brand[0] : 'transparent';
                  e.currentTarget.style.transform = 'translateX(0)';
                }
              }}
            >
              {/* Step circle with icon */}
              <Box
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  backgroundColor: isActive
                    ? theme.colors.brand[5]
                    : isCompleted || isPast
                    ? theme.colors.green[5]
                    : theme.colors.slate[3],
                  color: isActive || isCompleted || isPast
                    ? '#ffffff'
                    : theme.colors.slate[6],
                  transform: isActive ? 'scale(1.05)' : 'scale(1)',
                  transition: 'all 200ms ease',
                  boxShadow: isActive 
                    ? `0 2px 8px ${theme.colors.brand[3]}` 
                    : isCompleted || isPast
                    ? `0 1px 4px ${theme.colors.green[2]}`
                    : 'none',
                  border: isActive 
                    ? `2px solid ${theme.colors.brand[6]}` 
                    : 'none',
                }}
              >
                {isCompleted || isPast ? (
                  <IconCheck size={20} strokeWidth={3} />
                ) : (
                  <Icon size={20} />
                )}
              </Box>

              {/* Step text */}
              <Box ml="md" style={{ flex: 1, minWidth: 0 }}>
                <Group gap="xs" align="center" mb={4} wrap="nowrap">
                  <Text
                    size="sm"
                    fw={isActive ? 600 : isCompleted || isPast ? 500 : 400}
                    c={
                      isActive
                        ? theme.colors.brand[7]
                        : isCompleted || isPast
                        ? theme.colors.green[7]
                        : theme.colors.slate[7]
                    }
                    style={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      lineHeight: 1.4,
                    }}
                  >
                    {step.title}
                  </Text>

                  {isActive && (
                    <Badge
                      size="xs"
                      variant="light"
                      color="brand"
                      radius="xl"
                      style={{
                        fontWeight: 600,
                        fontSize: '10px',
                        padding: '2px 8px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      Current
                    </Badge>
                  )}
                </Group>

                {step.description && (
                  <Text
                    size="xs"
                    c={
                      isActive
                        ? theme.colors.brand[6]
                        : isCompleted || isPast
                        ? theme.colors.slate[6]
                        : theme.colors.slate[5]
                    }
                    style={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      lineHeight: 1.4,
                    }}
                  >
                    {step.description}
                  </Text>
                )}
              </Box>
            </Paper>

            {/* Vertical line connector */}
            {!isLast && (
              <Box
                style={{
                  position: 'absolute',
                  left: 30,
                  top: 64,
                  width: 2,
                  height: 12,
                  backgroundColor:
                    isPast || isCompleted
                      ? theme.colors.green[5]
                      : theme.colors.slate[3],
                  transition: 'background-color 200ms ease',
                  borderRadius: '1px',
                }}
              />
            )}
          </Box>
        );
      })}
    </Stack>
  );
}
