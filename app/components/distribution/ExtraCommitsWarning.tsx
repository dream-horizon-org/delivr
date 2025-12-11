/**
 * ExtraCommitsWarning - Warning banner for untested commits
 * 
 * Features:
 * - Displays list of extra commits
 * - Warning severity indicator
 * - Options to proceed or create new regression
 */

import { useState, useCallback } from 'react';
import { 
  Alert, 
  Stack, 
  Group, 
  Text, 
  Button, 
  Badge,
  Paper,
  Collapse,
  Code,
} from '@mantine/core';
import { 
  IconAlertTriangle, 
  IconGitCommit, 
  IconChevronDown, 
  IconChevronUp,
  IconRefresh,
} from '@tabler/icons-react';
import { BUTTON_LABELS, DIALOG_TITLES } from '~/constants/distribution.constants';
import type { ExtraCommitsWarningProps } from './distribution.types';

// ============================================================================
// HELPER HOOKS
// ============================================================================

function useWarningState() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasAcknowledged, setHasAcknowledged] = useState(false);

  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  const acknowledge = useCallback(() => {
    setHasAcknowledged(true);
  }, []);

  return {
    isExpanded,
    hasAcknowledged,
    toggleExpanded,
    acknowledge,
  };
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function CommitItem({ 
  commit 
}: { 
  commit: { sha: string; author: string; message: string; timestamp: string };
}) {
  return (
    <Paper p="sm" withBorder radius="sm">
      <Group gap="xs" wrap="nowrap">
        <IconGitCommit size={16} className="text-gray-500 flex-shrink-0" />
        <Stack gap={2} style={{ minWidth: 0, flex: 1 }}>
          <Group gap="xs" wrap="nowrap">
            <Code fz="xs">{commit.sha.slice(0, 7)}</Code>
            <Text size="xs" c="dimmed" truncate>
              by {commit.author}
            </Text>
          </Group>
          <Text size="sm" lineClamp={1}>
            {commit.message}
          </Text>
          <Text size="xs" c="dimmed">
            {new Date(commit.timestamp).toLocaleString()}
          </Text>
        </Stack>
      </Group>
    </Paper>
  );
}

function CommitsList({ 
  commits 
}: { 
  commits: NonNullable<ExtraCommitsWarningProps['extraCommits']['extraCommits']>;
}) {
  return (
    <Stack gap="sm">
      {commits.map((commit) => (
        <CommitItem key={commit.sha} commit={commit} />
      ))}
    </Stack>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ExtraCommitsWarning(props: ExtraCommitsWarningProps) {
  const { 
    extraCommits,
    canDismiss,
    onProceed,
    onCreateRegression,
    className,
  } = props;

  const {
    isExpanded,
    hasAcknowledged,
    toggleExpanded,
    acknowledge,
  } = useWarningState();

  // Don't render if no extra commits
  if (!extraCommits.hasExtraCommits) {
    return null;
  }

  const { 
    commitsAhead, 
    extraCommits: commits, 
    warning,
    lastRegressionCommit,
    currentHeadCommit,
  } = extraCommits;

  const severityColor = warning?.severity === 'ERROR' 
    ? 'red' 
    : warning?.severity === 'WARNING' 
      ? 'orange' 
      : 'yellow';

  const hasCommitDetails = commits && commits.length > 0;

  return (
    <Alert
      icon={<IconAlertTriangle size={20} />}
      color={severityColor}
      variant="light"
      className={className}
      title={
        <Group gap="sm">
          <Text fw={600}>{DIALOG_TITLES.EXTRA_COMMITS_WARNING}</Text>
          <Badge color={severityColor} variant="filled" size="sm">
            {commitsAhead} commit{commitsAhead > 1 ? 's' : ''}
          </Badge>
        </Group>
      }
    >
      <Stack gap="md">
        {/* Warning Message */}
        <Text size="sm">
          {warning?.message ?? `There are ${commitsAhead} commits after the last regression build that have not been tested.`}
        </Text>

        {/* Commit Range Info */}
        <Paper p="sm" withBorder radius="sm" bg="white">
          <Stack gap="xs">
            <Group gap="xs">
              <Text size="xs" c="dimmed">Last regression:</Text>
              <Code fz="xs">{lastRegressionCommit?.slice(0, 7) ?? 'N/A'}</Code>
            </Group>
            <Group gap="xs">
              <Text size="xs" c="dimmed">Current HEAD:</Text>
              <Code fz="xs">{currentHeadCommit?.slice(0, 7) ?? 'N/A'}</Code>
            </Group>
          </Stack>
        </Paper>

        {/* Expandable Commits List */}
        {hasCommitDetails && (
          <>
            <Button
              variant="subtle"
              size="xs"
              onClick={toggleExpanded}
              rightSection={isExpanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
            >
              {isExpanded ? 'Hide' : 'Show'} untested commits
            </Button>
            
            <Collapse in={isExpanded}>
              <CommitsList commits={commits} />
            </Collapse>
          </>
        )}

        {/* Recommendation */}
        {warning?.recommendation && (
          <Text size="sm" c="dimmed" fs="italic">
            💡 {warning.recommendation}
          </Text>
        )}

        {/* Action Buttons */}
        <Group gap="sm" mt="sm">
          {onCreateRegression && (
            <Button
              variant="light"
              color={severityColor}
              size="sm"
              leftSection={<IconRefresh size={14} />}
              onClick={onCreateRegression}
            >
              Create New Regression
            </Button>
          )}

          {(canDismiss || onProceed) && (
            <Button
              variant="outline"
              color={severityColor}
              size="sm"
              onClick={() => {
                acknowledge();
                onProceed?.();
              }}
              disabled={hasAcknowledged}
            >
              {hasAcknowledged ? 'Acknowledged' : 'Proceed Anyway'}
            </Button>
          )}
        </Group>

        {/* Acknowledged State */}
        {hasAcknowledged && (
          <Text size="xs" c="green.7" fs="italic">
            ✓ You have acknowledged this warning. Distribution will proceed with untested code.
          </Text>
        )}
      </Stack>
    </Alert>
  );
}

