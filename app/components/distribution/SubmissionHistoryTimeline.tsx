/**
 * Submission History Timeline - Read-only display of historical submissions
 * Shows past submissions with their status and key information
 */

import {
  Anchor,
  Badge,
  Group,
  Paper,
  Stack,
  Text,
  Timeline,
  Tooltip,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconCheck,
  IconClock,
  IconDownload,
  IconExternalLink,
  IconX,
} from '@tabler/icons-react';
import { useState } from 'react';
import { API_ROUTES } from '~/constants/distribution/distribution-api.constants';
import {
  DS_COLORS,
  DS_SPACING,
  DS_TYPOGRAPHY,
} from '~/constants/distribution/distribution-design.constants';
import { SUBMISSION_STATUS_COLORS } from '~/constants/distribution/distribution.constants';
import { Platform, type Submission, SubmissionStatus } from '~/types/distribution/distribution.types';
import { formatDateTime, formatStatus } from '~/utils/distribution/distribution-ui.utils';

export interface SubmissionHistoryTimelineProps {
  submissions: Submission[];
  platform: Platform;
  tenantId: string; // Required for artifact download API authorization
}

function getStatusIcon(status: SubmissionStatus) {
  switch (status) {
    // Success states
    case SubmissionStatus.IN_PROGRESS:
    case SubmissionStatus.COMPLETED:
    case SubmissionStatus.LIVE:
      return <IconCheck size={16} />;
    
    // Error/terminal states
    case SubmissionStatus.REJECTED:
    case SubmissionStatus.SUSPENDED:
    case SubmissionStatus.CANCELLED:
      return <IconX size={16} />;
    
    // Alert states
    case SubmissionStatus.HALTED:
    case SubmissionStatus.USER_ACTION_PENDING:
      return <IconAlertTriangle size={16} />;
    default:
      return <IconClock size={16} />;
  }
}

export function SubmissionHistoryTimeline({
  submissions,
  platform,
  tenantId,
}: SubmissionHistoryTimelineProps) {
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());

  /**
   * Handle artifact download by fetching presigned URL from API.
   * Per API spec: GET /api/v1/tenants/:tenantId/submissions/:submissionId/artifact?platform=<ANDROID|IOS>
   */
  const handleDownloadArtifact = async (submissionId: string, platform: Platform) => {
    setDownloadingIds(prev => new Set(prev).add(submissionId));
    
    try {
      // Step 1: Call frontend API route (which proxies to backend) - uses centralized API route builder
      const apiUrl = API_ROUTES.getArtifactDownloadUrl(submissionId, platform, tenantId);
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      if (data.success && data.data?.presignedUrl) {
        // Step 2: Open presigned URL in new tab to trigger download
        window.open(data.data.presignedUrl, '_blank');
      } else {
        console.error('Failed to get artifact download URL:', data.error);
        alert('Failed to download artifact. Please try again.');
      }
    } catch (error) {
      console.error('Error downloading artifact:', error);
      alert('Failed to download artifact. Please try again.');
    } finally {
      setDownloadingIds(prev => {
        const next = new Set(prev);
        next.delete(submissionId);
        return next;
      });
    }
  };

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
            <Group gap={DS_SPACING.SM} mb={DS_SPACING.XS}>
              <Text fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD} size={DS_TYPOGRAPHY.SIZE.MD}>
                {submission.version}
              </Text>
              {isAndroid && 'versionCode' in submission && (
                <Text size={DS_TYPOGRAPHY.SIZE.SM} c={DS_COLORS.TEXT.MUTED} className="font-mono">
                  ({submission.versionCode})
                </Text>
              )}
              <Badge
                size={DS_TYPOGRAPHY.SIZE.MD}
                color={SUBMISSION_STATUS_COLORS[submission.status]}
                variant="light"
                radius={DS_SPACING.BORDER_RADIUS}
              >
                {formatStatus(submission.status)}
              </Badge>
            </Group>
          }
        >
          <Paper p={DS_SPACING.MD} radius={DS_SPACING.BORDER_RADIUS} withBorder className="bg-gray-50 mb-4">
            <Stack gap={DS_SPACING.SM}>
              {/* Timestamps */}
              <Group gap={DS_SPACING.MD}>
                {submission.submittedAt && (
                  <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED}>
                    <strong>Submitted:</strong> {formatDateTime(submission.submittedAt)}
                  </Text>
                )}
                <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED}>
                  <strong>Updated:</strong> {formatDateTime(submission.statusUpdatedAt)}
                </Text>
              </Group>

              {/* Submitted By */}
              {submission.submittedBy && (
                <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED}>
                  <strong>By:</strong> {submission.submittedBy}
                </Text>
              )}

              {/* Platform-Specific Info */}
              <Group gap={DS_SPACING.MD}>
                {isAndroid && 'inAppUpdatePriority' in submission && (
                  <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED}>
                    <strong>Priority:</strong> {submission.inAppUpdatePriority}/5
                  </Text>
                )}
                {!isAndroid && 'phasedRelease' in submission && (
                  <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED}>
                    <strong>Release:</strong>{' '}
                    {submission.phasedRelease ? 'Phased' : 'Manual'}
                  </Text>
                )}
                <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED}>
                  <strong>Rollout:</strong> {submission.rolloutPercentage}%
                </Text>
              </Group>

              {/* Release Notes (if present) */}
              {submission.releaseNotes && (
                <Paper p={DS_SPACING.XS} radius={DS_SPACING.BORDER_RADIUS} withBorder className="bg-white">
                  <Text size={DS_TYPOGRAPHY.SIZE.XS} className="line-clamp-2">
                    {submission.releaseNotes}
                  </Text>
                </Paper>
              )}

              {/* Rejection Reason (for REJECTED status) */}
              {submission.status === SubmissionStatus.REJECTED && 'rejectionReason' in submission && submission.rejectionReason && (
                <Paper p={DS_SPACING.XS} radius={DS_SPACING.BORDER_RADIUS} withBorder className="bg-red-50 border-red-200">
                  <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.STATUS.ERROR}>
                    <strong>Rejection Reason:</strong> {submission.rejectionReason}
                  </Text>
                </Paper>
              )}

              {/* Cancellation Reason (from action history for CANCELLED status) */}
              {submission.status === SubmissionStatus.CANCELLED && submission.actionHistory && submission.actionHistory.length > 0 && (
                <Paper p={DS_SPACING.XS} radius={DS_SPACING.BORDER_RADIUS} withBorder className="bg-gray-100 border-gray-300">
                  <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED}>
                    <strong>Cancellation Reason:</strong>{' '}
                    {submission.actionHistory.find(h => h.action === 'CANCELLED')?.reason || 'User cancelled submission'}
                  </Text>
                </Paper>
              )}

              {/* Artifacts (Links) */}
              {submission.artifact && (
                <Group gap={DS_SPACING.XS}>
                  {isAndroid && 'artifactPath' in submission.artifact && (
                    <>
                      <Tooltip label="Download AAB">
                        <Anchor
                          component="button"
                          onClick={() => handleDownloadArtifact(submission.id, Platform.ANDROID)}
                          className="text-blue-600 hover:text-blue-700 cursor-pointer"
                          disabled={downloadingIds.has(submission.id)}
                        >
                          <Group gap={DS_SPACING.XS}>
                            <IconDownload size={12} />
                            <Text size={DS_TYPOGRAPHY.SIZE.XS}>
                              {downloadingIds.has(submission.id) ? 'Downloading...' : 'AAB'}
                            </Text>
                          </Group>
                        </Anchor>
                      </Tooltip>
                      {submission.artifact.internalTrackLink && (
                        <Tooltip label="Internal Testing">
                          <a
                            href={submission.artifact.internalTrackLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Group gap={DS_SPACING.XS}>
                              <IconExternalLink size={12} />
                              <Text size={DS_TYPOGRAPHY.SIZE.XS}>Testing</Text>
                            </Group>
                          </a>
                        </Tooltip>
                      )}
                    </>
                  )}
                  {!isAndroid && 'testflightNumber' in submission.artifact && (
                    <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED}>
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

