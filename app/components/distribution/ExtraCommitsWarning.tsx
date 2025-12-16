/**
 * ExtraCommitsWarning - Warning banner for untested commits
 * 
 * Features:
 * - Displays list of extra commits
 * - Warning severity indicator
 * - Options to proceed or create new regression
 */

import {
  Alert,
  Badge,
  Button,
  Code,
  Collapse,
  Group,
  Paper,
  Stack,
  Text,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconChevronDown,
  IconChevronUp,
  IconGitCommit,
  IconRefresh,
} from '@tabler/icons-react';
import { useCallback } from 'react';
import {
  DIALOG_TITLES,
  DISTRIBUTION_UI_LABELS,
  WARNING_SEVERITY_COLORS,
} from '~/constants/distribution.constants';
import { WarningSeverity } from '~/types/distribution.types';
import type { ExtraCommitsWarningProps } from './distribution.types';
import { useWarningState } from './useWarningState';

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

type CommitItemProps = {
  commit: { sha: string; author: string; message: string; timestamp: string };
};

function CommitItem({ 
  commit 
}: CommitItemProps) {
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

type CommitsListProps = {
  commits: NonNullable<ExtraCommitsWarningProps['extraCommits']['extraCommits']>;
};

function CommitsList({ 
  commits 
}: CommitsListProps) {
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

  const severityColor = warning?.severity 
    ? WARNING_SEVERITY_COLORS[warning.severity]
    : WARNING_SEVERITY_COLORS[WarningSeverity.INFO];

  const hasCommitDetails = commits && commits.length > 0;
  const showRecommendation = warning && warning.recommendation;
  const showCreateRegressionButton = onCreateRegression !== undefined;
  const showProceedButtons = canDismiss && onProceed !== undefined;
  const showProceedButton = showProceedButtons && !hasAcknowledged;
  const showAcknowledgedMessage = showProceedButtons && hasAcknowledged;

  const handleProceed = useCallback(() => {
    acknowledge();
    onProceed?.();
  }, [acknowledge, onProceed]);

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
        {showRecommendation && (
          <Text size="sm" c="dimmed" fs="italic">
            💡 {warning!.recommendation}
          </Text>
        )}

        {/* Action Buttons */}
        <Group gap="sm" mt="sm">
          {showCreateRegressionButton && (
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

          {showProceedButton && (
            <Button
              variant="outline"
              color={severityColor}
              size="sm"
              onClick={handleProceed}
              disabled={hasAcknowledged}
            >
              {hasAcknowledged ? DISTRIBUTION_UI_LABELS.ACKNOWLEDGED : DISTRIBUTION_UI_LABELS.PROCEED_ANYWAY}
            </Button>
          )}
        </Group>

        {/* Acknowledged State */}
        {showAcknowledgedMessage && (
          <Text size="xs" c="green.7" fs="italic">
            ✓ You have acknowledged this warning. Distribution will proceed with untested code.
          </Text>
        )}
      </Stack>
    </Alert>
  );
}

