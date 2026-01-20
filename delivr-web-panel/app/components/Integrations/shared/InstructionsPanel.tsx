/**
 * Instructions Panel Component
 * Reusable panel for displaying setup instructions
 */

import { Box, Text, List, Anchor, useMantineTheme, ThemeIcon } from '@mantine/core';
import { IconCircle } from '@tabler/icons-react';

interface Instruction {
  text: string;
  link?: string;
  linkText?: string;
}

interface InstructionsPanelProps {
  title: string;
  instructions: (string | Instruction)[];
}

export function InstructionsPanel({ 
  title, 
  instructions,
}: InstructionsPanelProps) {
  const theme = useMantineTheme();

  return (
    <Box
      p="md"
      style={{
        backgroundColor: theme.colors.slate[0],
        borderRadius: theme.radius.md,
        border: `1px solid ${theme.colors.slate[2]}`,
      }}
    >
      <Text size="sm" fw={600} c={theme.colors.slate[8]} mb="sm">
        {title}
      </Text>
      <List
        size="sm"
        spacing="xs"
        type="ordered"
        styles={{
          item: {
            color: theme.colors.slate[6],
          },
        }}
      >
        {instructions.map((instruction, index) => {
          if (typeof instruction === 'string') {
            return (
              <List.Item key={index}>
                <Text size="sm" c={theme.colors.slate[6]}>
                  {instruction}
                </Text>
              </List.Item>
            );
          }
          
          return (
            <List.Item key={index}>
              <Text size="sm" c={theme.colors.slate[6]} component="span">
                {instruction.text}
                {instruction.link && instruction.linkText && (
                  <Anchor 
                    href={instruction.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    c="brand"
                    size="sm"
                    ml={4}
                  >
                    {instruction.linkText}
                  </Anchor>
                )}
              </Text>
            </List.Item>
          );
        })}
      </List>
    </Box>
  );
}

