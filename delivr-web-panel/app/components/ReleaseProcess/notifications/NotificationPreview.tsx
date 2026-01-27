import { Box, Text, useMantineTheme } from '@mantine/core';
import { useMemo } from 'react';
import type { NotificationTemplate } from '~/types/release-process.types';

interface NotificationPreviewProps {
  template: NotificationTemplate;
}

export function NotificationPreview({ template }: NotificationPreviewProps) {
  const theme = useMantineTheme();

  // Parse message template and highlight placeholders
  const formattedMessage = useMemo(() => {
    if (!template.messageTemplate) {
      return null;
    }

    // Split message by lines and process each line
    const lines = template.messageTemplate.split('\n');
    
    return lines
      .map((line, lineIndex) => {
      // Find all {{placeholder}} patterns
      const placeholderRegex = /\{\{([^}]+)\}\}/g;
      const parts: Array<{ text: string; isPlaceholder: boolean }> = [];
      let lastIndex = 0;
      const matches: RegExpExecArray[] = [];
      let match;

      // Collect all matches first
      while ((match = placeholderRegex.exec(line)) !== null) {
        matches.push(match);
      }

      // Process matches
      matches.forEach((match) => {
        if (!match || match.index === undefined || !match[0]) {
          return;
        }
        
        // Add text before placeholder
        if (match.index > lastIndex) {
          const textBefore = line.substring(lastIndex, match.index);
          if (textBefore) {
            parts.push({
              text: textBefore,
              isPlaceholder: false,
            });
          }
        }
        
        // Add placeholder
        parts.push({
          text: String(match[0]), // Full match including {{}}
          isPlaceholder: true,
        });
        
        lastIndex = match.index + match[0].length;
      });
      
      // Add remaining text
      if (lastIndex < line.length) {
        const remainingText = line.substring(lastIndex);
        if (remainingText) {
          parts.push({
            text: remainingText,
            isPlaceholder: false,
          });
        }
      }
      
      // If no placeholders found, return the whole line
      if (parts.length === 0 && line.length > 0) {
        parts.push({ text: String(line), isPlaceholder: false });
      }
      
      // Ensure we have at least one part
      if (parts.length === 0) {
        return <div key={lineIndex} style={{ height: '0.5em' }} />;
      }

      // Handle empty lines
      if (line.length === 0) {
        return <div key={lineIndex} style={{ height: '0.5em' }} />;
      }

      return (
        <div
          key={lineIndex}
          style={{
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
            fontSize: '13px',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            color: theme.colors.gray?.[7] || '#495057',
          }}
        >
          {parts.map((part, partIndex) => {
            const text = String(part?.text || '');
            if (!text) {
              return null;
            }
            
            if (part.isPlaceholder) {
              return (
                <span
                  key={`${lineIndex}-${partIndex}`}
                  style={{
                    backgroundColor: theme.colors.blue?.[0] || '#e7f5ff',
                    color: theme.colors.blue?.[7] || '#1c7ed6',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 500,
                    display: 'inline-block',
                    fontFamily: 'inherit',
                  }}
                >
                  {text}
                </span>
              );
            }
            return <span key={`${lineIndex}-${partIndex}`}>{text}</span>;
          }).filter(Boolean)}
        </div>
      );
      })
      .filter((element) => element !== null && element !== undefined);
  }, [template.messageTemplate, theme]);

  if (!formattedMessage) {
    return null;
  }

  const borderRadiusMd = typeof theme.radius?.md === 'string' 
    ? theme.radius.md 
    : typeof theme.radius?.md === 'number'
    ? `${theme.radius.md}px`
    : '8px';
    
  const borderRadiusSm = typeof theme.radius?.sm === 'string' 
    ? theme.radius.sm 
    : typeof theme.radius?.sm === 'number'
    ? `${theme.radius.sm}px`
    : '6px';

  return (
    <Box
      style={{
        backgroundColor: theme.colors.gray?.[0] || '#f8f9fa',
        border: `1px solid ${theme.colors.gray?.[2] || '#e9ecef'}`,
        borderRadius: borderRadiusMd,
        padding: '12px',
        marginTop: '8px',
      }}
    >
      <Box
        style={{
          backgroundColor: '#ffffff',
          border: `1px solid ${theme.colors.gray?.[2] || '#e9ecef'}`,
          borderRadius: borderRadiusSm,
          padding: '12px',
          maxHeight: '280px',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {formattedMessage.filter(Boolean)}
        </div>
      </Box>
      
      <Text 
        size="xs" 
        c="dimmed" 
        mt="xs"
        style={{ 
          fontStyle: 'normal',
          color: theme.colors.gray?.[6] || '#868e96',
        }}
      >
        Placeholders marked with <span style={{ fontFamily: 'monospace', color: theme.colors.blue?.[6] || '#339af0' }}>{'{{}}'}</span> will be replaced with actual values
      </Text>
    </Box>
  );
}
