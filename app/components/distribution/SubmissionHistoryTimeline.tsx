/**
 * Submission History Timeline - Read-only display of historical submissions
 * Shows past submissions with their status and key information
 */

import {
  Badge,
  Group,
  Paper,
  Stack,
  Text,
  Timeline,
  Tooltip
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconCheck,
  IconClock,
  IconDownload,
  IconExternalLink,
  IconX,
} from '@tabler/icons-react';
import { SUBMISSION_STATUS_COLORS } from '~/constants/distribution.constants';
import { Platform, type Submission, SubmissionStatus } from '~/types/distribution.types';
import { formatDateTime, formatStatus } from '~/utils/distribution-ui.utils';

export interface SubmissionHistoryTimelineProps {
  submissions: Submission[];
  platform: Platform;
}

function getStatusIcon(status: SubmissionStatus) {
  switch (status) {
    case SubmissionStatus.LIVE:
      return <IconCheck size={16} />;
    case SubmissionStatus.REJECTED:
    case SubmissionStatus.CANCELLED:
      return <IconX size={16} />;
    case SubmissionStatus.HALTED:
      return <IconAlertTriangle size={16} />;
    default:
      return <IconClock size={16} />;
  }
}

export function SubmissionHistoryTimeline({
  submissions,
  platform,
}: SubmissionHistoryTimelineProps) {
  if (submissions.length === 0) {
    return null;
  }

  const isAndroid = platform === Platform.ANDROID;

  // Sort by createdAt descending (newest first)
  const sortedSubmissions = [...submissions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <Timeline active={-1} bulletSize={32} lineWidth={2}>
      {sortedSubmissions.map((submission, index) => (
        <Timeline.Item
          key={submission.id}
          bullet={
            <div className="flex items-center justify-center w-full h-full">
              {getStatusIcon(submission.status)}
            </div>
          }
          title={
            <Group gap="sm" mb="xs">
              <Text fw={600} size="md">
                {submission.version}
              </Text>
              {isAndroid && 'versionCode' in submission && (
                <Text size="sm" c="dimmed" className="font-mono">
                  ({submission.versionCode})
                </Text>
              )}
              <Badge
                size="md"
                color={SUBMISSION_STATUS_COLORS[submission.status]}
                variant="light"
                radius="sm"
              >
                {formatStatus(submission.status)}
              </Badge>
            </Group>
          }
        >
          <Paper p="md" radius="md" withBorder className="bg-gray-50 mb-4">
            <Stack gap="sm">
              {/* Timestamps */}
              <Group gap="md">
                {submission.submittedAt && (
                  <Text size="xs" c="dimmed">
                    <strong>Submitted:</strong> {formatDateTime(submission.submittedAt)}
                  </Text>
                )}
                <Text size="xs" c="dimmed">
                  <strong>Updated:</strong> {formatDateTime(submission.statusUpdatedAt)}
                </Text>
              </Group>

              {/* Submitted By */}
              {submission.submittedBy && (
                <Text size="xs" c="dimmed">
                  <strong>By:</strong> {submission.submittedBy}
                </Text>
              )}

              {/* Platform-Specific Info */}
              <Group gap="md">
                {isAndroid && 'inAppUpdatePriority' in submission && (
                  <Text size="xs" c="dimmed">
                    <strong>Priority:</strong> {submission.inAppUpdatePriority}/5
                  </Text>
                )}
                {!isAndroid && 'phasedRelease' in submission && (
                  <Text size="xs" c="dimmed">
                    <strong>Release:</strong>{' '}
                    {submission.phasedRelease ? 'Phased' : 'Manual'}
                  </Text>
                )}
                <Text size="xs" c="dimmed">
                  <strong>Rollout:</strong> {submission.rolloutPercentage}%
                </Text>
              </Group>

              {/* Release Notes (if present) */}
              {submission.releaseNotes && (
                <Paper p="xs" radius="sm" withBorder className="bg-white">
                  <Text size="xs" className="line-clamp-2">
                    {submission.releaseNotes}
                  </Text>
                </Paper>
              )}

              {/* Rejection Reason (for REJECTED status) */}
              {submission.status === SubmissionStatus.REJECTED && 'rejectionReason' in submission && submission.rejectionReason && (
                <Paper p="xs" radius="sm" withBorder className="bg-red-50 border-red-200">
                  <Text size="xs" c="red.7">
                    <strong>Rejection Reason:</strong> {submission.rejectionReason}
                  </Text>
                </Paper>
              )}

              {/* Cancellation Reason (from action history for CANCELLED status) */}
              {submission.status === SubmissionStatus.CANCELLED && submission.actionHistory && submission.actionHistory.length > 0 && (
                <Paper p="xs" radius="sm" withBorder className="bg-gray-100 border-gray-300">
                  <Text size="xs" c="dimmed">
                    <strong>Cancellation Reason:</strong>{' '}
                    {submission.actionHistory.find(h => h.action === 'CANCELLED')?.reason || 'User cancelled submission'}
                  </Text>
                </Paper>
              )}

              {/* Artifacts (Links) */}
              {submission.artifact && (
                <Group gap="xs">
                  {isAndroid && 'artifactPath' in submission.artifact && (
                    <>
                      <Tooltip label="Download AAB">
                        <a
                          href={submission.artifact.artifactPath}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Group gap={4}>
                            <IconDownload size={12} />
                            <Text size="xs">AAB</Text>
                          </Group>
                        </a>
                      </Tooltip>
                      {submission.artifact.internalTrackLink && (
                        <Tooltip label="Internal Testing">
                          <a
                            href={submission.artifact.internalTrackLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Group gap={4}>
                              <IconExternalLink size={12} />
                              <Text size="xs">Testing</Text>
                            </Group>
                          </a>
                        </Tooltip>
                      )}
                    </>
                  )}
                  {!isAndroid && 'testflightNumber' in submission.artifact && (
                    <Text size="xs" c="dimmed">
                      <strong>TestFlight:</strong> #{submission.artifact.testflightNumber}
                    </Text>
                  )}
                </Group>
              )}
            </Stack>
          </Paper>
        </Timeline.Item>
      ))}
    </Timeline>
  );
}

