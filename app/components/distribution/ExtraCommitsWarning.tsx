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
} from '~/constants/distribution/distribution.constants';
import {
  DS_COLORS,
  DS_SPACING,
  DS_TYPOGRAPHY,
} from '~/constants/distribution/distribution-design.constants';
import { WarningSeverity } from '~/types/distribution/distribution.types';
import type { ExtraCommitsWarningProps } from '~/types/distribution/distribution-component.types';
import { useWarningState } from '~/hooks/distribution';

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
    <Paper p={DS_SPACING.SM} withBorder radius={DS_SPACING.BORDER_RADIUS}>
      <Group gap={DS_SPACING.XS} wrap="nowrap">
        <IconGitCommit size={16} style={{ color: DS_COLORS.TEXT.MUTED }} className="flex-shrink-0" />
        <Stack gap={DS_SPACING.XXS} style={{ minWidth: 0, flex: 1 }}>
          <Group gap={DS_SPACING.XS} wrap="nowrap">
            <Code fz={DS_TYPOGRAPHY.SIZE.XS}>{commit.sha.slice(0, 7)}</Code>
            <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED} truncate>
              by {commit.author}
            </Text>
          </Group>
          <Text size={DS_TYPOGRAPHY.SIZE.SM} lineClamp={1}>
            {commit.message}
          </Text>
          <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED}>
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
    <Stack gap={DS_SPACING.SM}>
      {commits.map((commit) => (
        <CommitItem key={commit.sha} commit={commit} />
      ))}
    </Stack>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ExtraCommitsWarning({ 
  extraCommits,
  canDismiss,
  onProceed,
  onCreateRegression,
  className,
}: ExtraCommitsWarningProps) {

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
      radius={DS_SPACING.BORDER_RADIUS}
      title={
        <Group gap={DS_SPACING.SM}>
          <Text fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD}>{DIALOG_TITLES.EXTRA_COMMITS_WARNING}</Text>
          <Badge color={severityColor} variant="filled" size="sm">
            {commitsAhead} commit{commitsAhead > 1 ? 's' : ''}
          </Badge>
        </Group>
      }
    >
      <Stack gap={DS_SPACING.MD}>
        {/* Warning Message */}
        <Text size={DS_TYPOGRAPHY.SIZE.SM}>
          {warning?.message ?? `There are ${commitsAhead} commits after the last regression build that have not been tested.`}
        </Text>

        {/* Commit Range Info */}
        <Paper p={DS_SPACING.SM} withBorder radius={DS_SPACING.BORDER_RADIUS} bg={DS_COLORS.BACKGROUND.CARD}>
          <Stack gap={DS_SPACING.XS}>
            <Group gap={DS_SPACING.XS}>
              <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED}>Last regression:</Text>
              <Code fz={DS_TYPOGRAPHY.SIZE.XS}>{lastRegressionCommit?.slice(0, 7) ?? 'N/A'}</Code>
            </Group>
            <Group gap={DS_SPACING.XS}>
              <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED}>Current HEAD:</Text>
              <Code fz={DS_TYPOGRAPHY.SIZE.XS}>{currentHeadCommit?.slice(0, 7) ?? 'N/A'}</Code>
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
              radius={DS_SPACING.BORDER_RADIUS}
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
          <Text size={DS_TYPOGRAPHY.SIZE.SM} c={DS_COLORS.TEXT.MUTED} fs="italic">
            💡 {warning!.recommendation}
          </Text>
        )}

        {/* Action Buttons */}
        <Group gap={DS_SPACING.SM} mt={DS_SPACING.SM}>
          {showCreateRegressionButton && (
            <Button
              variant="light"
              color={severityColor}
              size="sm"
              leftSection={<IconRefresh size={14} />}
              onClick={onCreateRegression}
              radius={DS_SPACING.BORDER_RADIUS}
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
              radius={DS_SPACING.BORDER_RADIUS}
            >
              {hasAcknowledged ? DISTRIBUTION_UI_LABELS.ACKNOWLEDGED : DISTRIBUTION_UI_LABELS.PROCEED_ANYWAY}
            </Button>
          )}
        </Group>

        {/* Acknowledged State */}
        {showAcknowledgedMessage && (
          <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.STATUS.SUCCESS} fs="italic">
            ✓ You have acknowledged this warning. Distribution will proceed with untested code.
          </Text>
        )}
      </Stack>
    </Alert>
  );
}

